import { describe, expect, it } from 'vitest';
import {
  COMMISSION_BANDS,
  commissionDue,
  commissionPct,
  FOUNDER_REDUCTION_POINTS,
  supplierKeeps,
} from '../src/lib/commission';
import { PLANS } from '../src/data/plans';

describe('Supplier commission bands (03 §3.2, v12 model)', () => {
  it('bands are 15 / 10 / 5 by tier (locked 24 Oct 2026)', () => {
    expect(COMMISSION_BANDS.free).toBe(15);
    expect(COMMISSION_BANDS.professional).toBe(10);
    expect(COMMISSION_BANDS.premium).toBe(5);
  });

  it('a supplier who commits more keeps more of each job', () => {
    expect(commissionPct('free')).toBeGreaterThan(commissionPct('professional'));
    expect(commissionPct('professional')).toBeGreaterThan(commissionPct('premium'));
  });

  it('£4,400 crane job — what each tier keeps', () => {
    expect(commissionDue(4400, 'free')).toBe(660);
    expect(supplierKeeps(4400, 'free')).toBe(3740);
    expect(commissionDue(4400, 'professional')).toBe(440);
    expect(supplierKeeps(4400, 'professional')).toBe(3960);
    expect(commissionDue(4400, 'premium')).toBe(220);
    expect(supplierKeeps(4400, 'premium')).toBe(4180);
  });

  it('Founder Programme is Professional free for Year 1: no points off the band', () => {
    expect(FOUNDER_REDUCTION_POINTS).toBe(0);
    expect(commissionPct('professional', true)).toBe(10);
    expect(commissionPct('premium', true)).toBe(5);
    expect(supplierKeeps(4400, 'professional', true)).toBe(3960);
  });

  it('plan cards carry the same bands as the rule', () => {
    for (const plan of PLANS) {
      expect(plan.commissionPct).toBe(COMMISSION_BANDS[plan.id]);
    }
  });

  it('plan prices are the locked 23 Oct 2026 ladder: Basic free, £2,000, £4,000', () => {
    expect(PLANS.map((p) => [p.name, p.priceLine])).toEqual([
      ['Basic', '£0'],
      ['Professional', '£2,000'],
      ['Premium', '£4,000'],
    ]);
  });
});
