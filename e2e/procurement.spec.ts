import { expect, test } from '@playwright/test';

/**
 * Procurement via Compass — the working example from the 17 Aug review:
 * build the list, send it to Compass by email, watch Compass supply or route
 * each line, pay the chandler, and raise the one invoice under GAC. State
 * survives a reload; Reset demo restores the draft.
 */

const SUBJECT = 'Procurement request PR-1042 — MV Caledonian Star, Aberdeen — needed Fri 08:00';

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

  // The four-step "How it works" strip.
  await expect(
    page.getByTestId('how-it-works').getByText('You are invoiced via Compass, under GAC'),
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

  // Timeline: 'Sent to Compass' is the current stage; the draft is locked.
  const timeline = page.getByTestId('compass-timeline');
  const stage = (s: string) => timeline.locator(`[data-stage="${s}"]`);
  await expect(stage('sent')).toHaveAttribute('data-status', 'current');
  await expect(stage('sent')).toContainText('Sent to Compass');
  await expect(page.getByTestId('send-to-compass')).toHaveCount(0);

  // Simulate, stage by stage.
  const simulate = page.getByTestId('simulate-next');
  await expect(simulate).toHaveText('Simulate: Compass starts sourcing');
  await simulate.click();
  await expect(stage('sourcing')).toHaveAttribute('data-status', 'current');

  await expect(simulate).toHaveText('Simulate: Compass replies');
  await simulate.click();
  await expect(stage('replied')).toHaveAttribute('data-status', 'current');
  await expect(stage('replied')).toContainText('routed to a third-party chandler');
  await expect(stage('replied')).toContainText('Granite Ship Chandlers');
  await expect(stage('replied')).toContainText('Supplied by Compass');
  // Two lines routed (bonded stores, galley gas), two supplied by Compass.
  await expect(
    page.getByTestId('compass-reply-lines').locator('[data-source="chandler"]'),
  ).toHaveCount(2);
  await expect(
    page.getByTestId('compass-reply-lines').locator('[data-source="compass"]'),
  ).toHaveCount(2);

  await expect(simulate).toHaveText('Simulate: chandler paid');
  await simulate.click();
  await expect(stage('chandler-paid')).toHaveAttribute('data-status', 'current');
  await expect(stage('chandler-paid')).toContainText('Compass pays the chandler');
  await expect(page.getByTestId('compass-invoice')).toHaveCount(0);

  await expect(simulate).toHaveText('Simulate: invoice raised via Compass');
  await simulate.click();
  await expect(stage('invoiced')).toHaveAttribute('data-status', 'current');
  await expect(stage('invoiced')).toContainText('Invoiced via Compass');
  await expect(simulate).toHaveCount(0);

  // The one invoice: from GAC via Compass, illustrative, adds up, no chandler on it —
  // and nothing about a mark-up anywhere on the client's screen.
  const invoice = page.getByTestId('compass-invoice');
  await expect(invoice).toBeVisible();
  await expect(invoice).toContainText('GAC — via Compass');
  await expect(invoice).toContainText('illustrative');
  await expect(invoice).not.toContainText('Granite Ship Chandlers');
  await expect(page.getByText(/mark-?up/i)).toHaveCount(0);
  // 1240 + 2150 + 540 + 190 = 4120 — the total is the sum of Compass's prices
  await expect(page.getByTestId('invoice-total')).toHaveText('£4,120');
  await expect(invoice).toContainText(
    'The chandler was paid by Compass. You see one invoice, from GAC.',
  );

  // Reload: still at the invoice stage, four lines, email still shown.
  await page.reload();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('compass-invoice')).toBeVisible();
  await expect(stage('invoiced')).toHaveAttribute('data-status', 'current');
  await expect(page.getByTestId('compass-email-subject')).toHaveText(SUBJECT);
  await expect(page.getByTestId('procurement-line')).toHaveCount(4);

  // Reset demo → back to the draft with the five default lines.
  await page.getByTestId('reset-procurement').click();
  await expect(page.getByTestId('procurement-line')).toHaveCount(5);
  await expect(page.getByTestId('compass-invoice')).toHaveCount(0);
  await expect(page.getByTestId('compass-email')).toHaveCount(0);
  await expect(page.getByTestId('send-to-compass')).toBeVisible();
  await expect(page.getByLabel('Line 3 description')).toHaveValue(
    'Deck stores — mooring tails, shackles',
  );
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
