import { create } from 'zustand';
import { INVOICES } from '../data/invoices';
import type { HireParty } from '../data/invoices';
import { persistent, session } from '../lib/storage';
import type { InvoiceDecision, LineParties } from '../lib/invoices';
import type { TierSelection } from '../lib/tier';

/**
 * App state (04_ARCHITECTURE): tier selections, tour, toasts, quote
 * acceptance — persisted via the storage adapter, never directly.
 */

/**
 * Stored decisions are read back defensively: an invoice id that no longer
 * exists, an allocation that is no longer offered, or a split missing any of
 * its lines is dropped rather than left to drive a card. A half-read split
 * matters most — it would show per-party totals that do not add up to the
 * invoice — so a split is restored only when every line is accounted for.
 */
function readInvoiceDecisions(): Record<string, InvoiceDecision> {
  const stored = persistent.get<Record<string, unknown>>('invoiceDecisions', {});
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
  const out: Record<string, InvoiceDecision> = {};
  for (const [id, value] of Object.entries(stored)) {
    const invoice = INVOICES.find((i) => i.id === id);
    if (!invoice || !value || typeof value !== 'object') continue;
    if (invoice.kind === 'split') {
      const parties = (value as { lineParties?: Record<string, unknown> }).lineParties;
      if (!parties || typeof parties !== 'object' || Array.isArray(parties)) continue;
      const isParty = (v: unknown): v is HireParty => v === 'charterer' || v === 'owner';
      if (!invoice.lines.every((l) => isParty(parties[l.id]))) continue;
      const clean: LineParties = {};
      for (const line of invoice.lines) clean[line.id] = parties[line.id] as HireParty;
      out[id] = { lineParties: clean };
      continue;
    }
    const allocationId = (value as { allocationId?: unknown }).allocationId;
    if (invoice.allocations.some((a) => a.id === allocationId)) {
      out[id] = { allocationId: allocationId as string };
    }
  }
  return out;
}

export interface Toast {
  id: number;
  message: string;
  tag?: string;
}

interface AppState {
  // Tier calculator — persisted
  tier: TierSelection;
  spend: number;
  toggleTierService(k: keyof TierSelection): void;
  setSpend(n: number): void;

  // Quote acceptance — persisted
  acceptedQuoteId: string | null;
  acceptQuote(id: string): void;
  resetQuote(): void;

  // Invoice review — persisted client decisions (allocation → matched to GA)
  invoiceDecisions: Record<string, InvoiceDecision>;
  matchInvoice(id: string, allocationId: string): void;
  /** A port disbursement settled line by line across the hire boundary. */
  matchInvoiceSplit(id: string, lineParties: LineParties): void;
  resetInvoices(): void;

  // Supplier ratings submitted on job close-out — persisted, keyed by job
  jobRatings: Record<string, number>;
  rateJob(jobId: string, stars: number): void;

  // Tour — persisted dismissal
  tourDismissed: boolean;
  tourStep: number | null;
  startTour(): void;
  nextTourStep(): void;
  prevTourStep(): void;
  dismissTour(): void;

  // Loader — once per session
  loaderSeen: boolean;
  markLoaderSeen(): void;

  // Toasts — ephemeral
  toasts: Toast[];
  pushToast(message: string, tag?: string): void;
  dropToast(id: number): void;
}

const DEFAULT_TIER: TierSelection = { agency: true, logistics: false, customs: false };
const DEFAULT_SPEND = 500_000;

let toastSeq = 1;

export const useApp = create<AppState>((set, get) => ({
  tier: persistent.get<TierSelection>('tier', DEFAULT_TIER),
  spend: persistent.get<number>('spend', DEFAULT_SPEND),
  toggleTierService(k) {
    const tier = { ...get().tier, [k]: !get().tier[k] };
    persistent.set('tier', tier);
    set({ tier });
  },
  setSpend(n) {
    persistent.set('spend', n);
    set({ spend: n });
  },

  acceptedQuoteId: persistent.get<string | null>('acceptedQuote', null),
  acceptQuote(id) {
    persistent.set('acceptedQuote', id);
    set({ acceptedQuoteId: id });
  },
  resetQuote() {
    persistent.remove('acceptedQuote');
    set({ acceptedQuoteId: null });
  },

  invoiceDecisions: readInvoiceDecisions(),
  matchInvoice(id, allocationId) {
    const invoiceDecisions = { ...get().invoiceDecisions, [id]: { allocationId } };
    persistent.set('invoiceDecisions', invoiceDecisions);
    set({ invoiceDecisions });
  },
  matchInvoiceSplit(id, lineParties) {
    const invoiceDecisions = {
      ...get().invoiceDecisions,
      [id]: { lineParties: { ...lineParties } },
    };
    persistent.set('invoiceDecisions', invoiceDecisions);
    set({ invoiceDecisions });
  },
  resetInvoices() {
    persistent.remove('invoiceDecisions');
    persistent.remove('jobRatings');
    set({ invoiceDecisions: {}, jobRatings: {} });
  },

  jobRatings: persistent.get<Record<string, number>>('jobRatings', {}),
  rateJob(jobId, stars) {
    const clamped = Math.min(5, Math.max(1, Math.round(stars)));
    const jobRatings = { ...get().jobRatings, [jobId]: clamped };
    persistent.set('jobRatings', jobRatings);
    set({ jobRatings });
  },

  tourDismissed: persistent.get<boolean>('tourDismissed', false),
  tourStep: null,
  startTour() {
    set({ tourStep: 0 });
  },
  nextTourStep() {
    const cur = get().tourStep;
    set({ tourStep: cur === null ? 0 : cur + 1 });
  },
  prevTourStep() {
    const cur = get().tourStep;
    set({ tourStep: cur === null ? 0 : Math.max(0, cur - 1) });
  },
  dismissTour() {
    persistent.set('tourDismissed', true);
    set({ tourStep: null, tourDismissed: true });
  },

  loaderSeen: session.get<boolean>('loaderSeen', false),
  markLoaderSeen() {
    session.set('loaderSeen', true);
    set({ loaderSeen: true });
  },

  toasts: [],
  pushToast(message, tag) {
    const id = toastSeq++;
    set({ toasts: [...get().toasts, { id, message, tag }] });
  },
  dropToast(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));
