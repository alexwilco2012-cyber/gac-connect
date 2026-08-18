/**
 * Crew change — the letters an agent handles for on- and off-signers (17 Aug
 * 2026 review). Two kinds of request, each with its own stage pipeline:
 *
 *  · LOI — an Immigration Support Letter (letter of invitation) for a
 *    visa-national ON-signer transiting the UK to join. GAC issues and signs
 *    it as agents and returns it. GAC does not issue OKTB letters.
 *  · Repat — a disembarkation / repatriation letter for an OFF-signer, which
 *    UK Border Force (UKBF) endorses as written leave to enter. GAC prepares
 *    it from the client's template, routes it to UKBF and returns it.
 *
 * One letter per crew member, always. Everything here is illustrative: the
 * platform holds the templates, the client fills them in, GAC endorses or
 * routes and sends them back. Right of entry is distinct from permission to
 * work aboard inside 12 nm — GAC informs, it does not advise.
 */

export type CrewKind = 'loi' | 'repat';

export const LOI_STAGES = [
  'Submitted by client',
  'GAC checking',
  'Endorsed by GAC — signed as agents',
  'Returned to client',
] as const;
export type LoiStage = (typeof LOI_STAGES)[number];

export const REPAT_STAGES = [
  'Submitted by client',
  'Prepared by GAC',
  'Sent to UK Border Force for endorsement',
  'Endorsed by UKBF',
  'Returned to client',
] as const;
export type RepatStage = (typeof REPAT_STAGES)[number];

export type CrewStage = LoiStage | RepatStage;

/** The pipeline for a kind of request, first stage to last. */
export function stagesFor(kind: CrewKind): readonly CrewStage[] {
  return kind === 'loi' ? LOI_STAGES : REPAT_STAGES;
}

/** Position of a stage in its pipeline; -1 when the stage is not in it. */
export function stageIndex(kind: CrewKind, stage: string): number {
  return (stagesFor(kind) as readonly string[]).indexOf(stage);
}

/**
 * The stage after this one. The terminal stage returns itself. A stage the
 * pipeline does not recognise (corrupted storage) restarts at the first
 * stage rather than sticking forever.
 */
export function nextStage(kind: CrewKind, stage: string): CrewStage {
  const stages = stagesFor(kind);
  const i = stageIndex(kind, stage);
  if (i === -1) return stages[0]!;
  return stages[Math.min(i + 1, stages.length - 1)]!;
}

/** True once the letter has gone back to the client. */
export function isTerminalStage(kind: CrewKind, stage: string): boolean {
  const stages = stagesFor(kind);
  return stage === stages[stages.length - 1];
}

/** Pill tone: info while the letter is in progress, verified once returned. */
export function stageTone(kind: CrewKind, stage: string): 'info' | 'verified' {
  return isTerminalStage(kind, stage) ? 'verified' : 'info';
}

/**
 * The demo's "simulate" button for a request at a given stage. Each button
 * covers what one party does in one go — GAC checks and endorses; GAC prepares
 * and sends; UKBF endorses and returns — so a single click may move the
 * request through two pipeline stages. Null at the terminal stage.
 */
export function simulateAction(
  kind: CrewKind,
  stage: string,
): { label: string; steps: number } | null {
  if (kind === 'loi') {
    switch (stage as LoiStage) {
      case 'Submitted by client':
        return { label: 'Simulate: GAC checks and endorses', steps: 2 };
      case 'GAC checking':
        return { label: 'Simulate: GAC endorses as agents', steps: 1 };
      case 'Endorsed by GAC — signed as agents':
        return { label: 'Simulate: GAC returns the letter', steps: 1 };
      default:
        return null;
    }
  }
  switch (stage as RepatStage) {
    case 'Submitted by client':
      return { label: 'Simulate: GAC prepares and sends to UKBF', steps: 2 };
    case 'Prepared by GAC':
      return { label: 'Simulate: GAC sends to UKBF', steps: 1 };
    case 'Sent to UK Border Force for endorsement':
      return { label: 'Simulate: UKBF endorses and returns', steps: 2 };
    case 'Endorsed by UKBF':
      return { label: 'Simulate: UKBF returns the letter', steps: 1 };
    default:
      return null;
  }
}

/** An LOI is only needed for visa nationals; EEA and visa-waiver crew do not need one. */
export function loiRequired(visaNational: boolean): boolean {
  return visaNational;
}

/** 'DEMO, Crew Member' — family name in capitals, forenames as given. */
export function formatCrewName(familyName: string, forenames: string): string {
  const family = familyName.trim().toUpperCase();
  const given = forenames.trim();
  if (!family) return given;
  if (!given) return family;
  return `${family}, ${given}`;
}

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function utcDate(y: number, m: number, d: number): Date | null {
  if (m < 0 || m > 11 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m, d));
  // Reject overflow such as 31 Feb.
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m || date.getUTCDate() !== d) {
    return null;
  }
  return date;
}

/**
 * Lenient date parser for the free-text date fields — the client copies
 * dates as they appear on the passport, the itinerary or the crew list.
 * Accepts ISO (2026-08-22), British numeric (22/08/2026, 22.08.2026,
 * 22-08-2026) and day-month-year with a month name (22 Aug 2026,
 * 22 August 2026). Two-digit years are not accepted. Null when unparseable.
 */
