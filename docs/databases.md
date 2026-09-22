# Databases & caching

SQL, NoSQL and managed cache. [← Back to directory](../README.md)

**Editorial review:** 2026-09-22 (UTC). Provider prices and limits may change; open each official source for the current terms.

| Service | Plan | Free allowance | Important caveat | Card | Commercial use |
| --- | --- | --- | --- | --- | --- |
| [Supabase Free](https://supabase.com/pricing) | Ongoing free allowance | 500 MB Postgres database/project; 2 active projects; 1 GB file storage | Free projects pause after one week of inactivity; restore/backups are limited. | Not required | Check provider |
| [Turso Free](https://turso.tech/pricing) | Ongoing free allowance | 100 databases; 5 GB storage; 500M rows read and 10M rows written/month | Read/write usage and sync limits apply; re-check pricing before production use. | Not required | Check provider |
| [MongoDB Atlas Free Cluster](https://www.mongodb.com/pricing) | Ongoing free allowance | 512 MB storage; one Free cluster per project | Limited regions, throughput and cluster capabilities; designed for development. | Not required | Check provider |
| [Upstash Redis Free](https://upstash.com/pricing/redis) | Ongoing free allowance | 256 MB data; 500,000 commands/month; 10 GB monthly bandwidth | One Free database; claim temporary instant-created databases to prevent expiry. | Not required | Check provider |
| [Cloudflare D1 Free](https://developers.cloudflare.com/d1/platform/pricing/) | Ongoing free allowance | 5 GB total storage; 5M rows read/day; 100k rows written/day | Daily limits stop queries on exhaustion; associated Workers usage has its own quota. | Not required | Check provider |
| [Render Free Postgres](https://render.com/docs/free) | Temporary resource | 1 GB database, one free instance/workspace | Database EXPIRES after 30 days; not suitable for durable production data. | Check provider | Check provider |
| [Firebase Realtime Database (Spark)](https://firebase.google.com/pricing) | Ongoing free allowance | 1 GB stored; ~10 GB/month downloaded; 100 concurrent connections | Spark limits and feature eligibility vary; avoid assuming unlimited usage. | Not required | Check provider |

| [Neon Free Postgres](https://neon.com/pricing) | Ongoing free allowance | 100 projects; 100 CU-hours/project/month; 0.5 GB storage/project | Scale-to-zero after inactivity; 5 GB public network transfer/project/month; verify project eligibility. | Not required | Check provider |
| [Cloudflare Workers KV Free](https://developers.cloudflare.com/kv/platform/pricing/) | Ongoing free allowance | 1 GB storage; 100k key reads/day; 1k key writes/day | Writes, deletes and list requests each have a 1k/day cap; operations fail when daily quota is exhausted. | Not required | Check provider |

> **Important:** “Check provider” means not independently confirmed in this catalog. It does **not** mean a credit card or commercial use is necessarily permitted.
