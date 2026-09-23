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
            '<link rel="stylesheet" href="' + tag(absolute("assets/site.css")) + '">'
            '<link rel="alternate" type="text/plain" title="LLM overview" href="' + tag(absolute("llms.txt")) + '">'
            '<link rel="alternate" type="text/markdown" title="Agent discovery" href="' + tag(absolute("agents.md")) + '">'
            '<script type="application/ld+json">' + safe_json(structured_data) + '</script>'
            '<script src="' + tag(absolute("assets/site.js")) + '" defer></script>'
            '</head><body><a class="skip-link" href="#main">Skip to content</a>'
            '<header class="site-header"><div class="container header-inner">'
            '<a class="brand" href="' + tag(absolute()) + '" aria-label="Free Tier Hub home">'
            '<span class="brand-mark">F</span><span>Free Tier Hub</span></a>'
            '<nav aria-label="Main navigation"><a href="' + tag(absolute()) + '">Explore</a>'
            '<a href="' + tag(absolute("#categories")) + '">Categories</a>'
            '<a href="' + tag(REPOSITORY) + '" rel="noopener">GitHub</a></nav>'
            '</div></header><main id="main" class="container">' + content +
            '</main><footer class="site-footer"><div class="container">'
            '<p>Free Tier Hub is an independent community-maintained directory. '
            'Plans change: confirm limits and terms with each provider.</p>'
            '<p><a href="' + tag(absolute("llms.txt")) + '">LLM overview</a> · '
            '<a href="' + tag(absolute("agents.md")) + '">Agent discovery</a> · '
            '<a href="' + tag(absolute("sitemap.xml")) + '">Sitemap</a> · '
            '<a href="' + tag(REPOSITORY + "/blob/main/CONTRIBUTING.md") + '">Contribute</a></p>'
            '</div></footer></body></html>'
        )
        return head

    def card(item):
        dest = absolute("service/" + item["id"] + "/")
        group = CATEGORY_NAMES[item["category"]]
        search = " ".join((item["name"], group, item["free_limit"], item["watch_out"])).lower()
        return (
            '<article class="service-card" data-service-id="' + tag(item["id"]) +
            '" data-category="' + tag(item["category"]) +
            '" data-search="' + tag(search) + '">'
            '<div class="card-top"><span class="eyebrow">' + tag(group) + '</span>'
            '<span class="badge">' + tag(PLAN_NAMES[item["plan"]]) + '</span></div>'
            '<h3><a href="' + tag(dest) + '">' + tag(item["name"]) + '</a></h3>'
            '<p class="allowance">' + tag(item["free_limit"]) + '</p>'
            '<p class="restriction">' + tag(item["watch_out"]) + '</p>'
            '<div class="card-bottom"><span>Card: ' + tag(CARD_NAMES[item["credit_card"]]) +
            '</span><a href="' + tag(dest) + '" aria-label="View ' + tag(item["name"]) +
            ' details">Details <span aria-hidden="true">→</span></a></div></article>'
        )

    category_links = "".join(
        '<a class="category-link" href="' + tag(absolute("category/" + category + "/")) +
        '"><span>' + tag(CATEGORY_NAMES[category]) + '</span>'
        '<strong>' + str(counts[category]) + '</strong></a>'
        for category in CATEGORIES
    )
    cards = "".join(card(item) for item in items)
    options = "".join(
        '<option value="' + tag(category) + '">' + tag(CATEGORY_NAMES[category]) + '</option>'
        for category in CATEGORIES
    )
    home = (
        '<section class="hero"><div class="hero-copy"><p class="kicker">BUILD MORE · SPEND LESS</p>'
        '<h1>Discover developer-friendly free tiers.</h1>'
        '<p>Explore ' + str(len(items)) + ' free-tier services across ' +
        str(len(CATEGORIES)) + ' categories. Compare real allowances, card requirements, '
        'expiry rules and the hidden catches before you deploy.</p>'
        '<div class="hero-actions"><a class="button primary" href="#explore">Explore services</a>'
        '<a class="button secondary" href="' + tag(REPOSITORY) + '">Contribute on GitHub</a></div>'
        '</div><div class="hero-stat"><strong>' + str(len(items)) +
        '</strong><span>curated services</span><strong>' + str(len(CATEGORIES)) +
        '</strong><span>developer categories</span></div></section>'
        '<section id="categories" class="section"><div class="section-heading"><h2>Browse by category</h2>'
        '<p>Quickly narrow down providers by workload.</p></div>'
        '<div class="category-grid">' + category_links + '</div></section>'
        '<section id="explore" class="section"><div class="section-heading"><h2>All free-tier services</h2>'
        '<p>Use search and category filters; every result also has its own indexable page.</p></div>'
        '<div class="filters"><label for="search">Search providers and features'
        '<input id="search" type="search" autocomplete="off" placeholder="Try PostgreSQL, queue, deploy…"></label>'
        '<label for="category-filter">Category<select id="category-filter">'
        '<option value="">All categories</option>' + options + '</select></label></div>'
        '<p class="result-count" id="results-count" aria-live="polite">Showing ' + str(len(items)) +
        ' services</p><div class="service-grid" id="service-grid">' + cards + '</div>'
        '<p class="no-results" id="no-results" hidden>No matching services. Try a different search.</p>'
        '</section><aside class="notice"><strong>Free does not mean risk-free.</strong> '
        'Usage thresholds, commercial restrictions and regional availability can change. '
        '<a href="' + tag(REPOSITORY + "/blob/main/docs/cost-safety.md") +
        '">Review the cost and data-safety checklist</a>.</aside>'
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
