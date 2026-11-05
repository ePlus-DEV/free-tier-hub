import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { build } from './build-site.mjs';
import { CATEGORIES } from './catalog.mjs';

test('compact index and category HTML shards preserve complete search and card coverage', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'free-tier-search-shards-'));
  try {
    const catalog = JSON.parse(fs.readFileSync(new URL('../data/services.json', import.meta.url), 'utf8'));
    const result = build(root);
    const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const index = JSON.parse(fs.readFileSync(path.join(root, 'search/index.json'), 'utf8'));
    const cards = Object.assign({}, ...CATEGORIES.map(category =>
      JSON.parse(fs.readFileSync(path.join(root, 'search/cards', category + '.json'), 'utf8'))));
    assert.equal(index.version, 1);
    assert.match(index.revision, /^[a-f0-9]{12}$/);
    assert.deepEqual(index.rows.map(row => row[0]), catalog.map(item => item.id));
    assert.equal(index.rows.length, catalog.length);
    assert.equal(Object.keys(cards).length, catalog.length);
    assert.deepEqual(index.rows.map(row => row.length).filter(length => length !== 10), []);
    assert.equal(home.split('class="service-card"').length - 1, 12,
      'Home includes only one SSR page, not thousands of DOM elements');
    assert.ok(home.includes('data-search-index="https://free-tier.eplus.dev/search/index.json?v=' + index.revision + '"'));
    assert.ok(home.includes('data-search-cards="https://free-tier.eplus.dev/search/cards/"'));
    assert.match(home, /<noscript>.*Browse all categories.*<\/noscript>/s);
    const main = catalog.filter(item => item.plan === 'ongoing' || item.plan === 'monthly-credit');
    for (const [i, item] of catalog.entries()) {
      const row = index.rows[i];
      assert.deepEqual(row.slice(0, 7), [
        item.id, item.name, item.category, item.plan,
        item.deployment_model || 'unclassified', item.credit_card, item.commercial_use
      ]);
      assert.equal(row[8], item.last_checked);
      assert.ok(row[9].includes(item.free_limit.toLowerCase()));
      assert.ok(row[9].includes(item.watch_out.toLowerCase()));
      assert.ok(cards[item.id].includes('data-service-id="' + item.id + '"'));
      assert.ok(cards[item.id].includes('href="https://free-tier.eplus.dev/service/' + item.id + '/"'));
      assert.ok(fs.existsSync(path.join(root, 'service', item.id, 'index.html')));
    }
    assert.equal(result.service_count, catalog.length);
    assert.equal(result.free_tier_count, main.length);
    for (const category of CATEGORIES) {
      const count = main.filter(item => item.category === category).length;
      const categoryHTML = fs.readFileSync(path.join(root, 'category', category, 'index.html'), 'utf8');
      assert.equal(categoryHTML.split('data-service-id="').length - 1, count,
        'static category pages retain complete no-JS / SEO access');
    }
    const runtime = fs.readFileSync(path.join(root, 'assets/site.js'), 'utf8');
    assert.match(runtime, /loadSearchIndex\(\)/);
    assert.match(runtime, /loadCardGroup\(categoryName\)/);
    assert.match(runtime, /matched\.slice\(0, visible\)/);
    assert.match(runtime, /if \(serial !== drawSerial\) return/);
    assert.doesNotMatch(runtime, /fetch\s*\(\s*['"]\/catalog\.json/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('search index and card shard assets work for small custom catalogs without requiring remote services', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'free-tier-search-small-'));
  try {
    const catalog = JSON.parse(fs.readFileSync(new URL('../data/services.json', import.meta.url), 'utf8'));
    const tiny = [
      { ...catalog[0], id: 'search-test-ongoing', category: 'developer-tools', plan: 'ongoing' },
      { ...catalog[1], id: 'search-test-limited', category: 'developer-tools', plan: 'limited-duration' },
    ];
    const input = path.join(root, 'custom.json');
    const output = path.join(root, 'build');
    fs.writeFileSync(input, JSON.stringify(tiny));
    build(output, undefined, input);
    const index = JSON.parse(fs.readFileSync(path.join(output, 'search/index.json'), 'utf8'));
    const home = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
    const cards = JSON.parse(fs.readFileSync(path.join(output, 'search/cards/developer-tools.json'), 'utf8'));
    assert.equal(index.rows.length, 2);
    assert.equal(home.split('class="service-card"').length - 1, 2);
    assert.ok(cards['search-test-ongoing']);
    assert.ok(cards['search-test-limited']);
    assert.equal(home.includes('data-service-id="search-test-limited"'), true);
    assert.ok(home.includes('class="limited-offer-shortcut"'));
    const schema = JSON.parse(home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const list = schema['@graph'].find(item => item['@type'] === 'CollectionPage').mainEntity.itemListElement;
    assert.deepEqual(list.map(item => item.name), tiny.map(item => item.name),
      'SSR and structured data include the limited listing in All services');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
