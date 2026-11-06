import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build, categoryCountSVG, serviceCountSVG, countNewIn48Hours, tag, serviceLogoURL, providerReferralURL } from './build-site.mjs';
import { CATEGORIES, validateData } from './catalog.mjs';
import { compactNumber } from '../site/assets/compact-numbers.js';

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
      free_tier_count: mainEntries.length,
      limited_offer_count: limitedEntries.length,
      total_services: entries.length,
      new_48h_count: countNewIn48Hours(published, Date.parse(stats.generated_at_utc)),
      new_48h_window_hours: 48,
      generated_at_utc: stats.generated_at_utc,
    });
    assert.ok(!Number.isNaN(Date.parse(stats.generated_at_utc)));
    assert.equal(stats.free_tier_count + stats.limited_offer_count, stats.total_services);
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
    assert.ok(html.includes('<select id="offer-filter"><option value="">All services (' +
      compactNumber(stats.total_services) + ')</option>'));
    assert.ok(html.includes('<option value="free">Free tiers (' +
      compactNumber(stats.free_tier_count) + ')</option>'));
    assert.ok(html.includes('<option value="ongoing">Ongoing free allowance (' +
      compactNumber(entries.filter(item => item.plan === 'ongoing').length) + ')</option>'));
    assert.ok(html.includes('<option value="monthly-credit">Recurring monthly credit (' +
      compactNumber(entries.filter(item => item.plan === 'monthly-credit').length) + ')</option>'));
    assert.ok(html.includes('<option value="limited">Time-limited &amp; expiring offers (' +
      compactNumber(stats.limited_offer_count) + ')</option>'));
    assert.ok(html.includes('<span class="result-label">All services</span><strong class="result-total">' +
      compactNumber(stats.total_services) + '</strong>'));
    assert.ok(html.includes('<span class="result-shown">Showing ' +
      compactNumber(Math.min(12, stats.total_services)) + ' of ' + compactNumber(stats.total_services) + '</span>'));
    assert.match(css, /\.results-meta\{[^}]*margin-left:auto/);
    assert.match(css, /@media\(max-width:680px\)\{\s*\.directory-heading\{flex-wrap:nowrap/);
    assert.ok(published.every(item => /^\d{4}-\d{2}-\d{2}$/.test(item.added_at)),
      'All published service dates must come from Git history');
    assert.match(html, /data-added-at="\d{4}-\d{2}-\d{2}"/);
    assert.match(html, /data-added-at-utc="\d{4}-\d{2}-\d{2}T[^"]+Z"/);
    assert.match(html, /class="new-service-badge" hidden title="First published within the last 48 hours \(UTC\)"/);
    assert.ok(published.every(item => /^\d{4}-\d{2}-\d{2}T[^\s]+Z$/.test(item.added_at_utc)));
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
    assert.match(html, /<select id="offer-filter"><option value="">All services \(/);
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
    assert.match(runtime, /refreshNewServiceBadges\(grid\)/);
    assert.match(runtime, /now - published < 48 \* 60 \* 60 \* 1000/);
    const category = items[0].category;
    const count = items.filter(item => item.category === category &&
      (item.plan === 'ongoing' || item.plan === 'monthly-credit')).length;
    assert.equal(fs.readFileSync(path.join(second, 'badges', 'categories', category + '.svg'), 'utf8'), categoryCountSVG(count));
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
    assert.ok(home.includes('<span class="result-label">All services</span><strong class="result-total">' +
      compactNumber(all.length) + '</strong>'));
    assert.ok(home.includes('class="limited-offer-shortcut" href="https://free-tier.eplus.dev/?offer=limited#explore"'));
    assert.ok(home.includes(compactNumber(limited.length) + ' limited offers</a>'));
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
    label: 'All services', total: '926', shown: 'Showing 12 of 926'
  });
  assert.deepEqual(summarize(49, 926, 12, { q: 'chat' }), {
    label: 'Matching services', total: '49',
    shown: 'Showing 12 of 49'
  });
  assert.deepEqual(summarize(49, 926, 24, { q: 'chat', category: '' }), {
    label: 'Matching services', total: '49',
    shown: 'Showing 24 of 49'
  });
  assert.deepEqual(summarize(0, 926, 12, { q: 'notfound' }), {
    label: 'Matching services', total: '0',
    shown: 'Showing 0 of 0'
  });
  assert.deepEqual(summarize(4, 4, 12, { offer: 'limited' }), {
    label: 'Limited offers', total: '4', shown: 'Showing 4 of 4'
  });
  assert.deepEqual(summarize(1, 4, 12, { offer: 'limited', category: 'ai-assistants' }), {
    label: 'Matching services', total: '1',
    shown: 'Showing 1 of 1'
  });
  assert.deepEqual(summarize(30, 30, 12, { offer: 'monthly-credit' }), {
    label: 'Monthly credits', total: '30', shown: 'Showing 12 of 30'
  });
  assert.deepEqual(summarize(13, 926, 12, { noCard: true }), {
    label: 'Matching services', total: '13',
    shown: 'Showing 12 of 13'
  });
  assert.deepEqual(summarize(926, 926, 12, { q: '   ', sort: 'newest' }), {
    label: 'All services', total: '926', shown: 'Showing 12 of 926'
  });

  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'directory-summary-'));
  try {
    const catalog = JSON.parse(fs.readFileSync(new URL('../data/services.json', import.meta.url), 'utf8'));
    const free = catalog.filter(item => item.plan === 'ongoing' || item.plan === 'monthly-credit');
    build(output);
    const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
    assert.ok(html.includes('<span class="result-label">All services</span><strong class="result-total">' +
      compactNumber(catalog.length) + '</strong>'));
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
