import { expect, test, type Page } from '@playwright/test';

/**
 * "How much more you could have saved" (owner's FF06 proposal): under the
 * client's spend chart, one plain line on what the same spend would have
 * saved at the next tier up and at 7%. It follows the consolidation card's
 * pillar switches live, and at 7% it is not there at all.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('gac-connect:tourDismissed', 'true');
  });
});

async function openClientView(page: Page) {
  await page.goto('/app/dashboard');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Browne Energy' })).toBeVisible();
}

test('the spend card says what the same spend would have saved at a higher tier', async ({
  page,
}) => {
  await openClientView(page);
  const spend = page.getByTestId('client-spend');
  const line = page.getByTestId('client-spend-could-have-saved');

  // Seeded: Agency (2%) and Procurement, £171,000 over six months.
  await expect(page.getByTestId('client-spend-total')).toHaveText('£171,000');
  await expect(line).toHaveText(
    'Add Logistics and the same spend would have saved £6,840 at 4% — £3,420 more. Add Customs and it would have saved £11,970 at 7% — £8,550 more.',
  );

  // Hold Logistics: the next tier up is now 7%, so one step.
  await page.getByRole('switch', { name: 'Logistics' }).click();
  await expect(line).toHaveText(
    'Add Customs and the same spend would have saved £15,750 at 7% — £6,750 more.',
  );

  // Full Stack: nothing extra, and no celebration.
  await page.getByRole('switch', { name: 'Customs' }).click();
  await expect(page.getByTestId('dashboard-tier-pct')).toHaveText('7%');
  await expect(line).toHaveCount(0);
  await expect(spend).not.toContainText('would have saved');
  await expect(spend).not.toContainText('!');

  // Customs alone is 7% too (non-cumulative): still nothing to add.
  await page.getByRole('switch', { name: 'Agency' }).click();
  await page.getByRole('switch', { name: 'Logistics' }).click();
  await expect(line).toHaveCount(0);

  // Nothing held: Procurement alone, priced at 2% and 7%.
  await page.getByRole('switch', { name: 'Customs' }).click();
  await expect(line).toHaveText(
    'Add Agency and the same spend would have saved £500 at 2%. Add Customs and it would have saved £1,750 at 7%.',
  );

  // Client-facing: never a word of commission.
  await expect(spend).not.toContainText(/commission|mark-?up|\bband\b/i);
});

test('the deck says the same thing from the same tier', async ({ page }) => {
  await page.goto('/presenter.html#/dashboard');
  const line = page.getByTestId('client-spend-could-have-saved');
  await expect(line).toHaveText(
    'Add Logistics and the same spend would have saved £6,840 at 4% — £3,420 more. Add Customs and it would have saved £11,970 at 7% — £8,550 more.',
  );
  await expect(line).not.toContainText(/commission/i);
});
