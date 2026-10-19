import { create } from 'zustand';
import { DEFAULT_REQUEST } from '../data/procurement';
import type { ProcurementLine, ProcurementRequest } from '../data/procurement';
import { isFinalStage, nextStage, STAGES, stageReached } from '../lib/procurement';
import type { Stage } from '../lib/procurement';
import {
  canSendSuggestion,
  editsFor,
  plannedCallFor,
  suggestedRequestLines,
  suggestionFor,
} from '../lib/procurementSuggest';
import type { SuggestionEdits } from '../lib/procurementSuggest';
import { persistent } from '../lib/storage';

/**
 * Procurement demo state — the editable request, the Compass stage it has
 * reached, and when each stage was reached. Persisted through the storage
 * adapter under 'procurement.*' (never touched directly), so a reload lands
 * the visitor exactly where they left the demo. Its own store: app.ts stays
 * the app-wide state and this slice can be reset on its own.
 */

export type StageTimes = Partial<Record<Stage, string>>;

interface ProcurementState {
  request: ProcurementRequest;
  stage: Stage;
  /** ISO timestamp for every stage reached so far; `sent` is when the email went. */
  stageTimes: StageTimes;
  /** The client's changes to the suggested list (lines unticked, quantities changed). */
  suggestion: SuggestionEdits | null;

  // Draft editing — only meaningful before the request is sent
  setLines(lines: ProcurementLine[]): void;
  addLine(description: string, qty: string): void;
  updateLine(id: string, patch: Partial<Pick<ProcurementLine, 'qty' | 'description'>>): void;
  removeLine(id: string): void;
  setVessel(vesselId: string): void;
  setDeliveryPoint(value: string): void;
  setNeededBy(value: string): void;

  // The suggested list, drafted from the vessel's previous calls
  toggleSuggested(vesselId: string, itemId: string): void;
  setSuggestedQty(vesselId: string, itemId: string, qty: number): void;
  /** Puts the ticked suggested lines on the request for that vessel's call and sends it. */
  sendSuggested(vesselId: string): void;

  // The Compass flow
  send(): void;
  advance(): void;
  reset(): void;
}

const KEY_REQUEST = 'procurement.request';
const KEY_STAGE = 'procurement.stage';
const KEY_TIMES = 'procurement.stageTimes';
const KEY_SUGGESTION = 'procurement.suggestion';

const now = () => new Date().toISOString();

function cloneDefault(): ProcurementRequest {
  return { ...DEFAULT_REQUEST, lines: DEFAULT_REQUEST.lines.map((l) => ({ ...l })) };
}

/* Hydration is defensive: storage may hold an older shape or a hand-edited
   value, and a corrupt entry must never take the screen down. Anything that
   does not look right falls back to the default. */
function isLine(v: unknown): v is ProcurementLine {
  if (!v || typeof v !== 'object') return false;
  const l = v as Record<string, unknown>;
  return typeof l.id === 'string' && typeof l.description === 'string' && typeof l.qty === 'string';
}

export function readRequest(): ProcurementRequest {
  const stored = persistent.get<unknown>(KEY_REQUEST, null);
  if (!stored || typeof stored !== 'object') return cloneDefault();
  const r = stored as Record<string, unknown>;
  if (
    typeof r.ref !== 'string' ||
    typeof r.vesselId !== 'string' ||
    typeof r.deliveryPoint !== 'string' ||
    typeof r.neededBy !== 'string' ||
    !Array.isArray(r.lines) ||
    !r.lines.every(isLine)
  ) {
    return cloneDefault();
  }
  return { ...cloneDefault(), ...(r as unknown as ProcurementRequest) };
}

function isStage(value: unknown): value is Stage {
  return typeof value === 'string' && (STAGES as readonly string[]).includes(value);
}

/**
 * The stage the visitor left the demo at. A stored name that is no longer part
 * of the flow — an earlier visit, or a hand-edited entry — starts the demo over
 * at the draft rather than leaving the screen on a stage that no longer exists.
 */
export function readStage(): Stage {
  const stored = persistent.get<unknown>(KEY_STAGE, 'draft');
  return isStage(stored) ? stored : 'draft';
}

/**
 * Timestamps for the stages reached so far. Anything the current stage has not
 * reached is dropped, so a stage list that has changed since the last visit
 * cannot leave a stray time against a step that has not happened.
 */
export function readStageTimes(stage: Stage = readStage()): StageTimes {
  const stored = persistent.get<unknown>(KEY_TIMES, {});
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
  const out: StageTimes = {};
  for (const [k, v] of Object.entries(stored as Record<string, unknown>)) {
    if (isStage(k) && typeof v === 'string' && stageReached(stage, k)) out[k] = v;
  }
  return out;
}

