import { expect, test, type Page } from '@playwright/test';

/**
 * The SVS desk (live dashboards, 23 Sep; spec §4.5): the register stays the
 * front of the screen, and two working queues sit beside it — new suppliers
 * moving through onboarding, and certificate evidence sent in by suppliers.
 * The alerts banner (tour stop 11) stays under the header on every tab, and
 * nothing the SVS team does here reaches the client's bell.
 */

// Playwright runs under Node, where Buffer is a global; the repo carries no
// @types/node, so the one method used here is declared locally.
declare const Buffer: { from(text: string): Uint8Array };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('gac-connect:tourDismissed', 'true');
  });
});

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.keyboard.press('Escape'); // skip the loader if it shows
}

const sections = (page: Page) => page.getByRole('group', { name: 'SVS sections' });
const tab = (page: Page, name: RegExp) => sections(page).getByRole('button', { name });
/** A tile's figure alone: its note has digits of its own ("the 5-day target", "15:40"). */
const kpi = (page: Page, id: string) =>
  page.getByTestId(`svs-kpi-${id}`).locator('[data-kpi-value]');
const bellLabel = (page: Page) =>
  page.getByRole('button', { name: /^Notifications/ }).getAttribute('aria-label');

test('the register is the default, and the tabs switch and survive a reload', async ({ page }) => {
  await open(page, '/app/svs');

  // Arrival: the register, exactly as before — banner, chips, table.
  await expect(page.getByText('3 alerts:')).toBeVisible();
  await expect(tab(page, /^Register/)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Blocked', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Peterhead Diving Services' })).toBeVisible();

  // Four small tiles, live from the store and the watch list.
  await expect(kpi(page, 'onboarding')).toHaveText('4');
  await expect(kpi(page, 'evidence')).toHaveText('2');
  await expect(kpi(page, 'alerts')).toHaveText('3');
  await expect(kpi(page, 'verify')).toHaveText('3.5 days');
  await expect(tab(page, /^Onboarding 4$/)).toBeVisible();
  await expect(tab(page, /^Evidence queue 2$/)).toBeVisible();

  // Onboarding: the board, with every seeded applicant in its column.
  await tab(page, /^Onboarding/).click();
  await expect(page).toHaveURL(/\/app\/svs\?section=onboarding$/);
  await expect(page.getByText('3 alerts:')).toBeVisible();
  await expect(page.getByTestId('svs-column-Applied')).toContainText('Torry Point Rope Access');
  await expect(page.getByTestId('svs-column-Documents')).toContainText(
    'Girdle Ness Marine Electrical',
  );
  await expect(page.getByTestId('svs-column-Checks')).toContainText('Balnagask Hydraulics');
  await expect(page.getByTestId('svs-column-Decision')).toContainText('Cove Bay Scaffolding');
  await expect(page.getByTestId('svs-column-Checks')).toContainText('6 of 8 checks');
  await expect(page.getByTestId('svs-column-Decision')).toContainText('Overdue · day 6 of 5');
  await expect(page.getByTestId('svs-column-Documents')).toContainText('Awaiting applicant');
  // The register's controls are not on this tab, so nothing clashes with them.
  await expect(page.getByRole('button', { name: 'Blocked', exact: true })).toHaveCount(0);

  await page.reload();
  await expect(tab(page, /^Onboarding/)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('svs-column-Decision')).toContainText('Cove Bay Scaffolding');

  // Evidence queue: two submissions, the newest open one selected.
  await tab(page, /^Evidence queue/).click();
  await expect(page).toHaveURL(/\/app\/svs\?section=evidence$/);
  await expect(page.getByText('3 alerts:')).toBeVisible();
  const list = page.getByTestId('evidence-list');
  await expect(list).toContainText('Caledonia Lifting Ltd');
  await expect(list).toContainText('Aberdeen Offshore Medical');
  const detail = page.getByTestId('evidence-detail');
  await expect(detail).toContainText('LOLER thorough examination — 60t crawler crane');
  await expect(detail).toContainText('LOLER-60t-crawler.pdf · 1.2 MB');
  await expect(page.getByTestId('document-preview')).toContainText('SPECIMEN — illustrative');

  await page.reload();
  await expect(tab(page, /^Evidence queue/)).toHaveAttribute('aria-pressed', 'true');

  // Back to the register: the default keeps a clean address.
  await tab(page, /^Register/).click();
  await expect(page).toHaveURL(/\/app\/svs$/);
  await expect(page.getByRole('button', { name: 'Peterhead Diving Services' })).toBeVisible();

  // An unknown section lands on the register and tidies the address.
  await open(page, '/app/svs?section=nonsense');
  await expect(page).toHaveURL(/\/app\/svs$/);
  await expect(tab(page, /^Register/)).toHaveAttribute('aria-pressed', 'true');
});

