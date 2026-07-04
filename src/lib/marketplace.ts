import type { Supplier } from '../data/suppliers';

/** Marketplace ordering rules (01 §B3, 03 §3.2). */

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
