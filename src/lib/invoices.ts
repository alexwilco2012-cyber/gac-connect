import type { DisbursementLine, HireParty } from '../data/invoices';
import type { Plan } from '../data/suppliers';
import { commissionDue } from './commission';

/**
 * Invoice review — the loop that sits behind service confirmation (v12 §5,
 * Accountability & Agreements). When a supplier invoice arrives, the platform
 * routes it to the client BEFORE anything matches: the client has seven days
 * to allocate it to the correct billing party and apply splits. If the window
 * passes without action, the invoice matches to GA as it stands. Changes
 * requested after matching carry an administrative fee at published rates.
 * Supplier commission is deducted at the moment of matching, so collection
 * needs no separate process.
 */

export const REVIEW_WINDOW_DAYS = 7;

export type InvoiceState = 'awaiting' | 'matched' | 'auto-matched';

/** The client picked one billing party for the whole invoice. */
export interface AllocationDecision {
  allocationId: string;
}

/** Which side of the charter carries each line of a port disbursement. */
export type LineParties = Record<string, HireParty>;

/** The client settled a disbursement line by line across the hire boundary. */
export interface SplitDecision {
  lineParties: LineParties;
}

export type InvoiceDecision = AllocationDecision | SplitDecision;

export function isSplitDecision(d: InvoiceDecision | undefined): d is SplitDecision {
  return !!d && 'lineParties' in d;
}

/** Whole days remaining in the client review window; never negative. */
export function daysLeft(receivedDaysAgo: number, windowDays = REVIEW_WINDOW_DAYS): number {
  return Math.max(0, windowDays - receivedDaysAgo);
}

/**
 * State derivation: a client decision always wins; otherwise the window
 * decides — open means awaiting, closed means the invoice matched to GA as it
 * stood (auto-matched).
 */
export function invoiceState(
  receivedDaysAgo: number,
  decision: InvoiceDecision | undefined,
  windowDays = REVIEW_WINDOW_DAYS,
): InvoiceState {
  if (decision) return 'matched';
  return daysLeft(receivedDaysAgo, windowDays) === 0 ? 'auto-matched' : 'awaiting';
}

/** Once matched (by the client or by the window), changes carry the admin fee. */
export function changeCarriesAdminFee(state: InvoiceState): boolean {
  return state !== 'awaiting';
}

/** Commission deducted at matching — the supplier's tier band on the invoice value. */
export function commissionAtMatching(amountGBP: number, plan: Plan, founder = false): number {
  return commissionDue(amountGBP, plan, founder);
}

/**
 * The split a charter party implies: every cost on the side that owned the
 * vessel when it fell. The client can move any line before the invoice matches;
 * this is only where each one starts.
 */
export function defaultLineParties(lines: DisbursementLine[]): LineParties {
  const out: LineParties = {};
  for (const line of lines) out[line.id] = line.defaultParty;
  return out;
}

/**
 * What each side pays under a given split, and the whole. The total is summed
 * from the lines rather than carried separately, so the two halves always add
 * up to the invoice however the lines have been moved. A line with no party
 * recorded falls to the charterer rather than dropping out of the totals.
 */
export function splitTotals(
  lines: DisbursementLine[],
  parties: LineParties,
): { charterer: number; owner: number; total: number } {
  const totals = { charterer: 0, owner: 0, total: 0 };
  for (const line of lines) {
    const party: HireParty = parties[line.id] === 'owner' ? 'owner' : 'charterer';
    totals[party] += line.amountGBP;
    totals.total += line.amountGBP;
  }
  return totals;
}

/**
 * True when the client has moved a line off the charter terms — the one thing
 * an agent checking a disbursement needs to spot at a glance.
 */
export function movedOffCharterTerms(line: DisbursementLine, parties: LineParties): boolean {
  return parties[line.id] !== undefined && parties[line.id] !== line.defaultParty;
}

/** Human line for the countdown chip. */
export function windowLabel(receivedDaysAgo: number, windowDays = REVIEW_WINDOW_DAYS): string {
  const left = daysLeft(receivedDaysAgo, windowDays);
  if (left === 0) return 'Window closed';
  if (left === 1) return '1 day left';
  return `${left} days left`;
}