test('approving Cove Bay Scaffolding moves it to Decided and Internal follows', async ({
  page,
}) => {
  await open(page, '/app/svs?section=onboarding');
  const bell = await bellLabel(page);

  await page.getByRole('button', { name: 'Cove Bay Scaffolding' }).click();
  const panel = page.getByRole('dialog', { name: 'Cove Bay Scaffolding' });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('8 of 8 checks');
  const approve = panel.getByRole('button', { name: 'Approve and list' });
  await expect(approve).toBeEnabled();
  await approve.click();

  await expect(
    page.getByText(
      'Approved: Cove Bay Scaffolding. The listing goes live at the next marketplace publish (simulated).',
    ),
  ).toBeVisible();
  await expect(panel).toHaveCount(0);
  const decided = page.getByTestId('svs-decided');
  await expect(decided).toContainText('Cove Bay Scaffolding');
  await expect(decided).toContainText(
    'Approved — listing goes live at the next marketplace publish (simulated)',
  );
  await expect(page.getByTestId('svs-column-Decision')).not.toContainText('Cove Bay Scaffolding');
  await expect(kpi(page, 'onboarding')).toHaveText('3');
  await expect(tab(page, /^Onboarding 3$/)).toBeVisible();

  // The agent desk's KPI reads the same store: one more verified, one fewer onboarding.
  await open(page, '/app/internal');
  const kpis = page.locator('[data-tour="kpis"]');
  await expect(kpis).toContainText('53');
  await expect(kpis).toContainText('3 onboarding');

  // The SVS team's work never reaches the client's bell.
  expect(await bellLabel(page)).toBe(bell);
});

