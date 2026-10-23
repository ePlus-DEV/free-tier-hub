# Reviewed catalog backlog consumer

The `Consume reviewed catalog backlog` GitHub Actions workflow runs hourly or by manual dispatch. It reads the reviewed `data/catalog-candidate-backlog.json` on the checked-out default branch and uses the current Node.js 24 catalog tooling.

It validates the catalog and backlog with `npm run verify` and `npm run catalog:backlog -- --list`. Only records that are not in `data/services.json` and whose `last_checked` date is no more than seven UTC days old are eligible. Outdated records must be reverified against official HTTPS pricing and updated in a separately reviewed PR; the consumer never refreshes evidence by itself.

The workflow checks **all historical Issues and PRs**, plus any existing delivery branch, before opening **at most one** canonical `[catalog-candidate] <id>` Issue per run. The Issue body is the exact catalog-schema JSON object. The existing `catalog-candidate-queue` workflow then validates it, prepares the `catalog/add-<id>` branch and opens a PR. An Issue is not proof of delivery; require the PR's exact-head validation and build checks.

The consumer uses `EPLUS_BOT_TOKEN` to create the Issue so the normal GitHub `issues` event can trigger the queue; `GITHUB_TOKEN`-authored Issues would not trigger another workflow. The bot must be a trusted repository collaborator and have Issue write permission. The consumer itself has read-only default-token permissions and never pushes code, merges PRs or deploys.

**Fail closed:** Missing token, invalid catalog/backlog, API errors or existing Issue/PR/branch stop or skip delivery without overwriting anything. Review logs and fix the underlying cause; do not bypass approvals or relax CI. A green consumer run with zero eligible candidates is not evidence of end-to-end delivery.

Current historical backlog note: `uploadthing-free` is a product alias of the already catalogued `uploadthing-2gb-app`; it must not generate a duplicate Issue. Existing backlog records dated 2026-10-08 are stale as of 2026-10-23 and require fresh official verification before they can be consumed.
