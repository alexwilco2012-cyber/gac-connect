import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Procurement via Compass — the working example from the 17 Aug review:
 * build the list, send it to Compass by email, watch Compass source, supply
 * and confirm every line, and raise the one invoice under GAC. State survives
 * a reload; Reset demo restores the draft.
 */

const SUBJECT = 'Procurement request PR-1042 — MV Caledonian Star, Aberdeen — needed Fri 08:00';

/**
 * Compass supplies the whole list: no second supplier, and no mark-up, may
 * surface anywhere on the client's screen. The sweep runs over the rendered
 * page, so it covers the screen's own hard-coded copy — the intro, the stage
 * notes, the invoice bullets and the closing strip — as well as the strings
 * the unit guard reads out of the data and lib modules.
 */
const FORBIDDEN = [/chandler/i, /mark-?up/i, /third[- ]party/i, /cannot assist/i];

async function expectOneSupplier(page: Page) {
  for (const pattern of FORBIDDEN) {
    await expect(page.getByText(pattern)).toHaveCount(0);
  }
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

test('procurement · the Compass flow end to end, persisted, then reset', async ({ page }) => {
  await page.goto('/app/procurement');
  await page.keyboard.press('Escape'); // skip the loader if present

  await expect(
    page.getByRole('heading', { name: 'Send the list to Compass. One invoice comes back.' }),
  ).toBeVisible();
  await expect(page.getByTestId('procurement-illustrative')).toContainText('simulated');
  await expectOneSupplier(page);

  // The four-step "How it works" strip.
  await expect(
    page.getByTestId('how-it-works').getByText('You are invoiced via Compass, under GAC'),
  ).toBeVisible();
  await expect(
    page.getByTestId('how-it-works').getByText('Compass sources and supplies the whole list'),
  ).toBeVisible();

  // Five pre-filled, editable lines; remove one → four.
  const lines = page.getByTestId('procurement-line');
  await expect(lines).toHaveCount(5);
  await expect(page.getByLabel('Line 1 description')).toHaveValue(
    'Engine room consumables — lube oil, filters',
  );
  await page.getByTestId('remove-line-deck-stores').click();
  await expect(lines).toHaveCount(4);

  // Add a line by keyboard: type, Enter → five again, then take it back out.
  await page.getByTestId('add-line-description').fill('Chart corrections');
  await page.getByTestId('add-line-qty').fill('1 folio');
  await page.getByTestId('add-line-description').press('Enter');
  await expect(lines).toHaveCount(5);
  await expect(page.getByLabel('Line 5 description')).toHaveValue('Chart corrections');
  await page.getByRole('button', { name: 'Remove line: Chart corrections' }).click();
  await expect(lines).toHaveCount(4);

  // Nothing sent yet: the timeline is all pending and there is no email.
  await expect(page.getByTestId('compass-email')).toHaveCount(0);
  await expect(page.getByTestId('compass-timeline').locator('[data-status="current"]')).toHaveCount(
    0,
  );

  // Send → the composed email appears, addressed to the illustrative Compass address.
  await page.getByTestId('send-to-compass').click();
  const email = page.getByTestId('compass-email');
  await expect(email).toBeVisible();
  await expect(email).toContainText('procurement@compass.example');
  await expect(email).toContainText('illustrative address');
  await expect(page.getByTestId('compass-email-subject')).toHaveText(SUBJECT);
  await expect(page.getByTestId('compass-email-body')).toContainText('1. Engine room consumables');
  await expect(page.getByTestId('compass-email-body')).toContainText('4. Galley gas');
  await expect(page.getByTestId('compass-email-body')).not.toContainText('Deck stores');
  await expectOneSupplier(page);

  // Timeline: 'Sent to Compass' is the current stage; the draft is locked.
  const timeline = page.getByTestId('compass-timeline');
  const stage = (s: string) => timeline.locator(`[data-stage="${s}"]`);
  await expect(stage('sent')).toHaveAttribute('data-status', 'current');
  await expect(stage('sent')).toContainText('Sent to Compass');
  await expect(page.getByTestId('send-to-compass')).toHaveCount(0);

  // Simulate, stage by stage — three clicks from sent to invoiced.
  const simulate = page.getByTestId('simulate-next');
  await expect(simulate).toHaveText('Simulate: Compass starts sourcing');
  await simulate.click();
  await expect(stage('sourcing')).toHaveAttribute('data-status', 'current');
  await expect(stage('sourcing')).toContainText('in hand at Compass');
  await expectOneSupplier(page);

  await expect(simulate).toHaveText('Simulate: Compass confirms supply');
  await simulate.click();
  await expect(stage('confirmed')).toHaveAttribute('data-status', 'current');
  await expect(stage('confirmed')).toContainText('Compass confirms the list');
  // Every line comes back confirmed by Compass — nothing routed away. The
  // confirmation sits once against each line the client wrote, plus the card
  // header; the timeline carries the count, not a second copy of the list.
  await expect(page.getByTestId('procurement-line').getByText('Confirmed by Compass')).toHaveCount(
    4,
  );
  // Exactly five pills carry the confirmation: one per line, plus the card
  // header. (Exact matching, so the "How it works" card body — which reads
  // "comes back confirmed by Compass" in a sentence — is not counted.)
  await expect(page.getByText('Confirmed by Compass', { exact: true })).toHaveCount(5);
  await expect(stage('confirmed')).toContainText('all 4 lines covered');
  await expect(page.getByTestId('compass-invoice')).toHaveCount(0);
  await expectOneSupplier(page);

  await expect(simulate).toHaveText('Simulate: invoice raised via Compass');
  await simulate.click();
  await expect(stage('invoiced')).toHaveAttribute('data-status', 'current');
  await expect(stage('invoiced')).toContainText('Invoiced via Compass');
  await expect(simulate).toHaveCount(0);

  // The one invoice: from GAC via Compass, illustrative, adds up, one supplier
  // behind it — and nothing about a mark-up anywhere on the client's screen.
  const invoice = page.getByTestId('compass-invoice');
  await expect(invoice).toBeVisible();
  await expect(invoice).toContainText('GAC — via Compass');
  await expect(invoice).toContainText('illustrative');
  await expectOneSupplier(page);
  // 1240 + 2150 + 540 + 190 = 4120 — the total is the sum of Compass's prices
  await expect(page.getByTestId('invoice-total')).toHaveText('£4,120');
  await expect(invoice).toContainText(
    'Compass sourced and supplied every line. You see one invoice, from GAC.',
  );

  // Reload: still at the invoice stage, four lines, email still shown.
  await page.reload();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('compass-invoice')).toBeVisible();
  await expect(stage('invoiced')).toHaveAttribute('data-status', 'current');
  await expect(page.getByTestId('compass-email-subject')).toHaveText(SUBJECT);
  await expect(page.getByTestId('procurement-line')).toHaveCount(4);
  await expectOneSupplier(page);

  // Reset demo → back to the draft with the five default lines.
  await page.getByTestId('reset-procurement').click();
  await expect(page.getByTestId('procurement-line')).toHaveCount(5);
  await expect(page.getByTestId('compass-invoice')).toHaveCount(0);
  await expect(page.getByTestId('compass-email')).toHaveCount(0);
  await expect(page.getByTestId('send-to-compass')).toBeVisible();
  await expect(page.getByLabel('Line 3 description')).toHaveValue(
    'Deck stores — mooring tails, shackles',
  );
  await expectOneSupplier(page);
});

