#!/usr/bin/env node
// Read-only preflight for local use: checks the tool chain this repository needs. It changes nothing.
// There is no AWS deployment in this project, so no account or region is required or checked here;
// `make verify-cleanup` is the only target that talks to AWS (read-only).
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';

const results = [];
const check = (name, ok, detail, required = true) => results.push({ name, ok, detail, required });
const version = (cmd, args = ['--version']) => {
  // nosemgrep: javascript.lang.security.audit.spawn-shell-true.spawn-shell-true -- command and arguments are constants; a shell is used only on Windows, where npm is a .cmd shim
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: platform() === 'win32' });
  return r.status === 0 ? (r.stdout || r.stderr).trim().split('\n')[0] : null;
};

const major = Number(process.versions.node.split('.')[0]);
check('Node.js >= 20', major >= 20, `found ${process.versions.node}`);
const npm = version('npm');
check('npm', Boolean(npm), npm || 'not found');
const git = version('git');
check('git', Boolean(git), git || 'not found');

const demo = new URL('../examples/frontend-demo/', import.meta.url).pathname;
const installed = existsSync(join(demo, 'node_modules', '@playwright', 'test', 'package.json'));
check('demo dependencies installed (npm run setup:e2e)', installed, installed ? 'ok' : 'missing: run `npm run setup:e2e`');

const cacheDir = process.env.PLAYWRIGHT_BROWSERS_PATH
  || (platform() === 'darwin' ? join(homedir(), 'Library', 'Caches', 'ms-playwright')
    : platform() === 'win32' ? join(process.env.LOCALAPPDATA || '', 'ms-playwright') : join(homedir(), '.cache', 'ms-playwright'));
const browsers = existsSync(cacheDir) ? readdirSync(cacheDir).filter((d) => d.startsWith('chromium')) : [];
check('Playwright Chromium in the browser cache', browsers.length > 0, browsers.join(', ') || `none in ${cacheDir}`);

const gitleaks = version('gitleaks', ['version']);
check('gitleaks (only for `make scan`)', Boolean(gitleaks), gitleaks || 'not found', false);

let failed = 0;
for (const r of results) {
  const mark = r.ok ? 'OK  ' : r.required ? 'FAIL' : 'WARN';
  if (!r.ok && r.required) failed += 1;
  console.log(`${mark} ${r.name}: ${r.detail}`);
}
console.log('AWS: not used by this project (no deployment). Nothing to confirm.');
process.exit(failed ? 1 : 0);
