#!/usr/bin/env node
// Reviewed catalog backlog: list or apply candidates without Python dependencies.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, sync, validateData } from './catalog.mjs';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIELDS = [
  'id', 'name', 'category', 'plan', 'free_limit', 'watch_out',
  'pricing_url', 'credit_card', 'commercial_use', 'last_checked',
].sort();
const isoToday = () => new Date().toISOString().slice(0, 10);
const readJSON = (root, filename) =>
  JSON.parse(fs.readFileSync(path.join(root, filename), 'utf8'));

export function loadCandidates(root = DEFAULT_ROOT, today = isoToday()) {
  const candidates = readJSON(root, 'data/catalog-candidate-backlog.json');
  if (!Array.isArray(candidates)) throw Error('Backlog must be a JSON array');
  const ids = new Set();
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate) ||
        Object.keys(candidate).sort().join() !== FIELDS.join()) {
      throw Error('Candidate must contain exactly the catalog schema fields');
    }
    validateData([candidate], today);
    if (!CATEGORIES.includes(candidate.category)) throw Error('Unsupported category');
    if (ids.has(candidate.id)) throw Error('Duplicate backlog candidate ID: ' + candidate.id);
    ids.add(candidate.id);
  }
  return candidates;
}

export function fresh(candidate, today = isoToday()) {
  const age = (Date.parse(today + 'T00:00:00Z') -
    Date.parse(candidate.last_checked + 'T00:00:00Z')) / 86400000;
  return age >= 0 && age <= 7;
}

export function listCandidates(root = DEFAULT_ROOT, today = isoToday()) {
  const current = readJSON(root, 'data/services.json');
  validateData(current, today);
  const present = new Set(current.map(item => item.id));
  return loadCandidates(root, today)
    .filter(candidate => !present.has(candidate.id) && fresh(candidate, today))
    .map(candidate => candidate.id);
}

export function applyCandidate(id, root = DEFAULT_ROOT, today = isoToday()) {
  const catalogFile = path.join(root, 'data/services.json');
  const oldContent = fs.readFileSync(catalogFile, 'utf8');
  const current = JSON.parse(oldContent);
  validateData(current, today);
  const matches = loadCandidates(root, today).filter(candidate => candidate.id === id);
  if (matches.length !== 1 || current.some(item => item.id === id)) {
    throw Error('Candidate missing from backlog or already catalogued');
  }
  if (!fresh(matches[0], today)) throw Error('Candidate pricing review is stale: ' + id);
  validateData([...current, matches[0]], today);
  fs.writeFileSync(catalogFile, JSON.stringify([...current, matches[0]], null, 2) + '\n');
  try {
    // Keep generated category pages consistent with the source on application.
    sync(root);
  } catch (error) {
    fs.writeFileSync(catalogFile, oldContent);
    throw error;
  }
  return id;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const rootOpt = args.find(arg => arg.startsWith('--root='));
  const root = rootOpt ? path.resolve(rootOpt.slice('--root='.length)) : DEFAULT_ROOT;
  const action = args.filter(arg => !arg.startsWith('--root='));
  try {
    if (action.length === 1 && action[0] === '--list') {
      for (const id of listCandidates(root)) console.log(id);
    } else if (action.length === 2 && action[0] === '--apply') {
      console.log('Applied reviewed candidate: ' + applyCandidate(action[1], root));
    } else {
      console.error('Usage: node scripts/backlog.mjs --list|--apply SERVICE_ID [--root=/path]');
      process.exitCode = 2;
    }
  } catch (error) {
    console.error('FAIL: ' + error.message);
    process.exitCode = 1;
  }
}
