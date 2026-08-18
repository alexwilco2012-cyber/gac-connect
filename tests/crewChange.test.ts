import { beforeEach, describe, expect, it } from 'vitest';
import {
  CREW_PORTS,
  CREW_SECTIONS,
  DEFAULT_CREW_SECTION,
  ILLUSTRATIVE_NOTICE,
  LOI_DEMO_FORM,
  REPAT_DEMO_FORM,
  resolveCrewSection,
  STAGE_NOTES,
} from '../src/data/crewChange';
import { VESSELS } from '../src/data/vessels';
import {
  formatCrewName,
  isCrewRequest,
  isLoiForm,
  isRepatForm,
  isTerminalStage,
  LOI_STAGES,
  loiRequired,
  nextStage,
  parseDateText,
  REPAT_STAGES,
  simulateAction,
  stageIndex,
  stagesFor,
  stageTone,
  stampLabel,
  validateLoi,
  validateRepat,
} from '../src/lib/crewChange';
import { readRequests, useCrewChange } from '../src/store/crewChange';

describe('Crew change — stage pipelines', () => {
  it('LOI runs client → GAC checking → endorsed as agents → returned', () => {
    expect(LOI_STAGES).toEqual([
      'Submitted by client',
      'GAC checking',
      'Endorsed by GAC — signed as agents',
      'Returned to client',
    ]);
  });

  it('Repat runs client → prepared → UKBF → endorsed → returned', () => {
    expect(REPAT_STAGES).toEqual([
      'Submitted by client',
      'Prepared by GAC',
      'Sent to UK Border Force for endorsement',
      'Endorsed by UKBF',
      'Returned to client',
    ]);
  });

  it('nextStage walks each pipeline one step at a time', () => {
    for (const kind of ['loi', 'repat'] as const) {
      const stages = stagesFor(kind);
      for (let i = 0; i < stages.length - 1; i += 1) {
        expect(nextStage(kind, stages[i]!)).toBe(stages[i + 1]);
      }
    }
    expect(nextStage('loi', 'Submitted by client')).toBe('GAC checking');
    expect(nextStage('repat', 'Sent to UK Border Force for endorsement')).toBe('Endorsed by UKBF');
  });

  it('the terminal stage returns itself', () => {
    expect(nextStage('loi', 'Returned to client')).toBe('Returned to client');
    expect(nextStage('repat', 'Returned to client')).toBe('Returned to client');
    expect(isTerminalStage('loi', 'Returned to client')).toBe(true);
    expect(isTerminalStage('repat', 'Endorsed by UKBF')).toBe(false);
  });

  it('an unrecognised stage restarts at the first stage rather than sticking', () => {
    expect(nextStage('loi', 'garbage')).toBe('Submitted by client');
    expect(stageIndex('repat', 'garbage')).toBe(-1);
  });

  it('stage tone is info in progress and verified once returned', () => {
    expect(stageTone('loi', 'Submitted by client')).toBe('info');
    expect(stageTone('loi', 'Endorsed by GAC — signed as agents')).toBe('info');
    expect(stageTone('loi', 'Returned to client')).toBe('verified');
    expect(stageTone('repat', 'Sent to UK Border Force for endorsement')).toBe('info');
    expect(stageTone('repat', 'Returned to client')).toBe('verified');
  });

  it('simulate buttons cover what one party does in one go, and vanish at the end', () => {
    expect(simulateAction('loi', 'Submitted by client')).toEqual({
      label: 'Simulate: GAC checks and endorses',
      steps: 2,
    });
    expect(simulateAction('loi', 'Endorsed by GAC — signed as agents')?.steps).toBe(1);
    expect(simulateAction('loi', 'Returned to client')).toBeNull();
    expect(simulateAction('repat', 'Submitted by client')).toEqual({
      label: 'Simulate: GAC prepares and sends to UKBF',
      steps: 2,
    });
    expect(simulateAction('repat', 'Sent to UK Border Force for endorsement')).toEqual({
      label: 'Simulate: UKBF endorses and returns',
      steps: 2,
    });
    expect(simulateAction('repat', 'Returned to client')).toBeNull();
  });

  it('every simulate action lands on a real stage of its pipeline', () => {
    for (const kind of ['loi', 'repat'] as const) {
      for (const stage of stagesFor(kind)) {
        const action = simulateAction(kind, stage);
        if (!action) continue;
        let s: string = stage;
        for (let i = 0; i < action.steps; i += 1) s = nextStage(kind, s);
        expect(stagesFor(kind)).toContain(s);
        expect(stageIndex(kind, s)).toBeGreaterThan(stageIndex(kind, stage));
      }
    }
  });

  it('every stage has a tracker note', () => {
    for (const s of [...LOI_STAGES, ...REPAT_STAGES]) {
      expect(STAGE_NOTES[s], s).toBeTruthy();
    }
  });
});

