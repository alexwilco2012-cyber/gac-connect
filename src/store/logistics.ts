import { create } from 'zustand';
import { SEED_CONSIGNMENTS } from '../data/logistics';
import { isConsignment, nextConsignmentRef, nextConsignmentStage } from '../lib/logistics';
import type { Consignment, ConsignmentForm } from '../lib/logistics';
import { stampLabel } from '../lib/crewChange';
import { persistent } from '../lib/storage';

/**
 * Consignments booked in the demo, each with the stage it has reached.
 * Persisted through the storage adapter under 'logistics.*' (never directly).
 *
 * Unlike the crew-change letters, this store seeds itself: a logistics screen
 * with no movements on it shows nothing about what the line does, so two
 * illustrative consignments are already running the first time the screen is
 * opened. "Reset demo" puts those two back rather than leaving an empty list.
 */

const KEY_CONSIGNMENTS = 'logistics.consignments';

function cloneSeed(): Consignment[] {
  return SEED_CONSIGNMENTS.map((c) => ({ ...c, form: { ...c.form } }));
}

/**
 * Persisted consignments, shape-checked entry by entry — anything malformed is
 * dropped rather than taking the screen down. A missing key means the demo has
 * not been touched yet, so the seed movements are used; a key holding an empty
 * list means the visitor deleted them, and that is respected.
 */
export function readConsignments(): Consignment[] {
  const raw = persistent.get<unknown>(KEY_CONSIGNMENTS, null);
  if (raw === null) return cloneSeed();
  return Array.isArray(raw) ? raw.filter(isConsignment) : cloneSeed();
}

interface LogisticsState {
  consignments: Consignment[];
  /** Books a movement at the first stage; returns its reference. */
  book(form: ConsignmentForm): string;
  /** Moves a consignment on one stage; the last stage holds. */
  advance(id: string): void;
  remove(id: string): void;
  reset(): void;
}

export const useLogistics = create<LogisticsState>((set, get) => ({
  consignments: readConsignments(),

  book(form) {
    const id = nextConsignmentRef(get().consignments);
    const consignment: Consignment = {
      id,
      form: { ...form },
      stage: 'Booked',
      createdAt: stampLabel(),
    };
    const consignments = [consignment, ...get().consignments];
    persistent.set(KEY_CONSIGNMENTS, consignments);
    set({ consignments });
    return id;
  },

  advance(id) {
    const consignments = get().consignments.map((c) =>
      c.id === id ? { ...c, stage: nextConsignmentStage(c.stage) } : c,
    );
    persistent.set(KEY_CONSIGNMENTS, consignments);
    set({ consignments });
  },

  remove(id) {
    const consignments = get().consignments.filter((c) => c.id !== id);
    persistent.set(KEY_CONSIGNMENTS, consignments);
    set({ consignments });
  },

  reset() {
    persistent.remove(KEY_CONSIGNMENTS);
    set({ consignments: cloneSeed() });
  },
}));
