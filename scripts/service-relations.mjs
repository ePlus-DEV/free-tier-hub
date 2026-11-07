// Editorial links between distinct catalog entries, never inferred from names,
// domains or shared pricing pages. Both sides are rendered from one declaration.
export const MAX_RELATED_SERVICES = 6;

export function relatedServiceMap(items) {
  const ids = new Map(items.map(item => [item.id, item]));
  const links = new Map(items.map(item => [item.id, new Set()]));
  const errors = [];

  for (const item of items) {
    if (!Object.hasOwn(item, 'related_services')) continue;
    const related = item.related_services;
    if (!Array.isArray(related) || related.length < 1 || related.length > MAX_RELATED_SERVICES) {
      errors.push(item.id + ': related_services must contain 1–' + MAX_RELATED_SERVICES + ' service IDs');
      continue;
    }
    const seen = new Set();
    for (const id of related) {
      if (typeof id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
        errors.push(item.id + ': invalid related service ID');
      } else if (id === item.id) {
        errors.push(item.id + ': cannot link a service to itself');
      } else if (seen.has(id)) {
        errors.push(item.id + ': duplicated related service ' + id);
      } else if (!ids.has(id)) {
        errors.push(item.id + ': unknown related service ' + id);
      } else {
        seen.add(id);
        links.get(item.id).add(id);
        links.get(id).add(item.id);
      }
    }
  }
  for (const [id, related] of links) {
    if (related.size > MAX_RELATED_SERVICES) {
      errors.push(id + ': more than ' + MAX_RELATED_SERVICES + ' related services after reciprocal links');
    }
  }
  if (errors.length) throw Error(errors.join('\n'));
  return new Map([...links].map(([id, related]) =>
    [id, [...related].map(otherId => ids.get(otherId))]));
}
