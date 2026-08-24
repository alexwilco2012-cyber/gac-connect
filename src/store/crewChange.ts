import { create } from 'zustand';
import { persistent } from '../lib/storage';
import { isCrewRequest, nextStage, redactRequest, stampLabel } from '../lib/crewChange';
import type { CrewKind, CrewRequest, LoiForm, RepatForm } from '../lib/crewChange';
import {
  applyRetention,
  hasPersonalData,
  isCrewListSubmission,
  isTerminalCrewListStage,
  loiFormFromRow,
  nextCrewListStage,
  planLoi,
  redactSubmission,
} from '../lib/crewList';
import type { CrewListSubmission } from '../lib/crewList';

/**
 * Crew change requests — LOIs and repatriation letters the client has
 * submitted, each with its stage in the pipeline — and, since 23 Aug 2026, the
 * crew lists a coordinator has uploaded and submitted, each with the services
 * chosen from it and the crew rows it carried. Persisted through the storage
 * adapter under 'crewChange.*' (never directly), so a demo survives a reload
 * and "Reset demo" clears it cleanly.
 *
 * The crew list is where the personal data lives, so two rules sit here:
 *  · deletion is the client's at any time — `deleteCrewData` drops the whole
 *    crew array from the submission and redacts every LOI raised from it, and
 *    both are written back in the same breath;
 *  · retention is automatic — every hydration runs `applyRetention` over both
 *    keys, so a list whose thirty days after completion have passed is
 *    redacted the next time the screen opens, every letter raised from it
 *    with it, whether or not anyone pressed the button.
 * The draft (the upload before Submit) never comes near this store.
 */

const KEY_REQUESTS = 'crewChange.requests';
const KEY_SEQ = 'crewChange.seq';
export const KEY_CREW_LISTS = 'crewChange.crewLists';
export const KEY_CL_SEQ = 'crewChange.crewListSeq';

/** Provenance a request can carry — the crew list it was raised from. */
export interface RequestMeta {
  crewListId?: string;
}

/** What the section supplies when a list is submitted; the store fills in the rest. */
export type CrewListInput = Omit<
  CrewListSubmission,
  | 'id'
  | 'createdAt'
  | 'createdAtIso'
  | 'stage'
  | 'receivedAt'
  | 'completedAtIso'
  | 'linkedRequestIds'
  | 'personalDataDeletedAt'
  | 'deletionConfirmedByGac'
>;

export interface CrewListOptions {
  /** Raise one LOI request per visa-national on-signer on the list. */
  raiseLoi: boolean;
  vesselId: string;
  port: string;
}

