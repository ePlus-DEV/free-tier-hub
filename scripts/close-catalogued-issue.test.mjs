import test from 'node:test';
import assert from 'node:assert/strict';
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
