# Contributing to Free Tier Hub

Thanks for helping keep this free-tier directory accurate. **Official provider pricing and documentation are the source of truth**—not referral pages, blog summaries, or AI-generated prices.

There are **two ways to contribute**. You do not need to know Git, Node.js, or JSON to suggest a service.

## Option A: Suggest a service without code (recommended for beginners)

1. [Open the service suggestion form](https://github.com/ePlus-DEV/free-tier-hub/issues/new?template=suggest-service.yml).
2. Enter the provider and exact free plan/product, an official pricing or documentation link, and whether you want to add, update, remove an entry, or correct its logo/category.
3. Include the free allowance **with units and reset period**, relevant restrictions, and the date you personally checked the source. If you cannot confirm a condition, say so rather than guessing.
4. Submit the Issue. Maintainers will verify the information and make the catalog/code changes if accepted.

**No fork, pull request, or local commands are needed.** The public suggestion form is reviewed by maintainers; it does **not** automatically create a PR. A separate maintainer-oriented `[catalog-candidate] <id>` Issue queue exists, but requires valid JSON, trusted authorship and successful workflow execution. Do not assume an Issue automatically reaches production. You may also [browse existing suggestions](https://github.com/ePlus-DEV/free-tier-hub/issues) to avoid duplicates.

## Option B: Contribute directly using a fork and pull request

Use this route if you want to edit the catalog yourself. **You do not need Node.js or a terminal**: GitHub Actions automatically generates category documentation and validates contributions when you open a PR. You may edit your fork directly in GitHub's web interface.

1. [Fork this repository](https://github.com/ePlus-DEV/free-tier-hub/fork). Create a feature branch from its latest `main`, such as `catalog/add-example-free`. You can edit in GitHub's website or clone your fork if preferred.
2. In **`data/services.json`**, add or update one entry, using the [fields](#catalog-fields) below and the provider's current official source. Check whether the entry already exists, even under a slightly different name. Use the actual verification date in `last_checked`.
3. **Only edit `data/services.json` by hand for a standard service addition.** README totals and category counts use automatic badges. GitHub Actions regenerates the category-page tables in `docs/*.md`; do not edit those files or badge URLs manually. Provider logos are resolved automatically from the official `pricing_url` domain; standard additions do not require a logo file or mapping.
4. **No local commands are required.** GitHub Actions runs the equivalent of `npm run catalog:sync` and `npm run verify` automatically on your PR. The generated category files are used to validate the PR in CI, but the workflow **does not push changes back to contributor forks**. If you prefer local checks, Node.js 24 LTS needs no `npm install`:

   ```bash
   npm run catalog:sync
   npm run verify
   ```

5. Commit **`data/services.json` only** for a standard service addition. Push your branch to your fork and open a PR against [`ePlus-DEV/free-tier-hub:main`](https://github.com/ePlus-DEV/free-tier-hub/compare). No README or generated documentation changes are required in the PR.
6. In the PR, explain what changed and include official source URLs and the date checked. Keep the PR focused on one provider/product or a small related set.

**What updates automatically:** The README total-service badge reads `main/data/services.json`; category badges reflect the latest successful Pages deploy. GitHub Actions generates matching `docs/*.md` tables in the runner for PR checks. **After the PR is reviewed and merged**, the Pages workflow commits any updated category tables to `main` using the built-in `GITHUB_TOKEN`. Forks are never written to. A JSON-only PR passes consistency checks as long as its catalog data is valid; a green check does **not** prove the provider's pricing claims. Badges may refresh later due to deploy or caching. If GitHub branch protection blocks an automated docs commit, maintainers must resolve that failed build without bypassing protection.

**Provider data verification:** `npm run verify` checks JSON and Markdown consistency; it does **not** check live pricing, quotas or official terms. See [the source audit guide](docs/source-audit.md) for the read-only URL health report and required manual verification before changing `last_checked`.

**Fork and review notes:**
- CI regenerates derived docs for external PRs but **does not push changes back to contributor forks**. After merging, a protected `main` workflow persists those docs in the original repository. For first-time contributions, GitHub may require a maintainer to approve the workflow run; that is not automatically a rejection.
- `eplus-bot` can review/approve when checks succeed, but **external contributions are not automatically merged**. Maintainers still review official pricing and restrictions.
- When `main` changes before your PR is merged, your branch may need an update or conflict resolution. Ask a maintainer if you need help.
- After an external PR is merged, `eplus-bot` posts a thank-you comment. It does not require linking an Issue first.

### Editorial guidelines

- List distinct provider **products** when their billing models differ (for example, static hosting versus an expiring managed database).
- Never describe trials, one-time credits, or temporary resources as permanently free.
- Avoid affiliate/referral links or ranking providers by commercial incentives.
- Quote quotas precisely: **per day**, **per month**, **per account**, **per workspace**, or **one-time** matters.
- Describe the **specific free product and its actual allowance or included functionality**, not placeholders such as "free offering available". For self-hosted software, describe what the software does and disclose that you must provide your own infrastructure.
- Make `watch_out` **product-specific** (for example, edition restrictions, billing exposure, dependencies, or storage/retention limits). Do not reuse generic license or self-hosting warnings across unrelated services.
- Explain any billing-account/card requirement, region or commercial-use restrictions, expiration/idle/sleep behavior, and chargeable overages.
- If the official source conflicts with an existing row, update its claims and review date; do not silently omit caveats.
- Keep descriptions concise, factual, and in English. Do not submit secrets or personal account credentials.

## Logos, categories, and website reports

- **Logos:** the site displays provider website favicons through Google's favicon cache. Keep `pricing_url` pointed at the official plan evidence, even if that page is hosted on a documentation or corporate domain. Do not change a pricing source just to change its logo.
- If a shared domain displays the wrong product logo, report the service ID/name and its official product homepage. Maintainers can add a `SERVICE_LOGO_DOMAINS` override in `scripts/site-data.mjs`. Do not add an unsupported `logo_url` field to the catalog. A generic icon can mean the provider has no indexed favicon; initials are a network-error fallback.
- **Categories:** use an existing category from `scripts/catalog.mjs` for normal additions. The site generates the full category dropdown automatically. New categories require coordinated updates to catalog validation, site labels/icons and generated documentation; propose them in an Issue first.
- **Share a filtered view:** select the relevant category and filters, then copy the current URL. Query parameters are `category`, `q`, `sort`, `no_card=1`, and `commercial=1`. The site restores these selections when a shared link is opened or reloaded. Include this URL when reporting a filtering problem.
- For website UI changes, also run `npm run build` after `npm run verify`. Check desktop/mobile, light/dark themes, category and billing filters, URL restoration after reload, and sticky toolbar behavior before considering visual review complete.

## Catalog fields

| Field | Meaning |
| --- | --- |
| `id` | Unique lowercase kebab-case identifier |
| `name` | Provider and specific plan/product |
| `category` | A supported category from `scripts/catalog.mjs` |
| `plan` | `ongoing`, `monthly-credit`, `limited-duration`, or `temporary-resource` |
| `free_limit` | Verified free allowance, including amount and time unit |
| `watch_out` | Material usage, billing, expiration, geographic, or other restrictions |
| `pricing_url` | Official provider pricing/docs page, HTTPS only |
| `credit_card` | `yes`, `no`, or `check` (unconfirmed) |
| `commercial_use` | `yes`, `no`, or `check` (unconfirmed) |
| `last_checked` | Date that you actually verified the provider source, `YYYY-MM-DD` |

For `plan`, use `ongoing` only when the free allowance has no announced fixed end date. A database that expires after 30 days is a `temporary-resource`; a 30-day account-level trial is `limited-duration`.

## After submitting a PR

- Watch the PR's **Checks** tab for catalog validation and Pages build/preview results. A missing, skipped, pending or approval-required check is not a pass.
- GitHub may require maintainer approval before workflows run on a first-time fork contribution. Do not bypass that approval or rewrite the contributor's branch history.
- A green build does not verify the provider's current commercial terms or quotas; maintainers must review official sources.
- The service appears publicly only after the PR is merged into `main` and the GitHub Pages deployment succeeds. Compare the live `/catalog.json` with the merged source if a new entry is missing.

## Maintainer review checklist

- [ ] Official provider source confirms that the described tier currently exists.
- [ ] The free quotas, reset periods, regional eligibility, and pricing are accurate.
- [ ] Expiration, sleep, billing, payment-card, and commercial-use caveats are appropriately disclosed or marked unconfirmed.
- [ ] No duplicated provider/product entry is being added.
- [ ] CI generated matching category tables from `data/services.json`, and README dynamic badge URLs remain intact (no manual count edits).
- [ ] `npm run verify` passes (CI also runs the existing site tests).

### Deployment model

Set optional `deployment_model` in each catalog entry to classify the **listed offer**:
`cloud` (vendor-hosted allowance), `self-hosted` (operate your own server),
`hybrid` (the listed offer includes cloud and self-hosted modes),
`local` (desktop, CLI, SDK or embedded library), or `unclassified`.
Use the linked official source and the entry's allowance/caveat as evidence. A separately
sold self-hosted edition does not make a Cloud Free entry hybrid. Missing metadata
remains unclassified; the UI never guesses from a service name or category.

The initial metadata migration uses the existing catalog descriptions and source links;
it does not reverify pricing or change `last_checked`.
