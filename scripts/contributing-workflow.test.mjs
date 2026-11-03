// Keep public contribution instructions aligned with canonical catalog paths
// and the GitHub Actions intake/merge process as the data layout evolves.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

test('contributor entrypoints use independent service shards, not a manually edited aggregate', () => {
  for (const file of ['README.md', 'CONTRIBUTING.md', '.github/PULL_REQUEST_TEMPLATE.md']) {
    const body = read(file);
    assert.ok(body.includes('data/services/'), file + ' must describe canonical shard location');
    assert.ok(body.includes('data/services.json'), file + ' must explain compatibility aggregate');
    assert.doesNotMatch(body, /I edited `data\/services\.json`|edit `data\/services\.json` and set `last_checked`/,
      file + ' instructs editing a generated aggregate');
  }
  const howTo = read('CONTRIBUTING.md');
  assert.match(howTo, /original PR.*branch/i);
  assert.match(howTo, /Do not create a replacement maintainer-authored PR/);
  assert.match(howTo, /category\/id/);
  assert.match(howTo, /npm run catalog:sync/);
  const checklist = read('.github/PULL_REQUEST_TEMPLATE.md');
  assert.match(checklist, /each containing one JSON object/);
  assert.match(checklist, /does not push generated files to contributor forks/);
});

test('source audit and operational guides explicitly distinguish canonical source from generated output', () => {
  for (const file of ['docs/deployment.md', 'docs/source-audit.md',
    'docs/catalog-backlog-consumer.md']) {
    assert.ok(read(file).includes('data/services/'), file);
  }
  assert.match(read('docs/source-audit.md'), /Only after \*\*human factual verification\*\*/);
  assert.doesNotMatch(read('docs/source-audit.md'), /edit `data\/services\.json` and set `last_checked`/);
  assert.match(read('docs/catalog-reconciliation-safety.md'), /legacy.*single-file conflict/i);
});

test('public no-code service suggestion remains open without requiring Git or JSON', () => {
  const template = read('.github/ISSUE_TEMPLATE/suggest-service.yml');
  assert.match(template, /Add new service/);
  assert.match(template, /Update limits or terms/);
  assert.match(template, /Official pricing or documentation URL/);
  assert.match(template, /do not need to edit data\/services\.json/);
});

test('required PR checks include contribution templates, and both legacy workflows fail closed in shard mode', () => {
  const validate = read('.github/workflows/validate-catalog.yml');
  const pages = read('.github/workflows/pages.yml');
  for (const body of [validate, pages]) {
    assert.ok(body.includes('CONTRIBUTING.md'));
    assert.ok(body.includes('.github/PULL_REQUEST_TEMPLATE.md'));
    assert.ok(body.includes('.github/ISSUE_TEMPLATE/**'));
  }
  const reconciliation = read('.github/workflows/reconcile-catalog-pr-conflicts.yml');
  assert.equal(reconciliation.split('if [ -d data/services ]; then').length - 1, 2,
    'both legacy reconcile and recover paths must skip a shard catalog');
});
