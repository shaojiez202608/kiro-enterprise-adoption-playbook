#!/usr/bin/env node
// Dependency-free lint (read-only): JavaScript syntax check, JSON validity, and basic text hygiene
// (no tabs in source, no trailing whitespace, final newline). Exits 1 on any finding.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SKIP = new Set(['node_modules', '.git', 'test-results', 'playwright-report']);
const TEXT = /\.(mjs|js|json|md|yml|yaml|toml|css|html|csv|sh)$|^(Makefile|CODEOWNERS|VERSION|LICENSE|THIRD-PARTY-LICENSES|\.gitignore)$/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

export function lintText(name, text) {
  const problems = [];
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (/[ \t]+$/.test(line) && !name.endsWith('.md')) problems.push(`${i + 1}: trailing whitespace`);
    if (/\t/.test(line) && !/(^|\/)Makefile$/.test(name) && !name.endsWith('.csv')) problems.push(`${i + 1}: tab character`);
  });
  if (text.length > 0 && !text.endsWith('\n')) problems.push('missing final newline');
  return problems;
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const findings = [];
  for (const file of walk(ROOT)) {
    const rel = relative(ROOT, file);
    const base = rel.split('/').pop();
    if (!TEXT.test(base)) continue;
    const text = readFileSync(file, 'utf8');
    if (/\.(mjs|js)$/.test(base)) {
      const res = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
      if (res.status !== 0) findings.push(`${rel}: syntax error\n${res.stderr.trim()}`);
    }
    if (base.endsWith('.json')) {
      try { JSON.parse(text); } catch (err) { findings.push(`${rel}: invalid JSON (${err.message})`); }
    }
    for (const p of lintText(rel, text)) findings.push(`${rel}:${p}`);
  }
  for (const f of findings) console.log(f);
  console.log(`lint: ${findings.length} finding(s)`);
  process.exit(findings.length ? 1 : 0);
}
