import { describe, expect, it } from 'vitest';
import { SERVICE_LINES, serviceLine } from '../src/data/serviceLines';
import type { ServiceLineId } from '../src/data/serviceLines';
import { CATEGORIES, SUPPLIERS } from '../src/data/suppliers';
import {
  bookableCount,
  lineForCategory,
  resolveLineSection,
  stockedCategories,
  suppliersInLine,
  tierSentence,
} from '../src/lib/serviceLines';
import { TIERS } from '../src/lib/tier';

describe('Service lines — the shape of the navigation', () => {
  it('the four lines are Agency, Logistics, Customs and Procurement, in nav order', () => {
    expect(SERVICE_LINES.map((l) => l.id)).toEqual([
      'agency',
      'logistics',
      'customs',
      'procurement',
    ]);
  });

  it('carries the 2 / 4 / 7 tier, which is why Customs has its own tab', () => {
    expect(serviceLine('agency').tierPct).toBe(TIERS.agency);
    expect(serviceLine('logistics').tierPct).toBe(TIERS.logistics);
    expect(serviceLine('customs').tierPct).toBe(TIERS.customs);
    // Procurement is included at any tier — it is not a fourth percentage.
    expect(serviceLine('procurement').tierPct).toBeNull();
  });

  it('the tier sentence names the line and says what the discount applies to', () => {
    expect(tierSentence(serviceLine('customs'))).toContain('7%');
    expect(tierSentence(serviceLine('customs'))).toContain('GAC in-house charges');
    expect(tierSentence(serviceLine('customs'))).toContain('non-cumulative');
    expect(tierSentence(serviceLine('procurement'))).toContain('included at any tier');
  });

  it('every service says who performs it, and every action goes somewhere', () => {
    for (const line of SERVICE_LINES) {
      expect(line.services.length).toBeGreaterThan(0);
      for (const s of line.services) {
        expect(['gac', 'network']).toContain(s.provision);
        if (s.action.kind === 'link') expect(s.action.to.startsWith('/app/')).toBe(true);
        if (s.action.kind === 'request') expect(s.action.category).toBeTruthy();
        expect(s.action.label).toBeTruthy();
      }
    }
  });

  it('a line with no network layer explains why instead of showing an empty list', () => {
    for (const line of SERVICE_LINES) {
      if (line.categories.length === 0) expect(line.noNetworkNote).toBeTruthy();
    }
  });

  it('beta services are GAC previews, and only Agency holds them', () => {
    const betas = SERVICE_LINES.flatMap((l) =>
      l.services.filter((s) => s.beta).map((s) => [l.id, s.id] as [ServiceLineId, string]),
    );
    expect(betas.map(([lineId]) => lineId).every((id) => id === 'agency')).toBe(true);
    expect(betas.map(([, id]) => id).sort()).toEqual(['bunkers', 'certification']);
  });
});

describe('Service lines ↔ the marketplace', () => {
  it('every marketplace category belongs to exactly one line', () => {
    const real = CATEGORIES.filter((c) => c !== 'All');
    for (const category of real) {
      const owners = SERVICE_LINES.filter((l) => l.categories.includes(category));
      expect(owners.length, `${category} should have one owning line`).toBe(1);
    }
  });

  it('lineForCategory reads back the owning line', () => {
    expect(lineForCategory('Cranes')).toBe('agency');
    expect(lineForCategory('Haulage')).toBe('logistics');
    expect(lineForCategory('All')).toBeNull();
    expect(lineForCategory('Nothing')).toBeNull();
  });

  it('the hub lists bookable suppliers first, then by rating', () => {
    const agency = suppliersInLine(serviceLine('agency'), SUPPLIERS);
    expect(agency.length).toBeGreaterThan(0);
    const ranks = agency.map((s) => (s.certs.some((c) => c.state === 'lapsed') ? 1 : 0));
    expect([...ranks].sort()).toEqual(ranks);
    const bookable = agency.filter((s) => !s.certs.some((c) => c.state === 'lapsed'));
    for (let i = 1; i < bookable.length; i += 1) {
      expect(bookable[i - 1]!.rating).toBeGreaterThanOrEqual(bookable[i]!.rating);
    }
  });

  it('promotion does not buy a place on the hub', () => {
    const agency = suppliersInLine(serviceLine('agency'), SUPPLIERS);
    const promoted = agency.findIndex((s) => s.promoted);
    // Silver City Welding is promoted; it must not be lifted above the field.
    if (promoted !== -1) {
      const better = agency.filter((s) => s.rating > agency[promoted]!.rating);
      expect(better.length).toBeLessThanOrEqual(promoted);
    }
  });

  it('a category kept for a beta service never renders an empty filter chip', () => {
    const agency = serviceLine('agency');
    expect(agency.categories).toContain('Bunkers');
    expect(stockedCategories(agency, SUPPLIERS)).not.toContain('Bunkers');
    for (const c of stockedCategories(agency, SUPPLIERS)) {
      expect(SUPPLIERS.some((s) => s.category === c)).toBe(true);
    }
  });

  it('blocked suppliers are counted out of the bookable figure', () => {
    const agency = serviceLine('agency');
    const all = suppliersInLine(agency, SUPPLIERS).length;
    const blocked = suppliersInLine(agency, SUPPLIERS).filter((s) =>
      s.certs.some((c) => c.state === 'lapsed'),
    ).length;
    expect(bookableCount(agency, SUPPLIERS)).toBe(all - blocked);
  });

  it('Customs has no network layer — GAC prepares the entry itself', () => {
    expect(serviceLine('customs').categories).toEqual([]);
    expect(suppliersInLine(serviceLine('customs'), SUPPLIERS)).toEqual([]);
    expect(serviceLine('customs').noNetworkNote).toContain('in-house');
  });
});

describe('Hub sections', () => {
  it('an unknown or missing section resolves to the line’s first', () => {
    const logistics = serviceLine('logistics');
    expect(resolveLineSection(logistics, null)).toBe('consignments');
    expect(resolveLineSection(logistics, 'nonsense')).toBe('consignments');
    expect(resolveLineSection(logistics, 'warehousing')).toBe('warehousing');
  });

  it('a line with no sections resolves to nothing rather than inventing one', () => {
    expect(resolveLineSection(serviceLine('agency'), 'anything')).toBeNull();
  });

  it('every section a service card links to actually exists', () => {
    for (const line of SERVICE_LINES) {
      for (const s of line.services) {
        if (s.action.kind !== 'link') continue;
        const [path, query] = s.action.to.split('?');
        const section = new URLSearchParams(query ?? '').get('section');
        if (!section) continue;
        expect(path, `${s.id} links into its own line`).toBe(line.to);
        expect((line.sections ?? []).map((x) => x.id)).toContain(section);
      }
    }
  });
});
