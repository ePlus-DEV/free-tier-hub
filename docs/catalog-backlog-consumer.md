# Reviewed catalog backlog consumer

The `Consume reviewed catalog backlog` GitHub Actions workflow runs hourly or by manual dispatch. It reads the reviewed `data/catalog-candidate-backlog.json` on the checked-out default branch and uses the current Node.js 24 catalog tooling.

It validates the catalog and backlog with `npm run verify` and `npm run catalog:backlog -- --list`. Only records whose IDs are not present in the canonical `data/services/<category>/<id>.json` shards and whose `last_checked` date is no more than seven UTC days old are eligible. Outdated records must be reverified against official HTTPS pricing and updated in a separately reviewed PR; the consumer never refreshes evidence by itself.

The workflow checks **all historical Issues and PRs**, plus any existing delivery branch, before opening **at most one** canonical `[catalog-candidate] <id>` Issue per run. The Issue body is the exact catalog-schema JSON object. The existing `catalog-candidate-queue` workflow then validates it, writes only `data/services/<category>/<id>.json`, prepares the `catalog/add-<id>` branch and opens a **Draft PR** using the bot token (no empty CI-trigger commit). The generated `data/services.json` and category docs are rebuilt in CI/production; they are not authored in the candidate PR. The separate `catalog-gated-auto-merge` workflow listens for successful catalog-validation/Pages-build completion and may mark **only** a trusted, ongoing local/self-hosted open-source candidate Ready and squash-merge it when both exact-head CI runs pass and its sole new JSON shard exactly matches the trusted Issue and deployment evidence. Cloud offerings, trials, ambiguous eligibility, failed checks, public suggestions, and regular contributor PRs remain for manual review. An Issue, green CI, or Draft PR alone is never proof of delivery; verify the actual merge and production Pages deployment.

The consumer uses `EPLUS_BOT_TOKEN` to create the Issue so the normal GitHub `issues` event can trigger the queue; `GITHUB_TOKEN`-authored Issues would not trigger another workflow. The bot must be a trusted repository collaborator and have Issue write permission. The consumer itself has read-only default-token permissions and never pushes code, merges PRs or deploys.

**Fail closed:** Missing token, invalid catalog/backlog, API errors or existing Issue/PR/branch stop or skip delivery without overwriting anything. Review logs and fix the underlying cause; do not bypass approvals or relax CI. A green consumer run with zero eligible candidates is not evidence of end-to-end delivery.

Current historical backlog note: `uploadthing-free` is a product alias of the already catalogued `uploadthing-2gb-app`; it must not generate a duplicate Issue. Existing backlog records dated 2026-10-08 are stale as of 2026-10-23 and require fresh official verification before they can be consumed.

## Deployment metadata through the queue

New or updated candidates should include `deployment_model`: `cloud`, `self-hosted`,
`hybrid`, `local`, or `unclassified`, supported by the official source for the
specific listed offer. A separate self-hosted edition does not make a cloud plan hybrid.
Use `unclassified` when evidence is inconclusive.

The backlog loader and candidate Issue parser call `validateCandidate` from `scripts/catalog.mjs`. Once independent service shards are active, the old monolith conflict-recovery workflow exits safely; GitHub no longer needs to reconcile unrelated append edits. Invalid values and unrelated JSON
fields are rejected. Existing reviewed candidates without deployment metadata remain
valid and appear under Not specified. Delivery preserves the canonical Issue JSON
and never guesses a deployment model, rewrites evidence or advances `last_checked`.
