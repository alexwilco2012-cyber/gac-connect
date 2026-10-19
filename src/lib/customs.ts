import { isFinalStageIn, isStageOf, nextStageIn, stageReachedIn, stageToneIn } from './pipeline';

/**
 * Customs — the entry behind a movement, from the document set arriving to the
 * goods being cleared. GAC prepares and submits the declaration itself, which
 * is why the line carries the 7% tier and why no third party appears anywhere
 * on this screen.
 *
 * The boundary matters and is printed on the screen (rule changed 2026-09-07):
 * the platform does not give customs advice; GAC's customs team does, and the
 * client can ask them from a declaration (call back or email). The platform
 * shows what a declaration needs and where it has got to.
 *
 * Submission and the HMRC response are simulated in this proof of concept and
 * say so.
 */

export const DECLARATION_STAGES = [
  'Documents received',
  'Declaration prepared',
  'Submitted to HMRC',
  'Cleared',
] as const;
export type DeclarationStage = (typeof DECLARATION_STAGES)[number];

export const DECLARATION_KINDS = ['T1 transit', 'Import clearance', 'Export clearance'] as const;
export type DeclarationKind = (typeof DECLARATION_KINDS)[number];

export interface DeclarationForm {
  kind: DeclarationKind;
  /** The logistics movement this entry covers — 'CN-2042', or blank if standalone. */
  consignmentRef: string;
  /**
   * The GB EORI carried across from the client record when the entry is
   * raised against a movement. Optional: a standalone entry has none, and
   * entries stored by an older build predate it. Always the illustrative value.
   */
  eori?: string;
  goods: string;
  movedFrom: string;
  movedTo: string;
  packages: string;
  grossWeightKg: string;
  /** The client confirms the document set is complete before the entry is raised. */
  documentsConfirmed: boolean;
}

export interface Declaration {
  id: string;
  form: DeclarationForm;
  stage: DeclarationStage;
  createdAt: string;
  /** The client asked the customs team for help on this entry. */
  teamRequest?: CustomsTeamRequest;
}

/* ------------------------------------------------ Ask the customs team */

/** How the customs team gets back to the client. */
export const CUSTOMS_TEAM_CHANNELS = ['call', 'email'] as const;
export type CustomsTeamChannel = (typeof CUSTOMS_TEAM_CHANNELS)[number];

export interface CustomsTeamRequest {
  channel: CustomsTeamChannel;
  /** Optional — the client can ask without writing anything. */
  question: string;
  at: string;
}

/** The choice as the client reads it on the button. */
export function customsTeamChannelLabel(channel: CustomsTeamChannel): string {
  return channel === 'call' ? 'Call me back' : 'Reply by email';
}

/** What is logged on the declaration once the request has gone. */
export function customsTeamOutcome(channel: CustomsTeamChannel): string {
  return channel === 'call'
    ? 'Customs team will call you back'
    : 'Customs team will reply by email';
}

/** Longest question kept; anything beyond is cut rather than refused. */
export const CUSTOMS_QUESTION_MAX = 500;

/** The request as stored: question trimmed and capped, blank allowed. */
export function customsTeamRequest(
  channel: CustomsTeamChannel,
  question: string,
  at: string,
): CustomsTeamRequest {
  return { channel, question: question.trim().slice(0, CUSTOMS_QUESTION_MAX), at };
}

export function isCustomsTeamRequest(v: unknown): v is CustomsTeamRequest {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    (CUSTOMS_TEAM_CHANNELS as readonly string[]).includes(r.channel as string) &&
    typeof r.question === 'string' &&
    typeof r.at === 'string'
  );
}

/**
 * The demo EORI is all zeros after the GB prefix — plainly not a number HMRC
 * would issue — and this is the test for it, so a real-looking value cannot
 * slip into the seed.
 */
export function isIllustrativeEori(v: string): boolean {
  return /^GB0{12}$/.test(v);
}

/**
 * Whether the EORI carried onto an entry has been confirmed for this call on
 * the movement it came from — in the words the declaration form shows.
 */
export function eoriCallStatus(confirmed: boolean, consignmentRef: string): string {
  return confirmed
    ? `Confirmed for this call on ${consignmentRef}`
    : `Not yet confirmed for this call — tick it on ${consignmentRef} under Logistics`;
}

