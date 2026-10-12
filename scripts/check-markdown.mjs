#!/usr/bin/env node
// Structural Markdown validation complementing the catalog generator.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, validateData } from './catalog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLANS = {
  ongoing: 'Ongoing free allowance', 'monthly-credit': 'Recurring free credit',
  'limited-duration': 'Time-limited', 'temporary-resource': 'Temporary resource',
};
const CARDS = { yes: 'Required', no: 'Not required', check: 'Check provider' };
const COMMERCIAL = {
  yes: 'Allowed', no: 'Restricted / personal use', check: 'Check provider',
};
const NAV = ['Category', 'Services', 'Browse'];
const CATEGORY = ['Service', 'Plan', 'Free allowance', 'Important caveat', 'Card', 'Commercial use'];
export function splitRow(line) {
  const text = line.trim();
  if (!text.startsWith('|') || !text.endsWith('|')) return null;
  return text.slice(1, -1).split(/(?<!\\)\|/).map(v => v.trim().replace(/\\\|/g, '|'));
}
const separator = values => values && values.length > 0 &&
  values.every(v => /^:?-{3,}:?$/.test(v));
export function scanTables(body, filename) {
  const lines = body.split(/\r?\n/), tables = [], errors = [];
  let fence = null;
  for (let i = 0; i < lines.length;) {
    const text = lines[i].trim();
    if (text.startsWith(String.fromCharCode(96).repeat(3)) || text.startsWith('~'.repeat(3))) {
      const char = text[0];
      if (!fence) fence = char;
      else if (fence === char) fence = null;
      i++;
      continue;
    }
    if (fence) { i++; continue; }
    const header = splitRow(lines[i]);
    if (!header) { i++; continue; }
    const divider = splitRow(lines[i + 1] || '');
    if (!separator(divider)) {
      errors.push(filename + ':' + (i + 1) + ': orphan table row (table split or missing separator)');
      i++; continue;
    }
    const width = header.length;
    if (divider.length !== width)
      errors.push(filename + ':' + (i + 2) + ': separator column count differs');
    const at = i + 1, rows = [];
    i += 2;
    while (i < lines.length) {
      const row = splitRow(lines[i]);
      if (!row) break;
      if (row.length !== width)
        errors.push(filename + ':' + (i + 1) + ': row width ' + row.length + ' != ' + width);
      if (separator(row))
        errors.push(filename + ':' + (i + 1) + ': unexpected table separator');
      rows.push(row); i++;
    }
    tables.push({ header, rows, line: at });
  }
  if (fence) errors.push(filename + ': unclosed code fence');
  return { tables, errors };
}
export function brokenLocalLinks(body, filename, root = ROOT) {
  const errors = [];
  for (const match of body.matchAll(/(?<!!)\[[^\]]+\]\(([^)]+)\)/g)) {
    const link = match[1], relative = link.split('#')[0].split('?')[0];
    if (!relative || /^(?:https?:|mailto:|tel:|\/\/)/i.test(relative) ||
        /^[a-z][a-z0-9+.-]*:/i.test(relative)) continue;
    let target;
    try { target = path.resolve(root, path.dirname(filename), decodeURIComponent(relative)); }
    catch { errors.push(filename + ': invalid local URL ' + link); continue; }
    if (!target.startsWith(path.resolve(root) + path.sep) && target !== path.resolve(root) ||
        !fs.existsSync(target)) {
      errors.push(filename + ': broken relative link ' + link);
    }
  }
  return errors;
}
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
export function validateDocuments(root, data, readme, pages) {
  const errors = [], parsed = {};
  for (const [filename, body] of Object.entries({
    'README.md': readme,
    ...Object.fromEntries(CATEGORIES.map(cat => ['docs/' + cat + '.md', pages[cat] || ''])),
  })) {
    const result = scanTables(body, filename);
    parsed[filename] = result.tables;
    errors.push(...result.errors, ...brokenLocalLinks(body, filename, root));
  }
  if (errors.length) return errors;
  const nav = parsed['README.md'].filter(t => same(t.header, NAV));
  if (nav.length !== 1 || parsed['README.md'].length !== 1) {
    errors.push('README.md: expected exactly one category navigation table');
    return errors;
  }
  const counts = Object.fromEntries(CATEGORIES.map(cat =>
    [cat, data.filter(item => item.category === cat).length]));
  if (nav[0].rows.length !== CATEGORIES.length)
    errors.push('README.md: navigation category count mismatch');
  CATEGORIES.forEach((cat, i) => {
    const row = nav[0].rows[i];
    if (!row || row.length !== 3 || row[1] !== String(counts[cat]) ||
        row[2] !== '[Browse](docs/' + cat + '.md)') {
      errors.push('README.md: invalid navigation count or link for ' + cat);
    }
  });
  const badge = /services-(\d+)-brightgreen/.exec(readme);
  if (!badge || Number(badge[1]) !== data.length)
    errors.push('README.md: service-count badge out of sync');
  if (/!\[License\]\([^)]*contributions-welcome/.test(readme))
    errors.push('README.md: incorrect License badge');
  for (const cat of CATEGORIES) {
    const filename = 'docs/' + cat + '.md', tables = parsed[filename], subset = data.filter(item => item.category === cat);
    if (tables.length !== 1 || !same(tables[0].header, CATEGORY)) {
      errors.push(filename + ': expected exactly one six-column table'); continue;
    }
    const rows = tables[0].rows;
    if (rows.length !== subset.length)
      errors.push(filename + ': expected ' + subset.length + ' service rows, got ' + rows.length);
    for (let i = 0; i < Math.min(rows.length, subset.length); i++) {
      const item = subset[i];
      const expected = [
        '[' + item.name + '](' + item.pricing_url + ')',
        PLANS[item.plan], item.free_limit, item.watch_out,
        CARDS[item.credit_card], COMMERCIAL[item.commercial_use],
      ];
      if (!same(rows[i], expected))
        errors.push(filename + ': service row ' + (i + 1) + ' differs from JSON (' + item.id + ')');
    }
  }
  return errors;
}
export function checkDocuments(root = ROOT) {
  const data = validateData(JSON.parse(fs.readFileSync(path.join(root, 'data/services.json'), 'utf8')));
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const pages = {};
  for (const cat of CATEGORIES)
    pages[cat] = fs.readFileSync(path.join(root, 'docs', cat + '.md'), 'utf8');
  const errors = validateDocuments(root, data, readme, pages);
  if (errors.length) throw Error(errors.join('\n'));
  return data.length;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log('PASS: ' + checkDocuments() + ' catalog entries and Markdown pages'); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
