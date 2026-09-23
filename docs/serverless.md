# Serverless & edge

Request-driven functions and managed containers. [← Back to directory](../README.md)

**Editorial review:** 2026-09-22 (UTC). Provider prices and limits may change; open each official source for the current terms.

| Service | Plan | Free allowance | Important caveat | Card | Commercial use |
| --- | --- | --- | --- | --- | --- |
| [Cloudflare Workers Free](https://developers.cloudflare.com/workers/platform/pricing/) | Ongoing free allowance | 100,000 requests/day; 10 ms CPU time per invocation | Functions on Pages share this quota; not a general-purpose always-on server. | Not required | Check provider |
| [Google Cloud Run](https://docs.cloud.google.com/free/docs/free-cloud-features) | Ongoing free allowance | 2 million requests/month under eligible request-based billing | A Cloud Billing account is required; builds, logging and network usage can incur charges. | Required | Check provider |
| [Cloudflare Durable Objects Free](https://developers.cloudflare.com/durable-objects/platform/pricing/) | Ongoing free allowance | 100,000 Durable Object requests/day; 13,000 GB-s compute/day; up to 5 GB SQLite-backed storage/account | Workers Free supports only SQLite-backed objects; operations fail when daily quotas are exceeded; Workers request limits apply separately. | Not required | Check provider |

> **Important:** “Check provider” means not independently confirmed in this catalog. It does **not** mean a credit card or commercial use is necessarily permitted.
