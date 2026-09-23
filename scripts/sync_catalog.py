#!/usr/bin/env python3
"""Regenerate only catalog-owned Markdown tables from data/services.json."""
import argparse
from collections import Counter
import json
from pathlib import Path
import re
import sys

from check_markdown import CATEGORIES, PLANS, CARDS, COMMERCIAL

ROOT = Path(__file__).resolve().parents[1]
NAV = "| Category | Services | Browse |"
OVERVIEW = "| Service | Type | Free allowance | Critical restriction |"
CATEGORY = "| Service | Plan | Free allowance | Important caveat | Card | Commercial use |"


def cell(value):
    return str(value).replace("\\", "\\\\").replace("|", "\\|").replace("\n", " ")


def row(values):
    return "| " + " | ".join(cell(value) for value in values) + " |"


def replace_table(document, header, rows, filename):
    """Replace exactly one intact table; never touch surrounding editorial text."""
    lines = document.splitlines(keepends=True)
    matches = [i for i, line in enumerate(lines) if line.strip() == header]
    if len(matches) != 1:
        raise ValueError(f"{filename}: expected exactly one table headed {header}")
    start = matches[0]
    if start + 1 >= len(lines) or not re.fullmatch(r"[|:\- ]+", lines[start + 1].strip()):
        raise ValueError(f"{filename}: missing table separator")
    end = start + 2
    while end < len(lines) and lines[end].strip().startswith("|"):
        end += 1
    if end < len(lines) and lines[end].strip() and lines[end].lstrip().startswith("|"):
        raise ValueError(f"{filename}: malformed or split table")
    replacement = [lines[start], lines[start + 1]]
    replacement += [row(values) + "\n" for values in rows]
    return "".join(lines[:start] + replacement + lines[end:])


def render(root):
    data = json.loads((root / "data/services.json").read_text(encoding="utf-8"))
    if not isinstance(data, list) or not data:
        raise ValueError("Catalog must be a nonempty list")
    ids = [item["id"] for item in data]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate service ID; refusing to generate documents")
    counts = Counter(item["category"] for item in data)
    readme_path = root / "README.md"
    readme = readme_path.read_text(encoding="utf-8")
    # Retain category names and links as authored; only replace their counts.
    lines = readme.splitlines()
    nav_index = next((i for i, line in enumerate(lines) if line.strip() == NAV), None)
    if nav_index is None:
        raise ValueError("README navigation table missing")
    nav_rows = []
    for line in lines[nav_index + 2:]:
        if not line.startswith("|"):
            break
        parts = [part.strip() for part in line.strip().strip("|").split("|")]
        if len(parts) != 3:
            raise ValueError("Malformed README navigation row")
        match = re.fullmatch(r"\\[Browse\\]\\(docs/([a-z-]+)\\.md\\)", parts[2])
        if not match:
            raise ValueError("Unexpected navigation link")
        nav_rows.append([parts[0], counts[match.group(1)], parts[2]])
    if len(nav_rows) != len(CATEGORIES) or {re.search(r"docs/([a-z-]+)\\.md", r[2]).group(1) for r in nav_rows} != set(CATEGORIES):
        raise ValueError("Navigation categories differ from catalog")
    readme = replace_table(readme, NAV, nav_rows, "README.md")
    overview = [[f"[{item['name']}]({item['pricing_url']})", PLANS[item["plan"]], item["free_limit"], item["watch_out"]] for item in data]
    readme = replace_table(readme, OVERVIEW, overview, "README.md")
    readme, badges = re.subn(r"services-\\d+-brightgreen", f"services-{len(data)}-brightgreen", readme)
    if badges != 1:
        raise ValueError("README service badge missing or ambiguous")
    results = {readme_path: readme}
    for category in CATEGORIES:
        path = root / "docs" / f"{category}.md"
        body = path.read_text(encoding="utf-8")
        rows = [[f"[{item['name']}]({item['pricing_url']})", PLANS[item["plan"]], item["free_limit"], item["watch_out"], CARDS[item["credit_card"]], COMMERCIAL[item["commercial_use"]]] for item in data if item["category"] == category]
        results[path] = replace_table(body, CATEGORY, rows, str(path.relative_to(root)))
    return results


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if generated Markdown differs; never write")
    parser.add_argument("--root", type=Path, default=ROOT)
    args = parser.parse_args(argv)
    try:
        results = render(args.root)
        stale = [path for path, body in results.items() if path.read_text(encoding="utf-8") != body]
        if args.check:
            if stale:
                for path in stale:
                    print(f"OUT OF SYNC: {path.relative_to(args.root)}", file=sys.stderr)
                return 1
            print("PASS: README and category tables match JSON")
            return 0
        for path in stale:
            path.write_text(results[path], encoding="utf-8")
            print(f"Updated {path.relative_to(args.root)}")
        return 0
    except (ValueError, KeyError, OSError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
