import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { CATEGORIES, check, render, sync, validateData } from "./catalog.mjs";

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

test("sync updates README counts and category pages, preserving manual prose", () => {
  fixture(root => {
    const services = path.join(root, "data/services.json");
    const data = JSON.parse(readFileSync(services, "utf8"));
    const addition = { ...data[0], id: "node-test-service", name: "Node Test Service" };
    data.splice(3, 0, addition);
    writeFileSync(services, JSON.stringify(data, null, 2) + "\n");
    assert.throws(() => check(root), /Out of sync/);
    assert.ok(sync(root) >= 2);
    assert.equal(check(root), CATEGORIES.length + 1);
    assert.match(readFileSync(path.join(root, "README.md"), "utf8"), new RegExp(`services-${data.length}-brightgreen`));
    assert.match(readFileSync(path.join(root, "docs/static-hosting.md"), "utf8"), /Node Test Service/);
    assert.equal(sync(root), 0);
  });
});
