import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const yaml = readFileSync(
  new URL("../.github/workflows/pages.yml", import.meta.url),
  "utf8",
);

test("PR builds stay isolated while main deploys and preview publisher share a Pages lock", () => {
  const concurrency = yaml.match(/^concurrency:\n(?:  .*\n)+/m)?.[0];
  assert.ok(concurrency, "Pages workflow-level concurrency must exist");
  assert.match(concurrency, /github\.event_name == 'pull_request'/);
  assert.match(concurrency, /github-pages-pr-\{0\}/);
  assert.match(concurrency, /\|\| 'github-pages'/);
  assert.match(concurrency, /cancel-in-progress: false/);
  const preview = readFileSync(new URL("../.github/workflows/publish-pr-preview.yml", import.meta.url),"utf8");
  assert.match(preview, /concurrency:\n  group: github-pages\n  cancel-in-progress: false/);
  assert.match(preview, /education\/index\.html/);
  assert.match(preview, /PREVIEW_ROOT/);
  assert.match(preview, /Collected preview revision does not match current PR head/);
  assert.match(preview, /html\.includes\('id="education-service-grid"'\)/);
  assert.match(preview, /Live Education preview not available/);
  assert.match(preview, /\[Preview Education\]/);
});

test("rolling new-services README badge gets a periodic refresh without dropping main serialization", () => {
  assert.match(yaml, /schedule:\n    - cron: '7 \*\/6 \* \* \*'/);
  assert.match(yaml, /test -s dist\/badges\/new-48h\.svg/);
});

test("Pages deploy remains restricted to main and requires a successful build", () => {
  assert.match(yaml, /push:\n    branches: \[main\]/);
  assert.match(yaml, /if: github\.ref == 'refs\/heads\/main' && github\.event_name != 'pull_request'/);
  assert.match(yaml, /needs: build/);
  assert.match(yaml, /environment:\n      name: github-pages/);
});

test("Pages deployment retries once but never masks a failed deployment", () => {
  assert.match(yaml, /continue-on-error: true/);
  assert.match(yaml, /if: steps\.deployment\.outcome == 'failure'/);
  assert.match(yaml, /id: retry_deployment/);
  assert.match(yaml, /Require a successful Pages deployment/);
  assert.match(yaml, /Both GitHub Pages deployment attempts failed/);
  assert.match(yaml, /steps\.deployment\.outputs\.page_url \|\| steps\.retry_deployment\.outputs\.page_url/);
});

test("PR preview checkout uses one safe with block and full main history", () => {
  const preview = readFileSync(
    new URL("../.github/workflows/publish-pr-preview.yml", import.meta.url),
    "utf8",
  );
  const checkout = preview.match(
    /      - uses: actions\/checkout@v7\n([\s\S]*?)(?=      - uses: actions\/setup-node@v7)/,
  )?.[1];
  assert.ok(checkout, "preview must checkout a known main ref");
  assert.equal((checkout.match(/^        with:/gm) || []).length, 1);
  assert.match(checkout, /          ref: main\n/);
  assert.match(checkout, /          fetch-depth: 0\n/);
  assert.match(preview, /github\.event\.workflow_run\.event == 'pull_request'/);
  assert.match(preview, /github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(preview, /Never execute code from the PR artifact/);
});
