import { describe, expect, it } from 'vitest';
import { SUPPLIERS, supplierById } from '../src/data/suppliers';
import type { LaunchDetails, Supplier } from '../src/data/suppliers';
import {
  describeFit,
  fitLabel,
  fitsRun,
  LAUNCH_PORT_NOTES,
  launchPorts,
  launchSuppliers,
  launchesAt,
  overCapacityWarning,
  planSummary,
  runsNeeded,
} from '../src/lib/launches';
import { listingFacts } from '../src/lib/marketplace';
import { deriveStatus, isBookable } from '../src/lib/svs';

const graniteRunner = supplierById('granite-launches')!.launch!;
const torryTern = supplierById('torry-workboats')!.launch!;
const deveronLass = supplierById('deveron-launch-services')!.launch!;

describe('Launches — the data behind the tab', () => {
  it('only suppliers carrying launch details are launches', () => {
    const launches = launchSuppliers(SUPPLIERS);
    expect(launches.map((s) => s.id)).toEqual([
      'granite-launches',
      'torry-workboats',
      'deveron-launch-services',
    ]);
    expect(launches.every((s) => s.category === 'Launches')).toBe(true);
  });

  it('ports come out distinct, in order of first appearance', () => {
    expect(launchPorts(SUPPLIERS)).toEqual(['Aberdeen', 'Macduff']);
  });

  it('launchesAt groups by home port', () => {
    expect(launchesAt(SUPPLIERS, 'Aberdeen').map((s) => s.launch.vesselName)).toEqual([
      'Granite Runner',
      'Torry Tern',
    ]);
    expect(launchesAt(SUPPLIERS, 'Macduff').map((s) => s.launch.vesselName)).toEqual([
      'Deveron Lass',
    ]);
    expect(launchesAt(SUPPLIERS, 'Peterhead')).toEqual([]);
  });

  it('every port on the tab has a note, and the notes name no operators', () => {
    for (const port of launchPorts(SUPPLIERS)) {
      expect(LAUNCH_PORT_NOTES[port]).toBeTruthy();
      for (const s of launchSuppliers(SUPPLIERS)) {
        expect(LAUNCH_PORT_NOTES[port]).not.toContain(s.name);
      }
    }
  });

  it('every launch operator is bookable and verified — the SVS gate still applies', () => {
    for (const s of launchSuppliers(SUPPLIERS)) {
      expect(deriveStatus(s.certs)).toBe('verified');
      expect(isBookable(s.certs)).toBe(true);
    }
  });

  it('marketplace fact chips say the same thing as the launch details', () => {
    const facts = listingFacts(supplierById('deveron-launch-services')!);
    expect(facts).toContainEqual({ label: 'Port', value: 'Macduff' });
    expect(facts).toContainEqual({ label: 'Max capacity', value: '10 passengers' });
    expect(facts).toContainEqual({ label: 'Freight', value: 'Included' });
    expect(listingFacts(supplierById('torry-workboats')!)).toContainEqual({
      label: 'Freight',
      value: 'Not included',
    });
  });
});

describe('runsNeeded — ceil, never below one', () => {
  it('nine passengers on an eight-seat launch is two runs; on a twelve-seat launch, one', () => {
    expect(runsNeeded(8, 9)).toBe(2);
    expect(runsNeeded(12, 9)).toBe(1);
  });

  it('exact fills and small parties are one run', () => {
    expect(runsNeeded(12, 12)).toBe(1);
    expect(runsNeeded(10, 1)).toBe(1);
    expect(runsNeeded(10, 0)).toBe(1);
  });

  it('large parties scale', () => {
    expect(runsNeeded(10, 21)).toBe(3);
    expect(runsNeeded(8, 24)).toBe(3);
  });

  it('is defensive about bad input', () => {
    expect(runsNeeded(0, 9)).toBe(9);
    expect(runsNeeded(Number.NaN, 9)).toBe(9);
    expect(runsNeeded(12, Number.NaN)).toBe(1);
  });
});

