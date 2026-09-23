import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * The client view of the dashboard (live dashboards, 23 Sep; spec §2): what
 * Browne Energy sees when it opens the platform. The consolidation card still
 * leads; under it the five things a client starts most often, every port call
 * milestone by milestone, six months of GAC spend that follows the lines held
 * in the tier card, and what has moved since yesterday.
 *
 * Commission is a supplier mechanism, so it never reaches this view — not in
 * a chart table, a tooltip or an accessible name.
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

/** WCAG contrast of an element's text on its own background, as rendered. */
async function textContrast(locator: Locator): Promise<number> {
  return locator.evaluate((el) => {
    const rgb = (s: string) => (s.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
    const lum = (c: number[]) => {
      const [r, g, b] = c.map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const style = getComputedStyle(el);
    const [hi, lo] = [lum(rgb(style.color)), lum(rgb(style.backgroundColor))].sort((a, b) => b - a);
    return (hi! + 0.05) / (lo! + 0.05);
  });
}

test('quick actions start the five jobs a client starts most', async ({ page }) => {
  await openClientView(page);
  const actions = page.getByTestId('client-quick-actions');
  await expect(actions.getByRole('heading', { name: 'Start something' })).toBeVisible();
  await expect(actions.getByRole('link')).toHaveCount(5);

  const targets: [string, RegExp][] = [
    ['Request a quote', /\/app\/marketplace$/],
    ['Book a movement', /\/app\/logistics$/],
    ['Start a crew change', /\/app\/agency\/crew-change$/],
    ['Raise a customs entry', /\/app\/customs$/],
    ['Send a Compass list', /\/app\/procurement$/],
  ];
  for (const [label, url] of targets) {
    await actions.getByRole('link', { name: label }).click();
    await expect(page).toHaveURL(url);
    await page.goBack();
    await expect(page.getByTestId('client-quick-actions')).toBeVisible();
  }
});

test('quick actions share the card evenly at every desktop width', async ({ page }) => {
  await openClientView(page);
  const actions = page.getByTestId('client-quick-actions');
  const layout = () =>
    actions.locator('ul').evaluate((ul) => {
      const items = [...ul.children].map((li) => li.getBoundingClientRect());
      return {
        list: ul.getBoundingClientRect().width,
        rows: new Set(items.map((r) => Math.round(r.top))).size,
        widest: Math.max(...items.map((r) => r.width)),
      };
    });

  // Where five fit, they are one row.
  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect((await layout()).rows, `at ${width}px`).toBe(1);
  }

  // Where they do not, no button is left stretched across the card on its own.
  for (const width of [1240, 1150, 1024, 900]) {
    await page.setViewportSize({ width, height: 900 });
    const { list, widest } = await layout();
    expect(widest, `at ${width}px`).toBeLessThanOrEqual(list / 2);
  }
});

test('every port call shows where it stands, milestone by milestone', async ({ page }) => {
  await openClientView(page);
  const calls = page.getByTestId('client-port-calls');
  await expect(calls.getByRole('heading', { name: 'Your port calls' })).toBeVisible();

  const expected: [string, string, string, number][] = [
    ['choice', 'MV Choice', 'Berth confirmed', 3],
    ['boreal', 'MV Boreal', 'Pilot booked', 2],
    ['granite-coast', 'MV Granite Coast', 'Alongside', 4],
  ];
  for (const [id, name, stage, step] of expected) {
    const row = page.getByTestId(`port-call-${id}`);
    await expect(row).toContainText(name);
    await expect(row).toHaveAttribute('data-stage', stage);
    const current = row.locator('[aria-current="step"]');
    await expect(current).toBeVisible();
    await expect(current).toContainText(stage);
    await expect(row.locator('[data-step-state="done"]')).toHaveCount(step - 1);
  }

  const choice = page.getByTestId('port-call-choice');
  await expect(choice).toContainText('ETA Fri 08:00 · in 24 hrs');
  await expect(choice).toContainText('Regent Quay, Aberdeen');

  // The status pill became a chip that leads somewhere, tone kept.
  const certs = page
    .getByTestId('port-call-boreal')
    .getByRole('link', { name: /2 certs expiring on booked supplier/ });
  await expect(certs).toHaveAttribute('data-tone', 'warn');
  // Small bold warn text holds 4.5:1 at rest and under the pointer.
  expect(await textContrast(certs)).toBeGreaterThanOrEqual(4.5);
  await certs.hover();
  await expect
    .poll(() => certs.evaluate((el) => getComputedStyle(el).backgroundColor))
    .not.toBe('rgb(251, 240, 225)');
  expect(await textContrast(certs)).toBeGreaterThanOrEqual(4.5);
  await certs.click();
  await expect(page).toHaveURL(/\/app\/svs$/);
});

test('each "Latest from GAC" row is one tap target, timestamp and tile included', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openClientView(page);
  const row = page.getByTestId('client-activity').getByRole('listitem').first();
  const link = row.getByRole('link');
  const to = await link.getAttribute('href');
  expect(to).toBeTruthy();
  expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(44);

  // The timestamp line and the icon tile, well away from the link's own text,
  // both land on the link (polled: the loader may still be fading out).
  await row.scrollIntoViewIfNeeded();
  const stamp = (await row.locator('p').last().boundingBox())!;
  const tile = (await row.locator('span[aria-hidden="true"]').last().boundingBox())!;
  const points: [number, number][] = [
    [stamp.x + stamp.width - 4, stamp.y + stamp.height / 2],
    [tile.x + tile.width / 2, tile.y + tile.height / 2],
  ];
  for (const [x, y] of points) {
    await expect
      .poll(() =>
        page.evaluate(
          ([px, py]) => document.elementFromPoint(px!, py!)?.closest('a')?.getAttribute('href'),
          [x, y],
        ),
      )
      .toBe(to);
  }
  await page.mouse.click(points[0]![0], points[0]![1]);
  await expect(page).toHaveURL(new RegExp(`${to!.replace(/[?]/g, '\\?')}$`));
});

