#!/usr/bin/env node
// Conservative opt-in automated delivery of trusted open-source candidates.
// Never merge hosted offers or allow stale/partial CI status to authorize merging.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const repo = process.env.GITHUB_REPOSITORY;
const prURL = process.env.PR_URL || '';
const serviceId = process.env.SERVICE_ID || '';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
}
function api(path) { return JSON.parse(gh(['api', 'repos/' + repo + '/' + path])); }
export function eligibleForAutoMerge(item) {
  return item && item.plan === 'ongoing' &&
    ['local', 'self-hosted'].includes(item.deployment_model) &&
    item.credit_card === 'no' && item.commercial_use === 'yes' &&
    /^https:\/\/github\.com\/[a-z\d_.-]+\/[a-z\d_.-]+\/?$/i.test(item.pricing_url || '');
}
export function successfulChecks(runs, head) {
  const required = ['Validate free tier catalog', 'Build and deploy GitHub Pages'];
  return required.every(name => runs.some(run =>
    run.name === name && run.head_sha === head &&
    run.event === 'pull_request' && run.status === 'completed' &&
    run.conclusion === 'success'));
}
export function changedOnlyCandidate(files, item) {
  return files.length === 1 &&
    files[0].status === 'added' &&
    files[0].filename === 'data/services/' + item.category + '/' + item.id + '.json';
}

async function main() {
  const candidate = JSON.parse(fs.readFileSync('/tmp/candidate.json', 'utf8'));
  if (!repo || !/^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+$/.test(prURL) ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(serviceId) || candidate.id !== serviceId) {
    throw Error('Invalid catalog auto-merge inputs');
  }
  if (!eligibleForAutoMerge(candidate)) {
    console.log('Manual review retained: candidate is not an eligible local/self-hosted OSS offer');
    return;
  }
  const number = Number(prURL.split('/').at(-1));
  const pr = api('pulls/' + number);
  const head = pr.head.sha;
  if (pr.state !== 'open' || pr.base.ref !== 'main' ||
      pr.head.ref !== 'catalog/add-' + serviceId || pr.head.repo.full_name !== repo ||
      pr.merged || !pr.draft) throw Error('Unexpected auto-merge PR state');
  const files = JSON.parse(gh(['api', '--paginate', '--slurp',
    'repos/' + repo + '/pulls/' + number + '/files?per_page=100'])).flat();
  if (!changedOnlyCandidate(files, candidate)) throw Error('PR must only add its canonical JSON shard');

  // Check the live exact-head statuses, not workflow success from an older PR commit.
  // A failed/timed-out CI run leaves the PR as Draft for human review.
  let passed = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    const runs = api('actions/runs?head_sha=' + head + '&event=pull_request&per_page=100').workflow_runs;
    if (successfulChecks(runs, head)) { passed = true; break; }
    if (runs.some(run => run.head_sha === head &&
      ['Validate free tier catalog', 'Build and deploy GitHub Pages'].includes(run.name) &&
      run.status === 'completed' && run.conclusion !== 'success')) {
      throw Error('Required exact-head workflow failed; leave PR Draft');
    }
    await sleep(12000);
  }
  if (!passed) throw Error('Required exact-head checks did not complete; leave PR Draft');

  const current = api('pulls/' + number);
  if (current.head.sha !== head || current.state !== 'open' || !current.draft) {
    throw Error('PR changed during verification; leave it for review');
  }
  // Revalidate changed files immediately before publishing.
  const latestFiles = JSON.parse(gh(['api', '--paginate', '--slurp',
    'repos/' + repo + '/pulls/' + number + '/files?per_page=100'])).flat();
  if (!changedOnlyCandidate(latestFiles, candidate)) throw Error('PR changed files');

  gh(['pr', 'ready', String(number), '--repo', repo]);
  // A bot/PAT merge triggers follow-up workflows (unlike GITHUB_TOKEN pushes).
  gh(['pr', 'merge', String(number), '--repo', repo, '--squash',
    '--match-head-commit', head]);
  console.log('Auto-merged verified open-source catalog PR #' + number);
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'))) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
