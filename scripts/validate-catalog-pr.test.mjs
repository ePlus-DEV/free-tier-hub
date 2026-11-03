import assert from 'node:assert/strict';
import test from 'node:test';
import { validateChangedPaths, validateMigrationParity } from './validate-catalog-pr.mjs';

test('community PRs change independently versioned service shards only', () => {
  assert.equal(validateChangedPaths([
    'data/services/developer-tools/example-cli.json',
    'data/services/databases/example-db.json',
  ]), true);
});

test('legacy monolith contributions fail before generation could drop their changes', () => {
  assert.throws(() => validateChangedPaths(['data/services.json']),
    /generated and must not be edited by a PR/);
  assert.throws(() => validateChangedPaths([
    'data/services/developer-tools/new-tool.json', 'data/services.json',
  ]), /data\/services\.json is generated/);
});

test('legacy ordering manifest may only be created during migration', () => {
  const changed = ['data/catalog-legacy-order.json'];
  assert.throws(() => validateChangedPaths(changed), /immutable migration snapshot/);
  assert.equal(validateChangedPaths(changed, { allowLegacyManifestCreation: true }), true);
  assert.throws(() => validateChangedPaths(['data/services.json', ...changed],
    { allowLegacyManifestCreation: true }), /generated and must not be edited/);
});

test('invalid shard paths fail closed', () => {
  for (const filename of [
    'data/services/developer-tools/new service.json',
    'data/services/../new-tool.json',
    'data/services/developer-tools/readme.md',
  ]) {
    assert.throws(() => validateChangedPaths([filename]), /Invalid service shard filename/);
  }
});

test('non-catalog code changes are left to normal CI and review gates', () => {
  assert.equal(validateChangedPaths(['scripts/catalog.mjs', 'README.md']), true);
});

test('migration must exactly preserve latest-main entries and historical order', () => {
  const original = [{ id: 'first', label: 'v1' }, { id: 'second', label: 'v1' }];
  assert.equal(validateMigrationParity(original, structuredClone(original)), true);
  assert.throws(() => validateMigrationParity(original, original.slice(0, 1)), /stale.*main/);
  assert.throws(() => validateMigrationParity(original, [...original].reverse()), /stale.*main/);
  assert.throws(() => validateMigrationParity(original, [{ id: 'first', label: 'v2' }, original[1]]),
    /stale.*main/);
});
