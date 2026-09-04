import { CATEGORIES, IN_HOUSE_LINES, SUPPLIERS } from '../data/suppliers';
import { categoryCounts } from './marketplace';
import { isBookable } from './svs';

/**
 * The landing page's proof counters, derived from the same data and the same
 * two functions the marketplace hero uses (`categoryCounts`, `isBookable`).
 *
 * Read, never written down: the marketing page and the platform's front door
 * quote the same four numbers, so a supplier added to `03 §3.4` or a
 * certificate lapsing moves both at once. A hard-coded "18 suppliers" on the
 * landing page would be wrong the first time either changes.
 */
export interface LandingStat {
  value: string;
  label: string;
  /** Gold is reserved for in-house identity (02 §motif) — one counter only. */
  inHouse?: boolean;
}

export function landingStats(): LandingStat[] {
  return [
    {
      value: String(categoryCounts(SUPPLIERS, CATEGORIES).length),
      label: 'service categories',
    },
    {
      value: String(SUPPLIERS.filter((s) => isBookable(s.certs)).length),
      label: 'suppliers bookable today',
    },
    {
      value: String(IN_HOUSE_LINES.length),
      label: 'GAC in-house listings',
      inHouse: true,
    },
    // Not derived: the business rule itself (03 §3.1 — clients pay nothing).
    { value: '£0', label: 'for clients to use it' },
  ];
}
