# Auditing official free-tier sources

[← Directory](../README.md) · [Contribution guide](../CONTRIBUTING.md)

The catalog at [data/services.json](../data/services.json) is community maintained. **A successful `npm run verify` verifies schema and generated documentation consistency, not the truth of provider pricing, plan conditions or service availability.**

## Automated checks

The read-only [Audit catalog official sources](../.github/workflows/audit-catalog-sources.yml) workflow runs **weekly on Monday at 03:00 UTC** and can be started manually via **Actions → Audit catalog official sources → Run workflow**.

It checks each `pricing_url` with a timed HTTP request (five concurrent workers, redirects restricted to public HTTPS), detects 404/410, classifies 403/429 as **restricted**, and flags entries whose `last_checked` date is at least 30 days old. It also highlights `credit_card` and `commercial_use` values set to `check`.

The run Summary includes a report, and the **catalog-source-audit** artifact contains `report.md` and `report.json`, including URL status, age and review priority for every entry.

The workflow uses Node.js 24 LTS and GitHub-hosted runners. It does **not** edit catalog data, update `last_checked`, create issues or merge PRs. A site may block robots, and HTTP 200 **does not prove a free allowance is accurate**.

Run locally from the repository:

```bash
npm run audit:sources
npm run audit:offline
```

The offline mode checks age and unknown card/commercial policies without contacting providers. Generated reports are ignored by Git.

## Manual verification (required for factual claims)

1. Open each official `pricing_url` and verify the exact product/plan still exists.
2. Compare every quota and unit in `free_limit`, including reset windows, region, requests, compute, storage and egress.
3. Check payment-card requirements, commercial use, trial/expiry periods, overages, sleep/deletion and the material `watch_out` conditions.
4. If two official sources conflict, record both URLs and publication dates. Use `check` where card/commercial permission cannot be confirmed.
5. Only after **human factual verification**, edit `data/services.json` and set `last_checked` to the date actually checked. Run `npm run catalog:sync` and `npm run verify`, then open a sourced PR.

**Important:** `last_checked` means that factual claims were checked by a person on that date, not merely that an automated URL request succeeded.

## Review priority

- **High:** a missing official page (404/410), unsafe URL, or a review date at least 60 days old.
- **Review:** restricted/unresponsive URL, review date at least 30 days old, or unknown card/commercial terms.
- **Routine:** URL reachable, recently reviewed, and no unknown card/commercial flags. This is not a factual certification.

Treat the report as a triage queue, not a reliability score.
