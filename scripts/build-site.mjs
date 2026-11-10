#!/usr/bin/env node
// Static HTML directory builder. Node.js 24, zero runtime dependencies.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, validateData } from './catalog.mjs';
import { loadServices } from './catalog-source.mjs';
import { loadEducationPrograms } from './education-programs.mjs';
import { educationSearchRows, unifiedOfferStats } from './unified-offers.mjs';
import { compactNumber, compactQuantityText } from '../site/assets/compact-numbers.js';
import { activeServiceAliases } from './service-aliases.mjs';
import { relatedServiceMap } from './service-relations.mjs';
import {
  CATEGORY_NAMES, CATEGORY_LABELS, CATEGORY_DESCRIPTIONS, PLAN_NAMES, CARD_NAMES, COMMERCIAL_NAMES,
  CATEGORY_ICONS, SERVICE_LOGO_DOMAINS,
} from './site-data.mjs';

import { FONT_AWESOME_ICONS } from './fontawesome.mjs';
import { serviceAddedDates } from './service-added-at.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetVersion = name => createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'site/assets', name))).digest('hex').slice(0, 12);
export const DEFAULT_URL = 'https://free-tier.eplus.dev/';
const REPOSITORY = 'https://github.com/ePlus-DEV/free-tier-hub';
const SUPPORT_URL = 'https://eplus.dev/page/donate';
const SPONSORS_URL = 'https://github.com/sponsors/ePlus-DEV';
const GA_ID = 'G-9YPGG0XEZV';

// Add referral attribution only to links that leave our catalog. Preserve the
// provider's exact query bytes, fragments and any UTM parameters it already set.
export function providerReferralURL(rawURL) {
  const value = String(rawURL);
  let parsed;
  try { parsed = new URL(value); } catch { return value; }
  if (!['http:', 'https:'].includes(parsed.protocol) ||
      parsed.hostname.toLowerCase() === 'free-tier.eplus.dev') return value;
  const additions = [];
  if (!parsed.searchParams.has('utm_source')) additions.push('utm_source=free-tier.eplus.dev');
  if (!parsed.searchParams.has('utm_medium')) additions.push('utm_medium=referral');
  if (!additions.length) return value;
  const hashIndex = value.indexOf('#');
  const url = hashIndex < 0 ? value : value.slice(0, hashIndex);
  const fragment = hashIndex < 0 ? '' : value.slice(hashIndex);
  const separator = url.includes('?')
    ? (url.endsWith('?') || url.endsWith('&') ? '' : '&') : '?';
  return url + separator + additions.join('&') + fragment;
}

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
const glyph = name => {
  const icon = FONT_AWESOME_ICONS[name];
  if (!icon) throw new Error('Unknown Font Awesome icon: ' + name);
  return '<svg xmlns="http://www.w3.org/2000/svg" class="fa-icon" data-fa-icon="' + name +
    '" viewBox="' + icon.viewBox + '" fill="currentColor" aria-hidden="true" focusable="false">' +
    '<!-- Font Awesome Free 6.7.2 by @fontawesome — https://fontawesome.com; CC BY 4.0 -->' + icon.body + '</svg>';
};
const monogram = name => (String(name).match(/[A-Za-z0-9]+/g) || []).slice(0, 2)
  .map(word => word[0]).join('').toUpperCase() || 'FT';
export function serviceLogoURL(item) {
  // Provider favicons retain the actual brand artwork and colors. Domain overrides
  // distinguish products sharing a corporate pricing/documentation website.
  const domain = SERVICE_LOGO_DOMAINS[item.id] || new URL(item.pricing_url).hostname;
  return 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(domain) + '&sz=128';
}
function serviceLogo(item) {
  return '<img class="service-logo" src="' + tag(serviceLogoURL(item)) + '" alt="" width="32" height="32" loading="lazy" ' +
    'decoding="async" referrerpolicy="no-referrer" ' +
    'onerror="this.hidden=true;this.nextElementSibling.hidden=false">' +
    '<span class="service-monogram" hidden>' + tag(monogram(item.name)) + '</span>';
}

function breadcrumb(crumbs) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: crumbs.map(([name, item], i) =>
      ({ '@type': 'ListItem', position: i + 1, name, item })) };
}
// Classify the listed offer, not every edition sold by the same vendor.
const hostingModel = item => item.deployment_model || 'unclassified';
const HOSTING_LABELS = {cloud: 'Cloud', 'self-hosted': 'Self-hosted', hybrid: 'Cloud + self-hosted', local: 'Local / embedded', unclassified: 'Not specified'};
// A perpetual free license/self-managed edition is not a vendor-hosted free tier.
// This is a display distinction only: pricing and commercial terms remain source-verified catalog data.
function planBadge(item) {
  if (item.plan !== 'ongoing') return PLAN_NAMES[item.plan];
  const model = hostingModel(item);
  if (model === 'self-hosted') return 'Free self-hosted software';
  if (model === 'local') return 'Free local software';
  if (model === 'unclassified') return 'Free offering';
  return 'Free tier';
}

// A service is NEW only during the 48 hours following first publication.
// Provider re-verification and catalog rebuilds never reset this timestamp.
export function countNewIn48Hours(items, now = Date.now()) {
  const windowMs = 48 * 60 * 60 * 1000;
  return items.filter(item => {
    const added = Date.parse(item.added_at_utc || '');
    return Number.isFinite(added) && added <= now && now - added < windowMs;
  }).length;
}

// Only ongoing allowances and recurring credits belong in the main free-tier directory.
// Time-limited trials and expiring resources stay available in a separate archive.
const isMainFreeOffer = item => item.plan === 'ongoing' || item.plan === 'monthly-credit';

