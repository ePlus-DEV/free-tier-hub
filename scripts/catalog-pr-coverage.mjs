// Read-only PR coverage checks for catalog candidate queue deduplication.
// A service can be proposed via any branch, including maintainer batch PRs.
// Branch names and PR body references alone are not a reliable dedupe key.

const SHARD_PATH = /^data\/services\/[a-z0-9]+(?:-[a-z0-9]+)*\/([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/;

export function serviceIdFromChangedPath(filename) {
  if (typeof filename !== 'string') return null;
  return SHARD_PATH.exec(filename)?.[1] || null;
}

export function proposedServiceIds(openPRs, filesForPR) {
  if (!Array.isArray(openPRs) || typeof filesForPR !== 'function') {
    throw Error('Invalid open-PR catalog coverage inputs');
  }
  const ids = new Set();
  for (const pr of openPRs) {
    if (!pr || pr.state !== 'open' || !Number.isSafeInteger(pr.number)) continue;
    const files = filesForPR(pr);
    if (!Array.isArray(files)) throw Error('Missing changed-file list for PR #' + pr.number);
    for (const file of files) {
      // Include additions/updates/renames/deletions: all are pending catalog
      // changes whose identity must not be independently delivered twice.
      const id = serviceIdFromChangedPath(file?.filename);
      if (id) ids.add(id);
      const oldId = serviceIdFromChangedPath(file?.previous_filename);
      if (oldId) ids.add(oldId);
    }
  }
  return ids;
}
