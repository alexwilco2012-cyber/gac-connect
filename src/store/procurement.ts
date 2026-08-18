import { create } from 'zustand';
import { DEFAULT_REQUEST } from '../data/procurement';
import type { ProcurementLine, ProcurementRequest } from '../data/procurement';
import { isFinalStage, nextStage } from '../lib/procurement';
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

let lineSeq = 1;

export const useProcurement = create<ProcurementState>((set, get) => {
  function saveRequest(request: ProcurementRequest) {
    persistent.set(KEY_REQUEST, request);
    set({ request });
  }
  function patchRequest(patch: Partial<ProcurementRequest>) {
    saveRequest({ ...get().request, ...patch });
  }

  return {
    request: persistent.get<ProcurementRequest>(KEY_REQUEST, cloneDefault()),
    stage: persistent.get<Stage>(KEY_STAGE, 'draft'),
    stageTimes: persistent.get<StageTimes>(KEY_TIMES, {}),

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
      if (get().stage !== 'draft' || get().request.lines.length === 0) return;
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
