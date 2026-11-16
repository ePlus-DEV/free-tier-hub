import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from './build-site.mjs';

test('one static badge embeds canonical links for individual service details', () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'free-tier-listing-badge-'));
  try {
    build(output);
    const image = fs.readFileSync(path.join(output, 'badges/listed.svg'), 'utf8');
    const artwork = fs.readFileSync(new URL('../site/assets/listed.svg', import.meta.url), 'utf8');
    assert.equal(image, artwork, 'the deployed image must be shared, not generated per provider');
    assert.match(image, /Listed on Free Tier Hub/);
    assert.match(image, /width="182" height="44"/);
    assert.ok(!fs.existsSync(path.join(output, 'badges/listed')),
      'no per-provider badge assets should be generated');

    for (const id of ['vercel', 'github-pages']) {
      const html = fs.readFileSync(path.join(output, 'service', id, 'index.html'), 'utf8');
      const canonical = 'https://free-tier.eplus.dev/service/' + id + '/';
      const badge = 'https://free-tier.eplus.dev/badges/listed.svg';
      assert.ok(html.includes('data-listing-url="' + canonical + '"'),
        'the copied code must link to the correct service: ' + id);
      assert.ok(html.includes('data-badge-url="' + badge + '"'));
      assert.ok(html.includes('<img class="listing-badge-preview" src="' + badge + '"'));
      assert.equal((html.match(/data-copy-listing-badge/g) || []).length, 1);
      assert.ok(!html.includes('/badges/listed/' + id + '.svg'));
    }
    const client = fs.readFileSync(path.join(output, 'assets/site.js'), 'utf8');
    assert.match(client, /navigator.clipboard.writeText\(snippet\)/);
    assert.match(client, /document.execCommand\("copy"\)/);
  } finally {
    fs.rmSync(output, {recursive: true, force: true});
  }
});
