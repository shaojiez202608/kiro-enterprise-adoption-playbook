import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATEGORY_NOTES, EXIT_INPUT_ERROR, EXIT_MISMATCH, parseArgs, parseCsv, reconcile, run, toMarkdown } from '../tools/reconcile-subscriptions.mjs';

const read = (p) => readFileSync(new URL(`../sample-data/${p}`, import.meta.url), 'utf8');

test('parseCsv handles quotes, embedded commas, CRLF and BOM', () => {
  const rows = parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n\r\n1,2');
  assert.deepEqual(rows, [{ a: 'x, y', b: 'say "hi"' }, { a: '1', b: '2' }]);
  assert.deepEqual(parseCsv(''), []);
});

test('reconcile classifies synthetic sample data for one month', () => {
  const result = reconcile({
    subscriptions: parseCsv(read('subscriptions-export.sample.csv')),
    activity: [...parseCsv(read('user-activity-ide.sample.csv')), ...parseCsv(read('user-activity-cli.sample.csv'))],
    month: '2026-01',
  });
  assert.deepEqual(result.summary, {
    active_with_usage: 2, active_no_usage: 2, pending: 1, canceled_with_usage: 1, activity_without_subscription: 1,
  });
  const u02 = result.users.find((u) => u.user === 'user02@example.com');
  assert.equal(u02.category, 'active_no_usage', 'December activity does not count for January');
  const u03 = result.users.find((u) => u.user === 'user03@example.com');
  assert.deepEqual(u03.clients, ['KIRO_CLI', 'KIRO_IDE']);
  assert.equal(u03.activeDays, 2);
  assert.match(toMarkdown(result), /\| active_no_usage \| 2 \|/);
});

test('reconcile supports custom column names', () => {
  const result = reconcile({
    subscriptions: [{ Login: 'A@Example.com', State: 'Active' }],
    activity: [{ Date: '2026-02-01', Mail: 'a@example.com', Total_Messages: '1' }],
    month: '2026-02', subKey: 'Login', subStatus: 'State', actKey: 'Mail',
  });
  assert.equal(result.users[0].category, 'active_with_usage');
});

test('parseArgs validates required inputs and month format', () => {
  assert.throws(() => parseArgs([]), /Usage/);
  assert.throws(() => parseArgs(['--subscriptions', 's.csv', '--activity', 'a.csv', '--month', '2026-1']), /YYYY-MM/);
  const o = parseArgs(['--subscriptions', 's.csv', '--activity', 'a.csv', 'b.csv', '--month', '2026-01']);
  assert.deepEqual(o.activity, ['a.csv', 'b.csv']);
});

// Command-line runs against in-memory files.
const SUB = read('subscriptions-export.sample.csv');
const IDE = read('user-activity-ide.sample.csv');
const CLI = read('user-activity-cli.sample.csv');
const cli = (files, extra = []) => run(
  ['--subscriptions', 'sub.csv', '--activity', ...Object.keys(files).filter((f) => f !== 'sub.csv'), '--month', '2026-01', ...extra],
  (f) => { const name = f.split('/').pop(); if (!(name in files)) throw new Error(`ENOENT ${name}`); return files[name]; },
);

test('sample data: exit 0, statistics in the output header', () => {
  const r = cli({ 'sub.csv': SUB, 'ide.csv': IDE, 'cli.csv': CLI });
  assert.equal(r.exitCode, 0, r.stderr);
  assert.match(r.stdout, /Join key: `User name = User_Email`/);
  assert.match(r.stdout, /Activity users: 4; matched to a subscription: 3 \(75%\)/);
});

test('mismatch (a): subscription key column named differently -> error naming the missing column', () => {
  const r = cli({ 'sub.csv': SUB.replace('User name,', 'Username,'), 'ide.csv': IDE });
  assert.equal(r.exitCode, EXIT_INPUT_ERROR);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /Subscriptions export: column\(s\) not found: "User name"/);
  assert.match(r.stderr, /"Username"/);
  assert.equal(cli({ 'sub.csv': SUB.replace('User name,', 'Username,'), 'ide.csv': IDE }, ['--sub-key', 'Username']).exitCode, 0);
});

