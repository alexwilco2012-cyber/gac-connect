import { expect, test } from '@playwright/test';

/**
 * Service lines — the platform navigation grouped the way GAC sells and
 * invoices (Agency · Logistics · Customs · Procurement), with Customs kept as
 * its own tab so the 2 / 4 / 7 tier reads straight off the nav.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('gac-connect:tourDismissed', 'true');
  });
});

const nav = (page: import('@playwright/test').Page) =>
  page.getByRole('navigation', { name: 'Platform' });

test('the nav carries the four service lines and no loose service tabs', async ({ page }) => {
  await page.goto('/app');
  await page.keyboard.press('Escape');

  for (const label of ['Agency', 'Logistics', 'Customs', 'Procurement']) {
    await expect(nav(page).getByRole('link', { name: label, exact: true })).toBeVisible();
  }
  // The services that moved inside a line are no longer top-level tabs.
  for (const gone of ['Crew change', 'Certification', 'Bunkers', 'Launches']) {
    await expect(nav(page).getByRole('link', { name: gone, exact: true })).toHaveCount(0);
  }
  // Ten items still fit at 1280.
  await expect(nav(page).getByRole('link')).toHaveCount(10);
});

test('an address minted before the restructure still lands, section and all', async ({ page }) => {
  await page.goto('/app/crew-change?section=launches');
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/app\/agency\/crew-change\?section=launches$/);
  await expect(page.getByTestId('crew-section')).toHaveAttribute('data-section', 'launches');

  // The two beta previews moved under Agency and keep their scope banner.
  await page.goto('/app/certification');
  await expect(page).toHaveURL(/\/app\/agency\/certification$/);
  await expect(page.getByText('Beta preview · not in current scope.')).toBeVisible();

  await page.goto('/app/bunkers');
  await expect(page).toHaveURL(/\/app\/agency\/bunkers$/);

  // The retired launches address still resolves through the new one.
  await page.goto('/app/launches');
  await expect(page).toHaveURL(/\/app\/agency\/crew-change\?section=launches$/);
});

test('the Agency hub lands on live work, not on a menu', async ({ page }) => {
  await page.goto('/app/agency');
  await page.keyboard.press('Escape');

  await expect(page.getByTestId('service-line')).toHaveAttribute('data-line', 'agency');
  await expect(page.getByTestId('line-tier')).toHaveText('2% tier');
  await expect(page.getByTestId('line-live')).toBeVisible();

  // Every service says who performs it, and the key explains what that means.
  const crewChange = page.getByTestId('line-service-crew-change');
  await expect(crewChange).toHaveAttribute('data-provision', 'gac');
  await expect(crewChange.getByText('★ GAC service')).toBeVisible();
  await expect(page.getByTestId('line-service-quayside')).toHaveAttribute(
    'data-provision',
    'network',
  );
  await expect(page.getByTestId('provision-key')).toContainText('SVS-vetted supplier');

  // The hub is not a second copy of the directory — it says so and hands off.
  await expect(page.getByText('The marketplace lists who is vetted.')).toBeVisible();
  await page.getByTestId('line-categories').getByRole('link', { name: 'Taxis' }).click();
  await expect(page).toHaveURL(/\/app\/marketplace\?category=Taxis$/);
  await expect(page.getByRole('heading', { name: 'Regent Quay Cars' })).toBeVisible();
});

test('logistics: a movement is booked, tracked, and hands off to customs', async ({ page }) => {
  await page.goto('/app/logistics');
  await page.keyboard.press('Escape');

  await expect(page.getByTestId('line-tier')).toHaveText('4% tier');
  await expect(page.getByTestId('line-section')).toHaveAttribute('data-section', 'consignments');

  // The seeded Rotterdam movement carries the customs cross-link.
  const rotterdam = page.getByTestId('consignment-CN-2042');
  await expect(rotterdam).toHaveAttribute('data-stage', 'Booked');
  await expect(rotterdam.getByTestId('consignment-customs')).toContainText('CN-2042');

  // Simulate moves it one stage on and the rail follows.
  await rotterdam.getByTestId('consignment-advance').click();
  await expect(rotterdam).toHaveAttribute('data-stage', 'Collected');

  // An incomplete booking is refused with the fields still needed.
  await page.getByTestId('consignment-book').click();
  await expect(page.getByTestId('consignment-problems')).toContainText('What is moving');

  // The worked example books cleanly and appears at the top of the list.
  await page.getByRole('button', { name: 'Fill with an example' }).click();
  await page.getByTestId('consignment-book').click();
  await expect(page.getByTestId('consignment-CN-2043')).toBeVisible();

  // Sections are addressable.
  await page.getByRole('button', { name: 'Warehousing', exact: true }).click();
  await expect(page).toHaveURL(/\?section=warehousing$/);
  await expect(page.getByText('Received against the vessel, not against a date')).toBeVisible();
});

test('customs: an entry is refused until the document set is confirmed', async ({ page }) => {
  await page.goto('/app/customs');
  await page.keyboard.press('Escape');

  await expect(page.getByTestId('line-tier')).toHaveText('7% tier');
  // No network layer — the screen explains why rather than showing an empty list.
  await expect(page.getByTestId('no-network')).toContainText('in-house end to end');

  await page.getByRole('button', { name: 'Fill with an example' }).click();
  await page.getByTestId('declaration-raise').click();
  await expect(page.getByTestId('declaration-problems')).toContainText(
    'Confirmation that the document set is complete',
  );

  await page.getByRole('switch', { name: 'Document set is complete' }).click();
  await page.getByTestId('declaration-raise').click();
  await expect(page.getByTestId('declaration-DEC-1188')).toBeVisible();

  // The seeded entry clears in one simulated step and links back to its movement.
  const seeded = page.getByTestId('declaration-DEC-1187');
  await expect(seeded.getByTestId('declaration-movement')).toContainText('CN-2042');
  await seeded.getByTestId('declaration-advance').click();
  await expect(seeded).toHaveAttribute('data-stage', 'Cleared');
  await expect(seeded.getByRole('button', { name: 'Clearance note' })).toBeVisible();

  // The boundary is stated on the screen, not buried in a comment.
  await page.getByRole('button', { name: 'What GAC needs', exact: true }).click();
  await expect(page.getByText('GAC informs, it does not advise.')).toBeVisible();
});

test('a declaration can be raised against a movement, and picks its details up', async ({
  page,
}) => {
  await page.goto('/app/customs?section=declarations');
  await page.keyboard.press('Escape');

  await page.getByTestId('declaration-consignment').selectOption('CN-2042');
  await expect(page.getByRole('textbox', { name: 'Moving from' })).toHaveValue('Rotterdam');
  await expect(page.getByRole('textbox', { name: 'Moving to' })).toHaveValue(
    'Aberdeen — Regent Quay',
  );
});
