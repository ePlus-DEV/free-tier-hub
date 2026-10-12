# Contributing to Free Tier Hub

Thanks for helping keep this free-tier directory accurate. **Official provider pricing and documentation are the source of truth**—not referral pages, blog summaries, or AI-generated prices.

There are **two ways to contribute**. You do not need to know Git, Node.js, or JSON to suggest a service.

## Option A: Suggest a service without code (recommended for beginners)

1. [Open the service suggestion form](https://github.com/ePlus-DEV/free-tier-hub/issues/new?template=suggest-service.yml).
2. Enter the provider and exact free plan/product, an official pricing or documentation link, and whether you want to add, update, or remove an entry.
3. Include the free allowance **with units and reset period**, relevant restrictions, and the date you personally checked the source. If you cannot confirm a condition, say so rather than guessing.
4. Submit the Issue. Maintainers will verify the information and make the catalog/code changes if accepted.

**No fork, pull request, or local commands are needed.** The public suggestion form is reviewed by maintainers; it does **not** automatically create a PR. You may also [browse existing suggestions](https://github.com/ePlus-DEV/free-tier-hub/issues) to avoid duplicates.

## Option B: Contribute directly using a fork and pull request

Use this route if you want to edit the catalog yourself. Install **Node.js 20+** (npm is included). This contributor CLI has **zero external npm dependencies**: you do not need `npm install`.

1. [Fork this repository](https://github.com/ePlus-DEV/free-tier-hub/fork) and clone **your fork**. Create a feature branch from its latest `main`, such as `catalog/add-example-free`.
2. In **`data/services.json`**, add or update one entry, using the [fields](#catalog-fields) below and the provider's current official source. Check whether the entry already exists, even under a slightly different name. Use the actual verification date in `last_checked`.
3. **Only edit the catalog JSON by hand for a standard service addition.** Do not manually edit generated README/category tables or add a `SERVICE_LOGOS` mapping just to supply a fallback logo. The site uses the service initials automatically when no curated logo exists.
4. From the repository root, generate and validate the derived files:

   ```bash
   npm run catalog:sync
   npm run verify
   ```

   These commands work the same way in Windows PowerShell, macOS and Linux. If you cannot run Node.js, use the no-code Issue form instead.

5. Commit **`data/services.json` and any generated `README.md`/`docs/*.md` changes**. Push your branch to your own fork, then open a PR against [`ePlus-DEV/free-tier-hub:main`](https://github.com/ePlus-DEV/free-tier-hub/compare).
6. In the PR, explain what changed and include official source URLs and the date checked. Keep the PR focused on one provider/product or a small related set.

**Why generated Markdown is included:** README category counts and the category-page tables are derived from `data/services.json`. The current PR CI runs `npm run verify`, so a JSON-only PR without synchronized category tables and README counts **will fail** until those files are generated. Maintainers may help with synchronization if you cannot run Node.js; do not manually copy rows.

**Fork and review notes:**
- CI validates external PRs but **does not push changes back to contributor forks**. For first-time contributions, GitHub may require a maintainer to approve the workflow run; that is not automatically a rejection.
- `eplus-bot` can review/approve when checks succeed, but **external contributions are not automatically merged**. Maintainers still review official pricing and restrictions.
- When `main` changes before your PR is merged, your branch may need an update or conflict resolution. Ask a maintainer if you need help.
- After an external PR is merged, `eplus-bot` posts a thank-you comment. It does not require linking an Issue first.

### Editorial guidelines

- List distinct provider **products** when their billing models differ (for example, static hosting versus an expiring managed database).
- Never describe trials, one-time credits, or temporary resources as permanently free.
- Avoid affiliate/referral links or ranking providers by commercial incentives.
- Quote quotas precisely: **per day**, **per month**, **per account**, **per workspace**, or **one-time** matters.
- Explain any billing-account/card requirement, region or commercial-use restrictions, expiration/idle/sleep behavior, and chargeable overages.
- If the official source conflicts with an existing row, update its claims and review date; do not silently omit caveats.
- Keep descriptions concise, factual, and in English. Do not submit secrets or personal account credentials.

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

## Maintainer review checklist

- [ ] Official provider source confirms that the described tier currently exists.
- [ ] The free quotas, reset periods, regional eligibility, and pricing are accurate.
- [ ] Expiration, sleep, billing, payment-card, and commercial-use caveats are appropriately disclosed or marked unconfirmed.
- [ ] No duplicated provider/product entry is being added.
- [ ] `README.md` and category documentation match `data/services.json`.
- [ ] `npm run verify` passes (CI also runs the existing site tests).
