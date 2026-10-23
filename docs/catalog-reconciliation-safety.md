# Catalog pull request reconciliation safety

The `Reconcile catalog PR conflicts` workflow may update only trusted, non-draft `catalog/add-*` pull requests authored by GitHub Actions and linked to an existing candidate Issue. It does not merge pull requests into `main`.

For each eligible branch, it fetches the latest `main` and the **existing PR head**, checks whether reconciliation is necessary, and attempts an ordinary `git merge --no-commit --no-ff origin/main` **on top of that head**. This retains every unique PR commit in the new merge commit's ancestry. After regenerating docs and running `npm run verify`, it performs a **normal, non-force push**; a concurrently moved remote branch rejects that push.

Any content conflict, validation failure, missing bot token or rejected push fails closed. The workflow does **not** recreate a branch from `main`, reset contributor commits, guess conflict resolutions, force-push, merge PRs or deploy production. Resolve conflicts manually in a reviewed PR, then require exact-head CI and review again.

The historical implementation rebuilt the branch from `main` and used `--force-with-lease`; that could replace unique ancestry. The new workflow intentionally prefers a visible blocker over lost commits.

## Approval/build ordering

The bot's approval workflow must observe **both** `Validate free tier catalog / validate` and `Build and deploy GitHub Pages / Test and build static site` as PASS on the current PR head before approving or attempting catalog auto-merge. A check that has not appeared yet is not PASS. This prevents the observed race in which validation completed while the build was still queued; failed approval runs may be retried only after confirming both exact-head jobs succeeded. Cancelled, skipped, action-required and pending checks never satisfy the gate.
