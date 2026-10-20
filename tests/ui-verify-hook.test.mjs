import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  EXIT_LIMIT_REACHED, decide, formatFailure, frontendFingerprint, loadState, main, parseEvent, parseMaxAttempts,
  runCommand, sanitizeSessionId, stateKey, summarizeResults, tail,
} from '../examples/scripts/kiro-ui-verify.mjs';

const failingReport = {
  stats: { expected: 4, unexpected: 1, flaky: 0, skipped: 0 },
  suites: [{ title: 'ui.spec.mjs', specs: [
    { title: 'loads', tests: [{ status: 'expected' }] },
    { title: 'filter', tests: [{ status: 'unexpected' }] },
  ] }],
};
const fail = () => ({ ok: false, report: failingReport });
const pass = () => ({ ok: true, report: {} });

function workspace() {
  const dir = mkdtempSync(join(tmpdir(), 'kiro-hook-test-'));
  mkdirSync(join(dir, 'frontend-demo'));
  writeFileSync(join(dir, 'frontend-demo', 'package.json'), '{}');
  return dir;
}

// One workspace, one private state directory, and a fingerprint the test can change.
function harness({ session = 's1', max = '2', stateDir = mkdtempSync(join(tmpdir(), 'kiro-hook-state-')) } = {}) {
  const ws = workspace();
  let print = 'change-1';
  const run = (runner, extra = {}) => main({
    stdin: JSON.stringify(session ? { session_id: session, cwd: ws } : { cwd: ws }),
    cwd: ws, env: { KIRO_UI_VERIFY_MAX_ATTEMPTS: max }, stateDir, fingerprint: () => print, runner, ...extra,
  });
  return { ws, stateDir, run, change: (p) => { print = p; } };
}

test('sanitizeSessionId and stateKey: unsafe characters stripped; no session falls back to a per-workspace key', () => {
  assert.equal(sanitizeSessionId('../../etc/passwd'), 'etcpasswd');
  assert.equal(stateKey('abc-123_X', '/a'), 's-abc-123_X');
  const a = stateKey(undefined, '/work/a');
  const b = stateKey('', '/work/b');
  assert.match(a, /^ws-[0-9a-f]{16}$/);
  assert.notEqual(a, b, 'different workspaces without a session ID never share a counter');
  assert.equal(a, stateKey(null, '/work/a'));
});

test('parseEvent and parseMaxAttempts tolerate bad input', () => {
  assert.deepEqual(parseEvent(''), {});
  assert.deepEqual(parseEvent('not json'), {});
  assert.equal(parseEvent('{"session_id":"s1"}').session_id, 's1');
  assert.equal(parseMaxAttempts(undefined), 2);
  assert.equal(parseMaxAttempts('abc'), 2);
  assert.equal(parseMaxAttempts('-1'), 2);
  assert.equal(parseMaxAttempts('0'), 0);
  assert.equal(parseMaxAttempts('5'), 5);
});

test('summarizeResults counts and lists failed specs', () => {
  const s = summarizeResults(failingReport);
  assert.equal(s.passed, 4);
  assert.equal(s.failed, 1);
  assert.deepEqual(s.failedTitles, ['ui.spec.mjs > filter']);
  assert.match(formatFailure(s, { failures: 1, maxAttempts: 2, limitReached: false }), /retry 1 of 2[\s\S]*ui.spec.mjs > filter/);
});

test('decide: retries while failures <= limit, then a distinct exit code', () => {
  assert.deepEqual(decide({ ok: true, failures: 0, maxAttempts: 2 }), { exitCode: 0, limitReached: false });
  assert.equal(decide({ ok: false, failures: 1, maxAttempts: 2 }).exitCode, 1);
  assert.equal(decide({ ok: false, failures: 2, maxAttempts: 2 }).exitCode, 1);
  assert.deepEqual(decide({ ok: false, failures: 3, maxAttempts: 2 }), { exitCode: EXIT_LIMIT_REACHED, limitReached: true });
  assert.notEqual(EXIT_LIMIT_REACHED, 0);
  assert.notEqual(EXIT_LIMIT_REACHED, 1);
});

