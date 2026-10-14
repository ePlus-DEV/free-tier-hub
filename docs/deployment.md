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

For GitHub Actions deployments, GitHub stores the custom domain in Pages settings; adding a repository `CNAME` file does **not** configure it. The domain and certificate must be correctly configured in Pages and DNS; building canonical links alone cannot change the live hostname. The Pages workflow's `SITE_URL` setting is pinned to this domain, so any old repository-level `SITE_URL` Actions variable is ignored. If you intentionally move the site again, update both `DEFAULT_URL` in `scripts/build-site.mjs` and the workflow, then rerun the tests and rebuild.

Contributor catalog verification requires only Node.js 24 LTS (no npm dependencies):

```bash
npm run catalog:sync
npm run verify
```

Maintainer website build and contributor verification use **Node.js 24 LTS only** (no external npm packages):

```bash
npm run verify
npm run build
npm run markdown:check
```

To build for a different canonical domain or base path, run:

```bash
node scripts/build-site.mjs --site-url https://example.com/free-tier/ --output dist
```

## Release verification and troubleshooting

1. Confirm the catalog PR has been reviewed and that its **exact head commit** has successful required checks; missing, pending, skipped, cancelled or action-required checks are not successful results.
2. After a maintainer merges the PR, find the [Build and deploy GitHub Pages workflow](https://github.com/ePlus-DEV/free-tier-hub/actions/workflows/pages.yml) for the resulting `main` commit. Confirm both the build and deploy jobs succeeded. PR previews are not deployments.
3. Compare `data/services.json` on the deployed commit with [the live catalog JSON](https://free-tier.eplus.dev/catalog.json). A README count or a merged PR alone is not proof that production has updated.
4. If the website lags, inspect the Pages deployment run, the configured Pages environment and custom-domain DNS/HTTPS before attributing the difference to caching.
5. Public service suggestion Issues are reviewed manually. The separate structured `[catalog-candidate]` workflow can create catalog PRs, but depends on trusted authorship, the configured `EPLUS_BOT_TOKEN`, valid JSON and successful workflow execution. Inspect the specific queue run and PR checks rather than assuming automatic delivery.

The build and verification scripts validate catalog **structure and consistency**, not live provider prices, quotas, credit-card requirements or commercial-use permissions. Those claims require independent verification against current official documentation.

## Catalog data and maintenance

- Source: [`data/services.json`](../data/services.json).
- [Node.js contributor CLI](../scripts/catalog.mjs) updates README category counts and detailed category tables (`npm run catalog:sync`).
- `npm run verify` checks service fields and generated documents before submission. The [Node Markdown validator](../scripts/check-markdown.mjs) verifies table structures, local links, service rows, README counts and catalog consistency alongside the [Node site builder](../scripts/build-site.mjs).
- [Catalog validation workflow](../.github/workflows/validate-catalog.yml) runs tests and consistency checks.
- [Submit an update](https://github.com/ePlus-DEV/free-tier-hub/issues/new/choose) using official evidence and dated verification.

The catalog records individual `last_checked` dates, not a claim that every service was reviewed on a single global date.
