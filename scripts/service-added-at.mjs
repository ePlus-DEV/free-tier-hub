import { execFileSync } from 'node:child_process';
import path from 'node:path';

const COMMIT_MARKER = '@@FREE_TIER_CATALOG_COMMIT@@';

/**
 * The first appearance of a service on the published branch is its added date.
 * Use first-parent history so an old PR's creation date is not mistaken for
 * the day that PR was eventually merged into main.
 */
export function parseAddedDates(log) {
  const dates = new Map();
  let addedOn = '';
  for (const line of log.split(/\r?\n/)) {
    if (line.startsWith(COMMIT_MARKER)) {
      const timestamp = line.slice(COMMIT_MARKER.length).trim();
      const date = new Date(timestamp);
      if (!Number.isFinite(date.getTime())) throw Error('Invalid Git commit timestamp in catalog history');
      addedOn = date.toISOString().slice(0, 10);
      continue;
    }
    if (!addedOn || !line.startsWith('+') || line.startsWith('+++')) continue;
    const match = /^\+\s*"id"\s*:\s*"([a-z0-9]+(?:-[a-z0-9]+)*)"\s*[,}]?/.exec(line);
    if (match && !dates.has(match[1])) dates.set(match[1], addedOn);
  }
  return dates;
}

export function serviceAddedDates(repoRoot) {
  const cwd = path.resolve(repoRoot);
  let shallow;
  try {
    shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
      cwd, encoding: 'utf8',
    }).trim();
  } catch {
    throw Error('Cannot determine service addition dates: Git history is unavailable');
  }
  if (shallow === 'true') {
    throw Error('Cannot determine service addition dates from a shallow clone; checkout with fetch-depth: 0');
  }
  // In a pull-request checkout, the first-parent chain belongs to the PR
  // branch. A non-force merge of main into that branch puts newly published
  // catalog records on the SECOND parent, where --first-parent alone cannot
  // see them. Read the published main lineage first, then fill only records
  // unique to this PR from its own first-parent lineage.
  const readDates = (ref) => parseAddedDates(execFileSync('git', [
    'log', '--first-parent', '--diff-merges=first-parent', '--reverse',
    '--no-ext-diff', '--no-color', `--format=${COMMIT_MARKER}%cI`,
    '-p', ref, '--', 'data/services.json',
  ], { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  let publishedRef = 'HEAD';
  try {
    execFileSync('git', ['rev-parse', '--verify', 'refs/remotes/origin/main'], {
      cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    });
    publishedRef = 'refs/remotes/origin/main';
  } catch {
    // Local repositories without a remote still retain the original behavior.
  }
  const dates = readDates(publishedRef);
  if (publishedRef !== 'HEAD') {
    for (const [id, date] of readDates('HEAD')) {
      if (!dates.has(id)) dates.set(id, date);
    }
  }
  return dates;
}