test('main skips when the frontend folder is absent or has no uncommitted changes', () => {
  const empty = mkdtempSync(join(tmpdir(), 'kiro-hook-empty-'));
  assert.equal(main({ stdin: '{}', cwd: empty, runner: () => assert.fail('should not run') }).exitCode, 0);
  const h = harness();
  h.change('');
  assert.deepEqual(h.run(() => assert.fail('should not run')), { exitCode: 0, stdout: '', stderr: '' });
});

test('limit: failures retry, then the limit is reported on stderr with a distinct exit code and the counter is not reset', () => {
  const h = harness({ max: '2' });
  const r1 = h.run(fail);
  assert.equal(r1.exitCode, 1);
  assert.match(r1.stderr, /retry 1 of 2/);
  h.change('change-2');
  const r2 = h.run(fail);
  assert.equal(r2.exitCode, 1);
  assert.match(r2.stderr, /retry 2 of 2/);
  h.change('change-3');
  const r3 = h.run(fail);
  assert.equal(r3.exitCode, EXIT_LIMIT_REACHED);
  assert.equal(r3.stdout, '', 'stdout of a Stop hook is not shown, so nothing is written there');
  assert.match(r3.stderr, /retry limit of 2 reached/);
  assert.match(r3.stderr, /ui.spec.mjs > filter/);
  assert.match(r3.stderr, /Report this failure to the user and ask how to proceed/);

  // Same state as when the limit was reported: no rerun, no new turn.
  assert.deepEqual(h.run(() => assert.fail('should not rerun unchanged files')), { exitCode: 0, stdout: '', stderr: '' });
  // New changes after the limit: checks run again, but the counter stays above the limit.
  h.change('change-4');
  const r4 = h.run(fail);
  assert.equal(r4.exitCode, EXIT_LIMIT_REACHED, 'counter is not reset by reaching the limit');
  assert.match(r4.stderr, /failure 4/);
  // Only a passing run resets the counter.
  h.change('change-5');
  assert.equal(h.run(pass).exitCode, 0);
  h.change('change-6');
  assert.equal(h.run(fail).exitCode, 1);
});

test('limit of 0 reports the first failure without requesting another turn', () => {
  const h = harness({ max: '0' });
  assert.equal(h.run(fail).exitCode, EXIT_LIMIT_REACHED);
});

test('only changes since the last passing check trigger a rerun', () => {
  const h = harness();
  assert.equal(h.run(pass).exitCode, 0);
  assert.deepEqual(h.run(() => assert.fail('pre-existing, already-checked changes must not rerun')), { exitCode: 0, stdout: '', stderr: '' });
  h.change('edited-this-turn');
  let ran = false;
  h.run(() => { ran = true; return pass(); });
  assert.ok(ran);
});

test('without a session ID the counter is per workspace', () => {
  const stateDir = mkdtempSync(join(tmpdir(), 'kiro-hook-shared-'));
  const h1 = harness({ session: null, stateDir });
  const h2 = harness({ session: null, stateDir });
  assert.match(h1.run(fail).stderr, /retry 1 of 2/);
  h1.change('again');
  assert.match(h1.run(fail).stderr, /retry 2 of 2/);
  assert.match(h2.run(fail).stderr, /retry 1 of 2/, 'another workspace starts its own count');
});

test('corrupt counter file: ignored with a warning instead of throwing', () => {
  const h = harness({ session: 'corrupt' });
  const file = join(h.stateDir, 's-corrupt.json');
  for (const bad of ['{not json', '[]', 'null', '{"failures":"x"}']) {
    writeFileSync(file, bad);
    const r = h.run(fail);
    assert.equal(r.exitCode, 1, `content ${bad}`);
    if (bad !== '{"failures":"x"}') assert.match(r.stderr, /Ignored an unreadable retry counter file/);
    assert.match(r.stderr, /retry 1 of 2/);
    assert.equal(JSON.parse(readFileSync(file, 'utf8')).failures, 1, 'file is rewritten with valid content');
  }
  assert.deepEqual(loadState(join(h.stateDir, 'missing.json')), { state: {}, warning: '' });
});

