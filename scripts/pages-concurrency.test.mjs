import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const yaml = readFileSync(
  new URL("../.github/workflows/pages.yml", import.meta.url),
  "utf8",
);

test("Pages workflow separates PR build concurrency from serialized main deploys", () => {
  const concurrency = yaml.match(/^concurrency:\n(?:  .*\n)+/m)?.[0];
  assert.ok(concurrency, "workflow-level concurrency must exist");
  assert.match(concurrency, /group: github-pages-\$\{\{ github\.ref \}\}/);
  assert.match(concurrency, /cancel-in-progress: false/);
  assert.doesNotMatch(concurrency, /cancel-in-progress: true/);
});

test("Pages deploy remains restricted to main and requires a successful build", () => {
  assert.match(yaml, /push:\n    branches: \[main\]/);
  assert.match(yaml, /if: github\.ref == 'refs\/heads\/main' && github\.event_name != 'pull_request'/);
  assert.match(yaml, /needs: build/);
  assert.match(yaml, /environment:\n      name: github-pages/);
});
