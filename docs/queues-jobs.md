# Queues, workflows & scheduling

Queues, job orchestration and recurring HTTP triggers. [← Back to directory](../README.md)

**Editorial review:** 2026-09-23 (UTC). Quotas, eligibility and pricing may change; consult the official provider links before use.

| Service | Plan | Free allowance | Important caveat | Card | Commercial use |
| --- | --- | --- | --- | --- | --- |
| [Cloudflare Queues Free](https://developers.cloudflare.com/queues/platform/pricing/) | Ongoing free allowance | 10,000 read/write/delete operations/day on Workers Free; 24-hour retention | Typical delivery uses three operations per message; retries add reads and Free retention is fixed. | Check provider | Check provider |
| [Upstash QStash Free](https://upstash.com/pricing/qstash) | Ongoing free allowance | 1,000 message delivery attempts/day; 50 GB monthly bandwidth; 10 schedules | Retries and topic subscribers count as additional deliveries; 1 MB message size and seven-day max delay. | Check provider | Check provider |
| [Upstash Workflow Free](https://upstash.com/pricing/workflow) | Ongoing free allowance | 1,000 workflow steps/day; 50 GB monthly bandwidth; up to 10 concurrent steps | Retries consume extra steps; 1 MB message size and seven-day maximum sleep. | Check provider | Check provider |
| [cron-job.org Free](https://cron-job.org/en/faq/) | Ongoing free allowance | Free scheduled HTTP requests as frequently as every minute; no fixed job-count limit under fair use | Fair-use requirements apply; REST API is limited to 100 calls/day by default and jobs call public URLs. | Check provider | Check provider |
| [Cloudflare Workflows Free](https://developers.cloudflare.com/workflows/reference/pricing/) | Ongoing free allowance | 3,000 workflow steps/day and 1 GB-month state storage; request quota shared with Workers Free | 10 ms CPU per invocation on Free; default instance-state retention is three days. | Check provider | Check provider |
| [Inngest Hobby](https://www.inngest.com/pricing) | Ongoing free allowance | 50,000 executions and 500,000 events/month; 5 concurrent steps; 3 users and 3 workers | An execution counts each function run plus its steps; free execution pauses on quota exhaustion; 24-hour trace retention and 7-day maximum sleep. | Not required | Check provider |
| [Trigger.dev Free](https://trigger.dev/pricing) | Recurring free credit | $5 recurring monthly compute/run credits; 20 concurrent runs; unlimited tasks; 10 schedules | Free credit covers metered compute and run invocation; execution stops or queues after credits run out until upgrade; 1-day log retention. | Check provider | Check provider |
| [SimpleQ Free](https://simpleq.io/pricing) | Ongoing free allowance | 30,000 outbound webhook attempts/month; 5 queues; up to 5 attempts/job; 3-day job retention | Each dispatched webhook POST, including retries and backpressure responses, counts as an attempt; backpressure waiting is free. Commercial-use terms need confirmation. | Not required | Check provider |
| [Windmill Cloud Community](https://www.windmill.dev/docs/getting_started/how_to_use_windmill) | Ongoing free allowance | 1,000 cloud executions/month; no credit card required | Cloud hosted in US; self-hosted Community Edition is a separate option; commercial-use conditions need confirmation. | Not required | Check provider |

> **Important:** “Check provider” means card or commercial terms were not independently confirmed.
