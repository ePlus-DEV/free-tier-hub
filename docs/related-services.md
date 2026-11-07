# Related service links

## Why

Different offerings from one provider can have separate products, accounts, eligibility and billing. For example, **ChatGPT Free** is a consumer AI assistant while **OpenAI for Startups API Credits** is a time-limited, VC-referral-gated API program. The directory should make the relationship discoverable without implying that either offering shares the other's free allowance.

## Editorial source of truth

Add an optional `related_services` array of **canonical service IDs** to exactly one relevant `data/services/<category>/<id>.json` shard:

```json
{
  "id": "chatgpt-free",
  "related_services": ["openai-for-startups-api-credits"]
}
```

This is a fragment illustrating the field, not a replacement complete service record. The target ID must already exist in the canonical catalog. The reverse link is generated automatically: **do not add another declaration just to make the relationship reciprocal**. The linked entries remain in their original categories with their original plans; **a related link does not create a duplicate service, category assignment or new free offer**.

Relations are editorial, not automatically guessed from company domains, brand tokens, logos, pricing-page URLs or AI search text. In particular, a tool **built with** OpenAI, Google, GitHub or an open model is not automatically a first-party offering from that provider. Only link offerings genuinely belonging to the **same provider** and with a reviewed, useful product/program relationship.

## Presentation

- Display links on both existing static detail pages, even when the pair crosses categories or an ongoing/limited-duration boundary.
- **Approved detail-card composition:** one quiet outlined panel with a chain-link icon immediately before **Related services**; each full-width internal link is a single row with a bold service name, smaller category + plan metadata, and an **up-right arrow** at the right; a separated muted note below all rows states that limits and eligibility are separate. On mobile, rows wrap names without clipping, retain generous tap targets and use the same hierarchy. Do not replace this with bare stacked text links or extra colorful badges.
- Show each target's actual category and plan beside its name; do not imply common API quotas, account entitlements, limits or billing.
- Do not show a related section for services without curated links.
- The source is the existing catalog. Keep links internal and canonical, escaped, keyboard accessible, same-tab and consistent with mobile/dark mode.
- Avoid home-card clutter and additions to the **10-field compact search index**. Metadata, SEO snippets, canonical routes, badge counts and `last_checked` do not change because of navigation links.

## Safety and maintenance

- Only use stable IDs, not display names or URL heuristics. Relationships are cross-category; do not create duplicate service JSON shards.
- Validations reject missing/unknown IDs, malformed IDs, duplicates, self-links, empty lists and more than six links per service **after reciprocal expansion**. Resolve a deleted or renamed target before catalog build; stale cross-references fail CI.
- The opt-in field does not change the trusted candidate schema, discovery automation, category taxonomy or catalog counts.
- Keep provider claims and evidence accurate, using official sources if making a **new product/eligibility** assertion. Existing listing facts are not reverified by linking.
- Submit changes through a reviewed PR and run `npm run verify` and `npm run build` on Node.js 24. Never hand-edit generated catalog/site artifacts.
