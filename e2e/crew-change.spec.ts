import { expect, test } from '@playwright/test';

/**
 * Crew change — hotels, taxis, launches, immigration, LOI and repatriation-letter
 * templates (17 Aug 2026 review; taxis and launches are separate sections since
 * the owner's follow-up). The client fills a template in; GAC endorses the LOI as
 * agents, or routes the repatriation letter to UK Border Force, and returns it.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('gac-connect:tourDismissed', 'true');
  });
});

test('crew change: sections, hotels, LOI and repat pipelines, persistence, reset', async ({
  page,
}) => {
  await page.goto('/app/agency/crew-change');
  await page.keyboard.press('Escape'); // skip loader if present

  await expect(
    page.getByRole('heading', { name: 'Everything a crew change needs, in one place' }),
  ).toBeVisible();

  // Six section controls, keyboard-operable with aria-pressed.
  const sections = page.getByTestId('crew-sections');
  await expect(sections.getByRole('button')).toHaveCount(6);
  const hotelsChip = sections.getByRole('button', { name: 'Hotels', exact: true });
  const immigrationChip = sections.getByRole('button', { name: 'Immigration', exact: true });
  const loiChip = sections.getByRole('button', { name: 'LOI (on-signers)', exact: true });
  const repatChip = sections.getByRole('button', {
    name: 'Repat letters (off-signers)',
    exact: true,
  });
  await expect(hotelsChip).toHaveAttribute('aria-pressed', 'true');
  await expect(immigrationChip).toHaveAttribute('aria-pressed', 'false');
  await expect(loiChip).toHaveAttribute('aria-pressed', 'false');
  await expect(repatChip).toHaveAttribute('aria-pressed', 'false');

  // Hotels: both fictional hotels with the availability caveat; booking opens the
  // quote modal with the hotel-terms fieldset; Escape closes it.
  await expect(page.getByRole('heading', { name: 'Granite Quay Hotel' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Caledonia Rooms' })).toBeVisible();
  await expect(page.getByText('subject to availability').first()).toBeVisible();
  // SVS status is derived from the certificates, not hard-coded (both verified today).
  await expect(page.getByTestId('section-hotels').locator('[data-status="verified"]')).toHaveCount(
    2,
  );
  await expect(page.getByTestId('section-hotels').getByText('GAC Verified')).toHaveCount(2);
  await page.getByRole('button', { name: 'Request booking at Granite Quay Hotel' }).click();
  const dialog = page.getByRole('dialog', { name: /Request a quote — Granite Quay Hotel/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId('hotel-terms')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  // Immigration: guidance, LOI-never-OKTB, informs-not-advises. Keyboard: focus
  // the chip and press Enter.
  await immigrationChip.focus();
  await page.keyboard.press('Enter');
  await expect(immigrationChip).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('section-immigration')).toBeVisible();
  await expect(page.getByTestId('loi-not-oktb')).toContainText('does not issue OKTB');
  await expect(page.getByTestId('informs-not-advises')).toContainText(
    'GAC informs, it does not advise',
  );

  // LOI: the prefilled, obviously fictional template submits into the requests list.
  await loiChip.click();
  await expect(page.getByTestId('section-loi')).toBeVisible();
  await expect(page.getByTestId('loi-illustrative')).toContainText(
    'do not enter real passport data',
  );
  await expect(page.getByLabel('Passport number')).toHaveValue('X0000000');
  // The form is described by the notice — the aria-describedby target must exist.
  await expect(page.locator('form[aria-describedby="loi-illustrative"]')).toHaveCount(1);
  await expect(page.locator('#loi-illustrative')).toHaveCount(1);

  // A half-filled draft survives a trip to the Immigration checklist and back.
  await page.getByLabel('Family name (as in passport)').fill('Draft');
  await immigrationChip.click();
  await expect(page.getByTestId('section-immigration')).toBeVisible();
  await loiChip.click();
  await expect(page.getByLabel('Family name (as in passport)')).toHaveValue('Draft');
  await page.getByLabel('Family name (as in passport)').fill('Demo');

  // Visa-national toggle off → LOI not required, submit disabled; back on → enabled.
  const visaToggle = page.getByRole('switch', { name: 'Visa national' });
  await visaToggle.click();
  await expect(page.getByTestId('loi-not-required')).toBeVisible();
  await expect(page.getByTestId('loi-submit')).toBeDisabled();
  await visaToggle.click();
  await expect(page.getByTestId('loi-submit')).toBeEnabled();

  await page.getByTestId('loi-submit').click();
  const requests = page.getByTestId('crew-requests');
  const loiCard = requests.locator('[data-kind="loi"]');
  await expect(loiCard).toHaveCount(1);
  await expect(loiCard.getByTestId('crew-name')).toHaveText('DEMO, Crew Member');
  await expect(loiCard.getByTestId('crew-stage')).toContainText('Submitted by client');
  await expect(loiCard).toContainText('MV Caledonian Star');

  // Simulate: GAC checks and endorses → endorsed as agents → returned → download.
  await loiCard.getByRole('button', { name: 'Simulate: GAC checks and endorses' }).click();
  await expect(loiCard.getByTestId('crew-stage')).toContainText('Endorsed by GAC');
  await loiCard.getByRole('button', { name: 'Simulate: GAC returns the letter' }).click();
  await expect(loiCard.getByTestId('crew-stage')).toContainText('Returned to client');
  await expect(loiCard.getByRole('button', { name: /^Simulate:/ })).toHaveCount(0);
  await loiCard.getByRole('button', { name: 'Download letter' }).click();
  await expect(page.getByText(/^Illustrative — the endorsed letter would download/)).toBeVisible();

  // Repat: the Yes/No question is required; answer Yes and submit.
  await repatChip.click();
  await expect(page.getByTestId('section-repat')).toBeVisible();
  await expect(page.locator('form[aria-describedby="repat-illustrative"]')).toHaveCount(1);
  await expect(page.locator('#repat-illustrative')).toHaveCount(1);
  await page.getByTestId('repat-submit').click();
  await expect(page.getByTestId('repat-errors')).toContainText('Yes or No');
  await page.getByTestId('repat-question').getByLabel('Yes').check();
  await page.getByTestId('repat-submit').click();
  const repatCard = requests.locator('[data-kind="repat"]');
  await expect(repatCard).toHaveCount(1);
  await expect(repatCard.getByTestId('crew-name')).toHaveText('DEMO, Crew Member');
  await expect(repatCard.getByTestId('crew-stage')).toContainText('Submitted by client');

  // Simulate: GAC prepares and sends → with UKBF → UKBF endorses and returns.
  await repatCard.getByRole('button', { name: 'Simulate: GAC prepares and sends to UKBF' }).click();
  await expect(repatCard.getByTestId('crew-stage')).toContainText('Sent to UK Border Force');
  await repatCard.getByRole('button', { name: 'Simulate: UKBF endorses and returns' }).click();
  await expect(
    repatCard.getByTestId('stage-tracker').locator('li', { hasText: 'Endorsed by UKBF' }),
  ).toHaveAttribute('data-stage-state', 'done');
  await expect(repatCard.getByTestId('crew-stage')).toContainText('Returned to client');
  await expect(repatCard.getByRole('button', { name: 'Download letter' })).toBeVisible();

  // Persistence: both requests survive a reload.
  await page.reload();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('crew-requests').locator('[data-kind]')).toHaveCount(2);
  await expect(page.getByTestId('crew-requests')).toContainText('DEMO, Crew Member');

  // Reset demo clears everything.
  await page.getByTestId('reset-crew-change').click();
  await expect(page.getByTestId('crew-requests').locator('[data-kind]')).toHaveCount(0);
  await expect(page.getByTestId('crew-requests-summary')).toContainText('No requests yet');
});

test('crew change: every form control is labelled', async ({ page }) => {
  await page.goto('/app/agency/crew-change');
  await page.keyboard.press('Escape');

  for (const name of ['LOI (on-signers)', 'Repat letters (off-signers)']) {
    await page.getByTestId('crew-sections').getByRole('button', { name, exact: true }).click();
    const unlabelled = await page.evaluate(() => {
      const controls = Array.from(
        document.querySelectorAll<HTMLElement>('input, select, textarea'),
      );
      return controls
        .filter((el) => {
          const labelled =
            el.closest('label') !== null ||
            el.getAttribute('aria-label') ||
            el.getAttribute('aria-labelledby') ||
            (el.id && document.querySelector(`label[for="${el.id}"]`));
          return !labelled;
        })
        .map((el) => el.outerHTML.slice(0, 80));
    });
    expect(unlabelled, name).toEqual([]);
  }
});

test('crew change › taxis: the planner times the transport to the tracked flight', async ({
  page,
}) => {
  await page.goto('/app/agency/crew-change?section=taxis');
  await page.keyboard.press('Escape');

  // The section opens from the URL and the chip strip reflects it.
  await expect(page.getByTestId('crew-section')).toHaveAttribute('data-section', 'taxis');
  await expect(
    page.getByTestId('crew-sections').getByRole('button', { name: 'Taxis', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('section-taxis')).toBeVisible();
  // Taxis stand alone: the launches panel is not stacked underneath them.
  await expect(page.getByTestId('launches-panel')).toHaveCount(0);

  // Flight-timed planner: the demo flight tracks, the plan lists every leg.
  const planner = page.getByTestId('flight-planner');
  await expect(planner).toContainText('Illustrative');
  await expect(planner.getByTestId('flight-no')).toHaveValue('ZZ 417');
  await planner.getByTestId('track-flight').click();
  await expect(planner.getByTestId('flight-status')).toHaveAttribute('data-phase', 'in-air');
  await expect(planner.getByTestId('flight-status')).toContainText('Amsterdam → Aberdeen');
  await expect(planner.getByTestId('flight-estimate')).toContainText('13:55');
  // land 13:55 → taxi 14:35 → quay 15:00 → launch 15:20 → alongside 15:45
  await expect(planner.getByTestId('leg-0')).toHaveText('13:55');
  await expect(planner.getByTestId('leg-1')).toHaveText('14:35');
  await expect(planner.getByTestId('leg-3')).toHaveText('15:20');
  await expect(planner.getByTestId('transfer-plan')).toContainText('Regent Quay Cars');
  await expect(planner.getByTestId('transfer-plan')).toContainText('Granite Launches');

  // A delay re-times the whole chain from the new estimate.
  await planner.getByTestId('simulate-delay').click();
  await expect(planner.getByTestId('flight-status')).toHaveAttribute('data-phase', 'delayed');
  await expect(planner.getByTestId('flight-estimate')).toContainText('14:35');
  await expect(planner.getByTestId('leg-1')).toHaveText('15:15');
  await expect(planner.getByTestId('leg-3')).toHaveText('16:00');

  // Vessel alongside → no launch leg.
  await planner.getByTestId('flight-launch').selectOption('');
  await expect(planner.getByTestId('transfer-plan')).toContainText('Board the vessel alongside');
  await expect(planner.getByTestId('transfer-plan')).not.toContainText('Launch departs');

  // Send → toast carries the timings.
  await planner.getByTestId('send-transport').click();
  await expect(page.getByText(/Transport request sent — 6 crew, ZZ417/)).toBeVisible();

  // Off-signers work back from the check-in deadline; an unknown flight is said so.
  await planner.getByTestId('direction-departing').click();
  await expect(planner.getByTestId('flight-no')).toHaveValue('ZZ204');
  await planner.getByTestId('track-flight').click();
  await expect(planner.getByTestId('transfer-plan')).toContainText('Flight departs');
  // Vessel still alongside from above: leave the vessel and taxi 14:45, airport 15:10, departs 17:10.
  await expect(planner.getByTestId('leg-1')).toHaveText('14:45');
  await expect(planner.getByTestId('leg-2')).toHaveText('15:10');
  await expect(planner.getByTestId('leg-3')).toHaveText('17:10');
  await planner.getByTestId('flight-no').fill('XX 999');
  await planner.getByTestId('track-flight').click();
  await expect(planner.getByTestId('flight-not-found')).toBeVisible();

  // Taxis: two fictional operators, flight-tracked pickups, request opens the shared modal.
  const taxis = page.getByTestId('taxis');
  await expect(taxis.getByRole('heading', { name: 'Regent Quay Cars' })).toBeVisible();
  await expect(taxis.getByRole('heading', { name: 'Deveron Cabs' })).toBeVisible();
  await expect(taxis.getByText('flight-tracked').first()).toBeVisible();
  await taxis.getByTestId('book-regent-quay-cars').click();
  const dialog = page.getByRole('dialog', { name: /Request a quote — Regent Quay Cars/ });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  // The pointer switches sections rather than duplicating the operators here.
  await expect(page.getByTestId('taxis-launch-pointer')).toContainText('under Launches');
  await page.getByTestId('open-launches').click();
  await expect(page.getByTestId('crew-section')).toHaveAttribute('data-section', 'launches');
  await expect(page).toHaveURL(/section=launches/);
});

test('crew change › launches: capacity and freight, on a section of its own', async ({ page }) => {
  await page.goto('/app/agency/crew-change?section=launches');
  await page.keyboard.press('Escape');

  await expect(page.getByTestId('crew-section')).toHaveAttribute('data-section', 'launches');
  await expect(
    page.getByTestId('crew-sections').getByRole('button', { name: 'Launches', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('section-launches')).toBeVisible();
  await expect(page.getByTestId('launches-panel')).toBeVisible();
  await expect(page.getByTestId('plan-run')).toBeVisible();
  await expect(page.getByTestId('launch-deveron-launch-services')).toContainText('Deveron Lass');
  // The planner is not duplicated here — it belongs with the taxis.
  await expect(page.getByTestId('flight-planner')).toHaveCount(0);

  // Reciprocal pointer back to the flight-timed planner.
  await expect(page.getByTestId('launches-taxi-pointer')).toContainText('tracked flight');
  await page.getByTestId('open-taxis').click();
  await expect(page.getByTestId('crew-section')).toHaveAttribute('data-section', 'taxis');
  await expect(page.getByTestId('flight-planner')).toBeVisible();

  // The nav no longer carries a Launches tab; the marketplace still lists the taxis.
  await expect(
    page
      .getByRole('navigation', { name: 'Platform' })
      .getByRole('link', { name: 'Launches', exact: true }),
  ).toHaveCount(0);
  await page.goto('/app/marketplace');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Taxis', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Regent Quay Cars' })).toBeVisible();
  await expect(page.getByTestId('listing-facts').first()).toContainText('flight-tracked');
});

test('crew change: a link minted before taxis and launches were split still lands right', async ({
  page,
}) => {
  await page.goto('/app/crew-change?section=transfers');
  await page.keyboard.press('Escape');

  // The retired id resolves to Taxis and the address bar is tidied to match.
  await expect(page.getByTestId('crew-section')).toHaveAttribute('data-section', 'taxis');
  await expect(page).toHaveURL(/\?section=taxis$/);
  await expect(page.getByTestId('flight-planner')).toBeVisible();

  // Cross-links move between the two sections and leave focus on the destination chip.
  await page.getByTestId('open-launches').click();
  await expect(page.getByTestId('crew-section')).toHaveAttribute('data-section', 'launches');
  await expect(
    page.getByTestId('crew-sections').getByRole('button', { name: 'Launches', exact: true }),
  ).toBeFocused();
  await page.getByTestId('open-taxis').click();
  await expect(page.getByTestId('crew-section')).toHaveAttribute('data-section', 'taxis');
  await expect(
    page.getByTestId('crew-sections').getByRole('button', { name: 'Taxis', exact: true }),
  ).toBeFocused();

  // Taxis serve the letter ports too, not only the ports that have a launch.
  const ports = await page.getByTestId('flight-port').locator('option').allTextContents();
  expect(ports).toEqual(['Aberdeen', 'Peterhead', 'Montrose', 'Macduff']);
});
