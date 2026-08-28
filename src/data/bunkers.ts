import type { BunkerEnquiry, BunkerEnquiryForm, BunkerGrade, BunkerSupplier } from '../lib/bunkers';
import { collectQuotes } from '../lib/bunkers';

/**
 * Bunkers — copy and demo data for the beta preview.
 *
 * The suppliers are fictional and local to this screen: bunker supply is not
 * a marketplace category today, so nothing here should imply a vetted
 * supplier already sits behind it. Prices are indicative, generated from the
 * enquiry reference, and quoted in USD per metric tonne as the trade does.
 */

export const BUNKER_INTRO =
  'A working preview. Raise an enquiry against a vessel and the platform prices it with the suppliers that lift at that port — side by side, all in, with the validity window each price holds for. Take one and the stem is confirmed on the platform, delivery and bunker delivery note included.';

/** Illustrative, and it says so wherever a price appears. */
export const BUNKER_NOTICE =
  'Illustrative — the suppliers and the prices are fictional, no market data sits behind them, and nothing is ordered.';

/** Why the vessel picker fills the form in — the first thing the preview demonstrates. */
export const PREFILL_NOTE =
  'Pick a vessel and the enquiry fills itself in: the port comes off the call, the grade and the quantity off the last stem. An enquiry that starts from what the vessel actually burns is one fewer thing to get wrong.';

/** The two things that make a fuel price different from a crane price. */
export const VALIDITY_NOTE =
  'A bunker price holds for hours, not days, and a supplier will not lift below its minimum stem. Both are on the comparison, because a price you cannot take is not a price.';

/** Ports where the preview has supply. */
export const BUNKER_PORTS = ['Aberdeen', 'Peterhead', 'Montrose'] as const;

/** The last stem each vessel took — the consumption history the enquiry pre-fills from. */
export const LAST_STEM: Record<string, { grade: BunkerGrade; quantityMt: number; when: string }> = {
  'caledonian-star': { grade: 'LSMGO', quantityMt: 180, when: 'Aberdeen, 26 Jul' },
  boreal: { grade: 'MGO', quantityMt: 90, when: 'Peterhead, 3 Aug' },
  'granite-coast': { grade: 'VLSFO', quantityMt: 320, when: 'Aberdeen, 11 Aug' },
};

/**
 * Bunker suppliers in this preview — four, spread so that a comparison has
 * something to show: one cheap barge that is slow, one dearer that is quick,
 * and one whose minimum stem rules it out of a small enquiry.
 */
export const BUNKER_SUPPLIERS: BunkerSupplier[] = [
  {
    id: 'granite-bunkering',
    name: 'Granite Bunkering Ltd',
    ports: ['Aberdeen', 'Peterhead'],
    minStemMt: 50,
    offsetUsd: { VLSFO: -6, LSMGO: -4, MGO: -3 },
    validHours: 6,
    earliestDelivery: 'Fri 06:00',
    deliveryFeeUsd: 1850,
    note: 'Barge alongside; pump rate 120 mt/hr.',
  },
  {
    id: 'north-sea-fuel',
    name: 'North Sea Fuel Supply',
    ports: ['Aberdeen', 'Montrose'],
    minStemMt: 150,
    offsetUsd: { VLSFO: -14, LSMGO: -9, MGO: -8 },
    validHours: 4,
    earliestDelivery: 'Sat 08:00',
    deliveryFeeUsd: 1400,
    note: 'Cheapest per tonne on a full stem; next barge slot is Saturday.',
  },
  {
    id: 'harbour-oil',
    name: 'Harbour Oil Services',
    ports: ['Aberdeen', 'Peterhead', 'Montrose'],
    minStemMt: 20,
    offsetUsd: { VLSFO: 11, LSMGO: 7, MGO: 6 },
    validHours: 8,
    earliestDelivery: 'Thu 18:00',
    deliveryFeeUsd: 2100,
    note: 'Road tanker as well as barge — takes the small stems nobody else will.',
  },
  {
    id: 'buchan-marine-fuels',
    name: 'Buchan Marine Fuels',
    ports: ['Peterhead', 'Montrose'],
    minStemMt: 40,
    offsetUsd: { VLSFO: 4, LSMGO: 2, MGO: 1 },
    validHours: 6,
    earliestDelivery: 'Fri 12:00',
    deliveryFeeUsd: 1650,
    note: 'Local barge; sulphur certificate issued with the BDN.',
  },
];

export const EMPTY_ENQUIRY: BunkerEnquiryForm = {
  vesselId: '',
  port: 'Aberdeen',
  grade: 'LSMGO',
  quantityMt: '',
  deliveryWindow: '',
};

/** The demo-fill button — a plausible enquiry, obviously an example. */
export const DEMO_ENQUIRY: BunkerEnquiryForm = {
  vesselId: 'caledonian-star',
  port: 'Aberdeen',
  grade: 'LSMGO',
  quantityMt: '180',
  deliveryWindow: 'Fri 06:00–12:00, alongside Regent Quay',
};

const SEED_FORM: BunkerEnquiryForm = {
  vesselId: 'granite-coast',
  port: 'Aberdeen',
  grade: 'VLSFO',
  quantityMt: '320',
  deliveryWindow: 'Fri 14:00–20:00, alongside',
};

const SEED_REF = 'BNK-3041';
const seeded = collectQuotes(BUNKER_SUPPLIERS, SEED_FORM, SEED_REF);

/**
 * One enquiry already priced when the visitor arrives, so the comparison is
 * on screen without anyone having to fill a form first — the same reason the
 * logistics and customs screens are seeded.
 */
export const SEED_ENQUIRIES: BunkerEnquiry[] = [
  {
    id: SEED_REF,
    form: SEED_FORM,
    stage: 'Prices returned',
    createdAt: 'Thu 20 Aug · 07:40',
    quotes: seeded.quotes,
    noOffers: seeded.noOffers,
  },
];
