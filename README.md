# Free Tier Hub 🚀

**Build More, Spend Less.** Discover and compare free developer tools and services in one independent, community-maintained directory. Understand free allowances, usage limits, deployment options, and potential costs before signing up.

![Catalog](https://free-tier.eplus.dev/badges/services.svg) ![Free tiers](https://free-tier.eplus.dev/badges/free-tiers.svg) ![Limited offers](https://free-tier.eplus.dev/badges/limited-offers.svg) ![New (48h)](https://free-tier.eplus.dev/badges/new-48h.svg) [![Catalog checks](https://github.com/ePlus-DEV/free-tier-hub/actions/workflows/validate-catalog.yml/badge.svg?branch=main)](https://github.com/ePlus-DEV/free-tier-hub/actions/workflows/validate-catalog.yml) [![Contributions welcome](https://img.shields.io/badge/contributions-welcome-orange)](CONTRIBUTING.md)

**[Explore the directory](https://free-tier.eplus.dev/)** · **[Search & filter](https://free-tier.eplus.dev/#explore)** · [Browse categories](https://free-tier.eplus.dev/categories/) · [Suggest a service](https://github.com/ePlus-DEV/free-tier-hub/issues/new?template=suggest-service.yml)

## Why Free Tier Hub?

- **Discover:** Find services across hosting, databases, AI, developer tools, and more.
- **Compare:** Review free limits, payment-card requirements, commercial-use terms, and hosting models.
- **Check the details:** Follow official provider links and see when information was last reviewed.
- **Contribute:** Suggest services and report changes without installing development tools.

> **Free software isn't always free infrastructure.** Trials, expiring credits, paid overages, and self-hosting costs are clearly distinguished. Listings are informational; always verify current provider terms. See [offer classifications](docs/classifications.md) and the [cost-safety checklist](docs/cost-safety.md).

## Browse all categories

Explore [all categories online](https://free-tier.eplus.dev/categories/) or use the live per-category counts below. Category badges show the **total eligible free tiers** plus a **+N** suffix when N new services were first published in that category during the last **48 hours (UTC)** (for example, `46 +3`). **+0 is hidden**. Only ongoing allowances and recurring credits count in the category badges; the overall **New (48h)** badge above includes time-limited offers too, so the two totals can differ. The SVG numbers are refreshed on new deployments and scheduled builds, with possible image-cache delay.

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
| Email & notifications | ![Count](https://free-tier.eplus.dev/badges/categories/email-notifications.svg) | [Browse](docs/email-notifications.md) |
| Testing & QA | ![Count](https://free-tier.eplus.dev/badges/categories/testing-qa.svg) | [Browse](docs/testing-qa.md) |
| Forms & surveys | ![Count](https://free-tier.eplus.dev/badges/categories/forms-surveys.svg) | [Browse](docs/forms-surveys.md) |

The badges distinguish **all catalog services** (including limited/expiring offers), **free tiers** (ongoing allowances and recurring credits), **limited offers** (time-limited or expiring resources), and **New (48h)** (services first published in the last 48 hours, across all offer types). **New (48h) is not an updated/re-verified count**: editing a listing or changing its `last_checked` date does not make it new again. The rolling window uses UTC publication timestamps; the README SVG is a snapshot from the most recent Pages build, refreshed by deployments and a scheduled build every six hours (GitHub image caching may delay the visible change). The Home **All services** filter shows the complete catalog; category directory pages focus on ongoing/recurring free tiers. Badges are generated by this website without a third-party badge API, and image caching may briefly delay updates after deployment. [View live counts](https://free-tier.eplus.dev/catalog-stats.json) · [Browse the full catalog JSON](https://free-tier.eplus.dev/catalog.json).

## Contributing

**[Suggest a service without code](https://github.com/ePlus-DEV/free-tier-hub/issues/new?template=suggest-service.yml)** or [submit a pull request](CONTRIBUTING.md). Include the provider's official source, specific allowance, restrictions, and review date.

Catalog entries live as individual `data/services/<category>/<id>.json` files under [`data/services/`](data/services/). The compatibility file [`data/services.json`](data/services.json), category documentation, and website assets are generated — **do not edit them directly**. External contributions are reviewed by maintainers.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for instructions.

## Documentation

- **Special programs:** [Education benefits for students & educators](https://free-tier.eplus.dev/education/) — searchable eligibility-gated offers, each stored in \`data/education/<id>.json\`, separate from free-tier counts.
- **Using the directory:** [Offer classifications](docs/classifications.md) · [Example free-tier stacks](docs/use-cases.md) · [Cost & data safety](docs/cost-safety.md)
- **For contributors:** [Contribution guide](CONTRIBUTING.md) · [Catalog data](data/services/) · [Official-source audits](docs/source-audit.md)
- **For maintainers and AI agents:** [AI agent instructions](AGENTS.md) · [Catalog delivery and guarded auto-merge](docs/catalog-backlog-consumer.md) · [Deployment, SEO & troubleshooting](docs/deployment.md) · [GitHub Actions](https://github.com/ePlus-DEV/free-tier-hub/actions)

The site uses Node.js 24 and GitHub Pages. For local verification:

```bash
npm run catalog:sync
npm run verify
npm run build
```

## License

- **Software and tooling:** [MIT License](LICENSE).
- **Original catalog editorial/database rights:** [CC BY 4.0](LICENSE-DATA.md), only where the project has authority to license them.
- Provider names, logos, trademarks and third-party content retain their respective owners' rights. Public pricing facts are not claimed as exclusive property.

## Support the project

Support [ePlus.DEV on GitHub Sponsors](https://github.com/sponsors/ePlus-DEV), [donate](https://eplus.dev/page/donate), or help by [reporting outdated listings](https://github.com/ePlus-DEV/free-tier-hub/issues). Donations are optional and never affect catalog eligibility, rankings, or inclusion.

---

Maintained by [ePlus-DEV](https://github.com/ePlus-DEV) and community contributors.
