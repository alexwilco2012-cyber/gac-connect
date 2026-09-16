import { expect, test } from '@playwright/test';

/**
 * The top bar's Reset demo (16 Sep): one control beside the vessel pill that
 * puts every screen back to its seeded state, so a presenter can walk a second
 * room through the same call without tidying six screens by hand.
 */
test('reset demo: two steps, resets the accepted quote, re-offers the tour', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('gac-connect:tourDismissed', 'true');
  });
  await page.goto('/app/quotes');
  await page.keyboard.press('Escape'); // skip loader if present

  // Do some work: accept a quote, so the screen shows its own Reset demo.
  await page.getByRole('button', { name: 'Accept quote' }).nth(1).click();
  await page.getByRole('button', { name: 'Sign & book' }).click();
  const booked = page.getByRole('button', { name: 'Booked ✓ · PO 48211' });
  await expect(booked).toBeVisible();
  await expect(page.getByText('First time here?')).toHaveCount(0);

  // First click arms; Cancel backs out with nothing changed.
  const trigger = page.getByTestId('reset-demo');
  const panel = page.getByRole('dialog', { name: 'Reset demo' });
  await trigger.click();
  await expect(panel).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.getByTestId('reset-demo-cancel').click();
  await expect(panel).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(booked).toBeVisible();

  // Escape backs out too, and never reaches the tour.
  await trigger.click();
  await expect(panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(booked).toBeVisible();

  // Confirm resets: the quote is unaccepted, the tour is offered again, and
  // the bar says what happened. Nothing is left behind in storage.
  await trigger.click();
  await page.getByTestId('reset-demo-confirm').click();
  await expect(
    page.getByText('Demo reset — every screen is back to its starting state.'),
  ).toBeVisible();
  await expect(booked).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Accept quote' })).toHaveCount(3);
  await expect(page.getByText('First time here?')).toBeVisible();
  const stored = await page.evaluate(() =>
    Object.keys(window.localStorage).filter(
      (k) => k.startsWith('gac-connect:') && k !== 'gac-connect:sidebarCollapsed',
    ),
  );
  expect(stored).toEqual([]);
});
