import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const yaml = readFileSync(
  new URL("../.github/workflows/pr-auto-approve.yml", import.meta.url),
  "utf8",
);
const heading = "      - name: Auto-merge trusted catalog PRs";
const autoMerge = yaml.slice(yaml.indexOf(heading));

test("auto-merge remains enabled, but only for explicitly eligible PRs", () => {
  assert.ok(yaml.includes(heading), "auto-merge step must remain present");
  assert.ok(autoMerge.includes("gh pr merge"));
  assert.ok(autoMerge.includes('[[ "$BRANCH" == catalog/add-* ]]'));
  assert.ok(autoMerge.includes("Automated delivery from candidate issue #"));
  assert.ok(autoMerge.includes("[catalog-candidate]"));
  assert.ok(autoMerge.includes("ISSUE_JSON"));
  assert.ok(autoMerge.includes('auto-merge-approved'));
  assert.ok(autoMerge.includes('AUTHOR" = "github-actions[bot]"'));
  assert.ok(autoMerge.includes('AUTHOR" = "hoangsvit"'));
});

test("only services and generated Markdown are safe for automatic merge", () => {
  const allowedMatch = autoMerge.match(/if grep -Ev '([^']+)' <<<"\$FILES"; then/);
  assert.ok(allowedMatch, "auto-merge must have a path allowlist");
  const allowed = new RegExp(allowedMatch[1]);
  for (const path of [
    "data/services.json",
    "docs/app-hosting.md",
    "docs/developer-tools.md",
    "README.md",
  ]) {
    assert.equal(allowed.test(path), true, path);
  }
  for (const path of [
    ".github/workflows/pr-auto-approve.yml",
    ".github/workflows/validate-catalog.yml",
    "scripts/catalog.mjs",
    "scripts/build-site.mjs",
    "scripts/pr-auto-approve.test.mjs",
    "site/index.html",
    "data/category-discovery-ledger.json",
    "CONTRIBUTING.md",
  ]) {
    assert.equal(allowed.test(path), false, path);
  }
});

test("auto-merge requires exact-head checks and approval, never counts skipped deploy as PASS", () => {
  assert.ok(autoMerge.includes(`test "$(jq -r '.head.sha' <<<"$PR_JSON")" = "$EXPECTED_HEAD"`));
  assert.ok(autoMerge.includes('Test and build static site'));
  assert.ok(autoMerge.includes('Validate free tier catalog'));
  assert.ok(autoMerge.includes('.bucket == "pass"'));
  assert.ok(autoMerge.includes('.name == "Deploy" and .bucket == "skipping"'));
  assert.ok(autoMerge.includes('APPROVED_FOR_HEAD') || autoMerge.includes('APPROVED="$(gh api'));
  assert.ok(autoMerge.includes('--match-head-commit "$EXPECTED_HEAD"'));
});

test("draft pull requests are skipped safely", () => {
  assert.ok(autoMerge.includes('Draft PR is awaiting review; auto-merge skipped'));
  assert.ok(autoMerge.includes('exit 0'));
});

test("only exact optional skipped check names are permitted", () => {
  assert.ok(autoMerge.includes('.name == "Deploy" and .bucket == "skipping"'));
  assert.ok(autoMerge.includes('.name == "request-review" and .bucket == "skipping"'));
  assert.ok(autoMerge.includes('.workflow == "Request eplus-bot review"'));
  assert.ok(autoMerge.includes('.name == "validate" and .bucket == "pass"'));
  assert.ok(autoMerge.includes('.name == "Test and build static site" and .bucket == "pass"'));
});
