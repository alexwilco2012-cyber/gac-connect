import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * A delay tells everyone on the run (owner's FF06 proposal: "if delayed, it
 * will send out a message to all suppliers involved … and automatically push
 * back timings to suit"). Crew change › Taxis: tracking a flight and applying
 * a delay lists one notice per party on that run — taxi operator, launch
 * operator or hotel, and the client's GAC agent — each with its own leg's old
 * and new time and a notified stamp. Simulated, and the screen says so.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('gac-connect:tourDismissed', 'true');
  });
});

const NOTE =
  'Illustrative — these notices are simulated here and nothing is sent. In production the platform messages each supplier on the run and your GAC agent as soon as the feed reports a delay, and again if it changes.';

async function expectNotice(
  notices: Locator,
  party: string,
  name: string,
  leg: string,
  from: string,
  to: string,
) {
  const line = notices.getByTestId(`delay-notice-${party}`);
  await expect(line).toContainText(name);
  await expect(line).toContainText(leg);
  await expect(line).toContainText(`${from} → ${to}`);
  await expect(line).toContainText(/notified \d{2}:\d{2}/);
}

async function walkTheNotices(page: Page) {
  const planner = page.getByTestId('flight-planner');
  await planner.getByTestId('track-flight').click();
  await expect(planner.getByTestId('flight-status')).toHaveAttribute('data-phase', 'in-air');
  // On time: nobody has been told anything.
  await expect(planner.getByTestId('delay-notices')).toHaveCount(0);

  // Delayed 40 min: taxi, launch and agent, each with their own leg.
  await planner.getByTestId('simulate-delay').click();
  const notices = planner.getByTestId('delay-notices');
  await expect(notices).toBeVisible();
  await expect(notices).toContainText('Delay sent to everyone on this run');
  await expect(notices.getByTestId('delay-notices-summary')).toHaveText(
    'ZZ417 delayed 40 min — 3 parties told, each with the new time for their own leg.',
  );
  await expectNotice(
    notices,
    'taxi',
    'Regent Quay Cars',
    'Taxi pickup at arrivals',
    '14:35',
    '15:15',
  );
  await expectNotice(
    notices,
    'launch',
    'Granite Launches',
    'Launch departs (Granite Runner)',
    '15:20',
    '16:00',
  );
  await expectNotice(
    notices,
    'agent',
    'Your GAC agent',
    'Flight lands, and every leg after it',
    '13:55',
    '14:35',
  );
  await expect(notices.getByTestId('delay-notice-hotel')).toHaveCount(0);
  await expect(notices.getByTestId('delay-notice-note')).toHaveText(NOTE);
  await expect(notices).not.toContainText('!');
  await expect(notices).not.toContainText(/@|\+44/);

  // The delay changes: every notice moves again.
  await planner.getByTestId('simulate-further-delay').click();
  await expect(notices.getByTestId('delay-notices-summary')).toContainText('delayed 60 min');
  await expect(notices.getByTestId('delay-notice-taxi')).toContainText('14:35 → 15:35');
  await expect(notices.getByTestId('delay-notice-launch')).toContainText('15:20 → 16:20');
  await expect(notices.getByTestId('delay-notice-agent')).toContainText('13:55 → 14:55');

  // A Torry Workboats run tells Torry Workboats, not Granite Launches.
  await planner.getByTestId('flight-launch').selectOption('torry-workboats');
  await expect(notices.getByTestId('delay-notice-launch')).toContainText('Torry Workboats');
  await expect(notices.getByTestId('delay-notice-launch')).toContainText(
    'Launch departs (Torry Tern)',
  );

  // A room that night: the hotel is told, the launch is off this run.
  await planner.getByTestId('flight-hotel').selectOption('granite-quay-hotel');
  await expect(planner.getByTestId('flight-launch')).toBeDisabled();
  await expect(planner.getByTestId('flight-hotel-note')).toBeVisible();
  await expect(notices.getByTestId('delay-notice-launch')).toHaveCount(0);
  await expectNotice(
    notices,
    'hotel',
    'Granite Quay Hotel',
    'Check in, Granite Quay Hotel',
    '15:00',
    '16:00',
  );
  await expect(notices.getByTestId('delay-notices-summary')).toContainText('3 parties told');

  // Back on time: the notices clear.
  await planner.getByTestId('simulate-delay').click();
  await expect(planner.getByTestId('delay-notices')).toHaveCount(0);
  await expect(planner.getByTestId('simulate-further-delay')).toHaveCount(0);
}

test('taxis: a delay tells the taxi, the launch or hotel, and the agent', async ({ page }) => {
  await page.goto('/app/agency/crew-change?section=taxis');
  await page.keyboard.press('Escape');
  await walkTheNotices(page);

  // Macduff runs go to Deveron Cabs, and an off-signer's agent line works back from the flight.
  const planner = page.getByTestId('flight-planner');
  await planner.getByTestId('flight-hotel').selectOption('');
  await planner.getByTestId('flight-port').selectOption('Macduff');
  await planner.getByTestId('direction-departing').click();
  await planner.getByTestId('track-flight').click();
  await planner.getByTestId('simulate-delay').click();
  const notices = planner.getByTestId('delay-notices');
  await expect(notices.getByTestId('delay-notice-taxi')).toContainText('Deveron Cabs');
  await expect(notices.getByTestId('delay-notice-launch')).toContainText('Deveron Launch Services');
  await expect(notices.getByTestId('delay-notice-agent')).toContainText(
    'Flight departs, and every leg before it',
  );
  await expect(notices.getByTestId('delay-notice-agent')).toContainText('17:10 → 17:50');
});

test('the deck tells the same parties the same thing', async ({ page }) => {
  await page.goto('/presenter.html#/crew-change/taxis');
  await expect(page.getByTestId('flight-planner')).toBeVisible();
  await walkTheNotices(page);
});
