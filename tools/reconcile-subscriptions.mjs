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
// The join key between the two files is an assumption (see OPEN-QUESTIONS.md): by default the
// subscription "User name" column is matched case-insensitively to the activity "User_Email" column.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function parseCsv(text) {
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
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, idx) => [h, (r[idx] ?? '').trim()])));
}

const norm = (v) => String(v || '').trim().toLowerCase();

export function reconcile({ subscriptions, activity, month, subKey = 'User name', subStatus = 'Subscription status', subPlan = 'Kiro plan', actKey = 'User_Email' }) {
  const usage = new Map();
  for (const row of activity) {
    if (month && !String(row.Date || '').startsWith(month)) continue;
    const key = norm(row[actKey]);
    if (!key) continue;
    const u = usage.get(key) || { messages: 0, credits: 0, days: new Set(), clients: new Set() };
    u.messages += Number.parseFloat(row.Total_Messages || '0') || 0;
    u.credits += Number.parseFloat(row.Credits_Used || '0') || 0;
    if (row.Date) u.days.add(row.Date);
    if (row.Client_Type) u.clients.add(row.Client_Type);
    usage.set(key, u);
  }

  const users = [];
  const seen = new Set();
  for (const sub of subscriptions) {
    const key = norm(sub[subKey]);
    if (!key) continue;
    seen.add(key);
    const status = norm(sub[subStatus]);
    const u = usage.get(key);
    const used = Boolean(u && (u.messages > 0 || u.credits > 0));
    let category;
    if (status === 'active') category = used ? 'active_with_usage' : 'active_no_usage';
    else if (status === 'pending') category = used ? 'pending_with_usage' : 'pending';
    else if (status === 'canceled' || status === 'cancelled') category = used ? 'canceled_with_usage' : 'canceled';
    else category = 'unknown_status';
    users.push({
      user: sub[subKey], status: sub[subStatus], plan: sub[subPlan] || '', category,
      activeDays: u ? u.days.size : 0, messages: u ? u.messages : 0, clients: u ? [...u.clients].sort() : [],
    });
  }
  for (const [key, u] of usage) {
    if (!seen.has(key)) {
      users.push({ user: key, status: '', plan: '', category: 'activity_without_subscription', activeDays: u.days.size, messages: u.messages, clients: [...u.clients].sort() });
    }
  }
  const summary = {};
  for (const u of users) summary[u.category] = (summary[u.category] || 0) + 1;
  return { month: month || null, summary, users };
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
  const lines = [`# Subscription reconciliation${result.month ? ` (${result.month})` : ''}`, '', '| Category | Users | Meaning |', '|---|---|---|'];
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
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!opts.subscriptions || opts.activity.length === 0) throw new Error('Usage: --subscriptions <csv> --activity <csv>... [--month YYYY-MM] [--format markdown|json]');
  if (opts.month && !/^\d{4}-\d{2}$/.test(opts.month)) throw new Error('--month must be YYYY-MM');
  return opts;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const opts = parseArgs(process.argv.slice(2));
    const subscriptions = parseCsv(readFileSync(opts.subscriptions, 'utf8'));
    const activity = opts.activity.flatMap((f) => parseCsv(readFileSync(f, 'utf8')));
    const result = reconcile({ subscriptions, activity, month: opts.month, subKey: opts.subKey, subStatus: opts.subStatus, actKey: opts.actKey });
    process.stdout.write(opts.format === 'json' ? `${JSON.stringify(result, null, 2)}\n` : toMarkdown(result));
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(2);
  }
}
