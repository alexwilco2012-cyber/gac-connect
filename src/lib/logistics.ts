import { isStageOf, isFinalStageIn, nextStageIn, stageReachedIn, stageToneIn } from './pipeline';

/**
 * Logistics — a consignment moving to a vessel, from the collection to the
 * quay. The point the screen makes is that a movement is booked *against a
 * port call*, so the platform already knows the vessel, the berth and the day
 * the cargo is actually needed.
 *
 * Everything here is illustrative: the stages are advanced by a labelled
 * "simulate" button, not by a carrier feed.
 */

export const CONSIGNMENT_STAGES = [
  'Booked',
  'Collected',
  'In transit',
  'At GAC warehouse',
  'Delivered to quay',
] as const;
export type ConsignmentStage = (typeof CONSIGNMENT_STAGES)[number];

/** How the cargo travels on its long leg. */
export const CONSIGNMENT_MODES = ['Road', 'Air', 'Sea'] as const;
export type ConsignmentMode = (typeof CONSIGNMENT_MODES)[number];

export interface ConsignmentForm {
  description: string;
  origin: string;
  deliveryPoint: string;
  vesselId: string;
  mode: ConsignmentMode;
  /** Free text — the client copies the date off the supplier's note. */
  readyDate: string;
  pieces: string;
  weightKg: string;
  /**
   * Moving from outside the UK, so the consignment needs a customs entry. The
   * flag is what links a movement to the Customs line — the 4% and the 7% tier
   * meeting on one job.
   */
  fromOutsideUk: boolean;
}

export interface Consignment {
  id: string;
  form: ConsignmentForm;
  stage: ConsignmentStage;
  createdAt: string;
  /**
   * When the freight is due at its delivery point — 'Fri 14:00'. Shared with
   * everything booked against it (the forklift follows it). Optional because
   * entries stored by an older build have none.
   */
  eta?: string;
  /** The needed-by time a forklift was requested for, once it has been. */
  fltRequestedFor?: string;
  /** The client ticked "Confirm for this call" against the EORI on record. */
  eoriConfirmed?: boolean;
}

export function nextConsignmentStage(stage: string): ConsignmentStage {
  return nextStageIn(CONSIGNMENT_STAGES, stage);
}

export function isConsignmentDelivered(stage: string): boolean {
  return isFinalStageIn(CONSIGNMENT_STAGES, stage);
}

export function consignmentStageReached(current: string, stage: ConsignmentStage): boolean {
  return stageReachedIn(CONSIGNMENT_STAGES, current, stage);
}

export function consignmentStageTone(stage: string): 'info' | 'verified' {
  return stageToneIn(CONSIGNMENT_STAGES, stage);
}

/**
 * The demo's simulate button — what GAC or the haulier does next, in the words
 * the client would hear on the phone. Null once the cargo is on the quay.
 */
export function consignmentAction(stage: string): string | null {
  switch (stage as ConsignmentStage) {
    case 'Booked':
      return 'Simulate: haulier collects';
    case 'Collected':
      return 'Simulate: cargo on the road';
    case 'In transit':
      return 'Simulate: received into the GAC warehouse';
    case 'At GAC warehouse':
      return 'Simulate: released to the berth';
    default:
      return null;
  }
}

const REQUIRED: [keyof ConsignmentForm, string][] = [
  ['description', 'What is moving'],
  ['origin', 'Collection from'],
  ['deliveryPoint', 'Delivery point'],
  ['vesselId', 'Vessel'],
  ['readyDate', 'Ready for collection'],
  ['pieces', 'Pieces'],
  ['weightKg', 'Gross weight (kg)'],
];

function blank(v: unknown): boolean {
  return typeof v !== 'string' || v.trim() === '';
}

/** A positive number, written plainly — '400', '400.5'. Blank is handled as missing. */
function positiveNumber(v: string): boolean {
  const n = Number(v.trim());
  return Number.isFinite(n) && n > 0;
}

