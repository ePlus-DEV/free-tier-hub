import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build, categoryCountSVG, serviceCountSVG, countNewIn48Hours, tag, serviceLogoURL, providerReferralURL, aivenMySQLFreeRetirementNotice } from './build-site.mjs';
import { CATEGORIES, validateData } from './catalog.mjs';
import { compactNumber } from '../site/assets/compact-numbers.js';

test('Aiven MySQL retirement notice expires at 00:00 UTC on 22 December 2026', () => {
  const aiven = JSON.parse(fs.readFileSync(new URL(
    '../data/services/databases/aiven-postgres.json', import.meta.url), 'utf8'));
  assert.match(aivenMySQLFreeRetirementNotice(aiven, Date.parse('2026-12-21T23:59:59Z')),
    /data-expires-at="2026-12-22T00:00:00Z"/);
  assert.equal(aivenMySQLFreeRetirementNotice(aiven, Date.parse('2026-12-22T00:00:00Z')), '');
  assert.equal(aivenMySQLFreeRetirementNotice(aiven, Date.parse('2027-01-01T00:00:00Z')), '');
  assert.equal(aivenMySQLFreeRetirementNotice(null), '');
});

test('Aiven MySQL retirement notice is distinct from the continuing PostgreSQL Free listing', () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'aiven-retirement-'));
  try {
    const summary = build(output);
    const home = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
    const databases = fs.readFileSync(path.join(output, 'category/databases/index.html'), 'utf8');
    const postgres = fs.readFileSync(path.join(output, 'service/aiven-postgres/index.html'), 'utf8');
    const unrelated = fs.readFileSync(path.join(output, 'category/ci-cd/index.html'), 'utf8');
    const catalog = JSON.parse(fs.readFileSync(path.join(output, 'catalog.json'), 'utf8'));
    const notice = 'Aiven for MySQL Free is being retired';
    const announcement = 'https://aiven.io/changelog/507f8b1b-dd8f-4841-ac4a-940ac492b688';
    const beforeRetirementNoticeExpiry = Date.now() < Date.parse('2026-12-22T00:00:00Z');
    for (const page of [home, databases, postgres]) {
      if (beforeRetirementNoticeExpiry) {
        assert.ok(page.includes(notice));
        assert.ok(page.includes(announcement));
        assert.ok(page.includes('6 November 2026'));
        assert.ok(page.includes('21 December 2026'));
      } else {
        assert.ok(!page.includes('class="provider-retirement-notice"'));
      }
    }
    assert.ok(!unrelated.includes(notice), 'other categories must not show a MySQL-specific notice');
    const browserJS = fs.readFileSync(path.join(output, 'assets/site.js'), 'utf8');
    assert.match(browserJS, /function expireProviderNotices\(\)/);
    assert.match(browserJS, /window\.setTimeout\(expireProviderNotices/);
    const postgresEntry = catalog.find(item => item.id === 'aiven-postgres');
    assert.equal(postgresEntry.plan, 'ongoing');
    assert.doesNotMatch(postgresEntry.watch_out, /MySQL Free/);
    assert.equal(postgresEntry.related_offer_notice.title, notice);
    assert.equal(postgresEntry.related_offer_notice.source_url, announcement);
    assert.equal(postgresEntry.related_offer_notice.expires_at, '2026-12-22T00:00:00Z');
    assert.match(postgresEntry.related_offer_notice.message, /6 November 2026/);
    assert.match(postgresEntry.related_offer_notice.message, /21 December 2026/);
    assert.equal(postgresEntry.pricing_url,
      'https://aiven.io/docs/products/postgresql/concepts/pg-free-tier');
    assert.ok(!catalog.some(item => /Aiven.*MySQL/i.test(item.name)),
      'retired MySQL Free must not appear as a sign-up eligible free service');
    assert.equal(summary.service_count, catalog.length, 'advisory must not change badge counts');
    assert.ok(!postgres.includes('Aiven for MySQL Free | Free Tier Hub'),
      'notice must not produce a fake MySQL service detail page');
  } finally {
    fs.rmSync(output, { recursive: true, force: true });
  }
});

test('Startup Programs filter is explicit, shareable and isolated from ordinary trials', async () => {
  const { runInNewContext } = await import('node:vm');
  const { loadServices } = await import('./catalog-source.mjs');
  const source = loadServices();
  const startup = source.filter(item => item.program === 'startup');
  assert.ok(startup.length >= 13, 'the approved startup-program records are explicitly tagged');
  assert.ok(startup.every(item => item.plan === 'limited-duration'));
  assert.equal(source.filter(item => item.plan === 'ongoing' && item.program === 'startup').length, 0);
  assert.ok(source.some(item => item.plan === 'limited-duration' && !item.program),
    'ordinary trial and signup offers must not be treated as startup programs');

  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'startup-program-filter-'));
  try {
    build(output);
    const read = name => fs.readFileSync(path.join(output, name), 'utf8');
    const index = JSON.parse(read('search/index.json'));
    const home = read('index.html');
    const offers = read('offers/index.html');
    const css = read('assets/site.css');
    const runtime = read('assets/site.js');
    const ids = startup.map(item => item.id);
    assert.deepEqual(index.startup_program_ids, ids);
    assert.ok(index.rows.every(row => row.length === 10), 'keep 10-column lazy-search schema');
    assert.match(home, new RegExp('<option value="startup">Startup programs \\(' + ids.length + '\\)</option>'));
    assert.doesNotMatch(home, /class="startup-offer-shortcut"/, 'Startup count belongs in the Offer type filter, not summary');
    assert.match(offers, /id="offers-program-filters" role="group" aria-label="Filter limited offers" hidden/);
    assert.match(offers, new RegExp('data-offers-mode="startup" aria-pressed="false">Startup programs \\(' + ids.length + '\\)</button>'));
    assert.match(offers, /id="offers-service-grid"/);
    assert.match(offers, /data-program="startup"/);
    assert.match(offers, /data-offer-plan="limited-duration" data-program=""/);
    assert.match(css, /\.offers-program-filters button\[aria-pressed="true"\]/);
    assert.match(runtime, /function renderOffersProgramFilter\(\)/);
    assert.match(runtime, /urlState\.matchesOffer\(entry\.plan, offerType, entry\.program\)/);
    for (const item of startup) {
      assert.match(offers, new RegExp('data-service-id="' + item.id + '"[^>]*data-program="startup"'));
    }
    assert.match(home, /<meta name="robots" content="index,follow">/);
    assert.match(offers, /<link rel="canonical" href="https:\/\/free-tier\.eplus\.dev\/offers\/"/);
    assert.doesNotMatch(read('sitemap.xml'), /\?offer=startup/);

    const context = { URL };
    runInNewContext(read('assets/directory-url.js'), context);
    const api = context.FreeTierDirectoryURL;
    assert.equal(api.matchesOffer('limited-duration', 'startup', 'startup'), true);
    assert.equal(api.matchesOffer('limited-duration', 'startup', ''), false);
    assert.equal(api.matchesOffer('ongoing', 'startup', 'startup'), false);
    assert.equal(api.matchesOffer('limited-duration', 'limited', ''), true);
    assert.equal(api.matchesOffer('ongoing', 'free', ''), true);
    const query = api.write('https://free-tier.eplus.dev/?utm_source=review#explore',
      { offer: 'startup', q: '', category: '', hosting: '', sort: 'newest', noCard: false, commercial: false });
    const parsed = new URL(query);
    assert.equal(parsed.searchParams.get('offer'), 'startup');
    assert.equal(parsed.searchParams.get('utm_source'), 'review');
    assert.equal(parsed.hash, '#explore');
    const state = api.read(query, [''], ['default', 'newest']);
    assert.equal(state.offer, 'startup');
    assert.equal(state.sort, 'newest');
    assert.equal(api.summarizeResults(ids.length, ids.length, 12, {offer:'startup'}).label,
      'Startup programs');
  } finally {
    fs.rmSync(output, {recursive:true,force:true});
  }
});

