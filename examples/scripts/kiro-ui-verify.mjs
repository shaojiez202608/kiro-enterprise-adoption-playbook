#!/usr/bin/env node
// Stop-hook helper: runs the frontend browser suite after an agent turn and reports failures
// back to the agent, with a bounded number of automatic retries per session.
//
// Behaviour (see docs/architecture.md, "Fact check", hooks rows F-07, F-08):
// - Kiro command hooks receive the hook event as JSON on STDIN and run in the project root.
// - IDE: on a non-zero exit, stderr is sent to the agent. CLI Stop hooks: exit 1 starts another
//   agent turn; exit 0 leaves the response finished; any other code leaves the response finished
//   and the hook output is not forwarded to the agent (the CLI shows a warning instead).
// - This script exits 1 while automatic retries remain. When the limit is reached it exits with
//   EXIT_LIMIT_REACHED (3) and writes the failure summary to stderr, so the failure is not silently
//   dropped (exit 0 stdout is ignored for Stop hooks) and no further automatic turn is requested.
// - Not run inside Kiro by this project; unit-tested locally and rehearsed from a shell (VERIFICATION.md).

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_MAX_ATTEMPTS = 2;
export const EXIT_LIMIT_REACHED = 3;
export const FRONTEND_DIR = 'frontend-demo';
const OUTPUT_TAIL_LINES = 20;

