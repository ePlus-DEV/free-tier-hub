import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { aggregateCatalog, loadServices, serviceFile, writeService } from './catalog-source.mjs';
import { validateData } from './catalog.mjs';
import { validateChangedPaths } from './validate-catalog-pr.mjs';

const example = JSON.parse(fs.readFileSync(new URL('../data/services.json', import.meta.url), 'utf8'))[0];

test('two independent Issue-to-PR deliveries in the same category merge without conflicts or lost services', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-concurrent-branches-'));
  const run = (...args) => execFileSync('git', args, {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  const save = (rel, content) => {
    const dest = path.join(root, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
  };
  try {
    run('init', '-q', '-b', 'main');
    run('config', 'user.name', 'Catalog Regression');
    run('config', 'user.email', 'catalog-test@example.invalid');
    run('config', 'commit.gpgsign', 'false');

    const base = { ...example, category: 'developer-tools', id: 'existing-source',
      name: 'Existing Source' };
    save('data/services/developer-tools/existing-source.json', JSON.stringify(base, null, 2) + '\n');
    save('data/catalog-legacy-order.json', JSON.stringify([base.id], null, 2) + '\n');
    save('data/services.json', JSON.stringify([base], null, 2) + '\n');
    run('add', 'data');
    run('commit', '-qm', 'baseline before two independent candidates');
    const legacyBytes = fs.readFileSync(path.join(root, 'data/services.json'), 'utf8');

    const candidates = [
      { ...base, id: 'same-category-alpha', name: 'Alpha Free' },
      { ...base, id: 'same-category-beta', name: 'Beta Free' },
    ];
    const branches = ['catalog/add-same-category-alpha', 'catalog/add-same-category-beta'];
    for (let i = 0; i < candidates.length; i++) {
      run('checkout', '-qb', branches[i]);
      const target = writeService(root, candidates[i]);
      assert.equal(target, path.join(root, serviceFile(candidates[i])));
      assert.equal(validateData(loadServices(root)).length, 2);
      run('add', '--', serviceFile(candidates[i]));
      run('commit', '-qm', 'feat(catalog): add isolated candidate ' + candidates[i].id);
      const files = run('diff', '--name-only', 'main...' + branches[i])
        .split('\n').filter(Boolean);
      assert.deepEqual(files, [serviceFile(candidates[i])],
        'A new service PR must not edit aggregate or unrelated category files');
      assert.equal(validateChangedPaths(files), true);
      assert.equal(fs.readFileSync(path.join(root, 'data/services.json'), 'utf8'), legacyBytes);
      run('checkout', '-q', 'main');
    }
    // Each branch started at the SAME main commit; merging the first PR
    // must not conflict with the second or silently drop either service.
    run('merge', '-q', '--no-ff', '--no-edit', branches[0]);
    run('merge', '-q', '--no-ff', '--no-edit', branches[1]);
    const merged = validateData(loadServices(root));
    assert.deepEqual(merged.map(x => x.id), [
      'existing-source', 'same-category-alpha', 'same-category-beta'
    ]);
    assert.deepEqual(JSON.parse(aggregateCatalog(root)), merged);
    assert.equal(fs.readFileSync(path.join(root, 'data/services.json'), 'utf8'), legacyBytes,
      'A contributor must not modify the generated compatibility file');
    assert.equal(new Set(merged.map(x => x.id)).size, 3);

    // Old, pre-cutover fork PRs modifying the aggregate must be converted
    // on their ORIGINAL PR branches instead of overwriting the source.
    assert.throws(() => validateChangedPaths(['data/services.json']),
      /generated and must not be edited by a PR/);

    // A second delivery with the SAME ID in another category is invalid.
    const collision = { ...base, category: 'databases', id: candidates[0].id };
    writeService(root, collision);
    assert.throws(() => loadServices(root), /Duplicate service ID across shards/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
