#!/usr/bin/env node
// Monthly reconciliation of paid subscriptions vs. active users (prototype, offline, read-only).
//
// Inputs (both are files the administrator downloads; this tool never calls AWS):
//   --subscriptions <csv>  CSV from the Kiro console "Download CSV" button on the Users & Groups
//                          Subscriptions table. Documented fields: User name, Subscription status,
//                          Kiro plan, Plan source, Activation date. The exact header spelling is not
//                          documented; override with --sub-key / --sub-status if yours differs.
//   --activity <csv>...    Daily user activity report CSVs (per-client report) from your S3 bucket.
//                          Documented columns include Date, UserId, Client_Type, Credits_Used,
//                          Total_Messages, User_Email.
//   --month YYYY-MM        Only activity rows whose Date starts with this prefix are counted.
//
//   --min-match-rate R     Minimum share of activity users that must match a subscription user
//                          (default 0.5). Below it, or with no match at all, the exit code is 3.
//
// The join key between the two files is an assumption (see OPEN-QUESTIONS.md): by default the
// subscription "User name" column is matched case-insensitively to the activity "User_Email" column.
//
// Exit codes: 0 ok; 2 input error (missing column, no rows, no rows in --month, bad arguments);
// 3 the report was produced but the join key looks wrong (warnings on stderr, statistics in the output).
// Exact duplicate activity rows (for example the same report passed twice) are counted once; several
// subscription rows for one user are merged.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function parseCsvTable(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i += 1; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); if (row.some((v) => v !== '')) rows.push(row); }
  if (rows.length === 0) return { header: [], rows: [] };
  const header = rows[0].map((h) => h.trim());
  return { header, rows: rows.slice(1).map((r) => Object.fromEntries(header.map((h, idx) => [h, (r[idx] ?? '').trim()]))) };
}

export function parseCsv(text) {
  return parseCsvTable(text).rows;
}

export class InputError extends Error {}

const norm = (v) => String(v || '').trim().toLowerCase();
const STATUS_RANK = { active: 3, pending: 2, canceled: 1, cancelled: 1 };
export const DEFAULT_MIN_MATCH_RATE = 0.5;

function requireColumns(label, columns, required) {
  const have = new Set(columns);
  const missing = required.filter((c) => !have.has(c));
  if (missing.length) {
    throw new InputError(`${label}: column(s) not found: ${missing.map((c) => `"${c}"`).join(', ')}. `
      + `Columns in the file: ${columns.map((c) => `"${c}"`).join(', ') || '(none)'}. Use --sub-key / --sub-status / --act-key to map them.`);
  }
}

const columnsOf = (rows, given) => given || (rows.length ? Object.keys(rows[0]) : []);

