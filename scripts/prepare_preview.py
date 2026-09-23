#!/usr/bin/env python3
"""Make generated PR pages browsable offline without changing production SEO."""
import argparse
from pathlib import Path
import os
import re


def prepare(site, base_url):
    root = Path(site).resolve()
    pages = list(root.rglob("*.html"))
    if not pages or not (root / "assets" / "site.css").is_file():
        raise ValueError("Missing generated site or stylesheet")
    for page in pages:
        content = page.read_text(encoding="utf-8")
        def localize(match):
            prefix, path, suffix = match.groups()
            target = path.split("#", 1)[0].split("?", 1)[0]
            fragment = path[len(target):]
            if not target or target.endswith("/"):
                target += "index.html"
            relative = os.path.relpath(root / target, page.parent).replace(os.sep, "/")
            return prefix + relative + fragment + suffix
        canonical = re.search(r'<link rel="canonical" href="([^"]+)">', content)
        content = re.sub(r'((?:href|src)=")' + re.escape(base_url) + r'([^"]*)(")', localize, content)
        if canonical:
            content = re.sub(r'<link rel="canonical" href="[^"]+">', '<link rel="canonical" href="' + canonical.group(1) + '">', content, count=1)
        content = re.sub(r'<script async src="https://www.googletagmanager.com/gtag/js\?id=G-9YPGG0XEZV"></script>', '', content)
        content = re.sub(r'<script>window.dataLayer=window.dataLayer\|\|\[\];.*?gtag\(' + "'config','G-9YPGG0XEZV'" + r'\);</script>', '', content)
        page.write_text(content, encoding="utf-8")
    return len(pages)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site", required=True)
    parser.add_argument("--base-url", required=True)
    args = parser.parse_args()
    print("Prepared", prepare(args.site, args.base_url), "offline preview pages")
