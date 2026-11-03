// Canonical catalog source: one JSON object per service. The old array remains a
// generated compatibility artifact for raw GitHub clients and existing badges.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE_DIRECTORY = 'data/services';
export const COMPATIBILITY_FILE = 'data/services.json';
export const LEGACY_ORDER_FILE = 'data/catalog-legacy-order.json';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const ascii = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export function hasServiceShards(root = ROOT) {
  return fs.existsSync(path.join(root, SOURCE_DIRECTORY));
}

export function serviceFile(item) {
  if (!item || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id || '') ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.category || '')) {
    throw Error('Service must have valid kebab-case id and category before writing');
  }
  return path.join(SOURCE_DIRECTORY, item.category, item.id + '.json');
}

export function loadServices(root = ROOT) {
  if (!hasServiceShards(root)) return read(path.join(root, COMPATIBILITY_FILE));
  const source = path.join(root, SOURCE_DIRECTORY);
  const entries = [], seen = new Set();
  for (const category of fs.readdirSync(source, { withFileTypes: true })) {
    if (!category.isDirectory() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category.name)) {
      throw Error('Unexpected catalog category directory entry: ' + category.name);
    }
    for (const file of fs.readdirSync(path.join(source, category.name), { withFileTypes: true })) {
      if (!file.isFile() || !/^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/.test(file.name)) {
        throw Error('Unexpected service shard: ' + path.join(category.name, file.name));
      }
      const item = read(path.join(source, category.name, file.name));
      if (!item || Array.isArray(item) || typeof item !== 'object') {
        throw Error('Service shard must contain a JSON object: ' + file.name);
      }
      const expected = path.join(category.name, file.name);
      if (serviceFile(item) !== path.join(SOURCE_DIRECTORY, expected)) {
        throw Error('Service shard path disagrees with its id/category: ' + expected);
      }
      if (seen.has(item.id)) throw Error('Duplicate service ID across shards: ' + item.id);
      seen.add(item.id);
      entries.push(item);
    }
  }
  if (entries.length === 0) throw Error('No service shards were found');
  // Historical order is immutable for pre-migration entries. New entries sort
  // deterministically after the historical set, without a shared file edit.
  const legacyPath = path.join(root, LEGACY_ORDER_FILE);
  if (!fs.existsSync(legacyPath)) throw Error('Missing legacy catalog ordering');
  const legacy = read(legacyPath);
  if (!Array.isArray(legacy) || new Set(legacy).size !== legacy.length ||
      legacy.some(id => typeof id !== 'string')) throw Error('Invalid legacy order manifest');
  const index = new Map(legacy.map((id, i) => [id, i]));
  entries.sort((a, b) => (index.get(a.id) ?? Infinity) - (index.get(b.id) ?? Infinity)
    || ascii(a.id, b.id));
  return entries;
}

export function aggregateCatalog(root = ROOT) {
  return JSON.stringify(loadServices(root), null, 2) + '\n';
}

export function writeService(root, item) {
  if (!hasServiceShards(root)) {
    const file = path.join(root, COMPATIBILITY_FILE);
    const existing = read(file);
    if (existing.some(x => x.id === item.id)) throw Error('Duplicate service ID: ' + item.id);
    fs.writeFileSync(file, JSON.stringify([...existing, item], null, 2) + '\n');
    return file;
  }
  const file = path.join(root, serviceFile(item));
  if (fs.existsSync(file)) throw Error('Service shard already exists: ' + item.id);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(item, null, 2) + '\n');
  return file;
}