test('procurement · a stage stored by an earlier visit falls back to the draft', async ({
  page,
}) => {
  // 'chandler-paid' belonged to the retired flow; a returning visitor gets a
  // usable screen, not a broken one.
  await page.addInitScript(() => {
    window.localStorage.setItem('gac-connect:procurement.stage', '"chandler-paid"');
    window.localStorage.setItem(
      'gac-connect:procurement.stageTimes',
      '{"sent":"2026-08-18T09:41:00.000Z"}',
    );
  });
  await page.goto('/app/procurement');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('procurement-request')).toHaveAttribute('data-stage', 'draft');
  await expect(page.getByTestId('send-to-compass')).toBeVisible();
  await expect(page.getByTestId('procurement-line')).toHaveCount(5);
  await expect(page.getByText(/chandler/i)).toHaveCount(0);
});

test('procurement · an empty list cannot be sent', async ({ page }) => {
  await page.goto('/app/procurement');
  await page.keyboard.press('Escape');
  const lines = page.getByTestId('procurement-line');
  await expect(lines).toHaveCount(5);
  for (const id of ['engine-room', 'provisions', 'deck-stores', 'bonded-stores', 'galley-gas']) {
    await page.getByTestId(`remove-line-${id}`).click();
  }
  await expect(lines).toHaveCount(0);
  await expect(page.getByTestId('lines-empty')).toBeVisible();
  await expect(page.getByTestId('send-to-compass')).toBeDisabled();
});
