import { describe, expect, it } from 'vitest';
import { TOUR_STEPS } from '../src/tour/steps';
import { routes } from '../src/routes';
import type { RouteObject } from 'react-router-dom';

/** Every address the router can actually resolve, as a flat set. */
function addressesOf(list: readonly RouteObject[], prefix = ''): string[] {
  const out: string[] = [];
  for (const r of list) {
    const raw = r.path ?? '';
    const here = raw.startsWith('/') ? raw : [prefix, raw].filter(Boolean).join('/');
    const clean = here.startsWith('/') ? here : `/${here}`;
    if (r.path !== undefined) out.push(clean.replace(/\/+$/, '') || '/');
    if (r.children) out.push(...addressesOf(r.children, clean === '/' ? '' : clean));
  }
  return out;
}

const ADDRESSES = new Set(addressesOf(routes));

describe('the guided tour', () => {
  it('walks the demo path in the order the presenter takes a room through', () => {
    expect(TOUR_STEPS.map((s) => s.route)).toEqual([
      '/app/dashboard',
      '/app/dashboard',
      '/app/marketplace',
      '/app/agency/crew-change',
      '/app/logistics',
      '/app/customs',
      '/app/procurement',
      '/app/quotes',
      '/app/invoices',
      '/app/tiers',
      '/app/svs',
      '/app/agency/certification',
      '/app/agency/bunkers',
      '/app/internal',
    ]);
  });

  it('only points at addresses the router can resolve', () => {
    const missing = TOUR_STEPS.filter((s) => !ADDRESSES.has(s.route)).map((s) => s.route);
    expect(missing).toEqual([]);
  });

  it('covers all four service lines, so no line is demonstrated by omission', () => {
    const hit = TOUR_STEPS.map((s) => s.route).join(' ');
    for (const line of ['/app/agency', '/app/logistics', '/app/customs', '/app/procurement']) {
      expect(hit).toContain(line);
    }
  });

  it('says something on every stop, and never twice', () => {
    for (const s of TOUR_STEPS) {
      expect(s.title.length).toBeGreaterThan(3);
      expect(s.body.length).toBeGreaterThan(40);
    }
    expect(new Set(TOUR_STEPS.map((s) => s.title)).size).toBe(TOUR_STEPS.length);
  });

  it('never mentions commission — the tour is what a client sees', () => {
    for (const s of TOUR_STEPS) {
      expect(`${s.title} ${s.body}`).not.toMatch(/commission/i);
    }
  });

  it('opens on the client’s dashboard, frames both previews as out of scope, then ends on the desk', () => {
    const [first, second] = TOUR_STEPS;
    expect(first?.route).toBe('/app/dashboard');
    expect(first?.anchor).toBe('consolidation');
    expect(second?.route).toBe('/app/dashboard');
    expect(second?.anchor).toBe('approve');
    const cert = TOUR_STEPS[11];
    const bunkers = TOUR_STEPS[12];
    const last = TOUR_STEPS[TOUR_STEPS.length - 1];
    expect(cert?.route).toBe('/app/agency/certification');
    expect(cert?.body).toMatch(/scope/i);
    expect(bunkers?.route).toBe('/app/agency/bunkers');
    expect(bunkers?.body).toMatch(/scope/i);
    expect(last?.route).toBe('/app/internal');
  });

  it('keeps em dashes out of the copy', () => {
    for (const s of TOUR_STEPS) {
      expect(`${s.title} ${s.body}`).not.toContain(String.fromCharCode(0x2014));
    }
  });
});
