import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { CREW_TEMPLATE_HEADERS } from '../src/data/crewList';
import { writeXlsx } from '../src/lib/xlsx';

/**
 * Crew list upload — the first section of the crew change screen (owner's ask,
 * 23 Aug 2026). The coordinator uploads the spreadsheet they already keep, the
 * platform reads the headers, they check the rows, choose the LOIs, rooms and
 * taxis that follow, submit, and can delete the crew's personal data afterwards
 * — with the redaction proved on the real surface by searching localStorage.
 */

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * The spec runs under Node, whose Buffer Playwright wants for an in-memory
 * upload; the repo carries no @types/node, so the runtime global is reached
 * through globalThis rather than named as a type.
 */
const nodeBuffer = (globalThis as unknown as { Buffer: { from(bytes: Uint8Array): Uint8Array } })
  .Buffer;

function payload(name: string, mimeType: string, bytes: Uint8Array) {
  return { name, mimeType, buffer: nodeBuffer.from(bytes) };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('gac-connect:tourDismissed', 'true');
  });
});

/** From the check step of an imported list: services → submit → ticked → submitted. */
async function submitFromCheck(page: Page) {
  await page.getByTestId('crew-list-continue').click();
  await expect(page.getByTestId('crew-list-services')).toBeVisible();
  await page.getByTestId('crew-list-to-submit').click();
  await expect(page.getByTestId('crew-list-submit-step')).toBeVisible();
  await page.getByTestId('crew-list-ack').check();
  await page.getByTestId('crew-list-submit').click();
  await expect(page.getByTestId('crew-lists')).toBeVisible();
}