export function parseDateText(text: string): Date | null {
  const t = text.trim();
  if (!t) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (m) return utcDate(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  if (m) return utcDate(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  m = /^(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})$/.exec(t);
  if (m) {
    const month = MONTHS[m[2]!.slice(0, 3).toLowerCase()];
    if (month === undefined) return null;
    return utcDate(Number(m[3]), month, Number(m[1]));
  }
  return null;
}

/** LOI template — one visa-national ON-signer. */
export interface LoiForm {
  familyName: string;
  forenames: string;
  nationality: string;
  dateOfBirth: string;
  passportNumber: string;
  passportExpiry: string;
  vesselId: string;
  port: string;
  /** Joining on or around — free text date. */
  joiningDate: string;
  arrivingFlight: string;
  /** Default on; when off, no LOI is needed and the form cannot be submitted. */
  visaNational: boolean;
}

/** Repatriation letter template — one OFF-signer. */
export interface RepatForm {
  familyName: string;
  forenames: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
  vesselId: string;
  port: string;
  disembarkationDate: string;
  /**
   * "Did the crew member join the vessel outside the UK, or has the vessel
   * called at any non-UK port since they joined?" — must be answered.
   */
  joinedOutsideUk: 'yes' | 'no' | '';
  /** Repatriation flights, up to three lines. */
  flights: string[];
}

interface BaseRequest {
  id: string;
  /** Human label for when the client submitted it. */
  createdAt: string;
}

export type CrewRequest =
  | (BaseRequest & { kind: 'loi'; form: LoiForm; stage: LoiStage })
  | (BaseRequest & { kind: 'repat'; form: RepatForm; stage: RepatStage });

const LOI_REQUIRED: [keyof LoiForm, string][] = [
  ['familyName', 'Family name'],
  ['forenames', 'Forenames'],
  ['nationality', 'Nationality'],
  ['dateOfBirth', 'Date of birth'],
  ['passportNumber', 'Passport number'],
  ['passportExpiry', 'Passport expiry'],
  ['vesselId', 'Vessel'],
  ['port', 'Port'],
  ['joiningDate', 'Joining on or around'],
  ['arrivingFlight', 'Arriving flight'],
];

const REPAT_REQUIRED: [keyof RepatForm, string][] = [
  ['familyName', 'Family name'],
  ['forenames', 'Forenames'],
  ['dateOfBirth', 'Date of birth'],
  ['nationality', 'Nationality'],
  ['passportNumber', 'Passport number'],
  ['vesselId', 'Vessel'],
  ['port', 'Disembarkation port'],
  ['disembarkationDate', 'Disembarkation date'],
];

function blank(v: unknown): boolean {
  return typeof v !== 'string' || v.trim() === '';
}

/**
 * Missing or invalid fields on an LOI form, as human labels. Empty when the
 * form is ready to submit. Passport expiry must fall after the joining date
 * whenever both dates parse.
 */
export function validateLoi(form: LoiForm): string[] {
  const problems: string[] = [];
  for (const [key, label] of LOI_REQUIRED) {
    if (blank(form[key])) problems.push(label);
  }
  const expiry = parseDateText(form.passportExpiry);
  const joining = parseDateText(form.joiningDate);
  if (expiry && joining && expiry.getTime() <= joining.getTime()) {
    problems.push('Passport expiry must be after the joining date');
  }
  return problems;
}

/**
 * Missing or invalid fields on a repatriation-letter form. The Yes/No
 * question must be answered and at least one repatriation flight given.
 */
export function validateRepat(form: RepatForm): string[] {
  const problems: string[] = [];
  for (const [key, label] of REPAT_REQUIRED) {
    if (blank(form[key])) problems.push(label);
  }
  if (form.joinedOutsideUk !== 'yes' && form.joinedOutsideUk !== 'no') {
    problems.push('Joined outside the UK / called at a non-UK port (Yes or No)');
  }
  if (!form.flights.some((f) => !blank(f))) {
    problems.push('Repatriation flights (at least one)');
  }
  return problems;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** True when a persisted value has the shape of an LOI form. */
export function isLoiForm(v: unknown): v is LoiForm {
  if (!isRecord(v)) return false;
  return (
    LOI_REQUIRED.every(([key]) => typeof v[key] === 'string') && typeof v.visaNational === 'boolean'
  );
}

/** True when a persisted value has the shape of a repatriation-letter form. */
export function isRepatForm(v: unknown): v is RepatForm {
  if (!isRecord(v)) return false;
  return (
    REPAT_REQUIRED.every(([key]) => typeof v[key] === 'string') &&
    (v.joinedOutsideUk === 'yes' || v.joinedOutsideUk === 'no' || v.joinedOutsideUk === '') &&
    Array.isArray(v.flights) &&
    v.flights.every((f) => typeof f === 'string')
  );
}

/**
 * Shape guard for a persisted request. Storage reads are defensive: an entry
 * from an older build, or one edited by hand, is dropped rather than crashing
 * the screen. The stage must belong to the request's own pipeline.
 */
export function isCrewRequest(v: unknown): v is CrewRequest {
  if (!isRecord(v)) return false;
  if (typeof v.id !== 'string' || typeof v.createdAt !== 'string') return false;
  if (typeof v.stage !== 'string') return false;
  if (v.kind === 'loi') return isLoiForm(v.form) && stageIndex('loi', v.stage) !== -1;
  if (v.kind === 'repat') return isRepatForm(v.form) && stageIndex('repat', v.stage) !== -1;
  return false;
}

/** 'Mon 18 Aug · 09:41' — the created-at label stored with a request. */
export function stampLabel(d: Date = new Date()): string {
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} · ${time}`;
}
