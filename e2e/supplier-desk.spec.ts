import { expect, test, type Page } from '@playwright/test';

/**
 * The supplier's desk (live dashboards, 23 Sep; spec §3): Silver City Welding
 * answers quote requests from its dashboard and sends certificates to the SVS
 * team. The quote lands in the store and moves the pipeline counters; the
 * certificate upload is simulated (only the file's name and size are kept),
 * shows as awaiting review, survives a reload and goes with Reset demo.
 */

// Playwright runs under Node, where Buffer is a global; the repo carries no
// @types/node, so the one method used here is declared locally.
declare const Buffer: { alloc(size: number, fill?: number): Uint8Array };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('gac-connect:tourDismissed', 'true');
  });
});

async function openSupplierView(page: Page) {
  await page.goto('/app/dashboard');
  await page.keyboard.press('Escape'); // skip the loader if it shows
  await page.getByRole('button', { name: 'Supplier view' }).click();
  await expect(page.getByRole('heading', { name: 'Silver City Welding', level: 1 })).toBeVisible();
}

const pdf = (name: string, bytes = 2048) => ({
  name,
  mimeType: 'application/pdf',
  buffer: Buffer.alloc(bytes, 37),
});

/** An ISO date moved by whole years and days, as `shiftISO` in lib/svsDesk does it. */
function shiftISO(iso: string, by: { years?: number; days?: number }): string {
  const [y, m, d] = iso.split('-').map(Number);
  const moved = new Date(Date.UTC(y! + (by.years ?? 0), m! - 1, d! + (by.days ?? 0)));
  return moved.toISOString().slice(0, 10);
}

/**
 * Today on this machine — the form checks dates against the device clock, so
 * the examples are dated from it too. On the demo date (23 Sep 2026) the ISO
 * 9001 example reads as the spec has it: issued 2 Sep 2026, expires 1 Sep 2029.
 */
const TODAY = (() => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    .toISOString()
    .slice(0, 10);
})();

/** The ISO 9001 example: issued three weeks ago for three years less a day. */
const EXAMPLE_ISSUED = shiftISO(TODAY, { days: -21 });
const EXAMPLE_EXPIRES = shiftISO(EXAMPLE_ISSUED, { years: 3, days: -1 });

