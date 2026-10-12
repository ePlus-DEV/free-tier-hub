#!/usr/bin/env node
// Node.js catalog CLI for fork contributors. Requires Node >=20, no packages.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CATEGORIES = [
  "static-hosting", "app-hosting", "serverless", "cloud-vps",
  "databases", "storage", "developer-tools", "auth-security",
  "observability", "analytics", "dns-cdn", "ai-ml",
  "queues-jobs", "search", "feature-flags", "tunneling-networking", "webhooks-events",
];
const PLANS = {
  ongoing: "Ongoing free allowance",
  "monthly-credit": "Recurring free credit",
  "limited-duration": "Time-limited",
  "temporary-resource": "Temporary resource",
};
const CARDS = { yes: "Required", no: "Not required", check: "Check provider" };
const COMMERCIAL = { yes: "Allowed", no: "Restricted / personal use", check: "Check provider" };
const FIELDS = [
  "id", "name", "category", "plan", "free_limit", "watch_out",
  "pricing_url", "credit_card", "commercial_use", "last_checked",
];
const NAV = "| Category | Services | Browse |";
const CATEGORY = "| Service | Plan | Free allowance | Important caveat | Card | Commercial use |";
const read = (root, file) => fs.readFileSync(path.join(root, file), "utf8");
const cell = v => String(v).replaceAll("\\", "\\\\").replaceAll("|", "\\|").replaceAll("\n", " ");
const row = values => "| " + values.map(cell).join(" | ") + " |";

function replaceTable(text, header, rows, filename) {
  const lines = text.split("\n");
  const indices = lines.flatMap((line, i) => line.trim() === header ? [i] : []);
  if (indices.length !== 1) throw Error(filename + ": expected exactly one table headed " + header);
  const start = indices[0];
  if (!/^[|:\- ]+$/.test((lines[start + 1] || "").trim())) {
    throw Error(filename + ": missing table separator");
  }
  let end = start + 2;
  while (end < lines.length && lines[end].trim().startsWith("|")) end++;
  return [...lines.slice(0, start + 2), ...rows.map(row), ...lines.slice(end)].join("\n");
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function validateData(data, today = new Date().toISOString().slice(0, 10)) {
  if (!Array.isArray(data) || data.length === 0) throw Error("Catalog must be a nonempty array");
  const ids = new Set(), errors = [];
  for (const [index, item] of data.entries()) {
    const where = "Entry #" + (index + 1);
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(where + ": not a service object");
      continue;
    }
    const missing = FIELDS.filter(key => !Object.hasOwn(item, key));
    if (missing.length) {
      errors.push(where + ": missing " + missing.join(", "));
      continue;
    }
    const id = item.id;
    if (typeof id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      errors.push(where + ": invalid kebab-case ID");
    } else if (ids.has(id)) {
      errors.push(id + ": duplicate service ID");
    }
    ids.add(id);
    for (const key of ["name", "free_limit", "watch_out"]) {
      if (typeof item[key] !== "string" || !item[key].trim()) errors.push(String(id) + ": invalid " + key);
    }
    if (!CATEGORIES.includes(item.category)) errors.push(String(id) + ": unsupported category");
    if (!Object.hasOwn(PLANS, item.plan)) errors.push(String(id) + ": unsupported plan");
    for (const key of ["credit_card", "commercial_use"]) {
      if (!Object.hasOwn(CARDS, item[key])) errors.push(String(id) + ": invalid " + key);
    }
    try {
      const u = new URL(item.pricing_url);
      if (u.protocol !== "https:" || !u.hostname || u.username || u.password) throw Error();
    } catch { errors.push(String(id) + ": pricing_url must be official HTTPS"); }
    if (!validDate(item.last_checked) || item.last_checked > today) errors.push(String(id) + ": invalid or future last_checked");
    if (Object.hasOwn(item, "added_at") && (!validDate(item.added_at) || item.added_at > today)) {
      errors.push(String(id) + ": invalid or future added_at");
    }
  }
  if (errors.length) throw Error(errors.join("\n"));
  return data;
}

export function render(root = DEFAULT_ROOT) {
  const data = validateData(JSON.parse(read(root, "data/services.json")));
  const counts = Object.fromEntries(CATEGORIES.map(category => [
    category, data.filter(item => item.category === category).length,
  ]));
  let readme = read(root, "README.md");
  const lines = readme.split("\n");
  const start = lines.findIndex(line => line.trim() === NAV);
  if (start < 0) throw Error("README.md: category navigation is missing");
  const navRows = [];
  for (let i = start + 2; i < lines.length && lines[i].startsWith("|"); i++) {
    const parts = lines[i].trim().slice(1, -1).split("|").map(v => v.trim());
    const match = parts.length === 3 && /^\[Browse\]\(docs\/([a-z-]+)\.md\)$/.exec(parts[2]);
    if (!match || !CATEGORIES.includes(match[1])) throw Error("README.md: invalid category link");
    navRows.push([parts[0], String(counts[match[1]]), parts[2]]);
  }
  if (navRows.length !== CATEGORIES.length ||
      new Set(navRows.map(v => v[2])).size !== CATEGORIES.length) {
    throw Error("README.md: missing or repeated category");
  }
  readme = replaceTable(readme, NAV, navRows, "README.md");
  if ((readme.match(/services-\d+-brightgreen/g) || []).length !== 1) {
    throw Error("README.md: expected one service-count badge");
  }
  readme = readme.replace(/services-\d+-brightgreen/, "services-" + data.length + "-brightgreen");
  const output = new Map([["README.md", readme]]);
  for (const category of CATEGORIES) {
    const filename = "docs/" + category + ".md";
    const rows = data.filter(item => item.category === category).map(item => [
      "[" + item.name + "](" + item.pricing_url + ")",
      PLANS[item.plan], item.free_limit, item.watch_out,
      CARDS[item.credit_card], COMMERCIAL[item.commercial_use],
    ]);
    output.set(filename, replaceTable(read(root, filename), CATEGORY, rows, filename));
  }
  return output;
}

export function check(root = DEFAULT_ROOT) {
  const output = render(root);
  const outOfSync = [...output].filter(([file, body]) => read(root, file) !== body).map(([file]) => file);
  if (outOfSync.length) throw Error("Out of sync: " + outOfSync.join(", ") + "; run npm run catalog:sync");
  return output.size;
}

export function sync(root = DEFAULT_ROOT) {
  const output = render(root);
  const modified = [...output].filter(([file, body]) => read(root, file) !== body);
  for (const [file, body] of modified) {
    fs.writeFileSync(path.join(root, file), body, "utf8");
    console.log("Updated " + file);
  }
  console.log("Catalog synchronized: " + modified.length + " file(s) changed");
  return modified.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  const root = process.argv[3]?.startsWith("--root=") ? path.resolve(process.argv[3].slice(7)) : DEFAULT_ROOT;
  try {
    if (command === "sync") sync(root);
    else if (command === "check" || command === "validate") {
      console.log("PASS: " + check(root) + " catalog documents match valid source data");
    } else {
      console.error("Usage: node scripts/catalog.mjs sync|check|validate [--root=/path]");
      process.exitCode = 2;
    }
  } catch (err) {
    console.error("FAIL: " + err.message);
    process.exitCode = 1;
  }
}
