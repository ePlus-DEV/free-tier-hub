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

CANONICAL = "https://eplus-dev.github.io/free-tier-hub/"
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

    def test_home_crawlable_without_javascript(self):
        html = self.text("index.html")
        self.assertIn('<h1>Discover developer-friendly free tiers.</h1>', html)
        self.assertEqual(html.count('class="service-card"'), len(self.data))
        self.assertIn('rel="canonical" href="' + CANONICAL + '"', html)
        self.assertIn('name="description"', html)
        self.assertIn('property="og:title"', html)
        self.assertIn('name="twitter:card"', html)
        self.assertIn('id="search"', html)

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
        self.assertIn("Allow: /free-tier-hub/", content)
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
                relative = urlsplit(target).path.removeprefix("/free-tier-hub/")
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

    def test_custom_domain_switches_all_canonicals(self):
        with tempfile.TemporaryDirectory() as temp:
            out = Path(temp) / "site"
            build_site.build(out, "https://free.example.test/")
            html = (out / "index.html").read_text(encoding="utf-8")
            self.assertIn('rel="canonical" href="https://free.example.test/"', html)
            self.assertIn("https://free.example.test/sitemap.xml",
                          (out / "robots.txt").read_text(encoding="utf-8"))
            self.assertIn("Allow: /", (out / "robots.txt").read_text(encoding="utf-8"))

    def test_invalid_base_url_rejected(self):
        for url in ("http://example.com", "ftp://example.com", "https://example.com/?q=x"):
            with self.assertRaises(ValueError):
                build_site.normalize_url(url)


if __name__ == "__main__":
    unittest.main()
