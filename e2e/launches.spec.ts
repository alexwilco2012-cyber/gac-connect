import { expect, test } from '@playwright/test';

/** Launches — capacity and freight at a glance (17 Aug review, point 3), on their own section inside Crew change. */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('gac-connect:tourDismissed', 'true');
  });
});

test('launches: ports from data, capacity and freight facts, plan-a-run pills', async ({
  page,
}) => {
  // The old tab route still works as a deep link — it lands on Crew change › Launches.
  await page.goto('/app/launches');
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/app\/agency\/crew-change\?section=launches/);
  await expect(page.getByTestId('crew-section')).toHaveAttribute('data-section', 'launches');

  await expect(page.getByRole('heading', { name: 'Launches from the quay' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Launches from Aberdeen', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Launches from Macduff', exact: true }),
  ).toBeVisible();

  // Macduff card carries the launch name, capacity and freight-included fact.
  const deveron = page.getByTestId('launch-deveron-launch-services');
  await expect(deveron).toContainText('Deveron Lass');
  await expect(deveron).toContainText('Max capacity');
  await expect(deveron).toContainText('10 passengers');
  await expect(deveron).toContainText('Included ✓');

  // Torry Workboats does not carry freight.
  const torry = page.getByTestId('launch-torry-workboats');
  await expect(torry).toContainText('Not included ✗');
  await expect(page.getByTestId('fit-torry-workboats')).toHaveText('No freight');

  // Defaults: Aberdeen, 9 passengers, freight on → Granite Runner fits in one run.
  await expect(page.getByTestId('fit-granite-launches')).toHaveText('Fits in one run');
  await expect(page.getByTestId('plan-summary')).toContainText(
    '1 launch at Aberdeen can carry 9 passengers with freight included in a single run',
  );

  // Fourteen passengers → two runs on the twelve-seat launch.
  await page.getByTestId('plan-run').getByLabel('Passengers needed').fill('14');
  await expect(page.getByTestId('fit-granite-launches')).toHaveText('2 runs needed');
  await expect(page.getByTestId('fit-deveron-launch-services')).toHaveText('2 runs needed');
  await expect(page.getByTestId('plan-summary')).toContainText('No launch at Aberdeen carries 14');

  // Freight off → Torry Tern becomes a capacity question, not a freight one.
  await page.getByRole('switch', { name: 'Freight to go out' }).click();
  await expect(page.getByTestId('fit-torry-workboats')).toHaveText('2 runs needed');
  await page.getByRole('switch', { name: 'Freight to go out' }).click();
  await expect(page.getByTestId('fit-torry-workboats')).toHaveText('No freight');
});

test('launches: request modal validates capacity and sends the request', async ({ page }) => {
  await page.goto('/app/agency/crew-change?section=launches');
  await page.keyboard.press('Escape');

  await page.getByTestId('request-granite-launches').click();
  const dialog = page.getByRole('dialog', { name: /Request launch — Granite Launches/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId('launch-summary')).toContainText('max 12 passengers');
  await expect(dialog.getByTestId('over-limit')).toHaveCount(0);

  // Over the limit → warn line naming the launch, the limit and the runs.
  await dialog.getByLabel('Passengers').fill('14');
  await expect(dialog.getByTestId('over-limit')).toContainText(
    '14 is over Granite Runner’s 12 passenger limit — this will take 2 runs',
  );
  await dialog.getByLabel('Passengers').fill('9');
  await expect(dialog.getByTestId('over-limit')).toHaveCount(0);

  // Freight detail and the deadline advice behave like the quote request.
  await dialog.getByLabel('Freight detail').fill('2 pallets stores, ~300 kg');
  await expect(dialog.getByTestId('deadline-advice')).toHaveAttribute('data-tone', 'ok');
  await dialog.getByRole('button', { name: '30 minutes' }).click();
  await expect(dialog.getByTestId('deadline-advice')).toHaveAttribute('data-tone', 'warn');

  await dialog.getByRole('button', { name: 'Send request' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(/Launch request sent to Granite Launches/)).toBeVisible();
  await expect(page.getByText(/2 pallets stores, ~300 kg/)).toBeVisible();
  await expect(page.getByText(/Reply-by window: 30 minutes/)).toBeVisible();
});

test('launches: the no-freight operator says freight is quoted separately', async ({ page }) => {
  await page.goto('/app/agency/crew-change?section=launches');
  await page.keyboard.press('Escape');

  await page.getByTestId('request-torry-workboats').click();
  const dialog = page.getByRole('dialog', { name: /Request launch — Torry Workboats/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId('launch-summary')).toContainText('freight not included');
  await expect(dialog.getByTestId('launch-freight-note')).toContainText(
    'Quoted separately by Torry Workboats',
  );

  // Escape closes without sending.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('marketplace: the Launches chip lists the three operators with capacity chips', async ({
  page,
}) => {
  await page.goto('/app/marketplace');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Launches', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Granite Launches' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Torry Workboats' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Deveron Launch Services' })).toBeVisible();
  await expect(page.getByTestId('listing-facts').first()).toContainText('Max capacity');
  await expect(page.getByTestId('listing-facts').first()).toContainText('Freight');
});
