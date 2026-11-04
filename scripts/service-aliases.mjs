// Legacy public service URLs: keep stable IDs while consolidating true duplicates.
// GitHub Pages cannot emit per-path HTTP 301 responses, so the build generates
// noindex pages with a canonical destination, immediate meta refresh and a
// browser location.replace fallback for each retired service ID.
export const SERVICE_ALIASES = Object.freeze({
  'deno-deploy-free': 'deno-deploy',
  'uploadthing-free': 'uploadthing-2gb-app',
});

const validId = id => typeof id === 'string' &&
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);

export function activeServiceAliases(items, strict = true) {
  if (!Array.isArray(items)) throw Error('Service aliases require a catalog array');
  const ids = new Set(items.map(item => item.id));
  const aliases = [];
  for (const [from, to] of Object.entries(SERVICE_ALIASES)) {
    if (!validId(from) || !validId(to) || from === to ||
        Object.hasOwn(SERVICE_ALIASES, to)) {
      throw Error('Invalid or chained service alias: ' + from + ' -> ' + to);
    }
    if (ids.has(from)) {
      if (strict) throw Error('Retired alias still has a canonical shard: ' + from);
      continue;
    }
    if (!ids.has(to)) {
      if (strict) throw Error('Service alias target is missing: ' + to);
      continue;
    }
    aliases.push([from, to]);
  }
  return aliases;
}
