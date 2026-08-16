import { describe, expect, it } from 'vitest';
import { QUOTES } from '../src/data/quotes';
import { SUPPLIERS, supplierById } from '../src/data/suppliers';
import { ratingLine, ratingsCount } from '../src/lib/format';
import { alertTier, deriveStatus, goldBandActive, isBookable } from '../src/lib/svs';
import type { Cert } from '../src/lib/svs';

describe('SVS status derivation (03 §3.3)', () => {
  const ok = (name: string): Cert => ({ name, state: 'ok' });

  it('all ok → verified', () => {
    expect(deriveStatus([ok('BOSIET'), ok('Insurance')])).toBe('verified');
  });

  it('any due → renewal-due (bookable, warned)', () => {
    const certs: Cert[] = [ok('Insurance'), { name: 'GWO', state: 'due', daysToExpiry: 21 }];
    expect(deriveStatus(certs)).toBe('renewal-due');
    expect(isBookable(certs)).toBe(true);
  });

  it('any lapsed → blocked, even alongside due and ok', () => {
    const certs: Cert[] = [
      ok('HUET'),
      { name: 'GWO', state: 'due', daysToExpiry: 3 },
      { name: 'Insurance', state: 'lapsed' },
    ];
    expect(deriveStatus(certs)).toBe('blocked');
  });

  it('blocked is unbookable — the gate, not just the display', () => {
    const certs: Cert[] = [{ name: 'Insurance', state: 'lapsed' }];
    expect(isBookable(certs)).toBe(false);
  });

  it('no certs → verified (vacuously compliant mock)', () => {
    expect(deriveStatus([])).toBe('verified');
  });

  it('alert tiers fire at 90/30/7', () => {
    expect(alertTier(120)).toBeNull();
    expect(alertTier(90)).toBe(90);
    expect(alertTier(45)).toBe(90);
    expect(alertTier(30)).toBe(30);
    expect(alertTier(21)).toBe(30);
    expect(alertTier(7)).toBe(7);
    expect(alertTier(1)).toBe(7);
  });
});

describe('GAC Gold Band — earned audit tier, held only while compliance holds', () => {
  const ok = (name: string): Cert => ({ name, state: 'ok' });

  it('held + compliant → active', () => {
    expect(goldBandActive('held', [ok('LOLER'), ok('Insurance')])).toBe(true);
  });

  it('renewal due does not remove it; a lapse does', () => {
    expect(
      goldBandActive('held', [ok('Insurance'), { name: 'GWO', state: 'due', daysToExpiry: 21 }]),
    ).toBe(true);
    expect(goldBandActive('held', [ok('HUET'), { name: 'Insurance', state: 'lapsed' }])).toBe(
      false,
    );
  });

  it('scheduled (eligible, audit booked) is not the marque', () => {
    expect(goldBandActive('scheduled', [ok('Insurance')])).toBe(false);
  });

  it('no Gold Band state → never active', () => {
    expect(goldBandActive(undefined, [ok('Insurance')])).toBe(false);
  });

  it('only Premium suppliers hold or are booked for the audit (mock data)', () => {
    for (const s of SUPPLIERS) {
      if (s.goldBand) expect(s.plan, s.id).toBe('premium');
    }
    const held = SUPPLIERS.filter((s) => goldBandActive(s.goldBand, s.certs)).map((s) => s.id);
    expect(held).toEqual(['caledonia-lifting']);
  });
});

describe('Ratings carry the number actually submitted', () => {
  it('every supplier has a positive rating count', () => {
    for (const s of SUPPLIERS) expect(s.ratingCount, s.id).toBeGreaterThan(0);
  });

  it('quote cards mirror the supplier rating and count', () => {
    for (const q of QUOTES) {
      const s = supplierById(q.supplierId)!;
      expect(q.rating).toBe(s.rating);
      expect(q.ratingCount).toBe(s.ratingCount);
    }
  });

  it('formatter keeps score and count together', () => {
    expect(ratingLine(4.9, 127)).toBe('4.9 ★ · 127 ratings');
    expect(ratingsCount(1)).toBe('1 rating');
  });
});
