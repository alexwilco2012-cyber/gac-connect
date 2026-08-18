import { expect, test } from '@playwright/test';

/**
 * Crew change — hotels, immigration, LOI and repatriation-letter templates
 * (17 Aug 2026 review). The client fills a template in; GAC endorses the LOI as
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
  await page.goto('/app/crew-change');
  await page.keyboard.press('Escape'); // skip loader if present

  await expect(
    page.getByRole('heading', { name: 'Everything a crew change needs, in one place' }),
  ).toBeVisible();

  // The four section controls, keyboard-operable with aria-pressed.
  const sections = page.getByTestId('crew-sections');
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
  await page.goto('/app/crew-change');
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
