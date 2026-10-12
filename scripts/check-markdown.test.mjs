import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkDocuments, validateDocuments, brokenLocalLinks, splitRow, scanTables } from './check-markdown.mjs';
import { CATEGORIES } from './catalog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/services.json'), 'utf8'));
const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const pages = Object.fromEntries(CATEGORIES.map(cat =>
  [cat, fs.readFileSync(path.join(ROOT, 'docs', cat + '.md'), 'utf8')]));

test('current Markdown documents and catalog pass structural checks', () => {
  assert.equal(checkDocuments(ROOT), data.length);
  assert.deepEqual(validateDocuments(ROOT, data, readme, pages), []);
});
test('splitting README and category tables produces orphan errors', () => {
  const damaged = readme.replace('\n| Static & frontend hosting', '\n\n| Static & frontend hosting');
  assert.notEqual(damaged, readme);
  assert.ok(scanTables(damaged, 'README.md').errors.some(x => x.includes('orphan')));
  const broken = pages.databases.replace('\n| [Neon Free Postgres]', '\n\n| [Neon Free Postgres]');
  assert.notEqual(broken, pages.databases);
  assert.ok(scanTables(broken, 'docs/databases.md').errors.some(x => x.includes('orphan')));
});
test('malformed columns and separators fail; fenced sample is ignored', () => {
  assert.ok(scanTables('| a | b |\n| --- | --- |\n| only-one |\n', 'test.md')
    .errors.some(x => x.includes('row width')));
  assert.ok(scanTables('| a | b |\n| value | value |\n', 'test.md')
    .errors.some(x => x.includes('orphan')));
  assert.deepEqual(scanTables('~~~md\n| sample | row |\n| missing |\n~~~', 'test.md').errors, []);
});
test('badge, README count, category row and extra table corruptions fail', () => {
  const wrongBadge = readme.replace('services-' + data.length + '-brightgreen', 'services-999-brightgreen');
  assert.ok(validateDocuments(ROOT, data, wrongBadge, pages).some(x => x.includes('badge')));
  const count = data.filter(item => item.category === 'static-hosting').length;
  const row = '| Static & frontend hosting | ' + count + ' |';
  const wrongCount = readme.replace(row, '| Static & frontend hosting | ' + (count + 1) + ' |');
  assert.notEqual(wrongCount, readme);
  assert.ok(validateDocuments(ROOT, data, wrongCount, pages).some(x => x.includes('navigation')));
  const candidate = data.find(item => item.category === 'databases');
  const oldRow = '[' + candidate.name + '](' + candidate.pricing_url + ')';
  const modified = { ...pages, databases: pages.databases.replace(oldRow, '[Corrupted service](' + candidate.pricing_url + ')') };
  assert.notEqual(modified.databases, pages.databases);
  assert.ok(validateDocuments(ROOT, data, readme, modified).some(x => x.includes('service row')));
  const duplicated = readme + '\n| Extra | Table |\n| --- | --- |\n| 1 | 2 |\n';
  assert.ok(validateDocuments(ROOT, data, duplicated, pages)
    .some(x => x.includes('exactly one category navigation table')));
});
test('local relative link resolution and escaped pipes', () => {
  assert.equal(brokenLocalLinks('[bad](docs/no-such-file.md)', 'README.md', ROOT).length, 1);
  assert.deepEqual(brokenLocalLinks('[back](../README.md)', 'docs/example.md', ROOT), []);
  assert.deepEqual(splitRow('| a \\| b | c |'), ['a | b', 'c']);
});
