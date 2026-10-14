import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build, tag } from './build-site.mjs';

test('directory exposes unique search/category controls and official sources for every service', () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'directory-design-'));
  try {
    const result = build(output);
    const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
    const raw = JSON.parse(fs.readFileSync(new URL('../data/services.json', import.meta.url), 'utf8'));
    const entries = Array.isArray(raw) ? raw : raw.services;
    assert.equal(result.service_count, entries.length);
    for (const id of ['search', 'category-filter', 'service-grid', 'sort', 'filter-no-card', 'filter-commercial']) {
      assert.equal(html.split(`id="${id}"`).length - 1, 1, `${id} must have one owner`);
    }
    assert.match(html, /<form[^>]+id="directory-search-form"[^>]+role="search"/);
    assert.match(html, /type="submit"[^>]+class="search-submit"/);
    assert.match(html, /class="category-shortcuts"[^>]+aria-label="Popular categories"/);
    assert.doesNotMatch(html, /class="catalog-sidebar"/);
    assert.doesNotMatch(html, /class="hero-discovery"/);
    assert.equal((html.match(/class="official-link"/g) || []).length, entries.length);
    assert.doesNotMatch(html, /href=""/);
    for (const entry of entries) {
      assert.ok(html.includes(`class="official-link" href="${tag(entry.pricing_url)}"`), entry.id);
      assert.ok(fs.existsSync(path.join(output, 'service', entry.id, 'index.html')), entry.id);
    }
  } finally { fs.rmSync(output, { recursive: true, force: true }); }
});
