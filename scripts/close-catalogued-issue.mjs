// Close catalogued Issues safely when two post-merge workflows race.
import { execFileSync } from 'node:child_process';

export function closeCataloguedIssue(repo, number, message, exec = execFileSync) {
  try {
    exec('gh', ['issue', 'close', String(number), '--repo', repo, '--reason', 'completed']);
  } catch (error) {
    // Never swallow API/permission errors or failures on still-open Issues.
    const state = exec('gh', ['api', `repos/${repo}/issues/${number}`,
      '--jq', '.state'], { encoding: 'utf8' }).trim();
    if (state !== 'closed') throw error;
    return 'already-closed';
  }
  exec('gh', ['issue', 'comment', String(number), '--repo', repo, '--body', message]);
  return 'closed';
}
