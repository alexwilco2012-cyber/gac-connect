import { create } from 'zustand';
import { DEFAULT_REQUEST } from '../data/procurement';
import type { ProcurementLine, ProcurementRequest } from '../data/procurement';
import { isFinalStage, nextStage, STAGES, stageReached } from '../lib/procurement';
import type { Stage } from '../lib/procurement';
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

  // Draft editing — only meaningful before the request is sent
  setLines(lines: ProcurementLine[]): void;
  addLine(description: string, qty: string): void;
  updateLine(id: string, patch: Partial<Pick<ProcurementLine, 'qty' | 'description'>>): void;
  removeLine(id: string): void;
  setVessel(vesselId: string): void;
  setDeliveryPoint(value: string): void;
  setNeededBy(value: string): void;

  // The Compass flow
  send(): void;
  advance(): void;
  reset(): void;
}

const KEY_REQUEST = 'procurement.request';
const KEY_STAGE = 'procurement.stage';
const KEY_TIMES = 'procurement.stageTimes';

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

  const hydratedStage = readStage();

  return {
    request: readRequest(),
    stage: hydratedStage,
    stageTimes: readStageTimes(hydratedStage),

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
      set({ request: cloneDefault(), stage: 'draft', stageTimes: {} });
    },
  };
});
