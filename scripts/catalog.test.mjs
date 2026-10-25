import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { CATEGORIES, categoryCountBadge, check, hasDynamicServiceBadge, render, sync, validateData } from "./catalog.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceData = JSON.parse(readFileSync(path.join(ROOT, "data/services.json"), "utf8"));

function fixture(fn) {
  const root = mkdtempSync(path.join(tmpdir(), "free-tier-hub-node-"));
  try {
    mkdirSync(path.join(root, "docs"));
    mkdirSync(path.join(root, "data"));
    cpSync(path.join(ROOT, "README.md"), path.join(root, "README.md"));
    cpSync(path.join(ROOT, "data/services.json"), path.join(root, "data/services.json"));
    for (const category of CATEGORIES) {
      cpSync(path.join(ROOT, "docs", category + ".md"), path.join(root, "docs", category + ".md"));
    }
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("CI/CD category and self-hosted Crow CI entry are correctly classified", () => {
  const entries = sourceData.filter(item => item.category === "ci-cd");
  const baseline = ["github-actions", "gitlab-ci", "circleci-free", "crow-ci"];
  for (const id of baseline) {
    assert.ok(entries.some(item => item.id === id), `Required CI/CD entry ${id} must remain classified`);
  }
  assert.equal(new Set(entries.map(item => item.id)).size, entries.length,
    "CI/CD service IDs must remain unique");
  assert.ok(CATEGORIES.includes("ci-cd"));
  assert.equal(sourceData.find(item => item.id === "crow-ci").pricing_url, "https://crowci.dev/");
  assert.equal(sourceData.filter(item => item.category === "developer-tools")
    .some(item => ["github-actions", "gitlab-ci", "circleci-free"].includes(item.id)), false);
});

test("new CI/CD entries synchronize without changing the baseline category invariants", () => {
  fixture(root => {
    const servicesPath = path.join(root, "data/services.json");
    const data = JSON.parse(readFileSync(servicesPath, "utf8"));
    const crow = data.find(item => item.id === "crow-ci");
    assert.ok(crow, "Crow CI baseline fixture must exist");
    data.push({ ...crow, id: "node-test-ci-provider", name: "Node Test CI Provider" });
    writeFileSync(servicesPath, JSON.stringify(data, null, 2) + "\n");
    assert.throws(() => check(root), /Out of sync/);
    assert.ok(sync(root) >= 1);
    assert.equal(check(root), CATEGORIES.length + 1);
    assert.match(readFileSync(path.join(root, "docs/ci-cd.md"), "utf8"), /Node Test CI Provider/);
    assert.equal(sync(root), 0);
  });
});

test("Node generator matches committed Markdown exactly", () => {
  assert.equal(check(ROOT), CATEGORIES.length + 1);
  assert.equal(render(ROOT).size, CATEGORIES.length + 1);
});

test("rejects duplicate IDs, invalid URLs, unsupported plans and future dates", () => {
  const duplicate = structuredClone(sourceData);
  duplicate.push(structuredClone(duplicate[0]));
  assert.throws(() => validateData(duplicate), /duplicate service ID/);

  for (const [key, value, expected] of [
    ["pricing_url", "http://example.com", /HTTPS/],
    ["plan", "not-free", /unsupported plan/],
    ["last_checked", "2999-01-01", /future last_checked/],
    ["category", "not-a-category", /unsupported category/],
  ]) {
    const data = structuredClone(sourceData);
    data[0][key] = value;
    assert.throws(() => validateData(data), expected);
  }
});

test("rejects bulk-import placeholder descriptions", () => {
  const placeholder = structuredClone(sourceData);
  placeholder[0].free_limit = "Free offering available; review provider documentation for current limits.";
  assert.throws(() => validateData(placeholder), /placeholder free_limit/);
  placeholder[0].free_limit = "Free self-managed or open-source offering; hosting and infrastructure are not included.";
  assert.throws(() => validateData(placeholder), /placeholder free_limit/);
  placeholder[0].free_limit = sourceData[0].free_limit;
  placeholder[0].watch_out = "Self-hosting, licensing, commercial-use conditions, and infrastructure costs require independent verification before publishing.";
  assert.throws(() => validateData(placeholder), /placeholder watch_out/);
});

test("sync updates category pages while preserving dynamic README counts", () => {
  fixture(root => {
    const originalReadme = readFileSync(path.join(root, "README.md"), "utf8");
    const services = path.join(root, "data/services.json");
    const data = JSON.parse(readFileSync(services, "utf8"));
    const addition = { ...data[0], id: "node-test-service", name: "Node Test Service" };
    data.splice(3, 0, addition);
    writeFileSync(services, JSON.stringify(data, null, 2) + "\n");
    assert.throws(() => check(root), /Out of sync/);
    assert.ok(sync(root) >= 1);
    assert.equal(readFileSync(path.join(root, "README.md"), "utf8"), originalReadme);
    assert.equal(check(root), CATEGORIES.length + 1);
    assert.ok(originalReadme.includes(categoryCountBadge("static-hosting")));
    assert.throws(() => categoryCountBadge("invalid"), /Unknown category/);
    assert.ok(hasDynamicServiceBadge(readFileSync(path.join(root, "README.md"), "utf8")));
    assert.ok(hasDynamicServiceBadge(readFileSync(path.join(ROOT, "README.md"), "utf8")));
    assert.match(readFileSync(path.join(root, "docs/static-hosting.md"), "utf8"), /Node Test Service/);
    assert.equal(sync(root), 0);
  });
});
