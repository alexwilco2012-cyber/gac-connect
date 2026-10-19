import { expect, test } from '@playwright/test';

/**
 * Three additions to Logistics and Customs, on both surfaces:
 *  · a forklift suggested for freight going to a quay with a piece over
 *    250 kg, timed to the freight ETA and following it when it moves;
 *  · the GB EORI held on the client record, confirmed per call with a tick
 *    and carried across to the declaration;
 *  · "Ask the customs team" on a declaration — call back or email, logged on
 *    the entry, simulated.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('gac-connect:tourDismissed', 'true');
  });
});

const FLT_TEXT =
  '380 kg a piece is over 250 kg, so a forklift with operator is suggested at Aberdeen — Regent Quay for the freight ETA, Fri 14:00.';
const FLT_RULE =
  'Suggested when a movement goes to a quay and the weight per piece (gross weight ÷ pieces) is over 250 kg.';

test('site: a forklift is suggested for the quay ETA, follows it, and is requested', async ({
  page,
}) => {
  await page.goto('/app/logistics');
  await page.keyboard.press('Escape');

  // The warehouse delivery does not trigger it; the Regent Quay crate does.
  await expect(page.getByTestId('consignment-CN-2041').getByTestId('flt-suggestion')).toHaveCount(
    0,
  );
  const crate = page.getByTestId('consignment-CN-2042');
  const flt = crate.getByTestId('flt-suggestion');
  await expect(flt).toHaveAttribute('data-requested', 'false');
  await expect(flt.getByTestId('flt-text')).toHaveText(FLT_TEXT);
  await expect(flt.getByTestId('flt-rule')).toHaveText(FLT_RULE);
  await expect(crate.getByTestId('consignment-eta')).toContainText('ETA Fri 14:00');

  // The ETA moves and the suggested time moves with it.
  await flt.getByTestId('flt-delay').click();
  await expect(crate.getByTestId('consignment-eta')).toContainText('ETA Fri 16:00');
  await expect(flt.getByTestId('flt-request')).toHaveText('Request a forklift for Fri 16:00');

  // The request opens the FLT quote request with needed-by = the ETA, and the hire terms.
  await flt.getByTestId('flt-request').click();
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('heading', { name: 'Request a quote — FLT suppliers' }),
  ).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: 'Needed by' })).toHaveValue('Fri 16:00');
  await expect(dialog.getByTestId('hire-terms')).toContainText('booked window only');
  await dialog.getByRole('button', { name: 'Send request' }).click();

  await expect(flt).toHaveAttribute('data-requested', 'true');
  await expect(flt.getByTestId('flt-requested')).toHaveText(
    'Forklift requested for Fri 16:00 at Aberdeen — Regent Quay.',
  );

  // If the freight moves again after the request, the card says so.
  await flt.getByTestId('flt-delay').click();
  await expect(flt.getByTestId('flt-requested')).toContainText(
    'The freight ETA is now Fri 18:00; your GAC agent moves the forklift to match.',
  );
});

test('site: the EORI is held on record, ticked per call, and carried to customs', async ({
  page,
}) => {
  await page.goto('/app/logistics');
  await page.keyboard.press('Escape');

  const crate = page.getByTestId('consignment-CN-2042');
  const eori = crate.getByTestId('consignment-eori');
  await expect(eori).toContainText('GB EORI GB000000000000');
  await expect(eori).toContainText('Illustrative — held on your client record');
  const tick = eori.getByRole('checkbox', { name: 'Confirm for this call' });
  await expect(tick).not.toBeChecked();
  await tick.check();

  // Stored with the consignment: a reload in the same visit keeps it.
  await page.reload();
  await expect(
    page
      .getByTestId('consignment-CN-2042')
      .getByRole('checkbox', { name: 'Confirm for this call' }),
  ).toBeChecked();

  // Raising an entry against the movement carries the EORI across.
  await page.goto('/app/customs?section=declarations');
  await page.getByTestId('declaration-consignment').selectOption('CN-2042');
  await expect(page.getByTestId('declaration-eori')).toHaveText(
    'GB EORI GB000000000000 · Illustrative — held on your client record · Confirmed for this call on CN-2042',
  );
  // The warning against real EORI numbers stays on the form.
  await expect(page.getByTestId('declaration-form')).toContainText(
    'do not enter real commodity codes, EORI numbers or entry references',
  );
  await expect(
    page.getByTestId('declaration-DEC-1187').getByTestId('declaration-card-eori'),
  ).toContainText('GB EORI GB000000000000');
});

test('site: the client can ask the customs team, and it is logged on the entry', async ({
  page,
}) => {
  await page.goto('/app/customs?section=declarations');
  await page.keyboard.press('Escape');

  const entry = page.getByTestId('declaration-DEC-1187');
  await entry.getByTestId('ask-customs-team').click();
  const panel = entry.getByTestId('ask-team-panel');
  await expect(panel).toContainText('no call is placed and no email is sent');
  await panel.getByRole('radio', { name: 'Reply by email' }).check();
  await panel
    .getByRole('textbox', { name: 'Your question (optional)' })
    .fill('Does this need a licence?');
  await panel.getByTestId('ask-team-send').click();

  const logged = entry.getByTestId('customs-team-request');
  await expect(logged).toHaveAttribute('data-channel', 'email');
  await expect(logged).toContainText('Customs team will reply by email');
  await expect(logged).toContainText('Your question: “Does this need a licence?”');
  // No address and no broker on the request, and the immigration line stays off customs.
  await expect(entry).not.toContainText(/@|broker/i);
  await expect(page.getByTestId('line-section')).not.toContainText(/informs, it does not advise/i);

  // The boundary sentence is still on the screen.
  await page.getByRole('button', { name: 'What GAC needs', exact: true }).click();
  await expect(
    page.getByText(/The platform does not give customs advice\. Our customs team does/),
  ).toBeVisible();
});

test('site: Reset demo puts the tick, the forklift and the request back', async ({ page }) => {
  await page.goto('/app/logistics');
  await page.keyboard.press('Escape');
  const crate = page.getByTestId('consignment-CN-2042');
  await crate.getByRole('checkbox', { name: 'Confirm for this call' }).check();
  await crate.getByTestId('flt-request').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Send request' }).click();
  await expect(crate.getByTestId('flt-suggestion')).toHaveAttribute('data-requested', 'true');

  await page.getByRole('button', { name: 'Reset movements' }).click();
  await expect(crate.getByRole('checkbox', { name: 'Confirm for this call' })).not.toBeChecked();
  await expect(crate.getByTestId('flt-suggestion')).toHaveAttribute('data-requested', 'false');
});

test('deck: the same three, in the same words', async ({ page }) => {
  await page.goto('/presenter.html#/logistics');

  const crate = page.getByTestId('consignment-CN-2042');
  await expect(page.getByTestId('consignment-CN-2041').getByTestId('flt-suggestion')).toHaveCount(
    0,
  );
  const flt = crate.getByTestId('flt-suggestion');
  await expect(flt.getByTestId('flt-text')).toHaveText(FLT_TEXT);
  await expect(flt.getByTestId('flt-rule')).toHaveText(FLT_RULE);

  await flt.getByTestId('flt-delay').click();
  await expect(flt.getByTestId('flt-request')).toHaveText('Request a forklift for Fri 16:00');
  await flt.getByTestId('flt-request').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByTestId('rq-needed-by')).toHaveText('Fri 16:00');
  await expect(dialog.getByTestId('hire-terms')).toBeVisible();
  await dialog.getByRole('button', { name: 'Send request' }).click();
  await expect(flt.getByTestId('flt-requested')).toHaveText(
    'Forklift requested for Fri 16:00 at Aberdeen — Regent Quay.',
  );

  await expect(crate.getByTestId('consignment-eori')).toContainText('GB EORI GB000000000000');
  await crate.getByRole('checkbox', { name: 'Confirm for this call' }).check();

  await page.goto('/presenter.html#/customs');
  await page.getByTestId('declaration-consignment').selectOption('CN-2042');
  await expect(page.getByTestId('declaration-eori')).toHaveText(
    'GB EORI GB000000000000 · Illustrative — held on your client record · Confirmed for this call on CN-2042',
  );

  const entry = page.getByTestId('declaration-DEC-1187');
  await entry.getByTestId('ask-customs-team').click();
  await entry.getByRole('radio', { name: 'Call me back' }).check();
  await entry.getByTestId('ask-team-send').click();
  await expect(entry.getByTestId('customs-team-request')).toContainText(
    'Customs team will call you back',
  );
  await expect(page.getByTestId('service-line')).not.toContainText(/informs, it does not advise/i);
});
