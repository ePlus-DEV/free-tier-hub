#!/usr/bin/env node
// Static HTML directory builder. Node.js 24, zero runtime dependencies.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, validateData } from './catalog.mjs';
import {
  CATEGORY_NAMES, CATEGORY_LABELS, PLAN_NAMES, CARD_NAMES, COMMERCIAL_NAMES,
  ICON_PATHS, CATEGORY_ICONS, SERVICE_LOGOS,
} from './site-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_URL = 'https://free-tier.eplus.dev/';
const REPOSITORY = 'https://github.com/ePlus-DEV/free-tier-hub';
const GA_ID = 'G-9YPGG0XEZV';

export function normalizeURL(siteURL) {
  let u;
  try { u = new URL(String(siteURL).trim()); } catch { throw Error('SITE_URL must be an HTTPS origin with an optional base path'); }
  if (u.protocol !== 'https:' || !u.hostname || u.username || u.password || u.search || u.hash) {
    throw Error('SITE_URL must be an HTTPS origin with an optional base path');
  }
  return u.origin.toLowerCase() + u.pathname.replace(/\/+$/, '') + '/';
}
export const tag = value => String(value ?? '').replace(/&/g, '&amp;')
  .replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
export const safeJSON = value => JSON.stringify(value).replace(/</g, '\\u003c');
const xmlEscape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const file = (output, relative, content) => {
  const target = path.join(output, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};
const glyph = name =>
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ' +
  'fill="none" stroke="currentColor" stroke-width="1.8" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
  ICON_PATHS[name] + '</svg>';
const monogram = name => (String(name).match(/[A-Za-z0-9]+/g) || []).slice(0, 2)
  .map(word => word[0]).join('').toUpperCase() || 'FT';
function serviceLogo(item) {
  const slug = SERVICE_LOGOS[item.id];
  const fallback = '<span class="service-monogram">' + tag(monogram(item.name)) + '</span>';
  if (!slug) return fallback;
  const src = 'https://cdn.jsdelivr.net/npm/simple-icons@v15/icons/' + slug + '.svg';
  return '<img class="service-logo" src="' + tag(src) + '" alt="" loading="lazy" ' +
    'decoding="async" referrerpolicy="no-referrer" ' +
    'onerror="this.hidden=true;this.nextElementSibling.hidden=false">' +
    '<span class="service-monogram" hidden>' + tag(monogram(item.name)) + '</span>';
}
function breadcrumb(crumbs) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: crumbs.map(([name, item], i) =>
      ({ '@type': 'ListItem', position: i + 1, name, item })) };
}
function card(item, absolute) {
  const dest = absolute('service/' + item.id + '/');
  const group = CATEGORY_NAMES[item.category];
  const searchable = [item.name, group, item.free_limit, item.watch_out].join(' ').toLowerCase();
  return [
    '<article class="service-card" data-service-id="', tag(item.id),
    '" data-category="', tag(item.category),
    '" data-added-at="', tag(item.added_at || ''),
    '" data-last-checked="', tag(item.last_checked),
    '" data-credit-card="', tag(item.credit_card),
    '" data-commercial-use="', tag(item.commercial_use),
    '" data-search="', tag(searchable), '">',
    '<div class="card-top"><span class="service-icon" aria-hidden="true">',
    serviceLogo(item), '</span><div class="card-identity"><h3><a href="', tag(dest),
    '">', tag(item.name), '</a></h3><span class="eyebrow">',
    tag(CATEGORY_LABELS[item.category]), '</span></div>',
    '<span class="badge" data-plan="', tag(item.plan), '">',
    tag(item.plan === 'ongoing' ? 'Free tier' : PLAN_NAMES[item.plan]), '</span></div>',
    '<div class="allowance-block"><span class="card-label">Free allowance</span><p class="allowance">', tag(item.free_limit), '</p></div>',
    '<div class="restriction-block"><span class="card-label">Keep in mind</span><p class="restriction">', tag(item.watch_out), '</p></div>',
    '<div class="card-bottom"><a href="', tag(dest), '" aria-label="View ', tag(item.name),
    ' details">View details ', glyph('arrow'), '</a><a class="official-link" href="', tag(item.pricing_url),
    '" rel="noopener noreferrer" aria-label="Official pricing source for ', tag(item.name), '">Official source ↗</a></div></article>',
  ].join('');
}
function document(absolute, title, description, relative, content, structuredData, robots = 'index,follow') {
  const canonical = absolute(relative);
  return [
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="color-scheme" content="light">',
    '<title>', tag(title), '</title>',
    '<meta name="description" content="', tag(description), '">',
    '<meta name="robots" content="', tag(robots), '">',
    '<link rel="canonical" href="', tag(canonical), '">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Free Tier Hub">',
    '<meta property="og:title" content="', tag(title), '">',
    '<meta property="og:description" content="', tag(description), '">',
    '<meta property="og:url" content="', tag(canonical), '">',
    '<meta name="twitter:card" content="summary">',
    '<link rel="icon" type="image/svg+xml" href="', tag(absolute('assets/icon.svg')), '">',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">',
    '<link rel="stylesheet" href="', tag(absolute('assets/site.css')), '">',
    '<link rel="alternate" type="text/plain" title="LLM overview" href="', tag(absolute('llms.txt')), '">',
    '<link rel="alternate" type="text/markdown" title="Agent discovery" href="', tag(absolute('agents.md')), '">',
    '<script type="application/ld+json">', safeJSON(structuredData), '</script>',
    '<script async src="https://www.googletagmanager.com/gtag/js?id=', GA_ID, '"></script>',
    '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}',
    "gtag('js',new Date());gtag('config','", GA_ID, "');</script>",
    '<script src="', tag(absolute('assets/site.js')), '" defer></script>',
    '</head><body><a class="skip-link" href="#main">Skip to content</a>',
    '<header class="site-header"><div class="container header-inner">',
    '<a class="brand" href="', tag(absolute()), '" aria-label="Free Tier Hub home">',
    '<span class="brand-mark"><img src="', tag(absolute('assets/icon.svg')),
    '" width="42" height="42" alt="" aria-hidden="true"></span>',
    '<span class="brand-wordmark"><span>Free Tier <strong>Hub</strong></span>',
    '<small>by ePlus-DEV</small></span></a>',
    '<nav class="primary-nav" id="primary-nav" aria-label="Main navigation">',
    '<a href="', tag(absolute()), '">Discover</a>',
    '<a href="', tag(absolute('#explore')), '">Categories</a>',
    '<a href="', tag(REPOSITORY + '/blob/main/CONTRIBUTING.md'), '">Contribute</a></nav>',
    '<div class="header-actions">',
    '<button class="header-search-toggle" id="header-search-toggle" type="button" ',
    'aria-label="Open search" aria-expanded="false" aria-controls="header-search-panel" ',
    'data-directory-url="', tag(absolute('#explore')), '">', glyph('search'), '</button>',
    '<button class="theme-toggle" id="theme-toggle" type="button" ',
    'aria-label="Switch to dark appearance" aria-pressed="false" title="Dark mode">',
    glyph('moon'), '</button>',
    '<a class="github-button" href="', tag(REPOSITORY + '/issues/new/choose'),
    '" rel="noopener noreferrer">', glyph('code'), 'GitHub</a>',
    '<button class="menu-toggle" id="menu-toggle" type="button" aria-expanded="false" ',
    'aria-controls="primary-nav" aria-label="Open navigation">',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">',
    '<path d="M4 6h16M4 12h16M4 18h16"/></svg></button></div></div>',
    '<div class="header-search-panel" id="header-search-panel" hidden>',
    '<div class="container header-search-inner">',
    '<label class="sr-only" for="header-search">Search free tiers</label>',
    glyph('search'), '<input id="header-search" type="search" ',
    'placeholder="Search free tiers..." autocomplete="off" aria-controls="service-grid">',
    '<kbd>Esc</kbd></div></div></header><main id="main" class="container">',
    content,
    '</main><footer class="site-footer"><div class="container">',
    '<div class="footer-grid"><div><div class="footer-brand"><img src="', tag(absolute('assets/icon.svg')), '" width="32" height="32" alt="">Free Tier Hub</div>',
    '<p>An independent, open-source directory for developers comparing ',
    'free tiers, practical limitations and official pricing sources.</p></div>',
    '<div><h3>Explore</h3><a href="', tag(absolute()), '">All services</a>',
    '<a href="', tag(absolute('#explore')), '">Categories</a>',
    '<a href="', tag(absolute('catalog.json')), '">Catalog JSON</a>',
    '<a href="', tag(absolute('sitemap.xml')), '">Sitemap</a></div>',
    '<div><h3>Developers</h3>',
    '<a href="', tag(absolute('llms.txt')), '">llms.txt</a>',
    '<a href="', tag(absolute('agents.md')), '">agents.md</a>',
    '<a href="', tag(REPOSITORY + '/blob/main/docs/cost-safety.md'), '">Cost safety</a>',
    '<a href="', tag(REPOSITORY + '/blob/main/CONTRIBUTING.md'), '">Contribute</a></div>',
    '</div><div class="footer-bottom"><span>© Free Tier Hub · Community-maintained.</span>',
    '<span>Independent catalog · Verify every provider before enabling billing.</span>',
    '</div></div></footer>',
    '<button class="back-to-top" id="back-to-top" type="button" ',
    'aria-label="Back to top" title="Back to top" hidden>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ',
    'fill="none" stroke="currentColor" stroke-width="2" ',
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
    '<path d="m6 14 6-6 6 6"/><path d="M12 8v12"/></svg>',
    '</button></body></html>',
  ].join('');
}
function homePage(items, absolute, counts) {
  const cards = items.map(item => card(item, absolute)).join('');
  const options = CATEGORIES.map(category =>
    '<option value="' + tag(category) + '">' + tag(CATEGORY_NAMES[category]) + '</option>').join('');
  const shortcuts = [['', 'All services'], ['static-hosting', 'Hosting'], ['databases', 'Databases'], ['ai-assistants', 'AI assistants'], ['storage', 'Storage']].map(([category, label]) =>
    '<button type="button" class="category-chip" data-filter-category="' + tag(category) + '" aria-pressed="' + (category === '' ? 'true' : 'false') + '">' + tag(label) + '</button>').join('');
  return [
    '<section class="hero"><div class="hero-copy">',
    '<p class="hero-kicker">The free-tier directory</p>',
    '<h1>Your next project starts here.</h1>',
    '<p>Discover free services. Compare limits. Build with confidence.</p>',
    '<form class="hero-search" id="directory-search-form" role="search"><label class="sr-only" for="search">Search free tiers</label>',
    glyph('search'), '<input id="search" type="search" autocomplete="off" ',
    'placeholder="Search services, categories, or keywords" aria-controls="service-grid">',
    '<button type="submit" class="search-submit">Search</button></form>',
    '<div class="category-bar"><div class="category-shortcuts" role="group" aria-label="Popular categories">', shortcuts, '</div>',
    '<label class="all-categories" for="category-filter"><span class="sr-only">All categories</span>',
    '<select id="category-filter"><option value="">All categories</option>', options, '</select></label></div>',
    '</div></section><section id="explore" class="section catalog-section">',
    '<div class="catalog-layout">',
    '<div class="catalog-main"><div class="directory-heading">',
    '<h2>Explore services</h2><div class="results-meta">',
    '<p class="result-count" id="results-count" aria-live="polite">Showing ',
    items.length, ' services</p>',
    '<button id="clear-filters" class="clear-filters" type="button" hidden>',
    'Clear filters</button></div></div><div class="filters">',
    '<div class="quick-filters" aria-label="Quick billing filters">',
        '<button type="button" data-quick-filter="no-card" aria-pressed="false">No credit card</button>',
    '<button type="button" data-quick-filter="commercial" aria-pressed="false">Commercial use</button>',
    '</div>',
    '<label class="sort-field" for="sort"><span class="sr-only">Sort by</span><select id="sort">',
    '<option value="default">Catalog order</option>',
    '<option value="newest">Newest added</option>',
    '<option value="oldest">Oldest added</option>',
    '<option value="verified">Recently verified</option>',
    '<option value="name">Name A–Z</option>',
    '<option value="name-desc">Name Z–A</option>',
    '<option value="category">Category</option></select></label>',
    '<div class="filter-popover-wrap">',
    '<button class="advanced-filter-toggle" id="advanced-filter-toggle" type="button" ',
    'aria-expanded="false" aria-controls="advanced-filters">',
    glyph('grid'), ' <span>Filters</span><span id="active-filter-count" class="active-filter-count" hidden>0</span></button>',
    '<div class="filter-checks" id="advanced-filters" role="group" aria-label="Additional filters" hidden>',
    '<div class="filter-popover-heading"><strong>Refine results</strong><span>Only show services that match</span></div>',
    '<label><input id="filter-no-card" type="checkbox"><span class="filter-option-copy">',
    '<strong>No credit card</strong><small>Start without adding a payment card</small></span></label>',
    '<label><input id="filter-commercial" type="checkbox"><span class="filter-option-copy">',
    '<strong>Commercial use</strong><small>Permitted for commercial projects</small></span></label>',
    '</div></div></div>',
    '<div class="service-grid" id="service-grid">', cards, '</div>',
    '<div class="load-more-wrap" id="load-more-wrap" hidden>',
    '<button class="load-more" type="button" id="load-more">Show more services</button>',
    '<span class="load-more-hint">Browse all matching services</span></div>',
    '<div class="no-results" id="no-results" hidden>', glyph('search'),
    '<h3>No matching services</h3><p>Try a broader search or clear your filters.</p></div>',
    '</div></div></section>',
    '<aside class="notice"><span class="notice-icon">', glyph('shield'),
    '</span><div><strong>Know the limits before you build.</strong>',
    '<p>Free allowances, billing requirements and regional eligibility can change. ',
    '<a href="', tag(REPOSITORY + '/blob/main/docs/cost-safety.md'),
    '">Review the cost and data-safety checklist ↗</a></p></div></aside>',
  ].join('');
}
function categoryPage(category, subset, absolute) {
  const name = CATEGORY_NAMES[category];
  return [
    '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="', tag(absolute()),
    '">Home</a><span aria-hidden="true">/</span><span>', tag(name), '</span></nav>',
    '<section class="page-intro"><p class="kicker">CATEGORY · ', subset.length,
    ' SERVICES</p><h1>', tag(name), '</h1>',
    '<p>Compare included quotas, restrictions and official provider documentation.</p></section>',
    '<div class="service-grid category-service-grid">',
    subset.map(item => card(item, absolute)).join(''), '</div>',
    '<p class="back-link"><a href="', tag(absolute()),
    '">← All categories and services</a></p>',
  ].join('');
}
function detailPage(item, absolute) {
  const name = item.name;
  const category = CATEGORY_NAMES[item.category];
  const categoryURL = absolute('category/' + item.category + '/');
  const fields = [
    ['Plan', PLAN_NAMES[item.plan]],
    ['Credit card', CARD_NAMES[item.credit_card]],
    ['Commercial use', COMMERCIAL_NAMES[item.commercial_use]],
    ['Last checked', item.last_checked],
  ];
  const specs = fields.map(([key, value]) =>
    '<div class="spec"><dt>' + tag(key) + '</dt><dd>' + tag(value) + '</dd></div>').join('');
  const link = tag(item.pricing_url);
  return [
    '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="', tag(absolute()),
    '">Home</a><span aria-hidden="true">/</span><a href="', tag(categoryURL),
    '">', tag(category), '</a><span aria-hidden="true">/</span><span>', tag(name),
    '</span></nav><div class="detail-layout"><article class="detail">',
    '<div class="detail-head"><span class="detail-icon" aria-hidden="true">',
    serviceLogo(item), '</span><span class="badge" data-plan="',
    tag(item.plan), '">', tag(PLAN_NAMES[item.plan]), '</span></div>',
    '<p class="kicker">', tag(category), '</p><h1>', tag(name), '</h1>',
    '<p class="detail-lead">Explore this developer service’s free allowance, ',
    'critical restrictions and official documentation before deploying.</p>',
    '<div class="detail-highlight">', glyph('layers'),
    '<div><strong>INCLUDED FREE ALLOWANCE</strong><p>', tag(item.free_limit),
    '</p></div></div><h2>Plan details</h2><dl class="spec-list">', specs, '</dl>',
    '<h2>Important restrictions</h2><div class="detail-warning">',
    glyph('alert'), '<p>', tag(item.watch_out), '</p></div>',
    '<div class="detail-action"><a class="button primary" href="', link,
    '" target="_blank" rel="noopener noreferrer">View official documentation ',
    glyph('arrow'), '</a></div>',
    '<p class="disclaimer">Independent community listing, not affiliated with the provider. ',
    'Always check the latest billing policy and quotas before enabling paid usage.</p>',
    '</article><aside class="detail-aside"><p class="kicker">SOURCE OF TRUTH</p>',
    '<h2>Verify current pricing</h2><p>Provider plans can change at any time. ',
    'Check the latest limits, billing rules and eligibility directly with the source.</p>',
    '<a class="button secondary" href="', link,
    '" target="_blank" rel="noopener noreferrer">Official pricing ',
    glyph('arrow'), '</a><hr><h2>More in this category</h2>',
    '<p>Explore other ', tag(category.toLowerCase()), ' services with their free allowances.</p>',
    '<a class="text-link" href="', tag(categoryURL),
    '">Browse category ', glyph('arrow'), '</a></aside></div>',
    '<p class="back-link"><a href="', tag(categoryURL),
    '">← Back to ', tag(category), '</a></p>',
  ].join('');
}
export function build(outputDir = path.join(ROOT, 'dist'), siteURL = DEFAULT_URL,
  catalogPath = path.join(ROOT, 'data/services.json')) {
  const base = normalizeURL(siteURL);
  const absolute = (relative = '') => base + relative;
  const items = validateData(JSON.parse(fs.readFileSync(catalogPath, 'utf8')));
  if (CATEGORIES.some(c => !(c in CATEGORY_NAMES) || !(c in CATEGORY_ICONS))) {
    throw Error('Missing category presentation metadata');
  }
  const output = path.resolve(outputDir);
  fs.mkdirSync(output, { recursive: true });
  const counts = Object.fromEntries(CATEGORIES.map(category =>
    [category, items.filter(item => item.category === category).length]));
  const latest = items.map(item => item.last_checked).sort().at(-1);
  const pageURLs = [];
  const siteName = 'Free Tier Hub';
  const homeSchema = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebSite', name: siteName, url: base,
      description: 'An independently maintained directory of developer free tiers.' },
    { '@type': 'CollectionPage', name: 'Free Tier Hub developer directory',
      url: base, mainEntity: { '@type': 'ItemList', numberOfItems: items.length,
        itemListElement: items.map((item, i) =>
          ({ '@type': 'ListItem', position: i + 1, name: item.name,
            url: absolute('service/' + item.id + '/') })) } },
  ] };
  file(output, 'index.html', document(absolute,
    'Free Tier Hub | Free Hosting, Cloud, Databases & Developer Tools',
    'Explore free-tier hosting, databases, cloud, queues, AI APIs and developer tools with official pricing links and usage caveats.',
    '', homePage(items, absolute, counts), homeSchema));
  pageURLs.push(['', latest]);
  for (const category of CATEGORIES) {
    const subset = items.filter(item => item.category === category);
    const name = CATEGORY_NAMES[category], relative = 'category/' + category + '/';
    const crumbs = [['Home', base], [name, absolute(relative)]];
    const schema = { '@context': 'https://schema.org', '@graph': [
      { '@type': 'CollectionPage', name: name + ' — Free Tier Hub',
        url: absolute(relative), mainEntity: { '@type': 'ItemList',
          numberOfItems: subset.length, itemListElement: subset.map((item, i) =>
            ({ '@type': 'ListItem', position: i + 1, name: item.name,
              url: absolute('service/' + item.id + '/') })) } },
      { '@type': 'BreadcrumbList', itemListElement: breadcrumb(crumbs).itemListElement },
    ] };
    file(output, relative + 'index.html', document(absolute,
      name + ' Free Tiers | Free Tier Hub',
      'Compare free-tier ' + name.toLowerCase() + ' providers and their verified pricing sources and restrictions.',
      relative, categoryPage(category, subset, absolute), schema));
    pageURLs.push([relative, subset.map(item => item.last_checked).sort().at(-1) || latest]);
  }
  for (const item of items) {
    const category = CATEGORY_NAMES[item.category];
    const relative = 'service/' + item.id + '/';
    const crumbs = [['Home', base],
      [category, absolute('category/' + item.category + '/')],
      [item.name, absolute(relative)]];
    const schema = { '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebPage', name: item.name + ' Free Tier', url: absolute(relative),
        description: item.free_limit + '. ' + item.watch_out,
        dateModified: item.last_checked, about: {
          '@type': 'Thing', name: item.name, url: item.pricing_url,
        } },
      { '@type': 'BreadcrumbList', itemListElement: breadcrumb(crumbs).itemListElement },
    ] };
    file(output, relative + 'index.html', document(absolute,
      item.name + ' Free Tier, Limits & Restrictions | Free Tier Hub',
      item.free_limit + '. ' + item.watch_out, relative,
      detailPage(item, absolute), schema));
    pageURLs.push([relative, item.last_checked]);
  }
  let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const [relative, modified] of pageURLs) {
    sitemap += '  <url><loc>' + xmlEscape(absolute(relative)) +
      '</loc><lastmod>' + modified + '</lastmod></url>\n';
  }
  sitemap += '</urlset>\n';
  file(output, 'sitemap.xml', sitemap);
  file(output, 'robots.txt', 'User-agent: *\nAllow: ' +
    new URL(base).pathname + '\nSitemap: ' + absolute('sitemap.xml') + '\n');
  const llms = [
    '# Free Tier Hub', '',
    '> Independent developer free-tier directory with usage caveats and official provider links.', '',
    '## Primary resources',
    '- [Directory](' + base + '): crawlable HTML index of all listed services.',
    '- [Catalog JSON](' + absolute('catalog.json') +
      '): machine-readable data with source URLs, review dates and plan types.',
    '- [Sitemap](' + absolute('sitemap.xml') + '): category and service URLs.',
    '- [Agent discovery](' + absolute('agents.md') + '): optional reading guide.', '',
    '## Categories',
    ...CATEGORIES.map(category =>
      '- [' + CATEGORY_NAMES[category] + '](' + absolute('category/' + category + '/') + ')'),
    '', '## Interpretation',
    '- A listed offer may be an ongoing allowance, recurring credit, trial or expiring resource.',
    '- An unknown card or commercial-use value means check the provider; it does not mean permission is granted.',
    '- Official provider links in the JSON are the primary sources of current billing and limits.',
    '- Review dates are editorial snapshots, not a guarantee that a provider has not changed its terms.', '',
  ];
  file(output, 'llms.txt', llms.join('\n'));
  const agents = [
    '# Free Tier Hub — Agent Discovery', '',
    'This Markdown file is optional guidance for automated readers, not a robots.txt policy.', '',
    '## Discover',
    '- Human-readable index: ' + base,
    '- Machine-readable catalog: ' + absolute('catalog.json'),
    '- Sitemap: ' + absolute('sitemap.xml'),
    '- LLM summary: ' + absolute('llms.txt'), '',
    '## Data model',
    'Each catalog entry includes id, name, category, plan, free_limit, watch_out, pricing_url,',
    'credit_card, commercial_use and last_checked. Treat the official pricing_url as the source',
    'of truth when checking current quotas, billing requirements and commercial eligibility.', '',
    '## Access and attribution',
    "- Follow the origin's authoritative /robots.txt and applicable service terms.",
    '- Prefer canonical HTML URLs from sitemap.xml, not invented provider detail links.',
    '- Link back to the individual listing or original provider documentation when quoting limits.',
    '- Avoid interpreting unknown card or commercial-use values as a verified yes/no.', '',
    '## Category entry points',
    ...CATEGORIES.map(category =>
      '- [' + CATEGORY_NAMES[category] + '](' + absolute('category/' + category + '/') + ')'),
  ];
  file(output, 'agents.md', agents.join('\n') + '\n');
  file(output, 'catalog.json', JSON.stringify(items, null, 2) + '\n');
  for (const name of ['site.css', 'site.js', 'icon.svg']) {
    const dest = path.join(output, 'assets', name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'site/assets', name), dest);
  }
  file(output, '.nojekyll', '');
  file(output, '404.html', document(absolute,
    'Page not found | Free Tier Hub', 'The requested page could not be found.',
    '404.html',
    '<section class="page-intro"><h1>Page not found</h1><p>Browse our current directory instead.</p>' +
    '<a class="button primary" href="' + tag(base) + '">Back to Free Tier Hub</a></section>',
    { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Page not found',
      url: absolute('404.html') }, 'noindex,follow'));
  return { service_count: items.length, category_count: CATEGORIES.length,
    page_count: pageURLs.length, urls: pageURLs.map(([relative]) => absolute(relative)),
    site_url: base, output };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const value = (name, fallback) => {
    const i = args.indexOf(name);
    return i < 0 ? fallback : args[i + 1];
  };
  try {
    const result = build(value('--output', path.join(ROOT, 'dist')),
      value('--site-url', process.env.SITE_URL || DEFAULT_URL),
      value('--catalog', path.join(ROOT, 'data/services.json')));
    console.log('Built', result.page_count, 'indexable pages for', result.site_url);
  } catch (error) {
    console.error('FAIL:', error.stack || error.message);
    process.exitCode = 1;
  }
}