interface CrewChangeState {
  requests: CrewRequest[];
  crewLists: CrewListSubmission[];
  /** Adds a request at the first stage; returns its id. */
  addRequest(kind: 'loi', form: LoiForm, meta?: RequestMeta): string;
  addRequest(kind: 'repat', form: RepatForm, meta?: RequestMeta): string;
  /** Moves a request forward by one or more stages; the terminal stage holds. */
  advance(id: string, steps?: number): void;
  /**
   * Records a submitted crew list ('CL-0001'…) and, when asked, raises the
   * LOIs that follow from it, each carrying the list's id. Returns the list id.
   */
  addCrewList(input: CrewListInput, opts: CrewListOptions): string;
  /** Moves a list forward; records receipt and completion as it passes them. */
  advanceCrewList(id: string, steps?: number): void;
  /** Drops the personal data from one list and redacts every letter raised from it. */
  deleteCrewData(id: string): void;
  /** The same, over every list that still holds personal data. */
  deleteAllCrewData(): void;
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

/**
 * Both persisted collections, shape-checked and then run through the
 * retention rule in one pass: any list whose thirty days after completion
 * have passed is redacted, every letter raised from it with it, and both are
 * written straight back, so the personal data is gone before the screen has
 * drawn it. This is the automatic deletion the notice promises;
 * `applyRetention` is the pure, tested rule behind it. Entries the shape
 * guards dropped are written out of storage too — data no control can reach
 * must not be data the browser still holds.
 */
export function hydrateCrewChange(now: Date = new Date()): {
  requests: CrewRequest[];
  crewLists: CrewListSubmission[];
} {
  const rawRequests = persistent.get<unknown>(KEY_REQUESTS, []);
  const keptRequests = Array.isArray(rawRequests) ? rawRequests.filter(isCrewRequest) : [];
  const rawLists = persistent.get<unknown>(KEY_CREW_LISTS, []);
  const keptLists = Array.isArray(rawLists) ? rawLists.filter(isCrewListSubmission) : [];
  const { lists, requests } = applyRetention(keptLists, keptRequests, now);
  const droppedRequests = !Array.isArray(rawRequests) || keptRequests.length !== rawRequests.length;
  const droppedLists = !Array.isArray(rawLists) || keptLists.length !== rawLists.length;
  if (droppedRequests || requests !== keptRequests) persistent.set(KEY_REQUESTS, requests);
  if (droppedLists || lists !== keptLists) persistent.set(KEY_CREW_LISTS, lists);
  return { requests, crewLists: lists };
}

/** The crew-list half of a hydration — kept for callers that only need the lists. */
export function readCrewLists(now: Date = new Date()): CrewListSubmission[] {
  return hydrateCrewChange(now).crewLists;
}

function nextId(kind: CrewKind): string {
  const seq = persistent.get<number>(KEY_SEQ, 0) + 1;
  persistent.set(KEY_SEQ, seq);
  return `${kind === 'loi' ? 'LOI' : 'REP'}-${String(seq).padStart(4, '0')}`;
}

function nextCrewListId(): string {
  const seq = persistent.get<number>(KEY_CL_SEQ, 0) + 1;
  persistent.set(KEY_CL_SEQ, seq);
  return `CL-${String(seq).padStart(4, '0')}`;
}

const hydrated = hydrateCrewChange();

export const useCrewChange = create<CrewChangeState>((set, get) => ({
  requests: hydrated.requests,
  crewLists: hydrated.crewLists,

  addRequest(kind: CrewKind, form: LoiForm | RepatForm, meta?: RequestMeta): string {
    const id = nextId(kind);
    const base = {
      id,
      createdAt: stampLabel(),
      ...(meta?.crewListId ? { crewListId: meta.crewListId } : {}),
    };
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

  addCrewList(input, opts) {
    const id = nextCrewListId();
    const linkedRequestIds: string[] = [];
    if (opts.raiseLoi && input.crew) {
      for (const row of planLoi(input.crew).crew) {
        linkedRequestIds.push(
          get().addRequest('loi', loiFormFromRow(row, opts.vesselId, opts.port), {
            crewListId: id,
          }),
        );
      }
    }
    const now = new Date();
    const submission: CrewListSubmission = {
      ...input,
      id,
      createdAt: stampLabel(now),
      createdAtIso: now.toISOString(),
      stage: 'Submitted to GAC',
      receivedAt: null,
      completedAtIso: null,
      linkedRequestIds,
      personalDataDeletedAt: null,
      deletionConfirmedByGac: false,
    };
    const crewLists = [submission, ...get().crewLists];
    persistent.set(KEY_CREW_LISTS, crewLists);
    set({ crewLists });
    return id;
  },

  advanceCrewList(id, steps = 1) {
    const crewLists = get().crewLists.map((s): CrewListSubmission => {
      if (s.id !== id) return s;
      let next = s;
      for (let i = 0; i < Math.max(1, steps); i += 1) {
        const stage = nextCrewListStage(next.stage);
        if (stage === next.stage) break;
        next = { ...next, stage };
        if (stage === 'Received by GAC' && next.receivedAt === null) {
          next = { ...next, receivedAt: stampLabel() };
        }
        if (isTerminalCrewListStage(stage) && next.completedAtIso === null) {
          next = { ...next, completedAtIso: new Date().toISOString() };
        }
      }
      return next;
    });
    persistent.set(KEY_CREW_LISTS, crewLists);
    set({ crewLists });
  },

  deleteCrewData(id) {
    const when = stampLabel();
    const crewLists = get().crewLists.map((s) =>
      s.id === id && hasPersonalData(s) ? redactSubmission(s, when) : s,
    );
    const requests = get().requests.map((r) => (r.crewListId === id ? redactRequest(r) : r));
    persistent.set(KEY_CREW_LISTS, crewLists);
    persistent.set(KEY_REQUESTS, requests);
    set({ crewLists, requests });
  },

  deleteAllCrewData() {
    const when = stampLabel();
    const crewLists = get().crewLists.map((s) =>
      hasPersonalData(s) ? redactSubmission(s, when) : s,
    );
    // Every letter raised from ANY list, not just the lists still in state —
    // an entry the shape guard dropped must not shelter its letters from this.
    const requests = get().requests.map((r) => (r.crewListId !== undefined ? redactRequest(r) : r));
    persistent.set(KEY_CREW_LISTS, crewLists);
    persistent.set(KEY_REQUESTS, requests);
    set({ crewLists, requests });
  },

  reset() {
    persistent.remove(KEY_REQUESTS);
    persistent.remove(KEY_SEQ);
    persistent.remove(KEY_CREW_LISTS);
    persistent.remove(KEY_CL_SEQ);
    set({ requests: [], crewLists: [] });
  },
}));
