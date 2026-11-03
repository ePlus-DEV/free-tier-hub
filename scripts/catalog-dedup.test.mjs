import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizedName, normalizedURL, candidateCollisions,
  assertNoExactDuplicate } from './catalog-dedup.mjs';

const existing = {id:'alpha-tool',category:'developer-tools',name:'Alpha Tool',
  pricing_url:'https://www.example.com/pricing/?utm_source=github'};
const base = {id:'alpha-cloud',category:'app-hosting',name:'Alpha Tool',
  pricing_url:'https://example.com/pricing/'};

test('same normalized product name is blocked even in a different category', () => {
  const hits = candidateCollisions(base, [existing]);
  assert.deepEqual(hits.map(h => [h.id,h.category,h.reason,h.severity]),
    [['alpha-tool','developer-tools','same-name','block']]);
  assert.throws(() => assertNoExactDuplicate(base,[existing]), /alpha-tool \[developer-tools/);
});
test('same canonical URL with different product is flagged, not silently rejected', () => {
  const candidate = {...base,name:'Different Product'};
  const hits = assertNoExactDuplicate(candidate,[existing]);
  assert.equal(hits[0].reason,'shared-url');
  assert.equal(hits[0].severity,'review');
});
test('URL cleanup strips tracking, www and trailing slashes but preserves product paths', () => {
  assert.equal(normalizedURL('https://www.Example.com/pricing/?utm_source=x&ref=y'),
    'example.com/pricing');
  assert.notEqual(normalizedURL('https://example.com/products/a'),
    normalizedURL('https://example.com/products/b'));
  assert.notEqual(normalizedURL('https://example.com/?plan=a'),
    normalizedURL('https://example.com/?plan=b'));
});
test('normalization ignores punctuation/casing without fuzzy unrelated matches', () => {
  assert.equal(normalizedName(' ALPHA--Tool! '), normalizedName('alpha tool'));
  assert.deepEqual(candidateCollisions({...base,name:'Beta Tool',
    pricing_url:'https://different.example/free'},[existing]),[]);
});
test('one existing ID is excluded for legitimate modifications', () => {
  assert.deepEqual(candidateCollisions(existing,[existing]),[]);
});
