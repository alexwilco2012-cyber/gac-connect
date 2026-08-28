import { expect, test } from '@playwright/test';

/**
 * The two beta previews work rather than describe. Both keep the scope banner
 * first — that is the rule the previews exist under — and both carry a
 * pipeline a visitor can drive: route a crew renewal to a provider, price a
 * bunker enquiry and take a stem.
 */

test('crew certification: the register filters, and a renewal routes to a provider', async ({
  page,
}) => {
  await page.goto('/app/agency/certification');
  await page.keyboard.press('Escape');

  // Out of scope, said first and said plainly.
  await expect(page.getByText('Beta preview · not in current scope.')).toBeVisible();

  // The register runs on the SVS alert tiers: a lapse blocks, an expiry warns.
  await expect(page.getByTestId('crew-074')).toHaveAttribute('data-status', 'blocked');
  await expect(page.getByTestId('crew-041')).toHaveAttribute('data-status', 'verified');
  await expect(page.getByTestId('register-summary')).toContainText('9 of 9 crew shown');

  // No crew member is named anywhere on the screen.
  await expect(page.getByTestId('cert-register')).toContainText('Crew 074');

  // Filtering to a vessel narrows the register.
  await page.getByRole('button', { name: 'MV Boreal', exact: true }).click();
  await expect(page.getByTestId('register-summary')).toContainText('3 of 9 crew shown');
  await page.getByRole('button', { name: 'All vessels' }).click();

  // Routing one renewal adds it to the pipeline, and the row stops offering it.
  const routes = page.getByTestId('route-renewal');
  const before = await routes.count();
  await routes.first().click();
  await expect(page.getByTestId('renewals-summary')).toContainText('2 open');
  await expect(page.getByTestId('route-renewal')).toHaveCount(before - 1);

  // The sweep takes everything inside 30 days and then has nothing left to do.
  await page.getByTestId('renewal-sweep').click();
  await expect(page.getByTestId('renewal-sweep')).toHaveText('Nothing to route');

  // The seeded renewal runs to the certificate coming back.
  const seeded = page.getByTestId('renewal-CRT-2051');
  await seeded.getByTestId('renewal-advance').click();
  await expect(seeded).toHaveAttribute('data-stage', 'Certificate updated');
});

test('bunkers: an enquiry is priced, compared and taken', async ({ page }) => {
  await page.goto('/app/agency/bunkers');
  await page.keyboard.press('Escape');

  await expect(page.getByText('Beta preview · not in current scope.')).toBeVisible();

  // The seeded enquiry arrives priced, cheapest all in flagged.
  const seeded = page.getByTestId('bunker-BNK-3041');
  await expect(seeded).toHaveAttribute('data-stage', 'Prices returned');
  await expect(seeded.getByTestId('bunker-quotes').locator('> div')).toHaveCount(3);
  await expect(seeded.getByText('Cheapest all in')).toBeVisible();
  await expect(seeded.getByTestId('bunker-tradeoff')).toContainText('not the soonest');

  // Taking a price confirms the stem and closes the comparison.
  await seeded.getByTestId('bunker-accept').first().click();
  await expect(seeded).toHaveAttribute('data-stage', 'Stem confirmed');
  await expect(seeded.getByText('✓ Stem taken')).toBeVisible();
  await expect(seeded.getByTestId('bunker-accept')).toHaveCount(0);

  // And on to the delivery note.
  await seeded.getByTestId('bunker-advance').click();
  await expect(seeded).toHaveAttribute('data-stage', 'Delivered — BDN received');
  await expect(seeded.getByRole('button', { name: 'Bunker delivery note' })).toBeVisible();

  // A new enquiry is priced against the suppliers that lift at that port.
  await page.getByRole('button', { name: 'Fill with an example' }).click();
  await page.getByTestId('bunker-raise').click();
  const raised = page.getByTestId('bunker-BNK-3042');
  await expect(raised).toHaveAttribute('data-stage', 'Enquiry raised');
  await raised.getByTestId('bunker-advance').click();
  await expect(raised).toHaveAttribute('data-stage', 'Prices returned');
  await expect(raised.getByTestId('bunker-quotes').locator('> div')).toHaveCount(3);
});

test('bunkers: an enquiry below a supplier’s minimum stem is answered, not ignored', async ({
  page,
}) => {
  await page.goto('/app/agency/bunkers');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Fill with an example' }).click();
  await page.getByLabel('Quantity (mt)').fill('25');
  await page.getByTestId('bunker-raise').click();

  const raised = page.getByTestId('bunker-BNK-3042');
  await raised.getByTestId('bunker-advance').click();
  await expect(raised.getByTestId('bunker-no-offers')).toContainText('minimum stem of 150 mt');
  await expect(raised.getByTestId('bunker-quotes').locator('> div')).toHaveCount(1);
});

test('an enquiry will not go out half-filled', async ({ page }) => {
  await page.goto('/app/agency/bunkers');
  await page.keyboard.press('Escape');

  await page.getByTestId('bunker-raise').click();
  await expect(page.getByTestId('bunker-problems')).toContainText('Quantity (mt)');
  await expect(page.getByTestId('bunker-problems')).toContainText('Delivery window');
  await expect(page.getByTestId('bunker-BNK-3042')).toHaveCount(0);
});
