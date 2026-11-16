import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cataloguedIssueComment, closeCataloguedIssue } from './close-catalogued-issue.mjs';

const example = cataloguedIssueComment('vercel', 'Completed by merged PR #24.');
const marker = '<!-- free-tier-hub-catalog-delivery:vercel -->';

function mockedApi(initialState = 'open', existingMarker = false) {
  const calls = [];
  let state = initialState;
  const run = (command, args) => {
    calls.push([command, args]);
    if (args[0] === 'api' && args[1] === 'repos/org/repo/issues/253') return state;
    if (args[0] === 'api' && args[1] === 'repos/org/repo/issues/253/comments')
      return existingMarker ? '12345' : '';
    if (args[0] === 'issue' && args[1] === 'close') state = 'closed';
    return '';
  };
  return { calls, run, get state() { return state; } };
}

test('completion comment uses one shared SVG and a service-specific URL', () => {
  assert.ok(example.startsWith(marker));
  const detail = 'https://free-tier.eplus.dev/service/vercel/';
  const badge = 'https://free-tier.eplus.dev/badges/listed.svg';
  assert.ok(example.includes('**Your Free Tier Hub listing:** ' + detail));
  assert.ok(example.includes('<a href="' + detail + '" target="_blank"'));
  assert.ok(example.includes('<img src="' + badge + '"'));
  assert.ok(example.includes('[![Listed on Free Tier Hub](' + badge + ')](' + detail + ')'));
  const other = cataloguedIssueComment('github-pages', 'Completed.');
  assert.ok(other.includes('/service/github-pages/'));
  assert.ok(!other.includes('/service/vercel/'));
  assert.throws(() => cataloguedIssueComment('../escape', ''), /Invalid service ID/);
});

test('posts badge instructions before closing the Issue', () => {
  const mock = mockedApi();
  assert.equal(closeCataloguedIssue('org/repo', 253, example, mock.run), 'closed');
  assert.deepEqual(mock.calls.map(x => x[1].slice(0, 2)), [
    ['api', 'repos/org/repo/issues/253'],
    ['api', 'repos/org/repo/issues/253/comments'],
    ['issue', 'comment'],
    ['issue', 'close'],
  ]);
  assert.equal(mock.state, 'closed');
  assert.ok(mock.calls[2][1].includes(example));
});

test('existing delivery comment is not duplicated during retry', () => {
  const mock = mockedApi('open', true);
  assert.equal(closeCataloguedIssue('org/repo', 253, example, mock.run), 'closed');
  assert.ok(!mock.calls.some(x => x[1][0] === 'issue' && x[1][1] === 'comment'));
});

test('already-closed Issue is not commented on again', () => {
  const mock = mockedApi('closed');
  assert.equal(closeCataloguedIssue('org/repo', 253, example, mock.run), 'already-closed');
  assert.equal(mock.calls.length, 1);
});

test('concurrent closure is tolerated only after confirming closed via API', () => {
  const calls = [];
  let count = 0;
  const run = (_command, args) => {
    calls.push(args);
    if (args[0] === 'api' && args[1].endsWith('/comments')) return '';
    if (args[0] === 'api') return ++count === 1 ? 'open' : 'closed';
    if (args[0] === 'issue' && args[1] === 'close') throw Error('close failed');
    return '';
  };
  assert.equal(closeCataloguedIssue('org/repo', 253, example, run), 'already-closed');
  assert.ok(calls.some(x => x[0] === 'issue' && x[1] === 'comment'));
});

test('failed close while Issue remains open is fatal', () => {
  const run = (_command, args) => {
    if (args[0] === 'api' && args[1].endsWith('/comments')) return '';
    if (args[0] === 'api') return 'open';
    if (args[0] === 'issue' && args[1] === 'close') throw Error('close failed');
    return '';
  };
  assert.throws(() => closeCataloguedIssue('org/repo', 253, example, run), /close failed/);
});

test('comment failure leaves the Issue open', () => {
  const calls = [];
  const run = (_command, args) => {
    calls.push(args);
    if (args[0] === 'api' && args[1].endsWith('/comments')) return '';
    if (args[0] === 'api') return 'open';
    if (args[0] === 'issue' && args[1] === 'comment') throw Error('comment denied');
    throw Error('Should not close Issue without badge comment');
  };
  assert.throws(() => closeCataloguedIssue('org/repo', 253, example, run), /comment denied/);
  assert.ok(!calls.some(x => x[0] === 'issue' && x[1] === 'close'));
});

test('GitHub API state failure is fatal', () => {
  const run = () => { throw Error('GitHub API unavailable'); };
  assert.throws(() => closeCataloguedIssue('org/repo', 253, example, run), /GitHub API unavailable/);
});

test('completion helper rejects messages without an idempotency marker', () => {
  assert.throws(() => closeCataloguedIssue('org/repo', 253, 'plain message'), /needs a service marker/);
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
  assert.ok(workflow.includes("const message = cataloguedIssueComment(id, 'Completed by merged PR '"));
  assert.ok(workflow.includes('const message = cataloguedIssueComment(match[1]'));
  assert.equal((workflow.match(/closeCataloguedIssue\\(repo/g) || []).length, 2);
  assert.ok(workflow.includes('ref: main\\n          persist-credentials: false'));
  assert.ok(workflow.includes('candidate.id') || workflow.includes('.id // empty'));
  assert.ok(!workflow.includes('gh issue close "$issue" --reason completed'));

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
