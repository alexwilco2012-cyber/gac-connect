import { describe, expect, it } from 'vitest';
import { PROVIDERS, SEED_CREW, SEED_RENEWALS, providerFor } from '../src/data/certification';
import { SUPPLIERS } from '../src/data/suppliers';
import { VESSELS } from '../src/data/vessels';
import {
  REFERENCE_DATE,
  SWEEP_TIER,
  attentionList,
  counts,
  crewStatus,
  expiryLabel,
  expiryPhrase,
  horizonOf,
  isRenewal,
  isRouted,
  needsAttention,
  nextRenewalRef,
  openRenewals,
  register,
  renewalAction,
  sweepCandidates,
  toCert,
} from '../src/lib/certification';
import type { CrewMember, Renewal } from '../src/lib/certification';
import { ALERT_TIERS } from '../src/lib/svs';

/**
 * The beta register is a preview, but its rules are the live ones: the expiry
 * engine is the SVS engine, a lapse is a lapse, and the sweep can be run twice
 * without booking the same course twice.
 */

const member = (certs: CrewMember['certs']): CrewMember => ({
  id: 'crew-001',
  ref: 'Crew 001',
  rank: 'Master',
  vesselId: 'elan',
  certs,
});

describe('crew credentials run on the SVS engine', () => {
  it('uses the SVS alert tiers, not a second set', () => {
    expect([...ALERT_TIERS].sort((a, b) => a - b)).toEqual([7, 30, 90]);
    expect(horizonOf({ name: 'HUET', daysToExpiry: 5 })).toBe(7);
    expect(horizonOf({ name: 'HUET', daysToExpiry: 29 })).toBe(30);
    expect(horizonOf({ name: 'HUET', daysToExpiry: 89 })).toBe(90);
    expect(horizonOf({ name: 'HUET', daysToExpiry: 91 })).toBeNull();
  });

  it('maps a credential to a certificate chip state', () => {
    expect(toCert({ name: 'ENG1 medical', daysToExpiry: -6 })).toEqual({
      name: 'ENG1 medical',
      state: 'lapsed',
    });
    expect(toCert({ name: 'HUET', daysToExpiry: 12 })).toEqual({
      name: 'HUET',
      state: 'due',
      daysToExpiry: 12,
    });
    expect(toCert({ name: 'MIST', daysToExpiry: 400 })).toEqual({ name: 'MIST', state: 'ok' });
  });

  it('a single lapse blocks the crew member, as it blocks a supplier', () => {
    expect(
      crewStatus(
        member([
          { name: 'ENG1 medical', daysToExpiry: -1 },
          { name: 'HUET', daysToExpiry: 300 },
        ]),
      ),
    ).toBe('blocked');
    expect(crewStatus(member([{ name: 'HUET', daysToExpiry: 20 }]))).toBe('renewal-due');
    expect(crewStatus(member([{ name: 'HUET', daysToExpiry: 300 }]))).toBe('verified');
  });

  it('describes an expiry in days, and dates it from the demo today', () => {
    expect(expiryPhrase({ name: 'HUET', daysToExpiry: 1 })).toBe('expires in 1 day');
    expect(expiryPhrase({ name: 'HUET', daysToExpiry: 0 })).toBe('expires today');
    expect(expiryPhrase({ name: 'HUET', daysToExpiry: -1 })).toBe('lapsed 1 day ago');
    expect(expiryLabel(0)).toBe('20 Aug 2026');
    expect(expiryLabel(1)).toBe('21 Aug 2026');
    expect(expiryLabel(-6)).toBe('14 Aug 2026');
    // Every month reads as three letters, September included.
    expect(expiryLabel(18)).toBe('7 Sep 2026');
    expect(REFERENCE_DATE).toBe('2026-08-20');
  });
});

describe('the register the screen shows', () => {
  it('filters by vessel and by horizon, soonest problem first', () => {
    const all = register(SEED_CREW, 'all', 'all');
    expect(all).toHaveLength(SEED_CREW.length);
    expect(all[0]!.certs.some((c) => c.daysToExpiry < 0)).toBe(true);

    const boreal = register(SEED_CREW, 'boreal', 'all');
    expect(boreal.every((m) => m.vesselId === 'boreal')).toBe(true);

    const lapsed = register(SEED_CREW, 'all', 'lapsed');
    expect(lapsed.every((m) => m.certs.some((c) => c.daysToExpiry < 0))).toBe(true);
    expect(lapsed.length).toBeLessThan(all.length);

    const attention = register(SEED_CREW, 'all', 'attention');
    expect(attention.every((m) => m.certs.some(needsAttention))).toBe(true);
  });

  it('counts what the tiles show, from the same list the rows come from', () => {
    const totals = counts(SEED_CREW);
    expect(totals.crew).toBe(SEED_CREW.length);
    expect(totals.certificates).toBe(SEED_CREW.flatMap((m) => m.certs).length);
    expect(totals.lapsed).toBe(
      SEED_CREW.flatMap((m) => m.certs).filter((c) => c.daysToExpiry < 0).length,
    );
    expect(totals.expiring + totals.lapsed).toBe(attentionList(SEED_CREW).length);
  });

  it('lists what wants attention soonest first', () => {
    const list = attentionList(SEED_CREW);
    const days = list.map((e) => e.cert.daysToExpiry);
    expect([...days].sort((a, b) => a - b)).toEqual(days);
    expect(days[0]).toBeLessThan(0);
  });
});

