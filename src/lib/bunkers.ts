import { isFinalStageIn, isStageOf, nextStageIn, stageToneIn } from './pipeline';

/**
 * Bunkers — a beta preview with a working enquiry behind it.
 *
 * The shape is the marketplace's: one enquiry goes out, several indicative
 * prices come back, they are compared side by side, one is taken, and the
 * delivery is confirmed on the platform. What is different about fuel, and
 * what the preview has to show rather than claim, is that a bunker price is
 * only good for a few hours and a supplier will not lift below its minimum
 * stem. Both are modelled here.
 *
 * Prices are indicative, quoted in USD per metric tonne as the trade does,
 * and generated deterministically from the enquiry reference — the same
 * enquiry always returns the same comparison, so the demo reads identically
 * every time it is shown. Nothing is ordered and no supplier is contacted.
 */

export const BUNKER_GRADES = ['VLSFO', 'LSMGO', 'MGO'] as const;
export type BunkerGrade = (typeof BUNKER_GRADES)[number];

/** What each grade is, in one line — the enquiry form explains itself. */
export const GRADE_NOTES: Record<BunkerGrade, string> = {
  VLSFO: 'Very low sulphur fuel oil, 0.50% — the main grade for a vessel outside an ECA.',
  LSMGO: 'Low sulphur marine gas oil, 0.10% — the grade a North Sea call burns.',
  MGO: 'Marine gas oil — distillate for generators, and for a vessel without a heated system.',
};

export const BUNKER_STAGES = [
  'Enquiry raised',
  'Prices returned',
  'Stem confirmed',
  'Delivered — BDN received',
] as const;
export type BunkerStage = (typeof BUNKER_STAGES)[number];

export interface BunkerEnquiryForm {
  /** Keyed to `data/vessels`, or blank for an enquiry raised off a call. */
  vesselId: string;
  port: string;
  grade: BunkerGrade;
  /** Metric tonnes, as typed. */
  quantityMt: string;
  deliveryWindow: string;
}

/** A supplier's response to one enquiry — or its reason for not quoting. */
export interface BunkerQuote {
  supplierId: string;
  supplierName: string;
  /** USD per metric tonne, indicative. */
  pricePerMt: number;
  /** How long the price holds, in hours from the enquiry. */
  validHours: number;
  earliestDelivery: string;
  note: string;
  /** Barging, mooring and pump-over, quoted as one figure in USD. */
  deliveryFeeUsd: number;
}

export interface BunkerNoOffer {
  supplierId: string;
  supplierName: string;
  reason: string;
}

export interface BunkerEnquiry {
  id: string;
  form: BunkerEnquiryForm;
  stage: BunkerStage;
  createdAt: string;
  quotes: BunkerQuote[];
  noOffers: BunkerNoOffer[];
  /** Set once a price is taken — the stem the vessel is booked on. */
  acceptedSupplierId?: string;
}

/** A bunker supplier in this preview. Fictional, and local to the beta screen. */
export interface BunkerSupplier {
  id: string;
  name: string;
  ports: readonly string[];
  /** Smallest stem the supplier will lift, in metric tonnes. */
  minStemMt: number;
  /** USD per tonne against the grade's base price — where this supplier sits. */
  offsetUsd: Record<BunkerGrade, number>;
  validHours: number;
  earliestDelivery: string;
  deliveryFeeUsd: number;
  note: string;
}

/* ----------------------------------------------------------------- Pricing */

/**
 * Indicative base prices, USD per metric tonne. Illustrative figures for a
 * demo — they are not a market quote and the screen says so.
 */
export const BASE_PRICE_USD: Record<BunkerGrade, number> = {
  VLSFO: 528,
  LSMGO: 694,
  MGO: 712,
};

/**
 * Small, stable spread per enquiry, so one demo does not read like the last.
 * Half-dollar steps, because a bunker price is quoted to the cent and a
 * column of round numbers looks like something a machine made up.
 */
function wobble(seed: string, supplierId: string): number {
  const text = `${seed}:${supplierId}`;
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) % 100_000;
  return ((hash % 25) - 12) / 2;
}

