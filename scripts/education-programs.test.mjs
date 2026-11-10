import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEducationPrograms, loadEducationPrograms } from './education-programs.mjs';
import { build, tag } from './build-site.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = loadEducationPrograms();

test('education benefits are canonical independent shards, not an editable monolith', () => {
  const dir = path.join(ROOT, 'data/education');
  const names = fs.readdirSync(dir).filter(name => name.endsWith('.json')).sort();
  assert.equal(input.length, names.length);
  assert.ok(input.length >= 20);
  assert.ok(!fs.existsSync(path.join(ROOT, 'data/education-programs.json')));
  assert.deepEqual(names, input.map(item => item.id + '.json').sort());
  assert.deepEqual(validateEducationPrograms(input), input);
  assert.ok(input.some(item => item.audiences.includes('teacher')));
  assert.ok(input.some(item => item.benefit_type === 'credit'));
  assert.ok(input.every(item => item.last_checked && item.source_url.startsWith('https://')));
});
test('education schema rejects duplicates and unsafe or invalid sources', () => {
  const item = structuredClone(input[0]);
  assert.throws(() => validateEducationPrograms([item, item]), /duplicate/);
  assert.throws(() => validateEducationPrograms([{...item, source_url:'http://example.com'}]), /HTTPS/);
  assert.throws(() => validateEducationPrograms([{...item, audiences:['invented']}]), /audience/);
  assert.throws(() => validateEducationPrograms([{...item, last_checked:'2030-01-01'}]), /review date/);
  assert.throws(() => validateEducationPrograms([{...item, benefit_type:'recurring'}]), /type/);
});
test('education loader rejects incorrectly named shards to prevent silent duplicates', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fth-education-shards-'));
  try {
    const dir = path.join(temp, 'data/education');
    fs.mkdirSync(dir, {recursive:true});
    fs.writeFileSync(path.join(dir, 'wrong-name.json'), JSON.stringify(input[0]));
    assert.throws(() => loadEducationPrograms(temp), /file name must match ID/);
    fs.renameSync(path.join(dir, 'wrong-name.json'), path.join(dir, input[0].id + '.json'));
    assert.deepEqual(loadEducationPrograms(temp), [input[0]]);
  } finally { fs.rmSync(temp, {recursive:true, force:true}); }
});
test('Education reuses category and service UI components, preserves filters, feed and SEO', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fth-education-'));
  try {
    const result = build(temp);
    const read = p => fs.readFileSync(path.join(temp, p), 'utf8');
    const html = read('education/index.html');
    const stats = JSON.parse(read('catalog-stats.json'));
    const catalog = JSON.parse(read('catalog.json'));
    const subset = JSON.parse(read('education-programs.json'));
    assert.deepEqual(subset, input);
    assert.equal(stats.total_services, catalog.length);
    assert.equal(result.service_count, catalog.length);
    assert.ok(!catalog.some(x => x.id === 'azure-for-students'));
    for (const id of ['education-tools','education-search','education-audience','education-benefit',
      'education-sort','education-filter-details','education-filter-active','education-clear',
      'education-results','education-empty']) {
      assert.ok(html.includes('id="' + id + '"'), 'Missing education control ' + id);
    }
    assert.match(html, /class="page-intro"/);
    assert.match(html, /class="category-tools" id="education-tools"/);
    assert.match(html, /class="category-tools-primary"/);
    assert.match(html, /class="category-filter-details"/);
    assert.match(html, /class="category-search-field"/);
    assert.match(html, /class="category-sort-field"/);
    assert.match(html, /class="service-grid category-service-grid" id="education-service-grid"/);
    assert.equal((html.match(/class="service-card" data-education-id="/g) || []).length, input.length);
    assert.match(html, /class="card-top"><span class="service-icon"/);
    assert.match(html, /class="allowance-block"><span class="card-label">Education benefit/);
    assert.match(html, /class="restriction-block"><span class="card-label">Who qualifies/);
    assert.match(html, /class="card-bottom"/);
    assert.doesNotMatch(html, /class="education-conditions"/);
    assert.match(html, /View details/);
    assert.match(html, /href="https:\/\/free-tier\.eplus\.dev\/education\/github-copilot-student\/"/);
    assert.doesNotMatch(html, /class="education-hero"|class="education-grid"|class="education-card"/);
    assert.match(html, /data-benefit-type="credit"/);
    assert.match(html, /data-audiences="student teacher"/);
    assert.match(html, /<link rel="canonical" href="https:\/\/free-tier\.eplus\.dev\/education\/"/);
    assert.ok(read('sitemap.xml').includes('https://free-tier.eplus.dev/education/'));
    // Every canonical education shard gets a stable, directly linked internal detail.
    const sitemap = read('sitemap.xml');
    const urls = [...html.matchAll(/<a href="https:\/\/free-tier\.eplus\.dev\/education\/([a-z0-9-]+)\/"/g)]
      .map(match => match[1]);
    assert.ok(urls.includes('github-copilot-student'));
    for (const program of input) {
      const relative = 'education/' + program.id + '/';
      const url = 'https://free-tier.eplus.dev/' + relative;
      assert.ok(sitemap.includes('<loc>' + url + '</loc>'), 'Education page absent from sitemap: ' + program.id);
      const detail = read(relative + 'index.html');
      assert.ok(detail.includes('<link rel="canonical" href="' + url + '"'), 'Missing canonical: ' + program.id);
      assert.match(detail, /class="detail-layout"/);
      assert.match(detail, /class="detail-highlight"/);
      assert.match(detail, /class="spec-list"/);
      assert.match(detail, /class="detail-warning"/);
      assert.match(detail, /Back to Education benefits/);
      assert.ok(detail.includes(program.source_url.replaceAll('&', '&amp;').replaceAll('"', '&quot;')) ||
        detail.includes(program.source_url), 'Missing first-party link: ' + program.id);
      for (const field of [program.benefit, program.eligibility, program.duration, program.restrictions]) {
        // Compare with the same HTML escaping used by the static renderer.
        assert.ok(detail.includes(tag(field)), 'Missing detail data for ' + program.id);
      }
    }
    assert.ok(read('llms.txt').includes('Education benefits'));
    const css = read('assets/site.css');
    assert.match(css, /\.service-grid,\.category-service-grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
    assert.doesNotMatch(css, /\.education-grid\{|\.education-hero\{|\.education-toolbar\{/);
    const script = read('assets/education.js');
    assert.match(script, /new URLSearchParams\(location\.search\)/);
    assert.match(script, /tools.hidden = false/);
    assert.match(script, /search\.addEventListener\('input', update\)/);
    assert.match(script, /matchAudience && matchBenefit && matchSearch/);
    assert.match(script, /history\.replaceState/);
  } finally { fs.rmSync(temp, {recursive:true, force:true}); }
});
test('Education navigation remains available without altering ordinary service totals', () => {
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
    assert.match(home, /id="education-filter-destination"/);
    assert.match(read('education/index.html'), /class="page-intro"/);
    assert.doesNotMatch(read('education/index.html'), /data-pricing-url/);
  } finally { fs.rmSync(temp, {recursive:true, force:true}); }
});
