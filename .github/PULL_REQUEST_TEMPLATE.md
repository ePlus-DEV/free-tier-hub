## Summary

Describe what changed and why. For a catalog addition, provide the exact provider/product and free offer (not just the company name).

## Official sources and date checked

Link to official provider pricing or documentation and provide the date you verified the information (`YYYY-MM-DD`). Explain any limits, expiry, regional eligibility, payment-card requirements, commercial-use restrictions and potential overages. For code/docs-only PRs, write "Not applicable."

## Checklist

- [ ] I checked for duplicate products or plans (including different service IDs for the same offering).
- [ ] The free allowance and plan classification are accurate; trials, expiring resources and monthly credits are labeled correctly.
- [ ] Billing, commercial-use, deployment-model and other restrictions are verified from official sources or explicitly marked `check` / `unclassified`.
- [ ] For catalog additions or updates, I edited only the relevant `data/services/<category>/<id>.json` file(s), each containing one JSON object with a matching `category` and `id`.
- [ ] I did **not** manually edit generated `data/services.json`, `data/catalog-legacy-order.json`, `docs/<category>.md` or website search assets.
- [ ] I ran `npm run catalog:sync && npm run verify` locally, **or** will rely on the exact-HEAD GitHub Actions checks (Node.js is not required for web-only contributors).
- [ ] For site/UI changes, I verified search, filters, URLs and responsive layout on desktop/mobile, or described what still needs testing.

## Notes for contributors

- **New service:** create `data/services/<category>/<id>.json`.
- **Update:** edit its existing JSON file; **remove:** delete that source file; **move category/rename ID:** move the file and update its `category`/`id`, noting any affected detail URLs.
- **Old PR editing `data/services.json`?** Keep your original PR open, update the same branch from `main`, move your proposed change into the appropriate per-service file and restore generated files. This preserves attribution to the original PR author.
- CI regenerates derived catalog/category docs in the runner; it **does not push generated files to contributor forks**. A green CI check is not a substitute for source verification.

Read [CONTRIBUTING.md](https://github.com/ePlus-DEV/free-tier-hub/blob/main/CONTRIBUTING.md) for the complete schema and [suggest a service without code](https://github.com/ePlus-DEV/free-tier-hub/issues/new?template=suggest-service.yml) if preferred. External fork PRs are reviewed and never merged automatically.
