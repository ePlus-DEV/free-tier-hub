# Catalog pull request reconciliation safety

The `Maintain catalog PRs` workflow retains its existing scheduled cadence for historical compatibility. **After migration to per-service shards**, it **skips the obsolete single-file conflict reconciliation/recovery code**: unrelated PRs add different `data/services/<category>/<id>.json` files and no longer share an append location. It never merges pull requests into `main`.

**Before migration only:** For each eligible bot-authored catalog branch, the legacy workflow fetches latest `main` and the existing PR head, checks whether reconciliation is necessary, and attempts an ordinary `git merge --no-commit --no-ff origin/main` **on top of that head**. This retains every unique PR commit in the new merge commit's ancestry. After regenerating docs and running `npm run verify`, it performs a **normal, non-force push**; a concurrently moved remote branch rejects that push.

Before migration, any content conflict, validation failure, missing bot token or rejected push fails closed. After migration, existing old-format contributor PRs must be updated on their **original fork branches** to use canonical service shards; the scheduled workflow does not rewrite them. The workflow does **not** recreate a branch from `main`, reset contributor commits, guess conflict resolutions, force-push, merge PRs or deploy production. Resolve conflicts manually in a reviewed PR, then require exact-head CI and review again.

The historical implementation rebuilt the branch from `main` and used `--force-with-lease`; that could replace unique ancestry. The new workflow intentionally prefers a visible blocker over lost commits.

## Consolidated maintenance and issue completion

One hourly workflow still runs at minute 41 (UTC), with `reconcile` and `recover` jobs kept for legacy safety. In shard mode these jobs skip legacy single-file recovery; the schedule is unchanged. Before migration the jobs run sequentially with fresh checkouts, recovery only after successful reconciliation and not on `push`. Neither job force-pushes, touches Draft PRs, bypasses validation, or merges PRs.

The `Complete catalog issues and thank contributors` workflow handles merged-PR thank-you/linked-Issue events and catch-up sweeps on changes to either canonical `data/services/**` shards or the generated `data/services.json` on `main`. A manual dispatch with a PR number thanks that merged contributor; without a number it safely scans current `main` for delivered catalog candidate Issues. It never checks out code from a pull request.

CI validation and Pages builds remain separate required check jobs. They intentionally share some checks because the deploy/preview pipeline must validate its own input and the auto-merge gate independently requires both current-head results.

## Approval/build ordering

The bot's approval workflow must observe **both** `Validate free tier catalog / validate` and `Build and deploy GitHub Pages / Test and build static site` as PASS on the current PR head before approving or attempting catalog auto-merge. A check that has not appeared yet is not PASS. This prevents the observed race in which validation completed while the build was still queued; failed approval runs may be retried only after confirming both exact-head jobs succeeded. Cancelled, skipped, action-required and pending checks never satisfy the gate.
