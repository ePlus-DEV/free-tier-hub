import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build, categoryCountSVG, tag, serviceLogoURL } from './build-site.mjs';
import { CATEGORIES } from './catalog.mjs';

test('directory exposes unique search/category controls and official sources for every service', () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'directory-design-'));
  try {
    const result = build(output);
    const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
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
    assert.equal(result.service_count, entries.length);
    for (const id of ['search', 'category-filter', 'service-grid', 'sort', 'filter-no-card', 'filter-commercial']) {
      assert.equal(html.split(`id="${id}"`).length - 1, 1, `${id} must have one owner`);
    }
    assert.match(html, /<form[^>]+id="directory-search-form"[^>]+role="search"/);
    assert.doesNotMatch(html, /class="search-submit"/);
    assert.doesNotMatch(html, /aria-label="Quick billing filters"/);
    assert.match(html, /class="category-shortcuts"[^>]+aria-label="Popular categories"/);
    assert.doesNotMatch(html, /class="catalog-sidebar"/);
    assert.match(html, /class="catalog-toolbar"><div class="category-bar"/);
    assert.match(html, /class="search-filter-row"><form class="hero-search directory-search"/);
    assert.doesNotMatch(html, /class="hero-discovery"/);
    assert.equal((html.match(/class="official-link"/g) || []).length, entries.length);
    assert.doesNotMatch(html, /href=""/);
    for (const entry of entries) {
      assert.ok(html.includes(`class="official-link" href="${tag(entry.pricing_url)}"`), entry.id);
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
      const count = items.filter(item => item.category === category).length;
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
    const count = items.filter(item => item.category === category).length;
    assert.equal(fs.readFileSync(path.join(second, 'badges', 'categories', category + '.svg'), 'utf8'), categoryCountSVG(count));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
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
});

test('URL filters round trip, reject unknown values, preserve unrelated params and hash', async () => {
  await import('../site/assets/directory-url.js');
  const api = globalThis.FreeTierDirectoryURL;
  const state = {q: 'AI & cloud', category: 'databases', sort: 'name', noCard: true, commercial: true};
  const href = api.write('https://free-tier.eplus.dev/?utm_source=test#explore', state);
  assert.deepEqual(api.read(href, ['', 'databases'], ['default', 'name']), state);
  assert.equal(new URL(href).searchParams.get('utm_source'), 'test');
  assert.equal(new URL(href).hash, '#explore');
  const reset = new URL(api.write(href, {q:'', category:'', sort:'default', noCard:false, commercial:false}));
  assert.equal(reset.search, '?utm_source=test');
  assert.deepEqual(api.read('https://free-tier.eplus.dev/?category=bad&sort=bad&no_card=0&commercial=false', [''], ['default']),
    {q:'', category:'', sort:'default', noCard:false, commercial:false});
});

test('header search opens and keyboard shortcuts work without a directory grid', async () => {
  const { runInNewContext } = await import('node:vm');
  function element() {
    return { hidden: true, attrs: {}, listeners: {}, value: '',
      addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
      setAttribute(key, value) { this.attrs[key] = value; },
      focus() { this.focused = true; }, select() { this.selected = true; },
      contains(target) { return target === this; }
    };
  }
  const toggle = element(), panel = element(), input = element(), form = element();
  const elements = { 'header-search-toggle': toggle, 'header-search-panel': panel,
    'header-search': input, 'header-search-form': form };
  const document = { ...element(), documentElement: { setAttribute() {}, style: { setProperty() {} } },
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
