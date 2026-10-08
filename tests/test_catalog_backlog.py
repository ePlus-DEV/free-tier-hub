"""Tests for GitHub-native catalog backlog validation and deterministic consumption."""
import contextlib
import datetime
import io
import json
import pathlib
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))
import consume_catalog_backlog as consumer


def candidate(sid="sample-free"):
    return {
        "id": sid,
        "name": "Sample Free",
        "category": "developer-tools",
        "plan": "ongoing",
        "free_limit": "100 calls/month",
        "watch_out": "No production SLA",
        "pricing_url": "https://example.com/pricing",
        "credit_card": "check",
        "commercial_use": "check",
        "last_checked": datetime.datetime.now(datetime.timezone.utc).date().isoformat(),
    }


class CatalogBacklogTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = pathlib.Path(self.temp.name)
        self.backlog = root / "backlog.json"
        self.catalog = root / "services.json"
        self.logos = root / "build_site.py"
        self.catalog.write_text("[]", encoding="utf-8")
        self.logos.write_text("SERVICE_LOGOS = {\n}\n", encoding="utf-8")
        for name, value in (("BACKLOG", self.backlog), ("CATALOG", self.catalog), ("LOGOS", self.logos)):
            patcher = mock.patch.object(consumer, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def write(self, entries):
        self.backlog.write_text(json.dumps(entries), encoding="utf-8")

    def test_list_and_apply(self):
        self.write([candidate()])
        with mock.patch.object(sys, "argv", ["consumer", "--list"]):
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                consumer.main()
        self.assertEqual(output.getvalue().strip(), "sample-free")
        with mock.patch.object(sys, "argv", ["consumer", "--apply", "sample-free"]):
            consumer.main()
        self.assertEqual(json.loads(self.catalog.read_text())[0]["id"], "sample-free")
        self.assertIn('"sample-free": None', self.logos.read_text())
        with mock.patch.object(sys, "argv", ["consumer", "--apply", "sample-free"]):
            with self.assertRaises(ValueError):
                consumer.main()

    def test_duplicate_candidate_rejected(self):
        self.write([candidate(), candidate()])
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            consumer.load_candidates()

    def test_non_https_rejected(self):
        entry = candidate()
        entry["pricing_url"] = "http://example.com"
        self.write([entry])
        with self.assertRaisesRegex(ValueError, "HTTPS"):
            consumer.load_candidates()

    def test_stale_review_rejected(self):
        entry = candidate()
        entry["last_checked"] = "2020-01-01"
        self.write([entry])
        self.assertEqual(len(consumer.load_candidates()), 1)
        with mock.patch.object(sys, "argv", ["consumer", "--list"]):
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                consumer.main()
        self.assertEqual(output.getvalue(), "")
        with mock.patch.object(sys, "argv", ["consumer", "--apply", "sample-free"]):
            with self.assertRaisesRegex(ValueError, "stale"):
                consumer.main()

    def test_stale_entry_does_not_block_fresh_candidate(self):
        stale = candidate("old-free")
        stale["last_checked"] = "2020-01-01"
        self.write([stale, candidate("fresh-free")])
        with mock.patch.object(sys, "argv", ["consumer", "--list"]):
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                consumer.main()
        self.assertEqual(output.getvalue().strip(), "fresh-free")

    def test_invalid_schema_rejected(self):
        entry = candidate()
        entry["unexpected"] = "extra"
        self.write([entry])
        with self.assertRaisesRegex(ValueError, "schema"):
            consumer.load_candidates()


if __name__ == "__main__":
    unittest.main()