function card(item, absolute, initiallyHidden = false) {
  const dest = absolute('service/' + item.id + '/');
  const group = CATEGORY_NAMES[item.category];
  // Include the canonical ID: users often search joined brand names such as "quillforms".
  const searchable = [item.id, item.name, group, item.free_limit, item.watch_out].join(' ').toLowerCase();
  return [
    '<article class="service-card"', initiallyHidden ? ' hidden' : '', ' data-service-id="', tag(item.id),
    '" data-category="', tag(item.category),
    '" data-hosting-model="', hostingModel(item),
    '" data-offer-plan="', tag(item.plan),
    '" data-program="', tag(item.program || ''),
    '" data-eligibility="', tag(item.eligibility || ''),
    '" data-added-at="', tag(item.added_at || ''),
     '" data-added-at-utc="', tag(item.added_at_utc || ''),
    '" data-last-checked="', tag(item.last_checked),
    '" data-credit-card="', tag(item.credit_card),
    '" data-commercial-use="', tag(item.commercial_use),
    '" data-search="', tag(searchable), '">',
    '<div class="card-top"><span class="service-icon" aria-hidden="true">',
    serviceLogo(item), '</span><div class="card-identity"><h3><a href="', tag(dest),
    '">', tag(item.name), '</a><span class="new-service-badge" hidden ',
     'title="First published within the last 48 hours (UTC)" ',
     'aria-label="New service in the last 48 hours">NEW</span></h3><span class="eyebrow">',
    '<a class="card-filter-link" data-card-category="', tag(item.category), '" href="', tag(absolute('?category=' + encodeURIComponent(item.category))),
    '" aria-label="Filter by category: ', tag(CATEGORY_LABELS[item.category]), '">', tag(CATEGORY_LABELS[item.category]), '</a>',
    hostingModel(item) !== 'unclassified' ? '<span class="deployment-meta"><span aria-hidden="true"> · </span><a class="card-filter-link" data-card-hosting="' + hostingModel(item) + '" href="' + tag(absolute('?hosting=' + hostingModel(item))) + '" aria-label="Filter by deployment model: ' + HOSTING_LABELS[hostingModel(item)] + '">' + HOSTING_LABELS[hostingModel(item)] + '</a></span>' : '', '</span></div>',
    '<span class="badge" data-plan="', tag(item.plan), '">',
    tag(item.program === 'startup' ? 'Startup program' : planBadge(item)), '</span></div>',
    item.eligibility === 'existing-users-only'
      ? '<div class="eligibility-note"><strong>Legacy only</strong> · Free allowance reserved for eligible existing accounts. ' +
        '<details class="eligibility-help"><summary>Why?</summary>' +
        '<div class="eligibility-help-panel"><strong>Existing accounts only</strong>' +
        '<p>Some providers keep an older free plan for qualifying accounts, while new signups may require a paid plan. Legacy eligibility is not a free trial.</p>' +
        '<a href="' + tag(absolute('about/classifications/#eligibility')) + '" target="_blank" rel="noopener noreferrer">Read eligibility policy ↗</a>' +
        '</div></details></div>' : '',
    '<div class="allowance-block"><span class="card-label">Free allowance</span><p class="allowance"',
    compactQuantityText(item.free_limit) !== item.free_limit ? ' title="' + tag(item.free_limit) + '" aria-label="' + tag(item.free_limit) + '"' : '',
    '>', tag(compactQuantityText(item.free_limit)), '</p></div>',
    '<div class="restriction-block"><span class="card-label">Keep in mind</span><p class="restriction"',
    compactQuantityText(item.watch_out) !== item.watch_out ? ' title="' + tag(item.watch_out) + '" aria-label="' + tag(item.watch_out) + '"' : '',
    '>', tag(compactQuantityText(item.watch_out)), '</p></div>',
    '<div class="card-bottom"><button type="button" class="compare-card-toggle" data-compare-add="', tag(item.id),
    '" data-compare-name="', tag(item.name), '" aria-pressed="false">+ Compare</button><a href="', tag(dest), '" aria-label="View ', tag(item.name),
    ' details">View details ', glyph('arrow'), '</a><a class="official-link" href="', tag(providerReferralURL(item.pricing_url)),
    '" target="_blank" rel="noopener noreferrer" aria-label="Official pricing source for ', tag(item.name), '">Official source ↗</a></div></article>',
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
    '<meta property="og:image" content="', tag(absolute('assets/og-image.png')), '">',
    '<meta property="og:image:type" content="image/png">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="Free Tier Hub — Find the right tools. Build for free.">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:image" content="', tag(absolute('assets/og-image.png')), '">',
    '<meta name="twitter:image:alt" content="Free Tier Hub — Find the right tools. Build for free.">',
    '<link rel="icon" type="image/svg+xml" href="', tag(absolute('assets/icon.svg')), '">',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">',
    '<link rel="stylesheet" href="', tag(absolute('assets/site.css?v=' + assetVersion('site.css'))), '">',
    '<link rel="alternate" type="text/plain" title="LLM overview" href="', tag(absolute('llms.txt')), '">',
    '<link rel="alternate" type="text/markdown" title="Agent discovery" href="', tag(absolute('agents.md')), '">',
    '<script type="application/ld+json">', safeJSON(structuredData), '</script>',
    '<meta name="fth-analytics" content="', GA_ID, '">',
    '<script src="', tag(absolute('assets/directory-url.js?v=' + assetVersion('directory-url.js'))), '" defer></script>',
    '<script src="', tag(absolute('assets/site.js?v=' + assetVersion('site.js'))), '" defer></script>',
    '<script type="module" src="', tag(absolute('assets/compare.js?v=' + assetVersion('compare.js'))), '"></script>',
    '</head><body><a class="skip-link" href="#main">Skip to content</a>',
    '<header class="site-header"><div class="container header-inner">',
    '<a class="brand" href="', tag(absolute()), '" aria-label="Free Tier Hub home">',
    '<span class="brand-mark"><img src="', tag(absolute('assets/icon.svg')),
    '" width="42" height="42" alt="" aria-hidden="true"></span>',
    '<span class="brand-wordmark"><span>Free Tier <strong>Hub</strong></span>',
    '<small>by ePlus-DEV</small></span></a>',
    '<nav class="primary-nav" id="primary-nav" aria-label="Main navigation">',
    '<a href="', tag(absolute()), '"', relative === '' ? ' aria-current="page"' : '', '>Discover</a>',
    '<a href="', tag(absolute('categories/')), '"', relative === 'categories/' ? ' aria-current="page"' : '', '>Categories</a>',
    '<a href="', tag(absolute('compare/')), '"', relative === 'compare/' ? ' aria-current="page"' : '', '>Compare</a>',
    '<a href="', tag(absolute('education/')), '"', relative === 'education/' ? ' aria-current="page"' : '', '>Education</a>',
    '<a href="', tag(REPOSITORY + '/blob/main/CONTRIBUTING.md'), '">Contribute</a>',
    '<a href="', tag(SUPPORT_URL), '" target="_blank" rel="noopener noreferrer">Support</a></nav>',
    '<div class="header-actions">',
    '<button class="header-search-toggle" id="header-search-toggle" type="button" ',
    'aria-label="Open search" aria-expanded="false" aria-controls="header-search-panel" ',
    'data-directory-url="', tag(absolute('#explore')), '">', glyph('search'), '</button>',
    '<button class="theme-toggle" id="theme-toggle" type="button" ',
    'aria-label="Switch to dark appearance" aria-pressed="false" title="Dark mode">',
    glyph('moon'), glyph('sun'), '</button>',
    '<a class="github-button" href="', tag(REPOSITORY + '/issues/new/choose'),
    '" rel="noopener noreferrer">', glyph('github'), 'GitHub</a>',
    '<button class="menu-toggle" id="menu-toggle" type="button" aria-expanded="false" ',
    'aria-controls="primary-nav" aria-label="Open navigation">',
    glyph('menu'), '</button></div></div>',
    '<div class="header-search-panel" id="header-search-panel" hidden>',
    '<form class="container header-search-inner" id="header-search-form" role="search" method="get" action="', tag(absolute('#explore')), '">',
    '<label class="sr-only" for="header-search">Search free tiers</label>',
    glyph('search'), '<input id="header-search" name="q" type="search" ',
    'placeholder="Search free tiers..." autocomplete="off">',
    '<button class="header-search-submit" type="submit" aria-label="Search services">', glyph('arrow'), '</button><kbd>Esc</kbd></form></div></header><main id="main" class="container">',
    content,
    '</main><footer class="site-footer"><div class="container">',
    '<div class="footer-grid"><div><div class="footer-brand"><img src="', tag(absolute('assets/icon.svg')), '" width="32" height="32" alt="">Free Tier Hub</div>',
    '<p>An independent, open-source directory for developers comparing ',
    'free tiers, practical limitations and official pricing sources.</p></div>',
    '<div><h3>Explore</h3><a href="', tag(absolute()), '">All services</a>',
    '<a href="', tag(absolute('about/classifications/')), '">Offer classifications</a>',
    '<a href="', tag(absolute('categories/')), '">All categories</a>',
    '<a href="', tag(absolute('compare/')), '">Compare services</a>',
    '<a href="', tag(absolute('education/')), '">Education benefits</a>',
    '<a href="', tag(absolute('catalog.json')), '">Catalog JSON</a>',
    '<a href="', tag(absolute('sitemap.xml')), '">Sitemap</a></div>',
    '<div><h3>Developers</h3>',
    '<a href="', tag(absolute('llms.txt')), '">llms.txt</a>',
    '<a href="', tag(absolute('agents.md')), '">agents.md</a>',
    '<a href="', tag(REPOSITORY + '/blob/main/docs/cost-safety.md'), '">Cost safety</a>',
    '<a href="', tag(REPOSITORY + '/blob/main/CONTRIBUTING.md'), '">Contribute</a>',
    '<a href="', tag(SUPPORT_URL), '" target="_blank" rel="noopener noreferrer">Donate / Support</a>',
    '<a href="', tag(SPONSORS_URL), '" target="_blank" rel="noopener noreferrer">GitHub Sponsors</a></div>',
    '</div><div class="footer-bottom"><span>© Free Tier Hub · Community-maintained.</span>',
    '<span>Independent catalog · Verify every provider before enabling billing.</span>',
    '</div></div></footer>',
    '<aside class="compare-tray" id="compare-tray" data-compare-url="', tag(absolute('compare/')),
    '" aria-label="Selected services for comparison" hidden>',
    '<div class="compare-tray-main"><div class="compare-tray-heading"><strong>Compare services</strong>',
    '<span class="compare-tray-count">0 / 4 selected</span></div>',
    '<div class="compare-tray-items"></div></div>',
    '<div class="compare-tray-actions"><button type="button" class="compare-clear" data-compare-clear>Clear</button>',
    '<a class="compare-tray-go" href="', tag(absolute('compare/')), '" aria-disabled="true">Compare now →</a></div></aside>',
    '<dialog class="compare-dialog" id="compare-dialog" aria-label="Compare selected services">',
    '<div class="compare-dialog-bar"><strong>Compare selected services</strong>',
    '<button type="button" class="compare-dialog-close" data-compare-close aria-label="Close comparison">×</button></div>',
    comparePage(absolute), '</dialog>',
    '<span class="sr-only" role="status" aria-live="polite" id="compare-live"></span>',
    // Native details keeps this support action keyboard-accessible without JavaScript.
    '<details class="support-widget" id="support-widget">',
    '<summary class="support-toggle" aria-label="Support Free Tier Hub" title="Support Free Tier Hub">',
    '<span class="support-icon" aria-hidden="true">&#9829;</span>',
    '<span class="support-label">Donate</span></summary>',
    '<div class="support-popover" role="group" aria-label="Donation options">',
    '<strong>Support Free Tier Hub</strong>',
    '<p>Help keep this independent free-tier directory available and up to date.</p>',
    '<a href="', tag(SUPPORT_URL), '" target="_blank" rel="noopener noreferrer">Donate via ePlus.DEV ↗</a>',
    '<a href="', tag(SPONSORS_URL), '" target="_blank" rel="noopener noreferrer">GitHub Sponsors ↗</a>',
    '<small>Completely optional. Donations never affect which services we list or recommend.</small>',
    '</div></details>',
    '<button class="back-to-top" id="back-to-top" type="button" ',
    'aria-label="Back to top" title="Back to top" hidden>',
    glyph('up'),
    '</button></body></html>',
  ].join('');
}
// A related provider offer's retirement is a separate service notice, not
// part of the listed PostgreSQL free-tier allowance or SEO description.
export function aivenMySQLFreeRetirementNotice(item, now = Date.now()) {
  const notice = item?.related_offer_notice;
  if (!notice) return '';
  const expiresAt = Date.parse(notice.expires_at);
  if (!Number.isFinite(expiresAt) || now >= expiresAt) return '';
  return [
    '<aside class="provider-retirement-notice" role="note" aria-label="Aiven for MySQL Free retirement" ',
    'data-expires-at="', tag(notice.expires_at), '">',
    '<strong>', tag(notice.title), '</strong>',
    '<p>', tag(notice.message), ' ',
    '<a href="', tag(notice.source_url), '" target="_blank" rel="noopener noreferrer">',
    'Official Aiven announcement ↗</a></p></aside>',
  ].join('');
}

