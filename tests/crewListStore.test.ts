import { beforeEach, describe, expect, it } from 'vitest';
import { CREW_TEMPLATE_HEADERS, DEMO_CREW_ROWS } from '../src/data/crewList';
import { LOI_DEMO_FORM } from '../src/data/crewChange';
import { VESSELS } from '../src/data/vessels';
import { REDACTED_FIELD } from '../src/lib/crewChange';
import { importFromTable, planLoi, RETENTION_DAYS_AFTER_COMPLETION } from '../src/lib/crewList';
import type { CrewListSubmission } from '../src/lib/crewList';
import {
  hydrateCrewChange,
  KEY_CL_SEQ,
  KEY_CREW_LISTS,
  readCrewLists,
  useCrewChange,
} from '../src/store/crewChange';
import type { CrewListInput } from '../src/store/crewChange';

/**
 * The crew-list side of the crew-change store (Contract D): a submission is
 * recorded with its LOIs raised and linked, the stage machine stamps receipt
 * and completion, deletion redacts the list and every letter raised from it,
 * and hydration applies the thirty-day retention rule.
 */

const DEMO = importFromTable('crew-list-demo.xlsx', 'Crew list', [
  CREW_TEMPLATE_HEADERS,
  ...DEMO_CREW_ROWS,
]);
const VESSEL = VESSELS[0]!;

function input(overrides: Partial<CrewListInput> = {}): CrewListInput {
  return {
    vesselId: VESSEL.id,
    port: 'Aberdeen',
    fileName: 'crew-list-demo.xlsx',
    crewCount: DEMO.rows.length,
    onCount: 5,
    offCount: 3,
    services: {
      loi: true,
      hotels: true,
      taxis: true,
      hotelId: 'granite-quay-hotel',
      hotelNights: 1,
      loiCount: 5,
      rooms: 8,
      runs: 4,
    },
    crew: DEMO.rows,
    ...overrides,
  };
}

const STORED_LISTS = `gac-connect:${KEY_CREW_LISTS}`;
const STORED_REQUESTS = 'gac-connect:crewChange.requests';

/** Every personal value the demo list carries — none may survive a deletion. */
const PERSONAL = DEMO.rows.flatMap((r) => [
  r.familyName,
  r.forenames,
  r.passportNumber,
  r.dateOfBirth,
]);