export function nextDeclarationStage(stage: string): DeclarationStage {
  return nextStageIn(DECLARATION_STAGES, stage);
}

export function isCleared(stage: string): boolean {
  return isFinalStageIn(DECLARATION_STAGES, stage);
}

export function declarationStageReached(current: string, stage: DeclarationStage): boolean {
  return stageReachedIn(DECLARATION_STAGES, current, stage);
}

export function declarationStageTone(stage: string): 'info' | 'verified' {
  return stageToneIn(DECLARATION_STAGES, stage);
}

/**
 * The simulate button for a declaration at a given stage. Each button covers
 * what one party does in one go, so a click can move the entry through two
 * stages — GAC prepares the entry and lodges it; HMRC responds and clears it.
 * Null once the goods are cleared.
 */
export function declarationAction(stage: string): { label: string; steps: number } | null {
  switch (stage as DeclarationStage) {
    case 'Documents received':
      return { label: 'Simulate: GAC prepares and submits the entry', steps: 2 };
    case 'Declaration prepared':
      return { label: 'Simulate: GAC submits the entry', steps: 1 };
    case 'Submitted to HMRC':
      return { label: 'Simulate: HMRC clears the entry', steps: 1 };
    default:
      return null;
  }
}

const REQUIRED: [keyof DeclarationForm, string][] = [
  ['goods', 'What the goods are'],
  ['movedFrom', 'Moving from'],
  ['movedTo', 'Moving to'],
  ['packages', 'Packages'],
  ['grossWeightKg', 'Gross weight (kg)'],
];

function blank(v: unknown): boolean {
  return typeof v !== 'string' || v.trim() === '';
}

function positiveNumber(v: string): boolean {
  const n = Number(v.trim());
  return Number.isFinite(n) && n > 0;
}

/**
 * Missing or invalid fields, as human labels. The document confirmation is a
 * required field in its own right: an entry raised on an incomplete set is the
 * single commonest reason goods sit at the border, so the platform will not
 * take one.
 */
export function validateDeclaration(form: DeclarationForm): string[] {
  const problems: string[] = [];
  for (const [key, label] of REQUIRED) {
    if (blank(form[key] as string)) problems.push(label);
  }
  if (!blank(form.packages) && !positiveNumber(form.packages)) {
    problems.push('Packages must be a number above zero');
  }
  if (!blank(form.grossWeightKg) && !positiveNumber(form.grossWeightKg)) {
    problems.push('Gross weight must be a number above zero');
  }
  if (!form.documentsConfirmed) {
    problems.push('Confirmation that the document set is complete');
  }
  return problems;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function isDeclarationForm(v: unknown): v is DeclarationForm {
  if (!isRecord(v)) return false;
  return (
    REQUIRED.every(([key]) => typeof v[key] === 'string') &&
    typeof v.consignmentRef === 'string' &&
    (v.eori === undefined || typeof v.eori === 'string') &&
    typeof v.documentsConfirmed === 'boolean' &&
    (DECLARATION_KINDS as readonly string[]).includes(v.kind as string)
  );
}

/** Shape guard for a stored declaration — malformed entries are dropped. */
export function isDeclaration(v: unknown): v is Declaration {
  if (!isRecord(v)) return false;
  if (typeof v.id !== 'string' || typeof v.createdAt !== 'string') return false;
  if (v.teamRequest !== undefined && !isCustomsTeamRequest(v.teamRequest)) return false;
  return isDeclarationForm(v.form) && isStageOf(DECLARATION_STAGES, v.stage);
}

/** 'DEC-1187' — sequential from the highest reference already held. */
export function nextDeclarationRef(existing: readonly Declaration[]): string {
  const numbers = existing
    .map((d) => Number(/^DEC-(\d+)$/.exec(d.id)?.[1] ?? NaN))
    .filter((n) => Number.isFinite(n));
  const top = numbers.length ? Math.max(...numbers) : 1186;
  return `DEC-${top + 1}`;
}

/** Entries not yet cleared — the count the hub and the dashboard show. */
export function openDeclarations(declarations: readonly Declaration[]): Declaration[] {
  return declarations.filter((d) => !isCleared(d.stage));
}