export function priceFor(supplier: BunkerSupplier, grade: BunkerGrade, enquiryRef: string): number {
  return BASE_PRICE_USD[grade] + supplier.offsetUsd[grade] + wobble(enquiryRef, supplier.id);
}

/** Fuel plus the delivery fee — what the stem actually costs. */
export function totalUsd(quote: BunkerQuote, quantityMt: number): number {
  return quote.pricePerMt * quantityMt + quote.deliveryFeeUsd;
}

/**
 * Who can quote and who cannot, for one enquiry. A supplier that does not
 * serve the port is simply absent; one that serves it but will not lift the
 * stem says so, because "no reply" and "below our minimum" are different
 * answers and only one of them is worth chasing.
 */
export function collectQuotes(
  suppliers: readonly BunkerSupplier[],
  form: BunkerEnquiryForm,
  enquiryRef: string,
): { quotes: BunkerQuote[]; noOffers: BunkerNoOffer[] } {
  const quantity = Number(form.quantityMt);
  const quotes: BunkerQuote[] = [];
  const noOffers: BunkerNoOffer[] = [];

  for (const supplier of suppliers) {
    if (!supplier.ports.includes(form.port)) continue;
    if (Number.isFinite(quantity) && quantity < supplier.minStemMt) {
      noOffers.push({
        supplierId: supplier.id,
        supplierName: supplier.name,
        reason: `Below their minimum stem of ${supplier.minStemMt} mt`,
      });
      continue;
    }
    quotes.push({
      supplierId: supplier.id,
      supplierName: supplier.name,
      pricePerMt: priceFor(supplier, form.grade, enquiryRef),
      validHours: supplier.validHours,
      earliestDelivery: supplier.earliestDelivery,
      note: supplier.note,
      deliveryFeeUsd: supplier.deliveryFeeUsd,
    });
  }

  return { quotes: quotes.sort((a, b) => a.pricePerMt - b.pricePerMt), noOffers };
}

/** The cheapest stem, all in. Null when nobody quoted. */
export function bestQuote(quotes: readonly BunkerQuote[], quantityMt: number): BunkerQuote | null {
  if (quotes.length === 0) return null;
  return [...quotes].sort((a, b) => totalUsd(a, quantityMt) - totalUsd(b, quantityMt))[0]!;
}

/**
 * Delivery slots are written the way a port writes them — 'Fri 06:00'. The
 * demo week starts on its Thursday, so the days sort forward from today
 * rather than alphabetically ('Fri' before 'Sat' before 'Thu' is nonsense to
 * everyone except a computer). An unrecognised label sorts last.
 */
const DAY_ORDER = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'] as const;

export function deliveryRank(label: string): number {
  const match = /^([A-Za-z]{3})\D*(\d{1,2}):(\d{2})/.exec(label.trim());
  if (!match) return Number.POSITIVE_INFINITY;
  const day = DAY_ORDER.indexOf(match[1] as (typeof DAY_ORDER)[number]);
  if (day === -1) return Number.POSITIVE_INFINITY;
  return day * 1440 + Number(match[2]) * 60 + Number(match[3]);
}

/** The soonest barge. Null when nobody quoted. */
export function soonestQuote(quotes: readonly BunkerQuote[]): BunkerQuote | null {
  if (quotes.length === 0) return null;
  return [...quotes].sort(
    (a, b) => deliveryRank(a.earliestDelivery) - deliveryRank(b.earliestDelivery),
  )[0]!;
}

/**
 * The spread between cheapest and dearest, all in — the figure that says
 * whether the comparison was worth running.
 */
export function spreadUsd(quotes: readonly BunkerQuote[], quantityMt: number): number {
  if (quotes.length < 2) return 0;
  const totals = quotes.map((q) => totalUsd(q, quantityMt));
  return Math.max(...totals) - Math.min(...totals);
}

