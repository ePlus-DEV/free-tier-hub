#!/usr/bin/env python3
"""Build a crawlable static directory for GitHub Pages, without third-party packages."""
import argparse
from collections import Counter
from datetime import date
from html import escape
import json
import os
from pathlib import Path
import re
import shutil
from urllib.parse import urlsplit
from xml.sax.saxutils import escape as xml_escape

from check_markdown import CATEGORIES

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_URL = "https://eplus-dev.github.io/free-tier-hub/"
REPOSITORY = "https://github.com/ePlus-DEV/free-tier-hub"
CATEGORY_NAMES = {
    "static-hosting": "Static & frontend hosting",
    "app-hosting": "Backend & app hosting",
    "serverless": "Serverless & edge",
    "cloud-vps": "Cloud compute & VPS",
    "databases": "Databases & caching",
    "storage": "Object storage",
    "developer-tools": "APIs & developer tools",
    "auth-security": "Authentication & security",
    "observability": "Monitoring & observability",
    "analytics": "Product analytics",
    "dns-cdn": "DNS & CDN",
    "ai-ml": "AI & ML platforms",
    "queues-jobs": "Queues, workflows & scheduling",
    "search": "Hosted search",
    "feature-flags": "Feature flags & gradual rollout",
}
PLAN_NAMES = {
    "ongoing": "Ongoing free allowance",
    "monthly-credit": "Monthly credit",
    "limited-duration": "Time-limited offer",
    "temporary-resource": "Expiring free resource",
}
CARD_NAMES = {"yes": "Required", "no": "Not required", "check": "Check provider"}
COMMERCIAL_NAMES = {
    "yes": "Allowed",
    "no": "Restricted / personal use",
    "check": "Check provider",
}
# Decorative SVG symbols are inlined to avoid a runtime icon dependency.
ICON_PATHS = {
    "layers": '<path d="m12 2-9 5 9 5 9-5-9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/>',
    "grid": '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    "globe": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
    "server": '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 8h.01M7 17h.01M11 8h6M11 17h6"/>',
    "cloud": '<path d="M20 17.5a4.5 4.5 0 0 0-2.3-8.35A6.5 6.5 0 0 0 5 10.5a3.6 3.6 0 0 0 0 7h15Z"/>',
    "database": '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>',
    "code": '<path d="m8 8-4 4 4 4m8-8 4 4-4 4m-3-12-2 16"/>',
    "zap": '<path d="m13 2-9 11h7l-1 9 10-12h-7V2Z"/>',
    "shield": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    "activity": '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
    "chart": '<path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-8"/>',
    "network": '<circle cx="12" cy="4" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 6v5M5 17l7-6 7 6"/>',
    "sparkles": '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
    "queue": '<path d="M4 6h14M4 12h14M4 18h9"/><path d="m17 15 3 3-3 3"/>',
    "search": '<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
    "flag": '<path d="M5 22V4m0 1c5-4 8 4 15 0v11c-7 4-10-4-15 0"/>',
    "arrow": '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    "chevron": '<path d="m6 9 6 6 6-6"/>',
    "check": '<path d="m5 12 5 5L20 7"/>',
    "moon": '<path d="M20 15a8 8 0 0 1-11-11A8 8 0 1 0 20 15Z"/>',
    "alert": '<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3h.01"/>',
    "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
}
CATEGORY_ICONS = {
    "static-hosting": "globe", "app-hosting": "server", "serverless": "zap",
    "cloud-vps": "cloud", "databases": "database", "storage": "layers",
    "developer-tools": "code", "auth-security": "shield", "observability": "activity",
    "analytics": "chart", "dns-cdn": "network", "ai-ml": "sparkles",
    "queues-jobs": "queue", "search": "search", "feature-flags": "flag",
}


def glyph(name):
    """Trusted SVG; all catalog-provided strings use tag() escaping."""
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" '
            'fill="none" stroke="currentColor" stroke-width="1.8" '
            'stroke-linecap="round" stroke-linejoin="round" '
            'aria-hidden="true" focusable="false">' + ICON_PATHS[name] + '</svg>')


assert set(CATEGORY_NAMES) == set(CATEGORIES)


