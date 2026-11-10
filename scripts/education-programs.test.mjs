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
test('education page is a compact searchable category-like directory with canonical SEO', () => {
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
    for (const id of ['education-search','education-audience','education-benefit','education-sort','education-clear','education-results','education-empty']) {
      assert.ok(html.includes('id="' + id + '"'), 'Missing education control ' + id);
    }
    assert.equal((html.match(/class="education-card" data-education-id="/g) || []).length, input.length);
    assert.match(html, /class="education-disclosure"><summary>Eligibility &amp; important details/);
    assert.match(html, /data-benefit-type="credit"/);
    assert.match(html, /data-audiences="student teacher"/);
    assert.match(html, /<link rel="canonical" href="https:\/\/free-tier\.eplus\.dev\/education\/"/);
    assert.ok(read('sitemap.xml').includes('https://free-tier.eplus.dev/education/'));
    assert.ok(read('llms.txt').includes('Education benefits'));
    const css = read('assets/site.css');
    assert.match(css, /\.education-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
    assert.match(css, /@media\(max-width:820px\)\{\.education-grid\{grid-template-columns:minmax\(0,1fr\)\}\}/);
    const script = read('assets/education.js');
    assert.match(script, /new URLSearchParams\(location\.search\)/);
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
    assert.match(read('education/index.html'), /class="education-hero"/);
    assert.doesNotMatch(read('education/index.html'), /data-pricing-url/);
  } finally { fs.rmSync(temp, {recursive:true, force:true}); }
});
