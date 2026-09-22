# Queues, workflows & scheduling

Queues, job orchestration and recurring HTTP triggers. [← Back to directory](../README.md)

**Editorial review:** 2026-09-22 (UTC). Quotas, eligibility and pricing may change; consult the official provider links before use.

| Service | Plan | Free allowance | Important caveat | Card | Commercial use |
| --- | --- | --- | --- | --- | --- |
| [Cloudflare Queues Free](https://developers.cloudflare.com/queues/platform/pricing/) | Ongoing free allowance | 10,000 read/write/delete operations/day on Workers Free; 24-hour retention | Typical delivery uses three operations per message; retries add reads and Free retention is fixed. | Check provider | Check provider |
| [Upstash QStash Free](https://upstash.com/pricing/qstash) | Ongoing free allowance | 1,000 message delivery attempts/day; 50 GB monthly bandwidth; 10 schedules | Retries and topic subscribers count as additional deliveries; 1 MB message size and seven-day max delay. | Check provider | Check provider |
| [Upstash Workflow Free](https://upstash.com/pricing/workflow) | Ongoing free allowance | 1,000 workflow steps/day; 50 GB monthly bandwidth; up to 10 concurrent steps | Retries consume extra steps; 1 MB message size and seven-day maximum sleep. | Check provider | Check provider |
| [cron-job.org Free](https://cron-job.org/en/faq/) | Ongoing free allowance | Free scheduled HTTP requests as frequently as every minute; no fixed job-count limit under fair use | Fair-use requirements apply; REST API is limited to 100 calls/day by default and jobs call public URLs. | Check provider | Check provider |
| [Cloudflare Workflows Free](https://developers.cloudflare.com/workflows/reference/pricing/) | Ongoing free allowance | 3,000 workflow steps/day and 1 GB-month state storage; request quota shared with Workers Free | 10 ms CPU per invocation on Free; default instance-state retention is three days. | Check provider | Check provider |

> **Important:** “Check provider” means card or commercial terms were not independently confirmed.
