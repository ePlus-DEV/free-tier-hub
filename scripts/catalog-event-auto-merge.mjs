#!/usr/bin/env node
// Trusted event-driven gate. Run ONLY from main on workflow_run completed.
// Never checkout or execute code from a pull request.
import { execFileSync } from 'node:child_process';
import { eligibleForAutoMerge, successfulChecks, changedOnlyCandidate } from './catalog-gated-auto-merge.mjs';
import { validateCandidate } from './catalog.mjs';
import { resolveCandidateDeployment } from './candidate-deployment.mjs';

const repo = process.env.GITHUB_REPOSITORY;
const runId = process.env.CI_RUN_ID;

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
}
function api(endpoint) {
  return JSON.parse(gh(['api', 'repos/' + repo + '/' + endpoint]));
}
function paged(endpoint) {
  return JSON.parse(gh(['api', '--paginate', '--slurp',
    'repos/' + repo + '/' + endpoint])).flat();
}
export function candidateIssueNumber(body) {
  const match = /^Automated delivery from candidate issue #(\d+)\./.exec(body || '');
  return match ? Number(match[1]) : null;
}
export function safeEvent(run) {
  return run.event === 'pull_request' && run.status === 'completed' &&
    run.conclusion === 'success' &&
    ['Validate free tier catalog', 'Build and deploy GitHub Pages'].includes(run.name);
}
export function trustedIssue(issue, id) {
  return issue.state === 'open' && !issue.pull_request &&
    issue.title === '[catalog-candidate] ' + id &&
    ['OWNER', 'MEMBER', 'COLLABORATOR'].includes(issue.author_association);
}
function sameData(a, b) {
  return JSON.stringify(Object.entries(a).sort()) ===
    JSON.stringify(Object.entries(b).sort());
}

async function main() {
  if (!repo || !/^\d+$/.test(runId || '')) throw Error('Missing trusted workflow context');
  const run = api('actions/runs/' + runId);
  if (!safeEvent(run)) {
    console.log('Not a successful catalog PR CI run; no merge');
    return;
  }
  // The bot may have created a PR after its initial push. Resolve through the
  // REST workflow PR references and verify the actual current commit below.
  const prs = paged('pulls?state=open&per_page=100')
    .filter(pr => pr.base.ref === 'main' &&
      pr.head.repo?.full_name === repo &&
      pr.head.ref.startsWith('catalog/add-') &&
      pr.head.sha === run.head_sha &&
      (!(run.pull_requests || []).length ||
       run.pull_requests.some(link => link.number === pr.number)));
  if (prs.length !== 1) {
    console.log('No single same-repository exact-head catalog PR linked to CI run');
    return;
  }
  const pr = api('pulls/' + prs[0].number);
  if (pr.merged || pr.state !== 'open' || !pr.draft ||
      pr.head.sha !== run.head_sha || pr.base.ref !== 'main') {
    console.log('PR changed, already processed, or not Draft');
    return;
  }
  const issueNumber = candidateIssueNumber(pr.body);
  if (!issueNumber) {
    console.log('Not a canonical bot-generated candidate PR; manual review retained');
    return;
  }
  const issue = api('issues/' + issueNumber);
  const original = JSON.parse(issue.body || '{}');
  validateCandidate(original);
  if (!trustedIssue(issue, original.id) ||
      pr.head.ref !== 'catalog/add-' + original.id) {
    throw Error('Candidate Issue identity or author trust mismatch');
  }
  const evidence = paged('issues/' + issueNumber + '/comments?per_page=100');
  const candidate = resolveCandidateDeployment(original, evidence);
  if (!candidate) {
    console.log('Missing verified deployment evidence; keep Draft');
    return;
  }
  validateCandidate(candidate);
  if (!eligibleForAutoMerge(candidate)) {
    console.log('Cloud/limited/restricted/unknown candidate requires review');
    return;
  }
  const changed = paged('pulls/' + pr.number + '/files?per_page=100');
  if (!changedOnlyCandidate(changed, candidate)) throw Error('Unexpected PR diff');
  // Read only the canonical JSON at the exact PR head. Do not execute it.
  const path = changed[0].filename;
  const blob = api('contents/' + path + '?ref=' + pr.head.sha);
  if (blob.type !== 'file' || blob.encoding !== 'base64') throw Error('Invalid PR blob');
  const actual = JSON.parse(Buffer.from(blob.content, 'base64').toString('utf8'));
  if (!sameData(candidate, actual)) throw Error('PR contents diverge from trusted Issue');
  const latest = api('pulls/' + pr.number);
  if (latest.head.sha !== pr.head.sha || latest.state !== 'open' || !latest.draft) {
    throw Error('Head moved during verification');
  }
  const runs = api('actions/runs?head_sha=' + pr.head.sha +
    '&event=pull_request&per_page=100').workflow_runs;
  if (!successfulChecks(runs, pr.head.sha)) {
    console.log('Other required exact-head CI is not successful yet');
    return;
  }
  // Recheck head immediately before mutation; --match-head-commit is a lease.
  const before = api('pulls/' + pr.number);
  if (before.head.sha !== pr.head.sha || before.state !== 'open' || !before.draft) {
    throw Error('PR state changed before merge');
  }
  gh(['pr', 'ready', String(pr.number), '--repo', repo]);
  gh(['pr', 'merge', String(pr.number), '--repo', repo, '--squash',
    '--match-head-commit', pr.head.sha]);
  console.log('Merged verified catalog PR #' + pr.number);
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'))) {
  main().catch(err => { console.error(err); process.exitCode = 1; });
}