/** The stored changes to the suggested list, or null when there are none or they look wrong. */
export function readSuggestion(): SuggestionEdits | null {
  const stored = persistent.get<unknown>(KEY_SUGGESTION, null);
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return null;
  const e = stored as Record<string, unknown>;
  if (
    typeof e.vesselId !== 'string' ||
    !Array.isArray(e.off) ||
    !e.off.every((x) => typeof x === 'string') ||
    !e.qty ||
    typeof e.qty !== 'object' ||
    Array.isArray(e.qty) ||
    !Object.values(e.qty as Record<string, unknown>).every((q) => typeof q === 'number')
  ) {
    return null;
  }
  return {
    vesselId: e.vesselId,
    off: [...(e.off as string[])],
    qty: { ...(e.qty as Record<string, number>) },
  };
}

/** A request is sendable when it has at least one line and no blank descriptions. */
export function canSend(request: ProcurementRequest): boolean {
  return request.lines.length > 0 && request.lines.every((l) => l.description.trim().length > 0);
}

let lineSeq = 1;

export const useProcurement = create<ProcurementState>((set, get) => {
  function saveRequest(request: ProcurementRequest) {
    persistent.set(KEY_REQUEST, request);
    set({ request });
  }
  function patchRequest(patch: Partial<ProcurementRequest>) {
    saveRequest({ ...get().request, ...patch });
  }
  function saveSuggestion(suggestion: SuggestionEdits) {
    persistent.set(KEY_SUGGESTION, suggestion);
    set({ suggestion });
  }

  const hydratedStage = readStage();

  return {
    request: readRequest(),
    stage: hydratedStage,
    stageTimes: readStageTimes(hydratedStage),
    suggestion: readSuggestion(),

    setLines(lines) {
      patchRequest({ lines });
    },
    addLine(description, qty) {
      const desc = description.trim();
      if (!desc) return;
      const id = `line-${Date.now().toString(36)}-${lineSeq++}`;
      patchRequest({
        lines: [...get().request.lines, { id, description: desc, qty: qty.trim() || '1' }],
      });
    },
    updateLine(id, patch) {
      patchRequest({
        lines: get().request.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      });
    },
    removeLine(id) {
      patchRequest({ lines: get().request.lines.filter((l) => l.id !== id) });
    },
    setVessel(vesselId) {
      patchRequest({ vesselId });
    },
    setDeliveryPoint(deliveryPoint) {
      patchRequest({ deliveryPoint });
    },
    setNeededBy(neededBy) {
      patchRequest({ neededBy });
    },

    toggleSuggested(vesselId, itemId) {
      if (get().stage !== 'draft') return;
      const e = editsFor(get().suggestion, vesselId);
      const off = e.off.includes(itemId) ? e.off.filter((x) => x !== itemId) : [...e.off, itemId];
      saveSuggestion({ ...e, off });
    },
    setSuggestedQty(vesselId, itemId, qty) {
      if (get().stage !== 'draft') return;
      const e = editsFor(get().suggestion, vesselId);
      const q = Number.isFinite(qty) ? Math.max(0, Math.floor(qty)) : 0;
      saveSuggestion({ ...e, qty: { ...e.qty, [itemId]: q } });
    },
    sendSuggested(vesselId) {
      if (get().stage !== 'draft') return;
      const call = plannedCallFor(vesselId);
      if (!call) return;
      const suggested = suggestionFor(vesselId);
      const e = editsFor(get().suggestion, vesselId);
      if (!canSendSuggestion(suggested, e)) return;
      // The ticked lines become the request for this call; from here on it is
      // the same request, the same stages and the same invoice as a list the
      // client writes by hand.
      saveRequest({
        ...get().request,
        vesselId,
        deliveryPoint: call.deliveryPoint,
        neededBy: call.neededBy,
        lines: suggestedRequestLines(suggested, e),
      });
      get().send();
    },

    send() {
      if (get().stage !== 'draft' || !canSend(get().request)) return;
      // Snapshot the request as sent, so what is on disk is what went to Compass
      // (an unedited draft was never written until now).
      persistent.set(KEY_REQUEST, get().request);
      const stage: Stage = 'sent';
      const stageTimes: StageTimes = { ...get().stageTimes, sent: now() };
      persistent.set(KEY_STAGE, stage);
      persistent.set(KEY_TIMES, stageTimes);
      set({ stage, stageTimes });
    },
    advance() {
      const cur = get().stage;
      if (cur === 'draft' || isFinalStage(cur)) return;
      const stage = nextStage(cur);
      const stageTimes: StageTimes = { ...get().stageTimes, [stage]: now() };
      persistent.set(KEY_STAGE, stage);
      persistent.set(KEY_TIMES, stageTimes);
      set({ stage, stageTimes });
    },
    reset() {
      persistent.remove(KEY_REQUEST);
      persistent.remove(KEY_STAGE);
      persistent.remove(KEY_TIMES);
      persistent.remove(KEY_SUGGESTION);
      set({ request: cloneDefault(), stage: 'draft', stageTimes: {}, suggestion: null });
    },
  };
});
