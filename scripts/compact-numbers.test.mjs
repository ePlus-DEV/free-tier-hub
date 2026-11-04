import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { compactNumber, compactQuantityText } from '../site/assets/compact-numbers.js';
import { build } from './build-site.mjs';
import { loadServices } from './catalog-source.mjs';

test('dotted thousands below 100K, then compact 100K/1M without rounding quotas up', () => {
  for (const [input, expected] of [
    [0, '0'], [999, '999'], [1000, '1.000'], [1001, '1.001'],
    [9999, '9.999'], [10_000, '10.000'], [25_500, '25.500'],
    [99_999, '99.999'], [100_000, '100K'],
    [100_100, '100.1K'], [123_456, '123.4K'],
    [999_999, '999.9K'], [1_000_000, '1M'],
    [1_250_000, '1.25M'], [1_234_567, '1.23M'],
    [999_999_999, '999.99M'], [1_000_000_000, '1B'],
    [2_500_000_000, '2.5B'], [1_000_000_000_000, '1T'],
    [Number.MAX_SAFE_INTEGER + 1, String(Number.MAX_SAFE_INTEGER + 1)]
  ]) assert.equal(compactNumber(input), expected, 'Incorrect compact display for ' + input);
});

test('thousand groups and large quotas format without modifying URLs, dates, IPs or versions', () => {
  for (const [input, expected] of [
    ['1000 requests/month', '1.000 requests/month'],
    ['1,000 requests/month', '1.000 requests/month'],
    ['1.000 requests/month', '1.000 requests/month'],
    ['10,000 requests/month', '10.000 requests/month'],
    ['25000 operations/day', '25.000 operations/day'],
    ['99.999 operations/day', '99.999 operations/day'],
    ['1,000,000 requests/month', '1M requests/month'],
    ['1.000.000 requests/month', '1M requests/month'],
    ['100.000 requests/day', '100K requests/day'],
    ['100,000 requests/day', '100K requests/day'],
    ['1000000/month, 250000 operations/day', '1M/month, 250K operations/day'],
    ['999,999 reads/month', '999.9K reads/month'],
    ['1,250,000 events and 2.500.000 writes', '1.25M events and 2.5M writes'],
    ['$1,000,000 yearly and 100000 VND', '$1M yearly and 100K VND'],
    ['99,999 events and 1,000 events', '99.999 events and 1.000 events'],
    ['1,000.50 USD', '1,000.50 USD'],
    ['Updated in 2026', 'Updated in 2026'],
    ['192.168.100.200', '192.168.100.200'],
    ['Release v1.250.000', 'Release v1.250.000'],
    ['https://example.com/quota/1000000', 'https://example.com/quota/1000000'],
    ['1,000,000.50 USD', '1,000,000.50 USD'],
    ['Last checked 2026-11-04', 'Last checked 2026-11-04'],
  ]) assert.equal(compactQuantityText(input), expected, input);
});

test('static service HTML shortens only displayed quotas; full values remain available', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fth-compact-ui-'));
  try {
    const original = loadServices()[0];
    const item = { ...original, id: 'synthetic-compact-quota', name: 'Synthetic Compact Quota',
      free_limit: '1,000,000 requests/month and 100.000 events/month and 1000 tasks/day',
      watch_out: 'Service may pause after 999,999 events/month; check provider.',
      last_checked: '2026-11-04' };
    const source = path.join(tmp, 'catalog-fixture.json');
    fs.writeFileSync(source, JSON.stringify([item]));
    const out = path.join(tmp, 'built');
    build(out, 'https://free-tier.eplus.dev/', source);
    const read = file => fs.readFileSync(path.join(out, file), 'utf8');
    const home = read('index.html');
    const detail = read('service/' + item.id + '/index.html');
    const search = JSON.parse(read('search/index.json'));
    const catalog = JSON.parse(read('catalog.json'));

    for (const html of [home, detail]) {
      assert.ok(html.includes('1M requests/month and 100K events/month and 1.000 tasks/day'));
      assert.ok(html.includes('999.9K events/month'));
      assert.ok(html.includes('title="1,000,000 requests/month and 100.000 events/month and 1000 tasks/day"'));
      assert.ok(html.includes('aria-label="1,000,000 requests/month and 100.000 events/month and 1000 tasks/day"'));
    }
    assert.equal(catalog[0].free_limit, item.free_limit);
    assert.equal(catalog[0].watch_out, item.watch_out);
    assert.ok(search.rows[0].at(-1).includes('1,000,000 requests/month'));
    assert.ok(detail.includes('1,000,000 requests/month and 100.000 events/month and 1000 tasks/day'),
      'Structured metadata must preserve exact values');
    assert.match(home, /<script type="module" src="[^"]*assets\/compare\.js\?v=/);
    assert.ok(read('assets/compact-numbers.js').includes('export function compactNumber'));
    assert.ok(read('assets/compare.js').includes('var same = originals.every'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
