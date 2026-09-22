# Free Tier Hub 🚀
**Build More, Spend Less.** A community-maintained directory of free hosting, cloud, databases, storage, serverless and developer services.

![Catalog](https://img.shields.io/badge/services-29-brightgreen) ![Data](https://img.shields.io/badge/catalog-JSON-blue) ![License](https://img.shields.io/badge/contributions-welcome-orange)

> **Last editorial review: 2026-09-22 (UTC).** This is not a price guarantee or a production suitability endorsement. Free plans change, regional eligibility varies, and some services need a billing account or payment card. Always read the linked provider terms before enabling billing.

## Quick navigation

| Category | Services | Browse |
| --- | ---: | --- |
| Static & frontend hosting | 7 | [Browse](docs/static-hosting.md) |
| Backend & app hosting | 4 | [Browse](docs/app-hosting.md) |
| Serverless & edge | 2 | [Browse](docs/serverless.md) |
| Cloud compute & VPS | 3 | [Browse](docs/cloud-vps.md) |
| Databases & caching | 7 | [Browse](docs/databases.md) |
| Object storage & CDN | 3 | [Browse](docs/storage.md) |
| APIs & developer tools | 3 | [Browse](docs/developer-tools.md) |

## At a glance

**Plan labels:** Ongoing = no announced fixed end date (subject to provider changes); recurring credit = a small monthly credit, not unlimited free runtime; time-limited = trial or account offer; temporary resource = individual resource expires even if the account stays free.

| Service | Type | Free allowance | Critical restriction |
| --- | --- | --- | --- |
| [Vercel Hobby](https://vercel.com/docs/plans/hobby) | Ongoing free allowance | 100 GB Fast Data Transfer; included serverless functions | Hobby is restricted to personal, non-commercial projects; usage caps pause services. |
| [Netlify Free](https://www.netlify.com/pricing/) | Ongoing free allowance | 300 credits/month on new credit-based plans; custom domains and SSL | Production deploys, requests, bandwidth and compute all consume credits; legacy accounts may differ. |
| [Cloudflare Pages](https://developers.cloudflare.com/pages/platform/limits/) | Ongoing free allowance | 500 builds/month; up to 20,000 files/site on Free | Pages Functions consume the separate Workers quota; 20-minute build timeout. |
| [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) | Ongoing free allowance | Static sites from public repositories; 1 GB site limit; ~100 GB/month soft bandwidth | Not permitted as free hosting for an online business, e-commerce site or commercial SaaS. |
| [Firebase Hosting (Spark)](https://firebase.google.com/pricing) | Ongoing free allowance | 10 GB stored; 360 MB/day transferred; custom domain and SSL | Firebase App Hosting is a different product and is not available on Spark. |
| [Azure Static Web Apps Free](https://azure.microsoft.com/en-us/pricing/details/app-service/static/) | Ongoing free allowance | 100 GB bandwidth per subscription; 2 custom domains/app | Intended for hobby/personal apps; site becomes unavailable after exceeding bandwidth quota. |
| [Render Static Sites](https://render.com/docs/free) | Ongoing free allowance | Free static-site deployments with automatic TLS | Outbound bandwidth and build minutes share workspace quotas; excess usage may be billable. |
| [Render Free Web Services](https://render.com/docs/free) | Ongoing free allowance | 750 shared free instance hours/workspace/month | Services sleep after inactivity; no persistent local disk. Not recommended for production. |
| [Koyeb Free Web Instance](https://www.koyeb.com/docs/reference/instances) | Ongoing free allowance | One Free instance: 512 MB RAM, 0.1 vCPU, 2 GB SSD | Limited regions; sleeps after an hour without traffic; no persistent volumes. |
| [Railway Free](https://docs.railway.com/pricing/free-trial) | Recurring free credit | $1 monthly credit after an initial up-to-30-day $5 trial | Usage beyond recurring free credit requires checking billing and available resources. |
| [Deno Deploy Free](https://deno.com/deploy/pricing) | Ongoing free allowance | 1 million requests/month; 20 GiB egress/month; 5 custom domains | Runtime, resource and team restrictions apply; inspect current deployment pricing. |
| [Cloudflare Workers Free](https://developers.cloudflare.com/workers/platform/pricing/) | Ongoing free allowance | 100,000 requests/day; 10 ms CPU time per invocation | Functions on Pages share this quota; not a general-purpose always-on server. |
| [Google Cloud Run](https://docs.cloud.google.com/free/docs/free-cloud-features) | Ongoing free allowance | 2 million requests/month under eligible request-based billing | A Cloud Billing account is required; builds, logging and network usage can incur charges. |
| [Oracle Cloud Always Free Compute](https://www.oracle.com/cloud/free/) | Ongoing free allowance | Eligible AMD and Arm Ampere A1 compute resources | Requires a valid payment card for identity verification; region capacity and inactivity policies apply. |
| [Google Compute Engine Free Tier](https://docs.cloud.google.com/free/docs/free-cloud-features) | Ongoing free allowance | One eligible e2-micro VM/month; 30 GB standard disk; 1 GB eligible egress | Only selected US regions qualify; billing account required; other usage can be charged. |
| [AWS Free Plan](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-FAQ.html) | Time-limited | Eligible new accounts: up to six months or until Free Tier credits run out | NOT an indefinite free VPS; different AWS offers have separate eligibility and limits. |
| [Supabase Free](https://supabase.com/pricing) | Ongoing free allowance | 500 MB Postgres database/project; 2 active projects; 1 GB file storage | Free projects pause after one week of inactivity; restore/backups are limited. |
| [Turso Free](https://turso.tech/pricing) | Ongoing free allowance | 100 databases; 5 GB storage; 500M rows read and 10M rows written/month | Read/write usage and sync limits apply; re-check pricing before production use. |
| [MongoDB Atlas Free Cluster](https://www.mongodb.com/pricing) | Ongoing free allowance | 512 MB storage; one Free cluster per project | Limited regions, throughput and cluster capabilities; designed for development. |
| [Upstash Redis Free](https://upstash.com/pricing/redis) | Ongoing free allowance | 256 MB data; 500,000 commands/month; 10 GB monthly bandwidth | One Free database; claim temporary instant-created databases to prevent expiry. |
| [Cloudflare D1 Free](https://developers.cloudflare.com/d1/platform/pricing/) | Ongoing free allowance | 5 GB total storage; 5M rows read/day; 100k rows written/day | Daily limits stop queries on exhaustion; associated Workers usage has its own quota. |
| [Render Free Postgres](https://render.com/docs/free) | Temporary resource | 1 GB database, one free instance/workspace | Database EXPIRES after 30 days; not suitable for durable production data. |
| [Firebase Realtime Database (Spark)](https://firebase.google.com/pricing) | Ongoing free allowance | 1 GB stored; ~10 GB/month downloaded; 100 concurrent connections | Spark limits and feature eligibility vary; avoid assuming unlimited usage. |
| [Cloudflare R2 Standard](https://developers.cloudflare.com/r2/pricing/) | Ongoing free allowance | 10 GB-month storage; 1M Class A + 10M Class B operations/month | Free allowance covers Standard class only; operations beyond limits incur charges. |
| [Google Cloud Storage Free Tier](https://docs.cloud.google.com/free/docs/free-cloud-features) | Ongoing free allowance | 5 GB-months in eligible US regions; 5,000 Class A and 50,000 Class B operations | Eligible regions only; Cloud Billing required; egress rules are destination-dependent. |
| [Oracle Object Storage Always Free](https://www.oracle.com/cloud/free/) | Ongoing free allowance | Always Free object-storage allowance on eligible OCI accounts | Card verification required; quotas and capacity can vary by service and region. |
| [Resend Free](https://resend.com/pricing) | Ongoing free allowance | 3,000 transactional emails/month; 100/day; up to 3 domains | Daily sending cap and deliverability/domain-verification requirements apply. |
| [Better Stack Free](https://betterstack.com/pricing) | Ongoing free allowance | 10 monitors/heartbeats; 1 status page | Free personal-project tier; alert channels and log retention have limits. |
| [GitHub Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions) | Ongoing free allowance | Standard GitHub-hosted runners free for public repos; 2,000 minutes/month on GitHub Free private repos | Larger runners and over-quota private-repo usage may be billed. |

## How to choose

- **Personal frontend:** see [static & frontend hosting](docs/static-hosting.md); pay attention to commercial-use rules and build quotas.
- **API / Docker / long-running process:** see [app hosting](docs/app-hosting.md) and [serverless](docs/serverless.md); check sleep-to-zero and persistent storage.
- **Long-lived data:** see [databases](docs/databases.md). A free trial or a database that expires in 30 days is **not** suitable for important production data without migration and backups.
- **Free VM:** see [cloud compute & VPS](docs/cloud-vps.md). Look closely at the eligible region, included network traffic and payment verification.
- **Images, files and backups:** see [storage](docs/storage.md). Compare storage *and* API operations/egress.

## Data and maintenance

- [Machine-readable catalog](data/services.json) — each entry has a source, plan type, free allowance, important restrictions and review date.
- [Contribution guide](CONTRIBUTING.md) — how to add entries and document evidence.
- [Validation script](scripts/validate_catalog.py) — checks required fields, unique IDs, official URLs and category page coverage.
- [Catalog validation workflow](.github/workflows/validate-catalog.yml) — runs on changes to catalog and documentation.
- [Request a provider / report outdated information](../../issues/new/choose).

### What “free” means here

We **separate** ongoing free allowances, monthly credits, time-limited offers and resources that expire. A provider can fit more than one type, but the entry always describes the specific listed product. Entries are not affiliate recommendations. **Unknown** billing or commercial terms are intentionally marked *Check provider*, not guessed.

## Contributing

Found a new free tier or an outdated quota? Read [CONTRIBUTING.md](CONTRIBUTING.md) and submit a PR with an official pricing/documentation URL and the date verified. Please avoid referral links, scraped pricing and unverified claims.

Maintained by [ePlus-DEV](https://github.com/ePlus-DEV). Community contributions welcome.
