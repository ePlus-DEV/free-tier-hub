import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { CATEGORIES } from './catalog.mjs';
import { applyCandidate, listCandidates, loadCandidates } from './backlog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const today = '2026-10-12';
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
