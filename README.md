# Free Tier Hub 🚀

**Build More, Spend Less.** A community-maintained directory of free hosting, cloud, databases, storage, serverless, AI and developer services.

![Catalog](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FePlus-DEV%2Ffree-tier-hub%2Fmain%2Fdata%2Fservices.json&query=%24.length&label=services&color=brightgreen) ![Data](https://img.shields.io/badge/catalog-JSON-blue) ![Contributions welcome](https://img.shields.io/badge/contributions-welcome-orange)

**Explore:** [free-tier.eplus.dev](https://free-tier.eplus.dev/) · [Search the catalog](https://free-tier.eplus.dev/#explore) · [Machine-readable JSON](https://free-tier.eplus.dev/catalog.json)

> **Important:** A free plan is not necessarily free for every region, workload, or commercial use. Some providers require a payment card, expire resources, or charge overages. Each service has its own verification date (`last_checked`) in the [source catalog](data/services.json). Check official provider terms before relying on a plan.

## Quick navigation

| Category | Services | Browse |
| --- | ---: | --- |
| Static & frontend hosting | ![Count](https://free-tier.eplus.dev/badges/categories/static-hosting.svg) | [Browse](docs/static-hosting.md) |
| Backend & app hosting | ![Count](https://free-tier.eplus.dev/badges/categories/app-hosting.svg) | [Browse](docs/app-hosting.md) |
| Serverless & edge | ![Count](https://free-tier.eplus.dev/badges/categories/serverless.svg) | [Browse](docs/serverless.md) |
| Cloud compute & VPS | ![Count](https://free-tier.eplus.dev/badges/categories/cloud-vps.svg) | [Browse](docs/cloud-vps.md) |
| Databases & caching | ![Count](https://free-tier.eplus.dev/badges/categories/databases.svg) | [Browse](docs/databases.md) |
| Object storage | ![Count](https://free-tier.eplus.dev/badges/categories/storage.svg) | [Browse](docs/storage.md) |
| APIs & developer tools | ![Count](https://free-tier.eplus.dev/badges/categories/developer-tools.svg) | [Browse](docs/developer-tools.md) |
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

## Choose a free-tier service

- **Websites and APIs:** Compare [static hosting](docs/static-hosting.md), [app hosting](docs/app-hosting.md), and [serverless](docs/serverless.md).
- **Data and files:** Browse [databases](docs/databases.md), [storage](docs/storage.md), and [hosted search](docs/search.md). Watch for paused projects, expiration and egress costs.
- **AI tools:** Compare [AI chatbots and assistants](docs/ai-assistants.md) with [AI developer APIs and platforms](docs/ai-ml.md).
- **Developer infrastructure:** Browse [developer tools](docs/developer-tools.md), [queues and scheduling](docs/queues-jobs.md), [authentication](docs/auth-security.md), and [observability](docs/observability.md).
- **Example stacks and risks:** Read [free-tier use cases](docs/use-cases.md) and [cost and data-safety tips](docs/cost-safety.md).

Free Tier Hub is an **independent discovery directory**, not a provider of the listed services or a marketplace that provisions accounts. Visitors compare published free allowances and follow links to providers; provider terms remain authoritative.

The website provides **search, categories and filters** for the full directory. Detailed service limits and caveats live in the category pages linked above and in `data/services.json`, not in a duplicate README table.

## Contributing

Found a new plan or incorrect limits? [Suggest a service without writing code](https://github.com/ePlus-DEV/free-tier-hub/issues/new?template=suggest-service.yml), or [follow the contribution guide](CONTRIBUTING.md) to open a pull request from a fork.

Use **official pricing/docs URLs** and the date verified. Avoid referral links, unverified claims and misleading “always free” labels. Maintainers review external contributions before merging.

## How updates reach the live site

- **Public suggestions** submitted through the no-code Issue form are reviewed by maintainers; they do **not** automatically become PRs.
- **Structured maintainer candidates** using the separate `[catalog-candidate] <id>` JSON Issue format may be processed by the candidate queue workflow, subject to permissions, valid data, secrets and successful Actions runs. An Issue alone does not publish a service.
- **Contributions** must pass catalog consistency checks and review. Only merged changes to `main` can be built and deployed to the public GitHub Pages site; a PR preview is not production.
- **Operational status** must be checked in [Actions](https://github.com/ePlus-DEV/free-tier-hub/actions) and against the [live machine-readable catalog](https://free-tier.eplus.dev/catalog.json). The category count badges reflect the last successfully deployed website and may briefly lag repository source data during deployment or caching.

## For maintainers and developers

- **Source of truth:** [`data/services.json`](data/services.json) — structured pricing evidence, plan types, restrictions and review dates.
- **Category references:** [`docs/`](docs/) — generated tables; do not manually edit them.
- **Deployment, domain, SEO and local verification:** [`docs/deployment.md`](docs/deployment.md).
- **Contributor tooling:** Node.js 24 LTS with no npm dependencies. Run `npm run catalog:sync` to update generated category tables, then `npm run verify` to validate changes.
- **CI:** [Catalog checks](.github/workflows/validate-catalog.yml) and [GitHub Pages deployment](.github/workflows/pages.yml).
- **Source review:** [Official-source audit guide](docs/source-audit.md) — weekly read-only URL, age and verification-backlog report (`npm run audit:sources`).

Free allowances, recurring credits, trials and expiring resources are labeled separately. Unknown card or commercial-use policies are marked **Check provider**, not guessed.

Maintained by [ePlus-DEV](https://github.com/ePlus-DEV). Community contributions welcome.