def normalize_url(site_url):
    parsed = urlsplit(site_url.strip())
    if (parsed.scheme != "https" or not parsed.netloc or parsed.username or
            parsed.password or parsed.query or parsed.fragment):
        raise ValueError("SITE_URL must be an HTTPS origin with an optional base path")
    path = parsed.path.rstrip("/") + "/"
    return parsed.scheme + "://" + parsed.netloc.lower() + path


def safe_json(value):
    """Avoid closing a JSON-LD script if untrusted catalog text contains HTML."""
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")


def validate_data(items):
    if not isinstance(items, list) or not items:
        raise ValueError("Catalog must be a non-empty array")
    ids = set()
    for item in items:
        slug = item.get("id", "")
        if not isinstance(slug, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
            raise ValueError("Invalid service id: " + repr(slug))
        if slug in ids or item["category"] not in CATEGORY_NAMES:
            raise ValueError("Duplicate id or unsupported category: " + slug)
        ids.add(slug)
        if urlsplit(item["pricing_url"]).scheme != "https":
            raise ValueError("Pricing links must use HTTPS: " + slug)
        date.fromisoformat(item["last_checked"])


def write_file(output, relative, content):
    file = output / relative
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(content, encoding="utf-8")


def tag(value):
    return escape(str(value), quote=True)


def build(output_dir, site_url=DEFAULT_URL, catalog_path=None):
    """Write self-contained HTML, discovery files and static assets; return page URLs."""
    site_url = normalize_url(site_url)
    source = Path(catalog_path) if catalog_path else ROOT / "data" / "services.json"
    items = json.loads(source.read_text(encoding="utf-8"))
    validate_data(items)
    output = Path(output_dir).resolve()
    output.mkdir(parents=True, exist_ok=True)
    counts = Counter(item["category"] for item in items)
    latest = max(item["last_checked"] for item in items)
    absolute = lambda path="": site_url + path
    url_path = urlsplit(site_url).path
    site_name = "Free Tier Hub"
    page_urls = []

    def breadcrumb(crumbs):
        return {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": i + 1, "name": name, "item": url}
                for i, (name, url) in enumerate(crumbs)
            ],
        }

    def document(title, description, relative_url, content, structured_data, *, robots="index,follow"):
        canonical = absolute(relative_url)
        head = (
            '<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width, initial-scale=1">'
            '<meta name="color-scheme" content="light">'
            '<title>' + tag(title) + '</title>'
            '<meta name="description" content="' + tag(description) + '">'
            '<meta name="robots" content="' + tag(robots) + '">'
            '<link rel="canonical" href="' + tag(canonical) + '">'
            '<meta property="og:type" content="website">'
            '<meta property="og:site_name" content="Free Tier Hub">'
            '<meta property="og:title" content="' + tag(title) + '">'
            '<meta property="og:description" content="' + tag(description) + '">'
            '<meta property="og:url" content="' + tag(canonical) + '">'
            '<meta name="twitter:card" content="summary">'
            '<link rel="icon" type="image/svg+xml" href="' + tag(absolute("assets/icon.svg")) + '">'
            '<link rel="preconnect" href="https://fonts.googleapis.com">'
            '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
            '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">'
            '<link rel="stylesheet" href="' + tag(absolute("assets/site.css")) + '">'
            '<link rel="alternate" type="text/plain" title="LLM overview" href="' + tag(absolute("llms.txt")) + '">'
            '<link rel="alternate" type="text/markdown" title="Agent discovery" href="' + tag(absolute("agents.md")) + '">'
            '<script type="application/ld+json">' + safe_json(structured_data) + '</script>'
            '<script src="' + tag(absolute("assets/site.js")) + '" defer></script>'
            '</head><body><a class="skip-link" href="#main">Skip to content</a>'
            '<header class="site-header"><div class="container header-inner">'
            '<a class="brand" href="' + tag(absolute()) + '" aria-label="Free Tier Hub home">'
            '<span class="brand-mark">' + glyph("layers") + '</span>'
            '<span class="brand-wordmark">Free Tier <strong>Hub</strong>'
            '<small>Developer resources, simplified</small></span></a>'
            '<nav class="primary-nav" aria-label="Main navigation">'
            '<a href="' + tag(absolute()) + '">Directory</a>'
            '<a href="' + tag(absolute("#categories")) + '">Categories</a>'
            '<a href="' + tag(absolute("llms.txt")) + '">For agents</a></nav>'
            '<div class="header-actions">'
            '<button class="theme-toggle" id="theme-toggle" type="button" '
            'aria-label="Switch to dark appearance" aria-pressed="false" title="Dark mode">'
            + glyph("moon") + '</button>'
            '<a class="github-button" href="' + tag(REPOSITORY) + '" '
            'rel="noopener noreferrer">' + glyph("code") + 'GitHub</a></div>'
            '</div></header><main id="main" class="container">' + content +
            '</main><footer class="site-footer"><div class="container">'
            '<div class="footer-grid"><div><div class="footer-brand">Free Tier Hub</div>'
            '<p>An independent, open-source directory for developers comparing '
            'free tiers, practical limitations and official pricing sources.</p></div>'
            '<div><h3>Explore</h3>'
            '<a href="' + tag(absolute()) + '">All services</a>'
            '<a href="' + tag(absolute("#categories")) + '">Categories</a>'
            '<a href="' + tag(absolute("catalog.json")) + '">Catalog JSON</a>'
            '<a href="' + tag(absolute("sitemap.xml")) + '">Sitemap</a></div>'
            '<div><h3>Developers</h3>'
            '<a href="' + tag(absolute("llms.txt")) + '">llms.txt</a>'
            '<a href="' + tag(absolute("agents.md")) + '">agents.md</a>'
            '<a href="' + tag(REPOSITORY + "/blob/main/docs/cost-safety.md") + '">Cost safety</a>'
            '<a href="' + tag(REPOSITORY + "/blob/main/CONTRIBUTING.md") + '">Contribute</a></div>'
            '</div><div class="footer-bottom"><span>© Free Tier Hub · Community-maintained.</span>'
            '<span>Independent catalog · Verify every provider before enabling billing.</span>'
            '</div></div></footer></body></html>'
        )
        return head

    def card(item):
        dest = absolute("service/" + item["id"] + "/")
        group = CATEGORY_NAMES[item["category"]]
        searchable = " ".join(
            (item["name"], group, item["free_limit"], item["watch_out"])
        ).lower()
        monogram = "".join(word[0] for word in
                           re.findall(r"[A-Za-z0-9]+", item["name"])[:2]).upper() or "FT"
        return (
            '<article class="service-card" data-service-id="' + tag(item["id"]) +
            '" data-category="' + tag(item["category"]) +
            '" data-search="' + tag(searchable) + '">'
            '<div class="card-top"><span class="service-icon" aria-hidden="true">' +
            tag(monogram) + '</span><span class="badge" data-plan="' +
            tag(item["plan"]) + '">' + tag(PLAN_NAMES[item["plan"]]) + '</span></div>'
            '<span class="eyebrow">' + tag(group) + '</span>'
            '<h3><a href="' + tag(dest) + '">' + tag(item["name"]) + '</a></h3>'
            '<p class="allowance">' + tag(item["free_limit"]) + '</p>'
            '<p class="restriction">' + tag(item["watch_out"]) + '</p>'
            '<div class="card-bottom"><span>Card: ' +
            tag(CARD_NAMES[item["credit_card"]]) + '</span>'
            '<a href="' + tag(dest) + '" aria-label="View ' + tag(item["name"]) +
            ' details">View details ' + glyph("arrow") + '</a></div></article>'
        )

    def category_link(category):
        return (
            '<a class="category-link" data-category="' + tag(category) + '" href="' +
            tag(absolute("category/" + category + "/")) + '">'
            '<span class="category-icon">' + glyph(CATEGORY_ICONS[category]) + '</span>'
            '<span class="category-copy"><span>' + tag(CATEGORY_NAMES[category]) +
            '</span><small>' + str(counts[category]) + ' services</small></span>' +
            '<span class="category-arrow" aria-hidden="true">' + glyph("arrow") + '</span></a>'
        )

    featured = ("static-hosting", "app-hosting", "databases", "developer-tools",
                "queues-jobs", "ai-ml")
    extras = [category for category in CATEGORIES if category not in featured]
    cards = "".join(card(item) for item in items)
    options = "".join(
        '<option value="' + tag(category) + '">' + tag(CATEGORY_NAMES[category]) + '</option>'
        for category in CATEGORIES
    )
    sidebar = "".join(
        '<button type="button" class="sidebar-category" data-filter-category="' +
        tag(category) + '" aria-pressed="false">' + glyph(CATEGORY_ICONS[category]) +
        '<span class="sidebar-label">' + tag(CATEGORY_NAMES[category]) + '</span>'
        '<span class="sidebar-count">' + str(counts[category]) + '</span></button>'
        for category in CATEGORIES
    )
    home = (
        '<section class="hero"><div class="hero-copy">'
        '<p class="kicker"><span class="kicker-dot" aria-hidden="true"></span>'
        'THE OPEN DEVELOPER DIRECTORY</p>'
        '<h1>Discover developer-friendly free tiers.</h1>'
        '<p>Find useful tools, compare their real free allowances, and understand '
        'billing caveats before you build. A practical reference for developers, '
        'created to make the free tier less confusing.</p>'
        '<div class="hero-actions">'
        '<a class="button primary" href="#explore" data-focus-search>'
        'Explore ' + str(len(items)) + ' services ' + glyph("arrow") + '</a>'
        '<a class="button secondary" href="' + tag(REPOSITORY) +
        '" rel="noopener noreferrer">' + glyph("code") + ' Open on GitHub</a></div>'
        '<div class="hero-trust">' + glyph("check") +
        '<span>Independent listings · Official provider links · No referral ranking</span></div>'
        '</div><div class="hero-panel" aria-label="Catalog preview">'
        '<div class="hero-panel-top"><span>EXPLORE THE CATALOG</span>'
        '<span class="window-dots" aria-hidden="true"><i></i><i></i><i></i></span></div>'
        '<p class="hero-panel-title">Find the right building blocks</p>'
        '<div class="hero-panel-row">' + glyph("globe") +
        '<span>Frontend & static hosting</span><strong>' +
        str(counts["static-hosting"]) + ' tools</strong></div>'
        '<div class="hero-panel-row">' + glyph("database") +
        '<span>Managed databases</span><strong>' +
        str(counts["databases"]) + ' tools</strong></div>'
        '<div class="hero-panel-row">' + glyph("queue") +
        '<span>Queues & background jobs</span><strong>' +
        str(counts["queues-jobs"]) + ' tools</strong></div>'
        '<div class="hero-panel-footer"><span>Built for developers</span>'
        '<span>Explore by category ↗</span></div></div></section>'
        '<div class="stats-strip" aria-label="Catalog statistics">'
        '<div class="stat"><span class="stat-icon">' + glyph("layers") +
        '</span><div><strong>' + str(len(items)) + ' services</strong>'
        '<span>Curated free-tier listings</span></div></div>'
        '<div class="stat"><span class="stat-icon">' + glyph("grid") +
        '</span><div><strong>' + str(len(CATEGORIES)) + ' categories</strong>'
        '<span>From deployment to AI</span></div></div>'
        '<div class="stat"><span class="stat-icon">' + glyph("clock") +
        '</span><div><strong>' + tag(latest) + '</strong>'
        '<span>Latest provider check in catalog</span></div></div></div>'
        '<section id="categories" class="section">'
        '<div class="section-heading"><div><span class="heading-label">EXPLORE BY WORKLOAD</span>'
        '<h2>Everything you need to build</h2>'
        '<p>From your first deploy to background jobs. Start with a category.</p></div>'
        '<a class="text-link" href="#explore" data-focus-search>Browse all services ' +
        glyph("arrow") + '</a></div>'
        '<div class="category-grid">' + "".join(category_link(c) for c in featured) +
        '</div><details class="more-categories"><summary>Explore the remaining ' +
        str(len(extras)) + ' categories ' + glyph("chevron") + '</summary>'
        '<div class="category-grid">' + "".join(category_link(c) for c in extras) +
        '</div></details></section>'
        '<section id="explore" class="section catalog-section">'
        '<div class="section-heading"><div>'
        '<span class="heading-label">THE SERVICE DIRECTORY</span>'
        '<h2>Find your next developer tool</h2>'
        '<p>Filter by workload, compare free limits and open official documentation.</p>'
        '</div></div><div class="catalog-layout"><aside class="catalog-sidebar">'
        '<div class="sidebar-title"><span>Filter categories</span>' +
        glyph("grid") + '</div><div class="sidebar-categories">'
        '<button type="button" class="sidebar-category" data-filter-category="" '
        'aria-pressed="true">' + glyph("layers") +
        '<span class="sidebar-label">All services</span><span class="sidebar-count">' +
        str(len(items)) + '</span></button>' + sidebar + '</div>'
        '<div class="sidebar-bottom"><p>Need to confirm billing or usage rules? '
        'Read the cost-safety guide.</p>'
        '<a href="' + tag(REPOSITORY + "/blob/main/docs/cost-safety.md") +
        '">Read the guide ↗</a></div></aside>'
        '<div class="catalog-main"><div class="filters">'
        '<label class="search-field" for="search">Search tools'
        '<span class="input-wrap">' + glyph("search") +
        '<input id="search" type="search" autocomplete="off" '
        'placeholder="Search services, quotas, features..." aria-controls="service-grid">'
        '<span class="search-shortcut" aria-hidden="true">/</span></span></label>'
        '<label class="mobile-category" for="category-filter">Category'
        '<select id="category-filter"><option value="">All categories</option>' +
        options + '</select></label>'
        '<label class="sort-field" for="sort">Sort by<select id="sort">'
        '<option value="default">Catalog order</option>'
        '<option value="name">Name A–Z</option>'
        '<option value="category">Category</option></select></label>'
        '</div><div class="results-meta">'
        '<p class="result-count" id="results-count" aria-live="polite">Showing ' +
        str(len(items)) + ' services</p>'
        '<button id="clear-filters" class="clear-filters" type="button" hidden>'
        'Clear filters</button></div>'
        '<div class="service-grid" id="service-grid">' + cards + '</div>'
        '<div class="load-more-wrap" id="load-more-wrap" hidden>'
        '<button class="load-more" type="button" id="load-more">Show more services</button>'
        '<span class="load-more-hint">Browse all matching services</span></div>'
        '<div class="no-results" id="no-results" hidden>' + glyph("search") +
        '<h3>No matching services</h3><p>Try a broader search or clear your filters.</p></div>'
        '</div></div></section>'
        '<aside class="notice"><span class="notice-icon">' + glyph("shield") +
        '</span><div><strong>Know the limits before you build.</strong>'
        '<p>Free allowances, billing requirements and regional eligibility can change. '
        '<a href="' + tag(REPOSITORY + "/blob/main/docs/cost-safety.md") +
        '">Review the cost and data-safety checklist ↗</a></p></div></aside>'
    )
    home_schema = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "WebSite", "name": site_name, "url": site_url,
             "description": "An independently maintained directory of developer free tiers."},
            {"@type": "CollectionPage", "name": "Free Tier Hub developer directory",
             "url": site_url, "mainEntity": {"@type": "ItemList",
             "numberOfItems": len(items),
             "itemListElement": [
                 {"@type": "ListItem", "position": i + 1, "name": item["name"],
                  "url": absolute("service/" + item["id"] + "/")}
                 for i, item in enumerate(items)
             ]}}
        ],
    }
    write_file(output, "index.html", document(
        "Free Tier Hub | Free Hosting, Cloud, Databases & Developer Tools",
        "Explore free-tier hosting, databases, cloud, queues, AI APIs and developer tools with official pricing links and usage caveats.",
        "", home, home_schema))
    page_urls.append(("", latest))

    for category in CATEGORIES:
        subset = [item for item in items if item["category"] == category]
        name = CATEGORY_NAMES[category]
        relative = "category/" + category + "/"
        crumbs = [("Home", site_url), (name, absolute(relative))]
        content = (
            '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="' + tag(site_url) +
            '">Home</a><span aria-hidden="true">/</span><span>' + tag(name) + '</span></nav>'
            '<section class="page-intro"><p class="kicker">CATEGORY · ' + str(len(subset)) +
            ' SERVICES</p><h1>' + tag(name) + '</h1>'
            '<p>Compare included quotas, restrictions and official provider documentation.</p></section>'
            '<div class="service-grid">' + "".join(card(item) for item in subset) + '</div>'
            '<p class="back-link"><a href="' + tag(absolute()) + '">← All categories and services</a></p>'
        )
        schema = {"@context": "https://schema.org", "@graph": [
            {"@type": "CollectionPage", "name": name + " — Free Tier Hub",
             "url": absolute(relative), "mainEntity": {"@type": "ItemList",
             "numberOfItems": len(subset),
             "itemListElement": [
                 {"@type": "ListItem", "position": i + 1, "name": x["name"],
                  "url": absolute("service/" + x["id"] + "/")}
                 for i, x in enumerate(subset)]}},
            {"@type": "BreadcrumbList", "itemListElement": breadcrumb(crumbs)["itemListElement"]},
        ]}
        write_file(output, relative + "index.html", document(
            name + " Free Tiers | Free Tier Hub",
            "Compare free-tier " + name.lower() + " providers and their verified pricing sources and restrictions.",
            relative, content, schema))
        page_urls.append((relative, max(x["last_checked"] for x in subset)))

    for item in items:
        name = item["name"]
        category = CATEGORY_NAMES[item["category"]]
        relative = "service/" + item["id"] + "/"
        category_url = absolute("category/" + item["category"] + "/")
        crumbs = [("Home", site_url), (category, category_url), (name, absolute(relative))]
        fields = [
            ("Plan", PLAN_NAMES[item["plan"]]), ("Free allowance", item["free_limit"]),
            ("Important restrictions", item["watch_out"]),
            ("Credit card", CARD_NAMES[item["credit_card"]]),
            ("Commercial use", COMMERCIAL_NAMES[item["commercial_use"]]),
            ("Reviewed", item["last_checked"]),
        ]
        specs = "".join(
            '<div class="spec"><dt>' + tag(k) + '</dt><dd>' + tag(v) + '</dd></div>'
            for k, v in fields
        )
        content = (
            '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="' + tag(site_url) +
            '">Home</a><span aria-hidden="true">/</span><a href="' + tag(category_url) +
            '">' + tag(category) + '</a><span aria-hidden="true">/</span><span>' + tag(name) +
            '</span></nav><article class="detail"><p class="kicker">' + tag(category) +
            '</p><h1>' + tag(name) + '</h1>'
            '<p class="detail-lead">Free-tier allowances and critical restrictions at a glance.</p>'
            '<dl class="spec-list">' + specs + '</dl>'
            '<a class="button primary" href="' + tag(item["pricing_url"]) +
            '" target="_blank" rel="noopener noreferrer">Official pricing & documentation ↗</a>'
            '<p class="disclaimer">Independent listing, not affiliated with the provider. '
            'Usage caps and terms can change. Check the official source before enabling billing.</p>'
            '</article><p class="back-link"><a href="' + tag(category_url) +
            '">← More ' + tag(category) + ' services</a></p>'
        )
        schema = {"@context": "https://schema.org", "@graph": [
            {"@type": "WebPage", "name": name + " Free Tier",
             "url": absolute(relative),
             "description": item["free_limit"] + ". " + item["watch_out"],
             "dateModified": item["last_checked"],
             "about": {"@type": "Thing", "name": name, "url": item["pricing_url"]}},
            {"@type": "BreadcrumbList", "itemListElement": breadcrumb(crumbs)["itemListElement"]},
        ]}
        write_file(output, relative + "index.html", document(
            name + " Free Tier, Limits & Restrictions | Free Tier Hub",
            item["free_limit"] + ". " + item["watch_out"], relative, content, schema))
        page_urls.append((relative, item["last_checked"]))

    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for path, modified in page_urls:
        xml += '  <url><loc>' + xml_escape(absolute(path)) + '</loc><lastmod>' + modified + '</lastmod></url>\n'
    xml += '</urlset>\n'
    write_file(output, "sitemap.xml", xml)
    # For project Pages, only origin-root /robots.txt is authoritative to crawlers.
    write_file(output, "robots.txt",
               "User-agent: *\nAllow: " + url_path + "\nSitemap: " + absolute("sitemap.xml") + "\n")
    llms = [
        "# Free Tier Hub", "",
        "> Independent developer free-tier directory with usage caveats and official provider links.", "",
        "## Primary resources",
        "- [Directory](" + site_url + "): crawlable HTML index of all listed services.",
        "- [Catalog JSON](" + absolute("catalog.json") + "): machine-readable data with source URLs, review dates and plan types.",
        "- [Sitemap](" + absolute("sitemap.xml") + "): category and service URLs.",
        "- [Agent discovery](" + absolute("agents.md") + "): optional reading guide.", "",
        "## Categories",
    ]
    llms.extend("- [" + CATEGORY_NAMES[c] + "](" + absolute("category/" + c + "/") + ")"
                for c in CATEGORIES)
    llms.extend(["", "## Interpretation",
                 "- A listed offer may be an ongoing allowance, recurring credit, trial or expiring resource.",
                 "- An unknown card or commercial-use value means check the provider; it does not mean permission is granted.",
                 "- Official provider links in the JSON are the primary sources of current billing and limits.",
                 "- Review dates are editorial snapshots, not a guarantee that a provider has not changed its terms.", ""])
    write_file(output, "llms.txt", "\n".join(llms))
    agents = [
        "# Free Tier Hub — Agent Discovery", "",
        "This Markdown file is optional guidance for automated readers, not a robots.txt policy.", "",
        "## Discover",
        "- Human-readable index: " + site_url,
        "- Machine-readable catalog: " + absolute("catalog.json"),
        "- Sitemap: " + absolute("sitemap.xml"),
        "- LLM summary: " + absolute("llms.txt"), "",
        "## Data model",
        "Each catalog entry includes id, name, category, plan, free_limit, watch_out, pricing_url,",
        "credit_card, commercial_use and last_checked. Treat the official pricing_url as the source",
        "of truth when checking current quotas, billing requirements and commercial eligibility.", "",
        "## Access and attribution",
        "- Follow the origin's authoritative /robots.txt and applicable service terms.",
        "- Prefer canonical HTML URLs from sitemap.xml, not invented provider detail links.",
        "- Link back to the individual listing or original provider documentation when quoting limits.",
        "- Avoid interpreting unknown card or commercial-use values as a verified yes/no.", "",
        "## Category entry points",
    ]
    agents.extend("- [" + CATEGORY_NAMES[c] + "](" + absolute("category/" + c + "/") + ")"
                  for c in CATEGORIES)
    write_file(output, "agents.md", "\n".join(agents) + "\n")
    write_file(output, "catalog.json", json.dumps(items, indent=2, ensure_ascii=False) + "\n")
    source_assets = ROOT / "site" / "assets"
    for name in ("site.css", "site.js", "icon.svg"):
        target = output / "assets" / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_assets / name, target)
    write_file(output, ".nojekyll", "")
    write_file(output, "404.html", document(
        "Page not found | Free Tier Hub",
        "The requested page could not be found.", "404.html",
        '<section class="page-intro"><h1>Page not found</h1><p>Browse our current directory instead.</p>'
        '<a class="button primary" href="' + tag(site_url) + '">Back to Free Tier Hub</a></section>',
        {"@context": "https://schema.org", "@type": "WebPage",
         "name": "Page not found", "url": absolute("404.html")},
        robots="noindex,follow"))
    return {"service_count": len(items), "category_count": len(CATEGORIES),
            "page_count": len(page_urls), "urls": [absolute(path) for path, _ in page_urls],
            "site_url": site_url, "output": str(output)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site-url", default=os.getenv("SITE_URL", DEFAULT_URL))
    parser.add_argument("--output", default=str(ROOT / "dist"))
    parser.add_argument("--catalog", default=str(ROOT / "data" / "services.json"))
    args = parser.parse_args()
    result = build(args.output, args.site_url, args.catalog)
    print("Built", result["page_count"], "indexable pages for", result["site_url"])


if __name__ == "__main__":
    main()
