import { isFinalStageIn, isStageOf, nextStageIn, stageReachedIn, stageToneIn } from './pipeline';

/**
 * Customs — the entry behind a movement, from the document set arriving to the
 * goods being cleared. GAC prepares and submits the declaration itself, which
 * is why the line carries the 7% tier and why no third party appears anywhere
 * on this screen.
 *
 * The boundary matters and is printed on the screen: **GAC informs, it does
 * not advise.** The tariff classification, the customs valuation and the
 * declared customs position remain the importer's or exporter's own — GAC
 * prepares and submits the entry against what the client declares.
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
    typeof v.documentsConfirmed === 'boolean' &&
    (DECLARATION_KINDS as readonly string[]).includes(v.kind as string)
  );
}

/** Shape guard for a stored declaration — malformed entries are dropped. */
export function isDeclaration(v: unknown): v is Declaration {
  if (!isRecord(v)) return false;
  if (typeof v.id !== 'string' || typeof v.createdAt !== 'string') return false;
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
