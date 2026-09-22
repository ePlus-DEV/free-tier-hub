#!/usr/bin/env python3
"""Offline catalog consistency checks; no third-party dependencies."""
import datetime
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
CATEGORIES = {
    "static-hosting", "app-hosting", "serverless", "cloud-vps",
    "databases", "storage", "developer-tools",
    "auth-security", "observability", "analytics", "dns-cdn", "ai-ml",
    "queues-jobs", "search", "feature-flags",
}
PLANS = {"ongoing", "monthly-credit", "limited-duration", "temporary-resource"}
TRI = {"yes", "no", "check"}
FIELDS = {
    "id", "name", "category", "plan", "free_limit", "watch_out",
    "pricing_url", "credit_card", "commercial_use", "last_checked",
}

def main():
    errors = []
    data = json.loads((ROOT / "data/services.json").read_text(encoding="utf-8"))
    if not isinstance(data, list) or not data:
        errors.append("Catalog must be a nonempty list.")
        data = []
    ids = set()
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    pages = {}
    for category in CATEGORIES:
        path = ROOT / "docs" / (category + ".md")
        if not path.is_file():
            errors.append(f"Missing {path.relative_to(ROOT)}")
        else:
            pages[category] = path.read_text(encoding="utf-8")
    for i, item in enumerate(data):
        where = f"entry #{i+1}"
        if not isinstance(item, dict):
            errors.append(f"{where}: expected object")
            continue
        missing = FIELDS - item.keys()
        if missing:
            errors.append(f"{where}: missing {sorted(missing)}")
            continue
        sid = item["id"]
        if not isinstance(sid, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", sid):
            errors.append(f"{where}: bad id {sid!r}")
        if sid in ids:
            errors.append(f"{where}: duplicate id {sid}")
        ids.add(sid)
        for field in ("name", "free_limit", "watch_out"):
            if not isinstance(item[field], str) or not item[field].strip():
                errors.append(f"{sid}: empty or invalid {field}")
        category = item["category"]
        if category not in CATEGORIES:
            errors.append(f"{sid}: unsupported category {category}")
        if item["plan"] not in PLANS:
            errors.append(f"{sid}: unsupported plan")
        if item["credit_card"] not in TRI or item["commercial_use"] not in TRI:
            errors.append(f"{sid}: expected yes/no/check for card and commercial use")
        u = urlparse(str(item["pricing_url"]))
        if u.scheme != "https" or not u.hostname or u.username or u.password:
            errors.append(f"{sid}: invalid official HTTPS URL")
        try:
            review = datetime.date.fromisoformat(item["last_checked"])
            if review > datetime.date.today():
                errors.append(f"{sid}: review date is in the future")
        except (TypeError, ValueError):
            errors.append(f"{sid}: invalid last_checked ISO date")
        link = f"[{item['name']}]({item['pricing_url']})"
        if link not in readme:
            errors.append(f"{sid}: missing linked row in README")
        if category in pages and link not in pages[category]:
            errors.append(f"{sid}: missing linked row in docs/{category}.md")
        for other_cat, page in pages.items():
            if other_cat != category and link in page:
                errors.append(f"{sid}: listed in wrong page docs/{other_cat}.md")
    if not errors:
        from check_markdown import validate_documents
        errors.extend(validate_documents(ROOT, data, readme, pages))
    if not errors:
        print(f"PASS: {len(data)} unique service entries across {len(CATEGORIES)} categories, with matching README and docs.")
        return 0
    for error in errors:
        print("FAIL:", error, file=sys.stderr)
    print(f"{len(errors)} validation failure(s)", file=sys.stderr)
    return 1

if __name__ == "__main__":
    raise SystemExit(main())
