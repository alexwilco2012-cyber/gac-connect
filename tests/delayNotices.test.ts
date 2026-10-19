import { describe, expect, it } from 'vitest';
import {
  AGENT_NAME,
  clockTime,
  DELAY_NOTICE_NOTE,
  delayNotices,
  delayNoticeSummary,
} from '../src/lib/delayNotices';
import { planTransfers, trackFlight, TRANSFER_BUFFERS } from '../src/lib/transfers';

/**
 * A delay tells everyone on the run (owner's FF06 proposal): one notice per
 * party, derived from the run's legs, each with its own leg's old and new time.
 */

const runner = { transit: '25 min to Aberdeen anchorage', vesselName: 'Granite Runner' };

function run(
  flight: string,
  delay: number,
  launch: typeof runner | null,
  hotel: string | null = null,
) {
  const booked = planTransfers(trackFlight(flight)!, 'Aberdeen', launch, hotel);
  const current = planTransfers(trackFlight(flight, delay)!, 'Aberdeen', launch, hotel);
  return { booked: booked.legs, current: current.legs };
}

describe('delay notices', () => {
  it('arriving with a launch: taxi, launch and agent, each with their own leg', () => {
    const { booked, current } = run('ZZ417', 40, runner);
    const notices = delayNotices(
      booked,
      current,
      { taxi: 'Regent Quay Cars', launch: 'Granite Launches' },
      '10:42',
    );
    expect(notices.map((n) => n.party)).toEqual(['taxi', 'launch', 'agent']);
    expect(notices[0]).toMatchObject({
      name: 'Regent Quay Cars',
      role: 'Taxi operator',
      leg: 'Taxi pickup at arrivals',
      from: '14:35',
      to: '15:15',
      notifiedAt: '10:42',
    });
    expect(notices[1]).toMatchObject({
      name: 'Granite Launches',
      role: 'Launch operator',
      leg: 'Launch departs (Granite Runner)',
      from: '15:20',
      to: '16:00',
    });
    expect(notices[2]).toMatchObject({
      name: AGENT_NAME,
      role: 'Agent',
      leg: 'Flight lands, and every leg after it',
      from: '13:55',
      to: '14:35',
    });
  });

  it('a vessel alongside tells no launch operator, even if one is named', () => {
    const { booked, current } = run('ZZ417', 40, null);
    const notices = delayNotices(
      booked,
      current,
      { taxi: 'Regent Quay Cars', launch: 'Granite Launches' },
      '10:42',
    );
    expect(notices.map((n) => n.party)).toEqual(['taxi', 'agent']);
  });

  it('a room that night tells the hotel, and the launch is off the run', () => {
    const { booked, current } = run('ZZ417', 40, runner, 'Granite Quay Hotel');
    expect(current.some((l) => l.party === 'launch')).toBe(false);
    const notices = delayNotices(
      booked,
      current,
      { taxi: 'Regent Quay Cars', hotel: 'Granite Quay Hotel' },
      '10:42',
    );
    expect(notices.map((n) => n.party)).toEqual(['taxi', 'hotel', 'agent']);
    const hotel = notices.find((n) => n.party === 'hotel')!;
    // pickup 14:35 + 25 min road → check in 15:00; delayed 40 → 15:40
    expect(hotel).toMatchObject({
      name: 'Granite Quay Hotel',
      role: 'Hotel',
      leg: 'Check in, Granite Quay Hotel',
      from: `15:00`,
      to: '15:40',
    });
    expect(TRANSFER_BUFFERS.hotelRoadMin).toBe(25);
  });

  it('departing: the agent line works back from the flight', () => {
    const { booked, current } = run('ZZ204', 40, runner);
    const notices = delayNotices(
      booked,
      current,
      { taxi: 'Regent Quay Cars', launch: 'Granite Launches' },
      '08:05',
    );
    expect(notices.map((n) => n.party)).toEqual(['taxi', 'launch', 'agent']);
    expect(notices[0]).toMatchObject({
      leg: 'Taxi pickup at the quay',
      from: '14:45',
      to: '15:25',
    });
    expect(notices[1]).toMatchObject({
      leg: 'Launch leaves the vessel (Granite Runner)',
      from: '14:00',
      to: '14:40',
    });
    expect(notices[2]).toMatchObject({
      leg: 'Flight departs, and every leg before it',
      from: '17:10',
      to: '17:50',
    });
  });

  it('departing from a hotel: check-out and pickup move together', () => {
    const { booked, current } = run('ZZ204', 60, null, 'Caledonia Rooms');
    const notices = delayNotices(
      booked,
      current,
      { taxi: 'Regent Quay Cars', hotel: 'Caledonia Rooms' },
      '08:05',
    );
    expect(notices.map((n) => n.party)).toEqual(['taxi', 'hotel', 'agent']);
    // 17:10 − 120 − 25 = 14:45; delayed 60 → 15:45
    expect(notices[0]).toMatchObject({
      leg: 'Taxi pickup at the hotel',
      from: '14:45',
      to: '15:45',
    });
    expect(notices[1]).toMatchObject({
      leg: 'Check out, Caledonia Rooms',
      from: '14:45',
      to: '15:45',
    });
  });

  it('a further delay moves every notice again; no delay means no notices', () => {
    const later = run('ZZ417', 60, runner);
    const notices = delayNotices(
      later.booked,
      later.current,
      { taxi: 'Regent Quay Cars', launch: 'Granite Launches' },
      '10:50',
    );
    expect(notices.map((n) => n.to)).toEqual(['15:35', '16:20', '14:55']);
    expect(notices.every((n) => n.notifiedAt === '10:50')).toBe(true);

    const onTime = run('ZZ417', 0, runner);
    expect(
      delayNotices(onTime.booked, onTime.current, { taxi: 'Regent Quay Cars' }, '10:50'),
    ).toEqual([]);
  });

  it('copy: plain, simulated, no contact details, no exclamation marks', () => {
    expect(DELAY_NOTICE_NOTE).toMatch(/simulated/i);
    expect(DELAY_NOTICE_NOTE).toMatch(/nothing is sent/i);
    expect(delayNoticeSummary('ZZ417', 40, 3)).toBe(
      'ZZ417 delayed 40 min — 3 parties told, each with the new time for their own leg.',
    );
    expect(delayNoticeSummary('ZZ417', 40, 1)).toContain('1 party told');
    for (const text of [DELAY_NOTICE_NOTE, AGENT_NAME, delayNoticeSummary('ZZ417', 40, 3)]) {
      expect(text).not.toContain('!');
      expect(text).not.toMatch(/@|\+44|\d{5,}/);
    }
    expect(clockTime(new Date(2026, 9, 19, 7, 5))).toBe('07:05');
  });
});
