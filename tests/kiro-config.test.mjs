// Validates the example .kiro configuration against the documented formats
// (MCP config file structure, hook file schema v1, steering front matter).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const EX = new URL('../examples/', import.meta.url).pathname;
const KIRO = join(EX, '.kiro');

// Trigger names documented for .kiro/hooks/*.json (IDE 1.0 / CLI V3).
const TRIGGERS = new Set(['SessionStart', 'Stop', 'UserPromptSubmit', 'PreTaskExec', 'PostTaskExec', 'PreToolUse',
  'PostToolUse', 'PostFileCreate', 'PostFileSave', 'PostFileDelete', 'SessionEnd']);
const INCLUSION = new Set(['always', 'fileMatch', 'manual', 'auto']);

function frontMatter(text) {
  assert.ok(text.startsWith('---\n'), 'front matter must be the first content in the file');
  const end = text.indexOf('\n---', 4);
  assert.ok(end > 0, 'front matter must be closed by ---');
  const fields = {};
  for (const line of text.slice(4, end).split('\n')) {
    const m = line.match(/^([A-Za-z]+):\s*(.*)$/);
    if (m) fields[m[1]] = m[2];
  }
  return fields;
}

test('mcp.json follows the documented structure', () => {
  const cfg = JSON.parse(readFileSync(join(KIRO, 'settings', 'mcp.json'), 'utf8'));
  assert.equal(typeof cfg.mcpServers, 'object');
  for (const [name, server] of Object.entries(cfg.mcpServers)) {
    assert.ok(typeof server.command === 'string' || typeof server.url === 'string', `${name}: command or url required`);
    if (server.args) assert.ok(Array.isArray(server.args), `${name}: args must be an array`);
    if (server.autoApprove) assert.ok(Array.isArray(server.autoApprove));
    if (server.disabledTools) assert.ok(Array.isArray(server.disabledTools));
    if (server.disabled !== undefined) assert.equal(typeof server.disabled, 'boolean');
  }
});

test('playwright MCP server is pinned, headless, origin-limited, and not auto-approved', () => {
  const { playwright } = JSON.parse(readFileSync(join(KIRO, 'settings', 'mcp.json'), 'utf8')).mcpServers;
  const pkg = playwright.args.find((a) => a.startsWith('@playwright/mcp@'));
  assert.ok(pkg, 'package argument present');
  assert.match(pkg, /^@playwright\/mcp@\d+\.\d+\.\d+$/, 'version must be pinned, not @latest');
  assert.ok(playwright.args.includes('--headless'));
  assert.ok(playwright.args.includes('--isolated'));
  const i = playwright.args.indexOf('--allowed-origins');
  assert.ok(i >= 0 && /^http:\/\/127\.0\.0\.1:\d+$/.test(playwright.args[i + 1]));
  assert.deepEqual(playwright.autoApprove, []);
});

test('hook files follow schema v1 with documented triggers', () => {
  const dir = join(KIRO, 'hooks');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  assert.ok(files.length > 0);
  for (const f of files) {
    const doc = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    assert.equal(doc.version, 'v1', `${f}: version`);
    assert.ok(Array.isArray(doc.hooks) && doc.hooks.length > 0);
    for (const h of doc.hooks) {
      assert.equal(typeof h.name, 'string');
      assert.ok(TRIGGERS.has(h.trigger), `${f}: unknown trigger ${h.trigger}`);
      assert.ok(['command', 'agent'].includes(h.action.type));
      if (h.action.type === 'command') assert.equal(typeof h.action.command, 'string');
      if (h.action.type === 'agent') assert.equal(typeof h.action.prompt, 'string');
      if (h.trigger === 'Stop') assert.equal(h.matcher, undefined, 'Stop hooks do not use matchers');
      if (h.timeout !== undefined) assert.ok(Number.isInteger(h.timeout) && h.timeout >= 0);
      const script = h.action.command && h.action.command.match(/^node (\S+)/);
      if (script) assert.ok(existsSync(join(EX, script[1])), `${f}: referenced script ${script[1]} exists`);
    }
  }
});

test('example hooks use command actions only (agent prompt actions consume credits)', () => {
  const dir = join(KIRO, 'hooks');
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    for (const h of JSON.parse(readFileSync(join(dir, f), 'utf8')).hooks) assert.equal(h.action.type, 'command');
  }
});

test('steering files have valid inclusion front matter', () => {
  const dir = join(KIRO, 'steering');
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  assert.ok(files.length > 0);
  for (const f of files) {
    const fm = frontMatter(readFileSync(join(dir, f), 'utf8'));
    const mode = fm.inclusion || 'always';
    assert.ok(INCLUSION.has(mode), `${f}: inclusion ${mode}`);
    if (mode === 'fileMatch') {
      assert.ok(fm.fileMatchPattern, `${f}: fileMatchPattern required`);
      const patterns = JSON.parse(fm.fileMatchPattern);
      assert.ok(Array.isArray(patterns) && patterns.every((p) => p.startsWith('frontend-demo/')));
    }
    if (mode === 'auto') assert.ok(fm.name && fm.description, `${f}: auto needs name and description`);
  }
});

test('steering references the demo origin that the MCP server allows', () => {
  const steering = readFileSync(join(KIRO, 'steering', 'frontend-verification.md'), 'utf8');
  const { playwright } = JSON.parse(readFileSync(join(KIRO, 'settings', 'mcp.json'), 'utf8')).mcpServers;
  const origin = playwright.args[playwright.args.indexOf('--allowed-origins') + 1];
  assert.ok(steering.includes(origin));
});
