import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCandidateDeployment } from './candidate-deployment.mjs';

const base = { id: 'example-free', name: 'Example' };
const evidence = (deployment_model, association = 'MEMBER', source = 'https://example.org/pricing') => ({
  body: JSON.stringify({ deployment_model, source }),
  author_association: association,
});

test('canonical ten-field candidate waits for explicit trusted evidence', () => {
  assert.equal(resolveCandidateDeployment(base, []), null);
  assert.equal(resolveCandidateDeployment(base, [evidence('cloud', 'NONE')]), null);
  assert.equal(resolveCandidateDeployment(base, [evidence('cloud', 'FIRST_TIME_CONTRIBUTOR')]), null);
});
test('trusted metadata comment propagates verified deployment model', () => {
  assert.deepEqual(resolveCandidateDeployment(base, [evidence('self-hosted')]),
    { ...base, deployment_model: 'self-hosted' });
});
test('malformed, invalid, insecure and extra-key evidence fail closed', () => {
  const comments = [
    { body: '{broken', author_association: 'MEMBER' },
    evidence('unknown'),
    evidence('cloud', 'MEMBER', 'http://example.org'),
    { body: JSON.stringify({ deployment_model: 'cloud', source: 'https://example.org', extra: true }), author_association: 'MEMBER' },
  ];
  assert.equal(resolveCandidateDeployment(base, comments), null);
});
test('newest trusted valid metadata wins', () => {
  assert.equal(resolveCandidateDeployment(base, [evidence('local'), evidence('cloud')]).deployment_model, 'cloud');
});
test('legacy optional model is preserved without comment or inference', () => {
  const old = { ...base, deployment_model: 'hybrid' };
  assert.equal(resolveCandidateDeployment(old, []), old);
});
