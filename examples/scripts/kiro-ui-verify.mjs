#!/usr/bin/env node
// Stop-hook helper: runs the frontend browser suite after an agent turn and reports failures
// back to the agent, with a bounded number of retries per session to limit extra agent turns.
//
// Behaviour (see docs/architecture.md, "Fact check", hooks rows):
// - Kiro command hooks receive the hook event as JSON on STDIN and run in the project root.
// - Exit 0: nothing more happens. Non-zero: stderr is reported to the agent (IDE) or another
//   agent turn starts (CLI, exit code 1). This script uses exit 1 only while retries remain.
// - Not run inside Kiro by this project; unit-tested locally with a fake runner.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_MAX_ATTEMPTS = 2;
export const FRONTEND_DIR = 'frontend-demo';

export function sanitizeSessionId(value) {
  const cleaned = String(value || 'no-session').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  return cleaned || 'no-session';
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

export function decide({ ok, attempts, maxAttempts }) {
  if (ok) return { exitCode: 0, resetCounter: true, stream: 'none' };
  if (attempts < maxAttempts) return { exitCode: 1, resetCounter: false, stream: 'stderr' };
  return { exitCode: 0, resetCounter: true, stream: 'stdout' };
}

export function formatFailure(summary, attempts, maxAttempts) {
  const lines = [
    `Frontend browser checks failed (attempt ${attempts} of ${maxAttempts}).`,
    `passed=${summary.passed} failed=${summary.failed} flaky=${summary.flaky} skipped=${summary.skipped}`,
  ];
  for (const title of summary.failedTitles.slice(0, 10)) lines.push(`- ${title}`);
  lines.push('Fix the cause, then re-run: npm --prefix frontend-demo run test:e2e');
  return lines.join('\n');
}

function counterFile(sessionId) {
  const dir = join(tmpdir(), 'kiro-ui-verify');
  mkdirSync(dir, { recursive: true });
  return join(dir, `${sanitizeSessionId(sessionId)}.json`);
}

function frontendChanged(cwd) {
  const res = spawnSync('git', ['status', '--porcelain', '--', `${FRONTEND_DIR}/public`], { cwd, encoding: 'utf8' });
  if (res.status !== 0) return true; // not a git repo or git missing: run the checks anyway
  return res.stdout.trim().length > 0;
}

export function main({ stdin = '', cwd = process.cwd(), env = process.env, runner, changed } = {}) {
  const event = parseEvent(stdin);
  const workdir = event.cwd && existsSync(event.cwd) ? event.cwd : cwd;
  if (!existsSync(join(workdir, FRONTEND_DIR, 'package.json'))) {
    return { exitCode: 0, stdout: '', stderr: '' };
  }
  const isChanged = changed ? changed(workdir) : frontendChanged(workdir);
  if (!isChanged) return { exitCode: 0, stdout: '', stderr: '' };

  const maxAttempts = Number.parseInt(env.KIRO_UI_VERIFY_MAX_ATTEMPTS || '', 10) || DEFAULT_MAX_ATTEMPTS;
  const file = counterFile(event.session_id);
  const previous = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).attempts || 0 : 0;

  const run = runner || (() => {
    const res = spawnSync('npm', ['--prefix', FRONTEND_DIR, 'run', 'test:e2e'], {
      cwd: workdir, encoding: 'utf8', timeout: 280_000, env: { ...env, CI: '1' },
    });
    const reportPath = join(workdir, FRONTEND_DIR, 'test-results', 'results.json');
    const report = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, 'utf8')) : {};
    return { ok: res.status === 0, report };
  });
  const { ok, report } = run();
  const summary = summarizeResults(report);
  const attempts = ok ? 0 : previous + 1;
  const decision = decide({ ok, attempts, maxAttempts });

  if (decision.resetCounter) rmSync(file, { force: true });
  else writeFileSync(file, JSON.stringify({ attempts }));

  if (decision.stream === 'stderr') {
    return { exitCode: decision.exitCode, stdout: '', stderr: formatFailure(summary, attempts, maxAttempts) };
  }
  if (decision.stream === 'stdout') {
    return {
      exitCode: 0,
      stdout: `Frontend browser checks still failing after ${maxAttempts} attempts; stopping automatic retries. Ask the user how to proceed.`,
      stderr: '',
    };
  }
  return { exitCode: 0, stdout: '', stderr: '' };
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