test('approval waits on the checks, and asking for more needs a note', async ({ page }) => {
  await open(page, '/app/svs?section=onboarding');

  await page.getByRole('button', { name: 'Balnagask Hydraulics' }).click();
  const panel = page.getByRole('dialog', { name: 'Balnagask Hydraulics' });
  const approve = panel.getByRole('button', { name: 'Approve and list' });
  const blocker = panel.getByTestId('approve-blocker');
  await expect(approve).toBeDisabled();
  await expect(blocker).toContainText('2 checks still to complete');
  await expect(blocker).toContainText('Sanctions and adverse media screen');

  // A request for more information goes nowhere without a note.
  await panel.getByRole('button', { name: 'Request more information' }).click();
  await panel.getByRole('button', { name: 'Send request' }).click();
  await expect(panel.getByRole('alert')).toContainText('Still needed: a note for the applicant');
  await panel
    .getByRole('textbox', { name: 'Note to the applicant' })
    .fill('Please send the second trade reference.');
  await panel.getByRole('button', { name: 'Send request' }).click();
  await expect(
    page.getByText('Sent to Balnagask Hydraulics: more information requested (simulated).'),
  ).toBeVisible();
  await expect(panel).toContainText('Please send the second trade reference.');
  await expect(panel).toContainText('Awaiting applicant');
  await expect(blocker).toContainText('Waiting on the applicant');

  // The applicant answers (simulated); the checks can then be completed.
  await panel.getByRole('button', { name: 'Mark as answered' }).click();
  await expect(blocker).toContainText('2 checks still to complete');
  const sanctions = panel.getByRole('group', { name: 'Sanctions and adverse media screen' });
  await sanctions.getByRole('button', { name: 'Pass' }).click();
  await expect(sanctions.getByRole('button', { name: 'Pass' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await panel
    .getByRole('group', { name: 'Two trade references' })
    .getByRole('button', { name: 'Pass' })
    .click();
  await expect(panel).toContainText('8 of 8 checks');
  await expect(blocker).toContainText('Move the application to Decision first.');

  await panel.getByRole('button', { name: 'Move to Decision' }).click();
  await expect(approve).toBeEnabled();
  await expect(blocker).toHaveCount(0);
  await expect(panel.getByRole('button', { name: /^Move to/ })).toHaveCount(0);

  // The audit trail names roles, never people, newest first.
  await expect(panel.getByTestId('audit-trail').locator('li').first()).toContainText(
    'Moved to Decision',
  );

  // Escape closes the panel; the card has moved column, and focus found it there.
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(page.getByTestId('svs-column-Decision')).toContainText('Balnagask Hydraulics');
  await expect(
    page.getByTestId('svs-column-Decision').getByRole('button', { name: 'Balnagask Hydraulics' }),
  ).toBeFocused();
});

test('closing the panel after a move returns focus to the card in its new column', async ({
  page,
}) => {
  await open(page, '/app/svs?section=onboarding');
  const card = (column: string) =>
    page
      .getByTestId(`svs-column-${column}`)
      .getByRole('button', { name: 'Torry Point Rope Access' });
  const panel = page.getByRole('dialog', { name: 'Torry Point Rope Access' });

  // Keyboard only: open, move a stage, then Escape.
  await card('Applied').focus();
  await page.keyboard.press('Enter');
  await panel.getByRole('button', { name: 'Move to Documents' }).focus();
  await page.keyboard.press('Enter');
  await expect(panel.getByRole('button', { name: 'Move to Checks' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(card('Documents')).toBeFocused();

  // The close button does the same.
  await page.keyboard.press('Enter');
  await panel.getByRole('button', { name: 'Move to Checks' }).click();
  await panel.getByRole('button', { name: 'Close applicant panel' }).click();
  await expect(card('Checks')).toBeFocused();

  // Without a move, the panel hands focus straight back.
  await page.keyboard.press('Enter');
  await expect(panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(card('Checks')).toBeFocused();
});

test('declining needs a reason and lands in Decided', async ({ page }) => {
  await open(page, '/app/svs?section=onboarding');

  await page.getByRole('button', { name: 'Torry Point Rope Access' }).click();
  const panel = page.getByRole('dialog', { name: 'Torry Point Rope Access' });
  await panel.getByRole('button', { name: 'Decline', exact: true }).click();
  await panel.getByRole('button', { name: 'Decline application' }).click();
  await expect(panel.getByRole('alert')).toContainText('Still needed: a reason');
  await panel
    .getByRole('textbox', { name: 'Reason for declining' })
    .fill('Rope access certificates could not be verified.');
  await panel.getByRole('button', { name: 'Decline application' }).click();

  await expect(page.getByText('Declined: Torry Point Rope Access.')).toBeVisible();
  const decided = page.getByTestId('svs-decided');
  await expect(decided).toContainText('Torry Point Rope Access');
  await expect(decided).toContainText('Rope access certificates could not be verified.');
  await expect(kpi(page, 'onboarding')).toHaveText('3');
});

test('inviting a supplier adds it under Applied', async ({ page }) => {
  await open(page, '/app/svs');

  await page.getByRole('button', { name: 'Invite a supplier' }).click();
  const dialog = page.getByRole('dialog', { name: 'Invite a supplier' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Send invitation' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Still needed: company name');

  await dialog.getByRole('textbox', { name: 'Company name' }).fill('Example Test Coatings');
  await dialog.getByRole('combobox', { name: 'Category' }).selectOption('Scaffolding');
  await dialog.getByRole('combobox', { name: 'Base port' }).selectOption('Peterhead');
  await dialog.getByRole('button', { name: 'Send invitation' }).click();

  await expect(
    page.getByText(
      'Invitation sent to Example Test Coatings (simulated). They appear under Applied.',
    ),
  ).toBeVisible();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/section=onboarding/);
  const applied = page.getByTestId('svs-column-Applied');
  await expect(applied).toContainText('Example Test Coatings');
  await expect(applied).toContainText('Scaffolding · Peterhead');
  await expect(kpi(page, 'onboarding')).toHaveText('5');
  await expect(tab(page, /^Onboarding 5$/)).toBeVisible();
  await expect(page.getByText('3 alerts:')).toBeVisible();
});

test('the evidence queue approves, sends back with a note, and rejects with a reason', async ({
  page,
}) => {
  await open(page, '/app/svs?section=evidence');
  const bell = await bellLabel(page);
  const detail = page.getByTestId('evidence-detail');

  // Sending back needs a note. Notes are typed in a dialog, so the tour's
  // arrow keys never fire while someone is writing one.
  await expect(detail).toContainText('Caledonia Lifting Ltd');
  await detail.getByRole('button', { name: 'Request information' }).click();
  const ask = page.getByRole('dialog', { name: 'Request information' });
  await ask.getByRole('button', { name: 'Send back' }).click();
  await expect(ask.getByRole('alert')).toContainText('Still needed: a note for the supplier');
  await ask
    .getByRole('textbox', { name: 'Note to the supplier' })
    .fill('The report does not show the safe working load.');
  await ask.getByRole('button', { name: 'Send back' }).click();
  await expect(ask).toHaveCount(0);
  await expect(page.getByText('Sent back to Caledonia Lifting Ltd with your note.')).toBeVisible();
  await expect(detail).toContainText('More information needed');
  await expect(detail).toContainText('The report does not show the safe working load.');
  await expect(kpi(page, 'evidence')).toHaveText('1');
  await expect(tab(page, /^Evidence queue 1$/)).toBeVisible();

  // Rejecting needs a reason.
  await page
    .getByTestId('evidence-list')
    .getByRole('button', { name: /Aberdeen Offshore Medical/ })
    .click();
  await expect(detail).toContainText('ISO 45001 occupational health and safety');
  await detail.getByRole('button', { name: 'Reject', exact: true }).click();
  const reject = page.getByRole('dialog', { name: 'Reject certificate' });
  await reject.getByRole('button', { name: 'Reject certificate' }).click();
  await expect(reject.getByRole('alert')).toContainText('Still needed: a reason');
  // Escape backs out with nothing changed.
  await page.keyboard.press('Escape');
  await expect(reject).toHaveCount(0);
  await expect(detail).toContainText('Awaiting SVS review');
  await detail.getByRole('button', { name: 'Reject', exact: true }).click();
  await reject
    .getByRole('textbox', { name: 'Reason for rejecting' })
    .fill('The certificate scope does not cover offshore work.');
  await reject.getByRole('button', { name: 'Reject certificate' }).click();
  await expect(
    page.getByText(
      'Rejected: ISO 45001 occupational health and safety for Aberdeen Offshore Medical.',
    ),
  ).toBeVisible();
  await expect(kpi(page, 'evidence')).toHaveText('0');
  await expect(tab(page, /^Evidence queue 0$/)).toBeVisible();

  // Nothing moved the compliance watch or the bell.
  await expect(page.getByText('3 alerts:')).toBeVisible();
  expect(await bellLabel(page)).toBe(bell);
});

test('the note dialogs hand focus back to the button that opened them', async ({ page }) => {
  await open(page, '/app/svs?section=evidence');
  const detail = page.getByTestId('evidence-detail');

  for (const [button, dialog] of [
    ['Request information', 'Request information'],
    ['Reject', 'Reject certificate'],
  ] as const) {
    const opener = detail.getByRole('button', { name: button, exact: true });
    const note = page.getByRole('dialog', { name: dialog });

    await opener.focus();
    await page.keyboard.press('Enter');
    await expect(note.getByRole('textbox')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(note).toHaveCount(0);
    await expect(opener).toBeFocused();

    await page.keyboard.press('Enter');
    await note.getByRole('button', { name: 'Cancel' }).click();
    await expect(note).toHaveCount(0);
    await expect(opener).toBeFocused();
  }
  await expect(detail).toContainText('Awaiting SVS review');
});

// Depends on T6's certificate modal on the supplier dashboard (built in
// parallel). The upload goes through the real UI — never the store directly.
test('a certificate sent from the supplier dashboard is verified in the evidence queue', async ({
  page,
}) => {
  await open(page, '/app/dashboard');
  const bell = await bellLabel(page);
  await page.getByRole('button', { name: 'Supplier view' }).click();

  await page.getByRole('button', { name: 'Add a certificate' }).click();
  const modal = page.getByRole('dialog', { name: 'Add a certificate' });
  await expect(modal.getByRole('heading', { name: 'Add a certificate' })).toBeVisible();
  await modal.getByRole('button', { name: 'Fill with an example' }).click();
  await modal.locator('input[type="file"]').setInputFiles({
    name: 'ISO9001-certificate.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 illustrative'),
  });
  await modal.getByRole('button', { name: 'Send to the SVS team' }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByText('Awaiting SVS review').first()).toBeVisible();

  // The SVS team sees it at the top of the queue, and verifies it.
  await open(page, '/app/svs?section=evidence');
  await expect(kpi(page, 'evidence')).toHaveText('3');
  const first = page.getByTestId('evidence-list').getByRole('button').first();
  await expect(first).toContainText('Silver City Welding');
  await expect(first).toContainText('Awaiting SVS review');
  await first.click();
  const detail = page.getByTestId('evidence-detail');
  await expect(detail).toContainText('ISO 9001 quality management');
  await detail.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(
    page.getByText('Verified: ISO 9001 quality management for Silver City Welding.'),
  ).toBeVisible();

  // Back on the supplier dashboard it reads as verified…
  await open(page, '/app/dashboard');
  await expect(
    page
      .getByTestId('supplier-certificates')
      .getByRole('listitem')
      .filter({ hasText: 'ISO 9001 quality management' }),
  ).toContainText('Verified by the SVS team');

  // …and the register row carries the new certificate.
  await open(page, '/app/svs');
  await expect(page.getByRole('row', { name: /Silver City Welding/ })).toContainText(
    'ISO 9001 quality management',
  );
  await expect(page.getByText('3 alerts:')).toBeVisible();
  expect(await bellLabel(page)).toBe(bell);
});

test('every tab holds at 375px without page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const section of ['', '?section=onboarding', '?section=evidence']) {
    await open(page, `/app/svs${section}`);
    await expect(page.getByText('3 alerts:')).toBeVisible();
    const overflow = await page.evaluate(() => {
      const scroller = document.getElementById('app-scroll') ?? document.documentElement;
      return scroller.scrollWidth - scroller.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(0);
  }

  // Pass, Fail and N/A are 44px touch targets on a phone.
  await open(page, '/app/svs?section=onboarding');
  await page.getByRole('button', { name: 'Girdle Ness Marine Electrical' }).click();
  const checks = page.getByRole('dialog').getByRole('group').getByRole('button');
  await expect(checks).toHaveCount(24);
  const heights = await checks.evaluateAll((els) =>
    els.map((el) => el.getBoundingClientRect().height),
  );
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);
});

test('the board shows all four columns without scrolling sideways from 640px', async ({ page }) => {
  const board = page.getByTestId('svs-board');
  for (const width of [640, 1024, 1180, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await open(page, '/app/svs?section=onboarding');
    await expect(page.getByTestId('svs-column-Decision')).toContainText('Cove Bay Scaffolding');
    const fit = await board.evaluate((el) => {
      const right = el.getBoundingClientRect().right;
      const columns = Array.from(el.querySelectorAll('[data-testid^="svs-column-"]'));
      return {
        sideways: el.scrollWidth - el.clientWidth,
        outside: columns.filter((c) => c.getBoundingClientRect().right > right + 0.5).length,
        rows: new Set(columns.map((c) => Math.round(c.getBoundingClientRect().top))).size,
      };
    });
    // Two by two until all four fit across (1280px with the sidebar out).
    expect(fit).toEqual({ sideways: 0, outside: 0, rows: width >= 1280 ? 1 : 2 });
  }
});
