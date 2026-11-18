#!/usr/bin/env node
// Trusted reconciliation gate. Run ONLY from the checked-out main on a
// successful PR workflow_run, five-minute schedule, or manual dispatch.
// Never checkout or execute code from an untrusted pull request.
import { execFileSync } from 'node:child_process';
import { eligibleTrustedNewService, successfulChecks, changedOnlyCandidate } from './catalog-gated-auto-merge.mjs';
import { validateCandidate } from './catalog.mjs';
import { parseCandidateIssue } from './catalog-issue-format.mjs';
import { resolveCandidateDeployment } from './candidate-deployment.mjs';
import { candidateCollisions, dedupMessage } from './catalog-dedup.mjs';
import { loadServices } from './catalog-source.mjs';

const repo = process.env.GITHUB_REPOSITORY;
const runId = process.env.CI_RUN_ID;
const eventName = process.env.GITHUB_EVENT_NAME;

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
export function eligiblePRForEvaluation(pr, fullName, headSha = null, linkedNumbers = []) {
  return pr.state === 'open' && pr.base?.ref === 'main' &&
    pr.head?.repo?.full_name === fullName &&
    ['hoangsvit', 'eplus-bot'].includes(pr.user?.login) &&
    (!headSha || pr.head.sha === headSha) &&
    (!linkedNumbers.length || linkedNumbers.includes(pr.number));
}
function sameData(a, b) {
  return JSON.stringify(Object.entries(a).sort()) ===
    JSON.stringify(Object.entries(b).sort());
}
function unchangedMain(checkedOutMain) {
  return api('git/ref/heads/main').object.sha === checkedOutMain;
}
function blockedByReview(pr) {
  if ((pr.labels || []).some(label => String(label.name || '').toLowerCase() === 'do-not-merge')) {
    return 'do-not-merge label';
  }
  const reviews = paged('pulls/' + pr.number + '/reviews?per_page=100');
  if (reviews.some(review => review.state === 'CHANGES_REQUESTED')) {
    return 'CHANGES_REQUESTED review';
  }
  return null;
}
async function evaluateCandidate(listed, checkedOutMain) {
  const pr = api('pulls/' + listed.number);
  // Ready PRs are also eligible for a retry after an interrupted Draft-to-Ready
  // transition. All original Issue, file, data, and CI gates still apply.
  if (pr.merged || pr.state !== 'open' || !eligiblePRForEvaluation(pr, repo) ||
      pr.head.sha !== listed.head.sha) {
    console.log('PR #' + listed.number + ' changed or is no longer eligible');
    return false;
  }
  if (pr.mergeable !== true) {
    console.log('PR #' + pr.number + ' is conflicted or mergeability is pending');
    return false;
  }
  const blocker = blockedByReview(pr);
  if (blocker) {
    console.log('PR #' + pr.number + ' blocked by ' + blocker);
    return false;
  }
  const author = pr.user.login;
  const changed = paged('pulls/' + pr.number + '/files?per_page=100');
  if (changed.length !== 1 || changed[0].status !== 'added' ||
      !/^data\/services\/[a-z0-9-]+\/[a-z0-9-]+\.json$/.test(changed[0].filename)) {
    console.log('Not a single new service shard; manual review retained');
    return false;
  }
  const path = changed[0].filename;
  const blob = api('contents/' + path + '?ref=' + pr.head.sha);
  if (blob.type !== 'file' || blob.encoding !== 'base64') throw Error('Invalid PR blob');
  const actual = JSON.parse(Buffer.from(blob.content, 'base64').toString('utf8'));
  validateCandidate(actual);
  if (!changedOnlyCandidate(changed, actual)) throw Error('Unexpected PR diff');
  const issueNumber = candidateIssueNumber(pr.body);
  if (author === 'eplus-bot') {
    // Bot PRs must be traceable to an independently verified trusted Issue.
    if (!issueNumber || pr.head.ref !== 'catalog/add-' + actual.id) {
      console.log('Bot PR missing canonical candidate Issue/branch; manual review');
      return false;
    }
    const issue = api('issues/' + issueNumber);
    const original = parseCandidateIssue(issue.body || '');
    validateCandidate(original);
    if (!trustedIssue(issue, original.id)) throw Error('Candidate Issue trust mismatch');
    const evidence = paged('issues/' + issueNumber + '/comments?per_page=100');
    const candidate = resolveCandidateDeployment(original, evidence);
    if (!candidate) { console.log('Missing trusted deployment evidence'); return false; }
    validateCandidate(candidate);
    if (!sameData(candidate, actual)) throw Error('PR diverges from trusted Issue');
  }
  const overlaps = candidateCollisions(actual, loadServices());
  if (overlaps.length) {
    console.log('Manual duplicate review retained: ' + dedupMessage(actual, overlaps));
    return false;
  }
  if (!eligibleTrustedNewService(actual, author)) {
    console.log('Unverified card/commercial permissions; manual review retained');
    return false;
  }
  const runs = api('actions/runs?head_sha=' + pr.head.sha +
    '&event=pull_request&per_page=100').workflow_runs;
  if (!successfulChecks(runs, pr.head.sha)) {
    console.log('Required exact-head CI has not passed or was superseded');
    return false;
  }
  // A different candidate may have merged since main was checked out.
  // Never evaluate the next PR against an outdated catalog snapshot.
  if (!unchangedMain(checkedOutMain)) {
    console.log('main moved since checkout; retry with a fresh snapshot');
    return false;
  }
  const before = api('pulls/' + pr.number);
  if (before.head.sha !== pr.head.sha || before.state !== 'open' ||
      before.base.sha !== pr.base.sha || before.mergeable !== true ||
      blockedByReview(before)) {
    console.log('PR state, reviews or head changed before merge');
    return false;
  }
  if (before.draft) {
    gh(['pr', 'ready', String(pr.number), '--repo', repo]);
  }
  const ready = api('pulls/' + pr.number);
  if (ready.state !== 'open' || ready.draft || ready.head.sha !== pr.head.sha ||
      ready.base.sha !== pr.base.sha || blockedByReview(ready) ||
      !unchangedMain(checkedOutMain)) {
    throw Error('PR/main changed after ready-for-review; merge aborted');
  }
  // GitHub's merge API and --match-head-commit enforce the final SHA lease.
  gh(['pr', 'merge', String(pr.number), '--repo', repo, '--squash',
    '--match-head-commit', pr.head.sha]);
  console.log('Merged verified catalog PR #' + pr.number);
  return true;
}

