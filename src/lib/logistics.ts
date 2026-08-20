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
  return isConsignmentForm(v.form) && isStageOf(CONSIGNMENT_STAGES, v.stage);
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