test('a quote is validated, sent, and moves the pipeline counters', async ({ page }) => {
  await openSupplierView(page);

  const inbox = page.getByTestId('supplier-inbox');
  await expect(inbox).toContainText('Onboard pipework repair');
  await expect(inbox.getByTestId('pipeline-new')).toHaveText('2');
  await expect(inbox.getByTestId('pipeline-quoted')).toHaveText('3');
  await expect(inbox.getByTestId('pipeline-won')).toHaveText('4');
  // The quotes already with clients are listed under the inbox.
  await expect(inbox).toContainText('Awaiting the client');
  await expect(inbox).toContainText('Handrail repair');

  const row = page.getByTestId('inbox-req-4471');
  const trigger = row.getByRole('button', { name: /Send a quote/ });
  await trigger.click();

  const dialog = page.getByRole('dialog', { name: 'Quote: Onboard pipework repair' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Price (£)')).toBeFocused();

  // Nothing entered: the one line says what is missing.
  await dialog.getByRole('button', { name: 'Send quote' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Still needed: price');

  // Pence are refused — the price is in whole pounds.
  await dialog.getByLabel('Price (£)').fill('24.50');
  await dialog.getByRole('button', { name: 'Send quote' }).click();
  await expect(dialog.getByRole('alert')).toContainText('whole pounds');

  await dialog.getByLabel('Price (£)').fill('2450');
  await dialog.getByLabel('Lead time').selectOption('Same day');
  await dialog.getByLabel('Valid for').selectOption('7 days');
  await dialog.getByLabel(/Note to the client/).fill('Coded welder and helper, own consumables.');
  await dialog.getByRole('button', { name: 'Send quote' }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText(
    'Quote sent for Onboard pipework repair — MV Granite Coast.',
  );
  await expect(row).toContainText('Quoted £2,450 · awaiting client');
  await expect(row.getByRole('button', { name: /Quote sent/ })).toBeDisabled();
  await expect(inbox.getByTestId('pipeline-new')).toHaveText('1');
  await expect(inbox.getByTestId('pipeline-quoted')).toHaveText('4');

  // The quote holds across a reload.
  await page.reload();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('inbox-req-4471')).toContainText('Quoted £2,450');
  await expect(page.getByTestId('pipeline-quoted')).toHaveText('4');
});

test('Escape closes the quote modal and hands focus back', async ({ page }) => {
  await openSupplierView(page);
  const trigger = page.getByTestId('inbox-req-4478').getByRole('button', { name: /Send a quote/ });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Quote: Fabrication — skid frames' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByTestId('pipeline-new')).toHaveText('2');
});

test('a certificate goes to the SVS team, survives a reload and goes with Reset demo', async ({
  page,
}) => {
  await openSupplierView(page);

  const certs = page.getByTestId('supplier-certificates');
  await expect(certs).toContainText('Coded welder qualifications (BS EN ISO 9606-1)');
  await expect(certs).toContainText('Expires 13 Mar 2027');
  await expect(page.getByTestId('recommended-status')).toContainText('3 of 4 on file');
  await expect(page.getByTestId('recommended-status')).toContainText('ISO 9001 quality management');

  const add = certs.getByRole('button', { name: 'Add a certificate' });
  await add.click();
  const dialog = page.getByRole('dialog', { name: 'Add a certificate' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Nothing leaves this browser — the upload is simulated.');

  // Sent empty, the form lists everything still needed.
  await dialog.getByRole('button', { name: 'Send to the SVS team' }).click();
  const alert = dialog.getByRole('alert');
  await expect(alert).toContainText('Still needed:');
  await expect(alert).toContainText('certificate type');
  await expect(alert).toContainText('a file');
  await expect(alert).toContainText('the confirmation tick');

  // "Other" asks for a description.
  await dialog.getByLabel('Certificate type').selectOption('Other');
  await expect(dialog.getByLabel('Describe the certificate')).toBeVisible();

  await dialog.getByLabel('Certificate type').selectOption('ISO 9001 quality management');
  await expect(dialog.getByLabel('Describe the certificate')).toHaveCount(0);
  await dialog.getByLabel('Issuing body').fill('Northgate Quality Assurance');
  await dialog.getByLabel('Reference or certificate number').fill('QA-9001-2618');
  // The picker offers nothing after today, as the check on send insists.
  await expect(dialog.getByLabel('Issue date')).toHaveAttribute('max', TODAY);
  await dialog.getByLabel('Issue date').fill(EXAMPLE_ISSUED);
  await dialog.getByLabel('Expiry date').fill(EXAMPLE_EXPIRES);

  // A real file input sits behind the Browse files button; only name and size are kept.
  await expect(dialog.getByRole('button', { name: 'Browse files' })).toBeVisible();
  await dialog
    .getByLabel('Certificate file')
    .setInputFiles(pdf('ISO9001-certificate.pdf', 253_952));
  await expect(dialog.getByTestId('chosen-file')).toContainText('ISO9001-certificate.pdf · 248 KB');
  // Attaching is announced, not only drawn.
  await expect(dialog.locator('[aria-live="polite"]')).toHaveText(
    'Attached ISO9001-certificate.pdf, 248 KB.',
  );
  await dialog.getByLabel('I confirm this is a true copy of the current certificate.').check();
  await dialog.getByRole('button', { name: 'Send to the SVS team' }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText(
    'Sent to the SVS team: ISO 9001 quality management. It shows as awaiting review until they decide.',
  );
  const row = certs.getByRole('listitem').filter({ hasText: 'ISO 9001 quality management' });
  await expect(row).toContainText('Awaiting SVS review');
  await expect(row).toContainText('Northgate Quality Assurance · QA-9001-2618');
  await expect(page.getByTestId('recommended-status')).toContainText('awaiting SVS review');

  // Demo work lasts as long as the tab: a reload keeps it.
  await page.reload();
  await page.keyboard.press('Escape');
  await expect(
    page
      .getByTestId('supplier-certificates')
      .getByRole('listitem')
      .filter({ hasText: 'ISO 9001 quality management' }),
  ).toContainText('Awaiting SVS review');

  // Reset demo takes it away again (and puts the dashboard back on the client view).
  await page.getByTestId('reset-demo').click();
  await page.getByTestId('reset-demo-confirm').click();
  await page.getByRole('button', { name: 'Supplier view' }).click();
  await expect(page.getByTestId('supplier-certificates')).not.toContainText('Awaiting SVS review');
  await expect(page.getByTestId('recommended-status')).toContainText('3 of 4 on file');
});

test('the wrong kind of file, or one over 10 MB, is refused', async ({ page }) => {
  await openSupplierView(page);
  await page.getByRole('button', { name: 'Add a certificate' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add a certificate' });
  await dialog.getByRole('button', { name: 'Fill with an example' }).click();

  const input = dialog.getByLabel('Certificate file');
  await input.setInputFiles({
    name: 'setup.exe',
    mimeType: 'application/octet-stream',
    buffer: Buffer.alloc(1024, 1),
  });
  await expect(dialog.getByTestId('chosen-file')).toContainText('setup.exe');
  await expect(dialog.getByTestId('file-problem')).toContainText('PDF, JPG or PNG');
  // The refusal is announced the moment the file is chosen, before any send.
  await expect(dialog.locator('[aria-live="polite"]')).toContainText(
    'This file is not a PDF, JPG or PNG.',
  );
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Send to the SVS team' }).click();
  // Still one alert: the "Still needed" line.
  await expect(dialog.getByRole('alert')).toContainText('file must be a PDF, JPG or PNG');
  await expect(dialog).toBeVisible();

  await input.setInputFiles(pdf('scan.pdf', 11 * 1024 * 1024));
  await expect(dialog.getByTestId('chosen-file')).toContainText('scan.pdf · 11 MB');
  await dialog.getByRole('button', { name: 'Send to the SVS team' }).click();
  await expect(dialog.getByRole('alert')).toContainText('file must be under 10 MB');
  await expect(dialog).toBeVisible();

  // Remove clears the file, and the drop zone offers Browse files again.
  await dialog.getByRole('button', { name: /^Remove/ }).click();
  await expect(dialog.getByTestId('chosen-file')).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Browse files' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('supplier-certificates')).not.toContainText('Awaiting SVS review');
});

test('Fill with an example sends the ISO 9001 the listing is missing', async ({ page }) => {
  await openSupplierView(page);
  await page.getByRole('button', { name: 'Add a certificate' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add a certificate' });
  await dialog.getByRole('button', { name: 'Fill with an example' }).click();

  await expect(dialog.getByLabel('Certificate type')).toHaveValue('ISO 9001 quality management');
  await expect(dialog.getByLabel('Issuing body')).toHaveValue('Northgate Quality Assurance');
  await expect(dialog.getByLabel('Reference or certificate number')).toHaveValue('QA-9001-2618');
  await expect(dialog.getByLabel('Issue date')).toHaveValue(EXAMPLE_ISSUED);
  await expect(dialog.getByLabel('Expiry date')).toHaveValue(EXAMPLE_EXPIRES);
  await expect(dialog.getByTestId('chosen-file')).toContainText('ISO9001-certificate.pdf · 248 KB');
  await expect(
    dialog.getByLabel('I confirm this is a true copy of the current certificate.'),
  ).toBeChecked();

  await dialog.getByRole('button', { name: 'Send to the SVS team' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page
      .getByTestId('supplier-certificates')
      .getByRole('listitem')
      .filter({ hasText: 'ISO 9001 quality management' }),
  ).toContainText('Awaiting SVS review');
});

test('Upload renewal locks the type to the certificate being renewed', async ({ page }) => {
  await openSupplierView(page);
  const trigger = page.getByRole('button', {
    name: 'Upload renewal for Coded welder qualifications (BS EN ISO 9606-1)',
  });
  await trigger.click();

  const dialog = page.getByRole('dialog', {
    name: 'Upload a renewal: Coded welder qualifications (BS EN ISO 9606-1)',
  });
  await expect(dialog).toBeVisible();
  const type = dialog.getByLabel('Certificate type');
  await expect(type).toHaveValue('Coded welder qualifications (BS EN ISO 9606-1)');
  await expect(type).not.toBeEditable();
  await expect(dialog.getByRole('combobox', { name: 'Certificate type' })).toHaveCount(0);

  // Escape closes it and hands focus back to the row's button.
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  // Sent: the row keeps its current dates and shows the renewal with the SVS team.
  await trigger.click();
  await dialog.getByRole('button', { name: 'Fill with an example' }).click();
  await expect(type).toHaveValue('Coded welder qualifications (BS EN ISO 9606-1)');
  // The example is dated from today, so it is never refused as expired.
  const issued = shiftISO(TODAY, { days: -2 });
  await expect(dialog.getByLabel('Issue date')).toHaveValue(issued);
  await expect(dialog.getByLabel('Expiry date')).toHaveValue(
    shiftISO(issued, { years: 1, days: -1 }),
  );
  await dialog.getByRole('button', { name: 'Send to the SVS team' }).click();
  await expect(dialog).toHaveCount(0);
  const row = page
    .getByTestId('supplier-certificates')
    .getByRole('listitem')
    .filter({ hasText: 'Coded welder qualifications (BS EN ISO 9606-1)' });
  await expect(row).toContainText('Renewal awaiting SVS review');
  await expect(row).toContainText('Expires 13 Mar 2027');
});

test('a renewal is made out against the certificate in force, approved renewal included', async ({
  page,
}) => {
  // GWO renewed once and approved by the SVS team; the vault still holds 2291.
  await page.addInitScript(() => {
    window.sessionStorage.setItem('gac-connect:demoSession', 'true');
    window.localStorage.setItem(
      'gac-connect:svsDesk.evidence',
      JSON.stringify([
        {
          id: 'EVD-2039',
          supplierId: 'silver-city-welding',
          supplierName: 'Silver City Welding',
          kind: 'renewal',
          vaultId: 'vc-gwo',
          certType: 'GWO Basic Safety Training',
          certLabel: 'GWO Basic Safety Training',
          issuer: 'Quayside Safety Training',
          reference: 'GWO-BST-2292',
          issuedOn: '2026-09-21',
          expiresOn: '2028-09-20',
          daysLeft: 728,
          fileName: 'GWO-BST-2292.pdf',
          fileSize: 319488,
          submittedAt: 'Today 07:35',
          stage: 'approved',
          trail: [
            { at: 'Today 07:35', by: 'Supplier', text: 'Certificate uploaded' },
            { at: 'Today 07:50', by: 'SVS team', text: 'Verified by the SVS team' },
          ],
        },
      ]),
    );
  });
  await openSupplierView(page);
  await page.getByRole('button', { name: 'Upload renewal for GWO Basic Safety Training' }).click();
  const dialog = page.getByRole('dialog', {
    name: 'Upload a renewal: GWO Basic Safety Training',
  });
  await expect(dialog).toContainText(
    'In force now: Quayside Safety Training · GWO-BST-2292, expires 20 Sep 2028.',
  );
  await dialog.getByRole('button', { name: 'Fill with an example' }).click();
  await expect(dialog.getByLabel('Reference or certificate number')).toHaveValue('GWO-BST-2293');
});

test('on a phone the certificate modal keeps its targets and the file size in reach', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openSupplierView(page);
  await page.getByRole('button', { name: 'Add a certificate' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add a certificate' });
  await dialog.getByRole('button', { name: 'Fill with an example' }).click();

  // The size stays on screen however long the name.
  const size = dialog.getByTestId('chosen-file').getByText('248 KB');
  await expect(size).toBeVisible();
  expect(await size.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);

  // 44px targets: Remove, and the confirmation row.
  const remove = dialog.getByRole('button', { name: /^Remove/ });
  expect((await remove.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const confirm = dialog.locator('label', { hasText: 'I confirm this is a true copy' });
  expect((await confirm.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test('the supplier modals cover the whole screen in the app face', async ({ page }) => {
  await openSupplierView(page);
  await page
    .getByTestId('inbox-req-4471')
    .getByRole('button', { name: /Send a quote/ })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Quote: Onboard pipework repair' });
  await expect(dialog).toBeVisible();
  const cover = await dialog.evaluate((d) => {
    const scrim = d.parentElement!;
    return {
      font: getComputedStyle(d).fontFamily.split(',')[0]!.trim(),
      sidebar: document.elementFromPoint(100, 300) === scrim,
      topBar: document.elementFromPoint(700, 28) === scrim,
    };
  });
  expect(cover).toEqual({ font: 'Inter', sidebar: true, topBar: true });
});

test('references never break at their hyphens', async ({ page }) => {
  for (const width of [1024, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await openSupplierView(page);
    for (const ref of ['CW-26-0418', 'NSM-EL-7731', 'GWO-BST-2291', 'REQ-4449', 'REQ-4471']) {
      const lines = await page
        .locator('main')
        .getByText(ref, { exact: true })
        .first()
        .evaluate((el) => new Set([...el.getClientRects()].map((r) => Math.round(r.top))).size);
      expect(lines, `${ref} at ${width}px`).toBe(1);
    }
  }
});

test('the supplier view keeps its plan card and never grows a second h1', async ({ page }) => {
  await openSupplierView(page);
  await expect(page.getByTestId('supplier-plan')).toContainText('10% commission');
  await expect(page.getByTestId('supplier-keeps')).toHaveText('£3,960');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('button', { name: /supplier view/i })).toHaveCount(1);
  // The standing sits with the name in the header, and only in the supplier view.
  const standing = page.getByRole('list', { name: 'Listing standing' });
  await expect(standing).toContainText('Premium plan');
  await expect(standing).toContainText('Gold Band audit booked');
  const order = await page.evaluate(() => {
    const h1 = document.querySelector('h1')!;
    const list = document.querySelector('[aria-label="Listing standing"]')!;
    const toggle = document.querySelector('[data-testid="dashboard-view-switch"]')!;
    const follows = (a: Element, b: Element) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    return { afterName: follows(h1, list), beforeSwitch: follows(list, toggle) };
  });
  expect(order).toEqual({ afterName: true, beforeSwitch: true });
  // Earnings, and the numbers behind the chart.
  const earnings = page.getByRole('figure', { name: 'Earnings through the platform' });
  await expect(earnings).toContainText('£50,490 kept');
  await earnings.getByText('Show the numbers').click();
  await expect(earnings.getByRole('table')).toContainText('£12,600');

  await page.getByRole('button', { name: 'Client view' }).click();
  await expect(page.getByRole('list', { name: 'Listing standing' })).toHaveCount(0);
});

test('the SVS team’s decisions come back: verified on the profile, sent back with a note', async ({
  page,
}) => {
  // Two of Silver City's submissions, already decided by the SVS team. The
  // visit flag marks this as the same visit, so the seed is read, not swept.
  await page.addInitScript(() => {
    const trail = (text: string) => [
      { at: 'Wed 23 Sep · 09:10', by: 'Supplier', text: 'Certificate uploaded' },
      { at: 'Wed 23 Sep · 11:02', by: 'SVS team', text },
    ];
    const base = {
      supplierId: 'silver-city-welding',
      supplierName: 'Silver City Welding',
      kind: 'new',
      issuer: 'Northgate Quality Assurance',
      issuedOn: '2026-09-02',
      expiresOn: '2029-09-01',
      daysLeft: 1074,
      fileSize: 253952,
      submittedAt: 'Wed 23 Sep · 09:10',
    };
    window.sessionStorage.setItem('gac-connect:demoSession', 'true');
    window.localStorage.setItem(
      'gac-connect:svsDesk.evidence',
      JSON.stringify([
        {
          ...base,
          id: 'EVD-2040',
          certType: 'ISO 45001 occupational health and safety',
          certLabel: 'ISO 45001 occupational health and safety',
          reference: 'OHS-45-1102',
          fileName: 'ISO45001.pdf',
          stage: 'info-requested',
          note: 'The scan is cut off at the foot — please send the full certificate.',
          trail: trail('Asked for more information'),
        },
        {
          ...base,
          id: 'EVD-2039',
          certType: 'ISO 9001 quality management',
          certLabel: 'ISO 9001 quality management',
          reference: 'QA-9001-2618',
          fileName: 'ISO9001-certificate.pdf',
          stage: 'approved',
          trail: trail('Verified by the SVS team'),
        },
      ]),
    );
  });

  // The profile lists the approved certificate; the gate's status does not move.
  await page.goto('/app/marketplace/silver-city-welding');
  await page.keyboard.press('Escape');
  const profileRow = page.getByRole('row').filter({ hasText: 'ISO 9001 quality management' });
  await expect(profileRow).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'ISO 45001' })).toHaveCount(0);
  await expect(page.getByText('✓ GAC Verified').first()).toBeVisible();

  await page.goto('/app/dashboard');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Supplier view' }).click();
  const certs = page.getByTestId('supplier-certificates');
  await expect(
    certs.getByRole('listitem').filter({ hasText: 'ISO 9001 quality management' }),
  ).toContainText('Verified by the SVS team');
  // All four recommended certificates are on file, so the nudge has gone.
  await expect(page.getByTestId('recommended-status')).toHaveCount(0);

  const sentBack = certs
    .getByRole('listitem')
    .filter({ hasText: 'ISO 45001 occupational health and safety' });
  await expect(sentBack).toContainText('More information needed');
  await expect(sentBack).toContainText('The scan is cut off at the foot');
  await sentBack.getByRole('button', { name: /Re-upload/ }).click();

  const dialog = page.getByRole('dialog', {
    name: 'Re-upload: ISO 45001 occupational health and safety',
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('The scan is cut off at the foot');
  await expect(dialog.getByLabel('Certificate type')).not.toBeEditable();
  await expect(dialog.getByLabel('Reference or certificate number')).toHaveValue('OHS-45-1102');
  await dialog.getByLabel('Certificate file').setInputFiles(pdf('ISO45001-full.pdf'));
  await dialog.getByLabel('I confirm this is a true copy of the current certificate.').check();
  await dialog.getByRole('button', { name: 'Send to the SVS team' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(sentBack).toContainText('Awaiting SVS review');
  await expect(sentBack).not.toContainText('The scan is cut off');
});
