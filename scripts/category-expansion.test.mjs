import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, validateData } from './catalog.mjs';
import { loadServices } from './catalog-source.mjs';
import { CATEGORY_NAMES, CATEGORY_DESCRIPTIONS, CATEGORY_LABELS, CATEGORY_ICONS } from './site-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Regression anchors for the 2026-11-03 category migration. These IDs may
// legitimately be retired later; if still listed, their category remains correct.
// Do not assert the total number of services per category: hourly discovery adds
// new entries, and audit may remove discontinued ones.
const migrationAnchors = {
  'email-notifications': ['resend', 'brevo', 'cloudflare-email-routing'],
  'testing-qa': ['chromatic-free', 'beeceptor-free', 'hurl-open-source-http-testing'],
  'forms-surveys': ['formbricks-hobby', 'tally-forms-free', 'formspree-free'],
};

test('category taxonomy and migrated URLs remain valid as service counts change', () => {
  const data = validateData(loadServices(ROOT));
  const byId = new Map(data.map(item => [item.id, item]));
  assert.equal(byId.size, data.length, 'service IDs must be globally unique');
  assert.equal(new Set(CATEGORIES).size, CATEGORIES.length, 'category IDs must be unique');
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');

  for (const category of CATEGORIES) {
    assert.ok(CATEGORY_NAMES[category], 'Missing display name for ' + category);
    assert.ok(CATEGORY_LABELS[category], 'Missing filter label for ' + category);
    assert.ok(CATEGORY_DESCRIPTIONS[category], 'Missing description for ' + category);
    assert.ok(CATEGORY_ICONS[category], 'Missing icon for ' + category);
    assert.ok(fs.existsSync(path.join(ROOT, 'docs', category + '.md')),
      'Missing source document for ' + category);
    assert.ok(readme.includes('badges/categories/' + category + '.svg'),
      'Missing dynamic README category badge for ' + category);
  }

  for (const [category, ids] of Object.entries(migrationAnchors)) {
    assert.ok(CATEGORIES.includes(category), 'Missing expanded category ' + category);
    for (const id of ids) {
      const item = byId.get(id);
      if (!item) continue; // A retired provider is not a category regression.
      assert.equal(item.category, category, 'Unexpected recategorization of ' + id);
      assert.ok(fs.existsSync(path.join(ROOT, 'data/services', category, id + '.json')));
      assert.ok(!fs.existsSync(path.join(ROOT, 'data/services/developer-tools', id + '.json')),
        'Migration left behind a duplicate shard for ' + id);
    }
  }
});
