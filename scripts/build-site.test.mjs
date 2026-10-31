import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build, categoryCountSVG, tag, serviceLogoURL } from './build-site.mjs';
import { CATEGORIES, validateData } from './catalog.mjs';

test('directory exposes unique search/category controls and official sources for every service', () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'directory-design-'));
  try {
    const result = build(output);
    const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
    assert.match(html, /<meta name="fth-analytics" content="G-9YPGG0XEZV">/);
    assert.doesNotMatch(html, /<script[^>]+src="https:\/\/www\.googletagmanager\.com/);
    const imageURL = 'https://free-tier.eplus.dev/assets/og-image.png';
    for (const page of [html, fs.readFileSync(path.join(output, 'service/chatgpt-free/index.html'), 'utf8')]) {
      assert.ok(page.includes(`<meta property="og:image" content="${imageURL}">`));
      assert.ok(page.includes(`<meta name="twitter:image" content="${imageURL}">`));
      assert.match(page, /name="twitter:card" content="summary_large_image"/);
      assert.ok(page.includes('id="header-search-form" role="search" method="get" action="https://free-tier.eplus.dev/#explore"'));
      assert.match(page, /id="header-search" name="q" type="search"/);
    }
    const png = fs.readFileSync(path.join(output, 'assets/og-image.png'));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 630);
    for (const svg of html.match(/<svg\b[^>]*>/g) || []) assert.match(svg, /data-fa-icon=/);
    assert.match(html, /data-fa-icon="moon"/);
    assert.match(html, /data-fa-icon="sun"/);
    assert.match(html, /data-fa-icon="filters"/);
    assert.ok(fs.existsSync(path.join(output, 'assets/fontawesome-LICENSE.txt')));
    const raw = JSON.parse(fs.readFileSync(new URL('../data/services.json', import.meta.url), 'utf8'));
    const entries = Array.isArray(raw) ? raw : raw.services;
    const mainEntries = entries.filter(item => item.plan === 'ongoing' || item.plan === 'monthly-credit');
    const limitedEntries = entries.filter(item => item.plan !== 'ongoing' && item.plan !== 'monthly-credit');
    const offersHtml = fs.readFileSync(path.join(output, 'offers/index.html'), 'utf8');
    const classificationsHtml = fs.readFileSync(path.join(output, 'about/classifications/index.html'), 'utf8');
    assert.match(classificationsHtml, /<link rel="canonical" href="https:\/\/free-tier\.eplus\.dev\/about\/classifications\/"/);
    assert.match(classificationsHtml, /Ongoing free allowance/);
    assert.match(classificationsHtml, /Recurring monthly credit/);
    assert.match(classificationsHtml, /Time-limited offer/);
    assert.match(classificationsHtml, /Expiring free resource/);
    assert.match(classificationsHtml, /Legacy only/);
    assert.match(classificationsHtml, /Self-hosted/);
    assert.match(classificationsHtml, /Check provider/);
    assert.ok(html.includes('href="https://free-tier.eplus.dev/about/classifications/"'));
    assert.match(fs.readFileSync(path.join(output, 'sitemap.xml'), 'utf8'), /about\/classifications\//);
    assert.match(fs.readFileSync(path.join(output, 'llms.txt'), 'utf8'), /Offer classifications/);
    assert.equal(result.service_count, entries.length);
    const published = JSON.parse(fs.readFileSync(path.join(output, 'catalog.json'), 'utf8'));
    assert.equal(published.length, entries.length);
    assert.ok(published.every(item => /^\d{4}-\d{2}-\d{2}$/.test(item.added_at)),
      'All published service dates must come from Git history');
    assert.match(html, /data-added-at="\d{4}-\d{2}-\d{2}"/);
    assert.doesNotMatch(html, /data-added-at=""/);
    // The public added date is distinct from last_checked and also shown in details.
    const candidate = published.find(item => item.id === 'chatgpt-free');
    const detail = fs.readFileSync(path.join(output, 'service/chatgpt-free/index.html'), 'utf8');
    assert.ok(detail.includes('Added to directory (UTC)'));
    assert.ok(detail.includes(candidate.added_at));
    assert.ok(published.some(item => item.added_at !== item.last_checked));
    for (const id of ['search', 'category-filter', 'offer-filter', 'service-grid', 'sort', 'filter-no-card', 'filter-commercial']) {
      assert.equal(html.split(`id="${id}"`).length - 1, 1, `${id} must have one owner`);
    }
    assert.match(html, /<form[^>]+id="directory-search-form"[^>]+role="search"/);
    assert.doesNotMatch(html, /class="search-submit"/);
    assert.match(html, /aria-label="Quick billing filters"/);
    const dialog = html.slice(html.indexOf('id="advanced-filters"'), html.indexOf('class="quick-filters"'));
    assert.doesNotMatch(dialog, /id="sort"|id="filter-no-card"|id="filter-commercial"/);
    assert.match(html, /class="result-controls"><label class="sort-field"/);
    assert.match(html, /class="category-shortcuts"[^>]+aria-label="Popular categories"/);
    assert.match(html, /<select id="offer-filter"><option value="">All free tiers/);
    assert.match(html, /<option value="monthly-credit">Recurring monthly credit<\/option>/);
    assert.match(html, /class="classification-help-link" href="https:\/\/free-tier\.eplus\.dev\/about\/classifications\/"/);
    for (const id of ['koyeb', 'steadystack-initiate']) {
      const entry = entries.find(s => s.id === id);
      assert.equal(entry.eligibility, 'existing-users-only');
      const cardStart = html.indexOf('data-service-id="' + id + '"');
      assert.ok(cardStart > -1);
      const card = html.slice(cardStart, html.indexOf('</article>', cardStart));
      assert.match(card, /data-eligibility="existing-users-only"/);
      assert.match(card, /Legacy only/);
      const detail = fs.readFileSync(path.join(output, 'service', id, 'index.html'), 'utf8');
      assert.match(detail, /Legacy only/);
      assert.match(detail, /<dt>Eligibility<\/dt><dd>Legacy only/);
    }
    const normalDetail = fs.readFileSync(path.join(output, 'service/chatgpt-free/index.html'), 'utf8');
    assert.doesNotMatch(normalDetail, /Legacy only/);
    assert.match(normalDetail, /What do these plan and deployment labels mean/);
    assert.ok(html.includes('<option value="limited">Time-limited &amp; expiring offers (' + limitedEntries.length + ')</option>'));
    assert.doesNotMatch(html, /Only ongoing free allowances and recurring credits are counted here/);
    assert.ok(html.includes('data-offer-plan="ongoing"'));
    assert.ok(html.includes('data-offer-plan="monthly-credit"'));
    assert.ok(html.includes('data-offer-plan="limited-duration"'));
    assert.ok(html.includes('data-filter-category="ci-cd"'));
    assert.ok(html.includes('<option value="ci-cd">CI/CD &amp; pipelines</option>'));
    assert.ok(fs.existsSync(path.join(output, 'category/ci-cd/index.html')));
    assert.ok(fs.existsSync(path.join(output, 'service/crow-ci/index.html')));
    assert.doesNotMatch(html, /class="catalog-sidebar"/);
    assert.match(html, /class="catalog-toolbar"><div class="category-bar"/);
    assert.match(html, /class="search-filter-row"><form class="hero-search directory-search"/);
    assert.doesNotMatch(html, /class="hero-discovery"/);
    assert.equal((html.match(/class="official-link"/g) || []).length, entries.length);
    assert.equal((html.match(/data-card-category=/g) || []).length, entries.length);
    assert.match(html, /data-card-category="databases" href="https:\/\/free-tier\.eplus\.dev\/\?category=databases"/);
    assert.match(html, /data-card-hosting="cloud" href="https:\/\/free-tier\.eplus\.dev\/\?hosting=cloud"/);
    assert.doesNotMatch(html, /href=""/);
    for (const entry of entries) {
      const page = limitedEntries.some(item => item.id === entry.id) ? offersHtml : html;
      assert.ok(page.includes(`class="official-link" href="${tag(entry.pricing_url)}"`), entry.id);
      assert.ok(fs.existsSync(path.join(output, 'service', entry.id, 'index.html')), entry.id);
    }
  } finally { fs.rmSync(output, { recursive: true, force: true }); }
});