export function reconcile({
  subscriptions, activity, month, subKey = 'User name', subStatus = 'Subscription status', subPlan = 'Kiro plan', actKey = 'User_Email',
  subscriptionColumns, activityColumns, minMatchRate = DEFAULT_MIN_MATCH_RATE,
}) {
  if (subscriptions.length === 0) throw new InputError('Subscriptions export has no data rows.');
  if (activity.length === 0) throw new InputError('Activity report(s) have no data rows.');
  requireColumns('Subscriptions export', columnsOf(subscriptions, subscriptionColumns), [subKey, subStatus]);
  requireColumns('Activity report', columnsOf(activity, activityColumns), [actKey, 'Date']);

  // The same report passed twice (or overlapping downloads) would double the counts: drop exact duplicates.
  const seenRows = new Set();
  let duplicateActivityRows = 0;
  const inMonth = [];
  for (const row of activity) {
    const sig = JSON.stringify(Object.entries(row).sort());
    if (seenRows.has(sig)) { duplicateActivityRows += 1; continue; }
    seenRows.add(sig);
    if (month && !String(row.Date || '').startsWith(month)) continue;
    inMonth.push(row);
  }
  if (month && inMonth.length === 0) {
    const samples = [...new Set(activity.map((r) => r.Date).filter(Boolean))].slice(0, 3);
    throw new InputError(`No activity rows match --month ${month}. The Date column must start with YYYY-MM; `
      + `sample values: ${samples.map((d) => `"${d}"`).join(', ') || '(empty)'}.`);
  }

  const usage = new Map();
  let activityRowsWithoutKey = 0;
  for (const row of inMonth) {
    const key = norm(row[actKey]);
    if (!key) { activityRowsWithoutKey += 1; continue; }
    const u = usage.get(key) || { messages: 0, credits: 0, days: new Set(), clients: new Set() };
    u.messages += Number.parseFloat(row.Total_Messages || '0') || 0;
    u.credits += Number.parseFloat(row.Credits_Used || '0') || 0;
    if (row.Date) u.days.add(row.Date);
    if (row.Client_Type) u.clients.add(row.Client_Type);
    usage.set(key, u);
  }

  // One user can appear on several subscription rows (for example through two groups): merge them,
  // keeping the strongest status (Active > Pending > Canceled) and every plan seen.
  const subs = new Map();
  let subscriptionRowsWithoutKey = 0;
  for (const sub of subscriptions) {
    const key = norm(sub[subKey]);
    if (!key) { subscriptionRowsWithoutKey += 1; continue; }
    const status = norm(sub[subStatus]);
    const prev = subs.get(key);
    if (!prev) { subs.set(key, { user: sub[subKey], status: sub[subStatus], plans: new Set([sub[subPlan]].filter(Boolean)), rows: 1 }); continue; }
    prev.rows += 1;
    if (sub[subPlan]) prev.plans.add(sub[subPlan]);
    if ((STATUS_RANK[status] || 0) > (STATUS_RANK[norm(prev.status)] || 0)) prev.status = sub[subStatus];
  }

  const users = [];
  for (const [key, sub] of subs) {
    const status = norm(sub.status);
    const u = usage.get(key);
    const used = Boolean(u && (u.messages > 0 || u.credits > 0));
    let category;
    if (status === 'active') category = used ? 'active_with_usage' : 'active_no_usage';
    else if (status === 'pending') category = used ? 'pending_with_usage' : 'pending';
    else if (status === 'canceled' || status === 'cancelled') category = used ? 'canceled_with_usage' : 'canceled';
    else category = 'unknown_status';
    users.push({
      user: sub.user, status: sub.status, plan: [...sub.plans].join(' + '), category, subscriptionRows: sub.rows,
      activeDays: u ? u.days.size : 0, messages: u ? u.messages : 0, clients: u ? [...u.clients].sort() : [],
    });
  }
  for (const [key, u] of usage) {
    if (!subs.has(key)) {
      users.push({ user: key, status: '', plan: '', category: 'activity_without_subscription', subscriptionRows: 0, activeDays: u.days.size, messages: u.messages, clients: [...u.clients].sort() });
    }
  }
  const summary = {};
  for (const u of users) summary[u.category] = (summary[u.category] || 0) + 1;

  const matchedUsers = [...usage.keys()].filter((k) => subs.has(k)).length;
  const stats = {
    subscriptionRows: subscriptions.length, subscriptionUsers: subs.size, subscriptionRowsWithoutKey,
    usersWithSeveralSubscriptionRows: [...subs.values()].filter((s) => s.rows > 1).length,
    activityRows: activity.length, duplicateActivityRows, activityRowsInMonth: inMonth.length, activityRowsWithoutKey,
    activityUsers: usage.size, matchedUsers, matchRate: usage.size ? matchedUsers / usage.size : null,
    joinKey: `${subKey} = ${actKey}`,
  };
  const warnings = [];
  if (stats.duplicateActivityRows) warnings.push(`${stats.duplicateActivityRows} duplicate activity row(s) ignored (was the same report passed twice?).`);
  if (stats.usersWithSeveralSubscriptionRows) warnings.push(`${stats.usersWithSeveralSubscriptionRows} user(s) appear on several subscription rows; merged (strongest status kept).`);
  if (stats.subscriptionRowsWithoutKey) warnings.push(`${stats.subscriptionRowsWithoutKey} subscription row(s) have an empty "${subKey}" and were skipped.`);
  if (stats.activityRowsWithoutKey) warnings.push(`${stats.activityRowsWithoutKey} activity row(s) have an empty "${actKey}" and were skipped.`);
  let mismatch = false;
  if (usage.size > 0 && matchedUsers === 0) {
    mismatch = true;
    warnings.push(`No activity user matches any subscription user on ${stats.joinKey}. The two columns probably hold different attributes; check the join key (--sub-key, --act-key).`);
  } else if (stats.matchRate !== null && stats.matchRate < minMatchRate) {
    mismatch = true;
    warnings.push(`Only ${matchedUsers} of ${usage.size} activity users (${Math.round(stats.matchRate * 100)}%) match a subscription user on ${stats.joinKey}, below ${Math.round(minMatchRate * 100)}%. Check the join key before acting on the result.`);
  }
  return { month: month || null, stats, warnings, mismatch, summary, users };
}

export const CATEGORY_NOTES = {
  active_with_usage: 'Active subscription with activity in the month.',
  active_no_usage: 'Active (billed) subscription with no activity in the month. Review with the team lead.',
  pending: 'Subscribed but not activated. Per the Kiro docs, pending subscriptions are not charged.',
  pending_with_usage: 'Pending in the export but activity exists. Re-download the export; check the join key.',
  canceled: 'Canceled subscription with no activity.',
  canceled_with_usage: 'Canceled but active this month. Expected if cancellation takes effect at month end.',
  activity_without_subscription: 'Activity row with no matching subscription row. Check the join key, other profiles, or deleted users.',
  unknown_status: 'Status value not recognised. Check the export header and values.',
};

