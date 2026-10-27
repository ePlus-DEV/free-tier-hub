import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { CATEGORIES } from './catalog.mjs';
import { applyCandidate, listCandidates, loadCandidates } from './backlog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const today = new Date().toISOString().slice(0, 10);
const example = () => ({
  id: 'backlog-test-service',
  name: 'Backlog Test Service',
  category: 'developer-tools',
  plan: 'ongoing',
  free_limit: '100 calls/month',
  watch_out: 'No SLA',
  pricing_url: 'https://example.com/pricing',
  credit_card: 'check',
  commercial_use: 'check',
  last_checked: today,
});

function fixture(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'free-tier-hub-backlog-'));
  try {
    fs.mkdirSync(path.join(root, 'data'));
    fs.mkdirSync(path.join(root, 'docs'));
    for (const filename of ['README.md', 'data/services.json']) {
      fs.copyFileSync(path.join(ROOT, filename), path.join(root, filename));
    }
    for (const category of CATEGORIES) {
      fs.copyFileSync(path.join(ROOT, 'docs', category + '.md'),
        path.join(root, 'docs', category + '.md'));
    }
    const backlog = path.join(root, 'data/catalog-candidate-backlog.json');
    const write = candidates => fs.writeFileSync(backlog, JSON.stringify(candidates, null, 2) + '\n');
    fn(root, write);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('backlog lists fresh candidates and can sync their catalog documentation', () => {
  fixture((root, write) => {
    write([example()]);
    assert.deepEqual(listCandidates(root, today), ['backlog-test-service']);
    assert.equal(applyCandidate('backlog-test-service', root, today), 'backlog-test-service');
    const services = JSON.parse(fs.readFileSync(path.join(root, 'data/services.json'), 'utf8'));
    assert.equal(services.at(-1).id, 'backlog-test-service');
    assert.match(fs.readFileSync(path.join(root, 'docs/developer-tools.md'), 'utf8'),
      /Backlog Test Service/);
    assert.deepEqual(listCandidates(root, today), []);
    assert.throws(() => applyCandidate('backlog-test-service', root, today), /already catalogued/);
  });
});

test('duplicate IDs and unknown fields are rejected', () => {
  fixture((root, write) => {
    write([example(), example()]);
    assert.throws(() => loadCandidates(root, today), /Duplicate backlog candidate ID/);
    write([{ ...example(), extra: 'invalid' }]);
    assert.throws(() => loadCandidates(root, today), /exactly the catalog schema/);
  });
});

test('non-HTTPS source and future dates are rejected', () => {
  fixture((root, write) => {
    write([{ ...example(), pricing_url: 'http://example.com' }]);
    assert.throws(() => loadCandidates(root, today), /HTTPS/);
    write([{ ...example(), last_checked: '2999-01-01' }]);
    assert.throws(() => loadCandidates(root, today), /future last_checked/);
  });
});

test('stale candidate remains in backlog but cannot be applied', () => {
  fixture((root, write) => {
    write([{ ...example(), last_checked: '2020-01-01' }]);
    assert.equal(loadCandidates(root, today).length, 1);
    assert.deepEqual(listCandidates(root, today), []);
    assert.throws(() => applyCandidate('backlog-test-service', root, today), /stale/);
  });
});


// A merged PR frees queue capacity immediately; merely closing a PR does not.
// This must not weaken the trusted-source and exact catalog PR capacity gates.
test('backlog consumer resumes one queued Issue after a trusted main merge', () => {
  const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/catalog-backlog-consumer.yml'), 'utf8');
  assert.match(workflow, /pull_request:\s*\n\s*types: \[closed\]/);
  assert.match(workflow, /github\.event\.pull_request\.merged == true/);
  assert.match(workflow, /github\.event\.pull_request\.base\.ref == 'main'/);
  assert.match(workflow, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
  assert.match(workflow, /ref: main\s*\n\s*fetch-depth: 0/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /cron: '23 \* \* \* \*'/);
  assert.match(workflow, /openCatalog\.length >= 3/);
  assert.match(workflow, /\['OWNER', 'MEMBER', 'COLLABORATOR'\]/);
  assert.match(workflow, /gh', \['workflow', 'run', 'catalog-candidate-queue\.yml'/);
  assert.match(workflow, /if \(prs\.some\(pr => pr\.head\?\.ref === branch\)\) continue/);
});

test('candidate queue commits locally before tests and only publishes after success', () => {
  const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/catalog-candidate-queue.yml'), 'utf8');
  const generated = workflow.indexOf('npm run catalog:sync');
  const committed = workflow.indexOf('git commit -m "catalog: add $SERVICE_ID"');
  const verified = workflow.indexOf('npm run verify');
  const published = workflow.indexOf('git push origin "HEAD:refs/heads/$DELIVERY_BRANCH"');
  assert.ok(generated >= 0 && generated < committed, 'Generate docs before local commit');
  assert.ok(committed < verified && verified < published,
    'Validate Git-backed addition dates before publishing any delivery branch');
  assert.match(workflow, /if git ls-remote --exit-code --heads origin "\$DELIVERY_BRANCH"/);
  assert.match(workflow, /open_count" -ge 3/);
  assert.match(workflow, /if: steps\.capacity\.outputs\.available == 'true'/);
  assert.equal((workflow.match(/git push origin "HEAD:refs\/heads\/\$DELIVERY_BRANCH"/g) || []).length, 1);
});