test('category count badges are generated from source JSON and update on rebuild', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'directory-badges-'));
  try {
    const items = JSON.parse(fs.readFileSync(new URL('../data/services.json', import.meta.url), 'utf8'));
    const first = path.join(tmp, 'first');
    build(first);
    for (const category of CATEGORIES) {
      const count = items.filter(item => item.category === category &&
        (item.plan === 'ongoing' || item.plan === 'monthly-credit')).length;
      const svg = fs.readFileSync(path.join(first, 'badges', 'categories', category + '.svg'), 'utf8');
      assert.equal(svg, categoryCountSVG(count));
      assert.match(svg, /<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
      assert.match(svg, /role="img"/);
    }
    items.push({ ...items[0], id: 'dynamic-badge-test-service', name: 'Dynamic Badge Test Service' });
    const source = path.join(tmp, 'catalog.json');
    fs.writeFileSync(source, JSON.stringify(items));
    const second = path.join(tmp, 'second');
    build(second, undefined, source);
    const category = items[0].category;
    const count = items.filter(item => item.category === category &&
      (item.plan === 'ongoing' || item.plan === 'monthly-credit')).length;
    assert.equal(fs.readFileSync(path.join(second, 'badges', 'categories', category + '.svg'), 'utf8'), categoryCountSVG(count));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('time-limited offers remain accessible but are excluded from the primary free-tier counts', () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'limited-offers-'));
  try {
    const all = JSON.parse(fs.readFileSync(new URL('../data/services.json', import.meta.url), 'utf8'));
    const limited = all.filter(item => item.plan === 'limited-duration' || item.plan === 'temporary-resource');
    const main = all.filter(item => item.plan === 'ongoing' || item.plan === 'monthly-credit');
    const result = build(output);
    const home = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
    const offers = fs.readFileSync(path.join(output, 'offers/index.html'), 'utf8');
    assert.ok(limited.length > 0);
    assert.equal(result.service_count, all.length);
    assert.equal(result.free_tier_count, main.length);
    assert.equal(result.limited_offer_count, limited.length);
    assert.ok(home.includes('<option value="limited">Time-limited &amp; expiring offers (' + limited.length + ')</option>'));
    assert.ok(home.includes('<strong class="result-total">' + main.length + '</strong>'));
    assert.equal((home.match(/class="service-card"/g) || []).length, all.length);
    assert.equal((offers.match(/class="service-card"/g) || []).length, limited.length);
    for (const item of limited) {
      assert.ok(home.includes('class="service-card" hidden data-service-id="' + item.id + '"'), item.id);
      assert.ok(offers.includes('data-service-id="' + item.id + '"'), item.id);
      const categoryHTML = fs.readFileSync(path.join(output, 'category', item.category, 'index.html'), 'utf8');
      assert.ok(!categoryHTML.includes('data-service-id="' + item.id + '"'), item.id);
      const detail = fs.readFileSync(path.join(output, 'service', item.id, 'index.html'), 'utf8');
      assert.ok(detail.includes('Time-limited offer | Free Tier Hub'), item.id);
      assert.ok(detail.includes('not an ongoing free tier'), item.id);
      assert.ok(detail.includes('TIME-LIMITED OFFER'), item.id);
      assert.ok(!detail.includes(item.name + ' Free Tier'), item.id);
    }
    const hosted = main.find(item => item.plan === 'ongoing' && item.deployment_model === 'self-hosted');
    assert.ok(hosted, 'fixture needs a self-hosted ongoing service');
    const hostedDetail = fs.readFileSync(path.join(output, 'service', hosted.id, 'index.html'), 'utf8');
    assert.ok(hostedDetail.includes('Free self-hosted software | Free Tier Hub'));
    const published = JSON.parse(fs.readFileSync(path.join(output, 'catalog.json'), 'utf8'));
    assert.deepEqual(published.map(item => item.id), all.map(item => item.id));
    assert.match(fs.readFileSync(path.join(output, 'sitemap.xml'), 'utf8'), /https:\/\/free-tier\.eplus\.dev\/offers\//);
  } finally { fs.rmSync(output, { recursive: true, force: true }); }
});

