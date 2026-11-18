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

// Fail-safe identity gate for candidate Issue cleanup. A pricing URL alone is
// not proof: one provider page can cover several distinct plans/products.
// A name alone is also insufficient when an offer has changed.
export function confirmedCatalogDuplicate(candidate, catalog) {
  if (!candidate || !Array.isArray(catalog)) throw Error('Invalid duplicate inputs');
  const url = normalizedURL(candidate.pricing_url);
  const name = normalizedName(candidate.name);
  const words = name.split(' ').filter(Boolean);
  const signature = words.length >= 3 ? [...words].sort().join(' ') : null;
  if (!url || !candidate.plan || !name) return null;
  const matches = catalog.filter(existing => {
    if (!existing || normalizedURL(existing.pricing_url) !== url ||
        existing.plan !== candidate.plan) return false;
    // Stable ID or a clearly identical normalized name, including safe word
    // reordering such as "Fillout Forms Free" / "Fillout Free Forms".
    if (existing.id === candidate.id || normalizedName(existing.name) === name) return true;
    return signature !== null && [...normalizedName(existing.name).split(' ')]
      .sort().join(' ') === signature;
  });
  // Multiple catalog matches are themselves ambiguous: human review only.
  return matches.length === 1 ? matches[0] : null;
}
