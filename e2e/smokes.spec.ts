import { expect, test } from '@playwright/test';

/** The five smoke journeys from 04_ARCHITECTURE §quality gates. */

test.beforeEach(async ({ page }) => {
  // Fresh state per journey; dismiss tour prompt noise.
  await page.addInitScript(() => {
    window.localStorage.setItem('gac-connect:tourDismissed', 'true');
  });
});

test('1 · loader skips and /app opens on the marketplace', async ({ page }) => {
  await page.goto('/app');
  const loader = page.getByTestId('loader');
  await expect(loader).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(loader).toBeHidden();

  // Marketplace first, workflow second: the front door is the directory.
  await expect(page).toHaveURL(/\/app\/marketplace$/);
  await expect(
    page.getByRole('heading', { name: 'Every service on the quay, vetted before you see it' }),
  ).toBeVisible();
  await expect(page.getByText('Proof of concept · illustrative data')).toBeVisible();
  // Loader shows once per session: revisiting must not replay it.
  await page.goto('/app/dashboard');
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

  // A category tile filters, and the chip beside Sort says what is on.
  await page.getByRole('button', { name: 'Browse Cranes' }).click();
  await expect(page.getByRole('heading', { name: 'Caledonia Lifting Ltd' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Silver City Welding' })).toHaveCount(0);
  const clearCranes = page.getByRole('button', { name: 'Clear the Cranes filter' });
  await expect(clearCranes).toBeVisible();

  // Clearing the chip puts the tiles back.
  await clearCranes.click();
  await expect(page.getByTestId('category-tiles')).toBeVisible();

  // Search that matches nothing shows the invite empty state.
  await page.getByLabel('Search marketplace').fill('zzzz-no-such-service');
  await expect(page.getByText('No suppliers match that search')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Invite a supplier' })).toBeVisible();

  // Blocked supplier is visible but unbookable in the list.
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
    page.getByText(/PO 48211 generated in GAC Agent — billing split 60\/40 Browne/),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Booked ✓ · PO 48211' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Not selected' })).toHaveCount(2);
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

test('6 · interactive harbour: hotspots swap the hero copy, Escape puts it back', async ({
  page,
}) => {
  await page.goto('/');

  const headline = page.getByRole('heading', {
    name: 'Offshore services. Found, vetted, booked.',
  });
  await expect(headline).toBeVisible();

  // Click the lorry → the copy column becomes the Logistics detail card.
  await page.getByRole('button', { name: /Lorry — GAC Logistics/ }).click();
  await expect(page.getByRole('heading', { name: 'GAC Logistics' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'See tier savings →' })).toHaveAttribute(
    'href',
    '/app/tiers',
  );
  await expect(headline).toHaveCount(0);

  // Escape restores the copy.
  await page.keyboard.press('Escape');
  await expect(headline).toBeVisible();

  // The rig is the marketplace, and clicking it twice deselects it.
  await page.getByRole('button', { name: /Offshore platform/ }).click();
  await expect(page.getByRole('heading', { name: 'The Offshore Marketplace' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Browse the marketplace →' })).toHaveAttribute(
    'href',
    '/app/marketplace',
  );
  await page.getByRole('button', { name: /Offshore platform/ }).click();
  await expect(headline).toBeVisible();

  // "All services" closes it too.
  await page.getByRole('button', { name: /Lorry — GAC Logistics/ }).click();
  await page.getByRole('button', { name: 'All services' }).click();
  await expect(headline).toBeVisible();
});

test.describe('6b · interactive harbour on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

  test('a tap opens the detail under the scene, and the headline stays', async ({ page }) => {
    await page.goto('/');
    const headline = page.getByRole('heading', {
      name: 'Offshore services. Found, vetted, booked.',
    });
    await expect(headline).toBeVisible();

    // Scroll so the scene sits at the top of the screen, the way a reader
    // arrives at it, with the card's slot well below the fold.
    const lorry = page.getByRole('button', { name: /Lorry — GAC Logistics/ });
    await page.getByRole('button', { name: /Crane/ }).evaluate((el) => {
      el.scrollIntoView({ block: 'start' });
    });
    await lorry.tap();

    // Stacked, the copy column is a screen above the harbour, so the card
    // opens under the scene instead and the page snaps to it: the card's top
    // lands just under the sticky header.
    const card = page.getByRole('heading', { name: 'GAC Logistics' });
    await expect(card).toBeVisible();
    await expect(card).toBeInViewport();
    await expect(headline).toHaveCount(1);
    const headerH = (await page.locator('header').first().boundingBox())!.height;
    const panel = page.locator('.harbour-panel-fade');
    await expect
      .poll(async () => Math.round((await panel.boundingBox())!.y), { timeout: 3000 })
      .toBeLessThanOrEqual(headerH + 14);
    expect((await panel.boundingBox())!.y).toBeGreaterThanOrEqual(headerH);

    await page.getByRole('button', { name: 'All services' }).click();
    await expect(card).toHaveCount(0);
  });
});

test('5 · SVS blocked supplier is unbookable from its profile', async ({ page }) => {
  await page.goto('/app/svs');
  await page.keyboard.press('Escape');

  await expect(page.getByText('3 alerts:')).toBeVisible();
  await page.getByRole('button', { name: 'Blocked', exact: true }).click();
  await page.getByRole('button', { name: 'Peterhead Diving Services' }).click();

  await expect(page).toHaveURL(/\/app\/marketplace\/peterhead-diving/);
  await expect(page.getByRole('button', { name: 'Unavailable' })).toBeDisabled();
  await expect(page.getByText('Blocked by the SVS')).toBeVisible();
  await expect(page.getByText('Insurance · lapsed')).toBeVisible();
});

test('7 · invoice review: seven-day window, allocation, match to GAC Agent, agent rating', async ({
  page,
}) => {
  await page.goto('/app/invoices');
  await page.keyboard.press('Escape');

  await expect(
    page.getByRole('heading', { name: 'Supplier invoices, reviewed by you first' }),
  ).toBeVisible();
  // Open windows count down; the closed one already matched as it stood.
  await expect(page.getByText('5 days left')).toBeVisible();
  await expect(page.getByText('2 days left')).toBeVisible();
  await expect(page.getByTestId('invoice-INV-4452')).toHaveAttribute('data-state', 'auto-matched');

  // The client persona never sees supplier commission on this screen (17 Aug review).
  await expect(page.getByText(/commission/i)).toHaveCount(0);

  // Allocate and match the crane invoice under the chosen billing party.
  const crane = page.getByTestId('invoice-INV-4471');
  await crane.getByRole('radio', { name: /Browne Energy — 100%/ }).check();
  await crane.getByRole('button', { name: 'Confirm & match to GAC Agent' }).click();
  await expect(
    page.getByText(/INV-4471 matched to GAC Agent — Browne Energy — 100%/),
  ).toBeVisible();
  await expect(crane).toHaveAttribute('data-state', 'matched');
  await expect(crane.getByText(/Changes after matching carry an administrative fee/)).toBeVisible();
  // Still nothing about commission once matched — toast and matched state included.
  await expect(page.getByText(/commission/i)).toHaveCount(0);

  // Rate the supplier for the job.
  await page.getByTestId('rate-INV-4471-5').click();
  await expect(page.getByTestId('rated-INV-4471')).toHaveText('You rated this job 5 ★');

  // Decision persists across reload.
  await page.reload();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('invoice-INV-4471')).toHaveAttribute('data-state', 'matched');
});

test('7b · port disbursement splits by line at the off-hire, and the halves reconcile', async ({
  page,
}) => {
  await page.goto('/app/invoices');
  await page.keyboard.press('Escape');

  const call = page.getByTestId('invoice-INV-4483');
  await expect(call.getByText('MV Granite Coast').first()).toBeVisible();
  // Arrives on the charterer's time, redelivered to owners alongside.
  await expect(call.getByText(/redelivered to owners alongside Thu 14:20/)).toBeVisible();

  // The charter terms put the inbound on the charterer, the rest on owners.
  await expect(page.getByTestId('split-charterer-INV-4483')).toHaveText('£3,410');
  await expect(page.getByTestId('split-owner-INV-4483')).toHaveText('£3,890');
  await expect(page.getByTestId('split-total-INV-4483')).toHaveText('£7,300');

  // Move linesmen in across to owners: the money moves, the total does not.
  await call
    .getByRole('radio', { name: 'Linesmen — mooring on arrival — bill to Stronach Subsea' })
    .check();
  await expect(page.getByTestId('split-charterer-INV-4483')).toHaveText('£3,100');
  await expect(page.getByTestId('split-owner-INV-4483')).toHaveText('£4,200');
  await expect(page.getByTestId('split-total-INV-4483')).toHaveText('£7,300');
  await expect(page.getByTestId('moved-INV-4483-lines-in')).toBeVisible();

  // Both parties applied against the one PO, and the table stays as the record.
  await call.getByRole('button', { name: 'Confirm & match to GAC Agent' }).click();
  await expect(
    page.getByText(
      /INV-4483 matched to GAC Agent — Wilkinson Drilling £3,100, Stronach Subsea £4,200/,
    ),
  ).toBeVisible();
  await expect(call).toHaveAttribute('data-state', 'matched');
  await expect(call.getByText('Split by line:')).toBeVisible();

  // Nothing supplier-side reaches the client on this screen either.
  await expect(page.getByText(/commission|mark-?up/i)).toHaveCount(0);

  // The split survives a reload exactly as it was matched.
  await page.reload();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('split-charterer-INV-4483')).toHaveText('£3,100');
  await expect(page.getByTestId('split-owner-INV-4483')).toHaveText('£4,200');
});

test('8 · quote request: client-set deadline advice, medical cross-sell, hotel caveat, meal scale', async ({
  page,
}) => {
  await page.goto('/app/marketplace');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Browse Medical' }).click();
  await page.getByRole('button', { name: 'Request quote' }).first().click();
  const dialog = page.getByRole('dialog', { name: /Request a quote — Aberdeen Offshore Medical/ });
  await expect(dialog).toBeVisible();

  // Default window is a full one; ten minutes is warned (the taxi exception).
  await expect(dialog.getByTestId('deadline-advice')).toHaveAttribute('data-tone', 'ok');
  await dialog.getByRole('button', { name: '10 minutes' }).click();
  await expect(dialog.getByTestId('deadline-advice')).toHaveAttribute('data-tone', 'warn');
  await expect(dialog.getByTestId('deadline-advice')).toContainText('taxi');

  // Cross-sell: transfer + hotel suggested; the hotel carries the availability caveat.
  await expect(dialog.getByText(/You may also need/)).toBeVisible();
  await expect(dialog.getByText(/subject to availability/)).toBeVisible();
  await dialog.getByRole('checkbox', { name: /Hotel accommodation/ }).check();
  await dialog.getByRole('switch', { name: 'Include meal allowance' }).click();
  await expect(dialog.getByTestId('meal-scale')).toContainText('£30 per day');

  await dialog.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByText(/Reply-by window: 10 minutes/)).toBeVisible();
  await expect(page.getByText(/1 related service passed to your GAC agent/)).toBeVisible();
});

test('9 · Gold Band shows only where earned; ratings carry counts; plans carry bands', async ({
  page,
}) => {
  await page.goto('/app/marketplace');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Browse Cranes' }).click();
  await expect(page.getByText('◆ GAC Gold Band').first()).toBeVisible();
  await expect(page.getByText('127 ratings').first()).toBeVisible();

  // Promoted Premium supplier without the audit passed does not carry the marque.
  await page.getByRole('button', { name: 'Clear the Cranes filter' }).click();
  await page.getByRole('button', { name: 'Browse Welding' }).click();
  await expect(page.getByText('▲ Promoted').first()).toBeVisible();
  await expect(page.getByText('◆ GAC Gold Band')).toHaveCount(0);

  // Plans carry the commission bands and the keep-more worked example.
  await page.goto('/for-suppliers');
  await expect(page.getByText('20% commission').first()).toBeVisible();
  await expect(page.getByText('15% commission').first()).toBeVisible();
  await expect(page.getByText('10% commission').first()).toBeVisible();
  await expect(page.getByTestId('keeps-premium')).toHaveText('£3,960');
  await expect(page.getByText(/first year/).first()).toBeVisible();
});

test('10 · hotels are a standalone category with the availability caveat and meal scale', async ({
  page,
}) => {
  await page.goto('/app/marketplace');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Browse Hotels' }).click();
  await expect(page.getByRole('heading', { name: 'Granite Quay Hotel' })).toBeVisible();

  // The booking caveat travels with the listing, on the profile since 2 Sep.
  await page.getByRole('link', { name: 'Granite Quay Hotel' }).click();
  await expect(page.getByTestId('booking-note')).toContainText('subject to availability');

  await page.getByRole('button', { name: 'Request quote' }).first().click();
  const dialog = page.getByRole('dialog', { name: /Request a quote — Granite Quay Hotel/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId('hotel-terms')).toContainText('agent steps in');
  await dialog.getByRole('switch', { name: 'Include meal allowance' }).click();
  await expect(dialog.getByTestId('meal-scale')).toContainText('£30 per day');
  // The crew transfer is suggested alongside; no second hotel is offered.
  await expect(dialog.getByRole('checkbox', { name: /Crew transfer/ })).toBeVisible();
  await expect(dialog.getByRole('checkbox', { name: /Hotel accommodation/ })).toHaveCount(0);

  await dialog.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByText(/Booking request sent to Granite Quay Hotel/)).toBeVisible();
  await expect(page.getByText(/subject to availability/).last()).toBeVisible();
});
