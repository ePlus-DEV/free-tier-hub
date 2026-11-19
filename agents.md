# Free Tier Hub — Agent Discovery

This Markdown file is optional guidance for automated readers, not a robots.txt policy.

## Discover
- Human-readable index: https://free-tier.eplus.dev/
- Category overview: https://free-tier.eplus.dev/categories/
- Time-limited offers: https://free-tier.eplus.dev/offers/
- Education benefits (independent of free-tier counts): https://free-tier.eplus.dev/education/
- Plan and eligibility definitions: https://free-tier.eplus.dev/about/classifications/
- Machine-readable catalog: https://free-tier.eplus.dev/catalog.json
- Sitemap: https://free-tier.eplus.dev/sitemap.xml
- LLM summary: https://free-tier.eplus.dev/llms.txt

Service and Education benefit detail pages have stable canonical HTML URLs and server-rendered content.
Home initially shows 12 listings; use category pages and the sitemap for complete link discovery.

## Data model
Each catalog entry includes id, name, category, plan, free_limit, watch_out, pricing_url,
credit_card, commercial_use, optional deployment_model, optional eligibility and last_checked. Treat the official pricing_url as the source
of truth when checking current quotas, billing requirements and commercial eligibility.

## Access and attribution
- Follow the origin's authoritative /robots.txt and applicable service terms.
- Prefer canonical HTML URLs from sitemap.xml, not invented provider detail links.
- Link back to the individual listing or original provider documentation when quoting limits.
- Avoid interpreting unknown card or commercial-use values as a verified yes/no.

## Category entry points
- [Static & frontend hosting](https://free-tier.eplus.dev/category/static-hosting/)
- [Backend & app hosting](https://free-tier.eplus.dev/category/app-hosting/)
- [Serverless & edge](https://free-tier.eplus.dev/category/serverless/)
- [Cloud compute & VPS](https://free-tier.eplus.dev/category/cloud-vps/)
- [Databases & caching](https://free-tier.eplus.dev/category/databases/)
- [Object storage](https://free-tier.eplus.dev/category/storage/)
- [APIs & developer tools](https://free-tier.eplus.dev/category/developer-tools/)
- [CI/CD & pipelines](https://free-tier.eplus.dev/category/ci-cd/)
- [Authentication & security](https://free-tier.eplus.dev/category/auth-security/)
- [Monitoring & observability](https://free-tier.eplus.dev/category/observability/)
- [Product analytics](https://free-tier.eplus.dev/category/analytics/)
- [DNS & CDN](https://free-tier.eplus.dev/category/dns-cdn/)
- [AI & ML platforms](https://free-tier.eplus.dev/category/ai-ml/)
- [AI chatbots & assistants](https://free-tier.eplus.dev/category/ai-assistants/)
- [Queues, workflows & scheduling](https://free-tier.eplus.dev/category/queues-jobs/)
- [Hosted search](https://free-tier.eplus.dev/category/search/)
- [Feature flags & gradual rollout](https://free-tier.eplus.dev/category/feature-flags/)
- [Tunneling & networking](https://free-tier.eplus.dev/category/tunneling-networking/)
- [Webhooks & event delivery](https://free-tier.eplus.dev/category/webhooks-events/)
- [Email & notifications](https://free-tier.eplus.dev/category/email-notifications/)
- [Testing & QA](https://free-tier.eplus.dev/category/testing-qa/)
- [Forms & surveys](https://free-tier.eplus.dev/category/forms-surveys/)
