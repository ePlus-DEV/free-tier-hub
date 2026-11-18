#!/usr/bin/env node
// Trusted candidate Issue cleanup. Run only from checked-out main in the
// catalog queue (never from an Issue/PR branch or with untrusted code).
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateCandidate } from './catalog.mjs';
import { parseCandidateIssue } from './catalog-issue-format.mjs';
import { candidateCollisions, confirmedCatalogDuplicate } from './catalog-dedup.mjs';
import { loadServices } from './catalog-source.mjs';

const TRUSTED = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);
const MARKER = '<!-- free-tier-hub:duplicate-candidate:v1:';

function validTarget(repo, number) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo) ||
      !Number.isSafeInteger(number) || number < 1) throw Error('Invalid Issue target');
}

function notice(candidate, duplicate, collisions) {
  const prefix = MARKER + candidate.id + ' -->';
  if (duplicate) {
    const shard = 'data/services/' + duplicate.category + '/' + duplicate.id + '.json';
    return [prefix, '### Duplicate catalog candidate', '',
      '**No new PR is needed.** This free offer is already listed:',
      '- Existing service: [\x60' + duplicate.id + '\x60](https://github.com/' +
        process.env.GITHUB_REPOSITORY + '/blob/main/' + shard + ')',
      '- Official source: ' + duplicate.pricing_url,
      '- Existing category: \x60' + duplicate.category + '\x60',
      '- Plan: \x60' + duplicate.plan + '\x60', '',
      'The verified catalog entry uses the same normalized official URL and ' +
        'matching product identity (name or stable ID) and plan. ' +
        'This Issue is closed as a duplicate. To correct or update facts, ' +
        'propose a change to the existing service shard instead of a second listing.'].join('\n');
  }
  return [prefix, '### Potential catalog overlap — maintainer review required', '',
    'This Issue remains **open**, and no duplicate PR will be created automatically.',
    'The candidate may overlap these existing services:',
    ...collisions.map(hit => '- \x60' + hit.id + '\x60 (\x60' + hit.category + '\x60; ' +
      hit.reason + ')'), '',
    'A shared pricing page or a similar name alone does not prove identical free ' +
      'offers. Verify the actual product and plan before changing or closing this Issue.'
  ].join('\n');
}

export function processDuplicateCandidateIssue(repo, number, catalog, checkedOutSha,
  exec = execFileSync) {
  validTarget(repo, number);
  if (!Array.isArray(catalog)) throw Error('Catalog must be provided');
  const gh = args => exec('gh', args, {encoding:'utf8', maxBuffer:16*1024*1024}).trim();
  const api = endpoint => JSON.parse(gh(['api', endpoint]));
  const endpoint = 'repos/' + repo + '/issues/' + number;
  const issue = api(endpoint);
  if (issue.state === 'closed') return 'closed';
  if (issue.pull_request || issue.state !== 'open' ||
      !TRUSTED.has(issue.author_association)) throw Error('Untrusted or invalid candidate Issue');
  const candidate = validateCandidate(parseCandidateIssue(issue.body || ''));
  if (issue.title !== '[catalog-candidate] ' + candidate.id) {
    throw Error('Candidate title differs from canonical ID');
  }
  const duplicate = confirmedCatalogDuplicate(candidate, catalog);
  const collisions = candidateCollisions(candidate, catalog);
  if (!duplicate && !collisions.length) return 'new';

  // GitHub may merge another candidate while this workflow starts. A stale
  // catalog snapshot must never be used to close a live Issue.
  if (checkedOutSha !== api('repos/' + repo + '/git/ref/heads/main').object.sha) {
    throw Error('main changed during duplicate inspection; retry on fresh main');
  }
  const marker = MARKER + candidate.id + ' -->';
  const existingComments = JSON.parse(gh(['api','--paginate','--slurp',
    endpoint + '/comments?per_page=100'])).flat();
  if (!existingComments.some(comment => typeof comment.body === 'string' &&
      comment.body.includes(marker))) {
    // Use only the validated repository, Issue number and catalog identity.
    // A failed comment MUST leave the Issue open.
    const body = notice(candidate, duplicate, collisions).replace(
      'https://github.com/' + process.env.GITHUB_REPOSITORY + '/',
      'https://github.com/' + repo + '/');
    gh(['api','--method','POST',endpoint + '/comments','-f','body=' + body]);
  }

  const current = api(endpoint);
  if (current.state === 'closed') return 'closed';
  if (current.state !== 'open' ||
      JSON.stringify(parseCandidateIssue(current.body || '')) !== JSON.stringify(candidate)) {
    throw Error('Candidate changed during review; no automatic Issue closure');
  }
  if (!duplicate) return 'review';
  if (checkedOutSha !== api('repos/' + repo + '/git/ref/heads/main').object.sha) {
    throw Error('main moved before duplicate closure; retry on fresh main');
  }
  gh(['api','--method','PATCH',endpoint,'-f','state=closed','-f','state_reason=duplicate']);
  return 'duplicate';
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const repo = process.env.GITHUB_REPOSITORY;
  const number = Number(process.env.ISSUE_NUMBER);
  const sha = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const result = processDuplicateCandidateIssue(repo,number,loadServices(),sha);
  console.log('Candidate identity outcome: ' + result);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, 'outcome=' + result + '\n');
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      'Candidate identity outcome: **' + result + '**\n');
  }
}