export function toMarkdown(result) {
  const s = result.stats;
  const rate = s.matchRate === null ? 'n/a' : `${Math.round(s.matchRate * 100)}%`;
  const lines = [`# Subscription reconciliation${result.month ? ` (${result.month})` : ''}`, '',
    `Join key: \`${s.joinKey}\`. Subscription rows: ${s.subscriptionRows} (${s.subscriptionUsers} users). `
    + `Activity rows: ${s.activityRows} (${s.duplicateActivityRows} duplicates ignored, ${s.activityRowsInMonth} in the month). `
    + `Activity users: ${s.activityUsers}; matched to a subscription: ${s.matchedUsers} (${rate}).`, ''];
  for (const w of result.warnings) lines.push(`> Warning: ${w}`);
  if (result.warnings.length) lines.push('');
  lines.push('| Category | Users | Meaning |', '|---|---|---|');
  for (const [cat, count] of Object.entries(result.summary).sort()) lines.push(`| ${cat} | ${count} | ${CATEGORY_NOTES[cat] || ''} |`);
  lines.push('', '| User | Status | Plan | Category | Active days | Clients |', '|---|---|---|---|---|---|');
  for (const u of result.users) lines.push(`| ${u.user} | ${u.status} | ${u.plan} | ${u.category} | ${u.activeDays} | ${u.clients.join(' ')} |`);
  return `${lines.join('\n')}\n`;
}

export function parseArgs(argv) {
  const opts = { activity: [], format: 'markdown' };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => { i += 1; if (i >= argv.length) throw new Error(`Missing value for ${a}`); return argv[i]; };
    if (a === '--subscriptions') opts.subscriptions = next();
    else if (a === '--activity') { while (argv[i + 1] && !argv[i + 1].startsWith('--')) { i += 1; opts.activity.push(argv[i]); } }
    else if (a === '--month') opts.month = next();
    else if (a === '--sub-key') opts.subKey = next();
    else if (a === '--sub-status') opts.subStatus = next();
    else if (a === '--act-key') opts.actKey = next();
    else if (a === '--format') opts.format = next();
    else if (a === '--min-match-rate') opts.minMatchRate = Number(next());
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!opts.subscriptions || opts.activity.length === 0) throw new Error('Usage: --subscriptions <csv> --activity <csv>... [--month YYYY-MM] [--format markdown|json]');
  if (opts.month && !/^\d{4}-\d{2}$/.test(opts.month)) throw new Error('--month must be YYYY-MM');
  if (opts.minMatchRate !== undefined && !(opts.minMatchRate >= 0 && opts.minMatchRate <= 1)) throw new Error('--min-match-rate must be between 0 and 1');
  if (!['markdown', 'json'].includes(opts.format)) throw new Error('--format must be markdown or json');
  return opts;
}

export const EXIT_INPUT_ERROR = 2;
export const EXIT_MISMATCH = 3;

export function run(argv, readFile = (f) => readFileSync(f, 'utf8')) {
  try {
    const opts = parseArgs(argv);
    const sub = parseCsvTable(readFile(opts.subscriptions));
    const files = [...new Set(opts.activity.map((f) => resolve(f)))];
    const notes = files.length < opts.activity.length ? [`${opts.activity.length - files.length} activity file(s) given more than once; read once.`] : [];
    const tables = files.map((f) => parseCsvTable(readFile(f)));
    // A column counts as present only if every activity file has it.
    const activityColumns = tables.length ? tables[0].header.filter((h) => tables.every((t) => t.header.includes(h))) : [];
    const result = reconcile({
      subscriptions: sub.rows, activity: tables.flatMap((t) => t.rows), month: opts.month,
      subKey: opts.subKey, subStatus: opts.subStatus, actKey: opts.actKey, minMatchRate: opts.minMatchRate,
      subscriptionColumns: sub.header, activityColumns,
    });
    result.warnings.unshift(...notes);
    const stdout = opts.format === 'json' ? `${JSON.stringify(result, null, 2)}\n` : toMarkdown(result);
    const stderr = result.warnings.map((w) => `warning: ${w}`).join('\n');
    return { exitCode: result.mismatch ? EXIT_MISMATCH : 0, stdout, stderr };
  } catch (err) {
    return { exitCode: EXIT_INPUT_ERROR, stdout: '', stderr: `error: ${err.message}` };
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { exitCode, stdout, stderr } = run(process.argv.slice(2));
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(`${stderr}\n`);
  process.exit(exitCode);
}
