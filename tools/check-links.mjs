#!/usr/bin/env node
// Checks that official links cited in the docs are reachable (HTTP status < 400).
// Reachability only: it does not detect content changes. Requires network access.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SKIP = new Set(['node_modules', '.git', 'test-results']);

export function collectFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...collectFiles(full));
    else if (name.endsWith('.md')) out.push(full);
  }
  return out;
}

export function extractLinks(text) {
  const links = new Set();
  for (const m of text.matchAll(/https:\/\/[^\s)<>|`'"，。；]+/g)) links.add(m[0].replace(/[.,;:]+$/, ''));
  return [...links];
}

// Service endpoints (not documentation pages) are skipped: an HTTP error from them is expected (F-23).
const isPlaceholder = (u) => /example\.com|<|app\.kiro\.dev|^https:\/\/(runtime|management)\./.test(u);

async function check(url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetch(url, { method, redirect: 'follow', signal: AbortSignal.timeout(20_000) });
      if (res.status < 400) return res.status;
      if (method === 'GET') return res.status;
    } catch (err) {
      if (method === 'GET') return `error: ${err.message}`;
    }
  }
  return 'unknown';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const links = new Set();
  for (const f of collectFiles(ROOT)) for (const l of extractLinks(readFileSync(f, 'utf8'))) if (!isPlaceholder(l)) links.add(l);
  let failed = 0;
  for (const url of [...links].sort()) {
    const status = await check(url);
    const ok = typeof status === 'number' && status < 400;
    if (!ok) failed += 1;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${status} ${url}`);
  }
  console.log(`\nchecked=${links.size} failed=${failed}`);
  process.exit(failed ? 1 : 0);
}
