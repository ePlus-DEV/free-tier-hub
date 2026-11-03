// Content-level identity checks across every catalog category.
// Existing legacy collisions are reported separately; only proposed additions
// are stopped, avoiding retroactive failures for historically accepted entries.
const TRACKING = /^(utm_[a-z0-9_]+|fbclid|gclid|msclkid|ref|referral|source)$/i;

export function normalizedName(value) {
  return String(value || '').normalize('NFKC').toLowerCase()
    .replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
    .replace(/\s+/g, ' ');
}

export function normalizedURL(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.hostname) return '';
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    const entries = [...url.searchParams].filter(([key]) => !TRACKING.test(key))
      .sort(([a,av],[b,bv]) => a.localeCompare(b) || av.localeCompare(bv));
    const query = new URLSearchParams(entries).toString();
    return host + pathname + (query ? '?' + query : '');
  } catch { return ''; }
}

export function candidateCollisions(candidate, catalog) {
  if (!candidate || !Array.isArray(catalog)) throw Error('Invalid dedup inputs');
  const name = normalizedName(candidate.name);
  const url = normalizedURL(candidate.pricing_url);
  const hits = [];
  for (const existing of catalog) {
    if (!existing || existing.id === candidate.id) continue;
    const sameName = name && name === normalizedName(existing.name);
    const sameURL = url && url === normalizedURL(existing.pricing_url);
    if (!sameName && !sameURL) continue;
    hits.push({
      id: existing.id, category: existing.category, name: existing.name,
      reason: sameName ? 'same-name' : 'shared-url',
      // Identical names across categories are unsafe; shared pricing pages
      // frequently describe several legitimate products and need human review.
      severity: sameName ? 'block' : 'review',
    });
  }
  return hits.sort((a,b) => (a.severity === b.severity ? a.id.localeCompare(b.id) :
    a.severity === 'block' ? -1 : 1));
}

export function dedupMessage(candidate, collisions) {
  return candidate.id + ': possible existing catalog entry across categories: ' +
    collisions.map(hit => hit.id + ' [' + hit.category + '; ' + hit.reason + ']').join(', ');
}

export function assertNoExactDuplicate(candidate, catalog) {
  const hits = candidateCollisions(candidate, catalog);
  if (hits.some(hit => hit.severity === 'block')) {
    throw Error(dedupMessage(candidate, hits));
  }
  return hits;
}
