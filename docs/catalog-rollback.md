# Catalog migration rollback and data-preservation runbook

[← Deployment guide](deployment.md) · [Contribution rules](../CONTRIBUTING.md) · [Migration RFC #1739](https://github.com/ePlus-DEV/free-tier-hub/issues/1739)

**Scope:** the canonical source is `data/services/<category>/<id>.json`.
The tracked `data/services.json` is generated for compatibility, and
`dist/catalog.json` plus the `dist/search/` files are generated at build.
A rollback must never drop entries accepted after the original 930-service
migration or rewrite contributor PR history.

## Safe, staged recovery

1. **Identify the failure and baseline.** Record the current `main` SHA, the last
   successful Pages deployment SHA, the failing run/PR link, and the latest
   count and IDs from the canonical shards. Review any already-merged service
   PRs between the two SHAs. Never assume an older aggregate includes them.
2. **Preserve the latest data before any revert.** On a fresh branch based on the
   *current* `origin/main`, run:

   ```bash
   git fetch origin main
   git switch -c rollback/catalog-recovery origin/main
   node --input-type=module -e "import fs from 'node:fs'; import { aggregateCatalog } from './scripts/catalog-source.mjs'; fs.writeFileSync('../free-tier-hub-catalog-backup.json', aggregateCatalog());"
   npm run catalog:sync
   npm run verify
   ```

   Store the untracked backup **outside the repository**. Preserve the latest
   canonical shard tree and `data/catalog-legacy-order.json` in Git. Compare
   the backup's service IDs, objects and ordering against the latest
   successfully published `main` catalog and any merged additions since.
   If the loader itself fails, investigate the offending shard or restore
   only the last known-good reader onto this branch and independently inspect
   newer shard commits. **Do not substitute the old 930-item snapshot.**
3. **Prefer a narrow rollback first.** If the issue affects browser search or
   lazy rendering only, prepare a *new reviewed PR* reverting the affected
   UI/build changes (for example the #1741 optimization) while **retaining
   the entire canonical shard tree**, the site detail URLs and the backward
   compatibility aggregate. Do not roll back the source migration to fix a
   presentation bug.
4. **If canonical shard processing is broken**, use a reviewed emergency PR:
   repair the loader or temporarily teach the site build to read the
   **freshly generated, verified backup aggregate**, while retaining all
   shard files in the repository. Do **not** simply revert #1740 or delete
   `data/services/`: those actions could remove services merged since
   cutover, change service publish dates or discard contributor history.
   Keep the old `data/services.json` compatibility route and
   `/catalog.json` API until every downstream consumer is migrated.
5. **Review, test and publish deliberately.** Before approval, run
   `npm run catalog:sync && npm run verify && npm run build`; verify
   `dist/catalog.json`, `dist/search/index.json`, `dist/sitemap.xml`,
   `dist/robots.txt`, `dist/llms.txt`, `dist/agents.md`, category
   counts and every `/service/<id>/` route. Confirm every current
   accepted ID is present exactly once, and that historical
   `added_at` dates and per-record `last_checked` remain correct.
   Required checks must PASS at the **exact PR head**. Obtain normal
   human review and merge; then confirm the **main Pages deploy** and
   public URL responses, not just the PR preview.
6. **Recover normal operation.** Once the incident is resolved, restore the
   intended shard reader/website behavior in a separate reviewed PR,
   compare the full ID set again and confirm no accepted services were lost.

## Explicit safety boundaries

- **Never** force-push `main`, delete the shard tree, overwrite it from a
  stale generated aggregate, or change author identities to work around PR
  conflicts. Use additive/revert Git commits and reviewed PRs.
- **Do not change existing GitHub or ChatGPT automation schedules** as part
  of an ordinary rollback. If intake must be temporarily restricted during
  an incident, record the operational decision and reconcile all pending
  candidate Issues/PRs; do not silently disable the hourly delivery task.
- A merged contributor's original PR (such as #1622) remains the provenance
  of its service. Preserve its ID, first-publication semantics, provider
  metadata and visible URL even if a prior code version is redeployed.
- A successful PR build does not prove production has updated: verify the
  latest GitHub Pages deployment and public `/catalog.json` and sitemap.

## Proactive rollout coverage

The repository test `scripts/catalog-rollout.test.mjs` creates two independent
candidate branches from the **same main baseline**, each adding a different
service in the **same category**. It merges both branches sequentially,
asserts complete catalog parity and that neither branch edited
`data/services.json`, then checks duplicate-ID and old monolith-edit
fail-closed behavior. All changes also pass the normal catalog, build,
publication-date, and SEO/AEO regression gates (where merged).
