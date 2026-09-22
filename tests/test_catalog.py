"""Unit and regression tests: Markdown rendering, JSON consistency and CLI validator."""
from contextlib import redirect_stderr, redirect_stdout
from copy import deepcopy
from datetime import date, timedelta
import io
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import check_markdown
import validate_catalog


class MarkdownTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads((ROOT / "data/services.json").read_text(encoding="utf-8"))
        cls.readme = (ROOT / "README.md").read_text(encoding="utf-8")
        cls.pages = {
            path.stem: path.read_text(encoding="utf-8")
            for path in (ROOT / "docs").glob("*.md")
        }

    def test_current_documents_pass(self):
        self.assertEqual(check_markdown.validate_documents(ROOT, self.data, self.readme, self.pages), [])

    def test_blank_line_splits_readme_table(self):
        damaged = self.readme.replace("\n| [Neon Free Postgres]", "\n\n| [Neon Free Postgres]", 1)
        _, errors = check_markdown.scan_tables(damaged, "README.md")
        self.assertTrue(any("orphan" in e for e in errors), errors)

    def test_blank_line_splits_category_table(self):
        text = self.pages["databases"].replace("\n| [Neon Free Postgres]", "\n\n| [Neon Free Postgres]", 1)
        _, errors = check_markdown.scan_tables(text, "docs/databases.md")
        self.assertTrue(any("orphan" in e for e in errors), errors)

    def test_bad_column_count(self):
        _, errors = check_markdown.scan_tables("| a | b |\n| --- | --- |\n| only-one |\n", "test.md")
        self.assertTrue(any("width" in e for e in errors))

    def test_missing_separator(self):
        _, errors = check_markdown.scan_tables("| a | b |\n| value | value |\n", "test.md")
        self.assertTrue(any("orphan" in e for e in errors))

    def test_fenced_sample_ignored(self):
        _, errors = check_markdown.scan_tables("~~~md\n| sample | row |\n| missing |\n~~~", "test.md")
        self.assertEqual(errors, [])

    def test_bad_count_badge(self):
        bad = self.readme.replace("services-45-brightgreen", "services-44-brightgreen", 1)
        errors = check_markdown.validate_documents(ROOT, self.data, bad, self.pages)
        self.assertTrue(any("badge" in e for e in errors), errors)

    def test_wrong_category_total(self):
        bad = self.readme.replace("Static & frontend hosting | 7", "Static & frontend hosting | 70", 1)
        errors = check_markdown.validate_documents(ROOT, self.data, bad, self.pages)
        self.assertTrue(any("navigation" in e for e in errors), errors)

    def test_mismatched_readme_service(self):
        bad = self.readme.replace("100 GB Fast Data Transfer", "999 GB Fast Data Transfer", 1)
        errors = check_markdown.validate_documents(ROOT, self.data, bad, self.pages)
        self.assertTrue(any("README.md: service row" in e for e in errors), errors)

    def test_mismatched_category_page(self):
        pages = dict(self.pages)
        pages["static-hosting"] = pages["static-hosting"].replace("100 GB Fast Data Transfer", "999 GB Fast Data Transfer", 1)
        errors = check_markdown.validate_documents(ROOT, self.data, self.readme, pages)
        self.assertTrue(any("docs/static-hosting.md: service row" in e for e in errors), errors)

    def test_broken_relative_link(self):
        errors = check_markdown.broken_local_links("[bad](docs/no-such-file.md)", "README.md", ROOT)
        self.assertEqual(len(errors), 1)

    def test_valid_relative_link(self):
        self.assertEqual(check_markdown.broken_local_links("[back](../README.md)", "docs/example.md", ROOT), [])

    def test_escaped_table_pipe(self):
        self.assertEqual(check_markdown.split_row(r"| a \| b | c |"), ["a | b", "c"])


class ValidatorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sample = json.loads((ROOT / "data/services.json").read_text(encoding="utf-8"))[0]

    def make_repo(self, temp):
        target = Path(temp)
        (target / "data").mkdir()
        (target / "docs").mkdir()
        shutil.copy2(ROOT / "README.md", target / "README.md")
        shutil.copy2(ROOT / "data/services.json", target / "data/services.json")
        for path in (ROOT / "docs").glob("*.md"):
            shutil.copy2(path, target / "docs" / path.name)
        return target

    def run_validator(self, root):
        with patch.object(validate_catalog, "ROOT", root):
            with redirect_stderr(io.StringIO()), redirect_stdout(io.StringIO()):
                return validate_catalog.main()

    def test_real_repo_passes(self):
        self.assertEqual(self.run_validator(ROOT), 0)

    def test_duplicate_id_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = self.make_repo(tmp)
            path = root / "data/services.json"
            data = json.loads(path.read_text())
            data.append(deepcopy(data[0]))
            path.write_text(json.dumps(data))
            self.assertEqual(self.run_validator(root), 1)

    def test_invalid_https_url_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = self.make_repo(tmp)
            path = root / "data/services.json"
            data = json.loads(path.read_text())
            data[0]["pricing_url"] = "http://not-https.example"
            path.write_text(json.dumps(data))
            self.assertEqual(self.run_validator(root), 1)

    def test_missing_required_field_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = self.make_repo(tmp)
            path = root / "data/services.json"
            data = json.loads(path.read_text())
            del data[0]["free_limit"]
            path.write_text(json.dumps(data))
            self.assertEqual(self.run_validator(root), 1)

    def test_future_review_date_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = self.make_repo(tmp)
            path = root / "data/services.json"
            data = json.loads(path.read_text())
            data[0]["last_checked"] = (date.today() + timedelta(days=1)).isoformat()
            path.write_text(json.dumps(data))
            self.assertEqual(self.run_validator(root), 1)

    def test_missing_category_document_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = self.make_repo(tmp)
            (root / "docs/static-hosting.md").unlink()
            self.assertEqual(self.run_validator(root), 1)


if __name__ == "__main__":
    unittest.main()
