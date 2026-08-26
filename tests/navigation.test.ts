import { describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import type { RouteObject } from 'react-router-dom';
import { routes } from '../src/routes';
import { RouteRedirect } from '../src/components/RouteRedirect';
import { categoryCounts } from '../src/lib/marketplace';
import { CATEGORIES, SUPPLIERS } from '../src/data/suppliers';

/**
 * The marketplace-first information architecture (26 Aug).
 *
 * GAC Connect is a marketplace first and a workflow second, and that is an
 * ordering decision that lives in exactly two places: which address `/app`
 * opens on, and where the agent desk sits. Both are easy to undo by accident
 * during an unrelated change, so both are pinned here.
 */

const appRoutes = (() => {
  const root = routes.find((r) => r.path === '/')!;
  return root.children!.find((c) => c.path === 'app')!.children!;
})();

const at = (path: string): RouteObject | undefined => appRoutes.find((r) => r.path === path);

describe('the platform front door', () => {
  it('opens /app on the marketplace, not on a work queue', () => {
    const index = appRoutes.find((r) => r.index);
    expect(index).toBeDefined();
    const el = index!.element as ReactElement<{ to: string }>;
    expect(el.type).toBe(RouteRedirect);
    expect(el.props.to).toBe('/app/marketplace');
  });

  it('keeps one canonical address for the marketplace, so links and the nav agree', () => {
    expect(at('marketplace')).toBeDefined();
    // The index redirects rather than rendering a second copy of the screen.
    expect(appRoutes.find((r) => r.index)?.element).not.toBe(at('marketplace')?.element);
  });

  it('gives the client and supplier view, and the agent desk, addresses of their own', () => {
    expect(at('dashboard')).toBeDefined();
    expect(at('internal')).toBeDefined();
  });
});

describe('marketplace category tiles', () => {
  const counts = categoryCounts(SUPPLIERS, CATEGORIES);

  it('never offers a tile that leads to the empty state', () => {
    expect(counts.length).toBeGreaterThan(0);
    for (const c of counts) expect(c.count).toBeGreaterThan(0);
  });

  it('never offers All as a tile — All is the state you are already in', () => {
    expect(counts.some((c) => c.category === 'All')).toBe(false);
  });

  it('counts what the directory would actually show for that category', () => {
    for (const { category, count } of counts) {
      expect(SUPPLIERS.filter((s) => s.category === category).length).toBe(count);
    }
  });

  it('holds the declared category order, so the grid does not reshuffle itself', () => {
    const declared = CATEGORIES.filter((c) => c !== 'All');
    const seen = counts.map((c) => c.category);
    expect(seen).toEqual(declared.filter((c) => seen.includes(c)));
  });
});
