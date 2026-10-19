import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * The suggested stores list on Procurement: drafted from MV Choice's previous
 * calls for her planned call (Aberdeen, ETA Fri 08:00). The client unticks a
 * line, changes a quantity and sends it to Compass in one click; from there it
 * is the same request, stages and invoice as a hand-written list. Edits
 * survive a reload; Reset demo clears them.
 */

const FORBIDDEN = [/chandler/i, /mark-?up/i, /third[- ]party/i, /cannot assist/i];

async function expectOneSupplier(page: Page) {
  const body = await page.locator('body').innerText();
  for (const pattern of FORBIDDEN) {
    expect(body, String(pattern)).not.toMatch(pattern);
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('gac-connect:tourDismissed', 'true');
  });
});

test('procurement · the suggested list goes to Compass through the same pipeline', async ({
  page,
}) => {
  await page.goto('/app/procurement');
  await page.keyboard.press('Escape'); // skip the loader if present

  const card = page.getByTestId('suggested-list');
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute('data-planned', 'true');
  await expect(card).toContainText('Suggested list · from the last 6 calls');
  await expect(
    page.getByRole('heading', { name: 'Next call · MV Choice · Aberdeen · ETA Fri 08:00' }),
  ).toBeVisible();
  await expect(card).toContainText('Drafted before the call');
  await expectOneSupplier(page);

  // Six lines, each with its usual quantity and the reason it is there.
  const lines = page.getByTestId('suggested-line');
  await expect(lines).toHaveCount(6);
  await expect(page.getByTestId('suggested-reason-engine-room')).toHaveText(
    'Ordered on 6 of the last 6 calls',
  );
  await expect(page.getByTestId('suggested-reason-shackles')).toHaveText(
    'Ordered on 3 of the last 6 calls',
  );
  await expect(page.getByTestId('suggested-qty-provisions')).toHaveValue('5');
  await expect(page.getByTestId('suggested-qty-mooring-tails')).toHaveValue('4');
  // Below the threshold: ordered on fewer than half of the last six calls.
  await expect(card).not.toContainText('Chart corrections');
  await expect(card).not.toContainText('Deck paint');
  await expect(page.getByTestId('suggested-rule')).toContainText('at least half of the last 6');

  // Untick bonded stores, take provisions to 6 days.
  await page.getByTestId('suggested-tick-bonded-stores').uncheck();
  await expect(page.getByTestId('suggested-qty-bonded-stores')).toBeDisabled();
  await page.getByTestId('suggested-qty-provisions').fill('6');
  await expect(page.getByTestId('suggested-hint')).toContainText('PR-1042');

  // Edits survive a reload (same visit).
  await page.reload();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('suggested-tick-bonded-stores')).not.toBeChecked();
  await expect(page.getByTestId('suggested-qty-provisions')).toHaveValue('6');

  // One click sends it: the request carries the five ticked lines.
  await page.getByTestId('send-suggested').click();
  await expect(page.getByTestId('suggested-list')).toHaveCount(0);
  await expect(page.getByTestId('procurement-request')).toHaveAttribute('data-stage', 'sent');
  await expect(page.getByTestId('procurement-line')).toHaveCount(5);
  await expect(page.getByTestId('compass-email-subject')).toHaveText(
    'Procurement request PR-1042 — MV Choice, Aberdeen — needed Fri 08:00',
  );
  const body = page.getByTestId('compass-email-body');
  await expect(body).toContainText('2. Fresh provisions (6 days)');
  await expect(body).toContainText('5. Shackles (8 shackles)');
  await expect(body).not.toContainText('Bonded stores');
  await expectOneSupplier(page);

  // The same stages to the same invoice.
  const simulate = page.getByTestId('simulate-next');
  await simulate.click();
  await simulate.click();
  await expect(page.getByText('Confirmed by Compass', { exact: true })).toHaveCount(6);
  await simulate.click();
  const invoice = page.getByTestId('compass-invoice');
  await expect(invoice).toBeVisible();
  // 1240 + 2150 + 190 + 520 + 340 = 4440
  await expect(page.getByTestId('invoice-total')).toHaveText('£4,440');
  await expectOneSupplier(page);

  // Reset demo: the draft and the untouched suggestion come back.
  await page.getByTestId('reset-procurement').click();
  await expect(page.getByTestId('suggested-line')).toHaveCount(6);
  await expect(page.getByTestId('suggested-tick-bonded-stores')).toBeChecked();
  await expect(page.getByTestId('suggested-qty-provisions')).toHaveValue('5');
  await expect(page.getByTestId('procurement-line')).toHaveCount(5);
  const stored = await page.evaluate(() =>
    window.localStorage.getItem('gac-connect:procurement.suggestion'),
  );
  expect(stored).toBeNull();
});

test('procurement · the suggested list cannot go with nothing ticked', async ({ page }) => {
  await page.goto('/app/procurement');
  await page.keyboard.press('Escape');
  for (const id of [
    'engine-room',
    'provisions',
    'galley-gas',
    'mooring-tails',
    'shackles',
    'bonded-stores',
  ]) {
    await page.getByTestId(`suggested-tick-${id}`).uncheck();
  }
  await expect(page.getByTestId('send-suggested')).toBeDisabled();
  await expect(page.getByTestId('suggested-hint')).toHaveText('Tick at least one line to send');
});

test('procurement · a vessel with no planned call gets no suggested list', async ({ page }) => {
  await page.goto('/app/procurement');
  await page.keyboard.press('Escape');
  await page.getByTestId('request-vessel').selectOption('granite-coast');
  await expect(page.getByTestId('suggested-list')).toHaveAttribute('data-planned', 'false');
  await expect(page.getByTestId('suggested-none')).toHaveText(
    'No call planned for MV Granite Coast yet. A suggested list is drafted from her previous calls once one is.',
  );
  await page.getByTestId('request-vessel').selectOption('boreal');
  await expect(
    page.getByRole('heading', { name: 'Next call · MV Boreal · Peterhead · ETA Fri 14:30' }),
  ).toBeVisible();
  await expect(page.getByTestId('suggested-line')).toHaveCount(3);
});
