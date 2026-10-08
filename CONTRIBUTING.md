# Contributing to Free Tier Hub

Thanks for helping maintain an accurate directory. **Provider documentation is the source of truth**, not a blog post, referral page or an AI-generated price summary.

## Add or update an entry

1. Open `data/services.json`. Add an entry with a stable lowercase kebab-case `id`, one of the supported categories, and an official pricing/documentation URL.
2. Read the provider's official free-plan page **on the date of the contribution**. Describe included units and reset period, whether a payment card is required, the commercial-use policy, expiration/sleep rules, region restrictions and likely chargeable extras.
3. Choose one plan type: `ongoing`, `monthly-credit`, `limited-duration`, or `temporary-resource`. A 30-day free database is a **temporary resource**, not a permanent free database.
4. Set `last_checked` to the actual verification date, not the date you opened the PR. Use `check` for billing or commercial fields that you cannot verify.
5. Run `python3 scripts/sync_catalog.py` to regenerate the README and category documentation from your JSON changes. Then run `python3 scripts/sync_catalog.py --check` and `python3 scripts/validate_catalog.py`. Commit the generated documentation alongside `data/services.json`; do not edit generated tables by hand.
6. Push your branch to **your own fork**, then open a focused pull request to `ePlus-DEV/free-tier-hub:main`, describing what changed and including official source URLs. GitHub Actions will run validation on the pull request; first-time external contributors may need a maintainer to approve the workflow run.

### Quick start (fork and pull request)

1. Fork this repository on GitHub and clone **your fork** locally.
2. Create a branch, for example `catalog/add-example-free`.
3. Edit **only** `data/services.json` manually to add or update the service; use official sources and the required fields below.
4. Run the commands below to generate the README and docs and check the result:

   ```bash
   python3 scripts/sync_catalog.py
   python3 -m unittest discover -s tests -v
   python3 scripts/sync_catalog.py --check
   python3 scripts/validate_catalog.py
   ```

5. Commit `data/services.json` and the generated Markdown files, push to your fork, and open a PR against upstream `main`.

The generated Markdown files are **derived outputs**, not extra data entry. The read-only PR workflow does not push to contributor forks, and maintainers still review official pricing and restrictions before merging.

### Editorial guidelines

- List distinct provider **products** when their billing models differ (e.g. static hosting vs short-lived managed database).
- Don't turn marketing credits into an “always free” promise.
- Avoid affiliate/referral links and ranking providers by paid incentives.
- Quote quotas precisely: **per day**, **per month**, or **one-time** matters.
- Identify when free usage requires an active billing account; describe possible charges beyond limits.
- If an official source contradicts an existing row, update the row and its review date; do not silently remove caveats.
- Keep statements concise, factual, international where possible, and in English.

## Fields

| Field | Meaning |
| --- | --- |
| `id` | Unique kebab-case identifier |
| `name` | Provider and specific plan/product |
| `category` | One of the supported catalog categories (see `scripts/check_markdown.py`) |
| `plan` | `ongoing`, `monthly-credit`, `limited-duration`, `temporary-resource` |
| `free_limit` | Key verified free allowance including time unit |
| `watch_out` | One or more material limitations |
| `pricing_url` | Official provider page, HTTPS only |
| `credit_card` | `yes`, `no`, or `check` |
| `commercial_use` | `yes`, `no`, or `check` |
| `last_checked` | ISO date YYYY-MM-DD |

## Maintainer review checklist

- [ ] The provider currently offers the described plan.
- [ ] All numbers are confirmed using the official URL.
- [ ] Expiration, sleep and billing caveats are prominent.
- [ ] `data/services.json`, `README.md` and the matching category page agree.
- [ ] `python3 scripts/validate_catalog.py` passes.
