import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decide, formatFailure, main, parseEvent, sanitizeSessionId, summarizeResults } from '../examples/scripts/kiro-ui-verify.mjs';

const failingReport = {
  stats: { expected: 4, unexpected: 1, flaky: 0, skipped: 0 },
  suites: [{ title: 'ui.spec.mjs', specs: [
    { title: 'loads', tests: [{ status: 'expected' }] },
    { title: 'filter', tests: [{ status: 'unexpected' }] },
  ] }],
};

function workspace() {
  const dir = mkdtempSync(join(tmpdir(), 'kiro-hook-test-'));
  mkdirSync(join(dir, 'frontend-demo'));
  writeFileSync(join(dir, 'frontend-demo', 'package.json'), '{}');
  return dir;
}

test('sanitizeSessionId strips unsafe characters', () => {
  assert.equal(sanitizeSessionId('../../etc/passwd'), 'etcpasswd');
  assert.equal(sanitizeSessionId(''), 'no-session');
  assert.equal(sanitizeSessionId('abc-123_X'), 'abc-123_X');
});

test('parseEvent tolerates empty and invalid input', () => {
  assert.deepEqual(parseEvent(''), {});
  assert.deepEqual(parseEvent('not json'), {});
  assert.equal(parseEvent('{"session_id":"s1"}').session_id, 's1');
});

test('summarizeResults counts and lists failed specs', () => {
  const s = summarizeResults(failingReport);
  assert.equal(s.passed, 4);
  assert.equal(s.failed, 1);
  assert.deepEqual(s.failedTitles, ['ui.spec.mjs > filter']);
  assert.match(formatFailure(s, 1, 2), /attempt 1 of 2[\s\S]*ui.spec.mjs > filter/);
});

test('decide: pass resets, failure retries until the limit, then stops', () => {
  assert.deepEqual(decide({ ok: true, attempts: 0, maxAttempts: 2 }), { exitCode: 0, resetCounter: true, stream: 'none' });
  assert.equal(decide({ ok: false, attempts: 1, maxAttempts: 2 }).exitCode, 1);
  assert.deepEqual(decide({ ok: false, attempts: 2, maxAttempts: 2 }), { exitCode: 0, resetCounter: true, stream: 'stdout' });
});

test('main skips when the frontend folder is absent or unchanged', () => {
  const empty = mkdtempSync(join(tmpdir(), 'kiro-hook-empty-'));
  assert.equal(main({ stdin: '{}', cwd: empty, runner: () => assert.fail('should not run') }).exitCode, 0);
  const ws = workspace();
  const r = main({ stdin: '{}', cwd: ws, changed: () => false, runner: () => assert.fail('should not run') });
  assert.equal(r.exitCode, 0);
});

test('main reports failures with bounded retries per session', () => {
  const ws = workspace();
  const session = `t${Date.now()}`;
  const opts = { stdin: JSON.stringify({ session_id: session, cwd: ws }), cwd: ws, env: { KIRO_UI_VERIFY_MAX_ATTEMPTS: '2' }, changed: () => true, runner: () => ({ ok: false, report: failingReport }) };
  const first = main(opts);
  assert.equal(first.exitCode, 1);
  assert.match(first.stderr, /attempt 1 of 2/);
  const second = main(opts);
  assert.equal(second.exitCode, 0);
  assert.match(second.stdout, /stopping automatic retries/);
  const third = main(opts);
  assert.equal(third.exitCode, 1, 'counter resets after the limit is reported');
  const pass = main({ ...opts, runner: () => ({ ok: true, report: {} }) });
  assert.deepEqual(pass, { exitCode: 0, stdout: '', stderr: '' });
});
