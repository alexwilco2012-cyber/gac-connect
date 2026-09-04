import { describe, expect, it } from 'vitest';
import { landingStats } from '../src/lib/landingStats';
import { categoryCounts } from '../src/lib/marketplace';
import { isBookable } from '../src/lib/svs';
import { CATEGORIES, IN_HOUSE_LINES, SUPPLIERS } from '../src/data/suppliers';

/**
 * The landing page quotes the same four numbers as the marketplace hero. These
 * guard the reason that is safe: they are derived, so the two surfaces cannot
 * drift when a supplier is added or a certificate lapses.
 */
describe('landing proof counters', () => {
  it('derives every counter from the data, not from a written-down figure', () => {
    const [categories, bookable, inHouse, cost] = landingStats();

    expect(categories!.value).toBe(String(categoryCounts(SUPPLIERS, CATEGORIES).length));
    expect(bookable!.value).toBe(String(SUPPLIERS.filter((s) => isBookable(s.certs)).length));
    expect(inHouse!.value).toBe(String(IN_HOUSE_LINES.length));
    // Clients pay nothing to use the platform (03 §3.1) — a rule, not a count.
    expect(cost!.value).toBe('£0');
  });

  it('excludes a supplier the SVS has blocked from the bookable count', () => {
    const blocked = SUPPLIERS.filter((s) => !isBookable(s.certs));
    expect(blocked.length).toBeGreaterThan(0);

    const bookable = Number(landingStats()[1]!.value);
    expect(bookable).toBe(SUPPLIERS.length - blocked.length);
    expect(bookable).toBeLessThan(SUPPLIERS.length);
  });

  it('counts only categories that have a supplier in them', () => {
    const shown = Number(landingStats()[0]!.value);
    expect(shown).toBeLessThan(CATEGORIES.length - 1); // minus the 'All' entry
    expect(categoryCounts(SUPPLIERS, CATEGORIES).every((c) => c.count > 0)).toBe(true);
  });

  it('reserves gold for the in-house counter alone (02 §motif)', () => {
    expect(landingStats().filter((s) => s.inHouse)).toHaveLength(1);
    expect(landingStats().find((s) => s.inHouse)?.label).toBe('GAC in-house listings');
  });
});
