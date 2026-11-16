// Human-readable catalog Issue bodies with a strict, canonical JSON payload.
// The JSON is the only machine-readable source; Markdown is a generated preview.
// Keep parsing raw JSON for the trusted Issues created before this migration.
import { CATEGORY_NAMES } from './site-data.mjs';

const CANDIDATE_START = '<!-- free-tier-hub:candidate-json:v1:start -->';
const CANDIDATE_END = '<!-- free-tier-hub:candidate-json:v1:end -->';
const EVIDENCE_START = '<!-- free-tier-hub:deployment-evidence:v1:start -->';
const EVIDENCE_END = '<!-- free-tier-hub:deployment-evidence:v1:end -->';
const MAX_BODY_LENGTH = 65536;
const MODELS = new Set(['cloud', 'self-hosted', 'hybrid', 'local', 'unclassified']);

const PLANS = {
  ongoing: 'Ongoing free allowance',
  'monthly-credit': 'Recurring monthly credit',
  'limited-duration': 'Time-limited offer',
  'temporary-resource': 'Temporary resource',
};
const YES_NO_CHECK = {
  yes: 'Yes', no: 'No', check: 'Needs verification',
};

function markdown(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/([\\`*_{}\[\]()!|~])/g, '\\$1')
    .replace(/[\r\n]+/g, ' ');
}
function link(url) {
  // Preserve the actual HTTPS source while encoding Markdown link delimiters.
  return String(url).replace(/[\s()<>\x00-\x1f]/g, character => encodeURIComponent(character));
}

function readPayload(body, start, end) {
  if (typeof body !== 'string' || !body.trim() || body.length > MAX_BODY_LENGTH) {
    throw Error('Invalid or oversized catalog Issue payload');
  }
  const value = body.trim();
  if (value.startsWith('{')) return { data: JSON.parse(value), legacy: true };
  const pos = value.indexOf(start);
  if (pos < 0 || value.indexOf(start, pos + start.length) >= 0) {
    throw Error('Expected one versioned machine-readable payload');
  }
  const endPos = value.indexOf(end, pos + start.length);
  if (endPos < 0 || value.indexOf(end, endPos + end.length) >= 0) {
    throw Error('Expected one closing payload marker');
  }
  const region = value.slice(pos + start.length, endPos).trim();
  const fenced = /^```json\r?\n([\s\S]+?)\r?\n```$/.exec(region);
  if (!fenced) throw Error('Invalid canonical JSON code fence');
  return { data: JSON.parse(fenced[1]), legacy: false };
}

export function renderCandidateIssue(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw Error('Candidate must be an object');
  }
  const name = markdown(candidate.name);
  const category = markdown(CATEGORY_NAMES[candidate.category] || candidate.category);
  const plan = markdown(PLANS[candidate.plan] || candidate.plan);
  const card = markdown(YES_NO_CHECK[candidate.credit_card] || candidate.credit_card);
  const commercial = markdown(YES_NO_CHECK[candidate.commercial_use] || candidate.commercial_use);
  const model = markdown(candidate.deployment_model || 'Pending independent verification');
  return [
    '## ' + name,
    '',
    'Candidate for the independent Free Tier Hub directory. Provider limits and terms must be verified against the official source.',
    '',
    '| Field | Details |',
    '| --- | --- |',
    '| Service ID | `' + markdown(candidate.id) + '` |',
    '| Category | ' + category + ' |',
    '| Plan | ' + plan + ' |',
    '| Deployment | ' + model + ' |',
    '| Credit card required | ' + card + ' |',
    '| Commercial use | ' + commercial + ' |',
    '| Last checked (UTC) | ' + markdown(candidate.last_checked) + ' |',
    '',
    '### Free allowance',
    markdown(candidate.free_limit),
    '',
    '### Important restrictions',
    markdown(candidate.watch_out),
    '',
    '### Official source',
    '[Pricing / documentation](' + link(candidate.pricing_url) + ')',
    '',
    '<details>',
    '<summary>Machine-readable catalog data (JSON)</summary>',
    '',
    CANDIDATE_START,
    '```json',
    JSON.stringify(candidate, null, 2),
    '```',
    CANDIDATE_END,
    '',
    '</details>',
  ].join('\n');
}

export function parseCandidateIssue(body) {
  const parsed = readPayload(body, CANDIDATE_START, CANDIDATE_END);
  if (!parsed.legacy && renderCandidateIssue(parsed.data) !== body.trim()) {
    throw Error('Candidate summary does not match its canonical JSON');
  }
  return parsed.data;
}

export function renderDeploymentEvidence(evidence) {
  if (!evidence || Array.isArray(evidence) ||
      Object.keys(evidence).sort().join(',') !== 'deployment_model,source' ||
      !MODELS.has(evidence.deployment_model)) {
    throw Error('Invalid deployment evidence fields');
  }
  let url;
  try { url = new URL(evidence.source); } catch { throw Error('Invalid source URL'); }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
    throw Error('Official source must use HTTPS');
  }
  return [
    EVIDENCE_START,
    '### Deployment verification',
    '',
    '- **Deployment model:** ' + markdown(evidence.deployment_model),
    '- **Official source:** [Documentation / pricing](' + link(evidence.source) + ')',
    '',
    '<details>',
    '<summary>Machine-readable evidence (JSON)</summary>',
    '',
    '```json',
    JSON.stringify(evidence, null, 2),
    '```',
    '',
    '</details>',
    EVIDENCE_END,
  ].join('\n');
}

export function parseDeploymentEvidence(body) {
  if (typeof body !== 'string' || !body.trim() || body.length > MAX_BODY_LENGTH) {
    throw Error('Invalid deployment comment');
  }
  if (body.trim().startsWith('{')) return JSON.parse(body);
  const value = body.trim();
  if (!value.startsWith(EVIDENCE_START) || !value.endsWith(EVIDENCE_END)) {
    throw Error('Unrecognized deployment evidence format');
  }
  // Explicit and unique version markers, never scan arbitrary Issue comments for JSON.
  if (value.indexOf(EVIDENCE_START, EVIDENCE_START.length) !== -1 ||
      value.indexOf(EVIDENCE_END) !== value.lastIndexOf(EVIDENCE_END)) {
    throw Error('Duplicate deployment evidence markers');
  }
  const fenced = value.match(/```json\r?\n([\s\S]*?)\r?\n```/g);
  if (!fenced || fenced.length !== 1) throw Error('Expected one JSON evidence block');
  const json = /^```json\r?\n([\s\S]*?)\r?\n```$/.exec(fenced[0]);
  const data = JSON.parse(json[1]);
  if (renderDeploymentEvidence(data) !== value) {
    throw Error('Deployment preview does not match its JSON evidence');
  }
  return data;
}
