import { expect, test, type Page } from '@playwright/test';

/**
 * Supplier analytics (live dashboards spec §5): Silver City Welding's example
 * dashboard. One period switch (?period=30|90) drives every figure; every
 * chart is a figure with a "Show the numbers" table; gold stays reserved; the
 * time series answers the arrow keys; the three entry points still land here.
 */

/** Gold and its tints — reserved for in-house identity, Full Stack, BETA and the loader. */
const GOLD = ['#c9a227', '#ffc72c', '#7a6210', '#9a7b14', '#fbf6e3', '#e5d89a', '#b89018'];

async function open(page: Page, path: string) {
  await page.addInitScript(() => {
    window.localStorage.setItem('gac-connect:tourDismissed', 'true');
  });
  await page.goto(path);
  await page.keyboard.press('Escape'); // skip the loader if it shows
  await expect(page.getByTestId('loader')).toHaveCount(0);
}

/** Every element on the analytics screen whose paint is a gold. */
async function goldPaint(page: Page): Promise<string[]> {
  return page.evaluate((gold) => {
    const root = document.querySelector('[data-testid="analytics-screen"]');
    if (!root) return ['analytics-screen missing'];
    const hex = (c: string) => {
      const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (!m || m[4] === '0') return null;
      return `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
    };
    const props = [
      'color',
      'backgroundColor',
      'borderTopColor',
      'borderRightColor',
      'borderBottomColor',
      'borderLeftColor',
      'outlineColor',
      'fill',
      'stroke',
    ] as const;
    const hits: string[] = [];
    for (const el of [root, ...Array.from(root.querySelectorAll('*'))]) {
      const cs = getComputedStyle(el);
      for (const p of props) {
        const h = hex(cs[p]);
        if (h && gold.includes(h)) hits.push(`${el.tagName.toLowerCase()} ${p} ${h}`);
      }
    }
    return hits;
  }, GOLD);
}

test.describe('supplier analytics', () => {
  test('arrives on 30 days with the seeded figures, and the switch drives the page', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });

    await open(page, '/app/analytics');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Silver City Welding — performance' }),
    ).toBeVisible();
    await expect(page.getByText('Available on Professional and Premium')).toBeVisible();

    const kpis = page.getByTestId('analytics-kpis');
    const value = (id: string) => page.getByTestId(`kpi-${id}`).locator('[data-kpi-value]');
    const expectKpis = async (views: string, requests: string, win: string, response: string) => {
      await expect(value('views')).toHaveText(views);
      await expect(value('requests')).toHaveText(requests);
      await expect(value('win')).toHaveText(win);
      await expect(value('response')).toHaveText(response);
    };
    await expectKpis('412', '38', '34%', '2.1 hrs');
    await expect(kpis).toContainText('+18% on the previous 30 days');
    await expect(kpis).toContainText('12 won of 35 quoted');

    const period = page.getByRole('group', { name: 'Period' });
    const d30 = period.getByRole('button', { name: '30 days' });
    const d90 = period.getByRole('button', { name: '90 days' });
    await expect(d30).toHaveAttribute('aria-pressed', 'true');
    await expect(d90).toHaveAttribute('aria-pressed', 'false');

    await d90.click();
    await expect(page).toHaveURL(/\/app\/analytics\?period=90$/);
    await expect(d90).toHaveAttribute('aria-pressed', 'true');
    await expectKpis('1,079', '101', '32%', '2.4 hrs');
    await expect(kpis).toContainText('+13% on the previous 90 days');
    await expect(page.getByText('Quote requests per week', { exact: true })).toBeVisible();

    // The period is in the address, so a reload (or a shared link) keeps it.
    await page.reload();
    await expect(value('views')).toHaveText('1,079');
    await expect(page.getByRole('button', { name: '90 days' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Back to 30: the default drops out of the address.
    await page.getByRole('button', { name: '30 days' }).click();
    await expect(page).toHaveURL(/\/app\/analytics$/);
    await expectKpis('412', '38', '34%', '2.1 hrs');

    await expect(page.getByText('Figures are illustrative.', { exact: false })).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('an unknown period falls back to 30 days and tidies the address', async ({ page }) => {
    await open(page, '/app/analytics?period=7');
    await expect(page).toHaveURL(/\/app\/analytics$/);
    await expect(page.getByTestId('kpi-views').locator('[data-kpi-value]')).toHaveText('412');
  });

  test('every chart is a figure with its numbers one click away', async ({ page }) => {
    await open(page, '/app/analytics');
    const figures = page.getByTestId('analytics-screen').locator('figure');
    await expect(figures).toHaveCount(7);
    for (let i = 0; i < 7; i++) {
      const fig = figures.nth(i);
      await fig.getByText('Show the numbers').click();
      await expect(fig.locator('table')).toBeVisible();
    }

    const ratings = page.getByTestId('analytics-ratings');
    await expect(ratings).toContainText('4.4 ★');
    await expect(ratings).toContainText('72 ratings');

    const funnel = page.getByTestId('analytics-funnel');
    await expect(funnel).toContainText('13.9% opened your profile');
    await expect(funnel).toContainText('34% won');

    const bench = page.getByTestId('analytics-benchmark');
    await expect(bench).toContainText('7 points above the category average');
    await expect(bench).toContainText('3.3 hrs faster than the category average');

    const sources = page.getByTestId('analytics-sources');
    await expect(sources).toContainText('▲ Promoted');
    await expect(sources).toContainText('168 · 41%');

    const heat = page.getByTestId('analytics-heatmap');
    await expect(heat).toContainText('Tuesday 08:00–10:00');
  });

  test('no gold anywhere on the screen, in either period', async ({ page }) => {
    const views = page.getByTestId('kpi-views').locator('[data-kpi-value]');
    await open(page, '/app/analytics');
    await expect(views).toHaveText('412');
    expect(await goldPaint(page)).toEqual([]);
    await page.getByRole('button', { name: '90 days' }).click();
    await expect(views).toHaveText('1,079');
    expect(await goldPaint(page)).toEqual([]);
  });

  test('the time series answers the keyboard', async ({ page }) => {
    await open(page, '/app/analytics');
    const plot = page.getByRole('group', { name: /^Profile views and quote requests/ });
    const tip = page.getByTestId('analytics-trend').locator('[data-chart-tooltip]');

    await plot.focus();
    await expect(tip).toBeVisible();
    await expect(tip).toContainText('Wed 23 Sep');
    await page.keyboard.press('ArrowLeft');
    await expect(tip).toContainText('Tue 22 Sep');
    await page.keyboard.press('ArrowLeft');
    await expect(tip).toContainText('Mon 21 Sep');
    await page.keyboard.press('ArrowRight');
    await expect(tip).toContainText('Tue 22 Sep');
    await page.keyboard.press('Home');
    await expect(tip).toContainText('Tue 25 Aug');
    await page.keyboard.press('Escape');
    await expect(tip).toHaveCount(0);
  });

  test('holds together at 375px: no sideways scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await open(page, '/app/analytics');
    await expect(page.getByTestId('analytics-kpis')).toBeVisible();
    for (const p of ['30', '90']) {
      await page.getByRole('button', { name: `${p} days` }).click();
      const overflow = await page.evaluate(() => {
        const scroller = document.getElementById('app-scroll')!;
        return {
          doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          app: scroller.scrollWidth - scroller.clientWidth,
        };
      });
      expect(overflow).toEqual({ doc: 0, app: 0 });
    }
  });

  test('the entry points still lead here', async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1, name: 'Silver City Welding — performance' });

    await open(page, '/for-suppliers');
    await page.getByRole('link', { name: 'See the example analytics dashboard' }).click();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/app\/analytics$/);
    await expect(h1).toBeVisible();

    await page.goto('/app/marketplace/silver-city-welding');
    await page.getByRole('link', { name: 'See the analytics view' }).click();
    await expect(page).toHaveURL(/\/app\/analytics$/);
    await expect(h1).toBeVisible();

    await page.goto('/app/dashboard');
    await page.getByRole('button', { name: 'Supplier view' }).click();
    await page.getByRole('link', { name: 'Open analytics' }).click();
    await expect(page).toHaveURL(/\/app\/analytics$/);
    await expect(h1).toBeVisible();
  });
});
