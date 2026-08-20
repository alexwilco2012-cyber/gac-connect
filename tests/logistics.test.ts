import { describe, expect, it } from 'vitest';
import { DEMO_CONSIGNMENT, EMPTY_CONSIGNMENT, SEED_CONSIGNMENTS } from '../src/data/logistics';
import { VESSELS } from '../src/data/vessels';
import {
  CONSIGNMENT_STAGES,
  consignmentAction,
  consignmentStageReached,
  consignmentStageTone,
  isConsignment,
  isConsignmentDelivered,
  needingCustoms,
  nextConsignmentRef,
  nextConsignmentStage,
  validateConsignment,
} from '../src/lib/logistics';
import type { Consignment, ConsignmentForm } from '../src/lib/logistics';

const complete: ConsignmentForm = { ...DEMO_CONSIGNMENT };

const at = (stage: Consignment['stage'], form = complete): Consignment => ({
  id: 'CN-9000',
  form,
  stage,
  createdAt: 'Wed 20 Aug · 09:00',
});

describe('Consignment pipeline', () => {
  it('runs collection → quay and holds at the last stage', () => {
    let stage: string = 'Booked';
    const seen = [stage];
    for (let i = 0; i < 8; i += 1) {
      stage = nextConsignmentStage(stage);
      if (seen[seen.length - 1] !== stage) seen.push(stage);
    }
    expect(seen).toEqual([...CONSIGNMENT_STAGES]);
    expect(nextConsignmentStage('Delivered to quay')).toBe('Delivered to quay');
  });

  it('an unrecognised stage restarts rather than sticking', () => {
    expect(nextConsignmentStage('Lost in the post')).toBe('Booked');
    expect(consignmentStageReached('Lost in the post', 'Booked')).toBe(false);
  });

  it('only the final stage reads as finished', () => {
    expect(isConsignmentDelivered('At GAC warehouse')).toBe(false);
    expect(isConsignmentDelivered('Delivered to quay')).toBe(true);
    expect(consignmentStageTone('In transit')).toBe('info');
    expect(consignmentStageTone('Delivered to quay')).toBe('verified');
  });

  it('the simulate button runs out when the cargo is on the quay', () => {
    for (const stage of CONSIGNMENT_STAGES.slice(0, -1)) {
      expect(consignmentAction(stage)).toBeTruthy();
    }
    expect(consignmentAction('Delivered to quay')).toBeNull();
  });

  it('the rail marks every stage already passed', () => {
    expect(consignmentStageReached('In transit', 'Booked')).toBe(true);
    expect(consignmentStageReached('In transit', 'In transit')).toBe(true);
    expect(consignmentStageReached('In transit', 'Delivered to quay')).toBe(false);
  });
});

describe('Booking a movement', () => {
  it('an empty form lists everything still needed', () => {
    const problems = validateConsignment(EMPTY_CONSIGNMENT);
    expect(problems).toContain('What is moving');
    expect(problems).toContain('Collection from');
    expect(problems).toContain('Ready for collection');
    // Delivery point and vessel are pre-set, so they are never "missing".
    expect(problems).not.toContain('Delivery point');
    expect(problems).not.toContain('Vessel');
  });

  it('the worked example is bookable as it stands', () => {
    expect(validateConsignment(complete)).toEqual([]);
  });

  it('pieces and weight must be numbers above zero', () => {
    expect(validateConsignment({ ...complete, pieces: 'a few' })).toEqual([
      'Pieces must be a number above zero',
    ]);
    expect(validateConsignment({ ...complete, weightKg: '0' })).toEqual([
      'Gross weight must be a number above zero',
    ]);
    expect(validateConsignment({ ...complete, weightKg: '-5' })).toHaveLength(1);
    expect(validateConsignment({ ...complete, weightKg: '860.5' })).toEqual([]);
  });

  it('references run on from the highest already held', () => {
    expect(nextConsignmentRef([])).toBe('CN-2041');
    expect(nextConsignmentRef(SEED_CONSIGNMENTS)).toBe('CN-2043');
    expect(nextConsignmentRef([at('Booked'), ...SEED_CONSIGNMENTS])).toBe('CN-9001');
  });
});

describe('Stored consignments are read defensively', () => {
  it('accepts a well-formed entry', () => {
    expect(isConsignment(at('In transit'))).toBe(true);
    expect(SEED_CONSIGNMENTS.every(isConsignment)).toBe(true);
  });

  it('drops anything malformed rather than crashing the screen', () => {
    expect(isConsignment(null)).toBe(false);
    expect(isConsignment({ ...at('Booked'), stage: 'Somewhere' })).toBe(false);
    expect(isConsignment({ ...at('Booked'), form: { ...complete, pieces: 4 } })).toBe(false);
    expect(isConsignment({ ...at('Booked'), form: { ...complete, mode: 'Teleport' } })).toBe(false);
    expect(isConsignment({ ...at('Booked'), form: { ...complete, fromOutsideUk: 'yes' } })).toBe(
      false,
    );
  });
});

describe('Where logistics meets customs', () => {
  it('only movements from outside the UK and still running need an entry', () => {
    const list = [
      at('Booked', { ...complete, fromOutsideUk: true }),
      { ...at('Delivered to quay', { ...complete, fromOutsideUk: true }), id: 'CN-9001' },
      { ...at('In transit', { ...complete, fromOutsideUk: false }), id: 'CN-9002' },
    ];
    expect(needingCustoms(list).map((c) => c.id)).toEqual(['CN-9000']);
  });

  it('the seeded Rotterdam movement is the one carrying a customs entry', () => {
    expect(needingCustoms(SEED_CONSIGNMENTS).map((c) => c.id)).toEqual(['CN-2042']);
  });
});

describe('Seed data', () => {
  it('every seeded movement names a vessel the platform knows', () => {
    for (const c of SEED_CONSIGNMENTS) {
      expect(VESSELS.some((v) => v.id === c.form.vesselId)).toBe(true);
    }
  });
});
