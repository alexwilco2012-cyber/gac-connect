import { create } from 'zustand';
import { BUNKER_SUPPLIERS, SEED_ENQUIRIES } from '../data/bunkers';
import { collectQuotes, isBunkerEnquiry, nextBunkerRef, nextBunkerStage } from '../lib/bunkers';
import type { BunkerEnquiry, BunkerEnquiryForm } from '../lib/bunkers';
import { stampLabel } from '../lib/crewChange';
import { persistent } from '../lib/storage';

/**
 * Bunker enquiries raised in the demo, each with the prices that came back and
 * the stage it has reached. Persisted through the storage adapter under
 * 'bunkers.*' (never directly) and seeded on first open, like logistics and
 * customs.
 *
 * The prices are generated once, when the enquiry is raised, and stored with
 * it. A price that changed every time the screen re-rendered would be a worse
 * lie than a fixed one: a quote is a thing a supplier said at a moment, and
 * the validity window on it only means something if the number holds still.
 */

const KEY_ENQUIRIES = 'bunkers.enquiries';

function cloneSeed(): BunkerEnquiry[] {
  return SEED_ENQUIRIES.map((e) => ({
    ...e,
    form: { ...e.form },
    quotes: e.quotes.map((q) => ({ ...q })),
    noOffers: e.noOffers.map((n) => ({ ...n })),
  }));
}

/** Persisted enquiries, shape-checked one by one; a missing key means an untouched demo. */
export function readEnquiries(): BunkerEnquiry[] {
  const raw = persistent.get<unknown>(KEY_ENQUIRIES, null);
  if (raw === null) return cloneSeed();
  return Array.isArray(raw) ? raw.filter(isBunkerEnquiry) : cloneSeed();
}

interface BunkersState {
  enquiries: BunkerEnquiry[];
  /** Raises an enquiry and prices it against the suppliers at that port. */
  raise(form: BunkerEnquiryForm): string;
  /** Takes one supplier's price — the stem is confirmed on that quote. */
  accept(id: string, supplierId: string): void;
  advance(id: string, steps?: number): void;
  reset(): void;
}

export const useBunkers = create<BunkersState>((set, get) => ({
  enquiries: readEnquiries(),

  raise(form) {
    const id = nextBunkerRef(get().enquiries);
    const { quotes, noOffers } = collectQuotes(BUNKER_SUPPLIERS, form, id);
    const enquiry: BunkerEnquiry = {
      id,
      form: { ...form },
      stage: 'Enquiry raised',
      createdAt: stampLabel(),
      quotes,
      noOffers,
    };
    const enquiries = [enquiry, ...get().enquiries];
    persistent.set(KEY_ENQUIRIES, enquiries);
    set({ enquiries });
    return id;
  },

  accept(id, supplierId) {
    const enquiries = get().enquiries.map((e) => {
      if (e.id !== id) return e;
      // Only a priced enquiry can be taken, and only on a price that came back.
      if (e.stage !== 'Prices returned') return e;
      if (!e.quotes.some((q) => q.supplierId === supplierId)) return e;
      return { ...e, acceptedSupplierId: supplierId, stage: 'Stem confirmed' as const };
    });
    persistent.set(KEY_ENQUIRIES, enquiries);
    set({ enquiries });
  },

  advance(id, steps = 1) {
    const enquiries = get().enquiries.map((e) => {
      if (e.id !== id) return e;
      let stage: string = e.stage;
      for (let i = 0; i < Math.max(1, steps); i += 1) stage = nextBunkerStage(stage);
      return { ...e, stage: stage as BunkerEnquiry['stage'] };
    });
    persistent.set(KEY_ENQUIRIES, enquiries);
    set({ enquiries });
  },

  reset() {
    persistent.remove(KEY_ENQUIRIES);
    set({ enquiries: cloneSeed() });
  },
}));
