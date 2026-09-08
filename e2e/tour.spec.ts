import { expect, test } from '@playwright/test';

/**
 * The guided tour is what a panel member gets when they scan the QR on the
 * closing slide and open the platform with nobody stood next to them. It has to
 * be offered wherever they land, walk all fourteen stops, and stay reachable after
 * they say no.
 */
test('the tour is offered off the dashboard, and walks all fourteen stops', async ({ page }) => {
  // Arriving anywhere, not just the dashboard.
  await page.goto('/app/marketplace');
  const prompt = page.getByText('First time here?');
  await expect(prompt).toBeVisible();

  await page.getByRole('button', { name: 'Start the tour' }).click();

  const card = page.getByRole('dialog', { name: /^Tour step/ });
  await expect(card).toBeVisible();
  await expect(card).toContainText('Tour · 1 of 14');
  await expect(page).toHaveURL(/\/app\/internal$/);

  // Step through, checking the stops that carry the service-line story.
  const checkpoints: Record<number, RegExp> = {
    3: /\/app\/marketplace$/,
    4: /\/app\/agency\/crew-change$/,
    5: /\/app\/logistics$/,
    6: /\/app\/customs$/,
    7: /\/app\/procurement$/,
    9: /\/app\/invoices$/,
    12: /\/app\/agency\/certification$/,
    13: /\/app\/agency\/bunkers$/,
    14: /\/app\/dashboard$/,
  };
  for (let step = 2; step <= 14; step++) {
    await page.getByRole('button', { name: 'Next →' }).click();
    await expect(card).toContainText(`Tour · ${step} of 14`);
    const expected = checkpoints[step];
    if (expected) await expect(page).toHaveURL(expected);
  }

  // Back reverses without leaving the tour.
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(card).toContainText('Tour · 13 of 14');
  await page.getByRole('button', { name: 'Next →' }).click();

  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(card).toBeHidden();

  // Dismissed, but never gone: it shrinks to a button rather than vanishing.
  await expect(prompt).toBeHidden();
  await expect(page.getByRole('button', { name: 'Take the guided tour' })).toBeVisible();
});

test('the tour can be declined and picked up again later', async ({ page }) => {
  await page.goto('/app');
  await page.getByRole('button', { name: 'No thanks' }).click();
  await expect(page.getByText('First time here?')).toBeHidden();

  // Still offered on a different screen, and it still starts.
  await page.goto('/app/quotes');
  await page.getByRole('button', { name: 'Take the guided tour' }).click();
  await expect(page.getByRole('dialog', { name: /^Tour step/ })).toContainText('Tour · 1 of 14');
});

test('the landing page offers the tour without scrolling, and starts it', async ({ page }) => {
  // Where the QR on the closing slide lands. The offer is a line in the hero
  // now rather than a bar above it, but the rule is unchanged: no scrolling.
  await page.goto('/');
  const invite = page.getByRole('button', { name: /Take the \d+-stop guided tour/ });
  await expect(invite).toBeInViewport();

  await invite.click();
  await expect(page).toHaveURL(/\/app\/internal$/);
  await expect(page.getByRole('dialog', { name: /^Tour step/ })).toContainText('Tour · 1 of 14');
});
