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
  it('bands are 20 / 15 / 10 by tier', () => {
    expect(COMMISSION_BANDS.free).toBe(20);
    expect(COMMISSION_BANDS.professional).toBe(15);
    expect(COMMISSION_BANDS.premium).toBe(10);
  });

  it('a supplier who commits more keeps more of each job', () => {
    expect(commissionPct('free')).toBeGreaterThan(commissionPct('professional'));
    expect(commissionPct('professional')).toBeGreaterThan(commissionPct('premium'));
  });

  it('£4,400 crane job — what each tier keeps', () => {
    expect(commissionDue(4400, 'free')).toBe(880);
    expect(supplierKeeps(4400, 'free')).toBe(3520);
    expect(commissionDue(4400, 'professional')).toBe(660);
    expect(supplierKeeps(4400, 'professional')).toBe(3740);
    expect(commissionDue(4400, 'premium')).toBe(440);
    expect(supplierKeeps(4400, 'premium')).toBe(3960);
  });

  it('Founder Programme takes 5 points off the band', () => {
    expect(FOUNDER_REDUCTION_POINTS).toBe(5);
    expect(commissionPct('free', true)).toBe(15);
    expect(commissionPct('professional', true)).toBe(10);
    expect(commissionPct('premium', true)).toBe(5);
    expect(supplierKeeps(4400, 'premium', true)).toBe(4180);
  });

  it('plan cards carry the same bands as the rule', () => {
    for (const plan of PLANS) {
      expect(plan.commissionPct).toBe(COMMISSION_BANDS[plan.id]);
    }
  });

  it('plan prices are unchanged: Basic free, £900, £1,800', () => {
    expect(PLANS.map((p) => [p.name, p.priceLine])).toEqual([
      ['Basic', '£0'],
      ['Professional', '£900'],
      ['Premium', '£1,800'],
    ]);
  });
});