async function main() {
  if (!repo || !['workflow_run', 'schedule', 'workflow_dispatch'].includes(eventName)) {
    throw Error('Missing trusted workflow context');
  }
  let exactHead = null;
  let linkedNumbers = [];
  if (eventName === 'workflow_run') {
    if (!/^\d+$/.test(runId || '')) throw Error('Missing completed CI run identifier');
    const run = api('actions/runs/' + runId);
    if (!safeEvent(run)) {
      console.log('Not a successful catalog PR CI run; no merge');
      return;
    }
    exactHead = run.head_sha;
    linkedNumbers = (run.pull_requests || []).map(link => link.number);
  }
  const checkedOutMain = execFileSync('git', ['rev-parse', 'HEAD'],
    { encoding: 'utf8' }).trim();
  if (!unchangedMain(checkedOutMain)) {
    console.log('main advanced after checkout; next run will re-evaluate safely');
    return;
  }
  const candidates = paged('pulls?state=open&per_page=100')
    .filter(pr => eligiblePRForEvaluation(pr, repo, exactHead, linkedNumbers))
    .sort((a, b) => a.number - b.number);
  if (!candidates.length) {
    console.log('No exact-head trusted catalog PRs to inspect');
    return;
  }
  for (const candidate of candidates) {
    try {
      // Process one successful merge per run; latest main and catalog are
      // reloaded on the next CI completion or scheduled reconciliation.
      if (await evaluateCandidate(candidate, checkedOutMain)) return;
    } catch (err) {
      console.error('PR #' + candidate.number + ' reconciliation failed:', err);
      process.exitCode = 1;
    }
  }
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'))) {
  main().catch(err => { console.error(err); process.exitCode = 1; });
}
