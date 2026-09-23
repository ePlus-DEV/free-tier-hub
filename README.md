# Free Tier Hub 🚀
**Build More, Spend Less.** A community-maintained directory of free hosting, cloud, databases, storage, serverless and developer services.

![Catalog](https://img.shields.io/badge/services-64-brightgreen) ![Data](https://img.shields.io/badge/catalog-JSON-blue) ![Contributions welcome](https://img.shields.io/badge/contributions-welcome-orange)

> **Last editorial review: 2026-09-22 (UTC).** This is not a price guarantee or a production suitability endorsement. Free plans change, regional eligibility varies, and some services need a billing account or payment card. Always read the linked provider terms before enabling billing.

## Quick navigation

| Category | Services | Browse |
| --- | ---: | --- |
| Static & frontend hosting | 7 | [Browse](docs/static-hosting.md) |
| Backend & app hosting | 5 | [Browse](docs/app-hosting.md) |
| Serverless & edge | 3 | [Browse](docs/serverless.md) |
| Cloud compute & VPS | 3 | [Browse](docs/cloud-vps.md) |
| Databases & caching | 12 | [Browse](docs/databases.md) |
| Object storage | 4 | [Browse](docs/storage.md) |
| APIs & developer tools | 9 | [Browse](docs/developer-tools.md) |
| Authentication & security | 3 | [Browse](docs/auth-security.md) |
| Monitoring & observability | 3 | [Browse](docs/observability.md) |
| Product analytics | 1 | [Browse](docs/analytics.md) |
| DNS & CDN | 1 | [Browse](docs/dns-cdn.md) |
| AI & ML platforms | 2 | [Browse](docs/ai-ml.md) |
| Queues, workflows & scheduling | 7 | [Browse](docs/queues-jobs.md) |
| Hosted search | 2 | [Browse](docs/search.md) |
| Feature flags & gradual rollout | 2 | [Browse](docs/feature-flags.md) |

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
| [Neon Free Postgres](https://neon.com/pricing) | Ongoing free allowance | 100 projects; 100 CU-hours/project/month; 0.5 GB storage/project | Scale-to-zero after inactivity; 5 GB public network transfer/project/month; verify project eligibility. |
| [Cloudflare Workers KV Free](https://developers.cloudflare.com/kv/platform/pricing/) | Ongoing free allowance | 1 GB storage; 100k key reads/day; 1k key writes/day | Writes, deletes and list requests each have a 1k/day cap; operations fail when daily quota is exhausted. |
| [Brevo Free](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan) | Ongoing free allowance | 300 email sends/day; up to 100k contacts | Daily unused sends do not roll over; free emails carry Brevo branding; queues and transactional limits apply. |
| [GitHub Codespaces (personal Free)](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces) | Ongoing free allowance | 120 core-hours/month and 15 GB-month storage for GitHub Free personal accounts | Organizations have no included Codespaces quota; 2-core machines use two core-hours per elapsed hour. |
| [Cloudflare Email Routing](https://developers.cloudflare.com/email-service/) | Ongoing free allowance | Free inbound custom-domain email forwarding and routing on Free/Paid plans | Not a free outbound transactional email API; Email Sending requires Workers Paid. Domain must use Cloudflare email routing. |
| [GitHub Packages](https://docs.github.com/en/billing/concepts/product-billing/github-packages) | Ongoing free allowance | Public packages are free; GitHub Free includes 500 MB private storage and 1 GB monthly transfer | Private quotas share storage with Actions artifacts; over-quota usage may be blocked or billed. |
| [Auth0 Free](https://auth0.com/pricing) | Ongoing free allowance | Up to 25,000 monthly active users; one custom domain and five organizations | Credit card not required to sign up; custom-domain feature requires card verification; tenant and connection limits apply. |
| [Clerk Hobby](https://clerk.com/pricing) | Ongoing free allowance | 50,000 monthly retained users per app; unlimited applications | MRU is not equivalent to monthly active users; free plan has limited dashboard seats and short log retention. |
| [Cloudflare Turnstile Free](https://developers.cloudflare.com/turnstile/plans/) | Ongoing free allowance | Up to 20 widgets/account; unlimited challenges; 10 hostnames/widget | Free tier has 7-day analytics lookback; remove-branding and advanced controls are Enterprise-only. |
| [UptimeRobot Free](https://uptimerobot.com/pricing/) | Ongoing free allowance | 50 monitors with 5-minute checks and basic status pages | Longer monitoring intervals and limited alert integrations; faster 60-second checks require paid plan. |
| [Grafana Cloud Free](https://grafana.com/pricing/) | Ongoing free allowance | 10k active metric series and 50 GB logs ingested/month; 14-day retention | Free quotas are separate for logs, metrics, traces and users; limited retention and community support. |
| [Sentry Developer](https://sentry.io/pricing/) | Ongoing free allowance | One user; 5,000 errors/month; 50 replays and 1 uptime monitor | Free plan is single-user; profiling, advanced integrations and additional event volumes require payment. |
| [PostHog Free](https://posthog.com/pricing) | Ongoing free allowance | 1M product analytics events/month; 5k session recordings/month; 1M feature flag requests | Free without a card for one project; usage stops at limits unless billing is enabled. |
| [Cloudflare DNS & CDN Free](https://www.cloudflare.com/plans/) | Ongoing free allowance | Free authoritative DNS, CDN, universal SSL and DDoS protection | Free DNS zones created since Sep 2024 default to 200 records; free CDN is not a substitute for hosting. |
| [Hugging Face Static Spaces](https://huggingface.co/docs/hub/spaces-overview) | Ongoing free allowance | Free static Spaces for ML demo frontends and project showcases | Creating Gradio or Docker compute Spaces requires a paid plan; static hosting does not provide free persistent compute. |
| [Google Gemini Developer API Free](https://ai.google.dev/gemini-api/docs/pricing) | Ongoing free allowance | Free input and output tokens for eligible Gemini models; Google AI Studio access | Free API eligibility and rate limits vary by model and region; free-tier content can be used to improve Google products. |
| [Aiven Free PostgreSQL](https://aiven.io/docs/products/postgresql/concepts/pg-free-tier) | Ongoing free allowance | One PostgreSQL service: 1 vCPU, 1 GB RAM, 1 GB disk | No VPC, static IP, pooling or SLA; 20 max connections; inactive services can be powered off. |
| [Appwrite Cloud Free](https://appwrite.io/pricing) | Ongoing free allowance | 2 projects; 5 GB monthly bandwidth; 2 GB storage; 750K executions/month; 75K MAU | Free projects pause after one week of inactivity; 1 database, 1 bucket and 2 functions per project. |
| [GitLab CI/CD Free](https://docs.gitlab.com/ci/pipelines/compute_minutes/) | Ongoing free allowance | 400 compute minutes/month per GitLab.com Free namespace on hosted instance runners | Runner cost factors vary; quota is shared across the namespace; extra compute minutes may need purchase. |
| [Cloudflare Queues Free](https://developers.cloudflare.com/queues/platform/pricing/) | Ongoing free allowance | 10,000 read/write/delete operations/day on Workers Free; 24-hour retention | Typical delivery uses three operations per message; retries add reads and Free retention is fixed. |
| [Upstash QStash Free](https://upstash.com/pricing/qstash) | Ongoing free allowance | 1,000 message delivery attempts/day; 50 GB monthly bandwidth; 10 schedules | Retries and topic subscribers count as additional deliveries; 1 MB message size and seven-day max delay. |
| [Upstash Workflow Free](https://upstash.com/pricing/workflow) | Ongoing free allowance | 1,000 workflow steps/day; 50 GB monthly bandwidth; up to 10 concurrent steps | Retries consume extra steps; 1 MB message size and seven-day maximum sleep. |
| [cron-job.org Free](https://cron-job.org/en/faq/) | Ongoing free allowance | Free scheduled HTTP requests as frequently as every minute; no fixed job-count limit under fair use | Fair-use requirements apply; REST API is limited to 100 calls/day by default and jobs call public URLs. |
| [Cloudflare Workflows Free](https://developers.cloudflare.com/workflows/reference/pricing/) | Ongoing free allowance | 3,000 workflow steps/day and 1 GB-month state storage; request quota shared with Workers Free | 10 ms CPU per invocation on Free; default instance-state retention is three days. |
| [Algolia Free Search](https://www.algolia.com/pricing/free-plan) | Ongoing free allowance | 10K searches/month; 50K records; 5K recommendation requests and 5K crawls/month | Higher usage and advanced search require paid plans; track record and request quotas separately. |
| [Upstash Search Free](https://upstash.com/pricing/search) | Ongoing free allowance | One free search database; 20K monthly queries; maximum 200K documents | Query and indexed-document caps apply independently; higher volumes need a paid usage plan. |
| [Flagsmith Free](https://www.flagsmith.com/pricing) | Ongoing free allowance | 50,000 flag API requests/month; one team member and one project; unlimited feature flags | Fair-use limits apply; multi-user administration, advanced scheduling and experimentation need paid plans. |
| [LaunchDarkly Developer](https://launchdarkly.com/pricing/) | Ongoing free allowance | Unlimited seats and feature flags; five service connections; 1,000 client-side MAU/month | Client MAU and service connections have separate caps; higher-scale rollout capabilities use paid plans. |
| [Upstash Blob Free](https://upstash.com/pricing/blob) | Ongoing free allowance | 1 GB average storage/month; 10 GB bandwidth, 10,000 simple and 2,000 advanced operations/month | Free bucket stops serving requests when any quota is exhausted until its 30-day window resets; multipart uploads count as advanced operations. |
| [Weaviate Cloud Free](https://weaviate.io/pricing) | Ongoing free allowance | One cluster/user; 100,000 objects, 1 GB RAM, 10 GB disk; 2,000 embedding requests/day and 1,000 Query Agent requests/month | One collection and up to three tenants; limited AWS regions, no backups or HA, best-effort availability. |
| [Inngest Hobby](https://www.inngest.com/pricing) | Ongoing free allowance | 50,000 executions and 500,000 events/month; 5 concurrent steps; 3 users and 3 workers | An execution counts each function run plus its steps; free execution pauses on quota exhaustion; 24-hour trace retention and 7-day maximum sleep. |
| [Trigger.dev Free](https://trigger.dev/pricing) | Recurring free credit | $5 recurring monthly compute/run credits; 20 concurrent runs; unlimited tasks; 10 schedules | Free credit covers metered compute and run invocation; execution stops or queues after credits run out until upgrade; 1-day log retention. |
| [Qdrant Cloud Free](https://qdrant.tech/pricing/) | Ongoing free allowance | One single-node cluster with 0.5 vCPU, 1 GB RAM and 4 GB disk | For testing and prototypes; limited regions, no high availability; suspends after 1 week of inactivity and deletes after 4 weeks unless reactivated. |
| [Cloudflare Durable Objects Free](https://developers.cloudflare.com/durable-objects/platform/pricing/) | Ongoing free allowance | 100,000 Durable Object requests/day; 13,000 GB-s compute/day; up to 5 GB SQLite-backed storage/account | Workers Free supports only SQLite-backed objects; operations fail when daily quotas are exceeded; Workers request limits apply separately. |
| [CircleCI Free](https://circleci.com/pricing/) | Ongoing free allowance | 30,000 credits/month; up to 5 active users; 1 GB network transfer and 2 GB-month storage | Free credits expire monthly and do not roll over; resource classes consume credits at different rates; personal builds stop when credits reach zero. |

## How to choose

- **Personal frontend:** see [static & frontend hosting](docs/static-hosting.md); pay attention to commercial-use rules and build quotas.
- **API / Docker / long-running process:** see [app hosting](docs/app-hosting.md) and [serverless](docs/serverless.md); check sleep-to-zero and persistent storage.
- **Long-lived data:** see [databases](docs/databases.md). A free trial or a database that expires in 30 days is **not** suitable for important production data without migration and backups.
- **Free VM:** see [cloud compute & VPS](docs/cloud-vps.md). Look closely at the eligible region, included network traffic and payment verification.
- **Images, files and backups:** see [storage](docs/storage.md). Compare storage *and* API operations/egress.
- **Auth and abuse protection:** see [authentication & security](docs/auth-security.md).
- **Observability and product insights:** see [monitoring](docs/observability.md) and [analytics](docs/analytics.md).
- **Domains and acceleration:** see [DNS & CDN](docs/dns-cdn.md). DNS/CDN is not the same as full web hosting.
- **ML demos or free model APIs:** see [AI & ML](docs/ai-ml.md). Some free API requests permit provider training on submitted content.
- **Background jobs and scheduled endpoints:** see [queues & scheduling](docs/queues-jobs.md). Compare retries, retention and step/operation limits.
- **Managed full-text search:** see [hosted search](docs/search.md). Separate request quotas from indexed-record quotas.
- **Gradual releases:** see [feature flags](docs/feature-flags.md). Compare per-request, user and team-seat limits.

## Developer playbooks

- [Choose a free-tier stack](docs/use-cases.md) — examples for frontend, API, background jobs, search and feature flags.
- [Avoid unexpected charges and data loss](docs/cost-safety.md) — card requirements, inactivity, quotas, backups and production considerations.

## Website and GitHub Pages

**Public site:** [https://eplus-dev.github.io/free-tier-hub/](https://eplus-dev.github.io/free-tier-hub/) (after the GitHub Pages Actions source is enabled and the first deployment succeeds).

The [Pages workflow](.github/workflows/pages.yml) builds **pre-rendered HTML** directly from `data/services.json`: one crawlable page per service and per category, responsive search on the index, canonical URLs, meta descriptions, Open Graph tags, breadcrumbs and schema.org JSON-LD. Its output includes `sitemap.xml`, `robots.txt`, `llms.txt`, `agents.md` and `catalog.json`.

**One-time setup:** In repository **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source. The workflow deploys automatically from `main`; pull requests run the full build and tests without publishing. For a custom domain, configure it in Pages settings and set the repository Actions variable `SITE_URL` to its full HTTPS URL (with trailing slash) so canonical links and the sitemap use the same domain. On a project Pages URL, `robots.txt` under `/free-tier-hub/` is informational; crawler-wide robots rules can only be controlled by the origin's root `/robots.txt`.

Run locally (Python 3.12; no third-party runtime dependencies):

```bash
python3 -m unittest discover -s tests -v
python3 scripts/validate_catalog.py
python3 scripts/build_site.py --site-url https://eplus-dev.github.io/free-tier-hub/ --output dist
```

## Data and maintenance

- [Machine-readable catalog](data/services.json) — each entry has a source, plan type, free allowance, important restrictions and review date.
- [Contribution guide](CONTRIBUTING.md) — how to add entries and document evidence.
- [Validation script](scripts/validate_catalog.py) — checks required fields, unique IDs, official URLs and category page coverage.
- [Catalog validation workflow](.github/workflows/validate-catalog.yml) — runs on changes to catalog and documentation.
- [Request a provider / report outdated information](https://github.com/ePlus-DEV/free-tier-hub/issues/new/choose).

### What “free” means here

We **separate** ongoing free allowances, monthly credits, time-limited offers and resources that expire. A provider can fit more than one type, but the entry always describes the specific listed product. Entries are not affiliate recommendations. **Unknown** billing or commercial terms are intentionally marked *Check provider*, not guessed.

## Contributing

Found a new free tier or an outdated quota? Read [CONTRIBUTING.md](CONTRIBUTING.md) and submit a PR with an official pricing/documentation URL and the date verified. Please avoid referral links, scraped pricing and unverified claims.

Maintained by [ePlus-DEV](https://github.com/ePlus-DEV). Community contributions welcome.