describe('Crew change — LOI only for visa nationals, never OKTB', () => {
  it('loiRequired follows the visa-national flag', () => {
    expect(loiRequired(true)).toBe(true);
    expect(loiRequired(false)).toBe(false);
  });
});

describe('Crew change — crew name formatting', () => {
  it('family name in capitals, forenames as given', () => {
    expect(formatCrewName('Demo', 'Crew Member')).toBe('DEMO, Crew Member');
    expect(formatCrewName('  demo ', ' Crew Member ')).toBe('DEMO, Crew Member');
  });

  it('copes with either half missing', () => {
    expect(formatCrewName('Demo', '')).toBe('DEMO');
    expect(formatCrewName('', 'Crew Member')).toBe('Crew Member');
    expect(formatCrewName('', '')).toBe('');
  });
});

describe('Crew change — lenient date text', () => {
  it('parses ISO, British numeric and day-month-name forms', () => {
    expect(parseDateText('2026-08-22')?.toISOString()).toBe('2026-08-22T00:00:00.000Z');
    expect(parseDateText('22/08/2026')?.toISOString()).toBe('2026-08-22T00:00:00.000Z');
    expect(parseDateText('22.08.2026')?.toISOString()).toBe('2026-08-22T00:00:00.000Z');
    expect(parseDateText('22 Aug 2026')?.toISOString()).toBe('2026-08-22T00:00:00.000Z');
    expect(parseDateText('22 August 2026')?.toISOString()).toBe('2026-08-22T00:00:00.000Z');
    expect(parseDateText('1 Sept 2026')?.toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });

  it('rejects blanks, two-digit years, impossible dates and free text', () => {
    expect(parseDateText('')).toBeNull();
    expect(parseDateText('22/08/26')).toBeNull();
    expect(parseDateText('31/02/2026')).toBeNull();
    expect(parseDateText('on or around Friday')).toBeNull();
    expect(parseDateText('22 Foo 2026')).toBeNull();
  });
});

describe('Crew change — LOI validation', () => {
  it('the demo prefill is complete and valid', () => {
    expect(validateLoi(LOI_DEMO_FORM)).toEqual([]);
  });

  it('lists every missing required field by label', () => {
    const problems = validateLoi({
      ...LOI_DEMO_FORM,
      familyName: '',
      passportNumber: '  ',
      arrivingFlight: '',
    });
    expect(problems).toEqual(['Family name', 'Passport number', 'Arriving flight']);
  });

  it('passport expiry must be after the joining date when both parse', () => {
    expect(
      validateLoi({ ...LOI_DEMO_FORM, passportExpiry: '22/08/2026', joiningDate: '22/08/2026' }),
    ).toEqual(['Passport expiry must be after the joining date']);
    expect(
      validateLoi({ ...LOI_DEMO_FORM, passportExpiry: '2026-01-01', joiningDate: '22 Aug 2026' }),
    ).toEqual(['Passport expiry must be after the joining date']);
    expect(
      validateLoi({ ...LOI_DEMO_FORM, passportExpiry: '23/08/2026', joiningDate: '22/08/2026' }),
    ).toEqual([]);
  });

  it('an unparseable date is not treated as an ordering error', () => {
    expect(
      validateLoi({ ...LOI_DEMO_FORM, joiningDate: 'on or around Friday', passportExpiry: '2027' }),
    ).toEqual([]);
  });

  it('the visa-national flag does not change field validation', () => {
    expect(validateLoi({ ...LOI_DEMO_FORM, visaNational: false })).toEqual([]);
  });
});

describe('Crew change — repatriation-letter validation', () => {
  it('the demo prefill leaves the Yes/No question unanswered on purpose', () => {
    expect(REPAT_DEMO_FORM.joinedOutsideUk).toBe('');
    expect(validateRepat(REPAT_DEMO_FORM)).toEqual([
      'Joined outside the UK / called at a non-UK port (Yes or No)',
    ]);
  });

  it('is valid once the question is answered either way', () => {
    expect(validateRepat({ ...REPAT_DEMO_FORM, joinedOutsideUk: 'yes' })).toEqual([]);
    expect(validateRepat({ ...REPAT_DEMO_FORM, joinedOutsideUk: 'no' })).toEqual([]);
  });

  it('needs at least one repatriation flight and every required field', () => {
    expect(
      validateRepat({
        ...REPAT_DEMO_FORM,
        joinedOutsideUk: 'yes',
        flights: ['', ' ', ''],
        disembarkationDate: '',
      }),
    ).toEqual(['Disembarkation date', 'Repatriation flights (at least one)']);
    expect(
      validateRepat({ ...REPAT_DEMO_FORM, joinedOutsideUk: 'no', flights: ['', 'XX 002', ''] }),
    ).toEqual([]);
  });
});

describe('Crew change — sections a URL can ask for', () => {
  it('a retired id lands on the section that replaced it, not on the default', () => {
    // Links minted before taxis and launches were split still work.
    expect(resolveCrewSection('transfers')).toBe('taxis');
  });

  it('current ids pass through; anything else falls back to the default', () => {
    for (const s of CREW_SECTIONS) expect(resolveCrewSection(s.id)).toBe(s.id);
    expect(resolveCrewSection('nonsense')).toBe(DEFAULT_CREW_SECTION);
    expect(resolveCrewSection(null)).toBe(DEFAULT_CREW_SECTION);
    expect(resolveCrewSection('')).toBe(DEFAULT_CREW_SECTION);
    expect(DEFAULT_CREW_SECTION).toBe('hotels');
  });
});

describe('Crew change — data guardrails', () => {
  it('six sections (taxis and launches stand apart), three ports, demo vessels from the canonical set', () => {
    expect(CREW_SECTIONS.map((s) => s.id)).toEqual([
      'hotels',
      'taxis',
      'launches',
      'immigration',
      'loi',
      'repat',
    ]);
    // Every section carries its own one-line summary, and none of them shout.
    expect(CREW_SECTIONS.filter((s) => s.summary.trim() === '')).toEqual([]);
    expect(CREW_SECTIONS.filter((s) => /!/.test(`${s.label} ${s.summary}`))).toEqual([]);
    expect(CREW_PORTS).toEqual(['Aberdeen', 'Peterhead', 'Montrose']);
    expect(VESSELS.some((v) => v.id === LOI_DEMO_FORM.vesselId)).toBe(true);
    expect(VESSELS.some((v) => v.id === REPAT_DEMO_FORM.vesselId)).toBe(true);
  });

  it('demo passport data is obviously fictional and the screen says so', () => {
    expect(LOI_DEMO_FORM.familyName).toBe('Demo');
    expect(LOI_DEMO_FORM.passportNumber).toBe('X0000000');
    expect(REPAT_DEMO_FORM.passportNumber).toBe('X0000000');
    expect(ILLUSTRATIVE_NOTICE).toMatch(/^Illustrative/);
    expect(ILLUSTRATIVE_NOTICE).not.toMatch(/!/);
  });

  it('created-at label is a short British stamp', () => {
    expect(stampLabel(new Date(2026, 7, 18, 9, 41))).toBe('Tue 18 Aug · 09:41');
  });
});

describe('Crew change — persisted shape guards', () => {
  const loiRequest = {
    id: 'LOI-0001',
    createdAt: 'Tue 18 Aug · 09:41',
    kind: 'loi',
    form: LOI_DEMO_FORM,
    stage: 'GAC checking',
  };
  const repatRequest = {
    id: 'REP-0002',
    createdAt: 'Tue 18 Aug · 09:42',
    kind: 'repat',
    form: { ...REPAT_DEMO_FORM, joinedOutsideUk: 'yes' },
    stage: 'Endorsed by UKBF',
  };

  it('accepts well-formed forms and rejects missing or mistyped fields', () => {
    expect(isLoiForm(LOI_DEMO_FORM)).toBe(true);
    expect(isLoiForm({ ...LOI_DEMO_FORM, visaNational: 'yes' })).toBe(false);
    expect(isLoiForm({ ...LOI_DEMO_FORM, familyName: undefined })).toBe(false);
    expect(isLoiForm(null)).toBe(false);
    expect(isRepatForm(REPAT_DEMO_FORM)).toBe(true);
    expect(isRepatForm({ ...REPAT_DEMO_FORM, joinedOutsideUk: 'maybe' })).toBe(false);
    expect(isRepatForm({ ...REPAT_DEMO_FORM, flights: 'XX 001' })).toBe(false);
    expect(isRepatForm({ ...REPAT_DEMO_FORM, flights: ['XX 001', 2] })).toBe(false);
  });

  it('accepts a request only when kind, form and stage agree', () => {
    expect(isCrewRequest(loiRequest)).toBe(true);
    expect(isCrewRequest(repatRequest)).toBe(true);
    // Missing form — the crash the guard exists to prevent.
    expect(isCrewRequest({ id: 'BAD-0001', kind: 'loi', stage: 'Submitted by client' })).toBe(
      false,
    );
    // Stage from the other pipeline.
    expect(isCrewRequest({ ...loiRequest, stage: 'Endorsed by UKBF' })).toBe(false);
    // Kind and form mismatch.
    expect(isCrewRequest({ ...loiRequest, kind: 'repat' })).toBe(false);
    expect(isCrewRequest({ ...loiRequest, kind: 'other' })).toBe(false);
    expect(isCrewRequest({ ...loiRequest, id: 1 })).toBe(false);
    expect(isCrewRequest('LOI-0001')).toBe(false);
  });

  it('readRequests drops garbage entries and keeps the good ones', () => {
    window.localStorage.setItem(
      'gac-connect:crewChange.requests',
      JSON.stringify([
        { id: 'BAD-0001', kind: 'loi', stage: 'Submitted by client' },
        loiRequest,
        'nonsense',
        { ...repatRequest, form: {} },
        repatRequest,
      ]),
    );
    expect(readRequests().map((r) => r.id)).toEqual(['LOI-0001', 'REP-0002']);

    window.localStorage.setItem('gac-connect:crewChange.requests', '{"not":"an array"}');
    expect(readRequests()).toEqual([]);
    window.localStorage.setItem('gac-connect:crewChange.requests', 'not even json');
    expect(readRequests()).toEqual([]);
    window.localStorage.removeItem('gac-connect:crewChange.requests');
  });
});

describe('Crew change — store persists through the adapter', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useCrewChange.getState().reset();
  });

  it('adds, advances and resets, writing under crewChange.* keys', () => {
    const { addRequest } = useCrewChange.getState();
    const loiId = addRequest('loi', LOI_DEMO_FORM);
    const repId = addRequest('repat', { ...REPAT_DEMO_FORM, joinedOutsideUk: 'yes' });
    expect(loiId).toMatch(/^LOI-\d{4}$/);
    expect(repId).toMatch(/^REP-\d{4}$/);

    let requests = useCrewChange.getState().requests;
    expect(requests.map((r) => r.id)).toEqual([repId, loiId]); // newest first
    expect(requests.every((r) => r.stage === 'Submitted by client')).toBe(true);
    expect(window.localStorage.getItem('gac-connect:crewChange.requests')).toContain(loiId);
    expect(window.localStorage.getItem('gac-connect:crewChange.seq')).toBe('2');

    useCrewChange.getState().advance(loiId, 2);
    useCrewChange.getState().advance(repId);
    requests = useCrewChange.getState().requests;
    expect(requests.find((r) => r.id === loiId)?.stage).toBe('Endorsed by GAC — signed as agents');
    expect(requests.find((r) => r.id === repId)?.stage).toBe('Prepared by GAC');

    // Advancing past the end holds at the terminal stage.
    useCrewChange.getState().advance(loiId, 10);
    expect(useCrewChange.getState().requests.find((r) => r.id === loiId)?.stage).toBe(
      'Returned to client',
    );

    useCrewChange.getState().reset();
    expect(useCrewChange.getState().requests).toEqual([]);
    expect(window.localStorage.getItem('gac-connect:crewChange.requests')).toBeNull();
    expect(window.localStorage.getItem('gac-connect:crewChange.seq')).toBeNull();
  });
});
