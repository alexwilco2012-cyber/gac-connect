import { describe, expect, it } from 'vitest';
import { alertTier, deriveStatus, isBookable } from '../src/lib/svs';
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
