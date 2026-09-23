import { create } from 'zustand';
import { stampLabel } from '../lib/crewChange';
import { persistent } from '../lib/storage';

/**
 * Quotes the demo supplier sends from its dashboard inbox (live dashboards,
 * 23 Sep), keyed by request id. Persisted through the storage adapter under
 * 'supplierDesk.*' (never directly) and cleared by Reset demo, which removes
 * the key rather than writing an empty record back.
 *
 * The inbox itself is seed data (`data/supplierDesk`): this store only records
 * what was sent, so a sent request shows its price and the pipeline counters
 * move.
 */

const KEY_QUOTES = 'supplierDesk.quotes';

export interface SentQuote {
  amountGbp: number;
  leadTime: string;
  validity: string;
  note: string;
  sentAt: string;
}

/** Shape guard for a stored quote — malformed entries are dropped. */
export function isSentQuote(v: unknown): v is SentQuote {
  if (typeof v !== 'object' || v === null) return false;
  const q = v as Record<string, unknown>;
  return (
    typeof q.amountGbp === 'number' &&
    Number.isFinite(q.amountGbp) &&
    typeof q.leadTime === 'string' &&
    typeof q.validity === 'string' &&
    typeof q.note === 'string' &&
    typeof q.sentAt === 'string'
  );
}

/** Persisted quotes, shape-checked one by one; a missing key means none sent. */
export function readQuotes(): Record<string, SentQuote> {
  const raw = persistent.get<unknown>(KEY_QUOTES, null);
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw).filter(([, q]) => isSentQuote(q))) as Record<
    string,
    SentQuote
  >;
}

interface SupplierDeskState {
  quotes: Record<string, SentQuote>;
  sendQuote(requestId: string, q: Omit<SentQuote, 'sentAt'>): void;
  reset(): void;
}

export const useSupplierDesk = create<SupplierDeskState>((set, get) => ({
  quotes: readQuotes(),

  sendQuote(requestId, q) {
    const quotes = {
      ...get().quotes,
      [requestId]: { ...q, note: q.note.trim(), sentAt: stampLabel() },
    };
    persistent.set(KEY_QUOTES, quotes);
    set({ quotes });
  },

  reset() {
    persistent.remove(KEY_QUOTES);
    set({ quotes: {} });
  },
}));