describe('Crew list store — submission, LOIs raised from it, stages', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useCrewChange.getState().reset();
  });

  it('records CL-0001, raises one LOI per visa-national on-signer and links them', () => {
    const id = useCrewChange
      .getState()
      .addCrewList(input(), { raiseLoi: true, vesselId: VESSEL.id, port: 'Aberdeen' });
    expect(id).toBe('CL-0001');
    const sub = useCrewChange.getState().crewLists[0]!;
    expect(sub.id).toBe(id);
    expect(sub.stage).toBe('Submitted to GAC');
    expect(sub.receivedAt).toBeNull();
    expect(sub.completedAtIso).toBeNull();
    expect(sub.personalDataDeletedAt).toBeNull();
    expect(sub.deletionConfirmedByGac).toBe(false);
    expect(sub.crew).toHaveLength(8);

    const expected = planLoi(DEMO.rows).crew.length;
    expect(expected).toBe(5);
    expect(sub.linkedRequestIds).toHaveLength(expected);
    const requests = useCrewChange.getState().requests;
    expect(requests).toHaveLength(expected);
    for (const r of requests) {
      expect(r.kind).toBe('loi');
      expect(r.crewListId).toBe(id);
      expect(r.redacted).toBeUndefined();
      expect(sub.linkedRequestIds).toContain(r.id);
      expect(r.form.vesselId).toBe(VESSEL.id);
      expect(r.form.port).toBe('Aberdeen');
      expect(r.form.familyName).toBe('DEMO');
    }
    // Both keys are written through the adapter.
    expect(window.localStorage.getItem(STORED_LISTS)).toContain('CL-0001');
    expect(window.localStorage.getItem(`gac-connect:${KEY_CL_SEQ}`)).toBe('1');
    expect(window.localStorage.getItem(STORED_REQUESTS)).toContain('"crewListId":"CL-0001"');
  });

  it('raiseLoi false raises nothing; ids run on; newest first', () => {
    const store = useCrewChange.getState();
    const a = store.addCrewList(input(), {
      raiseLoi: false,
      vesselId: VESSEL.id,
      port: 'Aberdeen',
    });
    const b = store.addCrewList(input(), {
      raiseLoi: false,
      vesselId: VESSEL.id,
      port: 'Aberdeen',
    });
    expect([a, b]).toEqual(['CL-0001', 'CL-0002']);
    expect(useCrewChange.getState().requests).toEqual([]);
    expect(useCrewChange.getState().crewLists.map((s) => s.id)).toEqual(['CL-0002', 'CL-0001']);
    expect(useCrewChange.getState().crewLists[0]!.linkedRequestIds).toEqual([]);
  });

  it('a plain addRequest carries no crew list id, and a meta one does', () => {
    const plain = useCrewChange.getState().addRequest('loi', LOI_DEMO_FORM);
    const linked = useCrewChange
      .getState()
      .addRequest('loi', LOI_DEMO_FORM, { crewListId: 'CL-0009' });
    const requests = useCrewChange.getState().requests;
    expect(requests.find((r) => r.id === plain)?.crewListId).toBeUndefined();
    expect(requests.find((r) => r.id === linked)?.crewListId).toBe('CL-0009');
  });

  it('advances through the stages, stamping receipt and completion once each', () => {
    const id = useCrewChange
      .getState()
      .addCrewList(input(), { raiseLoi: false, vesselId: VESSEL.id, port: 'Aberdeen' });
    const get = () => useCrewChange.getState().crewLists.find((s) => s.id === id)!;

    useCrewChange.getState().advanceCrewList(id);
    expect(get().stage).toBe('Received by GAC');
    expect(get().receivedAt).toMatch(/\d{2}:\d{2}/);
    expect(get().completedAtIso).toBeNull();
    const receivedAt = get().receivedAt;

    useCrewChange.getState().advanceCrewList(id);
    expect(get().stage).toBe('Being arranged');
    useCrewChange.getState().advanceCrewList(id);
    expect(get().stage).toBe('Crew change complete');
    expect(get().completedAtIso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const completedAtIso = get().completedAtIso;

    // Past the end holds, and the stamps do not move.
    useCrewChange.getState().advanceCrewList(id, 5);
    expect(get().stage).toBe('Crew change complete');
    expect(get().receivedAt).toBe(receivedAt);
    expect(get().completedAtIso).toBe(completedAtIso);

    // Two steps at once stamps both milestones it passes.
    const other = useCrewChange
      .getState()
      .addCrewList(input(), { raiseLoi: false, vesselId: VESSEL.id, port: 'Aberdeen' });
    useCrewChange.getState().advanceCrewList(other, 3);
    const o = useCrewChange.getState().crewLists.find((s) => s.id === other)!;
    expect(o.stage).toBe('Crew change complete');
    expect(o.receivedAt).not.toBeNull();
    expect(o.completedAtIso).not.toBeNull();
  });
});

