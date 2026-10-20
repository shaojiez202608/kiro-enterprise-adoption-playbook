// Integration: the Stop hook runs the real Playwright suite while a dev server is already listening
// on the test port (the situation the steering file creates). Skipped when the demo's dependencies
// are not installed (`npm run setup:e2e`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main } from '../examples/scripts/kiro-ui-verify.mjs';

const EXAMPLES = new URL('../examples/', import.meta.url).pathname;
const DEMO = join(EXAMPLES, 'frontend-demo');
const installed = existsSync(join(DEMO, 'node_modules', '@playwright', 'test', 'package.json'));

function freePort() {
  return new Promise((resolvePort, reject) => {
    const srv = createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => resolvePort(String(port))); });
  });
}

function startDevServer(port) {
  return new Promise((resolveStart, reject) => {
    const child = spawn(process.execPath, ['server.mjs'], { cwd: DEMO, env: { ...process.env, PORT: port }, stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => reject(new Error('dev server did not start')), 10_000);
    child.stdout.on('data', (d) => { if (String(d).includes('listening')) { clearTimeout(timer); resolveStart(child); } });
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`dev server exited with ${code}`)); });
  });
}

test('hook passes while a dev server already occupies the test port (CI set in the environment)', { skip: !installed && 'run npm run setup:e2e first', timeout: 240_000 }, async () => {
  const port = await freePort();
  const server = await startDevServer(port);
  const stateDir = mkdtempSync(join(tmpdir(), 'kiro-hook-it-'));
  try {
    // Control: the previous behaviour (CI forced, no reuse) fails on the occupied port.
    const control = spawnSync('npm', ['--prefix', 'frontend-demo', 'run', 'test:e2e'], {
      cwd: EXAMPLES, encoding: 'utf8', timeout: 120_000, env: { ...process.env, PORT: port, CI: '1', PW_REUSE_EXISTING_SERVER: '' },
      shell: process.platform === 'win32',
    });
    assert.notEqual(control.status, 0);
    assert.match(`${control.stdout}${control.stderr}`, /already used/);

    const result = main({
      stdin: JSON.stringify({ session_id: `it${process.pid}`, cwd: EXAMPLES }),
      cwd: EXAMPLES,
      env: { ...process.env, PORT: port, CI: '1' },
      stateDir,
      fingerprint: () => 'integration',
    });
    assert.deepEqual(result, { exitCode: 0, stdout: '', stderr: '' }, result.stderr);
    assert.equal(server.exitCode, null, 'the existing dev server is reused, not replaced');
  } finally {
    server.kill();
    rmSync(stateDir, { recursive: true, force: true });
  }
});
