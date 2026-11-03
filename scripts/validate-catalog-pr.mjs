#!/usr/bin/env node
// PR guard: contributed catalog changes must edit canonical shards, not the
// generated compatibility aggregate. This catches old monolithic fork PRs
// before the automatic sync could silently discard their contribution.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function validateChangedPaths(paths) {
  if (paths.includes('data/services.json')) {
    throw Error('data/services.json is generated and must not be edited by a PR. '
      + 'Keep the original PR/author, update its branch, restore the aggregate, '
      + 'and move the proposed service to data/services/<category>/<id>.json.');
  }
  for (const item of paths.filter(p => p.startsWith('data/services/'))) {
    if (!/^data\/services\/[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*\.json$/.test(item)) {
      throw Error('Invalid service shard filename in PR: ' + item);
    }
  }
  return true;
}

export function main() {
  if (process.env.GITHUB_EVENT_NAME !== 'pull_request') return;
  const base = process.env.GITHUB_BASE_REF || 'main';
  if (!/^[A-Za-z0-9._-]+$/.test(base)) throw Error('Unsafe base branch ref');
  const files = execFileSync('git',
    ['diff', '--name-only', '--diff-filter=ACDMRT', `refs/remotes/origin/${base}...HEAD`],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim().split('\n').filter(Boolean);
  validateChangedPaths(files);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) { console.error('Catalog source guard: ' + error.message); process.exitCode = 1; }
}