describe('Crew list store — deletion and retention', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useCrewChange.getState().reset();
  });

  it('deleteCrewData drops the crew and redacts every LOI raised from that list, in storage too', () => {
    const store = useCrewChange.getState();
    const id = store.addCrewList(input(), {
      raiseLoi: true,
      vesselId: VESSEL.id,
      port: 'Aberdeen',
    });
    // A letter typed by hand is untouched by the list's deletion.
    const handTyped = store.addRequest('loi', LOI_DEMO_FORM);
    store.advanceCrewList(id);

    useCrewChange.getState().deleteCrewData(id);

    const sub = useCrewChange.getState().crewLists.find((s) => s.id === id)!;
    expect(sub.crew).toBeNull();
    expect(sub.personalDataDeletedAt).toMatch(/\d{2}:\d{2}/);
    expect(sub.deletionConfirmedByGac).toBe(true);
    expect(sub.crewCount).toBe(8);
    expect(sub.services.loiCount).toBe(5);
    expect(sub.stage).toBe('Received by GAC');

    const requests = useCrewChange.getState().requests;
    for (const r of requests.filter((x) => x.crewListId === id)) {
      expect(r.redacted).toBe(true);
      expect(r.form.familyName).toBe(REDACTED_FIELD);
      expect(r.form.passportNumber).toBe(REDACTED_FIELD);
      expect(r.form.vesselId).toBe(VESSEL.id);
    }
    const untouched = requests.find((r) => r.id === handTyped)!;
    expect(untouched.redacted).toBeUndefined();
    expect(untouched.form.familyName).toBe('Demo');

    // Nothing personal from the list survives anywhere in storage — the lists
    // key, and every request raised from the list (the hand-typed letter keeps
    // its own details, which happen to share the demo date of birth).
    const storedRequests = JSON.parse(window.localStorage.getItem(STORED_REQUESTS)!) as {
      crewListId?: string;
    }[];
    const stored =
      window.localStorage.getItem(STORED_LISTS)! +
      JSON.stringify(storedRequests.filter((r) => r.crewListId === id));
    for (const value of PERSONAL) {
      if (value === '') continue;
      expect(stored).not.toContain(value);
    }
    expect(stored).not.toContain('X000000');
    expect(window.localStorage.getItem(STORED_REQUESTS)).toContain(`"crewListId":"${id}"`);
  });

  it('deleteAllCrewData covers every list that still holds data and leaves the rest alone', () => {
    const store = useCrewChange.getState();
    const a = store.addCrewList(input(), { raiseLoi: true, vesselId: VESSEL.id, port: 'Aberdeen' });
    const b = store.addCrewList(input(), { raiseLoi: true, vesselId: VESSEL.id, port: 'Aberdeen' });
    useCrewChange.getState().deleteCrewData(a);
    const aDeletedAt = useCrewChange
      .getState()
      .crewLists.find((s) => s.id === a)!.personalDataDeletedAt;

    useCrewChange.getState().deleteAllCrewData();
    const lists = useCrewChange.getState().crewLists;
    expect(lists.every((s) => s.crew === null)).toBe(true);
    expect(lists.find((s) => s.id === a)!.personalDataDeletedAt).toBe(aDeletedAt);
    expect(lists.find((s) => s.id === b)!.personalDataDeletedAt).not.toBeNull();
    expect(useCrewChange.getState().requests.every((r) => r.redacted === true)).toBe(true);
    expect(window.localStorage.getItem(STORED_REQUESTS)).not.toContain('X000000');
  });

  it('hydration applies the thirty-day rule to BOTH keys: the list and every letter raised from it come back redacted and are written back', () => {
    const id = useCrewChange
      .getState()
      .addCrewList(input(), { raiseLoi: true, vesselId: VESSEL.id, port: 'Aberdeen' });
    useCrewChange.getState().advanceCrewList(id, 3);
    const completed = new Date(useCrewChange.getState().crewLists[0]!.completedAtIso!);
    const dayBefore = new Date(
      completed.getTime() + (RETENTION_DAYS_AFTER_COMPLETION - 1) * 24 * 60 * 60 * 1000,
    );
    const dayAfter = new Date(
      completed.getTime() + (RETENTION_DAYS_AFTER_COMPLETION + 1) * 24 * 60 * 60 * 1000,
    );

    expect(hydrateCrewChange(dayBefore).crewLists[0]!.crew).toHaveLength(8);
    expect(window.localStorage.getItem(STORED_LISTS)).toContain('X0000001');
    expect(window.localStorage.getItem(STORED_REQUESTS)).toContain('X0000001');

    const purged = hydrateCrewChange(dayAfter);
    expect(purged.crewLists[0]!.crew).toBeNull();
    expect(purged.crewLists[0]!.personalDataDeletedAt).toMatch(/automatic/);
    expect(purged.crewLists[0]!.deletionConfirmedByGac).toBe(true);
    // The LOIs raised from the list carry the same passports and names — the
    // purge that leaves them behind is the purge the notice does not describe.
    expect(purged.requests.length).toBe(5);
    expect(purged.requests.every((r) => r.redacted === true)).toBe(true);
    for (const value of PERSONAL) {
      expect(window.localStorage.getItem(STORED_LISTS)).not.toContain(value);
      expect(window.localStorage.getItem(STORED_REQUESTS)).not.toContain(value);
    }
  });

  it('hydration scrubs entries the shape guard dropped — personal data no control can reach must not stay in storage', () => {
    const orphanLoi = {
      id: 'LOI-0099',
      createdAt: 'Sat 23 Aug · 09:00',
      kind: 'loi',
      form: LOI_DEMO_FORM,
      stage: 'GAC checking',
      crewListId: 'CL-0099',
    };
    // A malformed list entry still carrying a crew array, plus a well-formed
    // orphaned letter pointing at it. The guard drops the list; the write-back
    // must drop it from storage too, and delete-all must still reach the letter.
    window.localStorage.setItem(
      STORED_LISTS,
      JSON.stringify([{ id: 'CL-0099', crew: [{ passportNumber: 'X0000042' }] }]),
    );
    window.localStorage.setItem(STORED_REQUESTS, JSON.stringify([orphanLoi]));
    const hydrated = hydrateCrewChange();
    expect(hydrated.crewLists).toEqual([]);
    expect(window.localStorage.getItem(STORED_LISTS)).not.toContain('X0000042');
    expect(hydrated.requests.map((r) => r.id)).toEqual(['LOI-0099']);

    useCrewChange.setState({ requests: hydrated.requests, crewLists: hydrated.crewLists });
    useCrewChange.getState().deleteAllCrewData();
    expect(useCrewChange.getState().requests[0]!.redacted).toBe(true);
    expect(window.localStorage.getItem(STORED_REQUESTS)).not.toContain('X0000000');
  });

  it('readCrewLists drops malformed entries and tolerates junk', () => {
    const good: CrewListSubmission = {
      ...input({ crew: null }),
      id: 'CL-0007',
      createdAt: 'Sat 23 Aug · 09:00',
      createdAtIso: '2026-08-23T09:00:00.000Z',
      stage: 'Submitted to GAC',
      receivedAt: null,
      completedAtIso: null,
      linkedRequestIds: [],
      personalDataDeletedAt: null,
      deletionConfirmedByGac: false,
    };
    window.localStorage.setItem(
      STORED_LISTS,
      JSON.stringify([{ id: 'CL-0001' }, 'nonsense', good, { ...good, stage: 'Lost' }]),
    );
    expect(readCrewLists().map((s) => s.id)).toEqual(['CL-0007']);
    window.localStorage.setItem(STORED_LISTS, 'not json');
    expect(readCrewLists()).toEqual([]);
  });

  it('reset clears the crew lists and their sequence as well as the requests', () => {
    useCrewChange
      .getState()
      .addCrewList(input(), { raiseLoi: true, vesselId: VESSEL.id, port: 'Aberdeen' });
    useCrewChange.getState().reset();
    expect(useCrewChange.getState().crewLists).toEqual([]);
    expect(useCrewChange.getState().requests).toEqual([]);
    expect(window.localStorage.getItem(STORED_LISTS)).toBeNull();
    expect(window.localStorage.getItem(`gac-connect:${KEY_CL_SEQ}`)).toBeNull();
    expect(window.localStorage.getItem(STORED_REQUESTS)).toBeNull();
  });
});