test('every service gets an actual provider favicon, including previously unmapped brands', () => {
  const entries = JSON.parse(fs.readFileSync(new URL('../data/services.json', import.meta.url), 'utf8'));
  for (const entry of entries) {
    const url = new URL(serviceLogoURL(entry));
    assert.equal(url.hostname, 'www.google.com');
    assert.ok(url.searchParams.get('domain'));
    assert.equal(url.searchParams.get('sz'), '128');
    assert.doesNotMatch(url.href, /simple-icons/);
  }
  assert.equal(new URL(serviceLogoURL(entries.find(x => x.id === 'pinecone-starter'))).searchParams.get('domain'), 'www.pinecone.io');
  assert.equal(new URL(serviceLogoURL(entries.find(x => x.id === 'chatgpt-free'))).searchParams.get('domain'), 'chatgpt.com');
  assert.equal(new URL(serviceLogoURL(entries.find(x => x.id === 'litlyx-self-hosted'))).searchParams.get('domain'), 'litlyx.com');
});

test('URL filters round trip, reject unknown values, preserve unrelated params and hash', async () => {
  await import('../site/assets/directory-url.js');
  const api = globalThis.FreeTierDirectoryURL;
  const state = {hosting: 'self-hosted', offer: 'monthly-credit', q: 'AI & cloud', category: 'databases', sort: 'name', noCard: true, commercial: true};
  const href = api.write('https://free-tier.eplus.dev/?utm_source=test#explore', state);
  assert.deepEqual(api.read(href, ['', 'databases'], ['default', 'name']), state);
  assert.equal(new URL(href).searchParams.get('utm_source'), 'test');
  assert.equal(new URL(href).hash, '#explore');
  assert.equal(new URL(href).searchParams.get('offer'), 'monthly-credit');
  assert.equal(api.matchesOffer('monthly-credit', 'monthly-credit'), true);
  assert.equal(api.matchesOffer('ongoing', 'monthly-credit'), false);
  assert.equal(api.matchesOffer('ongoing', ''), true);
  assert.equal(api.matchesOffer('limited-duration', ''), false);
  assert.equal(api.matchesOffer('temporary-resource', 'limited'), true);
  assert.equal(api.matchesOffer('limited-duration', 'limited'), true);
  assert.equal(api.matchesOffer('ongoing', 'limited'), false);
  assert.equal(api.matchesOffer('limited-duration', 'ongoing'), false);
  assert.equal(api.matchesOffer('monthly-credit', 'invalid'), false);
  assert.equal(new URL(api.write('https://free-tier.eplus.dev/', {...state, offer:'limited'})).searchParams.get('offer'), 'limited');
  const reset = new URL(api.write(href, {q:'', category:'', sort:'default', noCard:false, commercial:false}));
  assert.equal(reset.search, '?utm_source=test');
  assert.deepEqual(api.read('https://free-tier.eplus.dev/?hosting=bad&offer=limited-duration&category=bad&sort=bad&no_card=0&commercial=false', [''], ['default']),
    {hosting:'', offer:'', q:'', category:'', sort:'default', noCard:false, commercial:false});
});

