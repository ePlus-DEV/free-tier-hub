// Complete verified catalog Issues after publishing the instructions first.
import { execFileSync } from 'node:child_process';

const BADGE_URL = 'https://free-tier.eplus.dev/badges/listed.svg';
const DELIVERY_MARKER = '<!-- free-tier-hub-catalog-delivery:';

export function cataloguedIssueComment(id, delivery) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw Error('Invalid service ID');
  const listing = 'https://free-tier.eplus.dev/service/' + id + '/';
  return [
    DELIVERY_MARKER + id + ' -->',
    delivery,
    '',
    '**Your Free Tier Hub listing:** ' + listing,
    '**View service details:** [Open the service detail page](' + listing + ')',
    '',
    '### Embed the listing badge',
    'Your service is now listed on Free Tier Hub! Share your listing using the HTML or Markdown badge snippet below. The embedded badge links visitors directly to your service's listing page.',
    '',
    '![Listed on Free Tier Hub](' + BADGE_URL + ')',
    '',
    '**Website (HTML):**',
    '```html',
    '<a href="' + listing + '" target="_blank" rel="noopener noreferrer">',
    '  <img src="' + BADGE_URL + '" alt="Listed on Free Tier Hub" width="182" height="44">',
    '</a>',
    '```',
    '',
    '**GitHub README (Markdown):**',
    '```markdown',
    '[![Listed on Free Tier Hub](' + BADGE_URL + ')](' + listing + ')',
    '```',
    '',
    'The listing and badge link will be publicly available after the successful production GitHub Pages deployment.',
  ].join('\n');
}

// A retry must not duplicate the comment or close the Issue before commenting.
export function closeCataloguedIssue(repo, number, message, exec = execFileSync) {
  const marker = message.match(/<!-- free-tier-hub-catalog-delivery:([a-z0-9]+(?:-[a-z0-9]+)*) -->/);
  if (!marker) throw Error('Catalog completion comment needs a service marker');

  const issueEndpoint = `repos/${repo}/issues/${number}`;
  const issueState = () => exec('gh', ['api', issueEndpoint, '--jq', '.state'], { encoding: 'utf8' }).trim();
  const state = issueState();
  if (state === 'closed') return 'already-closed';
  if (state !== 'open') throw Error('Unexpected catalog Issue state: ' + state);

  const existing = exec('gh', ['api', issueEndpoint + '/comments', '--paginate',
    '--jq', '.[] | select(.body | contains("' + marker[0] + '")) | .id'],
  { encoding: 'utf8' }).trim();
  if (!existing) {
    // If this fails, leave the Issue open rather than closing without instructions.
    exec('gh', ['issue', 'comment', String(number), '--repo', repo, '--body', message]);
  }

  try {
    exec('gh', ['issue', 'close', String(number), '--repo', repo, '--reason', 'completed']);
  } catch (error) {
    // A parallel post-merge job may have closed the Issue after we posted.
    if (issueState() !== 'closed') throw error;
    return 'already-closed';
  }
  return 'closed';
}
