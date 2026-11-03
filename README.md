# Free Tier Hub 🚀

**Build More, Spend Less.**

Discover and compare free-tier services for hosting, databases, cloud infrastructure, AI, security, and developer tools. Explore published free allowances, important restrictions, and direct links to official provider documentation—all in one independent directory.

![Catalog](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Ffree-tier.eplus.dev%2Fcatalog.json&query=%24.length&label=services&color=brightgreen&cacheSeconds=300) [![Catalog checks](https://github.com/ePlus-DEV/free-tier-hub/actions/workflows/validate-catalog.yml/badge.svg?branch=main)](https://github.com/ePlus-DEV/free-tier-hub/actions/workflows/validate-catalog.yml) [![Contributions welcome](https://img.shields.io/badge/contributions-welcome-orange)](CONTRIBUTING.md)

**[Explore the directory](https://free-tier.eplus.dev/)** · [All categories](https://free-tier.eplus.dev/categories/) · **[Search & filter services](https://free-tier.eplus.dev/#explore)** · [How offers are classified](https://free-tier.eplus.dev/about/classifications/) · [Suggest a service](https://github.com/ePlus-DEV/free-tier-hub/issues/new?template=suggest-service.yml) · [Catalog JSON](https://free-tier.eplus.dev/catalog.json) · [Support the project](https://eplus.dev/page/donate)

## Why Free Tier Hub?

- **Compare before you sign up.** Review free allowances, limits, billing-card requirements, and commercial-use restrictions.
- **Find a suitable starting point.** Browse by category, search, or filter the [interactive directory](https://free-tier.eplus.dev/#explore).
- **Verify at the source.** Listings link to official pricing or documentation and include a `last_checked` date.
- **Contribute improvements.** Report changed terms or suggest a service without setting up a local development environment.

> **Free does not always mean zero cost.** Some plans use recurring credits, expire, require a payment method, or charge for overages. Free Tier Hub is an independent directory, not a service provider or an endorsement. Always verify current terms with the provider.

## Understanding the labels

Read the [classification guide on the website](https://free-tier.eplus.dev/about/classifications/) or the [versioned repository guide](docs/classifications.md) for the differences between ongoing free allowances, recurring credits, time-limited offers, expiring resources, deployment models, and **legacy-only (existing-account)** eligibility. These are separate dimensions: a self-hosted free application still needs infrastructure, and a grandfathered plan may not accept new free registrations.

`credit_card: check` or `commercial_use: check` means **not independently confirmed**, never a verified no-card or commercial-use permission. A `last_checked` date is an editorial review date, not a guarantee of live availability.

## Find the right free tier

- **Deploy a website or API:** [Static hosting](docs/static-hosting.md), [app hosting](docs/app-hosting.md), and [serverless](docs/serverless.md).
- **Store and query data:** [Databases](docs/databases.md), [object storage](docs/storage.md), and [hosted search](docs/search.md).
- **Build with AI:** [AI chatbots & assistants](docs/ai-assistants.md) and [AI & ML platforms](docs/ai-ml.md).
- **Run developer infrastructure:** [CI/CD pipelines](docs/ci-cd.md), [developer tools](docs/developer-tools.md), [authentication](docs/auth-security.md), [monitoring](docs/observability.md), and [queues & workflows](docs/queues-jobs.md).

For practical combinations, see [example free-tier stacks](docs/use-cases.md) and the [cost and data-safety checklist](docs/cost-safety.md).

## Browse all categories

The [all-categories page](https://free-tier.eplus.dev/categories/) provides a visual overview of every category with live counts and direct links to each category's service listings.

| Category | Services | Browse |
| --- | ---: | --- |
| Static & frontend hosting | ![Count](https://free-tier.eplus.dev/badges/categories/static-hosting.svg) | [Browse](docs/static-hosting.md) |
| Backend & app hosting | ![Count](https://free-tier.eplus.dev/badges/categories/app-hosting.svg) | [Browse](docs/app-hosting.md) |
| Serverless & edge | ![Count](https://free-tier.eplus.dev/badges/categories/serverless.svg) | [Browse](docs/serverless.md) |
| Cloud compute & VPS | ![Count](https://free-tier.eplus.dev/badges/categories/cloud-vps.svg) | [Browse](docs/cloud-vps.md) |
| Databases & caching | ![Count](https://free-tier.eplus.dev/badges/categories/databases.svg) | [Browse](docs/databases.md) |
| Object storage | ![Count](https://free-tier.eplus.dev/badges/categories/storage.svg) | [Browse](docs/storage.md) |
| APIs & developer tools | ![Count](https://free-tier.eplus.dev/badges/categories/developer-tools.svg) | [Browse](docs/developer-tools.md) |
| CI/CD & pipelines | ![Count](https://free-tier.eplus.dev/badges/categories/ci-cd.svg) | [Browse](docs/ci-cd.md) |
| Authentication & security | ![Count](https://free-tier.eplus.dev/badges/categories/auth-security.svg) | [Browse](docs/auth-security.md) |
| Monitoring & observability | ![Count](https://free-tier.eplus.dev/badges/categories/observability.svg) | [Browse](docs/observability.md) |
| Product analytics | ![Count](https://free-tier.eplus.dev/badges/categories/analytics.svg) | [Browse](docs/analytics.md) |
| DNS & CDN | ![Count](https://free-tier.eplus.dev/badges/categories/dns-cdn.svg) | [Browse](docs/dns-cdn.md) |
| AI & ML platforms | ![Count](https://free-tier.eplus.dev/badges/categories/ai-ml.svg) | [Browse](docs/ai-ml.md) |
| AI chatbots & assistants | ![Count](https://free-tier.eplus.dev/badges/categories/ai-assistants.svg) | [Browse](docs/ai-assistants.md) |
| Queues, workflows & scheduling | ![Count](https://free-tier.eplus.dev/badges/categories/queues-jobs.svg) | [Browse](docs/queues-jobs.md) |
| Hosted search | ![Count](https://free-tier.eplus.dev/badges/categories/search.svg) | [Browse](docs/search.md) |
| Feature flags & gradual rollout | ![Count](https://free-tier.eplus.dev/badges/categories/feature-flags.svg) | [Browse](docs/feature-flags.md) |
| Tunneling & networking | ![Count](https://free-tier.eplus.dev/badges/categories/tunneling-networking.svg) | [Browse](docs/tunneling-networking.md) |
| Webhooks & event delivery | ![Count](https://free-tier.eplus.dev/badges/categories/webhooks-events.svg) | [Browse](docs/webhooks-events.md) |

The total-services badge reads the deployed canonical catalog (`/catalog.json`), which is generated directly from `data/services/<category>/<id>.json`. Category counts are generated from the same catalog during successful site deployments. GitHub/Shields image caches and deployments may briefly show earlier totals.

## Contributing

There are two ways to help keep the directory current:

- **No-code suggestion:** [Open a service suggestion Issue](https://github.com/ePlus-DEV/free-tier-hub/issues/new?template=suggest-service.yml) with the provider's official source and the date you checked it.
- **Pull request:** Fork the repository, create or update **one JSON object** in [`data/services/<category>/<id>.json`](data/services/), and open a PR. **Do not edit generated `data/services.json` or category tables**. No local Node.js commands or manual badge edits are needed; GitHub Actions generates compatibility files and validates the PR. Existing contributors should update their original PR branches rather than open replacement PRs to keep GitHub author credit.

Please include accurate quotas, reset periods, restrictions, and official URLs. Maintainers review provider claims before merging. Read the [contribution guide](CONTRIBUTING.md) for the schema and full workflow.

## Support Free Tier Hub

Free Tier Hub is an independent, community-maintained project. If the directory helps you, you can support its continued development and upkeep:

- **[Sponsor ePlus.DEV on GitHub](https://github.com/sponsors/ePlus-DEV)** — support the maintainers through GitHub Sponsors.
- **[Donate via ePlus.DEV](https://eplus.dev/page/donate)** — see the official donation page for the available methods, including Vietnam bank transfer.
- **Support without donating:** [star the repository](https://github.com/ePlus-DEV/free-tier-hub), [report incorrect listings](https://github.com/ePlus-DEV/free-tier-hub/issues), or [contribute a service](CONTRIBUTING.md).

Donations are voluntary and never required to browse the catalog. Financial support does **not** influence service eligibility, classification, ranking or inclusion. Verify payment details on the official donation page before sending funds.

## Catalog data and accuracy

[`data/services/`](data/services/) is the source of truth: each service lives in a single `<category>/<id>.json` file. [`data/services.json`](data/services.json) is a **generated, backward-compatible aggregate**, not a file to edit by hand. The website provides a [machine-readable catalog](https://free-tier.eplus.dev/catalog.json) and dedicated category and service pages. The static build also generates lightweight `/search/index.json` and per-category card assets: Home initially renders 12 service cards and loads additional matching results on demand instead of embedding the entire catalog in HTML. Search indexes and card HTML are **never edited by contributors**; `/catalog.json` stays available as a full API. Each entry's `last_checked` date records a source review, **not** a guarantee of current prices or live availability.

Automated checks validate the data structure and generated documentation; they do not independently confirm every provider's terms. See the [source-audit guide](docs/source-audit.md) for review practices.

## Development and operations

The static site uses **Node.js 24** and GitHub Pages. GitHub Actions runs catalog synchronization, validation, and builds for pull requests. Following an approved merge, the production workflow generates category documentation and deploys the website.

- **Source and generated docs:** [Per-service JSON catalog](data/services/) · [Legacy-compatible aggregate](data/services.json) · [Category reference files](docs/)
- **CI and deployment:** [Catalog checks](.github/workflows/validate-catalog.yml) · [GitHub Pages workflow](.github/workflows/pages.yml) · [Actions status](https://github.com/ePlus-DEV/free-tier-hub/actions)
- **Maintainer documentation:** [Deployment & SEO](docs/deployment.md) · [Source audits](docs/source-audit.md)

Local checks are optional:

```bash
npm run catalog:sync
npm run verify
npm run build
```

The live website may lag a merge while deployment or caching completes. Check the [Actions history](https://github.com/ePlus-DEV/free-tier-hub/actions) and [live catalog](https://free-tier.eplus.dev/catalog.json) when investigating publication status.

---

Maintained by [ePlus-DEV](https://github.com/ePlus-DEV) and community contributors.
