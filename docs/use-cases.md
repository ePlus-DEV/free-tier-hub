# Choose a free-tier stack

[← Directory](../README.md) · [Avoid unexpected costs](cost-safety.md)

These are example combinations, **not production endorsements**. Verify provider quotas, payment and usage terms before deploying.

## Static portfolio or project documentation

Use [Cloudflare Pages](static-hosting.md) or [GitHub Pages](static-hosting.md) to publish a static site, and [GitHub Actions or GitLab CI](developer-tools.md) to automate checks. GitHub Pages has restrictions on commercial hosting.

## Small API plus managed PostgreSQL

Compare [Render](app-hosting.md) or [Google Cloud Run](serverless.md) for hosting, with [Aiven PostgreSQL](databases.md) or [Supabase](databases.md) for data. Check sleep-to-zero, connection limits and whether your host requires a billing account. Keep independent backups.

## Hosted full-stack backend

Compare [Appwrite Cloud](app-hosting.md), [Supabase](databases.md) and [Firebase](databases.md) for auth, storage and database features. Check each free project's inactivity policy and deployment constraints separately.

## Webhooks, recurring work and durable jobs

Use [Cloudflare Queues or QStash](queues-jobs.md) when you need asynchronous HTTP delivery. Compare retries, retention and message operation accounting. For multi-step operations see [Cloudflare Workflows and Upstash Workflow](queues-jobs.md); both have independent step quotas. For a public HTTPS cron endpoint, [cron-job.org](queues-jobs.md) provides free scheduled requests; authenticate every sensitive endpoint.

## Search and gradual rollout

Compare [Algolia and Upstash Search](search.md) for indexing, query limits and language features. Compare [Flagsmith and LaunchDarkly](feature-flags.md) for usage-based feature flags. Provide safe local defaults when a flag API is unavailable.
