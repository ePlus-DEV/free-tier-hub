"""Offline Markdown and catalog presentation checks, using only Python's standard library."""
from collections import Counter
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

CATEGORIES = (
    "static-hosting", "app-hosting", "serverless", "cloud-vps",
    "databases", "storage", "developer-tools", "auth-security",
    "observability", "analytics", "dns-cdn", "ai-ml",
    "queues-jobs", "search", "feature-flags", "tunneling-networking",
    "webhooks-events",
)
PLANS = {
    "ongoing": "Ongoing free allowance",
    "monthly-credit": "Recurring free credit",
    "limited-duration": "Time-limited",
    "temporary-resource": "Temporary resource",
}
CARDS = {"yes": "Required", "no": "Not required", "check": "Check provider"}
COMMERCIAL = {"yes": "Allowed", "no": "Restricted / personal use", "check": "Check provider"}


def split_row(line):
    text = line.strip()
    if not (text.startswith("|") and text.endswith("|")):
        return None
    return [part.strip().replace("\\|", "|") for part in
            re.split(r"(?<!\\)\|", text[1:-1])]


def separator(parts):
    return bool(parts) and all(re.fullmatch(r":?-{3,}:?", p) for p in parts)


def scan_tables(text, filename):
    """Parse pipe tables, detecting split tables, orphan rows and invalid column counts."""
    lines = text.splitlines()
    tables, errors = [], []
    i, fenced = 0, None
    while i < len(lines):
        stripped = lines[i].strip()
        if stripped.startswith(chr(96) * 3) or stripped.startswith("~" * 3):
            character = stripped[0]
            if fenced is None:
                fenced = character
            elif fenced == character:
                fenced = None
            i += 1
            continue
        if fenced is not None:
            i += 1
            continue
        header = split_row(lines[i])
        if header is None:
            i += 1
            continue
        divider = split_row(lines[i + 1]) if i + 1 < len(lines) else None
        if divider is None or not separator(divider):
            errors.append(f"{filename}:{i+1}: orphan table row (table split or missing separator)")
            i += 1
            continue
        width = len(header)
        if len(divider) != width:
            errors.append(f"{filename}:{i+2}: separator width {len(divider)} != {width}")
        start = i + 1
        i += 2
        rows = []
        while i < len(lines):
            row = split_row(lines[i])
            if row is None:
                break
            if len(row) != width:
                errors.append(f"{filename}:{i+1}: row width {len(row)} != {width}")
            if separator(row):
                errors.append(f"{filename}:{i+1}: unexpected table separator")
            rows.append(row)
            i += 1
        tables.append({"header": header, "rows": rows, "line": start})
    if fenced is not None:
        errors.append(f"{filename}: unclosed code fence")
    return tables, errors


def broken_local_links(text, filename, root):
    errors = []
    for link in re.findall(r"(?<!!)\[[^\]]+\]\(([^)]+)\)", text):
        relative = link.split("#", 1)[0]
        if not relative or relative.startswith(("https://", "http://", "mailto:", "tel:", "//")):
            continue
        if urlsplit(relative).scheme:
            continue
        target = (root / filename).parent.joinpath(unquote(relative)).resolve()
        if not target.is_relative_to(root.resolve()) or not target.exists():
            errors.append(f"{filename}: broken relative link {link}")
    return errors


def validate_documents(root, data, readme, pages):
    """Check Markdown structure, local links, and exact JSON/README/docs consistency."""
    errors = []
    all_docs = {"README.md": readme}
    all_docs.update({f"docs/{category}.md": body for category, body in pages.items()})
    parsed = {}
    for filename, body in all_docs.items():
        tables, table_errors = scan_tables(body, filename)
        errors.extend(table_errors)
        errors.extend(broken_local_links(body, filename, root))
        parsed[filename] = tables
    if errors:
        return errors

    nav_header = ["Category", "Services", "Browse"]
    list_header = ["Service", "Type", "Free allowance", "Critical restriction"]
    nav = [t for t in parsed["README.md"] if t["header"] == nav_header]
    overview = [t for t in parsed["README.md"] if t["header"] == list_header]
    if len(nav) != 1 or len(overview) != 1 or len(parsed["README.md"]) != 2:
        errors.append("README.md: expected one navigation and one service table")
        return errors

    counts = Counter(item["category"] for item in data)
    if len(nav[0]["rows"]) != len(CATEGORIES):
        errors.append(f"README.md: navigation has {len(nav[0]['rows'])} rows, expected {len(CATEGORIES)}")
    for index, category in enumerate(CATEGORIES):
        if index >= len(nav[0]["rows"]):
            break
        row = nav[0]["rows"][index]
        if len(row) != 3 or row[1] != str(counts[category]) or row[2] != f"[Browse](docs/{category}.md)":
            errors.append(f"README.md: invalid navigation count or link for {category}")

    summary = overview[0]["rows"]
    if len(summary) != len(data):
        errors.append(f"README.md: {len(summary)} service rows, expected {len(data)}")
    for index, item in enumerate(data[:len(summary)]):
        expected = [
            f"[{item['name']}]({item['pricing_url']})",
            PLANS[item["plan"]], item["free_limit"], item["watch_out"],
        ]
        if summary[index] != expected:
            errors.append(f"README.md: service row {index + 1} differs from JSON ({item['id']})")
    count_badge = re.search(r"services-(\d+)-brightgreen", readme)
    if not count_badge or int(count_badge.group(1)) != len(data):
        errors.append("README.md: service-count badge is out of sync")
    if re.search(r"!\[License\]\([^)]*contributions-welcome", readme):
        errors.append("README.md: contributions badge incorrectly marked as License")

    cat_header = ["Service", "Plan", "Free allowance", "Important caveat", "Card", "Commercial use"]
    for category in CATEGORIES:
        filename = f"docs/{category}.md"
        if filename not in parsed:
            errors.append(f"{filename}: missing document")
            continue
        tables = parsed[filename]
        if len(tables) != 1 or tables[0]["header"] != cat_header:
            errors.append(f"{filename}: expected exactly one six-column service table")
            continue
        rows = tables[0]["rows"]
        subset = [item for item in data if item["category"] == category]
        if len(rows) != len(subset):
            errors.append(f"{filename}: {len(rows)} service rows, expected {len(subset)}")
        for index, item in enumerate(subset[:len(rows)]):
            expected = [
                f"[{item['name']}]({item['pricing_url']})",
                PLANS[item["plan"]], item["free_limit"], item["watch_out"],
                CARDS[item["credit_card"]], COMMERCIAL[item["commercial_use"]],
            ]
            if rows[index] != expected:
                errors.append(f"{filename}: service row {index + 1} differs from JSON ({item['id']})")
    return errors
