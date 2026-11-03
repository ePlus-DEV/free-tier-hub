#!/usr/bin/env node
// PR guard: contributed catalog changes must edit canonical shards, not the
// generated compatibility aggregate. This catches old monolithic fork PRs
// before the automatic sync could silently discard their contribution.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadServices, hasServiceShards } from './catalog-source.mjs';
import path from 'node:path';

export function validateMigrationParity(published, proposed) {
  // During the one-time migration, every existing provider field and order
  // must match the latest main branch exactly. A concurrent main change blocks
  // the Draft migration rather than silently dropping an entry.
  if (JSON.stringify(published) !== JSON.stringify(proposed)) {
    const originalIDs = new Set(published.map(item => item.id));
    const proposedIDs = new Set(proposed.map(item => item.id));
    const missing = [...originalIDs].filter(id => !proposedIDs.has(id));
    const extra = [...proposedIDs].filter(id => !originalIDs.has(id));
    throw Error('Shard migration is stale relative to latest main. '
      + 'Rebase/refresh the migration before merge. Missing IDs: '
      + missing.join(', ') + '; new IDs: ' + extra.join(', '));
  }
  return true;
}

export function validateChangedPaths(paths, { allowLegacyManifestCreation = false } = {}) {
  if (paths.includes('data/catalog-legacy-order.json') && !allowLegacyManifestCreation) {
    throw Error('data/catalog-legacy-order.json is an immutable migration snapshot. '
      + 'New services belong in data/services/<category>/<id>.json; do not change the legacy ordering.');
  }
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
  if (!/^[A-Za-z0-9._/-]+$/.test(base) || base.startsWith('-') ||
      base.split('/').some(part => !part || part === '.' || part === '..')) {
    throw Error('Unsafe base branch ref');
  }
  const files = execFileSync('git',
    ['diff', '--name-only', '--diff-filter=ACDMRT', `refs/remotes/origin/${base}...HEAD`],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim().split('\n').filter(Boolean);
  const migration = hasServiceShards() && files.includes('data/catalog-legacy-order.json');
  let creatingLegacyManifest = false;
  if (migration) {
    try {
      execFileSync('git', ['cat-file', '-e',
        `refs/remotes/origin/${base}:data/catalog-legacy-order.json`],
        { stdio: 'ignore' });
    } catch {
      creatingLegacyManifest = true;
    }
  }
  validateChangedPaths(files, { allowLegacyManifestCreation: creatingLegacyManifest });
  if (creatingLegacyManifest) {
    const published = JSON.parse(execFileSync('git',
      ['show', `refs/remotes/origin/${base}:data/services.json`],
      { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }));
    validateMigrationParity(published, loadServices());
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) { console.error('Catalog source guard: ' + error.message); process.exitCode = 1; }
}