test('crew list: the screen opens on it, with the notice and the illustrative line', async ({
  page,
}) => {
  await page.goto('/app/agency/crew-change');
  await page.keyboard.press('Escape');

  const sections = page.getByTestId('crew-sections');
  await expect(sections.getByRole('button')).toHaveCount(7);
  await expect(sections.getByRole('button', { name: 'Crew list', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByTestId('crew-section')).toHaveAttribute('data-section', 'crew-list');
  await expect(page).toHaveURL(/\/app\/agency\/crew-change$/);
  await expect(page.getByTestId('section-summary')).toContainText(
    'Upload the crew list you already keep',
  );

  // The disclosure is open on the upload step, the illustrative line sits under it.
  const notice = page.getByTestId('crew-data-notice');
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('How crew data is handled');
  await expect(notice).toContainText('thirty days');
  await expect(notice).toContainText('Crew members’ rights');
  await expect(page.getByTestId('crew-list-illustrative')).toContainText(
    'do not upload real passport data',
  );

  // Five steps, Upload current; the drop zone and its three actions.
  const steps = page.getByTestId('crew-list-steps');
  await expect(steps.getByRole('listitem')).toHaveCount(5);
  await expect(steps.locator('[aria-current="step"]')).toHaveText(/Upload/);
  await expect(page.getByTestId('crew-list-upload')).toBeVisible();
  await expect(page.getByTestId('crew-list-file')).toHaveAttribute('accept', /\.xlsx/);
  await expect(page.getByTestId('crew-list-template')).toBeVisible();
  await expect(page.getByTestId('crew-list-demo')).toBeVisible();
  await expect(page.getByTestId('crew-lists')).toHaveCount(0);
});

test('crew list: demo list end to end — check, services, submit, LOIs raised, delete, proved in storage', async ({
  page,
}) => {
  await page.goto('/app/agency/crew-change');
  await page.keyboard.press('Escape');

  // The demo takes the same road as a real file.
  await page.getByTestId('crew-list-demo').click();
  const check = page.getByTestId('crew-list-check');
  await expect(check).toBeVisible();
  await expect(page.getByTestId('crew-list-steps').locator('[aria-current="step"]')).toHaveText(
    /Check/,
  );
  const summary = page.getByTestId('crew-list-summary');
  await expect(summary).toContainText('8 crew');
  await expect(summary).toContainText('5 on-signers');
  await expect(summary).toContainText('3 off-signers');
  await expect(summary).toContainText('1 needs attention');
  await expect(page.getByTestId('crew-list-status')).toContainText('Read 8 crew from');
  await expect(page.getByTestId('crew-row')).toHaveCount(8);
  await expect(page.locator('[data-testid="crew-row"][data-issues]')).toHaveCount(1);
  await expect(check.getByText('Passport expiry missing')).toBeVisible();

  // The notice collapses to a line once the upload is in; Show opens it again.
  const noticeToggle = page.getByTestId('crew-data-notice-toggle');
  await expect(noticeToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByTestId('crew-data-notice')).not.toContainText('Crew members’ rights');
  await noticeToggle.click();
  await expect(noticeToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('crew-data-notice')).toContainText('Crew members’ rights');
  await noticeToggle.click();

  // Passports are masked until asked for.
  await expect(page.getByTestId('crew-passport').first()).toHaveText('••••0001');
  await expect(check.getByText('X0000001')).toHaveCount(0);
  const showPassports = page.getByRole('switch', { name: 'Show passport numbers' });
  await showPassports.click();
  await expect(showPassports).toHaveAttribute('aria-checked', 'true');
  await expect(check.getByText('X0000001')).toBeVisible();
  await showPassports.click();
  await expect(check.getByText('X0000001')).toHaveCount(0);

  // The mapping is editable: ignore the family-name column and every row loses its name.
  const familyNameColumn = page.getByTestId('crew-map-0');
  await expect(familyNameColumn).toHaveValue('familyName');
  await expect(familyNameColumn).toHaveAttribute('aria-label', 'Column: Family name');
  await familyNameColumn.selectOption('');
  await expect(summary).toContainText('8 need attention');
  await expect(check.getByText('Name missing')).toHaveCount(8);
  await familyNameColumn.selectOption('familyName');
  await expect(summary).toContainText('1 needs attention');
  await expect(page.getByTestId('crew-list-unmapped')).toContainText('Visa national');

  // Remove the off-signer with the missing expiry: seven crew, nothing to fix.
  await page.getByRole('button', { name: 'Remove DEMO, Crew Member 7 from the list' }).click();
  await expect(summary).toContainText('7 crew');
  await expect(summary).toContainText('nothing needs attention');
  await expect(page.getByTestId('crew-row')).toHaveCount(7);

  // Services: five LOIs, four runs all tracked by the feed, hotels switched off.
  await page.getByTestId('crew-list-continue').click();
  const services = page.getByTestId('crew-list-services');
  await expect(services).toBeVisible();
  await expect(page.getByTestId('crew-list-steps').locator('[aria-current="step"]')).toHaveText(
    /Choose services/,
  );
  await expect(page.getByTestId('service-loi-count')).toHaveText('5 visa-national on-signers');
  await expect(services.getByRole('switch', { name: 'LOIs for on-signers' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(page.getByTestId('taxi-run')).toHaveCount(4);
  await expect(page.getByTestId('taxi-runs').getByText('tracked', { exact: true })).toHaveCount(4);
  await expect(page.getByTestId('taxi-runs')).toContainText('ZZ 417');
  await expect(page.getByTestId('taxi-runs')).toContainText('ZZ 131');
  // ZZ 417 lands 13:55 → pick-up 14:35 after bags and immigration.
  await expect(page.getByTestId('taxi-run').first()).toContainText('14:35');
  await expect(page.getByTestId('service-hotel-line')).toContainText('7 rooms × 1 night');
  const hotelsToggle = services.getByRole('switch', { name: 'Hotel rooms' });
  await hotelsToggle.click();
  await expect(hotelsToggle).toHaveAttribute('aria-checked', 'false');

  // Submit: disabled until the acknowledgement is ticked; the summary says what goes.
  await page.getByTestId('crew-list-to-submit').click();
  await expect(page.getByTestId('crew-list-submit-step')).toBeVisible();
  const serviceSummary = page.getByTestId('crew-list-service-summary');
  await expect(serviceSummary).toContainText('LOIs · 5 visa-national on-signers');
  await expect(serviceSummary).toContainText('Taxis · 4 runs for 7 crew, timed to the flights');
  await expect(serviceSummary).not.toContainText('Hotel');
  await expect(page.getByTestId('crew-list-vessel')).toHaveValue('caledonian-star');
  await expect(page.getByTestId('crew-list-port')).toHaveValue('Aberdeen');
  await expect(page.getByTestId('crew-list-submit')).toBeDisabled();
  await page.getByTestId('crew-list-ack').check();
  await expect(page.getByTestId('crew-list-submit')).toBeEnabled();
  await page.getByTestId('crew-list-submit').click();
  await expect(
    page.getByText('Crew list CL-0001 submitted — 7 crew, 5 LOIs and 4 taxi runs.', {
      exact: false,
    }),
  ).toBeVisible();

  // The submission card, and the letters raised from it.
  const card = page.getByTestId('crew-list-CL-0001');
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute('data-stage', 'Submitted to GAC');
  await expect(card).toHaveAttribute('data-personal-data', 'present');
  await expect(card).toContainText('7 crew');
  await expect(card).toContainText('LOIs · 5 visa-national on-signers');
  await expect(card.getByTestId('crew-list-data-state')).toContainText(
    'thirty days after the crew change completes',
  );
  await expect(page.getByTestId('crew-list-steps').locator('[aria-current="step"]')).toHaveText(
    /Delete when done/,
  );
  await card.getByTestId('crew-list-show-crew').click();
  await expect(card.getByTestId('crew-list-crew')).toContainText('DEMO, Crew Member 1');
  await expect(card.getByTestId('crew-list-crew')).toContainText('••••0001');
  await expect(card.getByTestId('crew-list-crew')).not.toContainText('X0000001');

  const loiCards = page.getByTestId('crew-requests').locator('[data-kind="loi"]');
  await expect(loiCards).toHaveCount(5);
  await expect(page.getByTestId('crew-request-source')).toHaveCount(5);
  await expect(page.getByTestId('crew-request-source').first()).toHaveText('from CL-0001');
  await expect(loiCards.first().getByTestId('crew-name')).toContainText('DEMO, Crew Member');
  await expect(card.getByTestId('crew-list-linked')).toContainText('LOI-0001');

  // Before receipt a deletion is a withdrawal; after it, a deletion.
  await expect(card.getByTestId('crew-list-delete')).toHaveText('Withdraw and delete crew data');
  await card.getByTestId('crew-list-advance').click();
  await expect(card).toHaveAttribute('data-stage', 'Received by GAC');
  await expect(card.getByTestId('crew-list-delete')).toHaveText('Delete crew data');

  // Delete: dialog → confirm → the list and its letters are redacted.
  await card.getByTestId('crew-list-delete').click();
  const dialog = page.getByTestId('crew-delete-dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Delete crew data?' })).toBeVisible();
  await dialog.getByTestId('crew-delete-confirm').click();
  await expect(dialog).toBeHidden();
  await expect(card).toHaveAttribute('data-personal-data', 'deleted');
  await expect(card.getByTestId('crew-list-data-state')).toContainText('Personal data deleted');
  await expect(card.getByTestId('crew-list-data-state')).toContainText('GAC confirmed deletion');
  await expect(card.getByTestId('crew-list-delete')).toHaveCount(0);
  await expect(card.getByTestId('crew-list-show-crew')).toHaveCount(0);
  await expect(card).toContainText('7 crew');
  await expect(
    page.getByText('Crew data for CL-0001 deleted from this device', { exact: false }),
  ).toBeVisible();
  for (const name of await loiCards.getByTestId('crew-name').allTextContents()) {
    expect(name).toBe('Personal data deleted');
  }
  await expect(loiCards.first()).toContainText('Details removed at the client’s request');
  await expect(page.getByTestId('crew-list-delete-all')).toHaveCount(0);

  // Proved on the real surface: nothing personal is left anywhere in storage.
  const stored = await page.evaluate(() => JSON.stringify(window.localStorage));
  expect(stored).not.toContain('X000000');
  expect(stored).not.toContain('DEMO');
  expect(stored).toContain('CL-0001');

  // And it stays that way.
  await page.reload();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('crew-list-CL-0001')).toHaveAttribute(
    'data-personal-data',
    'deleted',
  );
  await expect(page.getByTestId('crew-requests').locator('[data-kind="loi"]')).toHaveCount(5);
  await expect(
    page.getByTestId('crew-requests').locator('[data-kind="loi"][data-redacted="true"]'),
  ).toHaveCount(5);
  await expect(page.getByTestId('crew-requests')).not.toContainText('DEMO');
});

test('crew list: a real upload — scrambled headers, CSV, and a refused .xls', async ({ page }) => {
  await page.goto('/app/agency/crew-change');
  await page.keyboard.press('Escape');

  // A workbook with someone else's column names, built the way the platform builds its own.
  const headers = [
    'Surname',
    'Given names',
    'Rank',
    'Nat.',
    'DOB',
    'PPT No',
    'PPT Exp',
    'On/Off',
    'Flight',
    'ETA',
    'From',
  ];
  const rows = [
    [
      'DEMO',
      'Upload One',
      'Master',
      'Demo nationality A',
      '01/01/1990',
      'X0000011',
      '01/01/2031',
      'On',
      'ZZ 417',
      '13:55',
      'Amsterdam',
    ],
    [
      'DEMO',
      'Upload Two',
      'Cook',
      'Demo nationality B',
      '02/02/1991',
      'X0000012',
      '01/01/2032',
      'Off',
      'ZZ 204',
      '17:10',
      'Amsterdam',
    ],
  ];
  const xlsx = writeXlsx({ name: 'Crew', rows: [headers, ...rows] });
  await page.getByTestId('crew-list-file').setInputFiles(payload('crew.xlsx', XLSX_MIME, xlsx));
  await expect(page.getByTestId('crew-list-check')).toBeVisible();
  await expect(page.getByTestId('crew-list-summary')).toContainText('crew.xlsx');
  await expect(page.getByTestId('crew-list-summary')).toContainText('2 crew');
  await expect(page.getByTestId('crew-list-summary')).toContainText('1 on-signer');
  await expect(page.getByTestId('crew-map-0')).toHaveValue('familyName');
  await expect(page.getByTestId('crew-map-1')).toHaveValue('forenames');
  await expect(page.getByTestId('crew-map-3')).toHaveValue('nationality');
  await expect(page.getByTestId('crew-map-5')).toHaveValue('passportNumber');
  await expect(page.getByTestId('crew-map-6')).toHaveValue('passportExpiry');
  await expect(page.getByTestId('crew-map-7')).toHaveValue('movement');
  await expect(page.getByTestId('crew-map-9')).toHaveValue('flightTime');
  await expect(page.getByTestId('crew-map-10')).toHaveValue('flightFrom');
  await expect(page.getByTestId('crew-list-unmapped')).toContainText('Flight date');
  await expect(page.getByTestId('crew-table')).toContainText('DEMO, Upload One');
  await expect(page.getByTestId('crew-table')).toContainText('••••0011');

  // Discard clears it without sending anything.
  await page.getByTestId('crew-list-discard').click();
  await expect(page.getByTestId('crew-list-upload')).toBeVisible();
  await expect(page.getByTestId('crew-lists')).toHaveCount(0);

  // A CSV in the template's own layout.
  const csv = [
    CREW_TEMPLATE_HEADERS.join(','),
    [
      'DEMO',
      'Upload Three',
      'Bosun',
      'Demo nationality A',
      '03/03/1992',
      'X0000013',
      '01/01/2033',
      'On',
      'ZZ 122',
      '22/08/2026',
      '09:40',
      'London Heathrow',
      'MV Caledonian Star',
      'Aberdeen',
    ].join(','),
  ].join('\r\n');
  await page
    .getByTestId('crew-list-file')
    .setInputFiles(payload('crew.csv', 'text/csv', new TextEncoder().encode(csv)));
  await expect(page.getByTestId('crew-list-check')).toBeVisible();
  await expect(page.getByTestId('crew-list-summary')).toContainText('crew.csv');
  await expect(page.getByTestId('crew-list-summary')).toContainText('1 crew');
  await expect(page.getByTestId('crew-list-summary')).toContainText('nothing needs attention');
  await page.getByTestId('crew-list-discard').click();

  // The old binary .xls is refused with the save-as message, and nothing else changes.
  await page
    .getByTestId('crew-list-file')
    .setInputFiles(
      payload('old-list.xls', 'application/vnd.ms-excel', new Uint8Array([0xd0, 0xcf, 0x11, 0xe0])),
    );
  const error = page.getByTestId('crew-list-error');
  await expect(error).toBeVisible();
  await expect(error).toContainText('Save As');
  await expect(error).toContainText('.xlsx or .csv');
  await expect(page.getByTestId('crew-list-check')).toHaveCount(0);
});

test('crew list: keyboard — the file input is reachable, Enter starts the demo, Escape leaves the dialog and returns focus', async ({
  page,
}) => {
  await page.goto('/app/agency/crew-change');
  await page.keyboard.press('Escape');

  // The visually hidden file input is in the tab order just before its buttons.
  await page.getByTestId('crew-list-choose').focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('crew-list-file')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('crew-list-choose')).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('crew-list-demo')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('crew-list-check')).toBeVisible();

  await submitFromCheck(page);
  const card = page.getByTestId('crew-list-CL-0001');
  await expect(card).toBeVisible();
  // Submit moves focus to the new card, so a keyboard user lands where the eye does.
  await expect(card).toBeFocused();

  // Enter on Delete opens the dialog, focus goes inside it; Escape closes it and focus comes back.
  const del = card.getByTestId('crew-list-delete');
  await del.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByTestId('crew-delete-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId('crew-delete-cancel')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(del).toBeFocused();
  await expect(card).toHaveAttribute('data-personal-data', 'present');

  // Every control the section draws is labelled.
  for (const step of ['upload', 'check', 'services', 'submit']) {
    if (step === 'check') await page.getByTestId('crew-list-demo').click();
    if (step === 'services') await page.getByTestId('crew-list-continue').click();
    if (step === 'submit') await page.getByTestId('crew-list-to-submit').click();
    const unlabelled = await page.evaluate(() => {
      const controls = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-testid="section-crew-list"] input, [data-testid="section-crew-list"] select, [data-testid="section-crew-list"] textarea',
        ),
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
    expect(unlabelled, step).toEqual([]);
  }
});

test('crew list: mobile — the tables scroll inside their own containers, the page does not', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/app/agency/crew-change');
  await page.keyboard.press('Escape');

  const noOverflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

  await expect(page.getByTestId('crew-list-upload')).toBeVisible();
  expect(await noOverflow()).toBe(true);

  await page.getByTestId('crew-list-demo').click();
  await expect(page.getByTestId('crew-list-check')).toBeVisible();
  expect(await noOverflow()).toBe(true);
  const tableScrolls = await page.getByTestId('crew-table').evaluate((table) => {
    const box = table.parentElement!;
    return getComputedStyle(box).overflowX === 'auto' && box.scrollWidth > box.clientWidth;
  });
  expect(tableScrolls).toBe(true);

  await page.getByTestId('crew-list-continue').click();
  await expect(page.getByTestId('crew-list-services')).toBeVisible();
  expect(await noOverflow()).toBe(true);
  const runsScroll = await page.getByTestId('taxi-runs').evaluate((table) => {
    const box = table.parentElement!;
    return getComputedStyle(box).overflowX === 'auto' && box.scrollWidth > box.clientWidth;
  });
  expect(runsScroll).toBe(true);

  await page.getByTestId('crew-list-to-submit').click();
  await expect(page.getByTestId('crew-list-submit-step')).toBeVisible();
  expect(await noOverflow()).toBe(true);
});
