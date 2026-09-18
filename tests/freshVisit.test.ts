import { beforeEach, describe, expect, it } from 'vitest';
import { makeMemoryAdapter, startFreshVisit, VISIT_KEPT_KEYS } from '../src/lib/storage';

/**
 * A new visit starts clean: demo work lasts as long as the tab, so nobody
 * opens the site to find everything already chosen. Preferences stay, the
 * deck's keys are the deck's to sweep, and a reload is not a new visit.
 */
describe('a new visit starts clean', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const seed = () => {
    window.localStorage.setItem('gac-connect:acceptedQuote', '"q-2"');
    window.localStorage.setItem('gac-connect:tier', '{"agency":true,"logistics":true}');
    window.localStorage.setItem('gac-connect:procurement.stage', '"sent"');
    window.localStorage.setItem('gac-connect:sidebarCollapsed', 'true');
    window.localStorage.setItem('gac-connect:tourDismissed', 'true');
    window.localStorage.setItem('gac-connect:pres.procurement.stage', '"sent"');
    window.localStorage.setItem('gac-connect:accepted', '"q-2"');
    window.localStorage.setItem('someone-elses-key', '1');
  };

  it('sweeps demo work, keeps preferences, the deck and other apps', () => {
    seed();
    startFreshVisit(() => window.localStorage, makeMemoryAdapter());
    expect(Object.keys(window.localStorage).sort()).toEqual(
      [
        'gac-connect:accepted',
        'gac-connect:pres.procurement.stage',
        'gac-connect:sidebarCollapsed',
        'gac-connect:tourDismissed',
        'someone-elses-key',
      ].sort(),
    );
    expect(VISIT_KEPT_KEYS).toEqual(['sidebarCollapsed', 'tourDismissed']);
  });

  it('runs once per visit — a reload keeps the work', () => {
    const visit = makeMemoryAdapter();
    startFreshVisit(() => window.localStorage, visit);
    seed();
    startFreshVisit(() => window.localStorage, visit);
    expect(window.localStorage.getItem('gac-connect:acceptedQuote')).toBe('"q-2"');
  });

  it('never throws when storage is unavailable', () => {
    expect(() =>
      startFreshVisit(() => {
        throw new Error('blocked');
      }, makeMemoryAdapter()),
    ).not.toThrow();
  });
});
