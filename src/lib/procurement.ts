import { BRAND_NAME } from '../config/brand';
import {
  CANNOT_ASSIST_IDS,
  CHANDLER_NAME,
  COMPASS_ADDRESS,
  ILLUSTRATIVE_LINE_PRICE_FALLBACK_GBP,
  ILLUSTRATIVE_PRICES_GBP,
  SENDER,
} from '../data/procurement';
import type { ProcurementLine, ProcurementRequest } from '../data/procurement';
import { VESSELS } from '../data/vessels';

/**
 * Procurement via Compass — the rules behind the working example (17 Aug
 * review, point 4). A request moves through a fixed set of stages: the
 * client sends the list to Compass by email; Compass sources it; Compass
 * replies line by line (supplied, or routed to a third-party chandler that
 * Compass pays); the client is invoiced via Compass, under GAC, at Compass's
 * prices. The chandler never invoices the client and never appears on the
 * client's paperwork. Everything numeric here is illustrative.
 */

// ── Stage machine ────────────────────────────────────────────────────────

export const STAGES = [
  'draft',
  'sent',
  'sourcing',
  'replied',
  'chandler-paid',
  'invoiced',
] as const;

export type Stage = (typeof STAGES)[number];

export const FINAL_STAGE: Stage = 'invoiced';

/** The stages that appear on the timeline — everything after the draft. */
export const TIMELINE_STAGES: readonly Stage[] = STAGES.filter((s) => s !== 'draft');

const STAGE_LABELS: Record<Stage, string> = {
  draft: 'Draft — not yet sent',
  sent: 'Sent to Compass',
  sourcing: 'Compass sourcing',
  replied: 'Compass reply: supplied / routed',
  'chandler-paid': 'Compass pays the chandler',
  invoiced: 'Invoiced via Compass — under GAC',
};

/** Label of the simulate button that advances FROM this stage. */
const SIMULATE_LABELS: Partial<Record<Stage, string>> = {
  sent: 'Simulate: Compass starts sourcing',
  sourcing: 'Simulate: Compass replies',
  replied: 'Simulate: chandler paid',
  'chandler-paid': 'Simulate: invoice raised via Compass',
};

export function stageIndex(stage: Stage): number {
  return STAGES.indexOf(stage);
}

export function isFinalStage(stage: Stage): boolean {
  return stage === FINAL_STAGE;
}

/** The next stage; the final stage returns itself — the flow never overshoots. */
export function nextStage(stage: Stage): Stage {
  const i = stageIndex(stage);
  return STAGES[Math.min(i + 1, STAGES.length - 1)] ?? FINAL_STAGE;
}

export function stageLabel(stage: Stage): string {
  return STAGE_LABELS[stage];
}

/** True once the flow has reached (or passed) the given stage. */
export function stageReached(current: Stage, stage: Stage): boolean {
  return stageIndex(current) >= stageIndex(stage);
}

export type StageStatus = 'done' | 'current' | 'pending';

export function stageStatus(current: Stage, stage: Stage): StageStatus {
  const c = stageIndex(current);
  const s = stageIndex(stage);
  if (s < c) return 'done';
  if (s === c) return 'current';
  return 'pending';
}

/** Label of the button that moves the demo on from this stage, or null when there is none. */
export function simulateLabel(stage: Stage): string | null {
  return SIMULATE_LABELS[stage] ?? null;
}

// ── Line routing ─────────────────────────────────────────────────────────

export type LineSource = 'compass' | 'chandler';

export interface RoutedLine extends ProcurementLine {
  source: LineSource;
}

/**
 * Compass supplies every line it can; exactly the ids in `cannotAssistIds`
 * are routed to a third-party chandler (which Compass pays).
 */
export function routeLines(
  lines: readonly ProcurementLine[],
  cannotAssistIds: readonly string[] = CANNOT_ASSIST_IDS,
): RoutedLine[] {
  return lines.map((l) => ({
    ...l,
    source: cannotAssistIds.includes(l.id) ? 'chandler' : 'compass',
  }));
}

/** Human line for the Compass reply on one routed line. */
export function sourceLabel(source: LineSource, chandler = CHANDLER_NAME): string {
  return source === 'compass'
    ? 'Supplied by Compass'
    : `Cannot assist — routed to a third-party chandler · ${chandler}`;
}

// ── Invoice ──────────────────────────────────────────────────────────────

/*
 * There is no mark-up on the client's paperwork. Compass prices every line
 * through its own network and the client sees those prices and one total —
 * nothing about Compass's cost base or margin is surfaced here (17 Aug
 * review, owner's follow-up).
 */

export interface InvoiceLine {
  id: string;
  qty: string;
  description: string;
  priceGBP: number;
}

/** Illustrative demo price for a line — known lines from the table, added lines take the fallback. */
export function illustrativePrice(lineId: string): number {
  return ILLUSTRATIVE_PRICES_GBP[lineId] ?? ILLUSTRATIVE_LINE_PRICE_FALLBACK_GBP;
}

/**
 * The client-facing invoice: one line per item, from GAC via Compass. No
 * source column — the chandler never appears on the client's paperwork.
 */
export function invoiceLines(request: ProcurementRequest): InvoiceLine[] {
  return request.lines.map((l) => ({
    id: l.id,
    qty: l.qty,
    description: l.description,
    priceGBP: illustrativePrice(l.id),
  }));
}

export interface InvoiceTotals {
  /** Sum of the line prices — the figure the client pays. */
  total: number;
}

export function invoiceTotals(lines: readonly InvoiceLine[]): InvoiceTotals {
  return { total: lines.reduce((sum, l) => sum + l.priceGBP, 0) };
}

// ── Email ────────────────────────────────────────────────────────────────

export interface ComposedEmail {
  to: string;
  from: string;
  subject: string;
  body: string;
}

function vesselFor(request: ProcurementRequest) {
  return VESSELS.find((v) => v.id === request.vesselId) ?? VESSELS[0]!;
}

/** "PR-1042 — MV Caledonian Star, Aberdeen — needed Fri 08:00" without the leading noun. */
export function requestSummary(request: ProcurementRequest): string {
  const v = vesselFor(request);
  return `${request.ref} — ${v.name}, ${v.port} — needed ${request.neededBy}`;
}

/** The email the platform sends to Compass. Body lists every line, numbered. */
export function composeEmail(request: ProcurementRequest): ComposedEmail {
  const v = vesselFor(request);
  const lineList = request.lines.map((l, i) => `${i + 1}. ${l.description} (${l.qty})`).join('\n');
  const body = [
    'Compass team,',
    '',
    `Please source the following for ${v.name}, alongside at ${request.deliveryPoint}. Needed by ${request.neededBy}.`,
    '',
    lineList,
    '',
    'Where Compass cannot assist on a line, please source it and invoice via Compass under GAC as usual.',
    '',
    'Regards,',
    `${SENDER.name} · ${SENDER.org}`,
    `Sent via ${BRAND_NAME} · reference ${request.ref}`,
  ].join('\n');
  return {
    to: COMPASS_ADDRESS,
    from: `${SENDER.name} · ${SENDER.org} · via ${BRAND_NAME}`,
    subject: `Procurement request ${requestSummary(request)}`,
    body,
  };
}

/** "09:41" — the time part of an ISO timestamp, British English. */
export function timeOf(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
