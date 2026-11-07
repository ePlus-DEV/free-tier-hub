import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadServices } from './catalog-source.mjs';
import { validateData } from './catalog.mjs';
import { relatedServiceMap, MAX_RELATED_SERVICES } from './service-relations.mjs';
import { build } from './build-site.mjs';

test('relations use canonical IDs and resolve in both directions across categories and offer types', () => {
  const catalog = validateData(loadServices());
  const related = relatedServiceMap(catalog);
  assert.deepEqual(related.get('chatgpt-free').map(x => x.id),
    ['openai-for-startups-api-credits']);
  assert.deepEqual(related.get('openai-for-startups-api-credits').map(x => x.id),
    ['chatgpt-free']);
  assert.deepEqual(related.get('gemini-api').map(x => x.id),
    ['gemini-app-free']);
  assert.deepEqual(related.get('github-actions').map(x => x.id),
    ['github-pages']);
  assert.deepEqual(related.get('openai-for-startups-api-credits').map(x => x.plan),
    ['ongoing']);
  assert.deepEqual(related.get('chatgpt-free').map(x => x.plan),
    ['limited-duration']);
  assert.deepEqual(related.get('claude-free'), [],
    'unrelated brand/keywords must not be inferred');
});

test('related service references fail closed on invalid or invented links', () => {
  const origin = [
    { id: 'first', name: 'First', related_services: ['second'] },
    { id: 'second', name: 'Second' },
  ];
  assert.deepEqual(relatedServiceMap(origin).get('second').map(x => x.id), ['first']);
  const invalid = [
    ['missing', ['invented']],
    ['self', ['first']],
    ['duplicate', ['second', 'second']],
    ['bad syntax', ['../../second']],
    ['not an array', 'second'],
    ['too many links', Array(MAX_RELATED_SERVICES + 1).fill('second')],
  ];
  for (const [label, value] of invalid) {
    const data = origin.map(item => ({ ...item }));
    data[0].related_services = value;
    assert.throws(() => relatedServiceMap(data), undefined, label);
  }
  const hub = { id: 'hub', name: 'Hub' };
  const crowded = [hub, ...Array.from({ length: MAX_RELATED_SERVICES + 1 }, (_, i) =>
    ({ id: 'leaf-' + i, name: 'Leaf ' + i, related_services: ['hub'] }))];
  assert.throws(() => relatedServiceMap(crowded), /more than/);
});

test('static detail pages link related services reciprocally, without altering main list and SEO scope', () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'free-tier-relations-'));
  try {
    build(output);
    const read = file => fs.readFileSync(path.join(output, file), 'utf8');
    const chatgpt = read('service/chatgpt-free/index.html');
    const credits = read('service/openai-for-startups-api-credits/index.html');
    const app = read('service/gemini-app-free/index.html');
    const api = read('service/gemini-api/index.html');
    const actions = read('service/github-actions/index.html');
    const pages = read('service/github-pages/index.html');
    const unrelated = read('service/claude-free/index.html');
    assert.match(chatgpt, /aria-labelledby="related-services-heading"/);
    assert.match(chatgpt, /href="https:\/\/free-tier\.eplus\.dev\/service\/openai-for-startups-api-credits\/"/);
    assert.match(chatgpt, /AI &amp; ML · Time-limited offer/);
    assert.match(credits, /href="https:\/\/free-tier\.eplus\.dev\/service\/chatgpt-free\/"/);
    assert.match(app, /href="https:\/\/free-tier\.eplus\.dev\/service\/gemini-api\/"/);
    assert.match(api, /href="https:\/\/free-tier\.eplus\.dev\/service\/gemini-app-free\/"/);
    assert.match(actions, /href="https:\/\/free-tier\.eplus\.dev\/service\/github-pages\/"/);
    assert.match(pages, /href="https:\/\/free-tier\.eplus\.dev\/service\/github-actions\/"/);
    assert.doesNotMatch(unrelated, /class="related-services"/);
    assert.match(chatgpt, /Limits and eligibility are separate/);
    assert.match(read('assets/site.css'), /\.related-service-link:focus-visible/);
    assert.match(read('sitemap.xml'), /service\/openai-for-startups-api-credits\//);
    assert.ok(!read('index.html').includes('class="related-services"'),
      'related links belong only to details, never the lazy home list');
    const index = JSON.parse(read('search/index.json'));
    assert.ok(index.rows.every(row => row.length === 10),
      'do not bloat lazy search index');
  } finally {
    fs.rmSync(output, { recursive: true, force: true });
  }
});