test('runner failure without a report: summary carries the runner output tail', () => {
  const h = harness();
  const output = tail('\u001b[31mError: http://127.0.0.1:4173/ is already used, make sure that nothing is running on the port/url or set reuseExistingServer:true in config.webServer.\u001b[39m');
  const r = h.run(() => ({ ok: false, report: {}, output }));
  assert.equal(r.exitCode, 1);
  assert.match(r.stderr, /passed=0 failed=0/);
  assert.match(r.stderr, /reported no failed test/);
  assert.match(r.stderr, /is already used/);
  assert.doesNotMatch(r.stderr, /\u001b\[/);
  h.change('timeout');
  assert.match(h.run(() => ({ ok: false, report: {}, runError: 'spawnSync npm ETIMEDOUT' })).stderr, /did not complete: spawnSync npm ETIMEDOUT/);
});

test('tail keeps the last lines only', () => {
  const text = Array.from({ length: 30 }, (_, i) => `line ${i}`).join('\n');
  const t = tail(text, 5).split('\n');
  assert.deepEqual(t, ['line 25', 'line 26', 'line 27', 'line 28', 'line 29']);
  assert.equal(tail(''), '');
});

test('runCommand: reuses an existing server, does not force CI, uses a shell only on Windows', () => {
  const posix = runCommand({ env: { PATH: '/bin' }, platform: 'darwin' });
  assert.equal(posix.command, 'npm');
  assert.deepEqual(posix.args, ['--prefix', 'frontend-demo', 'run', 'test:e2e']);
  assert.equal(posix.options.env.PW_REUSE_EXISTING_SERVER, '1');
  assert.equal(posix.options.env.CI, undefined);
  assert.equal(posix.options.shell, false);
  assert.equal(runCommand({ env: {}, platform: 'win32' }).options.shell, true);
});

test('playwright config reuses an existing server when the hook asks for it, even under CI', () => {
  const cfg = new URL('../examples/frontend-demo/playwright.config.mjs', import.meta.url);
  const src = readFileSync(cfg, 'utf8');
  assert.match(src, /reuseExistingServer:\s*process\.env\.PW_REUSE_EXISTING_SERVER === '1' \|\| !process\.env\.CI/);
});

test('frontendFingerprint: empty without changes, changes with content, null outside git', (t) => {
  if (spawnSync('git', ['--version']).status !== 0) { t.skip('git not available'); return; }
  const ws = workspace();
  const git = (...args) => spawnSync('git', args, { cwd: ws, encoding: 'utf8' });
  assert.equal(frontendFingerprint(ws), null, 'not a git repository');
  git('init', '-q');
  mkdirSync(join(ws, 'frontend-demo', 'public'));
  writeFileSync(join(ws, 'frontend-demo', 'public', 'index.html'), '<h1>a</h1>');
  git('add', '.');
  git('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-qm', 'init');
  assert.equal(frontendFingerprint(ws), '');
  writeFileSync(join(ws, 'frontend-demo', 'public', 'index.html'), '<h1>b</h1>');
  const first = frontendFingerprint(ws);
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(frontendFingerprint(ws), first, 'stable while nothing changes');
  writeFileSync(join(ws, 'frontend-demo', 'public', 'index.html'), '<h1>c</h1>');
  assert.notEqual(frontendFingerprint(ws), first, 'a further edit to an already-modified file is detected');
  writeFileSync(join(ws, 'frontend-demo', 'public', 'new.js'), 'x');
  assert.ok(frontendFingerprint(ws));
});
