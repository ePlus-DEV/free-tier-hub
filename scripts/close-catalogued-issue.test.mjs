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
  assert.match(workflow, /pull_request_target:/);
  assert.match(workflow, /push:\\n    branches: \\[main\\]\\n    paths:\\n      - 'data\\/services\\.json'/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /group: complete-catalog-issues/);
  assert.match(workflow, /if: .*github\\.event_name == 'pull_request_target'.*github\\.event\\.pull_request\\.merged == true/);
  assert.match(workflow, /close-linked-catalog-issue:/);
  assert.match(workflow, /close-delivered:/);
  assert.match(workflow, /if: .*github\\.event_name == 'push'.*!inputs\\.pr_number/);
  assert.match(workflow, /ref: main\\n          persist-credentials: false/);
  assert.match(workflow, /import \\{ closeCataloguedIssue \\} from '\\.\\/scripts\\/close-catalogued-issue\\.mjs'/);
  assert.match(workflow, /catalogSha = execFileSync\\('git', \\['rev-parse', 'HEAD'\\]/);
  assert.match(workflow, /catalog\\.map\\(item => item\\.id\\)/);
  assert.match(workflow, /candidate\\.id !== match\\[1\\]/);
});
