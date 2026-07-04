import { describe, expect, it } from 'vitest';
import { SUPPLIERS, supplierById } from '../src/data/suppliers';
import { orderThirdParty, sortSuppliers } from '../src/lib/marketplace';
import { deriveStatus, isBookable } from '../src/lib/svs';

describe('marketplace ordering rules (E5)', () => {
  it('promoted suppliers sort first within third-party results only', () => {
    const ordered = orderThirdParty(SUPPLIERS, 'rating');
    const firstPromotedIdx = ordered.findIndex((s) => s.promoted);
    const lastPromotedIdx = ordered.map((s) => !!s.promoted).lastIndexOf(true);
    const firstUnpromotedIdx = ordered.findIndex((s) => !s.promoted);
    expect(firstPromotedIdx).toBe(0);
    expect(lastPromotedIdx).toBeLessThan(firstUnpromotedIdx + 1);
  });

  it('within the unpromoted group, rating sort is descending', () => {
    const ordered = orderThirdParty(SUPPLIERS, 'rating').filter((s) => !s.promoted);
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i - 1]!.rating).toBeGreaterThanOrEqual(ordered[i]!.rating);
    }
  });

  it('esg sort ranks A before B before C', () => {
    const ordered = sortSuppliers([...SUPPLIERS], 'esg');
    const grades = ordered.map((s) => s.esg);
    const rank = { A: 0, B: 1, C: 2 } as const;
    for (let i = 1; i < grades.length; i++) {
      expect(rank[grades[i - 1]!]).toBeLessThanOrEqual(rank[grades[i]!]);
    }
  });

  it('the blocked supplier stays visible in ordering (transparency)', () => {
    const ordered = orderThirdParty(SUPPLIERS, 'rating');
    expect(ordered.some((s) => s.id === 'peterhead-diving')).toBe(true);
  });

  it('the blocked supplier is unbookable — list and profile share the same gate', () => {
    const peterhead = supplierById('peterhead-diving')!;
    expect(deriveStatus(peterhead.certs)).toBe('blocked');
    expect(isBookable(peterhead.certs)).toBe(false);
  });

  it('promotion does not change the promoted supplier’s own credentials', () => {
    const silverCity = supplierById('silver-city-welding')!;
    expect(silverCity.promoted).toBe(true);
    expect(deriveStatus(silverCity.certs)).toBe('verified');
    expect(silverCity.rating).toBe(4.4);
    expect(silverCity.esg).toBe('B');
  });
});
