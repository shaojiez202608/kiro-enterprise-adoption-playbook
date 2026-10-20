// Browser checks for the frontend demo. These mirror what an agent would do through
// a browser automation MCP server: open the page, click, read console errors, screenshot.
import { test, expect } from '@playwright/test';

function collectErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

test('page loads all devices without console errors', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Device Fleet Board');
  await expect(page.locator('#device-table tbody tr')).toHaveCount(6);
  await expect(page.getByRole('status')).toHaveText('Showing 6 of 6 devices');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('status filter shows only matching devices', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Status').selectOption('offline');
  const rows = page.locator('#device-table tbody tr');
  await expect(rows).toHaveCount(2);
  for (const status of await rows.evaluateAll((trs) => trs.map((tr) => tr.dataset.status))) {
    expect(status).toBe('offline');
  }
  await expect(page.getByRole('status')).toHaveText('Showing 2 of 6 devices');
});

test('maintenance note form validates input and saves a note', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.getByRole('alert')).toHaveText('Note is required.');
  await page.getByLabel('Device', { exact: true }).selectOption('DEV-0003');
  await page.getByLabel(/^Note/).fill('Replaced card reader cable');
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.getByRole('alert')).toBeHidden();
  await expect(page.getByRole('list', { name: 'Saved notes' }).getByRole('listitem'))
    .toHaveText(['DEV-0003: Replaced card reader cable']);
});

test('captures a full-page screenshot as evidence', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
  const path = testInfo.outputPath('fleet-board.png');
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach('fleet-board', { path, contentType: 'image/png' });
});

test('console error detection catches a simulated error', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?simulate-error=1');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
  expect(errors.some((e) => e.includes('Simulated error'))).toBe(true);
});

test('server rejects path traversal', async ({ request }) => {
  const res = await request.get('/..%2f..%2fpackage.json');
  expect([400, 404]).toContain(res.status());
});
