import { expect, test } from '@playwright/test';

/**
 * A new visit starts clean (18 Sep): demo work lasts as long as the tab. The
 * owner rehearses, closes the browser, and the panel — or the owner, the next
 * morning — opens a platform where nothing has been chosen yet.
 */
test('demo work survives a reload but not a new visit', async ({ page, context }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('gac-connect:tourDismissed', 'true');
  });
  await page.goto('/app/quotes');
  await page.keyboard.press('Escape'); // skip loader if present

  await page.getByRole('button', { name: 'Accept quote' }).nth(1).click();
  await page.getByRole('button', { name: 'Sign & book' }).click();
  await expect(page.getByRole('button', { name: 'Booked ✓ · PO 48211' })).toBeVisible();

  // Same tab, reloaded: still booked.
  await page.reload();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Booked ✓ · PO 48211' })).toBeVisible();

  // A new tab is a new visit: nothing chosen, and the declined tour stays declined.
  const next = await context.newPage();
  await next.goto('/app/quotes');
  await next.keyboard.press('Escape');
  await expect(next.getByRole('button', { name: 'Accept quote' })).toHaveCount(3);
  await expect(next.getByRole('button', { name: /Booked/ })).toHaveCount(0);
  await expect(next.getByText('First time here?')).toHaveCount(0);
});
