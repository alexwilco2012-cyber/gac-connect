import { describe, expect, it } from 'vitest';
import {
  addMinutes,
  DEMO_FLIGHTS,
  FLIGHT_FEED_NOTE,
  launchTransitMin,
  normaliseFlightNo,
  planTransfers,
  trackFlight,
  TRANSFER_BUFFERS,
  TRANSFER_PORTS,
} from '../src/lib/transfers';

/** Flight-timed transfers (17 Aug review follow-up): taxis and launches timed to the tracked flight. */

describe('flight lookup', () => {
  it('normalises the flight number the way people type it', () => {
    expect(normaliseFlightNo('zz 417')).toBe('ZZ417');
    expect(normaliseFlightNo(' Zz-417 ')).toBe('ZZ417');
    expect(normaliseFlightNo('ZZ417')).toBe('ZZ417');
  });

  it('finds the demo flights and applies a delay to the estimate', () => {
    const f = trackFlight('zz 417');
    expect(f).not.toBeNull();
    expect(f!.route).toBe('Amsterdam → Aberdeen');
    expect(f!.scheduled).toBe('13:55');
    expect(f!.estimated).toBe('13:55');
    expect(f!.phase).toBe('in-air');
    const d = trackFlight('ZZ417', TRANSFER_BUFFERS.simulatedDelayMin);
    expect(d!.estimated).toBe('14:35');
    expect(d!.delayMin).toBe(40);
    expect(d!.phase).toBe('delayed');
  });

  it('is honest about unknown flights and about being simulated', () => {
    expect(trackFlight('XX999')).toBeNull();
    expect(trackFlight('')).toBeNull();
    expect(FLIGHT_FEED_NOTE).toMatch(/simulated/i);
    expect(FLIGHT_FEED_NOTE).toMatch(/flight-status feed/i);
    // Fictional flight numbers only — the ZZ prefix is not an airline's.
    for (const k of Object.keys(DEMO_FLIGHTS)) expect(k.startsWith('ZZ')).toBe(true);
  });

  it('adds minutes across midnight and leaves bad input alone', () => {
    expect(addMinutes('23:30', 45)).toBe('00:15');
    expect(addMinutes('00:10', -30)).toBe('23:40');
    expect(addMinutes('13:55', 0)).toBe('13:55');
    expect(addMinutes('later', 10)).toBe('later');
  });

  it('reads the launch transit from its transit line', () => {
    expect(launchTransitMin({ transit: '25 min to Aberdeen anchorage' })).toBe(25);
    expect(launchTransitMin({ transit: 'about an hour' })).toBe(30);
    expect(launchTransitMin(null)).toBe(0);
  });
});

describe('transfer plans', () => {
  const runner = { transit: '25 min to Aberdeen anchorage', vesselName: 'Granite Runner' };

  it('arriving on-signers: land → taxi → quay → launch → vessel', () => {
    const plan = planTransfers(trackFlight('ZZ417')!, 'Aberdeen', runner);
    expect(plan.direction).toBe('arriving');
    expect(plan.legs.map((l) => l.time)).toEqual(['13:55', '14:35', '15:00', '15:20', '15:45']);
    expect(plan.summary).toContain('Taxi pickup 14:35');
    expect(plan.summary).toContain('launch Granite Runner 15:20');
  });

  it('a delay re-times every leg from the new estimate', () => {
    const plan = planTransfers(trackFlight('ZZ417', 40)!, 'Aberdeen', runner);
    expect(plan.legs.map((l) => l.time)).toEqual(['14:35', '15:15', '15:40', '16:00', '16:25']);
    expect(plan.legs[0]!.note).toContain('delayed 40 min');
    expect(plan.summary).toContain('delayed 40 min');
  });

  it('a vessel alongside needs no launch leg', () => {
    const plan = planTransfers(trackFlight('ZZ417')!, 'Aberdeen', null);
    expect(plan.legs.map((l) => l.label)).toEqual([
      'Flight lands',
      'Taxi pickup at arrivals',
      'Arrive at the quay, Aberdeen',
      'Board the vessel alongside',
    ]);
    expect(plan.summary).not.toContain('launch');
  });

  it('departing off-signers work back from the check-in deadline', () => {
    const plan = planTransfers(trackFlight('ZZ204')!, 'Aberdeen', runner);
    expect(plan.direction).toBe('departing');
    // 17:10 departure → at airport 15:10 → taxi 14:45 → quay 14:25 → launch leaves 14:00
    expect(plan.legs.map((l) => l.time)).toEqual(['14:00', '14:25', '14:45', '15:10', '17:10']);
    expect(plan.summary).toContain('taxi 14:45');
  });

  it('taxis reach every port the crew change covers, not just the launch ports', () => {
    // Taxis stand on their own (owner's follow-up), so the road times cover the
    // letter ports as well as the two ports that happen to have a launch.
    expect(TRANSFER_PORTS).toEqual(['Aberdeen', 'Peterhead', 'Montrose', 'Macduff']);
    for (const p of TRANSFER_PORTS) expect(TRANSFER_BUFFERS.taxiMin[p]).toBeGreaterThan(0);
    // Peterhead: land 13:55 → taxi 14:35 → 55 min by road → quay 15:30.
    const plan = planTransfers(trackFlight('ZZ417')!, 'Peterhead', null);
    expect(plan.legs[2]!.time).toBe('15:30');
    expect(plan.legs[2]!.label).toBe('Arrive at the quay, Peterhead');
  });

  it('Macduff uses the longer road leg', () => {
    const plan = planTransfers(trackFlight('ZZ417')!, 'Macduff', null);
    expect(plan.legs[2]!.time).toBe(addMinutes('14:35', TRANSFER_BUFFERS.taxiMin.Macduff!));
  });
});
