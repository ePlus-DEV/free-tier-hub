#!/usr/bin/env node
/**
 * Read-only external-source health and review-age audit for Free Tier Hub.
 * A successful HTTP response is NOT proof that a provider's quotas or terms match.
 * Node.js 24+, no third-party packages.
 */
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MS_DAY = 24 * 60 * 60 * 1000;
export const AGE_WARN_DAYS = 30;
export const AGE_HIGH_DAYS = 60;

export function ageDays(date, today = new Date().toISOString().slice(0, 10)) {
  const a = Date.parse(date + "T00:00:00Z");
  const b = Date.parse(today + "T00:00:00Z");
  return Number.isFinite(a) && Number.isFinite(b) ? Math.max(0, Math.floor((b - a) / MS_DAY)) : null;
}

export function publicHttps(raw) {
  try {
    const u = new URL(raw);
    const h = u.hostname.toLowerCase().replace(/\.$/, "");
    return u.protocol === "https:" && !u.username && !u.password &&
      !u.port && !!h && net.isIP(h) === 0 &&
      h !== "localhost" && !h.startsWith("[") && !h.endsWith(".localhost") && !h.endsWith(".local") &&
      !h.endsWith(".internal");
  } catch {
    return false;
  }
}

function healthFromHttp(status) {
  if (status >= 200 && status < 300) return "reachable";
  if (status === 401 || status === 403 || status === 429) return "restricted";
  if (status === 404 || status === 410) return "not_found";
  return "http_error";
}

export async function inspectUrl(raw, request = fetch, timeoutMs = 12000) {
  if (!publicHttps(raw)) return { status: "invalid_url", http_status: null, final_url: raw };
  let url = raw;
  for (let step = 0; step <= 4; step++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await request(url, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "accept": "text/html,application/xhtml+xml,*/*;q=0.5",
          "user-agent": "FreeTierHubCatalogAudit/1.0 (source link health check)",
        },
      });
      const status = response.status;
      if (response.body?.cancel) {
        try { await response.body.cancel(); } catch { /* Already consumed */ }
      }
      if (status >= 300 && status < 400) {
        const location = response.headers?.get?.("location");
        if (!location) return { status: "http_error", http_status: status, final_url: url };
        const target = new URL(location, url).href;
        if (!publicHttps(target)) {
          return { status: "unsafe_redirect", http_status: status, final_url: target };
        }
        url = target;
        continue;
      }
      return { status: healthFromHttp(status), http_status: status, final_url: url };
    } catch (error) {
      return {
        status: error?.name === "AbortError" ? "timeout" : "network_error",
        http_status: null,
        final_url: url,
        error: String(error?.message || error).slice(0, 150),
      };
    } finally {
      clearTimeout(timer);
    }
  }
  return { status: "too_many_redirects", http_status: null, final_url: url };
}

export function entryResult(item, health, today = new Date().toISOString().slice(0, 10)) {
  const age_days = ageDays(item.last_checked, today);
  const needs_card_review = item.credit_card === "check";
  const needs_commercial_review = item.commercial_use === "check";
  const stale = age_days === null || age_days >= AGE_WARN_DAYS;
  const badLink = ["not_found", "invalid_url", "unsafe_redirect"].includes(health.status);
  const priority = badLink || age_days === null || age_days >= AGE_HIGH_DAYS
    ? "high" : stale || health.status !== "reachable" ||
      needs_card_review || needs_commercial_review ? "review" : "routine";
  return {
    id: item.id, name: item.name, category: item.category,
    pricing_url: item.pricing_url, last_checked: item.last_checked,
    age_days, credit_card: item.credit_card, commercial_use: item.commercial_use,
    ...health, needs_card_review, needs_commercial_review, stale, priority,
  };
}

