import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { build, tag } from './build-site.mjs';
import { loadServices } from './catalog-source.mjs';
import { CATEGORIES } from './catalog.mjs';

const base = 'https://free-tier.eplus.dev/';

function jsonLD(html) {
  const matches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(matches.length, 1, 'Exactly one parseable JSON-LD graph per page');
  return JSON.parse(matches[0][1]);
}

test('SEO/AEO stays consistent after per-service migration and lazy Home search', () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'free-tier-seo-aeo-'));
  try {
    const canonical = loadServices();
    const ids = new Set(canonical.map(item => item.id));
    assert.equal(ids.size, canonical.length, 'No canonical service IDs are duplicated');
    const site = build(output);
    const read = relative => fs.readFileSync(path.join(output, relative), 'utf8');
    const sitemap = read('sitemap.xml');
    const robot = read('robots.txt');
    const llms = read('llms.txt');
    const agents = read('agents.md');
    const home = read('index.html');
    const json = JSON.parse(read('catalog.json'));
    const index = JSON.parse(read('search/index.json'));

    assert.equal(site.service_count, canonical.length);
    assert.deepEqual(json.map(item => item.id), canonical.map(item => item.id));
    assert.deepEqual(index.rows.map(row => row[0]), canonical.map(item => item.id));
    assert.ok(robot.includes('Sitemap: ' + base + 'sitemap.xml'));
    assert.ok(robot.includes('User-agent: *'));
    assert.doesNotMatch(robot, /Disallow:\s*\//);
    assert.match(read('404.html'), /<meta name="robots" content="noindex,follow">/);

    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x => x[1]);
    assert.equal(new Set(locs).size, locs.length, 'No duplicate sitemap URLs');
    assert.equal(locs.length, site.page_count, 'All generated pages are included in sitemap');
    assert.ok(locs.includes(base));
    assert.ok(locs.includes(base + 'categories/'));
    assert.ok(locs.includes(base + 'about/classifications/'));

    const homeSchema = jsonLD(home)['@graph'];
    const listing = homeSchema.find(x => x['@type'] === 'CollectionPage').mainEntity;
    const main = canonical.filter(item => item.plan === 'ongoing' || item.plan === 'monthly-credit');
    assert.equal(home.split('class="service-card"').length - 1, Math.min(main.length, 12));
    assert.equal(listing.numberOfItems, Math.min(main.length, 12));
    assert.deepEqual(listing.itemListElement.map(x => x.url),
      main.slice(0, 12).map(x => base + 'service/' + x.id + '/'),
      'JSON-LD should describe Home cards visible without JavaScript');
    assert.match(home, /<link rel="canonical" href="https:\/\/free-tier\.eplus\.dev\/">/);
    assert.match(home, /<meta name="robots" content="index,follow">/);

    for (const category of CATEGORIES) {
      const url = base + 'category/' + category + '/';
      assert.ok(locs.includes(url), 'Missing category sitemap URL: ' + category);
      assert.ok(llms.includes(url), 'llms.txt missing ' + category);
      assert.ok(agents.includes(url), 'agents.md missing ' + category);
      const categoryHTML = read('category/' + category + '/index.html');
      assert.ok(categoryHTML.includes('<link rel="canonical" href="' + url + '">'));
      assert.match(categoryHTML, /"@type":"CollectionPage"/);
      const subset = main.filter(item => item.category === category);
      for (const item of subset) {
        assert.ok(categoryHTML.includes('href="' + base + 'service/' + item.id + '/"'),
          'SSR category HTML missing link for ' + item.id);
      }
    }

    const limited = canonical.filter(item => item.plan === 'limited-duration' ||
      item.plan === 'temporary-resource');
    assert.equal(limited.length, site.limited_offer_count);
    if (limited.length) {
      assert.ok(locs.includes(base + 'offers/'));
      const offersHTML = read('offers/index.html');
      for (const item of limited) {
        assert.ok(offersHTML.includes('href="' + base + 'service/' + item.id + '/"'));
      }
    }

    for (const item of canonical) {
      const relative = 'service/' + item.id + '/';
      const url = base + relative;
      assert.ok(locs.includes(url), 'Sitemap missing canonical service URL: ' + item.id);
      const page = read(relative + 'index.html');
      if (limited.some(x => x.id === item.id)) {
        assert.ok(page.includes('Other time-limited offers'));
        assert.ok(page.includes('Back to Limited offers'));
      } else {
        assert.ok(page.includes('More in this category'));
      }
      assert.ok(page.includes('<link rel="canonical" href="' + url + '">'));
      assert.match(page, /<meta name="robots" content="index,follow">/);
      assert.ok(page.includes('<h1>' + tag(item.name) + '</h1>'),
        item.id + ' must have a crawlable heading');
      const schema = jsonLD(page)['@graph'];
      const web = schema.find(x => x['@type'] === 'WebPage');
      const breadcrumbs = schema.find(x => x['@type'] === 'BreadcrumbList').itemListElement;
      assert.equal(web.url, url);
      assert.equal(web.dateModified, item.last_checked,
        'Do not replace factual review dates with migration/build times');
      assert.equal(breadcrumbs.at(-1).item, url);
      const parent = breadcrumbs.at(-2).item;
      const expected = limited.some(x => x.id === item.id)
        ? base + 'offers/' : base + 'category/' + item.category + '/';
      assert.equal(parent, expected,
        'Breadcrumb parent must link to the page containing this offer');
    }
    assert.ok(llms.includes(base + 'catalog.json'));
    assert.ok(llms.includes(base + 'sitemap.xml'));
    assert.ok(agents.includes(base + 'catalog.json'));
    assert.match(llms, /follow the category pages and sitemap/);
    assert.match(agents, /Home initially shows 12 listings/);
    assert.ok(sitemap.includes('<lastmod>'), 'Sitemap should retain lastmod dates');
  } finally { fs.rmSync(output, { recursive: true, force: true }); }
});
