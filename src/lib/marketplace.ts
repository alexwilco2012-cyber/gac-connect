import type { ListingFact, Supplier } from '../data/suppliers';

/** Marketplace ordering rules (01 §B3, 03 §3.2). */

/**
 * Fact chips for a listing row and profile header. A supplier's explicit
 * `facts` win; a Launches supplier derives them from its launch details
 * (port · max capacity · freight) so the marketplace and the Launches tab
 * always say the same thing.
 */
export function listingFacts(supplier: Supplier): ListingFact[] {
  if (supplier.facts && supplier.facts.length > 0) return supplier.facts;
  const l = supplier.launch;
  if (!l) return [];
  return [
    { label: 'Port', value: l.port },
    { label: 'Max capacity', value: `${l.maxPassengers} passengers` },
    { label: 'Freight', value: l.freightIncluded ? 'Included' : 'Not included' },
  ];
}

export type SortKey = 'rating' | 'esg' | 'name';

const ESG_RANK = { A: 0, B: 1, C: 2 } as const;

export function sortSuppliers(list: Supplier[], sort: SortKey): Supplier[] {
  const sorted = [...list];
  if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating);
  if (sort === 'esg') sorted.sort((a, b) => ESG_RANK[a.esg] - ESG_RANK[b.esg]);
  if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
  return sorted;
}

/**
 * Promoted suppliers sort first among third-party results — within the
 * third-party group only, never above in-house, and blocked suppliers stay
 * visible (transparency) but unbookable (the gate lives in svs.isBookable).
 */
export function orderThirdParty(list: Supplier[], sort: SortKey): Supplier[] {
  const promoted = sortSuppliers(
    list.filter((s) => s.promoted),
    sort,
  );
  const rest = sortSuppliers(
    list.filter((s) => !s.promoted),
    sort,
  );
  return [...promoted, ...rest];
}