test('the spend chart keeps the same gap as every other card', async ({ page }) => {
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await openClientView(page);
    const gap = await page.getByTestId('client-spend').evaluate((fig) => {
      const next = fig.nextElementSibling!;
      return next.getBoundingClientRect().top - fig.getBoundingClientRect().bottom;
    });
    expect(gap, `at ${width}px`).toBe(20);
  }
});

test('on a phone a port call reads as a step count with a thin progress bar', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openClientView(page);
  const choice = page.getByTestId('port-call-choice');
  await expect(choice.getByText('Step 3 of 5 · Berth confirmed')).toBeVisible();
  await expect(choice.locator('[aria-current="step"]')).toBeHidden();

  // Nothing on the screen is wider than the phone.
  const overflow = await page.evaluate(() => {
    const scroller = document.getElementById('app-scroll');
    return scroller ? scroller.scrollWidth - scroller.clientWidth : 0;
  });
  expect(overflow).toBeLessThanOrEqual(0);
});

test('the spend chart and the feed follow the lines held in the tier card', async ({ page }) => {
  await openClientView(page);
  const spend = page.getByTestId('client-spend');
  const legend = page.getByTestId('client-spend-legend');
  const saving = page.getByTestId('client-spend-saving');
  const activity = page.getByTestId('client-activity');
  const skyBars = spend.locator('svg path[fill="#3F95C6"]');

  // Seeded: Agency (2%) and Procurement, which is included at any tier.
  await expect(spend.getByRole('heading', { name: 'GAC spend, last six months' })).toBeVisible();
  await expect(legend).toContainText('Agency');
  await expect(legend).toContainText('Procurement');
  await expect(legend).not.toContainText('Logistics');
  await expect(page.getByTestId('client-spend-total')).toHaveText('£171,000');
  await expect(saving).toHaveText('£3,420 saved at 2%');
  await expect(skyBars).toHaveCount(0);
  await expect(activity).not.toContainText('Consignment collected in Glasgow');
  await expect(activity).toContainText('Pilot booked for MV Choice');

  const agencySwatch = legend.locator('li', { hasText: 'Agency' }).locator('span').first();
  await expect(agencySwatch).toHaveCSS('background-color', 'rgb(14, 94, 138)');

  // Hold Logistics: the legend, the bars, the saving and the feed all move.
  await page.getByRole('switch', { name: 'Logistics' }).click();
  await expect(legend).toContainText('Logistics');
  await expect(skyBars).toHaveCount(6);
  await expect(saving).toHaveText('£9,000 saved at 4%');
  await expect(activity).toContainText(
    'Consignment collected in Glasgow, due at the GAC warehouse on Friday',
  );
  await expect(activity).not.toContainText('T1 transit declaration submitted');
  // Colour follows the line, never its rank.
  await expect(agencySwatch).toHaveCSS('background-color', 'rgb(14, 94, 138)');
  await expect(legend.locator('li', { hasText: 'Logistics' }).locator('span').first()).toHaveCSS(
    'background-color',
    'rgb(63, 149, 198)',
  );

  // Full Stack: six months come to £250,000 and 7% of it is £17,500.
  await page.getByRole('switch', { name: 'Customs' }).click();
  await expect(page.getByTestId('client-spend-total')).toHaveText('£250,000');
  await expect(saving).toHaveText('£17,500 saved at 7%');
  await expect(activity).toContainText('T1 transit declaration submitted to HMRC');

  // Drop Logistics again and its bars and feed row go with it.
  await page.getByRole('switch', { name: 'Logistics' }).click();
  await expect(skyBars).toHaveCount(0);
  await expect(activity).not.toContainText('Consignment collected in Glasgow');
});

