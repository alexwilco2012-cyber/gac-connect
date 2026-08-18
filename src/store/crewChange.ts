import { create } from 'zustand';
import { persistent } from '../lib/storage';
import { isCrewRequest, nextStage, stampLabel } from '../lib/crewChange';
import type { CrewKind, CrewRequest, LoiForm, RepatForm } from '../lib/crewChange';

/**
 * Crew change requests — LOIs and repatriation letters the client has
 * submitted, each with its stage in the pipeline. Persisted through the
 * storage adapter under 'crewChange.*' (never directly), so a demo survives
 * a reload and "Reset demo" clears it cleanly.
 */

const KEY_REQUESTS = 'crewChange.requests';
const KEY_SEQ = 'crewChange.seq';

interface CrewChangeState {
  requests: CrewRequest[];
  /** Adds a request at the first stage; returns its id. */
  addRequest(kind: 'loi', form: LoiForm): string;
  addRequest(kind: 'repat', form: RepatForm): string;
  /** Moves a request forward by one or more stages; the terminal stage holds. */
  advance(id: string, steps?: number): void;
  reset(): void;
}

/**
 * Persisted requests, shape-checked entry by entry. Anything that is not a
 * well-formed request (older build, hand-edited storage) is dropped so a stale
 * entry can never take the screen down — Reset demo stays reachable.
 */
export function readRequests(): CrewRequest[] {
  const raw = persistent.get<unknown>(KEY_REQUESTS, []);
  return Array.isArray(raw) ? raw.filter(isCrewRequest) : [];
}

function nextId(kind: CrewKind): string {
  const seq = persistent.get<number>(KEY_SEQ, 0) + 1;
  persistent.set(KEY_SEQ, seq);
  return `${kind === 'loi' ? 'LOI' : 'REP'}-${String(seq).padStart(4, '0')}`;
}

export const useCrewChange = create<CrewChangeState>((set, get) => ({
  requests: readRequests(),

  addRequest(kind: CrewKind, form: LoiForm | RepatForm): string {
    const id = nextId(kind);
    const base = { id, createdAt: stampLabel() };
    const request: CrewRequest =
      kind === 'loi'
        ? { ...base, kind: 'loi', form: form as LoiForm, stage: 'Submitted by client' }
        : { ...base, kind: 'repat', form: form as RepatForm, stage: 'Submitted by client' };
    const requests = [request, ...get().requests];
    persistent.set(KEY_REQUESTS, requests);
    set({ requests });
    return id;
  },

  advance(id, steps = 1) {
    const requests = get().requests.map((r): CrewRequest => {
      if (r.id !== id) return r;
      let stage: string = r.stage;
      for (let i = 0; i < Math.max(1, steps); i += 1) stage = nextStage(r.kind, stage);
      return { ...r, stage } as CrewRequest;
    });
    persistent.set(KEY_REQUESTS, requests);
    set({ requests });
  },

  reset() {
    persistent.remove(KEY_REQUESTS);
    persistent.remove(KEY_SEQ);
    set({ requests: [] });
  },
}));
