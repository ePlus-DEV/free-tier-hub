import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { prepare } from './prepare-preview.mjs';

const URL = 'https://free-tier.eplus.dev/';

test('preview keeps static, dynamic and redirected navigation inside its preview root', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'free-tier-hub-preview-'));
  try {
    const assets = path.join(root, 'assets');
    const detail = path.join(root, 'service/vercel');
    const alias = path.join(root, 'service/old-vercel');
    const compare = path.join(root, 'compare');
    const cardsDir = path.join(root, 'search/cards');
    for (const directory of [assets, detail, alias, compare, cardsDir]) {
      fs.mkdirSync(directory, { recursive: true });
    }
    fs.writeFileSync(path.join(assets, 'site.css'), 'body{}');
    fs.writeFileSync(path.join(root, 'index.html'),
      '<meta name="robots" content="index,follow">' +
      '<meta name="fth-analytics" content="G-9YPGG0XEZV">' +
      '<link rel="canonical" href="' + URL + '">' +
      '<link rel="stylesheet" href="' + URL + 'assets/site.css">' +
      '<script src="' + URL + 'assets/site.js"></script>' +
      '<div id="service-grid" data-search-index="' + URL + 'search/index.json?v=abcdef123456" ' +
      'data-search-cards="' + URL + 'search/cards/"></div>' +
      '<aside data-compare-url="' + URL + 'compare/"></aside>' +
      '<a href="' + URL + 'service/vercel/">Vercel</a>' +
      '<a href="https://algolia.com/pricing">External</a>' +
      '<script async src="https://www.googletagmanager.com/gtag/js?id=G-9YPGG0XEZV"></script>');
    fs.writeFileSync(path.join(detail, 'index.html'),
      '<link rel="canonical" href="' + URL + 'service/vercel/">' +
      '<a href="' + URL + '">Home</a>' +
      '<form method="get" action="' + URL + '#explore"><input name="q"></form>' +
      '<link rel="stylesheet" href="' + URL + 'assets/site.css">' +
      "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-9YPGG0XEZV');</script>");
    fs.writeFileSync(path.join(compare, 'index.html'),
      '<meta name="robots" content="index,follow">' +
      '<link rel="canonical" href="' + URL + 'compare/">' +
      '<div data-compare-root data-compare-url="' + URL + 'compare/" ' +
      'data-service-base="' + URL + 'service/" data-catalog-url="' + URL + 'catalog.json"></div>' +
      '<a href="' + URL + 'service/vercel/">See details</a>');
    fs.writeFileSync(path.join(alias, 'index.html'),
      '<link rel="canonical" href="' + URL + 'service/vercel/">' +
      '<meta http-equiv="refresh" content="0;url=' + URL + 'service/vercel/">' +
      '<a href="' + URL + 'service/vercel/">Current service</a>' +
      '<script>window.location.replace("' + URL + 'service/vercel/");</script>');
    fs.writeFileSync(path.join(cardsDir, 'search.json'), JSON.stringify({
      vercel: '<article class="service-card"><a href="' + URL + 'service/vercel/">Details</a>' +
        '<a href="' + URL + '?category=search#explore">Filter</a>' +
        '<a href="https://algolia.com/pricing">Official provider</a></article>'
    }));

    assert.equal(prepare(root, URL), 4);
    const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const page = fs.readFileSync(path.join(detail, 'index.html'), 'utf8');
    const cmp = fs.readFileSync(path.join(compare, 'index.html'), 'utf8');
    const redirect = fs.readFileSync(path.join(alias, 'index.html'), 'utf8');
    const cards = JSON.parse(fs.readFileSync(path.join(cardsDir, 'search.json'), 'utf8'));
    assert.match(home, /href="assets\/site\.css"/);
    assert.match(home, /src="assets\/site\.js"/);
    assert.match(home, /href="service\/vercel\/index\.html"/);
    assert.match(home, /data-search-index="search\/index\.json\?v=abcdef123456"/);
    assert.match(home, /data-search-cards="search\/cards\/"/);
    assert.match(home, /data-compare-url="compare\/index\.html"/);
    assert.match(home, /href="https:\/\/algolia\.com\/pricing"/);
    assert.doesNotMatch(home, /data-search-(?:index|cards)="https:\/\//);
    assert.match(home, /rel="canonical" href="https:\/\/free-tier\.eplus\.dev\/"/);
    assert.match(page, /href="\.\.\/\.\.\/assets\/site\.css"/);
    assert.match(page, /href="\.\.\/\.\.\/index\.html"/);
    assert.ok(page.includes('action="../../index.html#explore"'));
    assert.match(page, /rel="canonical" href="https:\/\/free-tier\.eplus\.dev\/service\/vercel\/"/);
    assert.match(cmp, /data-compare-url="\.\.\/compare\/index\.html"/);
    assert.match(cmp, /data-service-base="\.\.\/service\/"/);
    assert.match(cmp, /data-catalog-url="\.\.\/catalog\.json"/);
    assert.match(cmp, /href="\.\.\/service\/vercel\/index\.html"/);
    assert.match(redirect, /content="0;url=\.\.\/vercel\/index\.html"/);
    assert.match(redirect, /window\.location\.replace\("\.\.\/vercel\/index\.html"\)/);
    assert.match(redirect, /rel="canonical" href="https:\/\/free-tier\.eplus\.dev\/service\/vercel\/"/);
    assert.match(cards.vercel, /href="service\/vercel\/index\.html"/);
    assert.match(cards.vercel, /href="index\.html\?category=search#explore"/);
    assert.match(cards.vercel, /href="https:\/\/algolia\.com\/pricing"/);
    assert.doesNotMatch(cards.vercel, /href="https:\/\/free-tier\.eplus\.dev\//);
    assert.match(home, /name="robots" content="noindex,nofollow"/);
    assert.doesNotMatch(home, /googletagmanager\.com|fth-analytics/);
    assert.doesNotMatch(page, /gtag\('config'/);

    // Both pages and JSON fragments remain stable when publication prepares
    // an artifact for the second time in publish-pr-preview.yml.
    assert.equal(prepare(root, URL), 4);
    assert.equal(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), home);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(cardsDir, 'search.json'), 'utf8')), cards);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
