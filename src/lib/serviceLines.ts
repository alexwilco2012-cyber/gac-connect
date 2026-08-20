import { SERVICE_LINES } from '../data/serviceLines';
import type { ServiceLine, ServiceLineId } from '../data/serviceLines';
import type { Supplier } from '../data/suppliers';
import { deriveStatus, isBookable } from './svs';

/**
 * Service-line rules. The lines describe what a client can ask for; the
 * marketplace describes who is vetted to do it. These helpers are the join
 * between the two, and the guarantee that no marketplace category is orphaned
 * from the navigation (`tests/serviceLines.test.ts` asserts full coverage —
 * a category with no line would be reachable only by scrolling the directory).
 */

/** The line that coordinates a marketplace category, or null for 'All'. */
export function lineForCategory(category: string): ServiceLineId | null {
  const line = SERVICE_LINES.find((l) => l.categories.includes(category));
  return line ? line.id : null;
}

/**
 * The line's categories that actually have a supplier behind them. A category
 * kept for a beta service (Bunkers) or held for future data would otherwise
 * render a chip that filters to an empty directory.
 */
export function stockedCategories(line: ServiceLine, suppliers: Supplier[]): string[] {
  return line.categories.filter((c) => suppliers.some((s) => s.category === c));
}

/**
 * Suppliers in this line, best first: bookable before blocked, then rating,
 * then ratings submitted. Promotion is deliberately ignored — the hub is a
 * shortcut into the line, and paid placement belongs on the directory where it
 * is labelled as such.
 */
export function suppliersInLine(line: ServiceLine, suppliers: Supplier[]): Supplier[] {
  return suppliers
    .filter((s) => line.categories.includes(s.category))
    .sort((a, b) => {
      const bookable = Number(isBookable(b.certs)) - Number(isBookable(a.certs));
      if (bookable !== 0) return bookable;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.ratingCount - a.ratingCount;
    });
}

/** How many suppliers in the line are bookable today — the hub's supplier count. */
export function bookableCount(line: ServiceLine, suppliers: Supplier[]): number {
  return suppliersInLine(line, suppliers).filter((s) => deriveStatus(s.certs) !== 'blocked').length;
}

/** The section a URL asks for, falling back to the line's first section. */
export function resolveLineSection(line: ServiceLine, v: string | null | undefined): string | null {
  const sections = line.sections ?? [];
  if (sections.length === 0) return null;
  const match = sections.find((s) => s.id === v);
  return match ? match.id : sections[0]!.id;
}

/**
 * The line's one-line discount sentence. Deliberately says what the percentage
 * applies to: GAC's own charges, not the network's — the hub marks every
 * service `gac` or `network` for the same reason.
 */
export function tierSentence(line: ServiceLine): string {
  if (line.tierPct === null) {
    return `${line.name} is included at any tier — booking it costs the client nothing extra.`;
  }
  return `Booking ${line.name} qualifies the client for the ${line.tierPct}% tier, applied to GAC in-house charges on the platform. The tier is non-cumulative: the highest single tier held applies.`;
}
