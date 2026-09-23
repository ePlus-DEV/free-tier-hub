"""Offline PR preview regression tests."""
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_site
import prepare_preview


class PreviewTests(unittest.TestCase):
    def test_offline_preview_preserves_production_canonical_and_links(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "dist"
            result = build_site.build(output)
            count = prepare_preview.prepare(output, build_site.DEFAULT_URL)
            self.assertEqual(count, result["page_count"] + 1)
            home = (output / "index.html").read_text()
            detail = (output / "service" / "vercel" / "index.html").read_text()
            self.assertIn('href="assets/site.css"', home)
            self.assertIn('src="assets/site.js"', home)
            self.assertIn('href="../../../assets/site.css"', detail)
            self.assertIn('rel="canonical" href="' + build_site.DEFAULT_URL + '"', home)
            self.assertNotIn("googletagmanager.com/gtag/js", home)
            self.assertNotIn("gtag('config'", detail)
            self.assertIn('href="../../../index.html"', detail)