test('header search opens and keyboard shortcuts work without a directory grid', async () => {
  const { runInNewContext } = await import('node:vm');
  function element() {
    return { hidden: true, attrs: {}, listeners: {}, value: '',
      addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
      setAttribute(key, value) { this.attrs[key] = value; },
      focus() { this.focused = true; }, select() { this.selected = true; },
      append() {}, appendChild() {},
      contains(target) { return target === this; }
    };
  }
  const toggle = element(), panel = element(), input = element(), form = element();
  const elements = { 'header-search-toggle': toggle, 'header-search-panel': panel,
    'header-search': input, 'header-search-form': form };
  const document = { ...element(), body: element(), createElement: element, documentElement: { setAttribute() {}, style: { setProperty() {} } },
    getElementById(id) { return elements[id] || null; }, querySelector() { return null; }, querySelectorAll() { return []; } };
  const window = { addEventListener() {}, localStorage: { getItem() { return null; } },
    matchMedia() { return { matches: false }; }, location: { href: 'https://free-tier.eplus.dev/service/vercel/' } };
  runInNewContext(fs.readFileSync(new URL('../site/assets/site.js', import.meta.url), 'utf8'), { document, window });
  toggle.listeners.click[0]();
  assert.equal(panel.hidden, false);
  assert.equal(toggle.attrs['aria-expanded'], 'true');
  assert.ok(input.focused);
  assert.equal(window.location.href, 'https://free-tier.eplus.dev/service/vercel/');
  input.value = 'cloud & AI';
  form.listeners.submit[0]({ preventDefault() { assert.fail('detail page must keep native GET submission'); } });
  for (const key of ['/', 'k']) {
    panel.hidden = true;
    let prevented = false;
    document.listeners.keydown.forEach(fn => fn({ key, ctrlKey: key === 'k', target: { tagName: 'BODY' },
      preventDefault() { prevented = true; } }));
    assert.equal(panel.hidden, false);
    assert.ok(prevented);
  }
  document.listeners.keydown.forEach(fn => fn({ key: 'Escape', preventDefault() {} }));
  assert.equal(panel.hidden, true);
});

