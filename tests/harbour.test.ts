import { describe, expect, it } from 'vitest';
import {
  HARBOUR_SERVICES,
  HOTSPOTS,
  menuTag,
  ORDER,
} from '../src/screens/marketing/harbour/services';

describe('interactive harbour services (design handoff)', () => {
  it('covers exactly the six services in the design order', () => {
    expect(ORDER).toEqual([
      'agency',
      'logistics',
      'customs',
      'assets',
      'procurement',
      'marketplace',
    ]);
    expect(Object.keys(HARBOUR_SERVICES).sort()).toEqual([...ORDER].sort());
    expect(HOTSPOTS.map((h) => h.id).sort()).toEqual([...ORDER].sort());
  });

  it('CTAs deep-link to real platform routes (rewired from the prototype)', () => {
    expect(HARBOUR_SERVICES.agency.to).toBe('/app/tiers');
    expect(HARBOUR_SERVICES.logistics.to).toBe('/app/tiers');
    expect(HARBOUR_SERVICES.customs.to).toBe('/app/tiers');
    expect(HARBOUR_SERVICES.assets.to).toBe('/app/marketplace');
    expect(HARBOUR_SERVICES.procurement.to).toBe('/app/marketplace');
    expect(HARBOUR_SERVICES.marketplace.to).toBe('/app/marketplace');
  });

  it('tier tags carry the load-bearing 2/4/7 ladder', () => {
    expect(HARBOUR_SERVICES.agency.tag).toContain('2% tier');
    expect(HARBOUR_SERVICES.logistics.tag).toContain('4% tier');
    expect(HARBOUR_SERVICES.customs.tag).toContain('7% tier');
    expect(HARBOUR_SERVICES.assets.tag).toContain('included at any tier');
    expect(HARBOUR_SERVICES.procurement.tag).toContain('included at any tier');
  });

  it('menu tags strip the in-house prefix, per the design behaviour', () => {
    expect(menuTag('agency')).toBe('2% tier');
    expect(menuTag('marketplace')).toBe('40+ vetted categories');
  });

  it('every service has exactly three bullets and a fact line', () => {
    for (const id of ORDER) {
      expect(HARBOUR_SERVICES[id].bullets).toHaveLength(3);
      expect(HARBOUR_SERVICES[id].fact.length).toBeGreaterThan(20);
    }
  });
});
