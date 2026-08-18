import { BRAND_NAME } from '../config/brand';
import {
  COMPASS_ADDRESS,
  ILLUSTRATIVE_LINE_PRICE_FALLBACK_GBP,
  ILLUSTRATIVE_PRICES_GBP,
  SENDER,
} from '../data/procurement';
import type { ProcurementRequest } from '../data/procurement';
import { VESSELS } from '../data/vessels';

/**
 * Procurement via Compass — the rules behind the working example (17 Aug
 * review, point 4). A request moves through a fixed set of stages: the client
 * sends the list to Compass by email; Compass sources it from its own stock
 * and supply network; Compass confirms the list back; the client is invoiced
 * via Compass, under GAC, at Compass's prices. One list, one supplier, one
 * invoice. Everything numeric here is illustrative.
 */

// ── Stage machine ────────────────────────────────────────────────────────

export const STAGES = ['draft', 'sent', 'sourcing', 'confirmed', 'invoiced'] as const;

export type Stage = (typeof STAGES)[number];

export const FINAL_STAGE: Stage = 'invoiced';

/** The stages that appear on the timeline — everything after the draft. */
export const TIMELINE_STAGES: readonly Stage[] = STAGES.filter((s) => s !== 'draft');

const STAGE_LABELS: Record<Stage, string> = {
  draft: 'Draft — not yet sent',
  sent: 'Sent to Compass',
  sourcing: 'Compass sourcing',
  confirmed: 'Compass confirms the list',
  invoiced: 'Invoiced via Compass — under GAC',
};

/** Label of the simulate button that advances FROM this stage. */
const SIMULATE_LABELS: Partial<Record<Stage, string>> = {
  sent: 'Simulate: Compass starts sourcing',
  sourcing: 'Simulate: Compass confirms supply',
  confirmed: 'Simulate: invoice raised via Compass',
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

// ── Line supply ──────────────────────────────────────────────────────────

/**
 * Every line on the list is supplied by Compass — there is no second source
 * to distinguish, so one shared string covers the whole list (owner's
 * follow-up to the 17 Aug review).
 */
export const LINE_CONFIRMATION = 'Confirmed by Compass';

// ── Invoice ──────────────────────────────────────────────────────────────

/*
 * The client's paperwork carries Compass's prices only. Compass prices every line
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
 * source column — every line is Compass's own supply, under GAC.
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
    'Please confirm supply against each line and invoice via Compass under GAC as usual.',
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
