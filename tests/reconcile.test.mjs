import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseArgs, parseCsv, reconcile, toMarkdown } from '../tools/reconcile-subscriptions.mjs';

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