/** Missing or invalid fields, as human labels. Empty when the form can be booked. */
export function validateConsignment(form: ConsignmentForm): string[] {
  const problems: string[] = [];
  for (const [key, label] of REQUIRED) {
    if (blank(form[key] as string)) problems.push(label);
  }
  if (!blank(form.pieces) && !positiveNumber(form.pieces)) {
    problems.push('Pieces must be a number above zero');
  }
  if (!blank(form.weightKg) && !positiveNumber(form.weightKg)) {
    problems.push('Gross weight must be a number above zero');
  }
  return problems;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function isConsignmentForm(v: unknown): v is ConsignmentForm {
  if (!isRecord(v)) return false;
  return (
    REQUIRED.every(([key]) => typeof v[key] === 'string') &&
    typeof v.fromOutsideUk === 'boolean' &&
    (CONSIGNMENT_MODES as readonly string[]).includes(v.mode as string)
  );
}

/**
 * Shape guard for a stored consignment. Storage reads are defensive: an entry
 * from an older build, or one edited by hand, is dropped rather than taking
 * the screen down.
 */
export function isConsignment(v: unknown): v is Consignment {
  if (!isRecord(v)) return false;
  if (typeof v.id !== 'string' || typeof v.createdAt !== 'string') return false;
  if (v.eta !== undefined && typeof v.eta !== 'string') return false;
  if (v.fltRequestedFor !== undefined && typeof v.fltRequestedFor !== 'string') return false;
  if (v.eoriConfirmed !== undefined && typeof v.eoriConfirmed !== 'boolean') return false;
  return isConsignmentForm(v.form) && isStageOf(CONSIGNMENT_STAGES, v.stage);
}

/* ------------------------------------------------- ETA and the forklift */

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const ETA_PATTERN = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (\d{2}):(\d{2})$/;

/**
 * Moves an ETA such as 'Fri 14:00' by whole or part hours, rolling over the
 * day (and the week). Anything that is not in that shape comes back unchanged
 * rather than being guessed at.
 */
export function shiftEta(eta: string, hours: number): string {
  const m = ETA_PATTERN.exec(eta.trim());
  if (!m) return eta;
  const week = 7 * 24 * 60;
  const day = DAYS.indexOf(m[1] as (typeof DAYS)[number]);
  const start = day * 24 * 60 + Number(m[2]) * 60 + Number(m[3]);
  const total = (((start + Math.round(hours * 60)) % week) + week) % week;
  const d = DAYS[Math.floor(total / (24 * 60))]!;
  const hh = Math.floor((total % (24 * 60)) / 60);
  const mm = total % 60;
  return `${d} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** How far ahead of the vessel's call time a new booking is planned to land. */
export const QUAY_LEAD_HOURS = 2;

/** The ETA a new booking is given: two hours before the vessel's call time. */
export function bookingEta(vesselCallTime: string): string {
  return shiftEta(vesselCallTime, -QUAY_LEAD_HOURS);
}

/** The simulated delay the demo applies to a freight ETA, in hours. */
export const SIMULATED_DELAY_HOURS = 2;

/**
 * A piece heavier than this needs lifting with a forklift (FLT) rather than
 * by hand, so a movement to a quay that carries one gets a forklift suggested.
 */
export const FLT_THRESHOLD_KG = 250;

/** The rule, in the words the screen uses. */
export const FLT_RULE = `Suggested when a movement goes to a quay and the weight per piece (gross weight ÷ pieces) is over ${FLT_THRESHOLD_KG} kg.`;

/** Delivered to a berth rather than into the warehouse. */
export function isQuayDelivery(deliveryPoint: string): boolean {
  return /\bQuay\b/.test(deliveryPoint);
}

/** Gross weight ÷ pieces, rounded up to the kilo; null when either is not a number. */
export function weightPerPieceKg(
  form: Pick<ConsignmentForm, 'pieces' | 'weightKg'>,
): number | null {
  const pieces = Number(form.pieces.trim());
  const weight = Number(form.weightKg.trim());
  if (!Number.isFinite(pieces) || !Number.isFinite(weight) || pieces <= 0 || weight <= 0) {
    return null;
  }
  return Math.ceil(weight / pieces);
}

/**
 * The forklift suggestion for a movement, or null when none applies: it goes
 * to a quay, it is not there yet, it has an ETA, and a piece is over the
 * threshold. The needed-by time is the freight's ETA, read live, so the
 * suggestion follows the ETA whenever it moves.
 */
export function fltSuggestion(
  c: Consignment,
): { neededBy: string; perPieceKg: number; requested: boolean; moved: boolean } | null {
  const requested = typeof c.fltRequestedFor === 'string';
  if (!c.eta || !isQuayDelivery(c.form.deliveryPoint)) return null;
  // Once the cargo is on the quay there is nothing left to suggest; a forklift
  // already requested stays on the record.
  if (isConsignmentDelivered(c.stage) && !requested) return null;
  const perPieceKg = weightPerPieceKg(c.form);
  if (perPieceKg === null || perPieceKg <= FLT_THRESHOLD_KG) return null;
  return {
    neededBy: c.eta,
    perPieceKg,
    requested,
    moved: requested && c.fltRequestedFor !== c.eta,
  };
}

/* The suggestion's sentences — both surfaces print exactly these. */

export function fltSuggestionText(perPieceKg: number, deliveryPoint: string, eta: string): string {
  return `${perPieceKg} kg a piece is over ${FLT_THRESHOLD_KG} kg, so a forklift with operator is suggested at ${deliveryPoint} for the freight ETA, ${eta}.`;
}

export function fltRequestedText(requestedFor: string, deliveryPoint: string): string {
  return `Forklift requested for ${requestedFor} at ${deliveryPoint}.`;
}

export function fltMovedText(eta: string): string {
  return `The freight ETA is now ${eta}; your GAC agent moves the forklift to match.`;
}

export function fltRequestButton(eta: string): string {
  return `Request a forklift for ${eta}`;
}

/**
 * Consignments that still need a customs entry: arriving from outside the UK
 * and not yet delivered. The Customs screen offers exactly these as the
 * movement a declaration is raised against.
 */
export function needingCustoms(consignments: readonly Consignment[]): Consignment[] {
  return consignments.filter((c) => c.form.fromOutsideUk && !isConsignmentDelivered(c.stage));
}

/** 'CN-2041' — sequential from the highest reference already held. */
export function nextConsignmentRef(existing: readonly Consignment[]): string {
  const numbers = existing
    .map((c) => Number(/^CN-(\d+)$/.exec(c.id)?.[1] ?? NaN))
    .filter((n) => Number.isFinite(n));
  const top = numbers.length ? Math.max(...numbers) : 2040;
  return `CN-${top + 1}`;
}
