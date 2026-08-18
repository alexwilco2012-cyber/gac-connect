import { expect, test } from '@playwright/test';

/**
 * 17 Aug review — points 1 and 2:
 *  1. the client persona never sees supplier commission in the app;
 *  2. FLT / crane hire is priced for the booked window — overrun is not in the
 *     quoted price, prices are subject to change, and the supplier's T&Cs
 *     travel with the quote — shown where the client actually books.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('gac-connect:tourDismissed', 'true');
  });
});

test('1 · FLT listing carries the hire terms; the request captures the booked window', async ({
  page,
}) => {
  await page.goto('/app/marketplace');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'FLT', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Quayside Forklift Hire' })).toBeVisible();
  const terms = page.getByTestId('service-terms');
  await expect(terms).toHaveCount(1);
  await expect(terms).toContainText('not included in the quoted price');
  await expect(terms).toContainText('subject to change');

  await page.getByRole('button', { name: 'Request quote' }).click();
  const dialog = page.getByRole('dialog', { name: /Request a quote — Quayside Forklift Hire/ });
  await expect(dialog).toBeVisible();
  const hireTerms = dialog.getByTestId('hire-terms');
  await expect(hireTerms).toContainText('booked window');
  await expect(hireTerms).toContainText('terms and conditions');
  const window_ = hireTerms.getByRole('textbox', { name: 'Booked window' });
  await expect(window_).toHaveValue('Fri 06:00–18:00');
  await expect(window_).toHaveAccessibleDescription(/window the quoted price covers/);
  // The window follows the needed-by time until the client edits it.
  await dialog.getByRole('textbox', { name: 'Needed by' }).fill('Sat 09:00');
  await expect(window_).toHaveValue('Sat 09:00–21:00');
  await window_.fill('Mon 07:00–15:00');
  await dialog.getByRole('textbox', { name: 'Needed by' }).fill('Sun 10:00');
  await expect(window_).toHaveValue('Mon 07:00–15:00');
  // Not a hotel: no availability caveat or meal allowance on this request.
  await expect(dialog.getByTestId('hotel-terms')).toHaveCount(0);

  await dialog.getByRole('button', { name: 'Send request' }).click();
  await expect(dialog).toBeHidden();
  const toast = page.getByText(/Quote request sent to Quayside Forklift Hire/);
  await expect(toast).toBeVisible();
  await expect(toast).toContainText('Price covers the booked window Mon 07:00–15:00');
  await expect(toast).toContainText('overrun not included');
  await expect(toast).toContainText('subject to change');
  await expect(toast).toContainText('supplier T&Cs included');
});

test('2 · crane quotes carry the terms row and the agreement states the overrun clause', async ({
  page,
}) => {
  await page.goto('/app/quotes');
  await page.keyboard.press('Escape');

  await expect(page.getByTestId('quote-terms')).toHaveCount(3);
  await expect(page.getByTestId('quote-terms').first()).toContainText('Overrun not included');
  const requestTerms = page.getByTestId('request-terms');
  await expect(requestTerms).toContainText('Prices cover the booked window Fri 06:00–18:00');
  // The full clause is reachable without hover — a keyboard-operable expander.
  const expander = requestTerms.getByRole('button', { name: 'Full hire terms' });
  await expect(expander).toHaveAttribute('aria-expanded', 'false');
  await expect(requestTerms).not.toContainText('terms and conditions');
  await expander.focus();
  await page.keyboard.press('Enter');
  await expect(requestTerms).toContainText('not included in the quoted price');
  await expect(requestTerms).toContainText('terms and conditions');
  await expect(requestTerms.getByRole('button', { name: 'Hide full hire terms' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );

  await page.getByRole('button', { name: 'Accept quote' }).nth(1).click();
  const dialog = page.getByRole('dialog', { name: /Accept quote — Caledonia Lifting Ltd/ });
  await expect(dialog).toBeVisible();
  const scope = dialog.getByTestId('agreement-scope');
  await expect(scope).toContainText('booked window Fri 06:00–18:00');
  await expect(scope).toContainText('overrun');
  await expect(scope).toContainText('not included in the quoted price');
  await expect(scope).toContainText('subject to change');
  await expect(scope).toContainText('terms and conditions');
  await expect(scope).toContainText(
    'Terms incorporated by reference from the platform Terms of Use',
  );

  // Escape cancels without accepting — nothing changes.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByText('✓ Accepted — PO 48211 generated')).toHaveCount(0);
});

test('3 · the client persona never sees commission on the platform screens', async ({ page }) => {
  await page.goto('/app/invoices');
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('heading', { name: 'Supplier invoices, reviewed by you first' }),
  ).toBeVisible();
  await expect(page.getByText(/commission/i)).toHaveCount(0);
  // The rules strip carries the rating rule instead.
  await expect(page.getByText('Rate the job when it closes')).toBeVisible();

  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'Morning, agent' })).toBeVisible();
  await expect(page.getByTestId('dashboard-invoices')).toContainText(
    'Left alone, an invoice matches as it stands.',
  );
  await expect(page.getByText(/commission/i)).toHaveCount(0);

  await page.goto('/app/quotes');
  await expect(page.getByTestId('what-happens-next')).toBeVisible();
  await expect(page.getByText(/commission/i)).toHaveCount(0);
});
