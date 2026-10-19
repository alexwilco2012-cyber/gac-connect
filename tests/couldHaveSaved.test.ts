import { describe, expect, it } from 'vitest';
import { monthlySaving } from '../src/lib/clientDesk';
import { couldHaveSaved, couldHaveSavedLine } from '../src/lib/couldHaveSaved';
import type { TierSelection } from '../src/lib/tier';

/**
 * "How much more you could have saved" (owner's FF06 proposal): the spend
 * card prices the same six months of spend at the next tier up and at 7%.
 * Tiers are non-cumulative, Procurement is never a step, and at 7% there is
 * nothing to add.
 */

const NONE: TierSelection = { agency: false, logistics: false, customs: false };
const AGENCY: TierSelection = { agency: true, logistics: false, customs: false };
const LOGISTICS: TierSelection = { agency: false, logistics: true, customs: false };
const AGENCY_LOGISTICS: TierSelection = { agency: true, logistics: true, customs: false };
const CUSTOMS: TierSelection = { agency: false, logistics: false, customs: true };
const FULL: TierSelection = { agency: true, logistics: true, customs: true };
const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

describe('couldHaveSaved', () => {
  it('seeded at Agency: the same £171,000 at 4% and at 7%', () => {
    expect(couldHaveSaved(AGENCY)).toEqual([
      { service: 'logistics', pct: 4, saved: 6840, more: 3420 },
      { service: 'customs', pct: 7, saved: 11970, more: 8550 },
    ]);
  });

  it('measures "more" against what the card says the tier saved', () => {
    for (const tier of [NONE, AGENCY, LOGISTICS, AGENCY_LOGISTICS]) {
      const current = sum(monthlySaving(tier));
      for (const step of couldHaveSaved(tier)) {
        expect(step.more).toBe(step.saved - current);
        expect(step.more).toBeGreaterThan(0);
      }
    }
  });

  it('when the next tier up is 7% there is one step, Customs', () => {
    // Agency, Logistics and Procurement: £225,000; 7% of it month by month.
    expect(couldHaveSaved(AGENCY_LOGISTICS)).toEqual([
      { service: 'customs', pct: 7, saved: 15750, more: 6750 },
    ]);
    // Non-cumulative: Logistics alone is 4%, so Agency (2%) is never offered.
    expect(couldHaveSaved(LOGISTICS).map((s) => s.service)).toEqual(['customs']);
  });

  it('with nothing held, Procurement alone is priced at 2% and 7%', () => {
    expect(couldHaveSaved(NONE)).toEqual([
      { service: 'agency', pct: 2, saved: 500, more: 500 },
      { service: 'customs', pct: 7, saved: 1750, more: 1750 },
    ]);
  });

  it('says nothing at 7%, Full Stack or Customs alone', () => {
    expect(couldHaveSaved(FULL)).toEqual([]);
    expect(couldHaveSaved(CUSTOMS)).toEqual([]);
  });

  it('never offers Procurement as a step', () => {
    for (const tier of [NONE, AGENCY, LOGISTICS, AGENCY_LOGISTICS]) {
      for (const step of couldHaveSaved(tier)) {
        expect(['agency', 'logistics', 'customs']).toContain(step.service);
      }
    }
  });
});

describe('couldHaveSavedLine', () => {
  it('reads as a plain statement, formatted like the rest of the card', () => {
    expect(couldHaveSavedLine(AGENCY)).toBe(
      'Add Logistics and the same spend would have saved £6,840 at 4% — £3,420 more. Add Customs and it would have saved £11,970 at 7% — £8,550 more.',
    );
    expect(couldHaveSavedLine(AGENCY_LOGISTICS)).toBe(
      'Add Customs and the same spend would have saved £15,750 at 7% — £6,750 more.',
    );
  });

  it('leaves "more" off when no tier is held, since it would repeat the saving', () => {
    expect(couldHaveSavedLine(NONE)).toBe(
      'Add Agency and the same spend would have saved £500 at 2%. Add Customs and it would have saved £1,750 at 7%.',
    );
  });

  it('is null at 7%', () => {
    expect(couldHaveSavedLine(FULL)).toBeNull();
    expect(couldHaveSavedLine(CUSTOMS)).toBeNull();
  });

  it('carries no exclamation marks and no commission', () => {
    for (const tier of [NONE, AGENCY, LOGISTICS, AGENCY_LOGISTICS]) {
      const line = couldHaveSavedLine(tier) ?? '';
      expect(line).not.toMatch(/!/);
      expect(line).not.toMatch(/commission|mark-?up|\bband\b/i);
    }
  });
});
