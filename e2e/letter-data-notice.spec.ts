import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * The data-protection notice on the LOI and repatriation templates (19 Oct,
 * owner's ask), and the two promises it makes that the platform keeps: a
 * hand-filed letter's details can be deleted at once from its card, and are
 * deleted automatically thirty days after the letter is returned. Both
 * surfaces carry the same notice and the same control.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('gac-connect:tourDismissed', 'true');
    window.localStorage.setItem('gac-connect:tour-dismissed', 'true');
  });
});

async function noticeAndDelete(page: Page) {
  const notice = page.getByTestId('loi-data-notice');
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('How passport details are handled');
  await expect(notice).toContainText('UK GDPR');
  await expect(notice).toContainText('thirty days after the letter is returned');
  await expect(notice).not.toContainText('@');

  await page.getByTestId('loi-submit').click();
  const card = page.getByTestId('crew-requests').locator('[data-kind="loi"]').first();
  await expect(card.getByTestId('crew-name')).toHaveText('DEMO, Crew Member');
  await expect(card).toContainText('Deleted automatically 30 days after the letter is returned.');

  // Returned: the card names the day the details go.
  await card.getByRole('button', { name: 'Simulate: GAC checks and endorses' }).click();
  await card.getByRole('button', { name: 'Simulate: GAC returns the letter' }).click();
  await expect(card).toContainText(
    /Deleted automatically on \d{1,2} [A-Z][a-z]{2} if you do not\./,
  );

  // Delete now: two steps, then the name and passport are gone from screen and storage.
  await card.getByTestId('crew-letter-delete').click();
  await expect(card).toContainText('This cannot be undone.');
  await card.getByTestId('crew-letter-delete-confirm').click();
  await expect(card.getByTestId('crew-name')).toHaveText('Personal data deleted');
  await expect(card).toContainText('Personal details deleted · MV Choice · Aberdeen');
  await expect(card.getByTestId('crew-letter-delete')).toHaveCount(0);
  const stored = await page.evaluate(() => JSON.stringify(window.localStorage));
  expect(stored).not.toContain('X0000000');
}

test('site: both templates carry the notice, and a letter’s details can be deleted', async ({
  page,
}) => {
  await page.goto('/app/agency/crew-change?section=repat');
  await expect(page.getByTestId('repat-data-notice')).toContainText('UK GDPR');
  await page.goto('/app/agency/crew-change?section=loi');
  await noticeAndDelete(page);
});

test('deck: the same notice and the same delete control', async ({ page }) => {
  await page.goto('/presenter.html#/crew-change/repat');
  await expect(page.getByTestId('repat-data-notice')).toContainText('UK GDPR');
  await page.goto('/presenter.html#/crew-change/loi');
  await noticeAndDelete(page);
});

test('the crew list notice says UK GDPR too, and still leads with illustrative', async ({
  page,
}) => {
  await page.goto('/app/agency/crew-change');
  const intro = page.getByText(/^Illustrative notice for this proof of concept\. Crew data/);
  await expect(intro).toBeVisible();
  await expect(intro).toContainText('UK GDPR');
});