export function sanitizeSessionId(value) {
  return String(value || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
}

// Counter key: the session ID when the event carries one; otherwise a hash of the workspace path,
// so that unrelated workspaces never share a counter.
export function stateKey(sessionId, workdir) {
  const cleaned = sanitizeSessionId(sessionId);
  if (cleaned) return `s-${cleaned}`;
  return `ws-${createHash('sha256').update(resolve(workdir)).digest('hex').slice(0, 16)}`;
}

export function parseEvent(raw) {
  if (!raw || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function parseMaxAttempts(value) {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isInteger(n) && n >= 0 ? n : DEFAULT_MAX_ATTEMPTS;
}

export function summarizeResults(report) {
  const stats = (report && report.stats) || {};
  const failed = [];
  const walk = (suite, prefix) => {
    for (const spec of suite.specs || []) {
      const ok = (spec.tests || []).every((t) => t.status === 'expected' || t.status === 'skipped');
      if (!ok) failed.push([prefix, spec.title].filter(Boolean).join(' > '));
    }
    for (const child of suite.suites || []) walk(child, [prefix, child.title].filter(Boolean).join(' > '));
  };
  for (const suite of (report && report.suites) || []) walk(suite, suite.title);
  return {
    passed: Number(stats.expected || 0),
    failed: Number(stats.unexpected || 0),
    flaky: Number(stats.flaky || 0),
    skipped: Number(stats.skipped || 0),
    failedTitles: failed,
  };
}

export function tail(text, lines = OUTPUT_TAIL_LINES) {
  const clean = String(text || '').replace(/\u001b\[[0-9;]*m/g, '').trimEnd();
  if (!clean) return '';
  return clean.split(/\r?\n/).slice(-lines).join('\n');
}

// failures: number of consecutive failed runs in this session, including the current one.
export function decide({ ok, failures, maxAttempts }) {
  if (ok) return { exitCode: 0, limitReached: false };
  if (failures <= maxAttempts) return { exitCode: 1, limitReached: false };
  return { exitCode: EXIT_LIMIT_REACHED, limitReached: true };
}

export function formatFailure(summary, { failures, maxAttempts, limitReached, output = '', runError = '' }) {
  const lines = [limitReached
    ? `Frontend browser checks failed (failure ${failures}; automatic retry limit of ${maxAttempts} reached).`
    : `Frontend browser checks failed (automatic retry ${failures} of ${maxAttempts}).`];
  lines.push(`passed=${summary.passed} failed=${summary.failed} flaky=${summary.flaky} skipped=${summary.skipped}`);
  for (const title of summary.failedTitles.slice(0, 10)) lines.push(`- ${title}`);
  if (summary.failedTitles.length === 0) {
    lines.push(runError
      ? `The test runner did not complete: ${runError}`
      : 'The test runner reported no failed test. It probably failed before running the tests (for example a port or configuration problem).');
    if (output) lines.push('Last lines of the test runner output:', output);
  }
  if (limitReached) {
    lines.push('Do not start another automatic fix attempt. Report this failure to the user and ask how to proceed.');
    lines.push(`To reset the counter, make the checks pass or delete the state file under ${join(tmpdir(), 'kiro-ui-verify')}.`);
  } else {
    lines.push(`Fix the cause, then re-run: npm --prefix ${FRONTEND_DIR} run test:e2e`);
  }
  return lines.join('\n');
}

// Fingerprint of uncommitted frontend changes: git status entries plus a hash of each changed file.
// Returns '' when there are no changes, or null when git is not available (then the checks always run).
export function frontendFingerprint(cwd) {
  const res = spawnSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--', `${FRONTEND_DIR}/public`], { cwd, encoding: 'utf8' });
  if (res.status !== 0 || res.error) return null;
  if (!res.stdout) return '';
  const hash = createHash('sha256');
  const tokens = res.stdout.split('\0').filter(Boolean);
  for (let i = 0; i < tokens.length; i += 1) {
    const entry = tokens[i];
    const path = entry.slice(3);
    hash.update(`${entry}\0`);
    try {
      hash.update(readFileSync(join(cwd, path)));
    } catch {
      hash.update('<missing>');
    }
    if (entry[0] === 'R' || entry[0] === 'C') i += 1; // skip the original path of a rename or copy
  }
  return hash.digest('hex');
}

export function loadState(file) {
  if (!existsSync(file)) return { state: {}, warning: '' };
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
    const failures = Number.isInteger(parsed.failures) && parsed.failures >= 0 ? parsed.failures : 0;
    return { state: { ...parsed, failures }, warning: '' };
  } catch {
    return { state: {}, warning: `Ignored an unreadable retry counter file (${file}); counting starts again.` };
  }
}

export function runCommand({ env = process.env, platform = process.platform } = {}) {
  return {
    command: 'npm',
    args: ['--prefix', FRONTEND_DIR, 'run', 'test:e2e'],
    options: {
      encoding: 'utf8',
      timeout: 280_000,
      // Reuse a dev server that is already listening on the test port (the steering file asks the
      // agent to keep one running). CI is not forced, so playwright.config.mjs does not refuse the port.
      env: { ...env, PW_REUSE_EXISTING_SERVER: '1' },
      // npm is a .cmd shim on Windows and cannot be spawned without a shell there.
      shell: platform === 'win32',
    },
  };
}

function defaultRunner(workdir, env) {
  const reportPath = join(workdir, FRONTEND_DIR, 'test-results', 'results.json');
  rmSync(reportPath, { force: true }); // never read a report left over from an earlier run
  const { command, args, options } = runCommand({ env });
  const res = spawnSync(command, args, { ...options, cwd: workdir });
  let report = {};
  try {
    if (existsSync(reportPath)) report = JSON.parse(readFileSync(reportPath, 'utf8'));
  } catch {
    report = {};
  }
  return {
    ok: res.status === 0,
    report,
    output: tail(`${res.stdout || ''}\n${res.stderr || ''}`),
    runError: res.error ? res.error.message : (res.status === null ? `terminated by ${res.signal}` : ''),
  };
}

export function main({ stdin = '', cwd = process.cwd(), env = process.env, runner, fingerprint, stateDir } = {}) {
  const event = parseEvent(stdin);
  const workdir = typeof event.cwd === 'string' && existsSync(event.cwd) ? event.cwd : cwd;
  if (!existsSync(join(workdir, FRONTEND_DIR, 'package.json'))) return { exitCode: 0, stdout: '', stderr: '' };

  const print = fingerprint ? fingerprint(workdir) : frontendFingerprint(workdir);
  if (print === '') return { exitCode: 0, stdout: '', stderr: '' }; // no uncommitted frontend changes

  const dir = stateDir || join(tmpdir(), 'kiro-ui-verify');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${stateKey(event.session_id, workdir)}.json`);
  const { state, warning } = loadState(file);

  // Nothing changed since the last check that passed, or since the limit was reported: do not rerun.
  if (print !== null && state.fingerprint === print && (state.lastResult === 'pass' || state.limitReached)) {
    return { exitCode: 0, stdout: '', stderr: '' };
  }

  const maxAttempts = parseMaxAttempts(env.KIRO_UI_VERIFY_MAX_ATTEMPTS);
  const { ok, report, output = '', runError = '' } = (runner || (() => defaultRunner(workdir, env)))();
  const failures = ok ? 0 : (state.failures || 0) + 1;
  const decision = decide({ ok, failures, maxAttempts });

  writeFileSync(file, JSON.stringify({
    failures, fingerprint: print, lastResult: ok ? 'pass' : 'fail', limitReached: decision.limitReached,
  }));

  if (ok) return { exitCode: 0, stdout: '', stderr: warning };
  const message = formatFailure(summarizeResults(report), { failures, maxAttempts, limitReached: decision.limitReached, output, runError });
  return { exitCode: decision.exitCode, stdout: '', stderr: [warning, message].filter(Boolean).join('\n') };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let input = '';
  try {
    input = readFileSync(0, 'utf8');
  } catch {
    input = '';
  }
  const result = main({ stdin: input });
  if (result.stdout) process.stdout.write(`${result.stdout}\n`);
  if (result.stderr) process.stderr.write(`${result.stderr}\n`);
  process.exit(result.exitCode);
}
