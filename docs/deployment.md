# Deployment, custom domain and discovery

[← Back to README](../README.md) · [Contribution guide](../CONTRIBUTING.md)

This document describes the **GitHub Pages setup** and checks for deploying or moving the public directory.

## Website, custom domain and discovery

**Canonical website:** [free-tier.eplus.dev](https://free-tier.eplus.dev/) · [Browse the catalog](https://free-tier.eplus.dev/catalog.json) · [Sitemap](https://free-tier.eplus.dev/sitemap.xml) · [llms.txt](https://free-tier.eplus.dev/llms.txt) · [agents.md](https://free-tier.eplus.dev/agents.md)

The [GitHub Pages workflow](../.github/workflows/pages.yml) pre-renders a crawlable HTML page for each service and category from `data/services.json`. The site has responsive search, canonical URLs, meta descriptions, Open Graph metadata, breadcrumbs and schema.org JSON-LD. It publishes these discovery resources directly at the **custom-domain root**: `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/agents.md` and `/catalog.json`.

### GitHub Pages custom-domain setup

This project uses **GitHub Actions** to deploy, with `https://free-tier.eplus.dev/` pinned as the public site URL in both the builder and Pages workflow. To route traffic correctly, configure the same host in [Settings → Pages](https://github.com/ePlus-DEV/free-tier-hub/settings/pages):

1. **Build and deployment → Source:** GitHub Actions.
2. **Custom domain:** `free-tier.eplus.dev` (no scheme or trailing slash); save the setting.
3. At the DNS provider, create a CNAME record for the `free-tier` subdomain pointing to `eplus-dev.github.io` (**DNS hostname only**, without `https://` or `/free-tier-hub/`). Check DNS propagation and enable **Enforce HTTPS** when available.

For GitHub Actions deployments, GitHub stores the custom domain in Pages settings; adding a repository `CNAME` file does **not** configure it. The domain and certificate must be correctly configured in Pages and DNS; building canonical links alone cannot change the live hostname. The Pages workflow's `SITE_URL` setting is pinned to this domain, so any old repository-level `SITE_URL` Actions variable is ignored. If you intentionally move the site again, update both `DEFAULT_URL` in `scripts/build_site.py` and the workflow, then rerun the tests and rebuild.

Local verification (Python 3.12, no third-party runtime dependencies):

```bash
python3 -m unittest discover -s tests -v
python3 scripts/validate_catalog.py
python3 scripts/build_site.py --site-url https://free-tier.eplus.dev/ --output dist
```

## Catalog data and maintenance

- Source: [`data/services.json`](../data/services.json).
- [Catalog generator](../scripts/sync_catalog.py) updates README category counts and detailed category tables.
- [Catalog validator](../scripts/validate_catalog.py) checks fields, references, and generated category pages.
- [Catalog validation workflow](../.github/workflows/validate-catalog.yml) runs tests and consistency checks.
- [Submit an update](https://github.com/ePlus-DEV/free-tier-hub/issues/new/choose) using official evidence and dated verification.

The catalog records individual `last_checked` dates, not a claim that every service was reviewed on a single global date.
