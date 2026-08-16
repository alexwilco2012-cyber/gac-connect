import { create } from 'zustand';
import { persistent, session } from '../lib/storage';
import type { InvoiceDecision } from '../lib/invoices';
import type { TierSelection } from '../lib/tier';

/**
 * App state (04_ARCHITECTURE): tier selections, tour, toasts, quote
 * acceptance — persisted via the storage adapter, never directly.
 */

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
  resetInvoices(): void;

  // Supplier ratings submitted on job close-out — persisted, keyed by job
  jobRatings: Record<string, number>;
  rateJob(jobId: string, stars: number): void;

  // Tour — persisted dismissal
  tourDismissed: boolean;
  tourStep: number | null;
  startTour(): void;
  nextTourStep(): void;
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

  invoiceDecisions: persistent.get<Record<string, InvoiceDecision>>('invoiceDecisions', {}),
  matchInvoice(id, allocationId) {
    const invoiceDecisions = { ...get().invoiceDecisions, [id]: { allocationId } };
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