test('NEW uses an exact UTC 48-hour window, not verification or daily date rounding', () => {
  const now = Date.parse('2026-11-06T12:00:00Z');
  const entries = [
    { added_at_utc: '2026-11-04T12:00:00Z' }, // exactly 48h, expired
    { added_at_utc: '2026-11-04T12:00:01Z' }, // within 48h
    { added_at_utc: '2026-11-06T12:00:00Z' }, // just added
    { added_at_utc: '2026-11-06T12:00:01Z' }, // future is not published
    { added_at: '2026-11-06', last_checked: '2026-11-06' }, // no fabricated precision
    { added_at_utc: 'broken', last_checked: '2026-11-06' },
  ];
  assert.equal(countNewIn48Hours(entries, now), 2);
});

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
    // Support links must be available on every page without confusing them with provider pricing.
    for (const page of [html, fs.readFileSync(path.join(output, 'service/chatgpt-free/index.html'), 'utf8')]) {
      assert.match(page, /<nav class="primary-nav"[\s\S]*?<a href="https:\/\/eplus\.dev\/page\/donate" target="_blank" rel="noopener noreferrer">Support<\/a><\/nav>/);
      assert.match(page, /<footer class="site-footer"[\s\S]*?Donate \/ Support<\/a>/);
      assert.match(page, /href="https:\/\/github\.com\/sponsors\/ePlus-DEV" target="_blank" rel="noopener noreferrer">GitHub Sponsors<\/a>/);
    }
    for (const page of [html, fs.readFileSync(path.join(output, 'service/chatgpt-free/index.html'), 'utf8')]) {
      assert.match(page, /<details class="support-widget" id="support-widget">/);
      assert.match(page, /<summary class="support-toggle" aria-label="Support Free Tier Hub"/);
      assert.match(page, /class="support-popover" role="group" aria-label="Donation options"/);
      assert.match(page, /Donate via ePlus\.DEV/);
      assert.match(page, /Donations never affect which services we list or recommend/);
    }
    const css = fs.readFileSync(path.join(output, 'assets/site.css'), 'utf8');
    assert.match(css, /\.support-widget\{[\s\S]*?position:fixed;right:22px;bottom:calc\(78px/);
    assert.match(css, /body:has\(\.detail-mobile-action\) \.support-widget\{[\s\S]*?bottom:calc\(144px/);
    assert.match(css, /body:has\(\.cookie-notice:not\(\[hidden\]\)\) \.support-widget\{display:none\}/);
    const js = fs.readFileSync(path.join(output, 'assets/site.js'), 'utf8');
    assert.match(js, /supportWidget\.open = false/);
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
    const searchIndex = JSON.parse(fs.readFileSync(path.join(output, 'search/index.json'), 'utf8'));
    const fragments = Object.fromEntries(CATEGORIES.map(category =>
      [category, JSON.parse(fs.readFileSync(path.join(output, 'search/cards', category + '.json'), 'utf8'))]));
    const cardHTML = item => fragments[item.category][item.id];
    // Home chips remain actual filters; the new directory is a separate destination.
    for (const [id, label] of [
      ['static-hosting', 'Hosting'], ['databases', 'Databases'],
      ['ai-assistants', 'AI assistants'], ['storage', 'Storage'],
      ['ci-cd', 'CI/CD'], ['developer-tools', 'Developer tools']
    ]) {
      const expected = entries.filter(item => item.category === id).length;
      assert.ok(html.includes('data-filter-category="' + id + '" aria-pressed="false">' +
        label + ' <span class="category-chip-count" aria-label="' + expected +
        ' services">' + compactNumber(expected) + '</span>'), id + ': count agrees with category overview');
    }
    const bar = html.slice(html.indexOf('<div class="category-bar">'),
      html.indexOf('<div class="search-filter-row">'));
    assert.ok(bar.includes('class="category-shortcuts"'));
    assert.ok(bar.includes('</div><a class="category-index-shortcut" href="https://free-tier.eplus.dev/categories/"'),
      'all categories link is separate from and alongside quick filter controls');
    assert.ok(html.includes('id="category-filter"><option value="">All categories (' +
      compactNumber(entries.length) + ')</option>'));
    assert.ok(html.includes('Browse all ' + CATEGORIES.length + ' categories'),
      'filter shortcut must display the current category count');
    // At every desktop/tablet width the category and quick-billing filters
    // share one row; categories scroll instead of wrapping and breaking layout.
    assert.match(css, /\.catalog-toolbar \.category-shortcuts\{display:flex;flex:1;min-width:0;align-items:center;gap:3px;flex-wrap:nowrap;overflow-x:auto/);
    assert.match(css, /\.catalog-toolbar \.category-shortcuts::-webkit-scrollbar\{display:none\}/);
    assert.match(css, /@media\(min-width:681px\)\{[\s\S]*?\.catalog-toolbar\{grid-template-columns:minmax\(0,1fr\) max-content\}/);
    assert.match(css, /\.catalog-toolbar \.quick-filters\{grid-column:2;grid-row:2;[^}]*flex-wrap:nowrap/);
    assert.match(css, /\.catalog-toolbar \.category-chip\{flex:0 0 auto;min-height:34px/);
    assert.match(css, /@media\(max-width:680px\)\{\s*\.catalog-toolbar \.category-bar\{display:flex;grid-column:1\/-1/);
    assert.match(css, /\.catalog-toolbar \.category-index-shortcut\{flex:0 0 auto;max-width:115px/);
    assert.match(js, /advancedFilters\.insertBefore\(quickFilters, document\.getElementById\("filter-show-results"\)\)/,
      'iPhone billing filters must remain in the existing filter sheet');

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
    assert.match(html, /<details class="classification-help"><summary>How are these offers classified\?<\/summary>/);
    assert.match(html, /Legacy only<\/strong> means eligible existing accounts, not a separate offer type/);
    const eligibilityHTML = cardHTML(entries.find(item => item.id === 'koyeb'));
    assert.match(eligibilityHTML, /<details class="eligibility-help"><summary>Why\?<\/summary>/);
    assert.match(eligibilityHTML, /Read eligibility policy ↗<\/a><\/div><\/details>/);
    assert.doesNotMatch(html, /Free allowance reserved for eligible existing accounts\. <a href=/);
    assert.match(html, /class="official-link"[^>]+target="_blank" rel="noopener noreferrer"/);
    assert.match(fs.readFileSync(path.join(output, 'sitemap.xml'), 'utf8'), /about\/classifications\//);
    assert.match(fs.readFileSync(path.join(output, 'llms.txt'), 'utf8'), /Offer classifications/);
    assert.equal(result.service_count, entries.length);
    const published = JSON.parse(fs.readFileSync(path.join(output, 'catalog.json'), 'utf8'));
    assert.equal(published.length, entries.length);
    const stats = JSON.parse(fs.readFileSync(path.join(output, 'catalog-stats.json'), 'utf8'));
    assert.deepEqual(stats, {
      service_offer_count: entries.length,
      education_offer_count: 51,
      total_offers: entries.length + 51,
      product_deduplication: 'not_verified',
      free_tier_count: mainEntries.length,
      limited_offer_count: limitedEntries.length,
      total_services: entries.length,
      new_48h_count: countNewIn48Hours(published, Date.parse(stats.generated_at_utc)),
      new_48h_window_hours: 48,
      generated_at_utc: stats.generated_at_utc,
    });
    assert.ok(!Number.isNaN(Date.parse(stats.generated_at_utc)));
    assert.equal(stats.free_tier_count + stats.limited_offer_count, stats.total_services);
    assert.equal(stats.total_offers, stats.total_services + stats.education_offer_count);
    assert.equal(stats.education_offer_count,
      JSON.parse(fs.readFileSync(path.join(output, 'education-programs.json'),'utf8')).length);
    assert.equal(stats.product_deduplication, 'not_verified');
    const combined = JSON.parse(fs.readFileSync(path.join(output, 'search/index.json'),'utf8'));
    assert.equal(combined.rows.length, stats.total_services);
    assert.equal(combined.education_rows.length, stats.education_offer_count);
    const educationCards = JSON.parse(fs.readFileSync(path.join(output,'search/cards/education.json'),'utf8'));
    assert.equal(Object.keys(educationCards).length, stats.education_offer_count);
    assert.ok(combined.education_rows.every(row=>row.length===10 && row[0].startsWith('edu-')));
    assert.ok(educationCards['edu-github-copilot-student'].includes('href="https://free-tier.eplus.dev/education/github-copilot-student/"'));
    const badge = fs.readFileSync(path.join(output, 'badges/services.svg'), 'utf8');
    assert.equal(badge, serviceCountSVG(stats.total_services));
    assert.equal(fs.readFileSync(path.join(output, 'badges/free-tiers.svg'), 'utf8'),
      serviceCountSVG(stats.free_tier_count, 'free tiers'));
    assert.equal(fs.readFileSync(path.join(output, 'badges/limited-offers.svg'), 'utf8'),
      serviceCountSVG(stats.limited_offer_count, 'limited offers'));
    assert.match(badge, /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(badge, /<text[^>]*>services<\/text>/);
    // No catalog-count decoration in Hero: the Offer type dropdown owns group totals.
    const hero = html.slice(html.indexOf('<section class="hero">'), html.indexOf('</section>', html.indexOf('<section class="hero">')));
    assert.doesNotMatch(hero, /hero-stats|hero-stat-value/);
    assert.doesNotMatch(css, /\.hero-stats\{/);
    assert.ok(html.includes('<select id="offer-filter"><option value="">All offers (' +
      compactNumber(stats.total_offers) + ')</option>'));
    assert.ok(html.includes('<option value="free">Free tiers (' +
      compactNumber(stats.free_tier_count) + ')</option>'));
    assert.ok(html.includes('<option value="ongoing">Ongoing free allowance (' +
      compactNumber(entries.filter(item => item.plan === 'ongoing').length) + ')</option>'));
    assert.ok(html.includes('<option value="monthly-credit">Recurring monthly credit (' +
      compactNumber(entries.filter(item => item.plan === 'monthly-credit').length) + ')</option>'));
    assert.ok(html.includes('<option value="limited">Time-limited &amp; expiring offers (' +
      compactNumber(stats.limited_offer_count) + ')</option>'));
    assert.ok(html.includes('<span class="result-label">All offers</span><strong class="result-total">' +
      compactNumber(stats.total_offers) + '</strong>'));
    assert.ok(html.includes('<span class="result-shown">Showing ' +
      compactNumber(Math.min(12, stats.total_services)) + ' of ' + compactNumber(stats.total_offers) + '</span>'));
    assert.match(css, /\.results-meta\{[^}]*margin-left:auto/);
    assert.match(css, /@media\(max-width:680px\)\{\s*\.directory-heading\{flex-wrap:nowrap/);
    assert.ok(published.every(item => /^\d{4}-\d{2}-\d{2}$/.test(item.added_at)),
      'All published service dates must come from Git history');
    assert.match(html, /data-added-at="\d{4}-\d{2}-\d{2}"/);
    assert.match(html, /data-added-at-utc="\d{4}-\d{2}-\d{2}T[^"]+Z"/);
    assert.match(html, /class="new-service-badge" hidden title="First published within the last 48 hours \(UTC\)"/);
    assert.match(css, /\.detail-new-badge\{margin-left:8px;font-size:10px\}/);
    assert.match(css, /\.recent-count\{display:inline-flex/);
    assert.ok(published.every(item => /^\d{4}-\d{2}-\d{2}T[^\s]+Z$/.test(item.added_at_utc)));
    assert.doesNotMatch(html, /data-added-at=""/);
    // The public added date is distinct from last_checked and also shown in details.
    const candidate = published.find(item => item.id === 'chatgpt-free');
    const detail = fs.readFileSync(path.join(output, 'service/chatgpt-free/index.html'), 'utf8');
    assert.match(detail, /<article class="detail" data-added-at-utc="\d{4}-\d{2}-\d{2}T[^"]+Z">/);
    assert.match(detail, /class="new-service-badge detail-new-badge" hidden title="First published within the last 48 hours \(UTC\)"/);
    assert.ok(detail.includes('<h1>ChatGPT Free</h1>'), 'Preserve service H1 and SEO');
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
    assert.match(html, /<select id="offer-filter"><option value="">All offers \(/);
    assert.match(html, /<option value="free">Free tiers \(/);
    assert.match(html, /<option value="monthly-credit">Recurring monthly credit \(/);
    for (const model of ['cloud', 'self-hosted', 'hybrid', 'local', 'unclassified']) {
      const label = {
        cloud: 'Cloud', 'self-hosted': 'Self-hosted', hybrid: 'Cloud + self-hosted',
        local: 'Local / embedded', unclassified: 'Not specified'
      }[model];
      assert.ok(html.includes('<option value="' + model + '">' + label + ' (' +
        compactNumber(searchIndex.rows.filter(row => row[4] === model).length) + ')</option>'),
        'deployment model count for ' + model);
    }
    assert.match(html, /<details class="classification-help"><summary>How are these offers classified\?<\/summary>/);
    for (const id of ['koyeb', 'steadystack-initiate']) {
      const entry = entries.find(s => s.id === id);
      assert.equal(entry.eligibility, 'existing-users-only');
      const card = cardHTML(entry);
      assert.ok(card.includes('data-service-id="' + id + '"'));
      assert.match(card, /data-eligibility="existing-users-only"/);
      assert.match(card, /Legacy only/);
      const detail = fs.readFileSync(path.join(output, 'service', id, 'index.html'), 'utf8');
      assert.match(detail, /Legacy only/);
      assert.match(detail, /<dt>Eligibility<\/dt><dd>Legacy only/);
    }
    const normalDetail = fs.readFileSync(path.join(output, 'service/chatgpt-free/index.html'), 'utf8');
    assert.doesNotMatch(normalDetail, /Legacy only/);
    assert.match(normalDetail, /What do these plan and deployment labels mean/);
    // Mobile service pages put the official-source action before the long fact list,
    // while retaining the desktop action and all provider restrictions.
    const allowance = normalDetail.indexOf('class="detail-highlight"');
    const mobileAction = normalDetail.indexOf('class="detail-mobile-action"');
    const planDetails = normalDetail.indexOf('<h2>Plan details</h2>');
    assert.ok(allowance >= 0 && allowance < mobileAction && mobileAction < planDetails);
    assert.match(normalDetail, /class="detail-mobile-action"><a class="button primary"/);
    assert.match(normalDetail, /class="detail-action"><a class="button primary"/);
    assert.match(normalDetail, /class="detail-warning"/);
    const detailCss = fs.readFileSync(path.join(output, 'assets/site.css'), 'utf8');
    assert.match(detailCss, /\.detail-mobile-action\{display:none\}/);
    assert.match(detailCss, /\.detail-head\{display:contents\}/);
    assert.match(detailCss, /\.detail>\.spec-list\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
    assert.match(detailCss, /\.detail>\.detail-action\{display:none\}/);
    assert.match(detailCss, /\.detail-mobile-action\{[\s\S]*?position:fixed;inset:auto 0 0;z-index:44/);
    assert.match(detailCss, /\.detail-mobile-action\{[\s\S]*?env\(safe-area-inset-bottom\)/);
    assert.match(detailCss, /main:has\(\.detail-mobile-action\)\{padding-bottom:/);
    assert.match(detailCss, /body:has\(\.detail-mobile-action\) \.back-to-top\{[\s\S]*?bottom:calc\(86px \+ env\(safe-area-inset-bottom\)\)/);
    assert.match(detailCss, /body:has\(\.detail-mobile-action\) \.site-footer\{/);
    assert.ok(html.includes('<option value="limited">Time-limited &amp; expiring offers (' +
      compactNumber(limitedEntries.length) + ')</option>'));
    assert.doesNotMatch(html, /Only ongoing free allowances and recurring credits are counted here/);
    assert.ok(html.includes('data-offer-plan="ongoing"'));
    assert.ok(searchIndex.rows.some(row => row[3] === 'monthly-credit'));
    assert.ok(searchIndex.rows.some(row => row[3] === 'limited-duration'));
    assert.ok(html.includes('data-filter-category="ci-cd"'));
    assert.ok(html.includes('<option value="ci-cd">CI/CD &amp; pipelines (' +
      compactNumber(entries.filter(item => item.category === 'ci-cd').length) + ')</option>'));
    assert.ok(fs.existsSync(path.join(output, 'category/ci-cd/index.html')));
    const categoryHtml = fs.readFileSync(path.join(output, 'category/static-hosting/index.html'), 'utf8');
    assert.ok(categoryHtml.includes('class="service-grid category-service-grid" id="category-service-grid"'));
    assert.ok(categoryHtml.includes('id="category-pagination" hidden'));
    for (const id of ['category-tools', 'category-search', 'category-sort', 'category-plan',
      'category-hosting', 'category-no-card', 'category-commercial', 'category-clear-filters',
      'category-no-results']) assert.ok(categoryHtml.includes('id="' + id + '"'), id);
    assert.ok(categoryHtml.includes('id="category-tools" aria-label="Search and filter Static &amp; frontend hosting services" hidden'));
    assert.ok(categoryHtml.includes('<h1>Static &amp; frontend hosting</h1>'));
    assert.ok(categoryHtml.includes('id="category-page-status" role="status" aria-live="polite"'));
    assert.ok(categoryHtml.includes('id="category-load-more" aria-controls="category-service-grid"') ||
      categoryHtml.includes('id="category-load-more"'));
    assert.equal(categoryHtml.split('data-service-id="').length - 1,
      mainEntries.filter(item => item.category === 'static-hosting').length,
      'all category cards must stay in server-rendered HTML for SEO and no-JS access');
    assert.doesNotMatch(categoryHtml, /class="service-card" hidden/);
    const categoriesHtml = fs.readFileSync(path.join(output, 'categories/index.html'), 'utf8');
    assert.match(categoriesHtml, /<link rel="canonical" href="https:\/\/free-tier\.eplus\.dev\/categories\/"/);
    assert.match(categoriesHtml, /<h1>All categories<\/h1>/);
    assert.match(categoriesHtml, /"@type":"CollectionPage"/);
    assert.match(categoriesHtml, /"@type":"BreadcrumbList"/);
    assert.match(categoriesHtml, /aria-current="page">Categories<\/a>/);
    assert.match(categoriesHtml, /id="category-overview-search" type="search"/);
    assert.equal((categoriesHtml.match(/class="category-overview-card"/g) || []).length, CATEGORIES.length);
    assert.ok(categoriesHtml.includes('<strong>' + CATEGORIES.length + '</strong> categories'));
    assert.ok(categoriesHtml.includes('<strong>' + compactNumber(mainEntries.length) +
      '</strong> ongoing free tiers &amp; recurring credits'));
    for (const category of CATEGORIES) {
      const categoryUrl = 'https://free-tier.eplus.dev/category/' + category + '/';
      const start = categoriesHtml.indexOf('<a class="category-overview-card" href="' + categoryUrl + '"');
      assert.ok(start !== -1, category + ' is present in the index');
      const card = categoriesHtml.slice(start, categoriesHtml.indexOf('</a>', start));
      const count = mainEntries.filter(item => item.category === category).length;
      assert.ok(card.includes('<b>' + compactNumber(count) + '</b> ' + (count === 1 ? 'service' : 'services')),
        category + ': only ongoing free tiers count');
      assert.ok(card.includes('class="category-overview-description"'), category + ': has a description');
    }
    assert.match(html, /class="category-index-shortcut" href="https:\/\/free-tier\.eplus\.dev\/categories\/"/);
    assert.match(html, /href="https:\/\/free-tier\.eplus\.dev\/categories\/">All categories<\/a>/);
    assert.match(categoryHtml, /href="https:\/\/free-tier\.eplus\.dev\/categories\/">Categories<\/a>/);
    assert.match(fs.readFileSync(path.join(output, 'sitemap.xml'), 'utf8'), /<loc>https:\/\/free-tier\.eplus\.dev\/categories\/<\/loc>/);
    assert.match(fs.readFileSync(path.join(output, 'llms.txt'), 'utf8'), /\[All categories\]/);
    assert.match(fs.readFileSync(path.join(output, 'agents.md'), 'utf8'), /Category overview:/);
    assert.match(css, /\.category-overview-grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
    assert.match(css, /@media\(max-width:680px\)\{[\s\S]*?\.category-overview-grid\{grid-template-columns:1fr/);
    assert.match(js, /overviewSearch\.addEventListener\("input"/);

    assert.ok(fs.existsSync(path.join(output, 'service/crow-ci/index.html')));
    assert.doesNotMatch(html, /class="catalog-sidebar"/);
    assert.match(html, /class="catalog-toolbar"><div class="category-bar"/);
    assert.match(html, /class="search-filter-row"><form class="hero-search directory-search"/);
    assert.doesNotMatch(html, /class="hero-discovery"/);
    assert.equal((html.match(/class="official-link"/g) || []).length, Math.min(12, entries.length));
    assert.equal((html.match(/data-card-category=/g) || []).length, Math.min(12, entries.length));
    const fragmentHTML = Object.values(fragments).flatMap(group => Object.values(group)).join('');
    assert.equal((fragmentHTML.match(/class="official-link"/g) || []).length, entries.length);
    assert.match(fragmentHTML, /data-card-category="databases" href="https:\/\/free-tier\.eplus\.dev\/\?category=databases"/);
    assert.match(fragmentHTML, /data-card-hosting="cloud" href="https:\/\/free-tier\.eplus\.dev\/\?hosting=cloud"/);
    assert.doesNotMatch(html, /href=""/);
    for (const entry of entries) {
      const page = limitedEntries.some(item => item.id === entry.id) ? offersHtml : cardHTML(entry);
      const tracked = tag(providerReferralURL(entry.pricing_url));
      assert.ok(page.includes(`class="official-link" href="${tracked}"`), entry.id);
      const categoryPage = fs.readFileSync(path.join(output, 'category', entry.category, 'index.html'), 'utf8');
      if (mainEntries.some(item => item.id === entry.id)) {
        assert.ok(categoryPage.includes(`class="official-link" href="${tracked}"`), entry.id);
      }
      const detailPage = fs.readFileSync(path.join(output, 'service', entry.id, 'index.html'), 'utf8');
      assert.equal(detailPage.split(`href="${tracked}"`).length - 1, 3,
        entry.id + ': mobile CTA, desktop CTA and aside pricing link must share attribution');
      assert.ok(fs.existsSync(path.join(output, 'service', entry.id, 'index.html')), entry.id);
    }
  } finally { fs.rmSync(output, { recursive: true, force: true }); }
});

test('provider referral attribution preserves URLs, existing parameters, hash and canonicals', () => {
  const src = 'utm_source=free-tier.eplus.dev';
  const med = 'utm_medium=referral';
  assert.equal(providerReferralURL('https://vercel.com/pricing'),
    'https://vercel.com/pricing?' + src + '&' + med);
  assert.equal(providerReferralURL('https://vendor.example/pricing?plan=a%20b&sig=x%2By#quota'),
    'https://vendor.example/pricing?plan=a%20b&sig=x%2By&' + src + '&' + med + '#quota');
  assert.equal(providerReferralURL('https://shipvela.com/#pricing'),
    'https://shipvela.com/?' + src + '&' + med + '#pricing');
  assert.equal(providerReferralURL('https://desec.io/#!/en/product/dnshosting'),
    'https://desec.io/?' + src + '&' + med + '#!/en/product/dnshosting');
  assert.equal(providerReferralURL('https://vendor.example/pricing?utm_source=partner#details'),
    'https://vendor.example/pricing?utm_source=partner&' + med + '#details');
  assert.equal(providerReferralURL('https://vendor.example/pricing?utm_medium=email'),
    'https://vendor.example/pricing?utm_medium=email&' + src);
  const attributed = 'https://vendor.example/pricing?utm_source=partner&utm_medium=campaign';
  assert.equal(providerReferralURL(attributed), attributed);
  assert.equal(providerReferralURL('https://vendor.example/pricing?'), 'https://vendor.example/pricing?' + src + '&' + med);
  assert.equal(providerReferralURL('https://free-tier.eplus.dev/category/static-hosting/'),
    'https://free-tier.eplus.dev/category/static-hosting/');
  assert.equal(providerReferralURL('mailto:hello@example.com'), 'mailto:hello@example.com');
  assert.equal(providerReferralURL('/service/vercel/'), '/service/vercel/');
  assert.equal(tag(providerReferralURL('https://vendor.example/?foo=bar')),
    'https://vendor.example/?foo=bar&amp;' + src + '&amp;' + med);
});

test('category README badges show a compact new-service delta only when positive', () => {
  const base = categoryCountSVG(46);
  assert.match(base, /<title>46 services<\/title>/);
  assert.doesNotMatch(base, /\+0/);
  const withNew = categoryCountSVG(46, 3);
  assert.match(withNew, /<title>46 services, 3 added in the last 48 hours \(UTC\)<\/title>/);
  assert.match(withNew, />\+3<\/text>/);
  // One shared background; the smaller blue delta sits above the main count.
  assert.equal((withNew.match(/<rect /g) || []).length, 1);
  assert.equal((base.match(/<rect /g) || []).length, 1);
  assert.match(withNew, /<rect width="46" height="22" rx="7" fill="#e8f0ec"\/>/);
  assert.match(withNew, /<text x="16" y="15"[^>]+font-size="12"[^>]*>46<\/text>/);
  assert.match(withNew, /<text x="37" y="10"[^>]+font-size="9"[^>]*>\+3<\/text>/);
  assert.doesNotMatch(withNew, /fill="#eef2ff"|<path d="M32 5V17"/);
  assert.ok(Number(withNew.match(/width="(\d+)"/)[1]) > Number(base.match(/width="(\d+)"/)[1]));
  // Multi-digit deltas and larger totals still fit without a second pill.
  const large = categoryCountSVG(1234, 22);
  assert.match(large, /<title>1234 services, 22 added in the last 48 hours \(UTC\)<\/title>/);
  assert.equal((large.match(/<rect /g) || []).length, 1);
  assert.match(large, /font-size="9" font-weight="700">\+22<\/text>/);
  assert.equal(categoryCountSVG(46, 0), base);
  assert.throws(() => categoryCountSVG(-1), /Invalid category count/);
  for (const added of [-1, 47, 1.5, NaN]) {
    assert.throws(() => categoryCountSVG(46, added), /Invalid new category count/);
  }
  // Display only eligible offers in a category; limited promotions are never a +N here.
  const now = Date.parse('2026-11-06T12:00:00Z');
  const entries = [
    { category: 'storage', plan: 'ongoing', added_at_utc: '2026-11-05T08:00:00Z' },
    { category: 'storage', plan: 'monthly-credit', added_at_utc: '2026-11-06T08:00:00Z' },
    { category: 'storage', plan: 'limited-duration', added_at_utc: '2026-11-06T08:00:00Z' },
    { category: 'databases', plan: 'ongoing', added_at_utc: '2026-11-06T08:00:00Z' },
    { category: 'storage', plan: 'ongoing', added_at_utc: '2026-11-03T08:00:00Z' },
  ];
  const storageFree = entries.filter(item => item.category === 'storage' &&
    (item.plan === 'ongoing' || item.plan === 'monthly-credit'));
  assert.equal(storageFree.length, 3);
  assert.equal(countNewIn48Hours(storageFree, now), 2);
  assert.match(categoryCountSVG(storageFree.length, countNewIn48Hours(storageFree, now)),
    />\+2<\/text>/);
});

test('recent service indicators span category overview, category, offers and service detail', () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'new-badges-everywhere-'));
  try {
    build(output);
    const catalog = JSON.parse(fs.readFileSync(path.join(output, 'catalog.json'), 'utf8'));
    const now = Date.now();
    const eligible = catalog.filter(item => (item.plan === 'ongoing' || item.plan === 'monthly-credit') &&
      countNewIn48Hours([item], now) > 0);
    assert.ok(eligible.length > 0, 'fixture should contain recent services');
    const first = eligible[0];
    const overview = fs.readFileSync(path.join(output, 'categories/index.html'), 'utf8');
    const category = fs.readFileSync(path.join(output, 'category', first.category, 'index.html'), 'utf8');
    const detail = fs.readFileSync(path.join(output, 'service', first.id, 'index.html'), 'utf8');
    assert.match(overview, /class="category-overview-count"[\s\S]*?class="recent-count" data-new-published-times="/);
    assert.match(category, /CATEGORY · [^<]+<span class="recent-count" data-new-published-times="/);
    assert.match(category, /class="new-service-badge" hidden title="First published within the last 48 hours/);
    assert.ok(detail.includes('data-added-at-utc="' + first.added_at_utc + '"'));
    assert.match(detail, /class="new-service-badge detail-new-badge" hidden/);
    const limited = catalog.filter(item => item.plan === 'limited-duration' || item.plan === 'temporary-resource');
    if (limited.length) {
      const offers = fs.readFileSync(path.join(output, 'offers/index.html'), 'utf8');
      assert.ok(offers.includes('class="service-grid category-service-grid"'));
      assert.ok(offers.includes('class="new-service-badge" hidden'));
      if (countNewIn48Hours(limited, now) > 0) {
        assert.match(offers, /LIMITED OFFERS · [^<]+<span class="recent-count" data-new-published-times="/);
      }
    }
    assert.doesNotMatch(detail, /<h1>[^<]+<span class="new-service-badge"/);
  } finally {
    fs.rmSync(output, {recursive: true, force: true});
  }
});

test('category count badges are generated from source JSON and update on rebuild', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'directory-badges-'));
  try {
    const items = JSON.parse(fs.readFileSync(new URL('../data/services.json', import.meta.url), 'utf8'));
    const first = path.join(tmp, 'first');
    build(first);
    const firstPublished = JSON.parse(fs.readFileSync(path.join(first, 'catalog.json'), 'utf8'));
    const firstStats = JSON.parse(fs.readFileSync(path.join(first, 'catalog-stats.json'), 'utf8'));
    for (const category of CATEGORIES) {
      const subset = firstPublished.filter(item => item.category === category &&
        (item.plan === 'ongoing' || item.plan === 'monthly-credit'));
      const count = subset.length;
      const added = countNewIn48Hours(subset, Date.parse(firstStats.generated_at_utc));
      const svg = fs.readFileSync(path.join(first, 'badges', 'categories', category + '.svg'), 'utf8');
      assert.equal(svg, categoryCountSVG(count, added));
      assert.match(svg, /<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
      assert.match(svg, /role="img"/);
    }
    items.push({ ...items[0], id: 'dynamic-badge-test-service', name: 'Dynamic Badge Test Service' });
    const source = path.join(tmp, 'catalog.json');
    fs.writeFileSync(source, JSON.stringify(items));
    const second = path.join(tmp, 'second');
    build(second, undefined, source);
    const stats = JSON.parse(fs.readFileSync(path.join(second, 'catalog-stats.json'), 'utf8'));
    assert.equal(stats.total_services, items.length, 'badge stats must update on rebuild');
    assert.equal(stats.free_tier_count, items.filter(item => item.plan === 'ongoing' || item.plan === 'monthly-credit').length);
    assert.equal(stats.limited_offer_count, items.length - stats.free_tier_count);
    const published = JSON.parse(fs.readFileSync(path.join(second, 'catalog.json'), 'utf8'));
    assert.equal(stats.new_48h_window_hours, 48);
    assert.ok(!Number.isNaN(Date.parse(stats.generated_at_utc)));
    assert.equal(stats.new_48h_count, countNewIn48Hours(published, Date.parse(stats.generated_at_utc)));
    assert.equal(fs.readFileSync(path.join(second, 'badges/new-48h.svg'), 'utf8'),
      serviceCountSVG(stats.new_48h_count, 'new (48h)'));
    const firstBadge = fs.readFileSync(path.join(first, 'badges/services.svg'), 'utf8');
    const nextBadge = fs.readFileSync(path.join(second, 'badges/services.svg'), 'utf8');
    assert.equal(nextBadge, serviceCountSVG(stats.total_services));
    assert.notEqual(nextBadge, firstBadge, 'total badge must update when a service is added');
    assert.equal(fs.readFileSync(path.join(second, 'badges/free-tiers.svg'), 'utf8'),
      serviceCountSVG(stats.free_tier_count, 'free tiers'));
    assert.equal(fs.readFileSync(path.join(second, 'badges/limited-offers.svg'), 'utf8'),
      serviceCountSVG(stats.limited_offer_count, 'limited offers'));
    assert.throws(() => serviceCountSVG(-1), /Invalid service count/);
    assert.throws(() => serviceCountSVG(1, 'unknown'), /Invalid service badge label/);
    const runtime = fs.readFileSync(path.join(second, 'assets/site.js'), 'utf8');
    assert.match(runtime, /refreshNewServiceBadges\(document\)/);
    assert.match(runtime, /querySelectorAll\("\.service-card, \.detail"\)/);
    assert.match(runtime, /querySelectorAll\("\.recent-count"\)/);
    assert.match(runtime, /refreshNewServiceBadges\(grid\)/);
    assert.match(runtime, /now - published < 48 \* 60 \* 60 \* 1000/);
    const category = items[0].category;
    const subset = published.filter(item => item.category === category &&
      (item.plan === 'ongoing' || item.plan === 'monthly-credit'));
    const count = subset.length;
    const added = countNewIn48Hours(subset, Date.parse(stats.generated_at_utc));
    assert.equal(fs.readFileSync(path.join(second, 'badges', 'categories', category + '.svg'), 'utf8'),
      categoryCountSVG(count, added));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('All services includes limited offers while the free-tier subset stays separate', () => {
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
    assert.ok(home.includes('<option value="limited">Time-limited &amp; expiring offers (' +
      compactNumber(limited.length) + ')</option>'));
    assert.ok(home.includes('<span class="result-label">All offers</span><strong class="result-total">' +
      compactNumber(all.length + 51) + '</strong>'));
    assert.doesNotMatch(home, /class="limited-offer-shortcut"/, 'Limited offer count belongs in the Offer type filter, not summary');
    assert.equal((home.match(/class="service-card"/g) || []).length, Math.min(12, all.length));
    assert.ok(home.includes('data-search-index="https://free-tier.eplus.dev/search/index.json?v='));
    const index = JSON.parse(fs.readFileSync(path.join(output, 'search/index.json'), 'utf8'));
    assert.equal(index.rows.length, all.length);
    assert.equal(index.rows.filter(row => row[3] === 'limited-duration' || row[3] === 'temporary-resource').length, limited.length);
    assert.equal((offers.match(/class="service-card"/g) || []).length, limited.length);
    for (const item of limited) {
      assert.equal(home.includes('data-service-id="' + item.id + '"'),
        all.slice(0, 12).some(entry => entry.id === item.id),
        item.id + ': SSR uses the same full All services scope as search');
      const shard = JSON.parse(fs.readFileSync(path.join(output, 'search/cards', item.category + '.json'), 'utf8'));
      assert.ok(shard[item.id].includes('data-service-id="' + item.id + '"'), item.id);
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
  assert.equal(api.matchesOffer('education','', 'education'), true);
  assert.equal(api.matchesOffer('education','education','education'), true);
  assert.equal(api.matchesOffer('education','free','education'), false);
  assert.equal(api.matchesOffer('ongoing','education',''), false);
  assert.equal(api.matchesOffer('monthly-credit', 'monthly-credit'), true);
  assert.equal(api.matchesOffer('ongoing', 'monthly-credit'), false);
  assert.equal(api.matchesOffer('ongoing', ''), true);
  assert.equal(api.matchesOffer('limited-duration', ''), true);
  assert.equal(api.matchesOffer('temporary-resource', ''), true);
  assert.equal(api.matchesOffer('ongoing', 'free'), true);
  assert.equal(api.matchesOffer('monthly-credit', 'free'), true);
  assert.equal(api.matchesOffer('limited-duration', 'free'), false);
  assert.equal(api.matchesOffer('temporary-resource', 'limited'), true);
  assert.equal(api.matchesOffer('limited-duration', 'limited'), true);
  assert.equal(api.matchesOffer('ongoing', 'limited'), false);
  assert.equal(api.matchesOffer('limited-duration', 'ongoing'), false);
  assert.equal(api.matchesOffer('monthly-credit', 'invalid'), false);
  assert.equal(new URL(api.write('https://free-tier.eplus.dev/', {...state, offer:'limited'})).searchParams.get('offer'), 'limited');
  assert.equal(new URL(api.write('https://free-tier.eplus.dev/', {...state, offer:'free'})).searchParams.get('offer'), 'free');
  assert.equal(api.read('https://free-tier.eplus.dev/?offer=free', [''], ['default']).offer, 'free');
  const reset = new URL(api.write(href, {q:'', category:'', sort:'default', noCard:false, commercial:false}));
  assert.equal(reset.search, '?utm_source=test');
  assert.deepEqual(api.read('https://free-tier.eplus.dev/?hosting=bad&offer=limited-duration&category=bad&sort=bad&no_card=0&commercial=false', [''], ['default']),
    {hosting:'', offer:'', q:'', category:'', sort:'default', noCard:false, commercial:false});
});

test('search result headline reflects matches rather than the entire offer pool', async () => {
  await import('../site/assets/directory-url.js');
  const summarize = globalThis.FreeTierDirectoryURL.summarizeResults;
  assert.equal(typeof summarize, 'function');

  assert.deepEqual(summarize(926, 926, 12, {}), {
    label: 'All offers', total: '926', shown: 'Showing 12 of 926'
  });
  assert.deepEqual(summarize(49, 926, 12, { q: 'chat' }), {
    label: 'Matching offers', total: '49',
    shown: 'Showing 12 of 49'
  });
  assert.deepEqual(summarize(49, 926, 24, { q: 'chat', category: '' }), {
    label: 'Matching offers', total: '49',
    shown: 'Showing 24 of 49'
  });
  assert.deepEqual(summarize(0, 926, 12, { q: 'notfound' }), {
    label: 'Matching offers', total: '0',
    shown: 'Showing 0 of 0'
  });
  assert.deepEqual(summarize(4, 4, 12, { offer: 'limited' }), {
    label: 'Limited offers', total: '4', shown: 'Showing 4 of 4'
  });
  assert.deepEqual(summarize(1, 4, 12, { offer: 'limited', category: 'ai-assistants' }), {
    label: 'Matching offers', total: '1',
    shown: 'Showing 1 of 1'
  });
  assert.deepEqual(summarize(30, 30, 12, { offer: 'monthly-credit' }), {
    label: 'Monthly credits', total: '30', shown: 'Showing 12 of 30'
  });
  assert.deepEqual(summarize(13, 926, 12, { noCard: true }), {
    label: 'Matching offers', total: '13',
    shown: 'Showing 12 of 13'
  });
  assert.deepEqual(summarize(926, 926, 12, { q: '   ', sort: 'newest' }), {
    label: 'All offers', total: '926', shown: 'Showing 12 of 926'
  });

  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'directory-summary-'));
  try {
    const catalog = JSON.parse(fs.readFileSync(new URL('../data/services.json', import.meta.url), 'utf8'));
    const free = catalog.filter(item => item.plan === 'ongoing' || item.plan === 'monthly-credit');
    build(output);
    const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
    assert.ok(html.includes('<span class="result-label">All offers</span><strong class="result-total">' +
      compactNumber(catalog.length + 51) + '</strong>'));
    assert.match(html, /<div class="directory-heading"><h2>Explore services<\/h2>/);
    assert.doesNotMatch(html, /catalog-metrics|result-breakdown|hero-stats/);
    assert.ok(html.includes('<option value="free">Free tiers (' +
      compactNumber(free.length) + ')</option>'));
    assert.ok(html.includes('<span class="result-shown">Showing ' + compactNumber(Math.min(12, catalog.length)) + ' of ' + compactNumber(catalog.length) + '</span>'));
    const runtime = fs.readFileSync(path.join(output, 'assets/site.js'), 'utf8');
    assert.match(runtime, /urlState\.summarizeResults\(matched\.length, pool\.length, shown/);
    assert.match(runtime, /if \(nextCategory === ""\) resetDirectoryFilters\(\)/);
    assert.match(runtime, /function resetDirectoryFilters\(\)/);
    assert.match(runtime, /count\.replaceChildren\(totalLabel, totalBadge, shownLabel\)/);
    assert.doesNotMatch(runtime, /totalBadge\.hidden = !hasFilters/);
    assert.doesNotMatch(runtime, /totalBadge\.textContent = String\(pool\.length\)/);
  } finally { fs.rmSync(output, { recursive: true, force: true }); }
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

test('category Load more keeps batches, URL history, and links usable without a directory grid', async () => {
  const { runInNewContext } = await import('node:vm');
  const source = fs.readFileSync(new URL('../site/assets/site.js', import.meta.url), 'utf8');
  function setup(href, cardCount) {
    function element() {
      return { hidden: false, textContent: '', listeners: {}, attrs: {},
        addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
        setAttribute(key, val) { this.attrs[key] = val; },
        focus() { this.focused = true; }, scrollIntoView() { this.scrolled = true; },
        append() {}, appendChild() {}, querySelector() { return null; }
      };
    }
    const cards = Array.from({length: cardCount}, () => {
      const link = element(), card = element();
      card.querySelector = () => link;
      card.link = link;
      return card;
    });
    const grid = element();
    grid.querySelectorAll = () => cards;
    const pagination = element(), button = element(), wrap = element(), status = element();
    pagination.hidden = true;
    wrap.hidden = true;
    const nodes = {
      'category-service-grid': grid, 'category-pagination': pagination,
      'category-load-more': button, 'category-load-more-wrap': wrap,
      'category-page-status': status,
    };
    const document = {
      body: element(), createElement: element,
      documentElement: { setAttribute() {}, style: { setProperty() {} } },
      getElementById(id) { return nodes[id] || null; },
      querySelector() { return null; }, querySelectorAll() { return []; },
      addEventListener() {},
    };
    const window = {
      location: { href }, listeners: {},
      addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
      localStorage: { getItem() { return 'rejected'; } },
      matchMedia() { return { matches: false }; },
    };
    window.history = { pushState(_state, _title, url) {
      window.location.href = new URL(url, window.location.href).href;
    } };
    runInNewContext(source, { document, window, URL });
    return { cards, pagination, button, wrap, status, window };
  }
  const sample = setup('https://free-tier.eplus.dev/category/static-hosting/?utm_source=chatgpt.com#results', 26);
  assert.equal(sample.cards.filter(card => !card.hidden).length, 12);
  assert.equal(sample.status.textContent, 'Showing 12 of 26 services');
  assert.equal(sample.button.textContent, 'Show 12 more services');
  assert.equal(sample.pagination.hidden, false);
  assert.equal(sample.wrap.hidden, false);
  sample.button.listeners.click[0]();
  assert.equal(sample.cards.filter(card => !card.hidden).length, 24);
  assert.equal(sample.status.textContent, 'Showing 24 of 26 services');
  assert.equal(sample.button.textContent, 'Show 2 more services');
  assert.ok(sample.cards[12].link.focused && sample.cards[12].link.scrolled);
  assert.equal(new URL(sample.window.location.href).searchParams.get('page'), '2');
  assert.equal(new URL(sample.window.location.href).searchParams.get('utm_source'), 'chatgpt.com');
  assert.equal(new URL(sample.window.location.href).hash, '#results');
  sample.button.listeners.click[0]();
  assert.equal(sample.cards.filter(card => !card.hidden).length, 26);
  assert.equal(sample.wrap.hidden, true);
  sample.window.location.href = 'https://free-tier.eplus.dev/category/static-hosting/?page=2';
  sample.window.listeners.popstate[0]();
  assert.equal(sample.cards.filter(card => !card.hidden).length, 24);
  sample.window.location.href = 'https://free-tier.eplus.dev/category/static-hosting/?page=abc';
  sample.window.listeners.popstate[0]();
  assert.equal(sample.cards.filter(card => !card.hidden).length, 12);
  const direct = setup('https://free-tier.eplus.dev/category/static-hosting/?page=2', 26);
  assert.equal(direct.cards.filter(card => !card.hidden).length, 24);
  assert.equal(setup('https://free-tier.eplus.dev/category/static-hosting/?page=999', 26)
    .cards.filter(card => !card.hidden).length, 26);
  const small = setup('https://free-tier.eplus.dev/category/other/', 8);
  assert.equal(small.cards.filter(card => !card.hidden).length, 8);
  assert.equal(small.wrap.hidden, true);
  const css = fs.readFileSync(new URL('../site/assets/site.css', import.meta.url), 'utf8');
  assert.ok(css.includes('.category-pagination .load-more{width:100%;min-width:0;min-height:46px}'));
});

test('category search, offer/hosting/billing filters, sort and URL state work together', async () => {
  const { runInNewContext } = await import('node:vm');
  const source = fs.readFileSync(new URL('../site/assets/site.js', import.meta.url), 'utf8');
  function el() {
    return {
      hidden: false, checked: false, value: '', textContent: '', listeners: {}, attrs: {},
      addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); },
      setAttribute(name, value) { this.attrs[name] = value; },
      getAttribute(name) { return this.attrs[name] ?? null; },
      focus() { this.focused = true; },
      scrollIntoView() { this.scrolled = true; },
      append() {}, appendChild() {}, querySelector() { return null; },
    };
  }
  const items = Array.from({length: 26}, (_, i) => {
    const card = el(), link = el();
    link.textContent = 'Service ' + String(i).padStart(2, '0');
    card.attrs = {
      'data-search': (link.textContent + ' api tools').toLowerCase(),
      'data-offer-plan': i < 5 ? 'monthly-credit' : 'ongoing',
      'data-hosting-model': i % 2 === 0 ? 'cloud' : 'self-hosted',
      'data-credit-card': i % 3 === 0 ? 'no' : 'yes',
      'data-commercial-use': i % 4 === 0 ? 'yes' : 'no',
      'data-added-at-utc': '2026-11-05T00:' + String(i).padStart(2, '0') + ':00.000Z',
      'data-last-checked': i % 2 ? '2026-11-01' : '2026-11-05',
    };
    card.querySelector = () => link;
    card.link = link;
    return card;
  });
  const grid = el();
  grid.order = items.slice();
  grid.querySelectorAll = () => items;
  grid.appendChild = function (card) {
    this.order.splice(this.order.indexOf(card), 1);
    this.order.push(card);
  };
  const nodes = Object.fromEntries([
    'category-service-grid', 'category-pagination', 'category-load-more',
    'category-load-more-wrap', 'category-page-status', 'category-tools',
    'category-search', 'category-sort', 'category-plan', 'category-hosting',
    'category-no-card', 'category-commercial', 'category-filter-active',
    'category-clear-filters', 'category-no-results'
  ].map(id => [id, el()]));
  nodes['category-service-grid'] = grid;
  nodes['category-sort'].value = 'default';
  const document = {
    body: el(), createElement: el,
    documentElement: {style: {setProperty() {}}, setAttribute() {}},
    getElementById(id) {return nodes[id] || null;},
    querySelector() {return null;}, querySelectorAll() {return [];}, addEventListener() {},
  };
  const window = {
    location: {href: 'https://free-tier.eplus.dev/category/webhooks-events/?utm_source=chatgpt.com#results'},
    listeners: {}, addEventListener(type, fn) {(this.listeners[type] ||= []).push(fn);},
    localStorage: {getItem() {return 'rejected';}},
    matchMedia() {return {matches: false};},
  };
  for (const kind of ['pushState', 'replaceState']) window.history ||= {};
  window.history.pushState = window.history.replaceState = (_state, _title, url) => {
    window.location.href = new URL(url, window.location.href).href;
  };
  runInNewContext(source, {document, window, URL});
  const fire = (id, type) => nodes[id].listeners[type][0]();
  const visible = () => grid.order.filter(item => !item.hidden).map(item => item.link.textContent);
  assert.equal(nodes['category-tools'].hidden, false);
  assert.equal(visible().length, 12);
  assert.equal(nodes['category-page-status'].textContent, 'Showing 12 of 26 services');
  nodes['category-sort'].value = 'newest';
  fire('category-sort', 'change');
  assert.equal(visible()[0], 'Service 25');
  assert.equal(new URL(window.location.href).searchParams.get('sort'), 'newest');
  nodes['category-plan'].value = 'monthly-credit';
  fire('category-plan', 'change');
  assert.equal(visible().length, 5);
  assert.equal(nodes['category-page-status'].textContent, 'Showing 5 of 5 matching services');
  assert.equal(nodes['category-filter-active'].textContent, '1');
  assert.equal(new URL(window.location.href).searchParams.get('offer'), 'monthly-credit');
  nodes['category-hosting'].value = 'cloud';
  fire('category-hosting', 'change');
  assert.equal(visible().length, 3);
  assert.deepEqual(visible(), ['Service 04', 'Service 02', 'Service 00']);
  nodes['category-no-card'].checked = true;
  fire('category-no-card', 'change');
  assert.deepEqual(visible(), ['Service 00']);
  nodes['category-commercial'].checked = true;
  fire('category-commercial', 'change');
  assert.deepEqual(visible(), ['Service 00']);
  assert.equal(nodes['category-filter-active'].textContent, '4');
  nodes['category-search'].value = 'no such service';
  fire('category-search', 'input');
  assert.equal(visible().length, 0);
  assert.equal(nodes['category-no-results'].hidden, false);
  assert.equal(nodes['category-pagination'].hidden, true);
  assert.equal(new URL(window.location.href).searchParams.get('q'), 'no such service');
  assert.equal(new URL(window.location.href).searchParams.get('utm_source'), 'chatgpt.com');
  assert.equal(new URL(window.location.href).hash, '#results');
  fire('category-clear-filters', 'click');
  assert.equal(visible().length, 12);
  assert.equal(nodes['category-filter-active'].hidden, true);
  assert.equal(nodes['category-clear-filters'].hidden, true);
  assert.ok(nodes['category-search'].focused);
  assert.equal(new URL(window.location.href).searchParams.get('q'), null);
  assert.equal(new URL(window.location.href).searchParams.get('offer'), null);
  fire('category-load-more', 'click');
  assert.equal(visible().length, 24);
  assert.ok(items[12].link.focused && items[12].link.scrolled);
  const shared = new URL(window.location.href);
  assert.equal(shared.searchParams.get('page'), '2');
  shared.searchParams.set('q', 'Service 01');
  shared.searchParams.delete('page');
  window.location.href = shared.href;
  window.listeners.popstate[0]();
  assert.deepEqual(visible(), ['Service 01']);
  assert.equal(nodes['category-search'].value, 'Service 01');
  assert.equal(nodes['category-page-status'].textContent, 'Showing 1 of 1 matching services');
  assert.equal(items.filter(item => !item.hidden).length, 1);
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

test('contextual offer help opens on desktop hover and keeps mobile tap and keyboard behavior', () => {
  const js = fs.readFileSync(new URL('../site/assets/site.js', import.meta.url), 'utf8');
  assert.match(js, /\(hover: hover\) and \(pointer: fine\)/);
  assert.match(js, /summary\.addEventListener\("pointerenter", mouseEnter\)/);
  assert.match(js, /hoverRegion\.addEventListener\("pointerleave", mouseLeave\)/);
  assert.match(js, /content\.addEventListener\("pointerenter"/);
  assert.match(js, /event\.pointerType !== "mouse"/);
  assert.match(js, /event\.preventDefault\(\);\s+cancelClose\(\);\s+help\.open = true/);
  assert.match(js, /Touch taps and keyboard activation keep their native toggle behavior/);
  assert.match(js, /content\.contains\(document\.activeElement\)/);
});

test('optional eligibility is manually scoped to legacy ongoing offers', () => {
  const all = JSON.parse(fs.readFileSync(new URL('../data/services.json', import.meta.url), 'utf8'));
  const ordinary = all.find(item => item.id === 'chatgpt-free');
  assert.ok(ordinary && !ordinary.eligibility);
  assert.doesNotThrow(() => validateData([{...ordinary, eligibility:'existing-users-only'}]));
  assert.throws(() => validateData([{...ordinary, eligibility:'legacy'}]), /invalid eligibility/);
  assert.throws(() => validateData([{...ordinary, eligibility:'existing-users-only', plan:'limited-duration'}]), /invalid eligibility/);
});

test('service card plan badges stay at the top-right without arbitrary 110px wrapping', () => {
  const css = fs.readFileSync(new URL('../site/assets/site.css', import.meta.url), 'utf8');
  const badgeRule = css.match(/\.card-top>\.badge\{([^}]*)\}/);
  assert.ok(badgeRule, 'card-specific badge rule must exist');
  assert.match(badgeRule[1], /grid-column:3;grid-row:1;justify-self:end/);
  assert.match(badgeRule[1], /max-width:none/);
  assert.match(badgeRule[1], /white-space:nowrap/);
  assert.doesNotMatch(badgeRule[1], /max-width:110px|overflow-wrap:anywhere/);
  assert.match(css, /@media\(max-width:360px\)\{[\s\S]*?\.service-card \.card-top>\.badge\{grid-column:2;grid-row:1;justify-self:end\}/);
});


test('expired PR preview 404 counts down to matching production route with query and hash', async () => {
  const { runInNewContext } = await import('node:vm');
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'preview-404-recovery-'));
  try {
    build(output);
    const html = fs.readFileSync(path.join(output, '404.html'), 'utf8');
    const css = fs.readFileSync(path.join(output, 'assets/site.css'), 'utf8');
    const script = fs.readFileSync(path.join(output, 'assets/preview-fallback.js'), 'utf8');
    assert.match(html, /<meta name="robots" content="noindex,follow">/);
    assert.match(html, /id="generic-not-found"/);
    assert.match(html, /id="preview-expired" hidden/);
    assert.match(html, /id="preview-countdown" aria-live="polite">5<\/strong>/);
    assert.match(html, /id="preview-target-path"/);
    assert.match(html, /assets\/preview-fallback\.js\?v=[0-9a-f]{12}/);
    assert.match(css, /\.preview-expired\{max-width:740px/);

    function visit(href) {
      const elements = Object.fromEntries([
        'generic-not-found', 'preview-expired', 'preview-pr-number',
        'preview-countdown', 'preview-target-path', 'preview-go-now',
      ].map(id => [id, {hidden: id === 'preview-expired', textContent: '', href: ''}]));
      const location = new URL(href);
      let redirected = null;
      let interval = null;
      let delay = null;
      let cleared = null;
      location.replace = url => { redirected = url; };
      const window = {
        location,
        setInterval(fn, ms) { interval = fn; delay = ms; return 23; },
        clearInterval(id) { cleared = id; },
      };
      const document = { getElementById(id) { return elements[id] || null; } };
      runInNewContext(script, {window, document, URL});
      return {elements, tick() {if (interval) interval();}, get redirected() {return redirected;},
        get delay() {return delay;}, get cleared() {return cleared;}};
    }

    const expired = visit('https://free-tier.eplus.dev/pr-preview/pr-1955/category/webhooks-events/?sort=newest&utm_source=review#results');
    const target = 'https://free-tier.eplus.dev/category/webhooks-events/?sort=newest&utm_source=review#results';
    assert.equal(expired.elements['generic-not-found'].hidden, true);
    assert.equal(expired.elements['preview-expired'].hidden, false);
    assert.equal(expired.elements['preview-pr-number'].textContent, '#1955');
    assert.equal(expired.elements['preview-target-path'].textContent,
      '/category/webhooks-events/?sort=newest&utm_source=review#results');
    assert.equal(expired.elements['preview-go-now'].href, target);
    assert.equal(expired.elements['preview-countdown'].textContent, '5');
    assert.equal(expired.delay, 1000);
    for (const value of ['4', '3', '2', '1']) {
      expired.tick();
      assert.equal(expired.elements['preview-countdown'].textContent, value);
      assert.equal(expired.redirected, null);
    }
    expired.tick();
    assert.equal(expired.elements['preview-countdown'].textContent, '0');
    assert.equal(expired.redirected, target);
    assert.equal(expired.cleared, 23);

    const nested = visit('https://free-tier.eplus.dev/pr-preview/pr-1955/service/vercel/?q=cloud%20run');
    assert.equal(nested.elements['preview-go-now'].href,
      'https://free-tier.eplus.dev/service/vercel/?q=cloud%20run');
    const root = visit('https://free-tier.eplus.dev/pr-preview/pr-1955/');
    assert.equal(root.elements['preview-go-now'].href, 'https://free-tier.eplus.dev/');
    for (const ordinary of [
      'https://free-tier.eplus.dev/category/webhooks-events/?sort=newest',
      'https://free-tier.eplus.dev/pr-preview/foo/category/webhooks-events/',
      'https://free-tier.eplus.dev/pr-preview/pr-0/category/webhooks-events/',
      'https://free-tier.eplus.dev/pr-preview/pr-1955//evil.example/',
      'https://free-tier.eplus.dev/pr-preview/pr-1955/%2F%2Fevil.example/',
    ]) {
      const ignored = visit(ordinary);
      assert.equal(ignored.elements['generic-not-found'].hidden, false, ordinary);
      assert.equal(ignored.elements['preview-expired'].hidden, true, ordinary);
      assert.equal(ignored.delay, null, ordinary);
      assert.equal(ignored.redirected, null, ordinary);
    }
  } finally { fs.rmSync(output, {recursive: true, force: true}); }
});
