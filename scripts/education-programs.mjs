// Education benefits are curated separately from universal free tiers.
// Canonical source: one verified, independently reviewable JSON file per offer.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const AUDIENCES = ['student', 'teacher', 'school', 'nonprofit', 'opensource'];
export const BENEFIT_TYPES = ['free', 'credit', 'discount'];
// Editorial taxonomy for education-only offers; never included in the general service count.
export const EDUCATION_CATEGORIES = Object.freeze({
  'ai-assistants': 'AI Assistants',
  'developer-tools': 'Developer Tools',
  'cloud-hosting': 'Cloud & Hosting',
  'productivity': 'Productivity',
  'design-creative': 'Design & Creative',
  'learning-research': 'Learning & Research',
  'security-privacy': 'Security & Privacy',
  'entertainment': 'Entertainment',
  'shopping-living': 'Shopping & Living',
  'other': 'Other / to classify',
});
export const educationCategory = item =>
  item.category && Object.hasOwn(EDUCATION_CATEGORIES, item.category) ? item.category : 'other';
const REQUIRED = ['id', 'name', 'audiences', 'benefit_type', 'benefit', 'eligibility', 'duration', 'restrictions', 'source_url', 'last_checked'];
const DIRECTORY = 'data/education';

export function validateEducationPrograms(programs, today = new Date().toISOString().slice(0, 10)) {
  if (!Array.isArray(programs)) throw Error('Education benefits must be an array');
  const ids = new Set();
  for (const item of programs) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw Error('Invalid education benefit');
    if (REQUIRED.some(key => !Object.hasOwn(item, key)) ||
        Object.keys(item).some(key => !REQUIRED.includes(key) && key !== 'category')) throw Error('Unexpected education benefit fields');
    if (typeof item.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id) || ids.has(item.id)) {
      throw Error('Invalid or duplicate education benefit ID');
    }
    ids.add(item.id);
    if (!Array.isArray(item.audiences) || !item.audiences.length ||
        new Set(item.audiences).size !== item.audiences.length ||
        item.audiences.some(a => !AUDIENCES.includes(a))) throw Error('Invalid education audience: ' + item.id);
    if (!BENEFIT_TYPES.includes(item.benefit_type)) throw Error('Invalid education benefit type: ' + item.id);
    if (item.category !== undefined && !Object.hasOwn(EDUCATION_CATEGORIES, item.category)) {
      throw Error('Invalid education category: ' + item.id);
    }
    for (const key of ['name', 'benefit', 'eligibility', 'duration', 'restrictions']) {
      if (typeof item[key] !== 'string' || !item[key].trim()) throw Error('Missing education field ' + key + ': ' + item.id);
    }
    let url;
    try { url = new URL(item.source_url); } catch { throw Error('Invalid education source URL: ' + item.id); }
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
      throw Error('Education sources must be public HTTPS: ' + item.id);
    }
    const checked = typeof item.last_checked === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.last_checked)
      ? new Date(item.last_checked + 'T00:00:00Z') : null;
    if (!checked || Number.isNaN(checked.getTime()) ||
        checked.toISOString().slice(0, 10) !== item.last_checked || item.last_checked > today) {
      throw Error('Invalid education review date: ' + item.id);
    }
  }
  return programs;
}

export function loadEducationPrograms(root = ROOT) {
  const directory = path.join(root, DIRECTORY);
  const shards = fs.readdirSync(directory, {withFileTypes: true})
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => entry.name).sort();
  if (!shards.length) throw Error('No canonical education benefits found in ' + DIRECTORY);
  const programs = shards.map(filename => {
    const offer = JSON.parse(fs.readFileSync(path.join(directory, filename), 'utf8'));
    if (offer.id + '.json' !== filename) {
      throw Error('Education file name must match ID: ' + filename);
    }
    return offer;
  });
  return validateEducationPrograms(programs);
}
