import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { proposedServiceIds, serviceIdFromChangedPath } from './catalog-pr-coverage.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('shard paths expose service identities, not generated artifacts', () => {
  assert.equal(serviceIdFromChangedPath(
    'data/services/observability/librenms-network-monitoring-self-hosted.json'),
  'librenms-network-monitoring-self-hosted');
  assert.equal(serviceIdFromChangedPath('data/services.json'), null);
  assert.equal(serviceIdFromChangedPath('docs/observability.md'), null);
  assert.equal(serviceIdFromChangedPath('data/services/observability/foo bar.json'), null);
  assert.equal(serviceIdFromChangedPath('data/services/observability/extra/file.json'), null);
  assert.equal(serviceIdFromChangedPath(null), null);
});

test('dedupe identities from any open PR, including a four-service maintainer batch', () => {
  const openPRs = [
    { number: 1735, state: 'open', head: { ref: 'fix/catalog-observability-candidates' } },
    { number: 1730, state: 'open', head: { ref: 'catalog/add-firezone-starter-free' } },
    { number: 1700, state: 'closed', head: { ref: 'catalog/add-closed-service' } },
  ];
  const files = {
    1735: [
      'data/services/observability/librenms-network-monitoring-self-hosted.json',
      'data/services/observability/lnav-local-log-navigator.json',
      'data/services/observability/monika-synthetic-monitor-local.json',
      'data/services/observability/komari-server-monitor-self-hosted.json',
    ].map(filename => ({ filename, status: 'added' })),
    1730: [{ filename: 'data/services/tunneling-networking/firezone-starter-free.json',
      status: 'added' }],
    1700: [{ filename: 'data/services/observability/closed-service.json',
      status: 'added' }]
  };
  const calls = [];
  const pending = proposedServiceIds(openPRs, pr => {
    calls.push(pr.number);
    return files[pr.number];
  });
  assert.deepEqual(calls, [1735, 1730], 'closed PRs are ignored');
  assert.equal(pending.size, 5);
  for (const id of [
    'librenms-network-monitoring-self-hosted',
    'lnav-local-log-navigator',
    'monika-synthetic-monitor-local',
    'komari-server-monitor-self-hosted',
    'firezone-starter-free',
  ]) assert.ok(pending.has(id), 'Missing active PR candidate: ' + id);
  assert.equal(pending.has('closed-service'), false);
});

test('replacements and category moves reserve both old and new ID until PR is resolved', () => {
  const ids = proposedServiceIds([{ number: 10, state: 'open' }], () => [{
    filename: 'data/services/developer-tools/new-id.json',
    previous_filename: 'data/services/developer-tools/old-id.json', status: 'renamed'
  }]);
  assert.deepEqual([...ids].sort(), ['new-id', 'old-id']);
});

test('a failed or incomplete PR file lookup fails closed, not as permission to duplicate', () => {
  assert.throws(() => proposedServiceIds([{ number: 8, state: 'open' }], () => undefined),
    /Missing changed-file list/);
  assert.throws(() => proposedServiceIds([{ number: 8, state: 'open' }], () => {
    throw Error('GitHub API request failed');
  }), /GitHub API request failed/);
});

test('both queue entry points consult changed shards, retain human review and 3-PR cap', () => {
  const consumer = fs.readFileSync(
    path.join(ROOT, '.github/workflows/catalog-backlog-consumer.yml'), 'utf8');
  const candidate = fs.readFileSync(
    path.join(ROOT, '.github/workflows/catalog-candidate-queue.yml'), 'utf8');
  for (const workflow of [consumer, candidate]) {
    assert.match(workflow, /proposedServiceIds\(openPRs, pr =>/);
    assert.match(workflow, /pulls\/.*\/files\?per_page=100/);
    assert.match(workflow, /catalog-pr-coverage\.mjs/);
  }
  assert.match(consumer, /proposedIds\.has\(id\)/);
  assert.match(consumer, /proposedIds\.has\(candidate\.id\)/);
  assert.match(consumer, /openCatalog\.length >= 3/);
  assert.match(candidate, /pending\.has\(candidate\.id\)/);
  assert.match(candidate, /\[ "\$open_count" -ge 3 \]/);
  assert.match(candidate, /gh pr create --draft/);
  assert.doesNotMatch(candidate, /gh pr merge/);
  assert.match(consumer, /cron: '23 \* \* \* \*'/);
});