describe('fitsRun — freight wins, then capacity', () => {
  it('Torry Tern does not carry freight, so it is the wrong launch when freight goes out', () => {
    expect(fitsRun(torryTern, 4, true)).toBe('no-freight');
    expect(fitsRun(torryTern, 9, true)).toBe('no-freight');
  });

  it('Torry Tern without freight is a capacity question', () => {
    expect(fitsRun(torryTern, 8, false)).toBe('fits');
    expect(fitsRun(torryTern, 9, false)).toBe('runs');
  });

  it('Granite Runner takes twelve with freight in one run', () => {
    expect(fitsRun(graniteRunner, 12, true)).toBe('fits');
    expect(fitsRun(graniteRunner, 13, true)).toBe('runs');
  });

  it('Deveron Lass needs two runs for fourteen', () => {
    expect(fitsRun(deveronLass, 14, true)).toBe('runs');
    expect(fitsRun(deveronLass, 14, false)).toBe('runs');
    expect(fitsRun(deveronLass, 10, true)).toBe('fits');
  });

  it('pill labels are the same words on every card', () => {
    expect(fitLabel('fits', 1)).toBe('Fits in one run');
    expect(fitLabel('runs', 2)).toBe('2 runs needed');
    expect(fitLabel('no-freight', 3)).toBe('No freight');
  });
});

describe('overCapacityWarning — the modal’s passenger check', () => {
  it('is silent at or under the limit', () => {
    expect(overCapacityWarning(graniteRunner, 12)).toBeUndefined();
    expect(overCapacityWarning(graniteRunner, 1)).toBeUndefined();
  });

  it('names the launch, the limit, and the runs when over', () => {
    expect(overCapacityWarning(graniteRunner, 14)).toBe(
      '14 is over Granite Runner’s 12 passenger limit — this will take 2 runs, or choose a larger launch',
    );
    expect(overCapacityWarning(torryTern, 25)).toContain('4 runs');
  });
});

describe('planSummary — the live sentence under Plan a run', () => {
  it('counts the launches that fit in a single run', () => {
    expect(planSummary(SUPPLIERS, 'Aberdeen', 9, true)).toBe(
      '1 launch at Aberdeen can carry 9 passengers with freight included in a single run.',
    );
    expect(planSummary(SUPPLIERS, 'Aberdeen', 8, false)).toBe(
      '2 launches at Aberdeen can carry 8 passengers in a single run.',
    );
    expect(planSummary(SUPPLIERS, 'Macduff', 10, true)).toBe(
      '1 launch at Macduff can carry 10 passengers with freight included in a single run.',
    );
  });

  it('explains each launch when nothing fits in one run', () => {
    expect(planSummary(SUPPLIERS, 'Aberdeen', 14, true)).toBe(
      'No launch at Aberdeen carries 14 passengers with freight in a single run — Granite Runner (12) needs 2 runs for 14 passengers; Torry Tern (8) needs 2 runs for 14 passengers and does not carry freight.',
    );
    expect(planSummary(SUPPLIERS, 'Macduff', 14, false)).toBe(
      'No launch at Macduff carries 14 passengers in a single run — Deveron Lass (10) needs 2 runs for 14 passengers.',
    );
  });

  it('singular passenger and empty ports read correctly', () => {
    expect(planSummary(SUPPLIERS, 'Aberdeen', 1, false)).toBe(
      '2 launches at Aberdeen can carry 1 passenger in a single run.',
    );
    expect(planSummary(SUPPLIERS, 'Peterhead', 9, true)).toBe(
      'No launches are listed at Peterhead.',
    );
  });

  it('describeFit covers every fit', () => {
    expect(describeFit(graniteRunner, 9, true)).toBe(
      'Granite Runner (12) carries 9 passengers in one run',
    );
    expect(describeFit(deveronLass, 14, false)).toBe(
      'Deveron Lass (10) needs 2 runs for 14 passengers',
    );
    expect(describeFit(torryTern, 4, true)).toBe('Torry Tern (8) does not carry freight');
    expect(describeFit(torryTern, 9, true)).toBe(
      'Torry Tern (8) needs 2 runs for 9 passengers and does not carry freight',
    );
  });

  it('works on any supplier list, not just the canonical data', () => {
    const launch: LaunchDetails = {
      port: 'Peterhead',
      vesselName: 'Test Launch',
      maxPassengers: 6,
      freightIncluded: false,
      freightNote: 'n/a',
      transit: '10 min',
      availability: 'daylight',
    };
    const list: Supplier[] = [{ ...supplierById('torry-workboats')!, id: 'x', launch }];
    expect(launchPorts(list)).toEqual(['Peterhead']);
    expect(planSummary(list, 'Peterhead', 6, false)).toBe(
      '1 launch at Peterhead can carry 6 passengers in a single run.',
    );
    expect(planSummary(list, 'Peterhead', 6, true)).toBe(
      'No launch at Peterhead carries 6 passengers with freight in a single run — Test Launch (6) does not carry freight.',
    );
  });
});
