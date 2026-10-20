// Repository content rules: no competitor IDE / network-product names, no internal phrases,
// no prices or account IDs, only allow-listed link domains, and traceable fact references.
// The word list is base64-encoded so that this file itself does not contain the names.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SKIP_DIRS = new Set(['node_modules', '.git', 'test-results', 'playwright-report']);
const TEXT_EXT = /\.(md|mjs|js|json|html|css|csv|txt|yml|yaml|toml|sh)$|^\.gitignore$|^LICENSE$|^THIRD-PARTY-LICENSES$|^Makefile$|^CODEOWNERS$|^VERSION$/;
const BANNED = Buffer.from('Q3Vyc29yCldpbmRzdXJmClZTIENvZGUKVlNDb2RlClZpc3VhbCBTdHVkaW8gQ29kZQpKZXRCcmFpbnMKSW50ZWxsaUoKQ29waWxvdApUcmFlCkNsaW5lCkNsYXVkZSBDb2RlCkNvZGV4CkFudGlncmF2aXR5Ck9wZW5DbGF3ClpzY2FsZXIKUGFsbyBBbHRvCkZvcnRpbmV0Ck5ldHNrb3BlCkJsdWUgQ29hdApDbG91ZGZsYXJlCm5ncm9rClRhaWxzY2FsZQpTcXVpZApTYW5nZm9yClBGUgpTRkRDClRMSQrlt7Lmj5DkuqTnu5nkuqflk4Hlm6LpmJ8K5Lqn5ZOB5Zui6Zif6ZyA5rGC5riF5Y2VCuaNruS6huinowrotYvog70K5omT6YCgCuS4gOermeW8jwrmnoHoh7QK5peg57yd', 'base64').toString('utf8').split('\n');

function files(dir = ROOT) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...files(full));
    else if (TEXT_EXT.test(name) && name !== 'package-lock.json') out.push(full);
  }
  return out;
}
const all = files();
const read = (f) => readFileSync(f, 'utf8');
const rel = (f) => relative(ROOT, f);

test('no banned names or phrases', () => {
  const hits = [];
  for (const f of all) {
    const text = read(f);
    for (const w of BANNED) {
      const re = /^[A-Za-z ]+$/.test(w) ? new RegExp(`\\b${w}\\b`, 'i') : new RegExp(w);
      if (re.test(text)) hits.push(`${rel(f)}: banned term #${BANNED.indexOf(w)}`);
    }
  }
  assert.deepEqual(hits, []);
});

test('no prices, currency amounts, or 12-digit account IDs', () => {
  const hits = [];
  for (const f of all.filter((x) => !x.endsWith('content-policy.test.mjs'))) {
    const text = read(f);
    // Shell scripts and the Makefile use $1-style positional parameters, which are not amounts.
    if (!/\.sh$|Makefile$/.test(f) && /\$\s?\d/.test(text)) hits.push(`${rel(f)}: dollar amount`);
    if (/(美元|人民币|元\/月|\bUSD\b|per month|\/month)/i.test(text)) hits.push(`${rel(f)}: currency or price wording`);
    if (/(?<![\d.])\d{12}(?![\d.])/.test(text.replaceAll('111122223333', ''))) hits.push(`${rel(f)}: 12-digit number (use 111122223333)`);
  }
  assert.deepEqual(hits, []);
});

