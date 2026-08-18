/**
 * Service terms shown with a listing, a quote, and the request — the point
 * the 17 Aug review raised: FLT and crane work is priced for the booked window,
 * so if the job overruns the extra time is not inside the quoted price. The
 * price is subject to change and the supplier's T&Cs travel with every quote.
 * Category-level; a supplier's own `bookingNote` (e.g. a hotel's availability
 * caveat) sits alongside, not instead.
 */

/** Categories priced per booked window, where an overrun is charged on top. */
export const OVERRUN_CATEGORIES = ['Cranes', 'FLT'] as const;

export type OverrunCategory = (typeof OVERRUN_CATEGORIES)[number];

/** Full clause — shown on the listing, the profile, the request, and the agreement. */
export const OVERRUN_TERMS =
  'The price covers the booked window only. If the job overruns — standby, waiting time, or extended hire — the additional time is not included in the quoted price and is charged at the supplier’s published rates. Prices are subject to change; the supplier’s terms and conditions are included with every quote.';

/** One-line form — for quote cards and tight spaces. */
export const OVERRUN_TERMS_SHORT =
  'Overrun not included in price · subject to change · T&Cs included';

export function isOverrunCategory(category: string): category is OverrunCategory {
  return (OVERRUN_CATEGORIES as readonly string[]).includes(category);
}

/** The terms clause for a category, or undefined when none applies. */
export function serviceTermsFor(category: string): string | undefined {
  return isOverrunCategory(category) ? OVERRUN_TERMS : undefined;
}