test('mismatch (b): Date not in YYYY-MM-DD -> --month matches nothing -> error with sample values', () => {
  const usDates = IDE.replace(/^2026-01-0(\d)/gm, (_, d) => `01/0${d}/2026`).replace(/^2025-12-30/m, '12/30/2025');
  const r = cli({ 'sub.csv': SUB, 'ide.csv': usDates });
  assert.equal(r.exitCode, EXIT_INPUT_ERROR);
  assert.match(r.stderr, /No activity rows match --month 2026-01/);
  assert.match(r.stderr, /"01\/05\/2026"/);
});

test('mismatch (c): join columns hold different attributes -> report still printed, warning, exit 3', () => {
  const names = SUB.replace(/user0(\d)@example\.com/g, (_, d) => `User 0${d}`);
  const r = cli({ 'sub.csv': names, 'ide.csv': IDE, 'cli.csv': CLI });
  assert.equal(r.exitCode, EXIT_MISMATCH);
  assert.match(r.stderr, /No activity user matches any subscription user on User name = User_Email/);
  assert.match(r.stdout, /matched to a subscription: 0 \(0%\)/);
  assert.match(r.stdout, /> Warning: No activity user matches/);
});

test('low match rate -> exit 3; threshold is configurable', () => {
  const partial = SUB.replace('user01@example.com', 'User 01').replace('user03@example.com', 'User 03');
  const r = cli({ 'sub.csv': partial, 'ide.csv': IDE, 'cli.csv': CLI });
  assert.equal(r.exitCode, EXIT_MISMATCH);
  assert.match(r.stderr, /Only 1 of 4 activity users \(25%\)/);
  assert.equal(cli({ 'sub.csv': partial, 'ide.csv': IDE, 'cli.csv': CLI }, ['--min-match-rate', '0.2']).exitCode, 0);
  assert.equal(cli({ 'sub.csv': SUB, 'ide.csv': IDE }, ['--min-match-rate', '2']).exitCode, EXIT_INPUT_ERROR);
});

test('activity key column missing in one of several files -> error', () => {
  const r = cli({ 'sub.csv': SUB, 'ide.csv': IDE, 'cli.csv': CLI.replace('User_Email', 'Email') });
  assert.equal(r.exitCode, EXIT_INPUT_ERROR);
  assert.match(r.stderr, /Activity report: column\(s\) not found: "User_Email"/);
});

test('same report passed twice is counted once', () => {
  const twice = run(['--subscriptions', 's', '--activity', 'a/ide.csv', 'a/ide.csv', 'a/copy.csv', '--month', '2026-01', '--format', 'json'],
    (f) => (f === 's' ? SUB : IDE));
  assert.equal(twice.exitCode, 0, twice.stderr);
  const out = JSON.parse(twice.stdout);
  assert.equal(out.stats.duplicateActivityRows, 5, 'the copy under another name is detected row by row');
  assert.equal(out.users.find((u) => u.user === 'user01@example.com').messages, 65);
  assert.match(twice.stderr, /given more than once/);
  assert.match(twice.stderr, /duplicate activity row/);
});

test('several subscription rows for one user are merged, strongest status kept', () => {
  const result = reconcile({
    subscriptions: [
      { 'User name': 'a@example.com', 'Subscription status': 'Canceled', 'Kiro plan': 'Pro' },
      { 'User name': 'A@example.com', 'Subscription status': 'Active', 'Kiro plan': 'Pro+' },
    ],
    activity: [{ Date: '2026-01-02', User_Email: 'a@example.com', Total_Messages: '2' }],
    month: '2026-01',
  });
  assert.equal(result.users.length, 1);
  assert.equal(result.users[0].category, 'active_with_usage');
  assert.equal(result.users[0].plan, 'Pro + Pro+');
  assert.equal(result.users[0].subscriptionRows, 2);
  assert.match(result.warnings.join('\n'), /several subscription rows/);
});

test('empty inputs are errors', () => {
  assert.throws(() => reconcile({ subscriptions: [], activity: [{ Date: '2026-01-01', User_Email: 'a' }] }), /no data rows/);
  assert.equal(cli({ 'sub.csv': SUB, 'ide.csv': IDE.split('\n')[0] }).exitCode, EXIT_INPUT_ERROR);
});

test('every category produced by the tool is documented in the runbook', () => {
  const runbook = readFileSync(new URL('../docs/runbook-activation-day.md', import.meta.url), 'utf8');
  for (const cat of Object.keys(CATEGORY_NOTES)) assert.match(runbook, new RegExp(`\\| \`${cat}\` \\|`), cat);
});