test('the spend chart shows its numbers and answers the keyboard', async ({ page }) => {
  await openClientView(page);
  const spend = page.getByTestId('client-spend');

  const table = spend.getByRole('table');
  await expect(table).toBeHidden();
  await spend.getByText('Show the numbers').click();
  await expect(table).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Agency' })).toBeVisible();
  await expect(table.getByRole('row').filter({ hasText: 'Sep' })).toContainText('£27,000');

  const plot = spend.getByRole('group', { name: /GAC spend by service line/ });
  await plot.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(spend.locator('[aria-live="polite"]')).toContainText('Aug');
  await page.keyboard.press('Escape');
});

test('nothing in the client view mentions commission, with every panel open', async ({ page }) => {
  await openClientView(page);
  // Every line held, so every row and series is on the page.
  await page.getByRole('switch', { name: 'Logistics' }).click();
  await page.getByRole('switch', { name: 'Customs' }).click();
  await page.evaluate(() => {
    document.querySelectorAll('details').forEach((d) => {
      d.open = true;
    });
  });
  // A tooltip up as well.
  await page
    .getByTestId('client-spend')
    .getByRole('group', { name: /GAC spend by service line/ })
    .focus();

  await expect(page.getByText(/commission/i)).toHaveCount(0);
  const leaks = await page.evaluate(() => {
    const found: string[] = [];
    const words = /commission|mark-?up|\bband\b/i;
    const main = document.querySelector('main');
    if (main && words.test(main.textContent ?? '')) found.push('text');
    document.querySelectorAll('main *').forEach((el) => {
      for (const attr of ['aria-label', 'title', 'alt', 'aria-description']) {
        const v = el.getAttribute(attr);
        if (v && words.test(v)) found.push(`${el.tagName} ${attr}=${v}`);
      }
    });
    return found;
  });
  expect(leaks).toEqual([]);
});

test('the platform footnote and the tour anchor survive the rebuild', async ({ page }) => {
  await openClientView(page);
  await expect(page.locator('[data-tour="consolidation"]')).toBeVisible();
  await expect(page.getByTestId('dashboard-tier-pct')).toHaveText('2%');
  const note = page.getByTestId('client-costs-nothing');
  await expect(note).toContainText('The platform costs you nothing');
  await note.getByRole('link', { name: 'Supplier Vetting System' }).click();
  await expect(page).toHaveURL(/\/app\/svs$/);
});
