import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { loadServices } from './catalog-source.mjs';
import { build } from './build-site.mjs';
import { SERVICE_ALIASES, activeServiceAliases } from './service-aliases.mjs';

const BASE = 'https://free-tier.eplus.dev/';

test('legacy duplicate service IDs have one canonical catalog entry and safe redirect pages', () => {
  const source = loadServices();
  const aliases = activeServiceAliases(source);
  assert.equal(aliases.length, 2);
  const ids = new Set(source.map(item => item.id));
  assert.equal(ids.size, source.length);

  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'free-tier-service-aliases-'));
  try {
    const result = build(folder);
    const read = relative => fs.readFileSync(path.join(folder, relative), 'utf8');
    const sitemap = read('sitemap.xml');
    const catalog = JSON.parse(read('catalog.json'));
    const index = JSON.parse(read('search/index.json'));
    assert.equal(result.service_count, source.length);
    assert.equal(catalog.length, index.rows.length);

    for (const [oldId, targetId] of aliases) {
      assert.ok(!ids.has(oldId), oldId + ' must not be catalogued twice');
      assert.ok(ids.has(targetId), targetId + ' must remain the canonical offering');
      assert.equal(index.rows.filter(row => row[0] === oldId).length, 0);
      assert.equal(index.rows.filter(row => row[0] === targetId).length, 1);
      assert.doesNotMatch(sitemap, new RegExp('<loc>' + BASE + 'service/' + oldId + '/</loc>'));
      assert.match(sitemap, new RegExp('<loc>' + BASE + 'service/' + targetId + '/</loc>'));
      const alias = read('service/' + oldId + '/index.html');
      const targetURL = BASE + 'service/' + targetId + '/';
      assert.ok(alias.includes('<link rel="canonical" href="' + targetURL + '">'));
      assert.match(alias, /<meta name="robots" content="noindex,follow">/);
      assert.ok(alias.includes('<meta http-equiv="refresh" content="0;url=' + targetURL + '">'));
      assert.ok(alias.includes('window.location.replace(' + JSON.stringify(targetURL) + ')'));
      assert.ok(alias.includes('<a href="' + targetURL + '">View the current service details</a>'));
      assert.match(read('service/' + targetId + '/index.html'), /<meta name="robots" content="index,follow">/);
    }
    assert.equal(Object.keys(SERVICE_ALIASES).length, 2);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('alias mapping fails closed if retired IDs return or canonical targets disappear', () => {
  const canonical = loadServices();
  const [oldId, targetId] = Object.entries(SERVICE_ALIASES)[0];
  const existing = canonical.find(item => item.id === targetId);
  assert.ok(existing);
  assert.throws(() => activeServiceAliases([...canonical, { ...existing, id: oldId }]),
    /Retired alias still has a canonical shard/);
  assert.throws(() => activeServiceAliases(canonical.filter(item => item.id !== targetId)),
    /Service alias target is missing/);
  assert.deepEqual(activeServiceAliases([{id:'synthetic-service'}], false), [],
    'Synthetic test catalog does not have to include production aliases');
});
