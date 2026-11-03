import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  loadServices, writeService, aggregateCatalog, hasServiceShards, serviceFile
} from './catalog-source.mjs';
import { validateData } from './catalog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const before = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/services.json'), 'utf8'));

function fixture(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'free-tier-shards-'));
  try {
    fs.mkdirSync(path.join(root, 'data', 'services', 'developer-tools'), { recursive: true });
    fs.writeFileSync(path.join(root, 'data', 'catalog-legacy-order.json'),
      JSON.stringify(['legacy-service']) + '\n');
    const original = { ...before[0], id: 'legacy-service', category: 'developer-tools' };
    fs.writeFileSync(path.join(root, 'data', 'services', 'developer-tools', 'legacy-service.json'),
      JSON.stringify(original, null, 2) + '\n');
    fs.writeFileSync(path.join(root, 'data', 'services.json'),
      JSON.stringify([original], null, 2) + '\n');
    fn(root, original);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('all migrated service shards reproduce the exact legacy catalog, content and order', () => {
  assert.ok(hasServiceShards(ROOT));
  const actual = validateData(loadServices(ROOT));
  assert.equal(actual.length, before.length);
  assert.deepEqual(actual, before);
  assert.equal(aggregateCatalog(ROOT), fs.readFileSync(path.join(ROOT, 'data/services.json'), 'utf8'));
  assert.equal(new Set(actual.map(item => item.id)).size, actual.length);
});

test('one new service changes only its own shard, not the shared compatibility aggregate', () => {
  fixture((root, original) => {
    const compatibility = path.join(root, 'data', 'services.json');
    const originalBytes = fs.readFileSync(compatibility, 'utf8');
    const added = { ...original, id: 'added-service', name: 'Added Service' };
    const newPath = writeService(root, added);
    assert.equal(newPath, path.join(root, 'data/services/developer-tools/added-service.json'));
    assert.deepEqual(loadServices(root).map(item => item.id), ['legacy-service', 'added-service']);
    assert.equal(fs.readFileSync(compatibility, 'utf8'), originalBytes);
    assert.deepEqual(JSON.parse(aggregateCatalog(root)).map(item => item.id),
      ['legacy-service', 'added-service']);
    assert.throws(() => writeService(root, added), /already exists/);
  });
});

test('duplicate service IDs in different categories fail closed', () => {
  fixture((root, original) => {
    const other = path.join(root, 'data/services/databases');
    fs.mkdirSync(other, { recursive: true });
    fs.writeFileSync(path.join(other, 'legacy-service.json'),
      JSON.stringify({ ...original, category: 'databases' }));
    assert.throws(() => loadServices(root), /Duplicate service ID/);
  });
});

test('filename or directory mismatch fails closed, never silently rewrites IDs', () => {
  fixture((root, original) => {
    const file = path.join(root, 'data/services/developer-tools/legacy-service.json');
    fs.writeFileSync(file, JSON.stringify({ ...original, id: 'different' }));
    assert.throws(() => loadServices(root), /path disagrees/);
  });
});

test('unexpected files and missing ordering manifest fail closed', () => {
  fixture((root) => {
    fs.writeFileSync(path.join(root, 'data/services/developer-tools/README.md'), '# no');
    assert.throws(() => loadServices(root), /Unexpected service shard/);
    fs.unlinkSync(path.join(root, 'data/services/developer-tools/README.md'));
    fs.unlinkSync(path.join(root, 'data/catalog-legacy-order.json'));
    assert.throws(() => loadServices(root), /Missing legacy catalog ordering/);
  });
});

test('pre-migration fixture compatibility still reads the old array', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'free-tier-shards-legacy-'));
  try {
    fs.mkdirSync(path.join(root, 'data'));
    fs.writeFileSync(path.join(root, 'data/services.json'), JSON.stringify([before[0]]));
    assert.equal(hasServiceShards(root), false);
    assert.deepEqual(loadServices(root), [before[0]]);
    assert.equal(serviceFile(before[0]),
      path.join('data/services', before[0].category, before[0].id + '.json'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
