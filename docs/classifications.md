# How Free Tier Hub classifies offers

[← Free Tier Hub](../README.md) · [Public explanation](https://free-tier.eplus.dev/about/classifications/) · [Contribute](../CONTRIBUTING.md)

This is the human-readable classification policy for the **specific cataloged product or plan**, not every edition a vendor sells. The source of truth for each listing is `data/services.json` and its official `pricing_url`. Do not infer plan type, availability, deployment model or billing rights from product names.

## Plan type (`plan`)

| Value | Displayed as | Criteria | Counts in default directory? |
| --- | --- | --- | --- |
| `ongoing` | Ongoing free allowance / Free tier or free software | No announced fixed end date for the **specific** free allowance or licensed software, subject to quota and policy changes | Yes |
| `monthly-credit` | Recurring monthly credit | Free credits renew every billing period; separate introductory signup credits do not count as recurring | Yes |
| `limited-duration` | Time-limited offer | Account-level trial, one-time signup promotion or credit that ends after a fixed period or is exhausted | No; browse in /offers/ |
| `temporary-resource` | Expiring free resource | A specific resource itself expires or is deleted, e.g. a database after 30 days | No; browse in /offers/ |

**Mixed offers:** If a provider offers a 14-day premium trial then an ongoing Free plan, catalog the ongoing Free allowance and disclose the trial separately. If only a 30-day trial exists, use `limited-duration`. A 30-day log **retention** period, monthly quota **reset** or required account **renewal** does not by itself make the free plan time-limited.

## Deployment model (`deployment_model`)

| Value | Meaning |
| --- | --- |
| `cloud` | Provider hosts the cataloged service; usage or overages may cost money |
| `self-hosted` | You provide server, compute, storage, security and operations; free software **does not** imply free hosting |
| `hybrid` | The **same listed offer** includes cloud and self-hosted modes; a separately sold edition does not qualify |
| `local` | Application, SDK, CLI or embedded library runs on your device / in your application |
| `unclassified` or missing | Not sufficiently verified; do not guess from category or name |

## Eligibility (`eligibility`)

An **optional** field, currently only `existing-users-only`. It means a grandfathered ongoing free allowance remains usable by **eligible existing accounts**, but new accounts may not be able to register for that free offer. Display **Legacy only** on cards and detail pages. This is an *eligibility restriction*, not an additional plan type or a time-limited trial.

Only add the field when an official provider announcement or pricing page explicitly confirms the grandfathered rule. Record the official evidence in the review PR and describe the condition in `watch_out`. Do **not** infer it from `ongoing`, self-hosted status, trial copy, provider names or expired promotions. Leave the field absent for normal listings and do not interpret absence as proof that a new account will qualify.

Current examples requiring grandfathered labeling:
- `koyeb`: [Koyeb announcement, February 17, 2026](https://www.koyeb.com/blog/koyeb-is-joining-mistral-ai-to-build-the-future-of-ai-infrastructure) — Starter retained for existing organizations, while new users need a paid plan.
- `steadystack-initiate`: [SteadyStack pricing](https://steadystack.dev/pricing) — The Initiate marked **Grandfathered / Launch Cohort Guaranteed**.

## Cards, commercial use and source accuracy

- `credit_card`: `yes` means required; `no` means no card required; `check` means **not confirmed**.
- `commercial_use`: `yes` means the listed plan explicitly permits business use; `no` means restricted; `check` means **not confirmed**. Do not silently treat `check` as permission.
- `last_checked` is the date that the actual product claim was reviewed; it is **not** a live price guarantee, and a successful CI/schema check is not provider verification.
- `watch_out` should identify billing risks, renewal and expiration behavior, regions, overages, licensing or eligibility, with a first-party `pricing_url`.

The public site displays badges to help people compare, but these labels are **not** independent warranties of free production use or the ability to sign up today.

## Update process

1. Identify the exact product, free allowance and eligible audience from an official provider page.
2. Select the plan type **before** selecting deployment and eligibility; avoid category/name heuristics.
3. Add `eligibility: existing-users-only` only to a genuinely ongoing grandfathered plan with official evidence; no new enum values without a coordinated schema/UI change.
4. Update `watch_out` with what new and existing users can actually do. Update `last_checked` only if you reverified that listing.
5. Make a reviewed Draft PR with sources, run `npm run catalog:sync`, `npm run verify`, `npm run build`, inspect UI on mobile and desktop. Do not bypass CI/protections or merge directly.

The automated ten-field candidate Issue schema is intentionally unchanged; grandfathered eligibility is set only after maintainer source review in a catalog PR.
