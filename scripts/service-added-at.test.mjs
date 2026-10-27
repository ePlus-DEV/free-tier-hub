import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseAddedDates, serviceAddedDates } from './service-added-at.mjs';

test('sort dates are immutable across later provider checks and normalized to UTC', () => {
  const log = `@@FREE_TIER_CATALOG_COMMIT@@2026-10-21T22:59:00-07:00\n+    "id": "first-service",\n@@FREE_TIER_CATALOG_COMMIT@@2026-10-27T11:00:00Z\n+    "id": "first-service",\n+    "id": "second-service",`;
  assert.deepEqual(Object.fromEntries(parseAddedDates(log)), {
    'first-service': '2026-10-22', 'second-service': '2026-10-27',
  });
});

test('published added_at uses merge day rather than candidate PR creation day', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'date-history-'));
  const run = (args, env = {}) => execFileSync('git', args, {
    cwd: root, env: { ...process.env, ...env }, encoding: 'utf8',
  }).trim();
  try {
    run(['init', '-q', '-b', 'main']);
    run(['config', 'user.name', 'Test']);
    run(['config', 'user.email', 'test@example.com']);
    fs.mkdirSync(path.join(root, 'data'));
    const catalog = path.join(root, 'data/services.json');
    fs.writeFileSync(catalog, '[\n  {\n    "id": "old-service"\n  }\n]\n');
    run(['add', '.']);
    run(['commit', '-qm', 'initial'], { GIT_COMMITTER_DATE: '2026-10-20T10:00:00Z' });
    run(['checkout', '-qb', 'candidate']);
    fs.writeFileSync(catalog, '[\n  {\n    "id": "old-service"\n  },\n  {\n    "id": "new-service"\n  }\n]\n');
    run(['add', '.']);
    run(['commit', '-qm', 'add new service'], { GIT_COMMITTER_DATE: '2026-10-22T10:00:00Z' });
    run(['checkout', '-q', 'main']);
    run(['merge', '--no-ff', '-m', 'Merge catalog service', 'candidate'],
      { GIT_COMMITTER_DATE: '2026-10-27T10:00:00Z' });
    assert.deepEqual(Object.fromEntries(serviceAddedDates(root)), {
      'old-service': '2026-10-20', 'new-service': '2026-10-27',
    });
    fs.writeFileSync(catalog, '[\n  {\n    "id": "old-service",\n    "last_checked": "2026-10-28"\n  },\n  {\n    "id": "new-service"\n  }\n]\n');
    run(['add', '.']);
    run(['commit', '-qm', 'verify old'], { GIT_COMMITTER_DATE: '2026-10-28T10:00:00Z' });
    assert.equal(serviceAddedDates(root).get('old-service'), '2026-10-20');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
