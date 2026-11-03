import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { closeCataloguedIssue } from './close-catalogued-issue.mjs';

test('closes and comments after successful close', () => {
  const calls = [];
  const run = (command, args) => { calls.push([command, args]); return ''; };
  assert.equal(closeCataloguedIssue('org/repo', 253, 'delivered', run), 'closed');
  assert.deepEqual(calls.map(x => x[1].slice(0, 2)), [
    ['issue', 'close'], ['issue', 'comment'],
  ]);
});

test('concurrent close is safe only after confirming closed via API', () => {
  const calls = [];
  const run = (_command, args) => {
    calls.push(args);
    if (args[0] === 'issue' && args[1] === 'close') throw Error('closeIssue failed');
    if (args[0] === 'api') return 'closed\n';
    throw Error('Unexpected command');
  };
  assert.equal(closeCataloguedIssue('org/repo', 253, 'delivered', run), 'already-closed');
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1], ['api', 'repos/org/repo/issues/253', '--jq', '.state']);
});

test('failed close on an open Issue remains fatal', () => {
  const run = (_command, args) => {
    if (args[0] === 'issue') throw Error('closeIssue failed');
    return 'open\n';
  };
  assert.throws(() => closeCataloguedIssue('org/repo', 253, 'delivered', run), /closeIssue failed/);
});

test('failure to confirm state remains fatal', () => {
  const run = () => { throw Error('GitHub API unavailable'); };
  assert.throws(() => closeCataloguedIssue('org/repo', 253, 'delivered', run), /GitHub API unavailable/);
});

test('comment failure remains fatal after closing the issue', () => {
  const run = (_command, args) => {
    if (args[0] === 'issue' && args[1] === 'comment') throw Error('comment denied');
    return '';
  };
  assert.throws(() => closeCataloguedIssue('org/repo', 253, 'delivered', run), /comment denied/);
});

test('merged catalog closure preserves both event-driven and catch-up pathways in one workflow', () => {
  const root = new URL('../.github/workflows/', import.meta.url);
  const workflow = fs.readFileSync(new URL('close-catalog-issue-after-merge.yml', root), 'utf8');
  assert.equal(fs.existsSync(new URL('close-delivered-catalog-issues.yml', root)), false);
  assert.ok(workflow.includes('pull_request_target:'));
  assert.ok(workflow.includes("push:\n    branches: [main]\n    paths:\n      - 'data/services.json'\n      - 'data/services/**'"));
  assert.ok(workflow.includes('workflow_dispatch:'));
  assert.ok(workflow.includes('group: complete-catalog-issues'));
  assert.ok(workflow.includes("github.event_name == 'pull_request_target' && github.event.pull_request.merged == true"));
  assert.ok(workflow.includes('close-linked-catalog-issue:'));
  assert.ok(workflow.includes('close-delivered:'));
  assert.ok(workflow.includes("github.event_name == 'push' || (github.event_name == 'workflow_dispatch' && !inputs.pr_number)"));
  assert.ok(workflow.includes('ref: main\n          persist-credentials: false'));
  assert.ok(workflow.includes("import { closeCataloguedIssue } from './scripts/close-catalogued-issue.mjs'"));
  assert.ok(workflow.includes("catalogSha = execFileSync('git', ['rev-parse', 'HEAD']"));
  assert.ok(workflow.includes("const { loadServices } = await import('./scripts/catalog-source.mjs')"));
  assert.ok(workflow.includes('const catalog = loadServices();'));
  assert.ok(workflow.includes('catalog.map(item => item.id)'));
  assert.ok(workflow.includes('candidate.id !== match[1]'));
});
