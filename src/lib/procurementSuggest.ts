import { CALL_HISTORY, PLANNED_CALLS, STORES_ITEMS } from '../data/procurementHistory';
import type { PastCall, PlannedCall, StoresItem, StoresUnit } from '../data/procurementHistory';
import type { ProcurementLine } from '../data/procurement';

/**
 * The suggested stores list — drafted from a vessel's previous calls once her
 * next call is planned, and sent to the client before she arrives. Pure
 * functions only: the screen reads them, the store calls them when the list is
 * sent, and the tests pin the rules.
 *
 * Rules: look at the last SUGGEST_WINDOW calls (fewer if that is all there
 * are); suggest a line when it was ordered on at least half of them; suggest
 * the quantity she usually orders — the median of the calls it was ordered on,
 * rounded up to a whole unit.
 */

export const SUGGEST_WINDOW = 6;

export interface SuggestedLine {
  itemId: string;
  description: string;
  unit: StoresUnit;
  /** The usual (median) quantity, in whole units. */
  qty: number;
  timesOrdered: number;
  callsConsidered: number;
  reason: string;
}

/** The client's changes to the suggestion: lines unticked and quantities changed. */
export interface SuggestionEdits {
  vesselId: string;
  off: string[];
  qty: Record<string, number>;
}

/** Median of the quantities, rounded up to a whole unit; 0 when there are none. */
export function medianQty(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  return Math.ceil(median);
}

/** A line is suggested when it was ordered on at least half of the calls considered. */
export function meetsThreshold(timesOrdered: number, callsConsidered: number): boolean {
  return callsConsidered > 0 && timesOrdered * 2 >= callsConsidered;
}

/** "5 days", "1 lot", "2 cylinders · 47 kg". */
export function formatQty(qty: number, unit: StoresUnit): string {
  return `${qty} ${qty === 1 ? unit.one : unit.other}`;
}

/** "Ordered on 5 of the last 6 calls". */
export function suggestionReason(timesOrdered: number, callsConsidered: number): string {
  return `Ordered on ${timesOrdered} of the last ${callsConsidered} calls`;
}

/** The rule, stated on screen under the suggested list. */
export function suggestionRule(callsConsidered: number): string {
  return `A line is suggested when it was ordered on at least half of the last ${callsConsidered} calls. The quantity is the usual order, the median.`;
}

/** The most recent calls, newest first, at most `window` of them. */
export function recentCalls(history: readonly PastCall[], window = SUGGEST_WINDOW): PastCall[] {
  return [...history].sort((a, b) => b.date.localeCompare(a.date)).slice(0, Math.max(0, window));
}

/**
 * The suggested list from a vessel's history: every catalogue item that meets
 * the threshold, most often ordered first, then in catalogue order.
 */
export function suggestStores(
  history: readonly PastCall[],
  items: readonly StoresItem[] = STORES_ITEMS,
  window = SUGGEST_WINDOW,
): SuggestedLine[] {
  const calls = recentCalls(history, window);
  const n = calls.length;
  const out: { line: SuggestedLine; order: number }[] = [];
  items.forEach((item, order) => {
    const qtys: number[] = [];
    for (const call of calls) {
      const line = call.lines.find((l) => l.itemId === item.id);
      if (line && line.qty > 0) qtys.push(line.qty);
    }
    if (!meetsThreshold(qtys.length, n)) return;
    out.push({
      line: {
        itemId: item.id,
        description: item.description,
        unit: item.unit,
        qty: medianQty(qtys),
        timesOrdered: qtys.length,
        callsConsidered: n,
        reason: suggestionReason(qtys.length, n),
      },
      order,
    });
  });
  return out
    .sort((a, b) => b.line.timesOrdered - a.line.timesOrdered || a.order - b.order)
    .map((o) => o.line);
}

/** The planned call for a vessel, or null when none is planned. */
export function plannedCallFor(vesselId: string): PlannedCall | null {
  return PLANNED_CALLS.find((c) => c.vesselId === vesselId) ?? null;
}

/** The seeded suggestion for a vessel — empty when she has no call planned. */
export function suggestionFor(vesselId: string): SuggestedLine[] {
  if (!plannedCallFor(vesselId)) return [];
  return suggestStores(CALL_HISTORY[vesselId] ?? []);
}

/** Number of previous calls the suggestion for this vessel is drawn from. */
export function callsConsideredFor(vesselId: string): number {
  return recentCalls(CALL_HISTORY[vesselId] ?? []).length;
}

/** Edits apply to the vessel they were made for; any other vessel starts clean. */
export function editsFor(edits: SuggestionEdits | null, vesselId: string): SuggestionEdits {
  if (edits && edits.vesselId === vesselId) return edits;
  return { vesselId, off: [], qty: {} };
}

export function isTicked(edits: SuggestionEdits, itemId: string): boolean {
  return !edits.off.includes(itemId);
}

/** The quantity shown for a line: the client's change if there is one, else the suggestion. */
export function effectiveQty(line: SuggestedLine, edits: SuggestionEdits): number {
  const q = edits.qty[line.itemId];
  return typeof q === 'number' ? q : line.qty;
}

/**
 * The ticked lines as procurement lines — the same shape a hand-written list
 * has, so the request goes through the same stages to the same invoice.
 */
export function suggestedRequestLines(
  suggested: readonly SuggestedLine[],
  edits: SuggestionEdits,
): ProcurementLine[] {
  return suggested
    .filter((l) => isTicked(edits, l.itemId))
    .map((l) => ({
      id: l.itemId,
      description: l.description,
      qty: formatQty(effectiveQty(l, edits), l.unit),
    }));
}

/** Sendable when at least one line is ticked and every ticked quantity is a whole number of 1 or more. */
export function canSendSuggestion(
  suggested: readonly SuggestedLine[],
  edits: SuggestionEdits,
): boolean {
  const ticked = suggested.filter((l) => isTicked(edits, l.itemId));
  return (
    ticked.length > 0 &&
    ticked.every((l) => {
      const q = effectiveQty(l, edits);
      return Number.isInteger(q) && q >= 1;
    })
  );
}

// ── Copy ─────────────────────────────────────────────────────────────────

/*
 * Every client-facing string on the suggested-list card, in one place so the
 * banned-word sweep in the tests reads exactly what the screen shows. The deck
 * carries the same words.
 */
export const SUGGESTION_COPY = {
  pill: 'Drafted before the call',
  intro:
    'Drafted from what she ordered on her previous calls, ready before she arrives. Untick anything she does not need this time, change a quantity, then send the list to Compass.',
  sendLabel: 'Send suggested list to Compass',
  noneTicked: 'Tick at least one line to send',
  badQty: 'Every ticked line needs a quantity of 1 or more',
} as const;

/** "Suggested list · from the last 6 calls". */
export function suggestionEyebrow(callsConsidered: number): string {
  return `Suggested list · from the last ${callsConsidered} calls`;
}

/** "Next call · MV Choice · Aberdeen · ETA Fri 08:00". */
export function suggestionTitle(vesselName: string, call: PlannedCall): string {
  return `Next call · ${vesselName} · ${call.port} · ETA ${call.eta}`;
}

/** The hint beside the send button while the list can go. */
export function suggestionSendHint(ref: string): string {
  return `Goes to Compass as ${ref} in place of the draft below, through the same steps to one invoice`;
}

/** Shown in place of the list when the vessel has no call planned. */
export function noPlannedCall(vesselName: string): string {
  return `No call planned for ${vesselName} yet. A suggested list is drafted from her previous calls once one is.`;
}