test('deployment filtering reads offer metadata rather than ID or product-name guesses', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'deployment-data-'));
  try {
    const source = JSON.parse(fs.readFileSync(new URL('../data/services.json', import.meta.url), 'utf8'))[0];
    const modes = ['cloud', 'self-hosted', 'hybrid', 'local'];
    const entries = modes.map((deployment_model, i) => ({...source, id:'unmapped-offer-'+i, deployment_model}));
    const legacy = {...source, id:'vercel'}; delete legacy.deployment_model;
    entries.push(legacy);
    const catalog = path.join(tmp, 'catalog.json'), output = path.join(tmp, 'site');
    fs.writeFileSync(catalog, JSON.stringify(entries));
    build(output, undefined, catalog);
    const html = fs.readFileSync(path.join(output,'index.html'),'utf8');
    for (const [i, mode] of modes.entries()) {
      assert.ok(html.includes('data-service-id="unmapped-offer-'+i+'" data-category="'+source.category+'" data-hosting-model="'+mode+'"'));
      const cardStart = html.indexOf('data-service-id="unmapped-offer-'+i+'"');
      const cardHtml = html.slice(cardStart, html.indexOf('</article>', cardStart));
      const label = mode === 'self-hosted' ? 'Free self-hosted software' : mode === 'local' ? 'Free local software' : 'Free tier';
      assert.ok(cardHtml.includes('data-plan="ongoing">' + label + '</span>'), 'badge must describe the listed deployment mode: ' + mode);
    }
    assert.ok(html.includes('data-service-id="vercel" data-category="'+source.category+'" data-hosting-model="unclassified"'));
    const legacyStart = html.indexOf('data-service-id="vercel"');
    assert.ok(html.slice(legacyStart, html.indexOf('</article>', legacyStart)).includes('data-plan="ongoing">Free offering</span>'));
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output,'catalog.json'),'utf8')).map(x=>x.deployment_model), [...modes,undefined]);
    await import('../site/assets/directory-url.js');
    const api = globalThis.FreeTierDirectoryURL;
    const state = {hosting:'local',offer:'ongoing',q:'',category:'',sort:'default',noCard:false,commercial:false};
    assert.deepEqual(api.read(api.write('https://example.com/',state),[''],['default']),state);
  } finally {fs.rmSync(tmp,{recursive:true,force:true});}
});

test('optional eligibility is manually scoped to legacy ongoing offers', () => {
  const all = JSON.parse(fs.readFileSync(new URL('../data/services.json', import.meta.url), 'utf8'));
  const ordinary = all.find(item => item.id === 'chatgpt-free');
  assert.ok(ordinary && !ordinary.eligibility);
  assert.doesNotThrow(() => validateData([{...ordinary, eligibility:'existing-users-only'}]));
  assert.throws(() => validateData([{...ordinary, eligibility:'legacy'}]), /invalid eligibility/);
  assert.throws(() => validateData([{...ordinary, eligibility:'existing-users-only', plan:'limited-duration'}]), /invalid eligibility/);
});

test('service-card status badges use their own non-wrapping row at mobile widths', () => {
  const css = fs.readFileSync(new URL('../site/assets/site.css', import.meta.url), 'utf8');
  assert.match(css, /\.card-top\{[^}]*grid-template-columns:36px minmax\(0,1fr\)/);
  assert.match(css, /\.card-top>\.badge\{[^}]*grid-column:2;grid-row:2;[^}]*white-space:nowrap/);
  assert.doesNotMatch(css, /\.card-top>\.badge\{[^}]*max-width:110px/);
  assert.match(css, /\.card-top>\.card-identity\{grid-column:2;grid-row:1\}/);
  assert.match(css, /\.card-top>\.service-icon\{grid-column:1;grid-row:1\}/);
});
