"""Regression tests for deterministic catalog Markdown generation."""
from copy import deepcopy
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import sync_catalog
import check_markdown


class SyncCatalogTests(unittest.TestCase):
    def fixture(self, directory):
        root = Path(directory)
        (root / "data").mkdir()
        (root / "docs").mkdir()
        shutil.copytree(ROOT / ".github", root / ".github")
        shutil.copytree(ROOT / "scripts", root / "scripts")
        shutil.copy2(ROOT / "CONTRIBUTING.md", root / "CONTRIBUTING.md")
        for source in [ROOT / "README.md", ROOT / "data/services.json"]:
            shutil.copy2(source, root / source.relative_to(ROOT))
        for source in (ROOT / "docs").glob("*.md"):
            shutil.copy2(source, root / "docs" / source.name)
        return root

    def test_current_documents_are_synced(self):
        self.assertEqual(sync_catalog.main(["--check", "--root", str(ROOT)]), 0)

    def test_insert_middle_preserves_existing_records_and_prose(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.fixture(temp)
            source = root / "data/services.json"
            original = json.loads(source.read_text())
            added = deepcopy(original[0])
            added.update(id="regression-example", name="Regression Example", category="databases", pricing_url="https://example.org/pricing")
            data = original[:20] + [added] + original[20:]
            source.write_text(json.dumps(data))
            before = (root / "README.md").read_text()
            self.assertEqual(sync_catalog.main(["--check", "--root", str(root)]), 1)
            self.assertEqual(sync_catalog.main(["--root", str(root)]), 0)
            self.assertEqual(sync_catalog.main(["--check", "--root", str(root)]), 0)
            self.assertEqual(json.loads(source.read_text())[:20] + json.loads(source.read_text())[21:], original)
            after = (root / "README.md").read_text()
            self.assertEqual(before.split("## Quick navigation")[0].replace(f"services-{len(original)}-", f"services-{len(data)}-"), after.split("## Quick navigation")[0])
            pages = {p.stem: p.read_text() for p in (root / "docs").glob("*.md")}
            self.assertEqual(check_markdown.validate_documents(root, data, after, pages), [])
            self.assertEqual(sync_catalog.main(["--root", str(root)]), 0)

    def test_duplicate_id_refuses_to_write(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.fixture(temp)
            source = root / "data/services.json"
            data = json.loads(source.read_text())
            data.insert(1, deepcopy(data[0]))
            source.write_text(json.dumps(data))
            before = (root / "README.md").read_bytes()
            self.assertEqual(sync_catalog.main(["--root", str(root)]), 1)
            self.assertEqual((root / "README.md").read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
