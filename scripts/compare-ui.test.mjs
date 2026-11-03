import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from './build-site.mjs';

test('comparison MVP is emitted from canonical catalog without bloating search index', () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'free-tier-compare-'));
  try {
    build(output);
    const read = file => fs.readFileSync(path.join(output, file), 'utf8');
    const home = read('index.html');
    const compare = read('compare/index.html');
    const card = read('search/cards/static-hosting.json');
    const js = read('assets/compare.js');
    const css = read('assets/site.css');
    const index = JSON.parse(read('search/index.json'));
    const catalog = JSON.parse(read('catalog.json'));
    assert.match(home, /class="compare-card-toggle" data-compare-add="/);
    assert.match(card, /data-compare-add/);
    assert.match(home, /id="compare-tray"/);
    assert.match(home, /assets\/compare\.js\?v=[a-f0-9]{12}/);
    assert.match(compare, /data-compare-root/);
    assert.match(compare, /id="compare-picker"/);
    assert.match(compare, /id="compare-differences"/);
    assert.match(compare, /id="compare-table"/);
    assert.match(compare, /data-catalog-url="https:\/\/free-tier\.eplus\.dev\/catalog\.json"/);
    assert.match(compare, /name="robots" content="noindex,follow"/);
    assert.match(js, /MAX = 4/);
    assert.match(js, /MutationObserver\(syncButtons\)/);
    assert.match(js, /window\.fetch\(source/);
    assert.match(js, /new URL\(shareURL\(selected\), window\.location\.origin\)/);
    assert.match(css, /\.compare-table th:first-child\{position:sticky/);
    assert.match(css, /@media\(max-width:680px\)/);
    assert.ok(catalog.length > 0);
    assert.ok(index.rows.every(row => row.length === 10), 'do not expand lazy search metadata');
    assert.doesNotMatch(read('sitemap.xml'), /<loc>https:\/\/free-tier\.eplus\.dev\/compare\/<\/loc>/,
      'empty comparison builder is noindex and should not appear in sitemap');
  } finally {
    fs.rmSync(output, {recursive:true,force:true});
  }
});
