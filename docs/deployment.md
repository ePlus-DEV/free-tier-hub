# Deployment, custom domain and discovery

[← Back to README](../README.md) · [Contribution guide](../CONTRIBUTING.md)

This document describes the **GitHub Pages setup** and checks for deploying or moving the public directory.

## Website, custom domain and discovery

**Canonical website:** [free-tier.eplus.dev](https://free-tier.eplus.dev/) · [Browse the catalog](https://free-tier.eplus.dev/catalog.json) · [Sitemap](https://free-tier.eplus.dev/sitemap.xml) · [llms.txt](https://free-tier.eplus.dev/llms.txt) · [agents.md](https://free-tier.eplus.dev/agents.md)

The [GitHub Pages workflow](../.github/workflows/pages.yml) pre-renders a crawlable HTML page for each service and category from canonical `data/services/<category>/<id>.json` files via `scripts/catalog-source.mjs`. `data/services.json` is a generated compatibility aggregate; the public `/catalog.json` endpoint remains unchanged. The site has responsive search, canonical URLs, meta descriptions, Open Graph metadata, breadcrumbs and schema.org JSON-LD. It publishes these discovery resources directly at the **custom-domain root**: `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/agents.md` and `/catalog.json`.

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

## Search index and page delivery

The **canonical data source** is still the per-service JSON tree; website visitors do **not** request raw GitHub files or the full `data/services.json` aggregate for ordinary search.

During `npm run build`, Node.js produces:

- `dist/search/index.json` — lightweight ID, category, plan, billing, search text, and sort metadata for the complete catalog, keyed by a content-based revision
- `dist/search/cards/<category>.json` — pre-rendered HTML card fragments fetched only for categories needed by visible search results
- `dist/catalog.json` — complete, backwards-compatible public API for people and external integrations
- `dist/service/<id>/index.html` and category HTML — crawlable, static service details and no-JavaScript browsing

Home includes only the first **12 server-rendered service cards**. Search/filters fetch the small index on first use, then render up to 12 cards per batch; "Show more" loads additional cards on demand. Category pages retain crawlable static HTML. Search files are generated build outputs — **never commit or edit them manually**.

The PR preview preparation step rewrites page links, Compare data URLs, client-side service links, and **HTML inside `search/cards/<category>.json`** to preview-relative paths. This keeps navigation, filters, lazy-loaded cards and Compare inside `/pr-preview/pr-<number>/` rather than jumping to production. Legacy service alias redirects are localized too. The original production canonical URLs stay unchanged, and previews remain `noindex,nofollow`. The preparation step is idempotent because the PR build, the privileged preview publisher, and the production preview collector run it. The collector also fixes links in already-published snapshots of open PRs when the next Pages bundle is deployed. Verify that `/search/index.json` and at least one `/search/cards/<category>.json` exist in build artifacts before releasing. Site search and API assets deploy together from the same revision.

When a PR closes or merges, the next Pages publication removes its `/pr-preview/pr-<number>/` snapshot. An expired preview URL is handled by the root `404.html`: it shows a **5-second countdown** and a direct production link to the same nested page, preserving the query string and hash. For example, `/pr-preview/pr-1955/category/webhooks-events/?sort=newest` leads to `/category/webhooks-events/?sort=newest`. Ordinary 404 URLs are **not** redirected, and the fallback remains `noindex,follow`.

## Safe rollback

If a release fails after the per-service migration, follow the
[Catalog rollback and data-preservation runbook](catalog-rollback.md).
**Do not simply revert the migration commit or replace the latest catalog
with the original 930-entry snapshot**: new service PRs may have been
merged since then. Preserve shard contents, original service IDs,
publication dates, contributor history, and the `/catalog.json` contract.

## SEO and answer-engine discovery after the catalog migration

**Canonical URLs are independent of source-file paths.** Each canonical service shard
`data/services/<category>/<id>.json` builds an HTML detail page at `/service/<id>/` and
a matching entry in `/sitemap.xml`. Changing the internal storage layout does **not**
change `/service/<id>/`, category URLs, `/catalog.json` or their canonical links.
Do not change service IDs without planning redirects and checking external links.

- **Home and lazy search:** the Home HTML contains the first 12 cards and matching
  `ItemList` JSON-LD entries. Bot-discoverable links for *all* ongoing services
  are in their pre-rendered `/category/<category>/` pages; time-limited/expiring
  services are linked from `/offers/`. Crawlers do not click Show more buttons.
- **Metadata:** each generated detail page has an H1, self-canonical URL, indexable
  robots meta, WebPage JSON-LD, BreadcrumbList, official source, and restriction
  text. Limited-offer breadcrumbs point to the actual `/offers/` parent.
- **Sitemap/robots:** `/sitemap.xml` enumerates every canonical HTML page.
  `/robots.txt` advertises the sitemap. PR previews are isolated and
  non-indexable. The sitemap uses the catalog's verified `last_checked` as
  a conservative date, not the build timestamp; never mass refresh those
  dates merely to provoke recrawls.
- **AEO / AI discovery:** `/llms.txt` and `/agents.md` are generated
  discovery guides pointing to the real category pages, catalog API and
  sitemap. These are *optional conventions*, not substitutes for HTML
  links, robots policies, or a guarantee of ranking/citation in AI answers.
  AI crawlers should be able to access useful service details without
  running client-side JavaScript.
- **Full data and search:** `/catalog.json` remains a public API;
  `/search/index.json` and `/search/cards/<category>.json` are generated
  UI assets. Neither should be submitted to search engines as canonical pages.

**Regression gates:** `npm run verify` runs `scripts/seo-aeo.test.mjs` and
checks all service IDs against generated URLs, crawlable category/offer links,
canonical tags, indexability, HTML headings, sitemap, JSON-LD and AEO guides.
The existing **Audit catalog official sources** GitHub Action keeps its
**Monday 03:00 UTC** schedule and also executes this read-only local-build
check with full Git history. It does not rewrite data, request reindexing,
or change the scheduled ChatGPT discovery/audit tasks.

**Release checklist:** confirm exact-HEAD CI and GitHub Pages deployment,
then independently inspect a live service and category URL, `robots.txt`,
`sitemap.xml`, `llms.txt`, `agents.md`, `catalog.json`, and the search
index. Use Google Search Console URL Inspection / sitemap reports where
available; repository CI cannot prove that a search engine has indexed
or cited a page. A successful static build is not proof the live host
has finished deploying.

## Release verification and troubleshooting

1. Confirm the catalog PR has been reviewed and that its **exact head commit** has successful required checks; missing, pending, skipped, cancelled or action-required checks are not successful results.
2. After a maintainer merges the PR, find the [Build and deploy GitHub Pages workflow](https://github.com/ePlus-DEV/free-tier-hub/actions/workflows/pages.yml) for the resulting `main` commit. Confirm both the build and deploy jobs succeeded. PR previews are not deployments.
3. Compare the canonical `data/services/` contents (or their generated `data/services.json` aggregate after the Pages docs-sync commit) with [the live catalog JSON](https://free-tier.eplus.dev/catalog.json). A README count or a merged PR alone is not proof that production has updated.
4. If the website lags, inspect the Pages deployment run, the configured Pages environment and custom-domain DNS/HTTPS before attributing the difference to caching.
5. Public service suggestion Issues and external contributor PRs are reviewed manually. The separate trusted `[catalog-candidate]` workflow can create Draft PRs with `EPLUS_BOT_TOKEN`. An event-driven gate may auto-merge eligible ongoing local/self-hosted open-source candidates only after the exact-head Catalog Validation and Pages Build checks both succeed, with a single canonical JSON shard matching a trusted Issue and deployment evidence. Inspect the queue run, the gate run, the PR merge and production Pages deployment rather than assuming automatic delivery.

The build and verification scripts validate catalog **structure and consistency**, not live provider prices, quotas, credit-card requirements or commercial-use permissions. Those claims require independent verification against current official documentation.

## Catalog data and maintenance

- Canonical source: [`data/services/`](../data/services/), one JSON object per `<category>/<id>.json`; generated compatibility artifact: [`data/services.json`](../data/services.json).
- [Node.js catalog compiler](../scripts/catalog-source.mjs) reads canonical shards and validates their identity; [the documentation sync](../scripts/catalog.mjs) regenerates the aggregate and category tables (`npm run catalog:sync`). README service totals remain backed by the generated aggregate.
- `npm run verify` checks service fields and generated documents before submission (run `npm run catalog:sync` first if your shard edits changed generated outputs). The [Node Markdown validator](../scripts/check-markdown.mjs) verifies table structures, local links, service rows, README counts and catalog consistency alongside the [Node site builder](../scripts/build-site.mjs).
- [Catalog validation workflow](../.github/workflows/validate-catalog.yml) runs tests and consistency checks.
- [Submit an update](https://github.com/ePlus-DEV/free-tier-hub/issues/new/choose) using official evidence and dated verification.

The catalog records individual `last_checked` dates, not a claim that every service was reviewed on a single global date.
