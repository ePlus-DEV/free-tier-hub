import assert from "node:assert/strict";
import test from "node:test";
import {
  ageDays, publicHttps, inspectUrl, entryResult, audit, report,
} from "./audit-sources.mjs";

const sample = {
  id: "sample-free", name: "Sample Free", category: "databases",
  pricing_url: "https://example.com/pricing", last_checked: "2026-08-01",
  credit_card: "check", commercial_use: "check",
};
const headers = location => ({ get: key => key === "location" ? location : null });
const response = (status, location = null) => ({
  status, headers: headers(location), body: { cancel: async () => {} },
});

test("age checks use calendar UTC and never update last_checked", () => {
  assert.equal(ageDays("2026-10-01", "2026-10-12"), 11);
  assert.equal(ageDays("2026-10-12", "2026-10-12"), 0);
  assert.equal(ageDays("2026-10-13", "2026-10-12"), 0);
  assert.equal(ageDays("not-a-date", "2026-10-12"), null);
});

test("only safe public HTTPS targets are fetched", async () => {
  assert.equal(publicHttps("https://docs.example.com/pricing"), true);
  for (const url of ["http://example.com", "https://localhost/path",
    "https://127.0.0.1/", "https://user:pass@example.com",
    "https://provider.internal/", "https://provider.local/", "https://example.com:8443/"]) {
    assert.equal(publicHttps(url), false, url);
    const result = await inspectUrl(url, () => { throw Error("must not fetch"); });
    assert.equal(result.status, "invalid_url");
  }
});

test("200 means only reachable; 404 broken; 403 and 429 restricted", async () => {
  for (const [status, expected] of [
    [200, "reachable"], [404, "not_found"], [410, "not_found"],
    [403, "restricted"], [429, "restricted"], [500, "http_error"],
  ]) {
    const found = await inspectUrl(sample.pricing_url, async () => response(status));
    assert.equal(found.status, expected);
    assert.equal(found.http_status, status);
  }
});

test("HTTPS redirects are followed; redirects to internal or HTTP targets are blocked", async () => {
  const visited = [];
  const valid = await inspectUrl(sample.pricing_url, async url => {
    visited.push(url);
    return visited.length === 1
      ? response(301, "https://example.com/free")
      : response(200);
  });
  assert.equal(valid.status, "reachable");
  assert.equal(visited.length, 2);
  assert.equal(valid.final_url, "https://example.com/free");

  const unsafe = await inspectUrl(sample.pricing_url, async () => response(302, "http://localhost/"));
  assert.equal(unsafe.status, "unsafe_redirect");
});

test("stale/unknown flags raise human-review priority but do not claim pricing verification", () => {
  const r = entryResult(sample, { status: "reachable", http_status: 200 }, "2026-10-12");
  assert.equal(r.priority, "high");
  assert.equal(r.stale, true);
  assert.equal(r.needs_card_review, true);
  assert.equal(r.last_checked, "2026-08-01");
  const recent = entryResult({ ...sample, last_checked: "2026-10-11",
    credit_card: "no", commercial_use: "yes" },
    { status: "reachable", http_status: 200 }, "2026-10-12");
  assert.equal(recent.priority, "routine");
});

test("same official URL is fetched only once for multiple services", async () => {
  let called = 0;
  const results = await audit([sample, { ...sample, id: "sample-free-two" }], {
    request: async () => { called++; return response(200); },
    today: "2026-10-12", concurrency: 5,
  });
  assert.equal(called, 1);
  assert.equal(results.length, 2);
});

test("offline report is explicitly unverified and emits all entries", async () => {
  const results = await audit([sample], { offline: true, today: "2026-10-12" });
  const result = report(results, "2026-10-12 00:00:00", true);
  assert.equal(result.stats.not_checked, 1);
  assert.equal(result.stats.unknown, 1);
  assert.match(result.markdown, /NOT a pricing or terms verification/);
  assert.match(result.markdown, /Sample Free/);
  assert.match(result.markdown, /last_checked/);
});
