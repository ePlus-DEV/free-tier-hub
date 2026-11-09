import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEducationPrograms, loadEducationPrograms } from './education-programs.mjs';
import { build } from './build-site.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = loadEducationPrograms();
test('education benefits are independently sourced and schema validated', () => {
  assert.ok(input.length >= 5);
  assert.deepEqual(validateEducationPrograms(input), input);
  assert.ok(input.some(x => x.audiences.includes('teacher')));
  assert.ok(input.some(x => x.benefit_type === 'credit'));
  assert.ok(input.every(x => x.last_checked && x.source_url.startsWith('https://')));
});
test('education source validation rejects invalid fields and duplicates', () => {
  const item = structuredClone(input[0]);
  assert.throws(() => validateEducationPrograms([item, item]), /duplicate/);
  assert.throws(() => validateEducationPrograms([{...item, source_url:'http://example.com'}]), /HTTPS/);
  assert.throws(() => validateEducationPrograms([{...item, audiences:['invented']}]), /audience/);
  assert.throws(() => validateEducationPrograms([{...item, last_checked:'2030-01-01'}]), /review date/);
  assert.throws(() => validateEducationPrograms([{...item, benefit_type:'recurring'}]), /type/);
});
test('education landing has independent counts, shareable audience filters and canonical SEO', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fth-education-'));
  try {
    const result = build(temp);
    const read = p => fs.readFileSync(path.join(temp, p), 'utf8');
    const html = read('education/index.html');
    const stats = JSON.parse(read('catalog-stats.json'));
    const catalog = JSON.parse(read('catalog.json'));
    const subset = JSON.parse(read('education-programs.json'));
    assert.equal(subset.length, input.length);
    assert.equal(stats.total_services, catalog.length);
    assert.equal(result.service_count, catalog.length);
    assert.ok(!catalog.some(x => x.id === 'azure-for-students'));
    assert.ok(html.includes('id="education-audience"') && html.includes('id="education-benefit"'));
    assert.match(html, /data-audiences="student teacher"/);
    assert.match(html, /data-benefit-type="credit"/);
    // Shared service-card headers require 3 direct children, matching CSS grid columns.
    // A previous two-child header placed the provider title inside the 36px icon column.
    assert.equal((html.match(/class="service-card education-card"/g) || []).length, input.length);
    assert.match(html, /class="card-top"><span class="service-icon" aria-hidden="true">/);
    assert.match(html, /<\/span><div class="card-identity"><h3>/);
    assert.match(html, /<\/span><\/div><span class="badge education-badge">/);
    assert.doesNotMatch(html, /class="education-identity"/);
    const css = read('assets/site.css');
    assert.match(css, /#education-service-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
    assert.match(css, /@media\(max-width:820px\)\{#education-service-grid\{grid-template-columns:minmax\(0,1fr\)\}\}/);
    assert.match(css, /\.education-card \.card-top>\.card-identity\{grid-column:2;grid-row:1/);
    assert.match(css, /\.education-card \.card-top>\.badge\{grid-column:3;grid-row:1/);
    assert.match(html, /<link rel="canonical" href="https:\/\/free-tier\.eplus\.dev\/education\/"/);
    assert.ok(read('sitemap.xml').includes('https://free-tier.eplus.dev/education/'));
    assert.ok(read('llms.txt').includes('Education benefits'));
    const filter = read('assets/education.js');
    assert.ok(filter.includes('new URLSearchParams(location.search)'));
    assert.ok(filter.includes("card.hidden = !(matchAudience && matchBenefit)"));
  } finally { fs.rmSync(temp, {recursive:true, force:true}); }
});

test('Education Benefits is reachable from Home chips and the offer filter without changing catalog totals', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fth-education-navigation-'));
  try {
    const result = build(temp);
    const read = p => fs.readFileSync(path.join(temp, p), 'utf8');
    const home = read('index.html');
    const stats = JSON.parse(read('catalog-stats.json'));
    const programs = JSON.parse(read('education-programs.json'));
    assert.equal(stats.total_services, result.service_count);
    assert.equal(programs.length, input.length);
    assert.match(home, /class="category-chip education-program-chip" href="https:\/\/free-tier\.eplus\.dev\/education\/"/);
    assert.match(home, /<option value="education">Education benefits \(/);
    assert.match(home, /href="https:\/\/free-tier\.eplus\.dev\/education\/" id="education-filter-destination"/);
    assert.match(home, /class="education-filter-link"/);
    // Only the catalog total and visible count belong in the compact results summary.
    const heading = home.match(/<div class="directory-heading">([\s\S]*?)<div class="service-grid"/);
    assert.ok(heading, 'Home renders a directory heading');
    assert.match(heading[1], /<span class="result-label">All services<\/span><strong class="result-total">/);
    assert.match(heading[1], /<span class="result-shown">Showing /);
    assert.doesNotMatch(heading[1], /<a\b|limited offers|startup programs|education benefits/i,
      'Do not clutter the result count with category/program links');
    const runtime = read('assets/site.js');
    assert.match(runtime, /offerSelect\.value === "education"/);
    assert.match(runtime, /window\.location\.assign\(document\.getElementById\("education-filter-destination"\)\.href\)/);
    assert.ok(runtime.indexOf('window.location.assign(document.getElementById("education-filter-destination").href)') <
      runtime.indexOf('offerType = offerSelect.value;'), 'navigate before filtering general free tiers');
    assert.match(read('assets/site.css'), /\.education-program-chip/);
    assert.match(read('education/index.html'), /id="education-audience"/);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
