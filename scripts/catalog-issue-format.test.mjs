import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderCandidateIssue, parseCandidateIssue,
  renderDeploymentEvidence, parseDeploymentEvidence } from './catalog-issue-format.mjs';
import { resolveCandidateDeployment } from './candidate-deployment.mjs';
import { validateCandidate } from './catalog.mjs';

const candidate = {
  id: 'bugbug-free',
  name: 'BugBug Free',
  category: 'testing-qa',
  plan: 'ongoing',
  free_limit: '1 user, 1 project, 4 suites and 15 tests',
  watch_out: 'Local Chromium only. No cloud runs or CI/CD.',
  pricing_url: 'https://bugbug.io/pricing/',
  credit_card: 'no',
  commercial_use: 'check',
  last_checked: '2026-11-16',
};

test('a candidate Issue is readable, with canonical JSON in collapsed details', () => {
  const body = renderCandidateIssue(candidate);
  assert.match(body, /^## BugBug Free\n/);
  assert.match(body, /\| Category \| Testing &amp; QA \|/);
  assert.match(body, /\| Credit card required \| No \|/);
  assert.match(body, /### Free allowance\n1 user, 1 project/);
  assert.match(body, /### Important restrictions\nLocal Chromium only/);
  assert.match(body, /\[Pricing \/ documentation\]\(https:\/\/bugbug\.io\/pricing\/\)/);
  assert.match(body, /<details>\n<summary>Machine-readable catalog data \(JSON\)<\/summary>/);
  assert.deepEqual(parseCandidateIssue(body), candidate);
  assert.deepEqual(validateCandidate(parseCandidateIssue(body)), candidate);
});

test('legacy JSON-only Issues (ten or eleven fields) continue to parse', () => {
  const legacy = JSON.stringify(candidate, null, 2);
  assert.deepEqual(parseCandidateIssue(legacy), candidate);
  const withModel = {...candidate, deployment_model: 'local'};
  assert.deepEqual(parseCandidateIssue(JSON.stringify(withModel)), withModel);
  assert.deepEqual(parseCandidateIssue(renderCandidateIssue(withModel)), withModel);
});

test('markdown summary and canonical payload must agree exactly', () => {
  const body = renderCandidateIssue(candidate);
  assert.throws(() => parseCandidateIssue(body.replace('Ongoing free allowance', 'Limited offer')),
    /summary does not match/);
  assert.throws(() => parseCandidateIssue(body.replace('"id": "bugbug-free"', '"id": "other-service"')),
    /summary does not match/);
  assert.throws(() => parseCandidateIssue(body + '\nExtra misleading content'), /summary does not match/);
  assert.throws(() => parseCandidateIssue(body.replace('<!-- free-tier-hub:candidate-json:v1:end -->', '')),
    /closing payload marker/);
  assert.throws(() => parseCandidateIssue('## service\n```json\n{}\n```'),
    /versioned machine-readable payload/);
  assert.throws(() => parseCandidateIssue('{invalid'), /JSON/);
  assert.throws(() => parseCandidateIssue(' ' + 'a'.repeat(65536)), /oversized/);
});

test('Markdown escaping prevents provider text from becoming injected HTML or tables', () => {
  const malicious = { ...candidate, name: '<img src=x onerror=alert(1)>',
    watch_out: 'Some | table <script>alert(1)</script> **important**' };
  const body = renderCandidateIssue(malicious);
  assert.ok(!body.startsWith('## <img'));
  assert.ok(body.includes('&lt;script&gt;'));
  assert.ok(body.includes('Some \\| table'));
  assert.deepEqual(parseCandidateIssue(body), malicious);
});

test('deployment evidence is readable and supports trusted legacy JSON comments', () => {
  const data = {deployment_model: 'local', source: 'https://bugbug.io/pricing/'};
  const body = renderDeploymentEvidence(data);
  assert.ok(body.startsWith('<!-- free-tier-hub:deployment-evidence:v1:start -->'));
  assert.match(body, /### Deployment verification/);
  assert.match(body, /<summary>Machine-readable evidence \(JSON\)<\/summary>/);
  assert.deepEqual(parseDeploymentEvidence(body), data);
  assert.deepEqual(parseDeploymentEvidence(JSON.stringify(data)), data);
  assert.equal(resolveCandidateDeployment(candidate,
    [{body, author_association: 'MEMBER'}]).deployment_model, 'local');
  assert.equal(resolveCandidateDeployment(candidate,
    [{body, author_association: 'NONE'}]), null);
});

test('deployment evidence rejects tampering, unknown keys and insecure sources', () => {
  const data = {deployment_model: 'local', source: 'https://bugbug.io/pricing/'};
  const body = renderDeploymentEvidence(data);
  assert.throws(() => parseDeploymentEvidence(body.replace('**Deployment model:** local', '**Deployment model:** cloud')),
    /preview does not match/);
  assert.throws(() => renderDeploymentEvidence({...data, extra: 'bad'}), /fields/);
  assert.throws(() => renderDeploymentEvidence({...data, source: 'http://bugbug.io/'}), /HTTPS/);
  assert.equal(resolveCandidateDeployment(candidate, [
    {body: renderDeploymentEvidence(data), author_association: 'FIRST_TIME_CONTRIBUTOR'},
  ]), null);
});

test('every catalog workflow uses the same parser and preserves existing automation gates', () => {
  const read = name => fs.readFileSync(new URL(name, import.meta.url), 'utf8');
  const consumer = read('../.github/workflows/catalog-backlog-consumer.yml');
  const queue = read('../.github/workflows/catalog-candidate-queue.yml');
  const closer = read('../.github/workflows/close-catalog-issue-after-merge.yml');
  const merge = read('catalog-event-auto-merge.mjs');
  assert.match(consumer, /renderCandidateIssue\(candidate\)/);
  assert.match(consumer, /parseCandidateIssue\(issue\.body/);
  assert.match(queue, /parseCandidateIssue\(fs\.readFileSync/);
  assert.match(queue, /resolveCandidateDeployment\(original, comments\)/);
  assert.match(queue, /startsWith\(github\.event\.comment\.body, '\{"deployment_model"'\)/);
  assert.match(queue, /free-tier-hub:deployment-evidence:v1:start/);
  assert.match(closer, /parseCandidateIssue\(fs\.readFileSync/);
  assert.match(closer, /parseCandidateIssue\(issue\.body/);
  assert.match(closer, /closeCataloguedIssue\(repo/);
  assert.match(merge, /parseCandidateIssue\(issue\.body/);
  assert.match(merge, /sameData\(candidate, actual\)/);
  assert.match(merge, /--match-head-commit/);
  assert.match(consumer, /openCatalog\.length >= 3/);
});

test('new trusted JSON Issues are normalized while historical Issues remain unchanged', () => {
  const workflow = fs.readFileSync(
    new URL('../.github/workflows/catalog-candidate-queue.yml', import.meta.url), 'utf8');
  assert.match(workflow, /github\.event_name == 'issues' && github\.event\.action == 'opened'/);
  assert.match(workflow, /github\.event\.issue\.state == 'open'/);
  assert.match(workflow, /validateCandidate\(parseCandidateIssue\(issue\.body\)\)/);
  assert.match(workflow, /renderCandidateIssue\(candidate\)/);
  assert.match(workflow, /issue\.body\.trim\(\)\.startsWith\('\{'\)/);
  assert.match(workflow, /gh api --method PATCH/);
});
