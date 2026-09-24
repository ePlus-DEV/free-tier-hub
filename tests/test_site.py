"""Regression tests for the published static site, discovery files and SEO."""
import json
from pathlib import Path
import re
import sys
import tempfile
import unittest
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_site

CANONICAL = "https://free-tier.eplus.dev/"
NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}


class SiteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.output = Path(cls.temp.name) / "dist"
        cls.result = build_site.build(cls.output, CANONICAL)
        cls.data = json.loads((ROOT / "data/services.json").read_text(encoding="utf-8"))

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def text(self, path):
        return (self.output / path).read_text(encoding="utf-8")

    def test_all_service_and_category_pages_are_prerendered(self):
        self.assertEqual(self.result["service_count"], len(self.data))
        self.assertEqual(self.result["category_count"], len(build_site.CATEGORIES))
        self.assertEqual(
            self.result["page_count"], 1 + len(self.data) + len(build_site.CATEGORIES)
        )
        for category in build_site.CATEGORIES:
            self.assertTrue((self.output / "category" / category / "index.html").is_file())
        for service in self.data:
            self.assertTrue((self.output / "service" / service["id"] / "index.html").is_file())

    def test_sort_and_billing_filters(self):
        html = self.text("index.html")
        script = self.text("assets/site.js")
        for value in ("newest", "oldest", "verified", "name", "name-desc", "category"):
            self.assertIn('value="' + value + '"', html)
        for control in ("filter-no-card", "filter-commercial"):
            self.assertIn('id="' + control + '"', html)
            self.assertIn('getElementById("' + control + '")', script)
        self.assertIn('data-last-checked="', html)
        self.assertIn('data-added-at="', html)
        self.assertIn('data-credit-card="', html)
        self.assertIn('data-commercial-use="', html)

    def test_mobile_header_remains_sticky(self):
        css = self.text("assets/site.css")
        mobile = css.split("@media(max-width:680px){", 1)[1].split("@media(max-width:390px){", 1)[0]
        self.assertIn(".site-header{position:sticky;", mobile)
        self.assertNotIn(".site-header{position:relative}", mobile)
        self.assertIn("safe-area-inset-top", mobile)

    def test_home_crawlable_without_javascript(self):
        html = self.text("index.html")
        self.assertIn('<h1>Discover developer-friendly free tiers.</h1>', html)
        self.assertEqual(html.count('class="service-card"'), len(self.data))
        self.assertIn('rel="canonical" href="' + CANONICAL + '"', html)
        self.assertIn('name="description"', html)
        self.assertIn('property="og:title"', html)
        self.assertIn('name="twitter:card"', html)
        self.assertIn('id="search"', html)

    def test_ga4_tracking_is_present_once_on_every_html_page(self):
        """All generated pages, including category/detail, carry the same GA4 ID."""
        pages = list(self.output.rglob("*.html"))
        self.assertEqual(len(pages), self.result["page_count"] + 1)  # Includes 404.html
        for page in pages:
            with self.subTest(page=str(page.relative_to(self.output))):
                html = page.read_text(encoding="utf-8")
                self.assertEqual(html.count('https://www.googletagmanager.com/gtag/js?id=G-9YPGG0XEZV'), 1)
                self.assertEqual(html.count("gtag('config','G-9YPGG0XEZV')"), 1)
                self.assertIn('window.dataLayer=window.dataLayer||[]', html)
                self.assertIn("gtag('js',new Date())", html)
                self.assertLess(html.index('googletagmanager.com/gtag/js'), html.index('</head>'))

    def test_cloudflare_hyperdrive_official_listing(self):
        entry = next(x for x in self.data if x["id"] == "cloudflare-hyperdrive")
        self.assertEqual(entry["pricing_url"], "https://developers.cloudflare.com/hyperdrive/platform/pricing/")
        self.assertIn("100,000", entry["free_limit"])
        self.assertIn("origin", entry["watch_out"])
        self.assertIn('simple-icons@v15/icons/cloudflare.svg', self.text("service/cloudflare-hyperdrive/index.html"))

    def test_new_cloudflare_ai_and_vector_services(self):
        for service_id, category in [("cloudflare-vectorize", "databases"), ("cloudflare-workers-ai", "ai-ml")]:
            with self.subTest(service=service_id):
                entry = next(item for item in self.data if item["id"] == service_id)
                self.assertEqual(entry["category"], category)
                self.assertEqual(entry["credit_card"], "no")
                self.assertEqual(entry["commercial_use"], "check")
                self.assertIn('simple-icons@v15/icons/cloudflare.svg', self.text("service/" + service_id + "/index.html"))
        self.assertGreaterEqual(len(self.data), 70)

    def test_new_analytics_and_observability_services(self):
        expected = {
            "tinybird-free": ("analytics", "tinybird"),
            "new-relic-free": ("observability", "newrelic"),
        }
        for service_id, (category, logo) in expected.items():
            with self.subTest(service=service_id):
                entry = next(item for item in self.data if item["id"] == service_id)
                self.assertEqual(entry["category"], category)
                self.assertEqual(entry["credit_card"], "no")
                self.assertEqual(entry["commercial_use"], "check")
                self.assertIn("simple-icons@v15/icons/" + logo + ".svg", self.text("service/" + service_id + "/index.html"))
        self.assertGreaterEqual(len(self.data), 72)

    def test_six_new_free_tiers(self):
        expected = {"convex-free": "databases", "doppler-developer": "auth-security",
                    "estuary-developer": "developer-tools", "deplexo-free": "app-hosting",
                    "pr-quorum-free": "developer-tools", "tinyfish-search-fetch": "search"}
        self.assertGreaterEqual(len(self.data), 78)
        for service_id, category in expected.items():
            with self.subTest(service=service_id):
                entry = next(x for x in self.data if x["id"] == service_id)
                self.assertEqual(entry["category"], category)
                self.assertTrue(entry["pricing_url"].startswith("https://"))

    def test_service_logos_have_fallback_and_use_curated_slugs(self):
        html = self.text("index.html")
        detail = self.text("service/vercel/index.html")
        self.assertIn("simple-icons@v15/icons/vercel.svg", html)
        self.assertIn('class="service-monogram" hidden', html)
        self.assertIn("simple-icons@v15/icons/vercel.svg", detail)
        self.assertIn("this.nextElementSibling.hidden=false", detail)
        self.assertEqual(set(build_site.SERVICE_LOGOS), {item["id"] for item in self.data})

    def test_back_to_top_is_on_every_page_and_respects_motion_preference(self):
        for page in self.output.rglob("*.html"):
            html = page.read_text(encoding="utf-8")
            self.assertIn('id="back-to-top"', html, str(page))
            self.assertIn('aria-label="Back to top"', html, str(page))
        js = self.text("assets/site.js")
        css = self.text("assets/site.css")
        self.assertIn('window.scrollY < 360', js)
        self.assertIn('window.scrollTo({ top: 0', js)
        self.assertIn('prefers-reduced-motion: reduce', js)
        self.assertIn('.back-to-top[hidden]', css)

    def test_brand_assets_and_header_identity(self):
        html = self.text("index.html")
        icon = self.text("assets/icon.svg")
        self.assertIn('class="brand-mark"><img src="' + CANONICAL + 'assets/icon.svg"', html)
        self.assertIn('<small>by ePlus-DEV</small>', html)
        self.assertIn('id="blue"', icon)
        self.assertIn('id="green"', icon)
        self.assertIn('Free Tier Hub', icon)

    def test_every_page_has_absolute_self_canonical(self):
        for url in self.result["urls"]:
            path = url.removeprefix(CANONICAL)
            content = self.text(path + "index.html")
            self.assertIn('rel="canonical" href="' + url + '"', content)
            self.assertIn('name="description" content="', content)
            self.assertIn('name="robots" content="index,follow"', content)
            self.assertIn('<h1>', content)

    def test_schema_json_is_parseable(self):
        for url in self.result["urls"]:
            path = url.removeprefix(CANONICAL)
            html = self.text(path + "index.html")
            jsonld = re.search(
                r'<script type="application/ld\+json">(.+?)</script>', html, re.S
            )
            self.assertIsNotNone(jsonld, url)
            schema = json.loads(jsonld.group(1))
            self.assertEqual(schema["@context"], "https://schema.org")

    def test_sitemap_has_canonical_urls_and_dates(self):
        xml = ET.fromstring(self.text("sitemap.xml"))
        locations = [node.text for node in xml.findall("s:url/s:loc", NS)]
        self.assertEqual(len(locations), len(self.result["urls"]))
        self.assertEqual(set(locations), set(self.result["urls"]))
        self.assertEqual(len(locations), len(set(locations)))
        self.assertTrue(all(url.startswith(CANONICAL) for url in locations))
        self.assertEqual(len(xml.findall("s:url/s:lastmod", NS)), len(locations))

    def test_machine_catalog_identical_to_source(self):
        self.assertEqual(json.loads(self.text("catalog.json")), self.data)

    def test_llms_and_agents_have_current_catalog_links(self):
        for name in ("llms.txt", "agents.md"):
            content = self.text(name)
            self.assertIn(CANONICAL + "catalog.json", content)
            self.assertIn(CANONICAL + "sitemap.xml", content)
            self.assertNotIn("free-for.dev", content.lower())
            self.assertNotIn("ripienaar", content.lower())
            for category in build_site.CATEGORIES:
                self.assertIn(CANONICAL + "category/" + category + "/", content)

    def test_robots_mentions_project_path_and_sitemap(self):
        content = self.text("robots.txt")
        self.assertIn("User-agent: *\nAllow: /\n", content)
        self.assertIn("Sitemap: " + CANONICAL + "sitemap.xml", content)

    def test_static_assets_and_nojekyll_exist(self):
        for asset in ("site.css", "site.js", "icon.svg"):
            self.assertGreater((self.output / "assets" / asset).stat().st_size, 0)
        self.assertTrue((self.output / ".nojekyll").is_file())
        self.assertIn('name="robots" content="noindex,follow"', self.text("404.html"))

    def test_site_local_links_resolve_to_generated_files(self):
        for url in self.result["urls"]:
            path = url.removeprefix(CANONICAL)
            html = self.text(path + "index.html")
            for target in re.findall(r'(?:href|src)="([^"]+)"', html):
                if not target.startswith(CANONICAL):
                    continue
                relative = urlsplit(target).path.lstrip("/")
                if not relative or relative.endswith("/"):
                    relative += "index.html"
                self.assertTrue((self.output / relative).is_file(), target)

    def test_unsafe_provider_text_is_escaped(self):
        mutated = [dict(item) for item in self.data]
        mutated[0]["name"] = '<script>alert("x")</script>'
        mutated[0]["free_limit"] = "<img src=x onerror=alert(1)>"
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "services.json"
            source.write_text(json.dumps(mutated), encoding="utf-8")
            out = Path(temp) / "site"
            build_site.build(out, CANONICAL, source)
            page = (out / "service" / mutated[0]["id"] / "index.html").read_text(
                encoding="utf-8"
            )
            self.assertNotIn('<script>alert("x")</script>', page)
            self.assertNotIn("<img src=x onerror=alert(1)>", page)
            self.assertIn("&lt;script&gt;", page)

    def test_production_root_domain_is_consistent_everywhere(self):
        self.assertEqual(build_site.DEFAULT_URL, CANONICAL)
        self.assertEqual(self.result["site_url"], CANONICAL)
        for url in self.result["urls"]:
            parsed = urlsplit(url)
            self.assertEqual(parsed.scheme, "https")
            self.assertEqual(parsed.netloc, "free-tier.eplus.dev")
            self.assertNotIn("/free-tier-hub/", parsed.path)
        for name in ("index.html", "sitemap.xml", "robots.txt", "llms.txt", "agents.md"):
            content = self.text(name)
            self.assertNotIn("eplus-dev.github.io", content)
        self.assertIn('rel="canonical" href="' + CANONICAL + '"', self.text("index.html"))
        self.assertIn('<loc>' + CANONICAL + '</loc>', self.text("sitemap.xml"))
        self.assertIn("Sitemap: " + CANONICAL + "sitemap.xml", self.text("robots.txt"))
        self.assertIn("Allow: /\n", self.text("robots.txt"))

    def test_custom_domain_switches_all_canonicals(self):
        with tempfile.TemporaryDirectory() as temp:
            out = Path(temp) / "site"
            build_site.build(out, "https://free.example.test/")
            html = (out / "index.html").read_text(encoding="utf-8")
            self.assertIn('rel="canonical" href="https://free.example.test/"', html)
            self.assertIn("https://free.example.test/sitemap.xml",
                          (out / "robots.txt").read_text(encoding="utf-8"))
            self.assertIn("Allow: /", (out / "robots.txt").read_text(encoding="utf-8"))

    def test_redesigned_directory_has_real_filters_and_pagination(self):
        home = self.text("index.html")
        self.assertIn('class="hero-panel"', home)
        self.assertIn('class="catalog-layout"', home)
        self.assertIn('class="catalog-sidebar"', home)
        self.assertIn('id="theme-toggle"', home)
        self.assertIn('id="category-filter"', home)
        self.assertIn('id="sort"', home)
        self.assertIn('id="load-more"', home)
        self.assertEqual(home.count('class="service-card"'), len(self.data))
        self.assertEqual(home.count('data-filter-category='), len(build_site.CATEGORIES) + 1)

    def test_directory_replaces_redundant_workload_section(self):
        home = self.text("index.html")
        self.assertNotIn('id="categories"', home)
        self.assertNotIn('EXPLORE BY WORKLOAD', home)
        self.assertIn('id="explore"', home)
        self.assertIn('href="' + CANONICAL + '#explore"', home)

    def test_all_categories_are_linked_from_sitemap(self):
        sitemap = self.text("sitemap.xml")
        for category in build_site.CATEGORIES:
            self.assertIn(CANONICAL + 'category/' + category + '/', sitemap)

    def test_new_details_expose_full_restrictions_and_official_source(self):
        for item in self.data:
            page = self.text("service/" + item["id"] + "/index.html")
            self.assertIn('class="detail-layout"', page)
            self.assertIn('class="detail-highlight"', page)
            self.assertIn('class="detail-warning"', page)
            self.assertIn('class="detail-aside"', page)
            self.assertIn('href="' + item["pricing_url"].replace("&", "&amp;") + '"', page)
            self.assertIn(item["watch_out"].replace("&", "&amp;").replace("<", "&lt;"), page)

    def test_progressive_enhancement_and_dark_theme_code_exist(self):
        html = self.text("index.html")
        script = self.text("assets/site.js")
        css = self.text("assets/site.css")
        self.assertIn('id="service-grid"', html)
        self.assertIn('data-paged-hidden', script)
        self.assertIn('data-theme', script)
        self.assertIn('prefers-reduced-motion', css)
        self.assertIn('.category-service-grid', css)
        self.assertIn('localStorage', script)

    def test_invalid_base_url_rejected(self):
        for url in ("http://example.com", "ftp://example.com", "https://example.com/?q=x"):
            with self.assertRaises(ValueError):
                build_site.normalize_url(url)


if __name__ == "__main__":
    unittest.main()
