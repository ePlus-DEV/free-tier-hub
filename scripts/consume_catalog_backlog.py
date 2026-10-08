#!/usr/bin/env python3
"""Validate and consume reviewed GitHub-native catalog candidates without Issues API."""
import argparse
import datetime
import json
import pathlib
import re
from urllib.parse import urlparse

from validate_catalog import CATEGORIES, FIELDS, PLANS, TRI

ROOT = pathlib.Path(__file__).resolve().parents[1]
BACKLOG = ROOT / "data/catalog-candidate-backlog.json"
CATALOG = ROOT / "data/services.json"
LOGOS = ROOT / "scripts/build_site.py"


def load_candidates():
    entries = json.loads(BACKLOG.read_text(encoding="utf-8"))
    if not isinstance(entries, list):
        raise ValueError("Backlog must be a JSON array")
    today = datetime.datetime.now(datetime.timezone.utc).date()
    ids = set()
    for candidate in entries:
        if not isinstance(candidate, dict) or set(candidate) != FIELDS:
            raise ValueError("Candidate must have exactly the catalog schema fields")
        sid = candidate["id"]
        if not isinstance(sid, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", sid):
            raise ValueError("Invalid candidate id")
        if sid in ids:
            raise ValueError("Duplicate backlog candidate id")
        ids.add(sid)
        if candidate["category"] not in CATEGORIES or candidate["plan"] not in PLANS:
            raise ValueError("Unsupported category or plan")
        if candidate["credit_card"] not in TRI or candidate["commercial_use"] not in TRI:
            raise ValueError("Unsupported tri-state value")
        for field in ("name", "free_limit", "watch_out"):
            if not isinstance(candidate[field], str) or not candidate[field].strip():
                raise ValueError("Empty or invalid candidate field " + field)
        url = urlparse(candidate["pricing_url"])
        if url.scheme != "https" or not url.hostname or url.username or url.password:
            raise ValueError("Invalid official HTTPS pricing URL")
        checked = datetime.date.fromisoformat(candidate["last_checked"])
        if checked > today or (today - checked).days > 7:
            raise ValueError("Candidate pricing review is stale or in the future: " + sid)
    return entries


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--list", action="store_true")
    parser.add_argument("--apply", metavar="SERVICE_ID")
    args = parser.parse_args()
    if args.list == bool(args.apply):
        parser.error("Use exactly one of --list or --apply")
    entries = load_candidates()
    services = json.loads(CATALOG.read_text(encoding="utf-8"))
    present = {entry["id"] for entry in services}
    if args.list:
        for entry in entries:
            if entry["id"] not in present:
                print(entry["id"])
        return
    selected = [entry for entry in entries if entry["id"] == args.apply]
    if len(selected) != 1 or args.apply in present:
        raise ValueError("Candidate missing from backlog or already catalogued")
    source = LOGOS.read_text(encoding="utf-8")
    marker = "SERVICE_LOGOS = {"
    if marker not in source:
        raise ValueError("SERVICE_LOGOS mapping not found")
    if not re.search(r'^[ \t]*["\x27]' + re.escape(args.apply) + r'["\x27][ \t]*:', source, re.M):
        index = source.index("\n", source.index(marker)) + 1
        source = source[:index] + f'    "{args.apply}": None,\n' + source[index:]
    services.append(selected[0])
    CATALOG.write_text(json.dumps(services, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    LOGOS.write_text(source, encoding="utf-8")


if __name__ == "__main__":
    main()
