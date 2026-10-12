# Free Tier Hub 🚀

**Build More, Spend Less.** A community-maintained directory of free hosting, cloud, databases, storage, serverless, AI and developer services.

![Catalog](https://img.shields.io/badge/services-120-brightgreen) ![Data](https://img.shields.io/badge/catalog-JSON-blue) ![Contributions welcome](https://img.shields.io/badge/contributions-welcome-orange)

**Explore:** [free-tier.eplus.dev](https://free-tier.eplus.dev/) · [Search the catalog](https://free-tier.eplus.dev/#explore) · [Machine-readable JSON](https://free-tier.eplus.dev/catalog.json)

> **Important:** A free plan is not necessarily free for every region, workload, or commercial use. Some providers require a payment card, expire resources, or charge overages. Each service has its own verification date (`last_checked`) in the [source catalog](data/services.json). Check official provider terms before relying on a plan.

## Quick navigation

| Category | Services | Browse |
| --- | ---: | --- |
| Static & frontend hosting | 9 | [Browse](docs/static-hosting.md) |
| Backend & app hosting | 11 | [Browse](docs/app-hosting.md) |
| Serverless & edge | 3 | [Browse](docs/serverless.md) |
| Cloud compute & VPS | 3 | [Browse](docs/cloud-vps.md) |
| Databases & caching | 20 | [Browse](docs/databases.md) |
| Object storage | 4 | [Browse](docs/storage.md) |
| APIs & developer tools | 20 | [Browse](docs/developer-tools.md) |
| Authentication & security | 5 | [Browse](docs/auth-security.md) |
| Monitoring & observability | 13 | [Browse](docs/observability.md) |
| Product analytics | 2 | [Browse](docs/analytics.md) |
| DNS & CDN | 1 | [Browse](docs/dns-cdn.md) |
| AI & ML platforms | 4 | [Browse](docs/ai-ml.md) |
| Queues, workflows & scheduling | 9 | [Browse](docs/queues-jobs.md) |
| Hosted search | 3 | [Browse](docs/search.md) |
| Feature flags & gradual rollout | 7 | [Browse](docs/feature-flags.md) |
| Tunneling & networking | 2 | [Browse](docs/tunneling-networking.md) |
| Webhooks & event delivery | 4 | [Browse](docs/webhooks-events.md) |

## Choose a free-tier service

- **Websites and APIs:** Compare [static hosting](docs/static-hosting.md), [app hosting](docs/app-hosting.md), and [serverless](docs/serverless.md).
- **Data and files:** Browse [databases](docs/databases.md), [storage](docs/storage.md), and [hosted search](docs/search.md). Watch for paused projects, expiration and egress costs.
- **Developer infrastructure:** Browse [developer tools](docs/developer-tools.md), [queues and scheduling](docs/queues-jobs.md), [authentication](docs/auth-security.md), and [observability](docs/observability.md).
- **Example stacks and risks:** Read [free-tier use cases](docs/use-cases.md) and [cost and data-safety tips](docs/cost-safety.md).

The website provides **search, categories and filters** for the full directory. Detailed service limits and caveats live in the category pages linked above and in `data/services.json`, not in a duplicate README table.

## Contributing

Found a new plan or incorrect limits? [Suggest a service without writing code](https://github.com/ePlus-DEV/free-tier-hub/issues/new?template=suggest-service.yml), or [follow the contribution guide](CONTRIBUTING.md) to open a pull request from a fork.

Use **official pricing/docs URLs** and the date verified. Avoid referral links, unverified claims and misleading “always free” labels. Maintainers review external contributions before merging.

## For maintainers and developers

- **Source of truth:** [`data/services.json`](data/services.json) — structured pricing evidence, plan types, restrictions and review dates.
- **Category references:** [`docs/`](docs/) — generated tables; do not manually edit them.
- **Deployment, domain, SEO and local verification:** [`docs/deployment.md`](docs/deployment.md).
- **Contributor tooling:** Node.js 24 LTS with no npm dependencies. Run `npm run catalog:sync` to update generated category tables, then `npm run verify` to validate changes.
- **CI:** [Catalog checks](.github/workflows/validate-catalog.yml) and [GitHub Pages deployment](.github/workflows/pages.yml).

Free allowances, recurring credits, trials and expiring resources are labeled separately. Unknown card or commercial-use policies are marked **Check provider**, not guessed.

Maintained by [ePlus-DEV](https://github.com/ePlus-DEV). Community contributions welcome.
