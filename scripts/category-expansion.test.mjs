import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, validateData } from './catalog.mjs';
import { loadServices } from './catalog-source.mjs';
import { CATEGORY_NAMES, CATEGORY_DESCRIPTIONS, CATEGORY_LABELS, CATEGORY_ICONS } from './site-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const moved = {
  'email-notifications': [
    'resend','brevo','cloudflare-email-routing','novu-free','suprsend-free',
    'mailtrap-email-api-free','loops-free','emailoctopus-starter','courier-developer',
    'mailjet-free','expo-push-service-free','onesignal-free','mailersend-free',
    'mailpit-self-hosted','emailjs-free','zero-email-self-hosted'
  ],
  'testing-qa': [
    'chromatic-free','beeceptor-free','mockoon-open-source','hurl-open-source-http-testing',
    'wiremock-open-source-self-hosted','grafana-k6-open-source-local','agent-qa','mockhive-free'
  ],
  'forms-surveys': [
    'formbricks-hobby','tally-forms-free','formspree-free','web3forms-free','formcarry-baby-free'
  ]
};

test('three new categories preserve stable service IDs and canonical shard paths', () => {
  const data = validateData(loadServices(ROOT));
  assert.equal(CATEGORIES.length, 22);
  const byId = new Map(data.map(item => [item.id, item]));
  assert.equal(byId.size, data.length);
  for (const [category, ids] of Object.entries(moved)) {
    assert.ok(CATEGORIES.includes(category));
    assert.ok(CATEGORY_NAMES[category] && CATEGORY_LABELS[category]);
    assert.ok(CATEGORY_DESCRIPTIONS[category] && CATEGORY_ICONS[category]);
    assert.equal(data.filter(item => item.category === category).length, ids.length);
    for (const id of ids) {
      assert.equal(byId.get(id)?.category, category, 'Wrong category for ' + id);
      assert.ok(fs.existsSync(path.join(ROOT, 'data/services', category, id + '.json')));
      assert.equal(fs.existsSync(path.join(ROOT, 'data/services/developer-tools', id + '.json')), false,
        'Old shard must be deleted for ' + id);
    }
    assert.ok(fs.existsSync(path.join(ROOT, 'docs', category + '.md')));
  }
  assert.equal(data.length, JSON.parse(fs.readFileSync(path.join(ROOT, 'data/services.json'), 'utf8')).length,
    'Only categorization changed; aggregate service count must stay constant');
});
