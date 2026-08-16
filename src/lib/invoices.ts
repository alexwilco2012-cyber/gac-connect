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

export interface InvoiceDecision {
  allocationId: string;
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

/** Human line for the countdown chip. */
export function windowLabel(receivedDaysAgo: number, windowDays = REVIEW_WINDOW_DAYS): string {
  const left = daysLeft(receivedDaysAgo, windowDays);
  if (left === 0) return 'Window closed';
  if (left === 1) return '1 day left';
  return `${left} days left`;
}