/** '$512.00' / '$61,440' — bunker prices are USD by trade convention. */
export function usd(value: number, decimals = 0): string {
  return `$${value.toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/* -------------------------------------------------------------- Validation */

function blank(v: unknown): boolean {
  return typeof v !== 'string' || v.trim() === '';
}

function positiveNumber(v: string): boolean {
  const n = Number(v.trim());
  return Number.isFinite(n) && n > 0;
}

/** Missing or invalid fields, as human labels — the same pattern as customs. */
export function validateEnquiry(form: BunkerEnquiryForm): string[] {
  const problems: string[] = [];
  if (blank(form.port)) problems.push('Port');
  if (blank(form.quantityMt)) problems.push('Quantity (mt)');
  else if (!positiveNumber(form.quantityMt)) problems.push('Quantity must be a number above zero');
  if (blank(form.deliveryWindow)) problems.push('Delivery window');
  return problems;
}

/* ------------------------------------------------------------------ Stages */

export function nextBunkerStage(stage: string): BunkerStage {
  return nextStageIn(BUNKER_STAGES, stage);
}

export function isDelivered(stage: string): boolean {
  return isFinalStageIn(BUNKER_STAGES, stage);
}

export function bunkerStageTone(stage: string): 'info' | 'verified' {
  return stageToneIn(BUNKER_STAGES, stage);
}

/**
 * The simulate button at each stage. Confirming a stem is a decision, not a
 * simulation, so it has no button here — it happens when a price is taken.
 */
export function bunkerAction(stage: string): { label: string; steps: number } | null {
  switch (stage as BunkerStage) {
    case 'Enquiry raised':
      return { label: 'Simulate: the suppliers price it', steps: 1 };
    case 'Stem confirmed':
      return { label: 'Simulate: delivered, BDN received', steps: 1 };
    default:
      return null;
  }
}

/** 'BNK-3042' — sequential from the highest reference already held. */
export function nextBunkerRef(existing: readonly BunkerEnquiry[]): string {
  const numbers = existing
    .map((e) => Number(/^BNK-(\d+)$/.exec(e.id)?.[1] ?? NaN))
    .filter((n) => Number.isFinite(n));
  const top = numbers.length ? Math.max(...numbers) : 3041;
  return `BNK-${top + 1}`;
}

export function openEnquiries(enquiries: readonly BunkerEnquiry[]): BunkerEnquiry[] {
  return enquiries.filter((e) => !isDelivered(e.stage));
}

/* ------------------------------------------------------------------ Guards */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function isBunkerEnquiryForm(v: unknown): v is BunkerEnquiryForm {
  if (!isRecord(v)) return false;
  return (
    typeof v.vesselId === 'string' &&
    typeof v.port === 'string' &&
    typeof v.quantityMt === 'string' &&
    typeof v.deliveryWindow === 'string' &&
    (BUNKER_GRADES as readonly string[]).includes(v.grade as string)
  );
}

function isQuote(v: unknown): v is BunkerQuote {
  if (!isRecord(v)) return false;
  return (
    typeof v.supplierId === 'string' &&
    typeof v.supplierName === 'string' &&
    typeof v.pricePerMt === 'number' &&
    typeof v.validHours === 'number' &&
    typeof v.earliestDelivery === 'string' &&
    typeof v.note === 'string' &&
    typeof v.deliveryFeeUsd === 'number'
  );
}

function isNoOffer(v: unknown): v is BunkerNoOffer {
  if (!isRecord(v)) return false;
  return (
    typeof v.supplierId === 'string' &&
    typeof v.supplierName === 'string' &&
    typeof v.reason === 'string'
  );
}

/** Shape guard for a stored enquiry — malformed entries are dropped. */
export function isBunkerEnquiry(v: unknown): v is BunkerEnquiry {
  if (!isRecord(v)) return false;
  if (typeof v.id !== 'string' || typeof v.createdAt !== 'string') return false;
  if (!Array.isArray(v.quotes) || !v.quotes.every(isQuote)) return false;
  if (!Array.isArray(v.noOffers) || !v.noOffers.every(isNoOffer)) return false;
  if (v.acceptedSupplierId !== undefined && typeof v.acceptedSupplierId !== 'string') return false;
  return isBunkerEnquiryForm(v.form) && isStageOf(BUNKER_STAGES, v.stage);
}
