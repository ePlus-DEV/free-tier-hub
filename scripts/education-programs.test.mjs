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
    assert.match(html, /<link rel="canonical" href="https:\/\/free-tier\.eplus\.dev\/education\/"/);
    assert.ok(read('sitemap.xml').includes('https://free-tier.eplus.dev/education/'));
    assert.ok(read('llms.txt').includes('Education benefits'));
    const filter = read('assets/education.js');
    assert.ok(filter.includes('new URLSearchParams(location.search)'));
    assert.ok(filter.includes("card.hidden = !(matchAudience && matchBenefit)"));
  } finally { fs.rmSync(temp, {recursive:true, force:true}); }
});