function homePage(items, absolute, counts, searchVersion, educationCount) {
  const mainItems = items.filter(isMainFreeOffer);
  const limitedItems = items.filter(item => !isMainFreeOffer(item));
  const allOffersCount = items.length + educationCount;
  const startupItems = items.filter(item => item.program === 'startup');
  const planCounts = Object.fromEntries(
    ['ongoing', 'monthly-credit'].map(plan => [plan, items.filter(item => item.plan === plan).length])
  );
  const deploymentCounts = Object.fromEntries(
    ['cloud', 'self-hosted', 'hybrid', 'local', 'unclassified']
      .map(model => [model, items.filter(item => hostingModel(item) === model).length])
  );
  // All services includes every offer, including limited/expiring entries.
  // Keep the SSR page in the same catalog order as the lazy-loaded index.
  const cards = items.slice(0, 12).map(item => card(item, absolute)).join('');
  const options = CATEGORIES.map(category =>
    '<option value="' + tag(category) + '">' + tag(CATEGORY_NAMES[category]) +
    ' (' + compactNumber(counts[category]) + ')</option>').join('');
  const shortcuts = [['', 'All offers'], ['education', 'Education benefits'], ['static-hosting', 'Hosting'], ['email-notifications', 'Email'], ['databases', 'Databases'], ['ai-assistants', 'AI assistants'], ['storage', 'Storage'], ['ci-cd', 'CI/CD'], ['developer-tools', 'Developer tools']].map(([category, label]) =>
    category === 'education'
      ? '<button type="button" class="category-chip education-program-chip" data-filter-category="education" ' +
        'aria-pressed="false" aria-label="Filter education benefits in the main directory">' +
        tag(label) + ' <span class="category-chip-count">' +
        compactNumber(educationCount) + '</span></button>'
      : '<button type="button" class="category-chip" data-filter-category="' + tag(category) +
        '" aria-pressed="' + (category === '' ? 'true' : 'false') + '">' + tag(label) +
        (category ? ' <span class="category-chip-count" aria-label="' + counts[category] +
          ' services">' + compactNumber(counts[category]) + '</span>' : '') +
        '</button>').join('');
  return [
    '<section class="hero"><div class="hero-copy">',
    '<p class="hero-kicker">The free-tier directory</p>',
    '<h1>Find the right tools. Build for free.</h1>',
    '<p>Compare free services, limits and conditions.</p>',
    '</div></section>', aivenMySQLFreeRetirementNotice(items.find(item => item.id === 'aiven-postgres')),
    '<section id="explore" class="section catalog-section">',
    '<div class="catalog-layout">',
    '<div class="catalog-main"><div class="catalog-toolbar">',
    '<div class="category-bar"><div class="category-shortcuts" role="group" aria-label="Popular categories">', shortcuts, '</div>',
    '<a class="category-index-shortcut" href="', tag(absolute('categories/')), '">All categories ', glyph('arrow'), '</a>',
    '</div>',
    '<div class="search-filter-row">',
    '<form class="hero-search directory-search" id="directory-search-form" role="search"><label class="sr-only" for="search">Search free tiers</label>',
    glyph('search'), '<input id="search" type="search" autocomplete="off" ',
    'placeholder="Search services, categories, or keywords" aria-controls="service-grid">',
    '</form>',
    '<div class="result-controls">',
    '<label class="sort-field" for="sort"><span>Sort by</span><select id="sort">',
    '<option value="default">Catalog order</option>',
    '<option value="newest">Newest added</option>',
    '<option value="oldest">Oldest added</option>',
    '<option value="verified">Recently verified</option>',
    '<option value="name">Name A–Z</option>',
    '<option value="name-desc">Name Z–A</option>',
    '<option value="category">Category</option></select></label>',
    '<div class="filters">',
    '<div class="filter-popover-wrap">',
    '<button class="advanced-filter-toggle" id="advanced-filter-toggle" type="button" ',
    'aria-expanded="false" aria-haspopup="dialog" aria-controls="advanced-filters">',
    glyph('filters'), ' <span>Filters</span><span id="active-filter-count" class="active-filter-count" hidden>0</span></button></div></div>',
    '</div>',
    '</div>',
    '<div class="filter-checks" id="advanced-filters" role="dialog" aria-labelledby="filter-dialog-title" hidden>',
    '<div class="filter-popover-heading"><strong id="filter-dialog-title">Filters</strong><span>Results update as you choose</span>',
    '<button class="filter-sheet-close" type="button" aria-label="Close filters">', glyph('close'), '</button></div>',
    '<label class="all-categories" for="category-filter"><span>Category</span>',
    '<select id="category-filter"><option value="">All categories (', compactNumber(allOffersCount),
    ')</option>', options, '<option value="education">Education (', compactNumber(educationCount),
    ')</option></select></label>',
    '<p class="category-filter-index-link">Want to explore? <a href="', tag(absolute('categories/')),
    '">Browse all ', CATEGORIES.length, ' categories ', glyph('arrow'), '</a></p>',
    '<label class="offer-type-field" for="offer-filter"><span>Offer type</span>',
    '<select id="offer-filter"><option value="">All offers (', compactNumber(allOffersCount), ')</option>',
    '<option value="free">Free tiers (', compactNumber(mainItems.length), ')</option>',
    '<option value="ongoing">Ongoing free allowance (', compactNumber(planCounts.ongoing), ')</option>',
    '<option value="monthly-credit">Recurring monthly credit (', compactNumber(planCounts['monthly-credit']), ')</option>',
    '<option value="limited">Time-limited &amp; expiring offers (', compactNumber(limitedItems.length),
    ')</option>',
    '<option value="startup">Startup programs (', compactNumber(startupItems.length),
    ')</option><optgroup label="Special programs">',
    '<option value="education">Education benefits (', compactNumber(educationCount),
    ')</option></optgroup></select></label>',
    '<p class="education-filter-link">For students and teachers: <a href="',
    tag(absolute('education/')), '" id="education-filter-destination">Browse ', compactNumber(educationCount),
    ' education benefits ↗</a>. Eligibility verification required.</p>',
    '<details class="classification-help"><summary>How are these offers classified?</summary>',
    '<div class="classification-help-panel"><p class="classification-help-intro">Labels describe the listed offer, not every plan a provider sells.</p>',
    '<dl><div><dt>Ongoing free allowance</dt><dd>No announced fixed end date. Usage limits and policies can still change.</dd></div>',
    '<div><dt>Recurring monthly credit</dt><dd>Free credits renew each billing period; overages may cost money.</dd></div>',
    '<div><dt>Time-limited offer</dt><dd>Trial or promotional credit that ends after a period or is depleted.</dd></div>',
    '<div><dt>Expiring resource</dt><dd>A provisioned resource eventually expires or is removed.</dd></div></dl>',
    '<p class="classification-help-caveat"><strong>Legacy only</strong> means eligible existing accounts, not a separate offer type.</p>',
    '<a href="', tag(absolute('about/classifications/')), '" target="_blank" rel="noopener noreferrer">Full classification guide ↗</a></div></details>',
    '<label class="hosting-model-field" for="hosting-filter"><span>Deployment model</span>',
    '<select id="hosting-filter" aria-describedby="hosting-model-note">',
    '<option value="">All deployment models (', compactNumber(items.length), ')</option>',
    '<option value="cloud">Cloud (', compactNumber(deploymentCounts.cloud), ')</option>',
    '<option value="self-hosted">Self-hosted (', compactNumber(deploymentCounts['self-hosted']), ')</option>',
    '<option value="hybrid">Cloud + self-hosted (', compactNumber(deploymentCounts.hybrid), ')</option>',
    '<option value="local">Local / embedded (', compactNumber(deploymentCounts.local), ')</option>',
    '<option value="unclassified">Not specified (', compactNumber(deploymentCounts.unclassified),
    ')</option></select></label>',
    '<p class="hosting-model-note" id="hosting-model-note">Deployment specified for ' + compactNumber(items.filter(item => hostingModel(item) !== 'unclassified').length) + ' of ' + compactNumber(items.length) + ' services. Self-hosting may incur infrastructure costs.</p>',
    '<button type="button" class="filter-show-results" id="filter-show-results">Show results</button>',
    '</div>',
    '<div class="quick-filters" role="group" aria-label="Quick billing filters">',
    '<label class="quick-filter"><input id="filter-no-card" type="checkbox"><span>No credit card</span></label>',
    '<label class="quick-filter"><input id="filter-commercial" type="checkbox"><span>Commercial use</span></label></div>',
    '<div class="active-filters" id="active-filters" hidden><div id="active-filter-chips" class="active-filter-chips" aria-label="Active filters"></div>',
    '<button id="clear-filters" class="clear-filters" type="button">Clear</button></div></div>',
    '<div class="directory-heading">',
    '<h2>Explore services</h2><div class="results-meta">',
    '<p class="result-count" id="results-count" aria-live="polite">',
    '<span class="result-label">All offers</span><strong class="result-total">',
    compactNumber(allOffersCount), '</strong><span class="result-shown">Showing ',
    compactNumber(Math.min(12, items.length)), ' of ', compactNumber(allOffersCount), '</span></p>',
    '</div></div>',
    '<div class="service-grid" id="service-grid" data-search-index="',
    tag(absolute('search/index.json?v=' + searchVersion)),
    '" data-search-cards="', tag(absolute('search/cards/')), '">', cards, '</div>',
    '<p class="search-load-status" id="search-load-status" role="status" aria-live="polite" hidden></p>',
    '<noscript><p class="search-noscript">Showing the first 12 services. ',
    '<a href="', tag(absolute('categories/')), '">Browse all categories</a>',
    ' or <a href="', tag(absolute('offers/')), '">limited offers</a>',
    ' without JavaScript.</p></noscript>',
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


// Lightweight original line icons for the category overview, separate from
// the small bundled Font Awesome glyph subset used by the navigation.
const CATEGORY_ICON_STROKES = {
  "globe": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3a15 15 0 0 0 0 18M12 3a15 15 0 0 1 0 18\"/>",
  "server": "<rect x=\"4\" y=\"4\" width=\"16\" height=\"7\" rx=\"2\"/><rect x=\"4\" y=\"13\" width=\"16\" height=\"7\" rx=\"2\"/><path d=\"M7 7h.01M7 16h.01\"/>",
  "zap": "<path d=\"m13 2-9 12h7l-1 8 10-12h-7z\"/>",
  "cloud": "<path d=\"M7 18a5 5 0 0 1-.5-10 7 7 0 0 1 13 .3A4.8 4.8 0 0 1 19 18H7z\"/>",
  "database": "<ellipse cx=\"12\" cy=\"5\" rx=\"8\" ry=\"3\"/><path d=\"M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7\"/>",
  "storage": "<path d=\"m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5\"/>",
  "code": "<path d=\"m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18\"/>",
  "shield": "<path d=\"M12 2 4 5v6c0 5 3 8 8 11 5-3 8-6 8-11V5l-8-3Z\"/>",
  "activity": "<path d=\"M2 12h5l3-7 4 14 3-7h5\"/>",
  "chart": "<path d=\"M4 20h16M6 18v-6h3v6m3 0V5h3v13m3 0V9h3v9\"/>",
  "network": "<circle cx=\"12\" cy=\"4\" r=\"2\"/><circle cx=\"5\" cy=\"19\" r=\"2\"/><circle cx=\"19\" cy=\"19\" r=\"2\"/><path d=\"m11 6-5 11m7-11 5 11M7 19h10\"/>",
  "sparkles": "<path d=\"m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z\"/>",
  "bot": "<rect x=\"4\" y=\"8\" width=\"16\" height=\"12\" rx=\"3\"/><path d=\"M12 8V4M9 4h6M8 14h.01M16 14h.01M9 18h6\"/>",
  "queue": "<path d=\"M10 6h11M10 12h11M10 18h11M4 6h.01M4 12h.01M4 18h.01\"/>",
  "search": "<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m16 16 5 5\"/>",
  "flag": "<path d=\"M5 22V3m0 1c3-2 5 2 8 0s5 0 6 0v11c-3-2-5 2-8 0s-4 0-6 0\"/>",
  "webhook": "<circle cx=\"6\" cy=\"7\" r=\"2\"/><circle cx=\"18\" cy=\"7\" r=\"2\"/><circle cx=\"12\" cy=\"18\" r=\"2\"/><path d=\"M8 7h8M7 9l4 7m6-7-4 7\"/>",
  "mail": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"m4 7 8 6 8-6\"/>",
  "test": "<path d=\"M9 3v7l-5 8a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-8V3M8 3h8M7 16h10\"/>",
  "form": "<rect x=\"5\" y=\"3\" width=\"14\" height=\"18\" rx=\"2\"/><path d=\"M9 7h6M9 11h6M9 15h3\"/>"
};
function categoryGlyph(category) {
  const name = CATEGORY_ICONS[category];
  const body = CATEGORY_ICON_STROKES[name];
  if (!body) throw new Error('Unknown category icon: ' + name);
  return '<svg xmlns="http://www.w3.org/2000/svg" data-category-icon="' + tag(name) +
    '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + body + '</svg>';
}

// Lightweight timestamps let +N expire without requiring a fresh network request.
function recentCountMarkup(items, now = Date.now()) {
  const recent = items.filter(item => {
    const added = Date.parse(item.added_at_utc || '');
    return Number.isFinite(added) && added <= now && now - added < 48 * 60 * 60 * 1000;
  }).map(item => item.added_at_utc);
  return recent.length
    ? '<span class="recent-count" data-new-published-times="' +
      tag(recent.join(',')) + '" hidden></span>'
    : '';
}

function categoriesOverviewPage(absolute, counts, mainItems) {
  const total = CATEGORIES.reduce((sum, category) => sum + counts[category], 0);
  const entries = CATEGORIES.map(category => {
    const name = CATEGORY_NAMES[category];
    const description = CATEGORY_DESCRIPTIONS[category];
    const count = counts[category];
    const recent = recentCountMarkup(mainItems.filter(item => item.category === category));
    return [
      '<a class="category-overview-card" href="', tag(absolute('category/' + category + '/')),
      '" data-category-name="', tag(name.toLowerCase()), '">',
      '<span class="category-overview-icon" aria-hidden="true">', categoryGlyph(category), '</span>',
      '<span class="category-overview-body"><strong>', tag(name), '</strong>',
      '<span class="category-overview-description">', tag(description), '</span></span>',
      '<span class="category-overview-foot"><span class="category-overview-count"><b>',
      compactNumber(count), '</b> ', count === 1 ? 'service' : 'services', recent, '</span>',
      '<span class="category-overview-arrow" aria-hidden="true">', glyph('arrow'), '</span></span>',
      '</a>',
    ].join('');
  }).join('');
  return [
    '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="', tag(absolute()),
    '">Home</a><span aria-hidden="true">/</span><span>Categories</span></nav>',
    '<section class="page-intro categories-intro">',
    '<p class="kicker">EXPLORE BY TOPIC</p><h1>All categories</h1>',
    '<p>Find the right free developer tools, cloud platforms and services by category. ',
    'Each group links to detailed listings, plan limits and official sources.</p>',
    '<div class="category-overview-stats"><span><strong>', CATEGORIES.length,
    '</strong> categories</span><span><strong>', compactNumber(total),
    '</strong> ongoing free tiers &amp; recurring credits</span></div></section>',
    '<section class="category-overview-section" aria-labelledby="category-overview-heading">',
    '<div class="category-overview-toolbar"><div><h2 id="category-overview-heading">Explore categories</h2>',
    '<p>Counts update from the published catalog. Time-limited offers are excluded.</p></div>',
    '<label class="category-overview-search" for="category-overview-search">',
    glyph('search'), '<span class="sr-only">Search categories</span>',
    '<input id="category-overview-search" type="search" autocomplete="off"',
    ' placeholder="Search categories..." aria-controls="category-overview-grid"></label></div>',
    '<div class="category-overview-grid" id="category-overview-grid">', entries, '</div>',
    '<p class="category-overview-empty" id="category-overview-empty" role="status" aria-live="polite" hidden>No matching categories. Try another search.</p>',
    '</section><p class="back-link"><a href="', tag(absolute('#explore')),
    '">← Browse all services</a></p>',
  ].join('');
}

function categoryPage(category, subset, absolute) {
  const name = CATEGORY_NAMES[category];
  return [
    '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="', tag(absolute()),
    '">Home</a><span aria-hidden="true">/</span><a href="', tag(absolute('categories/')),
    '">Categories</a><span aria-hidden="true">/</span><span>', tag(name), '</span></nav>',
    '<section class="page-intro"><p class="kicker">CATEGORY · ', compactNumber(subset.length),
    ' SERVICES', recentCountMarkup(subset), '</p><h1>', tag(name), '</h1>',
    '<p>Compare included quotas, restrictions and official provider documentation.</p></section>',
    category === 'databases' ? aivenMySQLFreeRetirementNotice(subset.find(item => item.id === 'aiven-postgres')) : '',
    // Native, self-contained category controls: no remote index or new catalog.
    // Without JS the tools remain hidden and all service cards remain readable.
    '<section class="category-tools" id="category-tools" aria-label="Search and filter ', tag(name), ' services" hidden>',
    '<div class="category-tools-primary">',
    '<label class="category-search-field" for="category-search">', glyph('search'),
    '<span class="sr-only">Search ', tag(name), ' services</span>',
    '<input id="category-search" name="q" type="search" autocomplete="off" ',
    'placeholder="Search within ', tag(name), '" aria-controls="category-service-grid"></label>',
    '<label class="category-sort-field" for="category-sort"><span>Sort by</span>',
    '<select id="category-sort" aria-controls="category-service-grid">',
    '<option value="default">Catalog order</option><option value="newest">Newest added</option>',
    '<option value="oldest">Oldest added</option><option value="verified">Recently verified</option>',
    '<option value="name">Name A–Z</option><option value="name-desc">Name Z–A</option></select></label>',
    '<details class="category-filter-details" id="category-filter-details">',
    '<summary>Filters <span class="category-filter-active" id="category-filter-active" hidden>0</span></summary>',
    '<div class="category-filter-panel">',
    '<label for="category-plan"><span>Free offer</span><select id="category-plan">',
    '<option value="">All free offers</option><option value="ongoing">Ongoing free allowance</option>',
    '<option value="monthly-credit">Recurring monthly credit</option></select></label>',
    '<label for="category-hosting"><span>Deployment</span><select id="category-hosting">',
    '<option value="">All models</option><option value="cloud">Cloud</option>',
    '<option value="self-hosted">Self-hosted</option><option value="hybrid">Cloud + self-hosted</option>',
    '<option value="local">Local / embedded</option><option value="unclassified">Not specified</option>',
    '</select></label>',
    '<label class="category-filter-checkbox"><input id="category-no-card" type="checkbox"><span>No credit card required</span></label>',
    '<label class="category-filter-checkbox"><input id="category-commercial" type="checkbox"><span>Commercial use allowed</span></label>',
    '</div></details></div>',
    '<div class="category-tools-meta"><p class="category-page-status" id="category-page-status" role="status" aria-live="polite"></p>',
    '<button class="category-clear-filters" id="category-clear-filters" type="button" hidden>Clear filters</button>',
    '</div></section>',
    // Render all cards into HTML for no-JS users, discovery, and search indexing.
    // JavaScript progressively reveals batches without changing the catalog data.
    '<div class="service-grid category-service-grid" id="category-service-grid">',
    subset.map(item => card(item, absolute)).join(''), '</div>',
    '<div class="category-no-results no-results" id="category-no-results" hidden>', glyph('search'),
    '<h3>No matching services</h3><p>Try another keyword or clear the filters.</p></div>',
    '<div class="category-pagination" id="category-pagination" hidden>',
    '<div class="load-more-wrap" id="category-load-more-wrap" hidden>',
    '<button class="load-more" type="button" id="category-load-more" ',
    'aria-controls="category-service-grid">Load more services</button></div></div>',
    '<p class="back-link"><a href="', tag(absolute('categories/')),
    '">← All categories</a> · <a href="', tag(absolute('#explore')),
    '">Browse all services</a></p>',
  ].join('');
}
function classificationsPage(absolute) {
  const section = (id, heading, rows) => [
    '<section class="classification-section" id="', id, '"><h2>', heading, '</h2>',
    '<dl class="classification-grid">',
    ...rows.map(([label, meaning]) => '<div><dt>' + label + '</dt><dd>' + meaning + '</dd></div>'),
    '</dl></section>',
  ].join('');
  return [
    '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="', tag(absolute()),
    '">Home</a><span aria-hidden="true">/</span><span>Offer classifications</span></nav>',
    '<section class="page-intro"><p class="kicker">DIRECTORY GUIDE</p><h1>How we classify free offers</h1>',
    '<p>Understand what is free, what expires, where software runs and who can sign up. ',
    'These labels describe the listed offer, not every product sold by the provider.</p></section>',
    section('plans', 'Offer types', [
      ['Ongoing free allowance', 'A free plan or allowance without an announced fixed end date. Quotas, policies and pricing can still change.'],
      ['Recurring monthly credit', 'Free usage credit that resets each billing period. Exceeding the credit may cost money; introductory credits are not part of the recurring amount.'],
      ['Time-limited offer', 'A trial or introductory promotion that ends after a stated period or when credits run out. Not counted as an ongoing free tier.'],
      ['Expiring free resource', 'A resource, such as a database, that expires or is removed even if the account remains active. Not counted as an ongoing free tier.'],
    ]),
    section('deployment', 'Deployment models', [
      ['Cloud', 'The listed service is hosted by the provider. Free usage may still have limits or billing requirements.'],
      ['Self-hosted', 'You run the software on your own servers. The software may be free, but compute, storage, backups and operations are not included.'],
      ['Cloud + self-hosted', 'The exact listed offer supports both hosted and self-managed deployment; separate paid editions do not automatically qualify.'],
      ['Local / embedded', 'A desktop application, CLI, SDK or library you run locally or inside your own app. Paid APIs or compute are not included.'],
      ['Not specified', 'The deployment model has not yet been verified. We do not guess based on the product name.'],
    ]),
    '<section class="classification-section" id="eligibility"><h2>Who can use the offer?</h2>',
    '<div class="classification-explainer"><strong>Legacy only · Existing users</strong>',
    '<p>Some ongoing allowances are grandfathered for accounts enrolled before a provider changed its plans. ',
    'The benefit may continue for eligible existing accounts, while a new signup may require payment. ',
    'Legacy-only is an eligibility warning, <strong>not</strong> another offer type. ',
    'Only listings with explicitly reviewed eligibility evidence receive this label.</p></div></section>',
    section('checks', 'Billing and verification', [
      ['Credit card: Required / Not required / Check provider', 'Check provider means the card requirement has not been verified; it does not mean no card is needed.'],
      ['Commercial use: Allowed / Restricted / Check provider', 'Check provider means business-use permission is unconfirmed, not that commercial use is permitted.'],
      ['Last checked', 'Date an editor reviewed provider evidence. It is not a guarantee that terms are still unchanged.'],
      ['Official source', 'Provider pricing or documentation is the primary reference for current limits, eligibility and renewal costs.'],
    ]),
    '<p class="classification-fineprint">A free plan, free software and free infrastructure are different things. ',
    'Check region, charges above the quota, automatic renewals and required payment methods before deploying.</p>',
    '<p class="back-link"><a href="', tag(absolute('#explore')), '">← Browse services</a> · ',
    '<a href="', tag(absolute('offers/')), '">View time-limited offers</a> · ',
    '<a href="', tag(REPOSITORY + '/blob/main/docs/classifications.md'), '">Read the repository guide</a></p>',
  ].join('');
}
function educationSearchCard(item, absolute) {
  const key='edu-'+item.id;
  const dest=tag(absolute('education/'+item.id+'/'));
  const audience={student:'Students',teacher:'Teachers',school:'Schools',
    nonprofit:'Nonprofits',opensource:'Open-source maintainers'};
  return [
    '<article class="service-card" data-service-id="',tag(key),
    '" data-category="education" data-program="education">',
    '<div class="card-top"><span class="service-icon" aria-hidden="true">',
    serviceLogo({id:item.id,name:item.name,pricing_url:item.source_url}),
    '</span><div class="card-identity"><h3><a href="',dest,'">',
    tag(item.name),'</a></h3><span class="eyebrow">',
    tag(item.audiences.map(a=>audience[a]).join(' · ')),
    '</span></div><span class="badge">Education · ',tag(item.benefit_type),
    '</span></div>',
    '<div class="allowance-block"><span class="card-label">Education benefit</span>',
    '<p class="allowance">',tag(item.benefit),'</p></div>',
    '<div class="restriction-block"><span class="card-label">Who qualifies?</span>',
    '<p class="restriction">',tag(item.eligibility),'</p></div>',
    '<div class="card-bottom"><span class="education-reviewed">Checked ',
    tag(item.last_checked),'</span><a href="',dest,'">View details ',
    glyph('arrow'),'</a></div></article>'
  ].join('');
}

function educationBenefitsPage(programs, absolute) {
  // Reuse the existing category-page toolbar, service cards, and shared design tokens.
  // Education keeps a separate dataset, eligibility filters, and totals.
  const audienceLabels = {student: 'Students', teacher: 'Teachers', school: 'Schools',
    nonprofit: 'Nonprofits', opensource: 'Open-source maintainers'};
  const benefitLabels = {free: 'Free access', credit: 'Credits', discount: 'Discount'};
  const options = (values, labels) => values.map(value =>
    '<option value="' + tag(value) + '">' + tag(labels[value]) + '</option>').join('');
  return [
    '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="', tag(absolute()),
    '">Home</a><span aria-hidden="true">/</span><a href="', tag(absolute('categories/')),
    '">Categories</a><span aria-hidden="true">/</span><span>Education</span></nav>',
    '<section class="page-intro"><p class="kicker">CATEGORY · ', compactNumber(programs.length),
    ' EDUCATION BENEFITS</p><h1>Education benefits</h1>',
    '<p>Find verified student and educator discounts, software and credits. ',
    'Eligibility requirements apply; these offers are not counted as universal free tiers.</p></section>',
    '<section class="category-tools" id="education-tools" aria-label="Search and filter education benefits" hidden>',
    '<div class="category-tools-primary">',
    '<label class="category-search-field" for="education-search">', glyph('search'),
    '<span class="sr-only">Search education benefits</span>',
    '<input id="education-search" type="search" autocomplete="off" ',
    'placeholder="Search within Education" aria-controls="education-service-grid"></label>',
    '<label class="category-sort-field" for="education-sort"><span>Sort by</span>',
    '<select id="education-sort" aria-controls="education-service-grid">',
    '<option value="name">Name A–Z</option><option value="recent">Recently verified</option>',
    '</select></label>',
    '<details class="category-filter-details" id="education-filter-details">',
    '<summary>Filters <span class="category-filter-active" id="education-filter-active" hidden>0</span></summary>',
    '<div class="category-filter-panel">',
    '<label for="education-audience"><span>Audience</span><select id="education-audience">',
    '<option value="all">All audiences</option>',
    options(['student','teacher','school','nonprofit','opensource'], audienceLabels),
    '</select></label>',
    '<label for="education-benefit"><span>Benefit type</span><select id="education-benefit">',
    '<option value="all">All benefits</option>', options(['free','credit','discount'], benefitLabels),
    '</select></label></div></details></div>',
    '<div class="category-tools-meta"><p class="category-page-status" id="education-results" role="status" aria-live="polite">',
    'Showing ', programs.length, ' of ', programs.length, ' education benefits</p>',
    '<button class="category-clear-filters" id="education-clear" type="button" hidden>Clear filters</button>',
    '</div></section>',
    '<div class="service-grid category-service-grid" id="education-service-grid">',
    programs.map(item => [
      '<article class="service-card" data-education-id="', tag(item.id),
      '" data-audiences="', tag(item.audiences.join(' ')),
      '" data-benefit-type="', tag(item.benefit_type), '" data-date="', tag(item.last_checked),
      '" data-name="', tag(item.name.toLocaleLowerCase('en-US')), '">',
      '<div class="card-top"><span class="service-icon" aria-hidden="true">',
      serviceLogo({ id: item.id, name: item.name, pricing_url: item.source_url }),
      '</span><div class="card-identity"><h3><a href="',
      tag(absolute('education/' + item.id + '/')), '">', tag(item.name), '</a></h3>',
      '<span class="eyebrow">', tag(item.audiences.map(a => audienceLabels[a]).join(' · ')),
      '</span></div><span class="badge">', tag(benefitLabels[item.benefit_type]), '</span></div>',
      '<div class="allowance-block"><span class="card-label">Education benefit</span>',
      '<p class="allowance">', tag(item.benefit), '</p></div>',
      '<div class="restriction-block"><span class="card-label">Who qualifies?</span>',
      '<p class="restriction">', tag(item.eligibility), '</p></div>',
      '<div class="card-bottom"><span class="education-reviewed">Checked ', tag(item.last_checked),
      '</span><a href="', tag(absolute('education/' + item.id + '/')),
      '" aria-label="View ', tag(item.name), ' education benefit details">View details ', glyph('arrow'),
      '</a><a class="official-link" href="', tag(providerReferralURL(item.source_url)),
      '" target="_blank" rel="noopener noreferrer" aria-label="Official source for ',
      tag(item.name), '">Official source ↗</a></div></article>'
    ].join('')).join(''),
    '</div><div class="category-no-results no-results" id="education-empty" hidden>',
    glyph('search'), '<h3>No matching benefits</h3>',
    '<p>Try another keyword or clear the filters.</p></div>',
    '<p class="back-link"><a href="', tag(absolute('categories/')),
    '">← All categories</a> · <a href="', tag(absolute('#explore')),
    '">Browse all services</a></p>',
    '<script src="', tag(absolute('assets/education.js?v=' + assetVersion('education.js'))),
    '" defer></script>',
  ].join('');
}

function educationDetailPage(item, absolute) {
  // Education is an eligibility-gated section, but uses the exact Services
  // detail layout, CTA, spec list and provider-source pattern.
  const audienceLabels = {student: 'Students', teacher: 'Teachers', school: 'Schools',
    nonprofit: 'Nonprofits', opensource: 'Open-source maintainers'};
  const benefitLabels = {free: 'Free access', credit: 'Credits', discount: 'Discount'};
  const fields = [
    ['Audience', item.audiences.map(a => audienceLabels[a]).join(' · ')],
    ['Benefit type', benefitLabels[item.benefit_type]],
    ['Who qualifies', item.eligibility],
    ['Duration / renewal', item.duration],
    ['Last checked', item.last_checked],
  ];
  const specs = fields.map(([key, value]) =>
    '<div class="spec"><dt>' + tag(key) + '</dt><dd>' + tag(value) + '</dd></div>').join('');
  const link = tag(providerReferralURL(item.source_url));
  const directory = tag(absolute('education/'));
  return [
    '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="', tag(absolute()),
    '">Home</a><span aria-hidden="true">/</span><a href="', directory,
    '">Education benefits</a><span aria-hidden="true">/</span><span>', tag(item.name),
    '</span></nav><div class="detail-layout"><article class="detail">',
    '<div class="detail-head"><span class="detail-icon" aria-hidden="true">',
    serviceLogo({ id: item.id, name: item.name, pricing_url: item.source_url }),
    '</span><span class="badge">', tag(benefitLabels[item.benefit_type]), '</span></div>',
    '<p class="kicker">EDUCATION BENEFIT</p><h1>', tag(item.name), '</h1>',
    '<p class="detail-lead">A verified student or educator offer. Check eligibility, renewal and ',
    'limits before applying. Not included in general free-tier service counts.</p>',
    '<div class="detail-highlight">', glyph('layers'),
    '<div><strong>INCLUDED EDUCATION BENEFIT</strong><p>', tag(item.benefit),
    '</p></div></div>',
    '<div class="detail-mobile-action"><a class="button primary" href="', link,
    '" target="_blank" rel="noopener noreferrer">View official offer ', glyph('arrow'),
    '</a></div><h2>Program details</h2><dl class="spec-list">', specs, '</dl>',
    '<h2>Important restrictions</h2><div class="detail-warning">',
    glyph('alert'), '<p>', tag(item.restrictions), '</p></div>',
    '<div class="detail-action"><a class="button primary" href="', link,
    '" target="_blank" rel="noopener noreferrer">View official offer ',
    glyph('arrow'), '</a></div>',
    '<p class="disclaimer">Educational benefits may change, require independent verification, ',
    'or expire. Always confirm current conditions with the provider.</p>',
    '</article><aside class="detail-aside"><p class="kicker">SOURCE OF TRUTH</p>',
    '<h2>Verify eligibility</h2><p>Check the provider\'s official documentation for ',
    'up-to-date academic requirements and pricing.</p>',
    '<a class="button secondary" href="', link,
    '" target="_blank" rel="noopener noreferrer">Official source ',
    glyph('arrow'), '</a><hr><h2>More education benefits</h2>',
    '<p>Browse other verified academic licenses, student credits and educator offers.</p>',
    '<a class="text-link" href="', directory, '">Browse Education ', glyph('arrow'),
    '</a></aside></div><p class="back-link"><a href="', directory,
    '">← Back to Education benefits</a></p>',
  ].join('');
}

function limitedOffersPage(items, absolute) {
  const startupCount = items.filter(item => item.program === 'startup').length;
  return [
    '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="', tag(absolute()),
    '">Home</a><span aria-hidden="true">/</span><span>Limited offers</span></nav>',
    '<section class="page-intro"><p class="kicker">LIMITED OFFERS · ', compactNumber(items.length),
    ' ENTRIES', recentCountMarkup(items), '</p><h1>Time-limited and expiring offers</h1>',
    '<p>These promotions, trials and expiring resources are not ongoing free tiers. ',
    'They are excluded from the main directory counts. Check the provider for current eligibility, renewal fees and expiration rules. ',
    '<a href="', tag(absolute('about/classifications/#plans')), '">How we classify offers</a>.</p></section>',
    startupCount ? '<div class="offers-program-filters" id="offers-program-filters" role="group" aria-label="Filter limited offers" hidden>' +
      '<button type="button" data-offers-mode="all" aria-pressed="true">All limited offers (' + compactNumber(items.length) + ')</button>' +
      '<button type="button" data-offers-mode="startup" aria-pressed="false">Startup programs (' + compactNumber(startupCount) + ')</button>' +
      '</div>' : '',
    '<div class="service-grid category-service-grid" id="offers-service-grid">',
    items.map(item => card(item, absolute)).join(''), '</div>',
    '<p class="back-link"><a href="', tag(absolute()),
    '">← Back to ongoing free tiers</a></p>',
  ].join('');
}
function detailPage(item, absolute, related = []) {
  const limited = !isMainFreeOffer(item);
  const name = item.name;
  const category = CATEGORY_NAMES[item.category];
  const categoryURL = absolute('category/' + item.category + '/');
  const listingURL = limited ? absolute('offers/') : categoryURL;
  const listingName = limited ? 'Limited offers' : category;
  const fields = [
    ['Plan', PLAN_NAMES[item.plan]],
    ...(item.eligibility === 'existing-users-only' ? [['Eligibility', 'Legacy only · Existing accounts']] : []),
    ['Deployment model', HOSTING_LABELS[hostingModel(item)]],
    ['Credit card', CARD_NAMES[item.credit_card]],
    ['Commercial use', COMMERCIAL_NAMES[item.commercial_use]],
    ...(item.added_at ? [['Added to directory (UTC)', item.added_at]] : []),
    ['Last checked', item.last_checked],
  ];
  const specs = fields.map(([key, value]) =>
    '<div class="spec"><dt>' + tag(key) + '</dt><dd>' + tag(value) + '</dd></div>').join('');
  const link = tag(providerReferralURL(item.pricing_url));
  return [
    '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="', tag(absolute()),
    '">Home</a><span aria-hidden="true">/</span><a href="', tag(listingURL),
    '">', tag(listingName), '</a><span aria-hidden="true">/</span><span>', tag(name),
    '</span></nav><div class="detail-layout"><article class="detail" data-added-at-utc="',
    tag(item.added_at_utc || ''), '">',
    '<div class="detail-head"><span class="detail-icon" aria-hidden="true">',
    serviceLogo(item), '</span><span class="badge" data-plan="',
    tag(item.plan), '">', tag(PLAN_NAMES[item.plan]), '</span></div>',
    '<p class="kicker">', tag(category),
    '<span class="new-service-badge detail-new-badge" hidden title="First published within the last 48 hours (UTC)" ',
    'aria-label="New service in the last 48 hours">NEW</span></p><h1>', tag(name), '</h1>',
    '<p class="detail-lead">', limited
      ? 'This is a time-limited or expiring offer, not an ongoing free tier. Verify eligibility, expiration and billing before use.'
      : 'Explore this developer service’s ongoing no-cost allowance, restrictions and official documentation before deploying.', '</p>',
    item.id === 'aiven-postgres' ? aivenMySQLFreeRetirementNotice(item) : '',
    item.eligibility === 'existing-users-only'
      ? '<p class="eligibility-note detail-eligibility"><strong>Legacy only</strong> · Only qualifying existing accounts keep this free allowance; new signups may not qualify.</p>' : '',
    '<div class="detail-highlight">', glyph('layers'),
    '<div><strong>', limited ? 'TIME-LIMITED OFFER' : 'INCLUDED FREE ALLOWANCE', '</strong><p"',
    compactQuantityText(item.free_limit) !== item.free_limit ? ' title="' + tag(item.free_limit) + '" aria-label="' + tag(item.free_limit) + '"' : '',
    '>', tag(compactQuantityText(item.free_limit)), '</p></div></div>',
    // A prominent mobile CTA avoids forcing phone visitors to scroll past the specification list.
    '<div class="detail-mobile-action"><a class="button primary" href="', link,
    '" target="_blank" rel="noopener noreferrer">View official documentation ',
    glyph('arrow'), '</a></div><h2>Plan details</h2>',
    '<p class="classification-detail-link"><a href="', tag(absolute('about/classifications/')),
    '">What do these plan and deployment labels mean?</a></p><dl class="spec-list">', specs, '</dl>',
    '<h2>Important restrictions</h2><div class="detail-warning">',
    glyph('alert'), '<p',
    compactQuantityText(item.watch_out) !== item.watch_out ? ' title="' + tag(item.watch_out) + '" aria-label="' + tag(item.watch_out) + '"' : '',
    '>', tag(compactQuantityText(item.watch_out)), '</p></div>',
    related.length ? [
      '<section class="related-services" aria-labelledby="related-services-heading">',
      '<div class="related-services-header">',
      '<span class="related-services-icon" aria-hidden="true">',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"',
      ' stroke-linecap="round" stroke-linejoin="round" focusable="false">',
      '<path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>',
      '<path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.71"/>',
      '</svg></span><h2 id="related-services-heading">Related services</h2></div>',
      '<ul class="related-services-list">',
      ...related.map(other => [
        '<li><a class="related-service-link" href="', tag(absolute('service/' + other.id + '/')), '">',
        '<span class="related-service-content"><span class="related-service-name">', tag(other.name),
        '</span><span class="related-service-meta">', tag(CATEGORY_LABELS[other.category]), ' · ',
        tag(PLAN_NAMES[other.plan]), '</span></span>',
        '<svg class="related-service-arrow" viewBox="0 0 24 24" fill="none"',
        ' stroke="currentColor" stroke-width="1.8" stroke-linecap="round"',
        ' stroke-linejoin="round" aria-hidden="true" focusable="false">',
        '<path d="M7 17 17 7M8 7h9v9"/></svg></a></li>',
      ].join('')),
      '</ul><p class="related-services-note">Limits and eligibility are separate for each offering.</p>',
      '</section>',
    ].join('') : '',
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
    glyph('arrow'), '</a><hr><h2>',
    limited ? 'Other time-limited offers' : 'More in this category', '</h2>',
    '<p>', limited
      ? 'Browse other promotional trials and expiring free resources, separately from ongoing free tiers.'
      : 'Explore other ' + tag(category.toLowerCase()) + ' services with their free allowances.',
    '</p>',
    '<a class="text-link" href="', tag(listingURL),
    '">', limited ? 'Browse limited offers' : 'Browse category', ' ', glyph('arrow'), '</a></aside></div>',
    '<p class="back-link"><a href="', tag(listingURL),
    '">← Back to ', tag(listingName), '</a></p>',
  ].join('');
}
function comparePage(absolute) {
  return [
    '<section class="compare-page page-intro" data-compare-root',
    ' data-compare-url="', tag(absolute('compare/')), '"',
    ' data-service-base="', tag(absolute('service/')), '"',
    ' data-catalog-url="', tag(absolute('catalog.json')), '">',
    '<a class="back-link" href="', tag(absolute('#explore')), '">← Browse services</a>',
    '<div class="compare-page-heading"><div><span class="eyebrow">FREE TIER COMPARISON</span>',
    '<h1>Compare free services</h1><p>Choose 2–4 services and see their allowances, billing requirements and restrictions side by side.</p></div>',
    '<button type="button" class="compare-share" id="compare-share" disabled>Copy share link</button></div>',
    '<div class="compare-picker-wrap"><label for="compare-picker">Add another service</label>',
    '<input id="compare-picker" type="search" autocomplete="off" placeholder="Search by name or category…" aria-controls="compare-suggestions">',
    '<div id="compare-suggestions" class="compare-suggestions" hidden></div></div>',
    '<p id="compare-status" role="status" aria-live="polite"></p>',
    '<div id="compare-empty" class="compare-empty"><strong>Select at least two services to compare.</strong>',
    '<p>Use the search above or select Compare on service cards in the directory.</p>',
    '<a class="button primary" href="', tag(absolute('#explore')), '">Explore the directory</a></div>',
    '<div id="compare-results" hidden>',
    '<div class="compare-options"><label><input type="checkbox" id="compare-differences"> Show differences only</label>',
    '<p id="compare-category-warning" hidden>These services are from different categories; compare their use cases carefully.</p></div>',
    '<div class="compare-table-wrap" role="region" tabindex="0" aria-label="Service comparison table (scroll horizontally on mobile)">',
    '<table class="compare-table" id="compare-table"></table></div>',
    '<p class="compare-disclaimer">Information is editorial and may change. Check each official provider source before signing up or enabling billing.</p>',
    '</div></section>',
  ].join('');
}
// GitHub Markdown cannot evaluate JSON. These SVG badges are generated
// directly from the same canonical free-tier subset as the Home page.
export function serviceCountSVG(count, label = 'services') {
  if (!Number.isSafeInteger(count) || count < 0) throw Error('Invalid service count');
  if (!['services', 'free tiers', 'limited offers', 'new (48h)'].includes(label)) throw Error('Invalid service badge label');
  const display = compactNumber(count);
  const labelWidth = Math.max(72, 16 + label.length * 7);
  const valueWidth = Math.max(45, 18 + display.length * 8);
  const width = labelWidth + valueWidth;
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="22" ' +
    'viewBox="0 0 ' + width + ' 22" role="img" aria-label="' + count + ' ' + label + '">' +
    '<title>' + count + ' ' + label + '</title>' +
    '<rect width="' + width + '" height="22" rx="4" fill="' +
    (label === 'new (48h)' ? '#2563eb' : '#168b47') + '"/>' +
    '<path d="M4 0H' + labelWidth + 'V22H4A4 4 0 0 1 0 18V4A4 4 0 0 1 4 0Z" fill="#414852"/>' +
    '<text x="' + (labelWidth / 2) + '" y="15" text-anchor="middle" fill="#ffffff" font-family="Arial,Helvetica,sans-serif" ' +
    'font-size="11" font-weight="600">' + label + '</text>' +
    '<text x="' + (labelWidth + valueWidth / 2) + '" y="15" text-anchor="middle" fill="#ffffff" ' +
    'font-family="Arial,Helvetica,sans-serif" font-size="11" font-weight="700">' + display + '</text></svg>';
}
// README category badge: keep the original total, append +N for new free tiers.
// Both figures use the same ongoing/recurring category subset. Hide +0.
export function categoryCountSVG(count, newCount = 0) {
  if (!Number.isSafeInteger(count) || count < 0) throw Error('Invalid category count');
  if (!Number.isSafeInteger(newCount) || newCount < 0 || newCount > count) {
    throw Error('Invalid new category count');
  }
  const number = String(count);
  const display = compactNumber(count);
  const baseWidth = Math.max(28, 16 + display.length * 8);
  const newDisplay = '+' + compactNumber(newCount);
  // One shared pill. The smaller +N is raised like a superscript, not a
  // separate badge, so it reads as a 48h addition to the category total.
  const deltaWidth = newCount > 0 ? Math.max(18, 4 + newDisplay.length * 6) : 0;
  const width = baseWidth + (newCount > 0 ? deltaWidth - 4 : 0);
  const accessible = number + ' services' +
    (newCount > 0 ? ', ' + newCount + ' added in the last 48 hours (UTC)' : '');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="22" ' +
    'viewBox="0 0 ' + width + ' 22" role="img" aria-label="' + accessible + '">' +
    '<title>' + accessible + '</title>' +
    '<rect width="' + width + '" height="22" rx="7" fill="#e8f0ec"/>' +
    '<text x="' + baseWidth / 2 + '" y="15" text-anchor="middle" fill="#166534" ' +
    'font-family="Arial,Helvetica,sans-serif" font-size="12" font-weight="700">' + display + '</text>' +
    (newCount > 0
      ? '<text x="' + (baseWidth + deltaWidth / 2 - 4) + '" y="10" text-anchor="middle" fill="#1d4ed8" ' +
        'font-family="Arial,Helvetica,sans-serif" font-size="9" font-weight="700">' + newDisplay + '</text>'
      : '') + '</svg>';
}

// GitHub Pages serves static HTML rather than HTTP 301s. This page keeps old
// bookmarks functional and tells crawlers the surviving URL is authoritative.
function serviceAliasRedirectPage(absolute, targetId) {
  const dest = absolute('service/' + targetId + '/');
  return [
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>Service moved | Free Tier Hub</title>',
    '<meta name="robots" content="noindex,follow">',
    '<link rel="canonical" href="', tag(dest), '">',
    '<meta http-equiv="refresh" content="0;url=', tag(dest), '">',
    '<link rel="stylesheet" href="', tag(absolute('assets/site.css?v=' + assetVersion('site.css'))), '">',
    '</head><body><main class="page-intro"><h1>Service listing moved</h1>',
    '<p>This listing was consolidated into one verified catalog entry. ',
    '<a href="', tag(dest), '">View the current service details</a>.</p>',
    '</main><script>window.location.replace(', safeJSON(dest), ');</script></body></html>',
  ].join('');
}

export function build(outputDir = path.join(ROOT, 'dist'), siteURL = DEFAULT_URL,
  catalogPath = path.join(ROOT, 'data/services.json')) {
  const base = normalizeURL(siteURL);
  const absolute = (relative = '') => base + relative;
  const source = validateData(path.resolve(catalogPath) === path.join(ROOT, 'data/services.json')
    ? loadServices(ROOT) : JSON.parse(fs.readFileSync(catalogPath, 'utf8')));
  const educationPrograms = loadEducationPrograms(ROOT);
  const serviceAliases = activeServiceAliases(source,
    path.resolve(catalogPath) === path.join(ROOT, 'data/services.json'));
  const publishedTimes = serviceAddedDates(ROOT, { includeTime: true });
  // Derive dates from the commit when each service first became visible on
  // the current branch. In particular, an old PR merged today is new today.
  // Never use last_checked or build time: both would corrupt Newest added.
  const items = source.map(item => ({
    ...item, ...(publishedTimes.has(item.id) ? {
      added_at: publishedTimes.get(item.id).slice(0, 10),
      added_at_utc: publishedTimes.get(item.id),
    } : {}),
  }));
  // A preview using a synthetic custom catalog may contain IDs absent from Git.
  // The published source catalog must never silently ship undated services.
  if (path.resolve(catalogPath) === path.join(ROOT, 'data/services.json')) {
    const missing = items.filter(item => !item.added_at).map(item => item.id);
    if (missing.length) {
      throw Error('Services missing original Git addition dates: ' + missing.join(', '));
    }
  }
  if (CATEGORIES.some(c => !(c in CATEGORY_NAMES) || !(c in CATEGORY_ICONS) || !(c in CATEGORY_DESCRIPTIONS))) {
    throw Error('Missing category presentation metadata');
  }
  const output = path.resolve(outputDir);
  fs.mkdirSync(output, { recursive: true });
  const relatedById = relatedServiceMap(items);
  const mainItems = items.filter(isMainFreeOffer);
  const limitedItems = items.filter(item => !isMainFreeOffer(item));
  const generatedAt = new Date().toISOString();
  const new48hCount = countNewIn48Hours(items, Date.parse(generatedAt));
  const searchVersion = createHash('sha256').update(JSON.stringify([items,educationPrograms])).digest('hex').slice(0, 12);
  const educationRows = educationSearchRows(items,educationPrograms);
  const searchIndex = {
    version: 1,
    revision: searchVersion,
    // [id, name, category, plan, deployment, card, commercial, added, checked, searchable].
    // Startup classification is a compact explicit ID set, not inferred from names;
    // keep the existing 10-field row contract for clients and compare UI.
    startup_program_ids: items.filter(item => item.program === 'startup').map(item => item.id),
    // Service rows remain backward-compatible; education is an additive extension.
    education_rows: educationRows,
    rows: items.map(item => [
      item.id, item.name, item.category, item.plan, hostingModel(item),
      item.credit_card, item.commercial_use, item.added_at_utc || item.added_at || '', item.last_checked,
      // Match the server-rendered card search data and accept service slugs/brand aliases.
      [item.id, item.name, CATEGORY_NAMES[item.category], item.free_limit, item.watch_out].join(' ').toLowerCase()
    ])
  };
  // Category directory pages continue to list ongoing/recurring offers only.
  // Home's All services shortcuts must instead count every searchable offer.
  const counts = Object.fromEntries(CATEGORIES.map(category =>
    [category, mainItems.filter(item => item.category === category).length]));
  const homeCounts = Object.fromEntries(CATEGORIES.map(category =>
    [category, items.filter(item => item.category === category).length]));
  const latest = items.map(item => item.last_checked).sort().at(-1);
  const pageURLs = [];
  const siteName = 'Free Tier Hub';
  // Match Home's ItemList to the 12 server-rendered cards from the full catalog.
  // Keep all other items discoverable through their detail pages and sitemap.
  const homeVisibleItems = items.slice(0, 12);
  const homeSchema = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebSite', name: siteName, url: base,
      description: 'An independently maintained directory of developer free tiers.' },
    { '@type': 'CollectionPage', name: 'Free Tier Hub developer directory',
      url: base, mainEntity: { '@type': 'ItemList', numberOfItems: homeVisibleItems.length,
        itemListElement: homeVisibleItems.map((item, i) =>
          ({ '@type': 'ListItem', position: i + 1, name: item.name,
            url: absolute('service/' + item.id + '/') })) } },
  ] };
  file(output, 'index.html', document(absolute,
    'Free Tier Hub | Free Hosting, Cloud, Databases & Developer Tools',
    'Explore free-tier hosting, databases, cloud, queues, AI APIs and developer tools with official pricing links and usage caveats.',
    '', homePage(items, absolute, homeCounts, searchVersion, educationPrograms.length), homeSchema));
  pageURLs.push(['', latest]);
  const categoriesRelative = 'categories/';
  const categoriesSchema = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'CollectionPage', name: 'All Free Tier Categories — Free Tier Hub',
      url: absolute(categoriesRelative), mainEntity: { '@type': 'ItemList',
        numberOfItems: CATEGORIES.length,
        itemListElement: CATEGORIES.map((category, i) =>
          ({ '@type': 'ListItem', position: i + 1, name: CATEGORY_NAMES[category],
            url: absolute('category/' + category + '/') })) } },
    { '@type': 'BreadcrumbList', itemListElement: breadcrumb([
      ['Home', base], ['Categories', absolute(categoriesRelative)],
    ]).itemListElement },
  ] };
  file(output, categoriesRelative + 'index.html', document(absolute,
    'All Categories | Free Tier Hub',
    'Browse all free-tier categories, from hosting and databases to developer tools, security, AI and monitoring, with live catalog counts.',
    categoriesRelative, categoriesOverviewPage(absolute, counts, mainItems), categoriesSchema));
  pageURLs.push([categoriesRelative, latest]);
  const educationRelative = 'education/';
  const educationSchema = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'CollectionPage', name: 'Education benefits — Free Tier Hub',
      url: absolute(educationRelative), mainEntity: { '@type': 'ItemList',
        numberOfItems: educationPrograms.length,
        itemListElement: educationPrograms.map((program, i) => ({
          '@type': 'ListItem', position: i + 1, name: program.name,
          url: absolute('education/' + program.id + '/')
        })) } },
    { '@type': 'BreadcrumbList', itemListElement: breadcrumb([
      ['Home', base], ['Education benefits', absolute(educationRelative)]
    ]).itemListElement },
  ] };
  file(output, educationRelative + 'index.html', document(absolute,
    'Education Benefits for Students & Teachers | Free Tier Hub',
    'Compare verified free educational software, student credits and educator benefits with official eligibility and renewal restrictions.',
    educationRelative, educationBenefitsPage(educationPrograms, absolute), educationSchema));
  pageURLs.push([educationRelative, educationPrograms.map(x => x.last_checked).sort().at(-1) || latest]);
  // Stable per-benefit canonical detail pages, including SEO breadcrumbs and sitemap.
  for (const program of educationPrograms) {
    const relative = 'education/' + program.id + '/';
    const crumbs = [['Home', base], ['Education benefits', absolute(educationRelative)],
      [program.name, absolute(relative)]];
    const schema = { '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebPage', name: program.name + ' — Education benefits',
        url: absolute(relative),
        description: program.benefit + '. ' + program.restrictions,
        dateModified: program.last_checked,
        about: { '@type': 'Thing', name: program.name, url: program.source_url } },
      { '@type': 'BreadcrumbList', itemListElement: breadcrumb(crumbs).itemListElement },
    ] };
    file(output, relative + 'index.html', document(absolute,
      program.name + ' — Education benefits | Free Tier Hub',
      program.benefit + '. ' + program.restrictions,
      relative, educationDetailPage(program, absolute), schema));
    pageURLs.push([relative, program.last_checked]);
  }
  file(output, 'education-programs.json', JSON.stringify(educationPrograms, null, 2) + '\n');
  const compareRelative = 'compare/';
  file(output, compareRelative + 'index.html', document(absolute,
    'Compare Free Developer Services | Free Tier Hub',
    'Compare 2–4 free developer services by limits, payment-card requirements and restrictions.',
    compareRelative, comparePage(absolute),
    { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Compare free services',
      url: absolute(compareRelative) }, 'noindex,follow'));
  const guideRelative = 'about/classifications/';
  const guideSchema = { '@context': 'https://schema.org',
    '@type': 'WebPage', name: 'How we classify free offers — Free Tier Hub',
    url: absolute(guideRelative),
    description: 'Offer types, deployment models, eligibility and billing caveats explained.' };
  file(output, guideRelative + 'index.html', document(absolute,
    'Offer Types & Classifications | Free Tier Hub',
    'Learn how Free Tier Hub classifies ongoing allowances, recurring credits, trials, software deployment and legacy eligibility.',
    guideRelative, classificationsPage(absolute), guideSchema));
  pageURLs.push([guideRelative, latest]);
  for (const category of CATEGORIES) {
    const subset = mainItems.filter(item => item.category === category);
    const name = CATEGORY_NAMES[category], relative = 'category/' + category + '/';
    const crumbs = [['Home', base], ['Categories', absolute(categoriesRelative)], [name, absolute(relative)]];
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
  if (limitedItems.length) {
    const relative = 'offers/';
    const schema = { '@context': 'https://schema.org', '@graph': [
      { '@type': 'CollectionPage', name: 'Time-limited and expiring offers — Free Tier Hub',
        url: absolute(relative), mainEntity: { '@type': 'ItemList',
          numberOfItems: limitedItems.length, itemListElement: limitedItems.map((item, i) =>
            ({ '@type': 'ListItem', position: i + 1, name: item.name,
              url: absolute('service/' + item.id + '/') })) } },
      { '@type': 'BreadcrumbList', itemListElement: breadcrumb([['Home', base],
        ['Limited offers', absolute(relative)]]).itemListElement },
    ] };
    file(output, relative + 'index.html', document(absolute,
      'Time-limited & Expiring Offers | Free Tier Hub',
      'Browse promotional trials and expiring resources separately from ongoing free tiers.',
      relative, limitedOffersPage(limitedItems, absolute), schema));
    pageURLs.push([relative, limitedItems.map(item => item.last_checked).sort().at(-1)]);
  }
  for (const item of items) {
    const category = CATEGORY_NAMES[item.category];
    const relative = 'service/' + item.id + '/';
    const crumbs = [['Home', base],
      ...(!isMainFreeOffer(item)
        ? [['Limited offers', absolute('offers/')]]
        : [[category, absolute('category/' + item.category + '/')]]),
      [item.name, absolute(relative)]];
    const offerLabel = isMainFreeOffer(item) ? planBadge(item) : 'Time-limited offer';
    const schema = { '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebPage', name: item.name + ' — ' + offerLabel, url: absolute(relative),
        description: item.free_limit + '. ' + item.watch_out,
        dateModified: item.last_checked, about: {
          '@type': 'Thing', name: item.name, url: item.pricing_url,
        } },
      { '@type': 'BreadcrumbList', itemListElement: breadcrumb(crumbs).itemListElement },
    ] };
    file(output, relative + 'index.html', document(absolute,
      item.name + ' — ' + offerLabel + ' | Free Tier Hub',
      item.free_limit + '. ' + item.watch_out, relative,
      detailPage(item, absolute, relatedById.get(item.id)), schema));
    pageURLs.push([relative, item.last_checked]);
  }
  // Compatibility pages are deliberately excluded from the canonical sitemap,
  // catalog count and machine-readable search index.
  for (const [oldId, targetId] of serviceAliases) {
    file(output, 'service/' + oldId + '/index.html',
      serviceAliasRedirectPage(absolute, targetId));
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
    '- [Directory](' + base + '): first 12 catalog cards; full catalog is navigable through static category pages and limited offers.',
    '- [All categories](' + absolute('categories/') + '): all service categories with live counts and category landing pages.',
    '- [Offer classifications](' + absolute('about/classifications/') + '): definitions of plan, deployment, eligibility and verification labels.',
    '- [Limited offers](' + absolute('offers/') + '): time-limited promotions and expiring resources, excluded from primary counts.',
    '- [Education benefits](' + absolute('education/') + '): separate verified student and teacher programs, not counted as free-tier services.',
    '- [Catalog JSON](' + absolute('catalog.json') +
      '): machine-readable data with source URLs, review dates and plan types.',
    '- [Sitemap](' + absolute('sitemap.xml') + '): all category and service canonical HTML URLs.',
    '- [Agent discovery](' + absolute('agents.md') + '): optional reading guide.', '',
    '## Categories',
    ...CATEGORIES.map(category =>
      '- [' + CATEGORY_NAMES[category] + '](' + absolute('category/' + category + '/') + ')'),
    '', '## Interpretation',
    '- Home loads additional cards through JavaScript; for complete crawlable service links, follow the category pages and sitemap.',
    '- All services includes limited and expiring offers; the free-tier count includes only ongoing allowances and recurring credits.',
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
    '- Category overview: ' + absolute('categories/'),
    '- Time-limited offers: ' + absolute('offers/'),
    '- Education benefits (independent of free-tier counts): ' + absolute('education/'),
    '- Plan and eligibility definitions: ' + absolute('about/classifications/'),
    '- Machine-readable catalog: ' + absolute('catalog.json'),
    '- Sitemap: ' + absolute('sitemap.xml'),
    '- LLM summary: ' + absolute('llms.txt'), '',
    'Service and Education benefit detail pages have stable canonical HTML URLs and server-rendered content.',
    'Home initially shows 12 listings; use category pages and the sitemap for complete link discovery.', '',
    '## Data model',
    'Each catalog entry includes id, name, category, plan, free_limit, watch_out, pricing_url,',
    'credit_card, commercial_use, optional deployment_model, optional eligibility and last_checked. Treat the official pricing_url as the source',
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
  // Public catalog remains unchanged for external API users; the browser only
  // requests the compact index and HTML for categories currently on screen.
  file(output, 'search/index.json', JSON.stringify(searchIndex) + '\n');
  file(output, 'search/cards/education.json', JSON.stringify(Object.fromEntries(
    educationPrograms.map(item => ['edu-' + item.id, educationSearchCard(item,absolute)]))) + '\n');
  for (const category of CATEGORIES) {
    const fragments = Object.fromEntries(items.filter(item => item.category === category)
      .map(item => [item.id, card(item, absolute)]));
    file(output, 'search/cards/' + category + '.json', JSON.stringify(fragments) + '\n');
  }
  file(output, 'catalog.json', JSON.stringify(items, null, 2) + '\n');
  // GitHub README's dynamic badge must show the same number as the Home directory.
  // Keep the full public catalog unchanged for existing API consumers.
  file(output, 'catalog-stats.json', JSON.stringify({
    ...unifiedOfferStats(items,educationPrograms),
    free_tier_count: mainItems.length,
    limited_offer_count: limitedItems.length,
    total_services: items.length,
    new_48h_count: new48hCount,
    new_48h_window_hours: 48,
    generated_at_utc: generatedAt,
  }, null, 2) + '\n');
  file(output, 'badges/services.svg', serviceCountSVG(items.length));
  file(output, 'badges/free-tiers.svg', serviceCountSVG(mainItems.length, 'free tiers'));
  file(output, 'badges/limited-offers.svg', serviceCountSVG(limitedItems.length, 'limited offers'));
  file(output, 'badges/new-48h.svg', serviceCountSVG(new48hCount, 'new (48h)'));
  for (const category of CATEGORIES) {
    // Use the same snapshot as the global new-48h badge, scoped to this free-tier category.
    const fresh = countNewIn48Hours(mainItems.filter(item => item.category === category),
      Date.parse(generatedAt));
    file(output, 'badges/categories/' + category + '.svg', categoryCountSVG(counts[category], fresh));
  }
  for (const name of ['site.css', 'education.js', 'directory-url.js', 'site.js', 'preview-fallback.js', 'compare.js', 'compact-numbers.js', 'icon.svg', 'og-image.png', 'og-image.svg', 'fontawesome-LICENSE.txt']) {
    const dest = path.join(output, 'assets', name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'site/assets', name), dest);
  }
  file(output, '.nojekyll', '');
  file(output, '404.html', document(absolute,
    'Page not found | Free Tier Hub', 'The requested page could not be found.',
    '404.html',
    '<section class="page-intro" id="generic-not-found">' +
    '<h1>Page not found</h1><p>Browse our current directory instead.</p>' +
    '<a class="button primary" href="' + tag(base) + '">Back to Free Tier Hub</a></section>' +
    '<section class="page-intro preview-expired" id="preview-expired" hidden>' +
    '<p class="kicker">PR PREVIEW UNAVAILABLE</p>' +
    '<h1>This preview is no longer available</h1>' +
    '<p>Preview <strong id="preview-pr-number"></strong> is no longer available. ' +
    'Redirecting to the corresponding production page in ' +
    '<strong class="preview-countdown" id="preview-countdown" aria-live="polite">5</strong> seconds.</p>' +
    '<div class="preview-destination"><span>Production destination</span>' +
    '<code id="preview-target-path"></code></div>' +
    '<a class="button primary" id="preview-go-now" href="' + tag(base) +
    '">Go to production page now</a></section>' +
    '<script src="' + tag(absolute('assets/preview-fallback.js?v=' +
    assetVersion('preview-fallback.js'))) + '" defer></script>',
    { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Page not found',
      url: absolute('404.html') }, 'noindex,follow'));
  return { service_count: items.length, free_tier_count: mainItems.length,
    limited_offer_count: limitedItems.length, new_48h_count: new48hCount,
    category_count: CATEGORIES.length,
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