test('links point only to allow-listed domains', () => {
  const allowed = [/^https:\/\/([a-z0-9-]+\.)*kiro\.dev(\/|$)/, /^https:\/\/docs\.aws\.amazon\.com\//, /^https:\/\/aws\.amazon\.com\/(blogs\/|security\/vulnerability-reporting\/|compliance\/shared-responsibility-model\/|s3\/pricing\/)$/, /^https:\/\/aws\.github\.io\/code-of-conduct/,
    /^https:\/\/github\.com\/(aws-samples|kirodotdev|kirodotdev-labs|microsoft\/playwright-mcp)/, /^https:\/\/app\.kiro\.dev/];
  const bad = [];
  for (const f of all.filter((x) => x.endsWith('.md'))) {
    for (const m of read(f).matchAll(/https?:\/\/[^\s)<>|`'"，。；]+/g)) {
      const url = m[0].replace(/[.,;:]+$/, '');
      if (/^http:\/\/127\.0\.0\.1/.test(url)) continue;
      if (!allowed.some((re) => re.test(url))) bad.push(`${rel(f)}: ${url}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('required repository files exist', () => {
  for (const f of ['README.md', 'README.zh-CN.md', 'LICENSE', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', 'SECURITY.md', '.gitignore',
    'THIRD-PARTY-LICENSES', 'CHANGELOG.md', 'VERSION', 'AGENTS.md', 'CLAUDE.md', 'Makefile', '.gitleaks.toml', '.github/CODEOWNERS',
    '.github/workflows/ci.yml', '.github/dependabot.yml', '.github/pull_request_template.md', '.github/ISSUE_TEMPLATE/config.yml', 'docs/standards-review.md',
    'SECURITY-NOTES.md', 'THREAT_MODEL.md', 'VERIFICATION.md', 'DEPLOYMENT-LOG.md', 'OPEN-QUESTIONS.md', 'DECISIONS.md',
    'docs/prior-art.md', 'docs/architecture.md', 'docs/deployment-guide.md', 'docs/demo-script.md', 'docs/handover.md', 'docs/cleanup.md',
    'docs/problem-action-matrix.md', 'docs/network-checklist.md', 'docs/credit-governance.md', 'docs/enterprise-admin.md',
    'docs/runbook-activation-day.md', 'docs/unverified-removed.md', 'docs/usage-modes.md', 'docs/interaction-efficiency.md']) {
    assert.ok(existsSync(join(ROOT, f)), `missing ${f}`);
  }
  assert.match(read(join(ROOT, 'README.md')), /Prototype/);
  assert.match(read(join(ROOT, 'LICENSE')), /MIT No Attribution/);
  assert.match(read(join(ROOT, 'LICENSE')), /Copyright Amazon\.com, Inc\. or its affiliates\. All Rights Reserved\./);
  assert.equal(read(join(ROOT, 'CLAUDE.md')).trim(), '@AGENTS.md');
  assert.match(read(join(ROOT, 'THREAT_MODEL.md')), /Status: DRAFT/);
  assert.match(read(join(ROOT, 'VERSION')), /^\d+\.\d+\.\d+\n$/);
  assert.match(read(join(ROOT, 'CHANGELOG.md')), new RegExp(`## \\[${read(join(ROOT, 'VERSION')).trim().replaceAll('.', '\\.')}\\]`));
});

test('README sections follow the required order (English and Chinese)', () => {
  const order = {
    'README.md': ['Architecture', 'Prerequisites and cost', 'Deploy', 'Use and verify', 'Troubleshooting', 'Security and limitations', 'Cleanup', 'Repository layout', 'Local tests', 'Contributing', 'Security', 'License'],
    'README.zh-CN.md': ['架构', '前置条件和成本', '部署', '使用和验证', '故障排查', '安全与局限', '清理', '目录结构', '本地测试', 'Contributing', 'Security', 'License'],
  };
  for (const [file, expected] of Object.entries(order)) {
    const text = read(join(ROOT, file));
    assert.ok(text.indexOf('Prototype') < text.indexOf('\n## '), `${file}: disclaimer first`);
    const headings = [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    assert.deepEqual(headings, expected, file);
  }
});

test('GitHub Actions are pinned by commit SHA with a version comment; workflow permissions are read-only', () => {
  const wf = read(join(ROOT, '.github/workflows/ci.yml'));
  const uses = [...wf.matchAll(/uses: (\S+)(.*)$/gm)];
  assert.ok(uses.length > 0);
  for (const [, ref, rest] of uses) {
    assert.match(ref, /@[0-9a-f]{40}$/, ref);
    assert.match(rest, /# v\d+\.\d+\.\d+/, ref);
  }
  assert.match(wf, /^permissions:\n  contents: read$/m);
});

test('matrix has four problem rows, each with an official link and the verification date', () => {
  const text = read(join(ROOT, 'docs/problem-action-matrix.md'));
  assert.match(text, /2026-10-20/);
  const rows = text.split('\n').filter((l) => /^\| [1-4]\. /.test(l));
  assert.equal(rows.length, 4);
  for (const r of rows) {
    assert.match(r, /https:\/\/kiro\.dev\/docs\//);
    assert.ok(r.split('|').length >= 8, 'row has all columns');
  }
});

test('every fact, removal, question and decision reference is defined', () => {
  const defs = (file, prefix) => new Set([...read(join(ROOT, file)).matchAll(new RegExp(`^\\| (${prefix}-\\d+) \\|`, 'gm'))].map((m) => m[1]));
  const sets = { F: defs('docs/architecture.md', 'F'), U: defs('docs/unverified-removed.md', 'U'), Q: defs('OPEN-QUESTIONS.md', 'Q'), D: defs('DECISIONS.md', 'D') };
  assert.ok(sets.F.size >= 40 && sets.U.size > 0 && sets.Q.size > 0 && sets.D.size > 0);
  const missing = [];
  for (const f of all.filter((x) => x.endsWith('.md') || x.endsWith('.mjs'))) {
    for (const m of read(f).matchAll(/\b([FUQD])-(\d{2})\b/g)) if (!sets[m[1]].has(`${m[1]}-${m[2]}`)) missing.push(`${rel(f)}: ${m[0]}`);
  }
  assert.deepEqual(missing, []);
});

test('every fact row carries an official link and the verification date', () => {
  const rows = read(join(ROOT, 'docs/architecture.md')).split('\n').filter((l) => /^\| F-\d+ \|/.test(l));
  for (const r of rows) {
    assert.match(r, /https:\/\/(kiro\.dev|docs\.aws\.amazon\.com|aws\.amazon\.com|github\.com)\//, r.slice(0, 12));
    assert.match(r, /\| 2026-10-2[01] \|$/, r.slice(0, 12));
  }
});