describe('renewal routing', () => {
  it('sweeps everything lapsed or inside 30 days, and never the same course twice', () => {
    const candidates = sweepCandidates(SEED_CREW, []);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((c) => c.cert.daysToExpiry <= SWEEP_TIER)).toBe(true);

    const routed: Renewal[] = candidates.map((c, i) => ({
      id: `CRT-${3000 + i}`,
      crewId: c.member.id,
      crewRef: c.member.ref,
      rank: c.member.rank,
      vesselId: c.member.vesselId,
      certName: c.cert.name,
      daysToExpiry: c.cert.daysToExpiry,
      provider: providerFor(c.cert.name),
      stage: 'Renewal raised',
      createdAt: 'Thu 20 Aug · 08:00',
      automatic: true,
    }));
    expect(sweepCandidates(SEED_CREW, routed)).toEqual([]);
    expect(isRouted(routed, candidates[0]!.member.id, candidates[0]!.cert.name)).toBe(true);
    expect(isRouted(routed, candidates[0]!.member.id, 'A course nobody holds')).toBe(false);
  });

  it('leaves the 90-day warnings alone — 30 days is when a course has to be booked', () => {
    const warned = attentionList(SEED_CREW).filter((e) => e.cert.daysToExpiry > SWEEP_TIER);
    expect(warned.length).toBeGreaterThan(0);
    const swept = sweepCandidates(SEED_CREW, []);
    expect(swept.some((e) => e.cert.daysToExpiry > SWEEP_TIER)).toBe(false);
  });

  it('routes each course to the provider that runs it', () => {
    expect(providerFor('HUET')).toBe('Granite City Survival Training');
    expect(providerFor('ENG1 medical')).toBe('Northern Marine Medicals');
    expect(providerFor('Rigging and slinging')).toBe('Harbour Safety Academy');
    // Anything unmatched still lands somewhere real rather than nowhere.
    expect(PROVIDERS.map((p) => p.name)).toContain(providerFor('A course nobody runs'));
  });

  it('numbers renewals sequentially from the highest already held', () => {
    expect(nextRenewalRef([])).toBe('CRT-2051');
    expect(nextRenewalRef(SEED_RENEWALS)).toBe('CRT-2052');
  });

  it('walks the pipeline and stops when the certificate is back', () => {
    expect(renewalAction('Renewal raised')?.steps).toBe(1);
    expect(renewalAction('Provider quoted')).not.toBeNull();
    expect(renewalAction('Course booked')).not.toBeNull();
    expect(renewalAction('Certificate updated')).toBeNull();
    expect(openRenewals([{ ...SEED_RENEWALS[0]!, stage: 'Certificate updated' }])).toEqual([]);
    expect(openRenewals(SEED_RENEWALS)).toHaveLength(1);
  });

  it('drops a malformed stored renewal rather than rendering it', () => {
    expect(isRenewal(SEED_RENEWALS[0])).toBe(true);
    expect(isRenewal({ ...SEED_RENEWALS[0], stage: 'Something else' })).toBe(false);
    expect(isRenewal({ ...SEED_RENEWALS[0], daysToExpiry: 'soon' })).toBe(false);
    expect(isRenewal(null)).toBe(false);
  });
});

describe('the preview holds no personal data', () => {
  it('shows crew by reference and rank only', () => {
    for (const m of SEED_CREW) {
      expect(m.ref).toMatch(/^Crew \d{3}$/);
      expect(Object.keys(m)).toEqual(['id', 'ref', 'rank', 'vesselId', 'certs']);
    }
  });

  it('keeps every crew member on a vessel the demo actually has', () => {
    const ids = VESSELS.map((v) => v.id);
    expect(SEED_CREW.every((m) => ids.includes(m.vesselId))).toBe(true);
  });

  it('keeps the training providers out of the vetted directory', () => {
    // Training is not a marketplace category today, so nothing here should
    // imply a vetted supplier already sits behind a renewal.
    const vetted = SUPPLIERS.map((s) => s.name);
    for (const provider of PROVIDERS) expect(vetted).not.toContain(provider.name);
  });

  it('seeds a renewal against a credential the register really shows', () => {
    for (const r of SEED_RENEWALS) {
      const holder = SEED_CREW.find((m) => m.id === r.crewId);
      expect(holder).toBeDefined();
      expect(holder!.certs.some((c) => c.name === r.certName)).toBe(true);
    }
  });
});
