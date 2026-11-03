import assert from 'node:assert/strict';
import test from 'node:test';
import { candidateIssueNumber, safeEvent, trustedIssue }
  from './catalog-event-auto-merge.mjs';

test('only canonical bot PRs provide a candidate Issue', () => {
  assert.equal(candidateIssueNumber('Automated delivery from candidate issue #42. Catalog generation passed.'), 42);
  assert.equal(candidateIssueNumber('Fixes #42'), null);
  assert.equal(candidateIssueNumber('some text Automated delivery from candidate issue #42.'), null);
});
test('only successful PR workflow completions can enter merge gate', () => {
  const run = {name:'Validate free tier catalog',event:'pull_request',status:'completed',conclusion:'success'};
  assert.equal(safeEvent(run), true);
  assert.equal(safeEvent({...run, event:'push'}), false);
  assert.equal(safeEvent({...run, conclusion:'failure'}), false);
  assert.equal(safeEvent({...run, name:'random workflow'}), false);
});
test('candidate must be an open trusted Issue for the exact service ID', () => {
  const issue = {state:'open',author_association:'MEMBER',title:'[catalog-candidate] foo'};
  assert.equal(trustedIssue(issue,'foo'), true);
  assert.equal(trustedIssue({...issue,author_association:'NONE'},'foo'),false);
  assert.equal(trustedIssue({...issue,state:'closed'},'foo'),false);
  assert.equal(trustedIssue({...issue,title:'[catalog-candidate] bar'},'foo'),false);
});
