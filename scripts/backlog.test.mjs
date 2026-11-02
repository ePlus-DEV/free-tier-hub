import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { CATEGORIES, validateCandidate } from './catalog.mjs';
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
  assert.match(workflow, /catalogIds\.has\(id\)/, 'skip already-catalogued Issues');
  assert.match(workflow, /resolveCandidateDeployment\(candidate, comments\)/,
    'require trusted first-party deployment evidence before dispatch');
  assert.match(workflow, /if \(!resolved\)/, 'skip evidence-free Issues rather than retry forever');
  assert.match(workflow, /validateCandidate\(resolved\)/, 'validate resolved candidate schema');
});

test('manual candidate queue uses trusted REST issue author association', () => {
  const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/catalog-candidate-queue.yml'), 'utf8');
  assert.match(workflow, /\[\[ "\$ISSUE_NUMBER" =~ \^\[0-9\]\+\$ \]\]/);
  assert.match(workflow, /gh api "repos\/\$GITHUB_REPOSITORY\/issues\/\$ISSUE_NUMBER" > \/tmp\/issue\.json/);
  assert.doesNotMatch(workflow, /gh issue view "[^"]+" --json[^\n]*authorAssociation/);
  assert.match(workflow, /issue\.state !== 'open' \|\| issue\.pull_request/);
  assert.match(workflow, /\['OWNER', 'MEMBER', 'COLLABORATOR'\]\.includes\(issue\.author_association\)/);
  assert.match(workflow, /\['OWNER', 'MEMBER', 'COLLABORATOR'\]\.includes\(issue\.author_association\)/);
  assert.match(workflow, /if: steps\.capacity\.outputs\.available == 'true'/);
  assert.match(workflow, /open_count" -ge 3/);
});

test('candidate delivery validates the committed service before branch push', () => {
  const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/catalog-candidate-queue.yml'), 'utf8');
  const precommit = workflow.split('      - name: Generate and validate')[1]
    ?.split('      - name: Prepare delivery branch and commit')[0];
  const delivery = workflow.split('      - name: Prepare delivery branch and commit')[1]
    ?.split('      - name: Open or reuse PR')[0];
  assert.ok(precommit && delivery, 'expected generator and commit steps');
  assert.match(precommit, /npm run catalog:sync/);
  assert.match(precommit, /npm run catalog:check/);
  assert.doesNotMatch(precommit, /npm run verify/, 'full site tests require an ID committed into Git history');
  const commit = delivery.indexOf('git commit -m "catalog: add $SERVICE_ID"');
  const verify = delivery.indexOf('npm run verify');
  const checked = delivery.indexOf('git show --format= --check HEAD');
  const push = delivery.indexOf('git push origin');
  assert.ok(commit >= 0 && commit < verify && verify < checked && checked < push,
    'verify the actual local commit before pushing the candidate branch');
  assert.match(delivery, /git ls-remote --exit-code --heads origin/);
  assert.match(workflow, /\[ "\$open_count" -ge 3 \]/);
});

test('candidate schema accepts reviewed deployment metadata without rewriting legacy input', () => {
  const legacy = example();
  assert.equal(validateCandidate(legacy, today), legacy);
  assert.equal(Object.hasOwn(legacy, 'deployment_model'), false);
  for (const deployment_model of ['cloud', 'self-hosted', 'hybrid', 'local', 'unclassified']) {
    const candidate = {...example(), deployment_model};
    assert.equal(validateCandidate(candidate, today), candidate);
  }
  for (const deployment_model of ['invalid', null, 1, '']) {
    assert.throws(() => validateCandidate({...example(), deployment_model}, today), /invalid deployment_model/);
  }
  assert.throws(() => validateCandidate({...example(), unrelated: true}, today), /exactly the catalog schema/);
});

test('backlog delivery preserves deployment model and reviewed verification date', () => {
  fixture((root, write) => {
    const candidate = {...example(), deployment_model:'self-hosted'};
    write([candidate]);
    applyCandidate(candidate.id, root, today);
    const stored = JSON.parse(fs.readFileSync(path.join(root,'data/services.json'),'utf8')).at(-1);
    assert.deepEqual(stored, candidate);
  });
});

test('candidate Issue intake and conflict recovery share deployment-aware validation', () => {
  for (const file of ['catalog-candidate-queue.yml','reconcile-catalog-pr-conflicts.yml']) {
    const workflow = fs.readFileSync(path.join(ROOT,'.github/workflows',file),'utf8');
    assert.match(workflow, /import \{ validateData, validateCandidate \} from '\.\/scripts\/catalog\.mjs'/);
    assert.match(workflow, /validateCandidate\(/);
    assert.doesNotMatch(workflow, /const fields = \[/);
  }
});
