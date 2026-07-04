import { expect, test } from '@playwright/test';

/** The five smoke journeys from 04_ARCHITECTURE §quality gates. */

test.beforeEach(async ({ page }) => {
  // Fresh state per journey; dismiss tour prompt noise.
  await page.addInitScript(() => {
    window.localStorage.setItem('gac-connect:tourDismissed', 'true');
  });
});

test('1 · loader skips and the dashboard renders', async ({ page }) => {
  await page.goto('/app');
  const loader = page.getByTestId('loader');
  await expect(loader).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(loader).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Morning, agent' })).toBeVisible();
  await expect(page.getByText('Proof of concept · illustrative data')).toBeVisible();
  // Loader shows once per session: revisiting must not replay it.
  await page.goto('/app/marketplace');
  await page.goto('/app');
  await expect(page.getByTestId('loader')).toHaveCount(0);
});

test('2 · marketplace search and filter obey the grouping rules', async ({ page }) => {
  await page.goto('/app/marketplace');
  await page.keyboard.press('Escape'); // skip loader if present

  // In-house pinned first with gold group label.
  await expect(page.getByText('GAC in-house — premium listings')).toBeVisible();

  // Promoted supplier appears first among third-party and is labelled.
  const thirdPartyHeading = page.getByText('Vetted marketplace suppliers');
  await expect(thirdPartyHeading).toBeVisible();
  await expect(page.getByText('▲ Promoted').first()).toBeVisible();

  // Category chip filters.
  await page.getByRole('button', { name: 'Cranes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Caledonia Lifting Ltd' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Silver City Welding' })).toHaveCount(0);

  // Search that matches nothing shows the invite empty state.
  await page.getByLabel('Search marketplace').fill('zzzz-no-such-service');
  await expect(page.getByText('No suppliers match that search')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Invite a supplier' })).toBeVisible();

  // Blocked supplier is visible but unbookable in the list.
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await page.getByLabel('Search marketplace').fill('Peterhead');
  await expect(page.getByRole('heading', { name: 'Peterhead Diving Services' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Unavailable' })).toBeDisabled();
});

test('3 · quote accept opens the agreement and raises the billing-split toast', async ({
  page,
}) => {
  await page.goto('/app/quotes');
  await page.keyboard.press('Escape');

  await expect(page.getByText('Caledonia Lifting Ltd')).toBeVisible();
  await expect(page.getByText('Parsed from Outlook reply · 10:15')).toBeVisible();

  await page.getByRole('button', { name: 'Accept quote' }).nth(1).click();
  const modal = page.getByRole('dialog', { name: /Accept quote/ });
  await expect(modal.getByText('Per-transaction agreement')).toBeVisible();

  // Escape cancels without accepting.
  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();

  // Accept for real.
  await page.getByRole('button', { name: 'Accept quote' }).nth(1).click();
  await page.getByRole('button', { name: 'Sign & book' }).click();
  await expect(
    page.getByText(/PO 48211 generated in GAC Agent — billing split 60\/40 Northmoor/),
  ).toBeVisible();
  await expect(page.getByText('✓ Accepted — PO 48211 generated')).toBeVisible();
});

test('4 · tier calculator shows £35,000 at £500k Full Stack', async ({ page }) => {
  await page.goto('/app/tiers');
  await page.keyboard.press('Escape');

  // Default: agency only, £500k → 2%, £10,000.
  await expect(page.getByTestId('tier-pct')).toHaveText('2%');
  await expect(page.getByTestId('tier-saving')).toHaveText('£10,000 saved / year');

  // Turn on logistics and customs → Full Stack.
  await page.getByRole('switch', { name: 'Toggle GAC Logistics' }).click();
  await page.getByRole('switch', { name: 'Toggle GAC Customs' }).click();
  await expect(page.getByTestId('tier-pct')).toHaveText('7%');
  await expect(page.getByTestId('tier-saving')).toHaveText('£35,000 saved / year');
  await expect(page.getByText('★ Full Stack — all three pillars')).toBeVisible();

  // Non-cumulative check: drop customs → 4%, never 6%.
  await page.getByRole('switch', { name: 'Toggle GAC Customs' }).click();
  await expect(page.getByTestId('tier-pct')).toHaveText('4%');
});

test('5 · SVS blocked supplier is unbookable from its profile', async ({ page }) => {
  await page.goto('/app/svs');
  await page.keyboard.press('Escape');

  await expect(page.getByText('2 alerts:')).toBeVisible();
  await page.getByRole('button', { name: 'Blocked', exact: true }).click();
  await page.getByRole('button', { name: 'Peterhead Diving Services' }).click();

  await expect(page).toHaveURL(/\/app\/marketplace\/peterhead-diving/);
  await expect(page.getByRole('button', { name: 'Unavailable' })).toBeDisabled();
  await expect(page.getByText('Blocked by the SVS')).toBeVisible();
  await expect(page.getByText('Insurance · lapsed')).toBeVisible();
});