export async function audit(items, { request = fetch, today, concurrency = 5, timeoutMs = 12000, offline = false } = {}) {
  const urlCache = new Map();
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      const item = items[index];
      if (!urlCache.has(item.pricing_url)) {
        urlCache.set(item.pricing_url, offline
          ? Promise.resolve({ status: "not_checked", http_status: null, final_url: item.pricing_url })
          : inspectUrl(item.pricing_url, request, timeoutMs));
      }
      const health = await urlCache.get(item.pricing_url);
      results[index] = entryResult(item, health, today);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

export function report(results, checkedAt, offline = false) {
  const stats = Object.fromEntries(
    ["reachable", "restricted", "not_found", "http_error", "timeout", "network_error",
      "invalid_url", "unsafe_redirect", "too_many_redirects", "not_checked"]
      .map(key => [key, results.filter(x => x.status === key).length])
  );
  const stale = results.filter(x => x.stale).length;
  const unknown = results.filter(x => x.needs_card_review || x.needs_commercial_review).length;
  const high = results.filter(x => x.priority === "high").length;
  const escapeCell = value => String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
  const sorted = [...results].sort((a, b) => {
    const weight = { high: 0, review: 1, routine: 2 };
    return weight[a.priority] - weight[b.priority] ||
      (b.age_days ?? 9999) - (a.age_days ?? 9999) || a.id.localeCompare(b.id);
  });
  const lines = [
    "# Free Tier Hub source audit",
    "",
    "**Generated:** " + checkedAt + " UTC",
    "",
    "> **This is NOT a pricing or terms verification.** HTTP reachability only shows that a URL responded. ",
    "> A 403/429 can be bot protection, not a discontinued service. JavaScript-rendered pages and ",
    "> silent pricing changes require human inspection. Do not change last_checked from this audit alone.",
    "",
    "## Summary",
    "",
    "- Catalog entries: **" + results.length + "**",
    "- HTTP reachable: **" + stats.reachable + "**" + (offline ? " (offline mode: no HTTP checks)" : ""),
    "- URL restricted (401/403/429): **" + stats.restricted + "**",
    "- URL not found (404/410): **" + stats.not_found + "**",
    "- Other URL issues: **" + (stats.http_error + stats.timeout + stats.network_error + stats.invalid_url +
      stats.unsafe_redirect + stats.too_many_redirects) + "**",
    "- Sources last checked at least " + AGE_WARN_DAYS + " days ago: **" + stale + "**",
    "- Entries with unknown card or commercial terms: **" + unknown + "**",
    "- High-priority manual reviews: **" + high + "**",
    "",
    "## All entries (high priority first)",
    "",
    "| Service | HTTP result | Last checked | Age (days) | Card | Commercial use | Priority |",
    "| --- | --- | --- | ---: | --- | --- | --- |",
    ...sorted.map(item =>
      "| [" + escapeCell(item.name) + "](" + item.pricing_url + ") | " +
      escapeCell(item.status + (item.http_status ? " (" + item.http_status + ")" : "")) + " | " +
      escapeCell(item.last_checked) + " | " + escapeCell(item.age_days) + " | " +
      escapeCell(item.credit_card) + " | " + escapeCell(item.commercial_use) +
      " | " + item.priority + " |"
    ),
    "",
    "## Manual review procedure",
    "",
    "1. Open the official provider link, verify the exact product/plan still exists.",
    "2. Compare free_limit with published quotas, including units, reset periods, and regions.",
    "3. Confirm payment card, commercial-use rights, expiration, sleep, and excess charges.",
    "4. If official sources disagree, record both sources and leave claims marked for review.",
    "5. Only after manual verification, edit data/services.json and set last_checked to the date verified; open a reviewed PR.",
    "",
  ];
  return { stats: { entries: results.length, stale, unknown, high, ...stats }, markdown: lines.join("\n") };
}

async function main() {
  const args = process.argv.slice(2);
  const flags = Object.fromEntries(args.filter(x => x.startsWith("--") && x.includes("="))
    .map(x => x.slice(2).split(/=(.*)/s).slice(0, 2)));
  const offline = args.includes("--offline");
  const root = path.resolve(flags.root || ROOT);
  const out = path.resolve(flags.out || path.join(root, "audit-results"));
  const items = JSON.parse(fs.readFileSync(path.join(root, "data/services.json"), "utf8"));
  if (!Array.isArray(items)) throw Error("data/services.json must be an array");
  const results = await audit(items, {
    concurrency: Math.max(1, Math.min(8, Number(flags.concurrency) || 5)),
    timeoutMs: Math.max(1000, Math.min(20000, Number(flags["timeout-ms"]) || 12000)),
    offline,
  });
  const checkedAt = new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
  const { stats, markdown } = report(results, checkedAt, offline);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "report.md"), markdown + "\n", "utf8");
  fs.writeFileSync(path.join(out, "report.json"), JSON.stringify({
    generated_at: new Date().toISOString(), http_checked: !offline, stats, entries: results,
  }, null, 2) + "\n", "utf8");
  console.log("Catalog source audit: " + JSON.stringify(stats));
  console.log("Reports: " + out + "/report.md and report.json");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error("Source audit failed:", err);
    process.exitCode = 1;
  });
}
