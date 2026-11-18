import assert from 'node:assert/strict';
import test from 'node:test';
import { eligibleForAutoMerge, eligibleTrustedNewService, successfulChecks, changedOnlyCandidate }
  from './catalog-gated-auto-merge.mjs';

const item = { id: 'example-local', category: 'search', plan: 'ongoing',
  deployment_model: 'local', credit_card: 'no', commercial_use: 'yes',
  pricing_url: 'https://github.com/example/example-local' };

test('only explicitly eligible open source local/self-hosted candidates can auto-merge', () => {
  assert.ok(eligibleForAutoMerge(item));
  assert.ok(eligibleForAutoMerge({ ...item, deployment_model: 'self-hosted' }));
  for (const change of [
    { plan: 'limited-duration' }, { deployment_model: 'cloud' },
    { credit_card: 'check' }, { commercial_use: 'check' },
    { pricing_url: 'https://example.com/pricing' },
  ]) assert.equal(eligibleForAutoMerge({ ...item, ...change }), false);
});
test('both exact-head PR CI workflows are required', () => {
  const head = 'abc';
  const runs = ['Validate free tier catalog', 'Build and deploy GitHub Pages']
    .map(name => ({ name, head_sha: head, event: 'pull_request',
      status: 'completed', conclusion: 'success' }));
  assert.ok(successfulChecks(runs, head));
  assert.equal(successfulChecks(runs, 'def'), false);
  assert.equal(successfulChecks(runs.slice(0, 1), head), false);
  assert.equal(successfulChecks(runs.map(x => ({ ...x, event: 'push' })), head), false);
  assert.equal(successfulChecks([...runs, {
    ...runs[0], id: 20, created_at: '2026-11-18T10:00:00Z', conclusion: 'failure',
  }], head), false);
  assert.equal(successfulChecks([...runs, {
    ...runs[1], id: 21, created_at: '2026-11-18T10:00:00Z', status: 'in_progress',
    conclusion: null,
  }], head), false);
});
test('only one new canonical service shard is allowed', () => {
  const path = 'data/services/search/example-local.json';
  assert.ok(changedOnlyCandidate([{ filename: path, status: 'added' }], item));
  assert.equal(changedOnlyCandidate([{ filename: path, status: 'modified' }], item), false);
  assert.equal(changedOnlyCandidate([{ filename: path, status: 'added' },
    { filename: 'README.md', status: 'modified' }], item), false);
});

test('trusted author policy permits verified new cloud service but not unknown rights', () => {
  const cloud = { ...item, deployment_model: 'cloud', pricing_url: 'https://example.com/pricing' };
  assert.ok(eligibleTrustedNewService(cloud, 'hoangsvit'));
  assert.ok(eligibleTrustedNewService(cloud, 'eplus-bot'));
  assert.equal(eligibleTrustedNewService(cloud, 'someone-else'), false);
  assert.equal(eligibleTrustedNewService({ ...cloud, commercial_use: 'check' }, 'hoangsvit'), false);
  assert.equal(eligibleTrustedNewService({ ...cloud, credit_card: 'check' }, 'eplus-bot'), false);
  assert.equal(eligibleTrustedNewService({ ...cloud, credit_card: 'yes' }, 'eplus-bot'), false);
  assert.equal(eligibleTrustedNewService({ ...cloud, plan: 'limited-duration' }, 'hoangsvit'), false);
});
