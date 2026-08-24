import { describe, expect, it } from 'vitest';
import {
  CREW_DATA_NOTICE,
  CREW_LIST_ILLUSTRATIVE,
  CREW_LIST_STEPS,
  CREW_SERVICE_CARDS,
  CREW_TEMPLATE_FILE_NAME,
  CREW_TEMPLATE_HEADERS,
  DELETE_CONFIRM,
  DEMO_CREW_ROWS,
  HEADER_SYNONYMS,
} from '../src/data/crewList';
import { VESSELS } from '../src/data/vessels';
import { isLoiForm, redactLoiForm, validateLoi } from '../src/lib/crewChange';
import type { CrewRequest } from '../src/lib/crewChange';
import { LOI_DEMO_FORM } from '../src/data/crewChange';
import {
  applyMapping,
  CREW_FIELDS,
  CREW_LIST_STAGES,
  crewFieldLabel,
  deletionAvailability,
  detectMapping,
  fieldForHeader,
  findHeaderRow,
  hasPersonalData,
  applyRetention,
  importFromTable,
  isCrewListSubmission,
  isCrewRow,
  isDueForPurge,
  isTerminalCrewListStage,
  loiFormFromRow,
  maskPassport,
  nextCrewListStage,
  normaliseDate,
  normaliseMovement,
  normaliseTime,
  normaliseVisaNational,
  planHotel,
  planLoi,
  planTaxis,
  purgeAtIso,
  purgeExpired,
  redactSubmission,
  RETENTION_DAYS_AFTER_COMPLETION,
  rowIssues,
  serviceSummary,
  simulateCrewListAction,
  splitDateTime,
  splitFullName,
  summarise,
  unmappedFields,
  withMapping,
  withoutRow,
} from '../src/lib/crewList';
import type { CrewField, CrewListSubmission, CrewRow } from '../src/lib/crewList';
import { DEMO_FLIGHTS, TRANSFER_BUFFERS } from '../src/lib/transfers';

/**
 * Crew list upload (owner's ask, 23 Aug 2026): read the coordinator's own
 * spreadsheet, offer the services that follow from it, delete the personal
 * data when the job is done — and prove the deletion leaves nothing behind.
 */

const TEMPLATE_FIELDS: CrewField[] = [
  'familyName',
  'forenames',
  'rank',
  'nationality',
  'dateOfBirth',
  'passportNumber',
  'passportExpiry',
  'movement',
  'flightNumber',
  'flightDate',
  'flightTime',
  'flightFrom',
  'vessel',
  'port',
];

const SCRAMBLED_HEADERS = [
  'Surname',
  'Given names',
  'Rank',
  'Nat.',
  'DOB',
  'PPT No',
  'PPT Exp',
  'On/Off',
  'Flight',
  'ETA',
  'From',
  'Vessel',
];

function demoImport() {
  return importFromTable('demo-crew-list.xlsx', 'Crew', [CREW_TEMPLATE_HEADERS, ...DEMO_CREW_ROWS]);
}

function row(over: Partial<CrewRow> = {}): CrewRow {
  return {
    id: 'r1',
    familyName: 'DEMO',
    forenames: 'Crew Member 1',
    rank: 'Master',
    nationality: 'Demo nationality A',
    dateOfBirth: '01/01/1990',
    passportNumber: 'X0000001',
    passportExpiry: '01/01/2031',
    movement: 'on',
    flightNumber: 'ZZ 417',
    flightDate: '22/08/2026',
    flightTime: '13:55',
    flightFrom: 'Amsterdam',
    vessel: VESSELS[0]!.name,
    port: 'Aberdeen',
    visaNational: null,
    issues: [],
    ...over,
  };
}

function submission(over: Partial<CrewListSubmission> = {}): CrewListSubmission {
  const crew = demoImport().rows;
  return {
    id: 'CL-0001',
    createdAt: 'Sun 23 Aug · 09:41',
    createdAtIso: '2026-08-23T08:41:00.000Z',
    vesselId: VESSELS[0]!.id,
    port: 'Aberdeen',
    fileName: 'demo-crew-list.xlsx',
    crewCount: crew.length,
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
    stage: 'Submitted to GAC',
    receivedAt: null,
    completedAtIso: null,
    crew,
    linkedRequestIds: ['LOI-0001', 'LOI-0002', 'LOI-0003', 'LOI-0004', 'LOI-0005'],
    personalDataDeletedAt: null,
    deletionConfirmedByGac: false,
    ...over,
  };
}

describe('Crew list — reading the headings', () => {
  it('maps the template headers, in order, to the template fields', () => {
    expect(detectMapping(CREW_TEMPLATE_HEADERS)).toEqual(TEMPLATE_FIELDS);
  });

  it('maps a scrambled real-world header set the way a coordinator writes it', () => {
    expect(detectMapping(SCRAMBLED_HEADERS)).toEqual([
      'familyName',
      'forenames',
      'rank',
      'nationality',
      'dateOfBirth',
      'passportNumber',
      'passportExpiry',
      'movement',
      'flightNumber',
      'flightTime',
      'flightFrom',
      'vessel',
    ]);
  });

  it('is blind to case, spacing and punctuation', () => {
    expect(fieldForHeader('  PASSPORT   NO. ')).toBe('passportNumber');
    expect(fieldForHeader('Passport-Expiry')).toBe('passportExpiry');
    expect(fieldForHeader('date_of_birth')).toBe('dateOfBirth');
    expect(fieldForHeader('Arrival/Departure time')).toBe('flightTime');
    expect(fieldForHeader('From/To')).toBe('flightFrom');
    expect(fieldForHeader('Name')).toBe('fullName');
    expect(fieldForHeader('Notes')).toBeNull();
    expect(fieldForHeader('')).toBeNull();
  });

  it('a field maps at most once — the first column wins, unknown headings are ignored', () => {
    expect(detectMapping(['Surname', 'Last name', 'Comments', 'Rank'])).toEqual([
      'familyName',
      null,
      null,
      'rank',
    ]);
  });

  it('every field label is its own synonym, and every synonym belongs to the field that lists it', () => {
    for (const f of CREW_FIELDS) expect(fieldForHeader(f.label), f.label).toBe(f.id);
    for (const f of CREW_FIELDS) expect(crewFieldLabel(f.id)).toBe(f.label);
    // A word listed under two fields would be claimed by the first — keep the table unambiguous.
    const seen = new Map<string, CrewField>();
    for (const [field, words] of Object.entries(HEADER_SYNONYMS) as [CrewField, string[]][]) {
      for (const w of words) {
        const key = w.toLowerCase().replace(/[^a-z0-9]+/g, '');
        expect(seen.get(key) ?? field, `'${w}' listed under ${seen.get(key)} and ${field}`).toBe(
          field,
        );
        seen.set(key, field);
      }
    }
  });

  it('finds the header row under a title line and blank rows, and falls back to the first row', () => {
    const sheet = [
      ['Crew change — MV Demo', '', '', ''],
      ['', '', '', ''],
      ['Surname', 'Forenames', 'Rank', 'Passport No'],
      ['DEMO', 'Crew Member 1', 'Master', 'X0000001'],
    ];
    expect(findHeaderRow(sheet)).toBe(2);
    expect(
      findHeaderRow([
        ['a', 'b', 'c'],
        ['d', 'e', 'f'],
      ]),
    ).toBe(0);
    expect(findHeaderRow([])).toBe(0);
  });

  it('reports the fields no column carries, treating full name and family/forenames as alternatives', () => {
    expect(unmappedFields(detectMapping(CREW_TEMPLATE_HEADERS))).toEqual(['visaNational']);
    expect(unmappedFields(['fullName', 'rank'])).not.toContain('familyName');
    expect(unmappedFields(['fullName', 'rank'])).not.toContain('forenames');
    expect(unmappedFields(['familyName', 'forenames'])).not.toContain('fullName');
    expect(unmappedFields([null, null])).toContain('fullName');
    expect(unmappedFields([null, null])).toContain('familyName');
    expect(unmappedFields([null, null])).toContain('passportExpiry');
  });
});

describe('Crew list — building an import', () => {
  it('reads the demo list: eight rows, ids by source row, mapping from the headers', () => {
    const imp = demoImport();
    expect(imp.fileName).toBe('demo-crew-list.xlsx');
    expect(imp.sheetName).toBe('Crew');
    expect(imp.headerRow).toBe(0);
    expect(imp.headers).toEqual(CREW_TEMPLATE_HEADERS);
    expect(imp.mapping).toEqual(TEMPLATE_FIELDS);
    expect(imp.raw).toHaveLength(8);
    expect(imp.rows.map((r) => r.id)).toEqual(['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8']);
    expect(imp.unmapped).toEqual(['visaNational']);
    expect(imp.rows[0]).toMatchObject({
      familyName: 'DEMO',
      forenames: 'Crew Member 1',
      rank: 'Master',
      passportNumber: 'X0000001',
      passportExpiry: '01/01/2031',
      movement: 'on',
      flightNumber: 'ZZ 417',
      flightDate: '22/08/2026',
      flightTime: '13:55',
      flightFrom: 'Amsterdam',
      port: 'Aberdeen',
      visaNational: null,
      issues: [],
    });
  });

  it('drops trailing blank columns and rows, and pads short rows so the table is rectangular', () => {
    const imp = importFromTable('crew.csv', 'CSV', [
      ['Surname', 'Forenames', 'Rank', '', ''],
      ['DEMO', 'Crew Member 1', 'Master', '', ''],
      ['DEMO', 'Crew Member 2'],
      ['', '', '', '', ''],
    ]);
    expect(imp.headers).toEqual(['Surname', 'Forenames', 'Rank']);
    expect(imp.raw).toEqual([
      ['DEMO', 'Crew Member 1', 'Master'],
      ['DEMO', 'Crew Member 2', ''],
      ['', '', ''],
    ]);
    expect(imp.rows.map((r) => r.id)).toEqual(['r1', 'r2']);
  });

  it('skips rows that are empty in every mapped column', () => {
    const rows = applyMapping(
      [
        ['DEMO', 'Crew Member 1', 'note'],
        ['', '', 'a note with no crew member'],
      ],
      ['familyName', 'forenames', null],
    );
    expect(rows.map((r) => r.id)).toEqual(['r1']);
  });

  it('re-mapping a column recomputes the rows, and the later column wins a field', () => {
    const imp = demoImport();
    const ignored = withMapping(imp, 5, null);
    expect(ignored.rows[0]!.passportNumber).toBe('');
    expect(ignored.rows[0]!.issues).toContain('Passport number missing');
    expect(ignored.unmapped).toContain('passportNumber');
    const back = withMapping(ignored, 5, 'passportNumber');
    expect(back.rows[0]!.passportNumber).toBe('X0000001');
    // Two columns mapped to rank — the later one is the one the coordinator meant.
    const twice = withMapping(imp, 3, 'rank');
    expect(twice.rows[0]!.rank).toBe('Demo nationality A');
    expect(twice.rows[0]!.nationality).toBe('');
  });

  it('removing a row keeps the other ids put, and a remap does not bring it back', () => {
    const imp = withoutRow(demoImport(), 'r7');
    expect(imp.rows.map((r) => r.id)).toEqual(['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r8']);
    expect(withMapping(imp, 2, null).rows).toHaveLength(7);
    expect(withoutRow(imp, 'nonsense')).toBe(imp);
    expect(withoutRow(imp, 'r99')).toBe(imp);
  });
});

describe('Crew list — normalising what a spreadsheet says', () => {
  it('splits a full name either way round; mapped family name and forenames win', () => {
    expect(splitFullName('SMITH, John')).toEqual({ familyName: 'SMITH', forenames: 'John' });
    expect(splitFullName('John Smith')).toEqual({ familyName: 'Smith', forenames: 'John' });
    expect(splitFullName('John Paul Smith')).toEqual({
      familyName: 'Smith',
      forenames: 'John Paul',
    });
    expect(splitFullName('Smith')).toEqual({ familyName: 'Smith', forenames: '' });
    expect(splitFullName('')).toEqual({ familyName: '', forenames: '' });
    const rows = applyMapping(
      [
        ['DEMO, Crew Member 1', '', ''],
        ['Crew Member 2 DEMO', '', ''],
        ['IGNORED, Name', 'DEMO', 'Crew Member 3'],
      ],
      ['fullName', 'familyName', 'forenames'],
    );
    expect(rows.map((r) => [r.familyName, r.forenames])).toEqual([
      ['DEMO', 'Crew Member 1'],
      ['DEMO', 'Crew Member 2'],
      ['DEMO', 'Crew Member 3'],
    ]);
  });

  it('reads on/off signer the many ways crew lists write it', () => {
    for (const w of [
      'On',
      'on',
      'ON-SIGNER',
      'onsigner',
      'Join',
      'joiner',
      'Joining',
      'Embark',
      'embarking',
      'Arrival',
      'arriving',
      'IN',
      'J',
    ]) {
      expect(normaliseMovement(w), w).toBe('on');
    }
    for (const w of [
      'Off',
      'OFF',
      'off-signer',
      'offsigner',
      'Leave',
      'leaver',
      'Leaving',
      'Disembark',
      'Repat',
      'Departure',
      'departing',
      'out',
      'L',
    ]) {
      expect(normaliseMovement(w), w).toBe('off');
    }
    expect(normaliseMovement('')).toBe('');
    expect(normaliseMovement('maybe')).toBe('');
    expect(normaliseMovement('transit')).toBe('');
  });

  it('reads the visa-national column as yes, no, or not stated', () => {
    for (const w of ['Yes', 'y', 'TRUE', 'Required', 'visa', 'Visa national']) {
      expect(normaliseVisaNational(w), w).toBe(true);
    }
    for (const w of ['No', 'n', 'false', 'Not required', 'waiver', 'EEA', 'EU']) {
      expect(normaliseVisaNational(w), w).toBe(false);
    }
    expect(normaliseVisaNational('')).toBeNull();
    expect(normaliseVisaNational('?')).toBeNull();
    expect(normaliseVisaNational('N/A')).toBeNull();
  });

  it('normalises dates to DD/MM/YYYY and refuses two-digit years', () => {
    const cases: [string, string][] = [
      ['22/08/2026', '22/08/2026'],
      ['2/8/2026', '02/08/2026'],
      ['22.08.2026', '22/08/2026'],
      ['22-08-2026', '22/08/2026'],
      ['2026-08-22', '22/08/2026'],
      ['22 Aug 2026', '22/08/2026'],
      ['22 August 2026', '22/08/2026'],
      ['22-Aug-2026', '22/08/2026'],
      ['22-AUG-2026', '22/08/2026'],
      ['Aug 22, 2026', '22/08/2026'],
      ['22/08/2026 13:55', '22/08/2026'],
      ['2026-08-22T13:55:00', '22/08/2026'],
      ['2026-08-22T13:55:00.000Z', '22/08/2026'],
      ['2026-08-22 13:55', '22/08/2026'],
      ['  01/01/1990  ', '01/01/1990'],
    ];
    for (const [input, want] of cases) expect(normaliseDate(input), input).toBe(want);
    for (const bad of [
      '',
      '22/08/26',
      '22-Aug-26',
      '31/02/2026',
      '08/22/2026',
      'Friday',
      '2026',
      '22 Foo 2026',
    ]) {
      expect(normaliseDate(bad), bad).toBe('');
    }
  });

  it('normalises times to HH:MM', () => {
    const cases: [string, string][] = [
      ['14:35', '14:35'],
      ['9:40', '09:40'],
      ['1435', '14:35'],
      ['935', '09:35'],
      ['14.35', '14:35'],
      ['14h35', '14:35'],
      ['2:35 pm', '14:35'],
      ['2:35PM', '14:35'],
      ['2 pm', '14:00'],
      ['12:00 am', '00:00'],
      ['12:15 pm', '12:15'],
      ['09:40:00', '09:40'],
      ['22/08/2026 13:55', '13:55'],
      ['2026-08-22T09:40:00', '09:40'],
    ];
    for (const [input, want] of cases) expect(normaliseTime(input), input).toBe(want);
    for (const bad of ['', '25:00', '14:60', '13:55 pm', 'noon', '22/08/2026', '7']) {
      expect(normaliseTime(bad), bad).toBe('');
    }
  });

  it('splits a date-time cell so a flight date column can carry the time', () => {
    expect(splitDateTime('22/08/2026 13:55')).toEqual({ date: '22/08/2026', time: '13:55' });
    expect(splitDateTime('2026-08-22T13:55:00Z')).toEqual({ date: '2026-08-22', time: '13:55' });
    expect(splitDateTime('22/08/2026')).toEqual({ date: '22/08/2026', time: '' });
    const rows = applyMapping(
      [['DEMO', '22/08/2026 13:55', '']],
      ['familyName', 'flightDate', 'flightTime'],
    );
    expect(rows[0]!.flightDate).toBe('22/08/2026');
    expect(rows[0]!.flightTime).toBe('13:55');
    // A time column of its own still wins.
    const own = applyMapping(
      [['DEMO', '22/08/2026 13:55', '14:10']],
      ['familyName', 'flightDate', 'flightTime'],
    );
    expect(own[0]!.flightTime).toBe('14:10');
  });
});

describe('Crew list — what needs attention', () => {
  it('a complete row has no issues; the demo list has exactly one — row 7, no passport expiry', () => {
    expect(rowIssues(row())).toEqual([]);
    const rows = demoImport().rows;
    expect(rows.filter((r) => r.issues.length)).toHaveLength(1);
    expect(rows[6]!.id).toBe('r7');
    expect(rows[6]!.movement).toBe('off');
    expect(rows[6]!.issues).toEqual(['Passport expiry missing']);
  });

  it('names each missing detail in the words the table shows', () => {
    expect(
      rowIssues(
        row({
          familyName: '',
          passportNumber: '',
          passportExpiry: '',
          dateOfBirth: '',
          movement: '',
          flightNumber: '',
          flightTime: '',
        }),
      ),
    ).toEqual([
      'Name missing',
      'Passport number missing',
      'Passport expiry missing',
      'Date of birth missing',
      'On- or off-signer not stated',
      'Flight not stated',
    ]);
  });

  it('a flight is stated by its number or by its time', () => {
    expect(rowIssues(row({ flightNumber: '', flightTime: '13:55' }))).toEqual([]);
    expect(rowIssues(row({ flightNumber: 'ZZ 417', flightTime: '' }))).toEqual([]);
  });

  it('flags a passport that expires on or before the travel date, only when both dates parse', () => {
    expect(rowIssues(row({ passportExpiry: '22/08/2026' }))).toEqual([
      'Passport expired or expiring before travel',
    ]);
    expect(rowIssues(row({ passportExpiry: '01/01/2020' }))).toEqual([
      'Passport expired or expiring before travel',
    ]);
    expect(rowIssues(row({ passportExpiry: '23/08/2026' }))).toEqual([]);
    expect(rowIssues(row({ passportExpiry: '01/01/2020', flightDate: '' }))).toEqual([]);
  });

  it('carries the raw text of a date it could not read, instead of calling it missing', () => {
    const raw = [
      ['DEMO', 'Crew Member 1', '01/01/90', '22/08/26', 'Friday', 'ZZ 417', 'X0000001', 'on'],
    ];
    const rows = applyMapping(raw, [
      'familyName',
      'forenames',
      'dateOfBirth',
      'passportExpiry',
      'flightDate',
      'flightNumber',
      'passportNumber',
      'movement',
    ]);
    expect(rows[0]!.issues).toEqual([
      'Date not recognised: 01/01/90',
      'Date not recognised: 22/08/26',
      'Date not recognised: Friday',
    ]);
    expect(rows[0]!.dateOfBirth).toBe('');
  });

  it('never shouts', () => {
    const all = [
      ...rowIssues(
        row({
          familyName: '',
          passportNumber: '',
          passportExpiry: '',
          dateOfBirth: '',
          movement: '',
          flightNumber: '',
          flightTime: '',
        }),
      ),
      ...rowIssues(row({ passportExpiry: '22/08/2026' })),
    ];
    expect(all.filter((i) => /!/.test(i))).toEqual([]);
  });

  it('summarises the list: totals, on/off, unstated, issues, and who may need an LOI', () => {
    expect(summarise(demoImport().rows)).toEqual({
      total: 8,
      on: 5,
      off: 3,
      unstated: 0,
      withIssues: 1,
      visaNational: 5,
    });
    expect(
      summarise([row({ movement: '' }), row({ movement: 'on', visaNational: false })]),
    ).toEqual({
      total: 2,
      on: 1,
      off: 0,
      unstated: 1,
      withIssues: 0,
      visaNational: 0,
    });
    expect(summarise([])).toEqual({
      total: 0,
      on: 0,
      off: 0,
      unstated: 0,
      withIssues: 0,
      visaNational: 0,
    });
  });

  it('masks a passport number to its last four characters', () => {
    expect(maskPassport('X0000017')).toBe('••••0017');
    expect(maskPassport('X0000001')).toBe('••••0001');
    expect(maskPassport('AB12')).toBe('••••');
    expect(maskPassport('')).toBe('••••');
    expect(maskPassport(' X0000017 ')).toBe('••••0017');
  });
});

describe('Crew list — the services that follow from it', () => {
  it('LOIs go to on-signers who are, or may be, visa nationals — never off-signers, never EEA crew', () => {
    const rows = [
      row({ id: 'r1', movement: 'on', visaNational: null }),
      row({ id: 'r2', movement: 'on', visaNational: true }),
      row({ id: 'r3', movement: 'on', visaNational: false }),
      row({ id: 'r4', movement: 'off', visaNational: true }),
      row({ id: 'r5', movement: '', visaNational: true }),
    ];
    expect(planLoi(rows).crew.map((r) => r.id)).toEqual(['r1', 'r2']);
    expect(planLoi(demoImport().rows).crew).toHaveLength(5);
  });

  it('hotel rooms default to one per crew member, at least one night', () => {
    const rows = demoImport().rows;
    expect(planHotel(rows, 2)).toMatchObject({ rooms: 8, nights: 2 });
    expect(planHotel(rows, 2).crew).toHaveLength(8);
    expect(planHotel(rows, 0).nights).toBe(1);
    expect(planHotel(rows, 1.5).nights).toBe(1);
    expect(planHotel([], 3)).toMatchObject({ rooms: 0, nights: 3, crew: [] });
  });

  it('groups taxis by flight and date — the demo list makes four runs, all tracked', () => {
    const { runs } = planTaxis(demoImport().rows, 'Aberdeen');
    expect(runs.map((r) => [r.flightNumber, r.crew.length, r.direction, r.tracked])).toEqual([
      ['ZZ 417', 3, 'arriving', true],
      ['ZZ 122', 2, 'arriving', true],
      ['ZZ 204', 2, 'departing', true],
      ['ZZ 131', 1, 'departing', true],
    ]);
    expect(runs[0]!.flightDate).toBe('22/08/2026');
    expect(runs[0]!.flightFrom).toBe('Amsterdam');
  });

  it('an arriving tracked flight picks up at the feed estimate plus the bags-and-immigration buffer', () => {
    const { runs } = planTaxis(demoImport().rows, 'Aberdeen');
    expect(runs[0]!.flightTime).toBe(DEMO_FLIGHTS.ZZ417!.scheduled);
    expect(runs[0]!.pickupTime).toBe('14:35'); // 13:55 + 40
    expect(TRANSFER_BUFFERS.bagsAndImmigrationMin).toBe(40);
  });

  it('a departing run works back from check-in and the road time to the port', () => {
    const { runs } = planTaxis(demoImport().rows, 'Aberdeen');
    // ZZ 204 departs 17:10 − 120 min check-in − 25 min Aberdeen road = 14:45.
    expect(runs[2]!.pickupTime).toBe('14:45');
    expect(TRANSFER_BUFFERS.checkInBeforeDepartureMin).toBe(120);
    expect(TRANSFER_BUFFERS.taxiMin.Aberdeen).toBe(25);
    const peterhead = planTaxis(demoImport().rows, 'Peterhead').runs[2]!;
    expect(peterhead.pickupTime).toBe('14:15'); // 55 min by road
    // A port the buffers do not list gets the planner's 30 min default.
    expect(planTaxis(demoImport().rows, 'Elsewhere').runs[2]!.pickupTime).toBe('14:40');
  });

  it('a flight the feed does not know is timed from the sheet; no time means no pick-up time', () => {
    const rows = [
      row({ id: 'r1', flightNumber: 'XX 999', flightTime: '10:00', flightFrom: 'Somewhere' }),
      row({ id: 'r2', flightNumber: 'xx999', flightTime: '', flightDate: '22/08/2026' }),
      row({ id: 'r3', flightNumber: 'XX 999', flightDate: '23/08/2026', flightTime: '10:00' }),
      row({ id: 'r4', flightNumber: '', flightTime: '', movement: 'off' }),
      row({ id: 'r5', flightNumber: '', flightTime: '', movement: '' }),
    ];
    const { runs } = planTaxis(rows, 'Aberdeen');
    expect(runs).toHaveLength(4);
    // Same flight, same date → one run, whatever the spacing and case.
    expect(runs[0]!.crew.map((r) => r.id)).toEqual(['r1', 'r2']);
    expect(runs[0]!.tracked).toBe(false);
    expect(runs[0]!.pickupTime).toBe('10:40');
    expect(runs[0]!.flightFrom).toBe('Somewhere');
    // A different date is a different run.
    expect(runs[1]!.crew.map((r) => r.id)).toEqual(['r3']);
    // No flight number → a run of its own, direction from the movement, no time to work from.
    expect(runs[2]!.crew.map((r) => r.id)).toEqual(['r4']);
    expect(runs[2]!.direction).toBe('departing');
    expect(runs[2]!.pickupTime).toBe('');
    expect(runs[3]!.direction).toBe('arriving');
  });

  it('summarises the chosen services in the words the submit card uses', () => {
    const rows = demoImport().rows;
    const all = {
      loi: true,
      hotels: true,
      taxis: true,
      hotelId: 'granite-quay-hotel',
      hotelNights: 1,
      port: 'Aberdeen',
    };
    expect(serviceSummary(all, rows)).toEqual([
      'LOIs · 5 visa-national on-signers',
      'Hotel · 8 rooms × 1 night at Granite Quay Hotel, subject to availability',
      'Taxis · 4 runs for 8 crew, timed to the flights',
    ]);
    expect(serviceSummary({ ...all, hotels: false, taxis: false }, rows)).toEqual([
      'LOIs · 5 visa-national on-signers',
    ]);
    expect(serviceSummary({ ...all, loi: false, hotels: false, taxis: false }, rows)).toEqual([]);
    expect(serviceSummary({ ...all, hotelNights: 2, hotelRooms: 3 }, rows)[1]).toBe(
      'Hotel · 3 rooms × 2 nights at Granite Quay Hotel, subject to availability',
    );
    expect(serviceSummary({ ...all, hotelId: 'nonsense' }, rows)[1]).toContain(
      'at a GAC-vetted hotel',
    );
    const one = [row({ movement: 'on', visaNational: true })];
    expect(serviceSummary(all, one)).toEqual([
      'LOIs · 1 visa-national on-signer',
      'Hotel · 1 room × 1 night at Granite Quay Hotel, subject to availability',
      'Taxis · 1 run for 1 crew member, timed to the flights',
    ]);
  });

  it('fills an LOI template from a row — valid, visa-national unless the list says otherwise', () => {
    const form = loiFormFromRow(row(), VESSELS[0]!.id, 'Aberdeen');
    expect(form).toEqual({
      familyName: 'DEMO',
      forenames: 'Crew Member 1',
      nationality: 'Demo nationality A',
      dateOfBirth: '01/01/1990',
      passportNumber: 'X0000001',
      passportExpiry: '01/01/2031',
      vesselId: VESSELS[0]!.id,
      port: 'Aberdeen',
      joiningDate: '22/08/2026',
      arrivingFlight: 'ZZ 417 · arriving Aberdeen 22/08/2026 13:55',
      visaNational: true,
    });
    expect(isLoiForm(form)).toBe(true);
    expect(validateLoi(form)).toEqual([]);
    expect(loiFormFromRow(row({ visaNational: false }), 'v', 'Aberdeen').visaNational).toBe(false);
    expect(
      loiFormFromRow(row({ flightNumber: '', flightTime: '' }), 'v', 'Aberdeen').arrivingFlight,
    ).toBe('arriving Aberdeen 22/08/2026');
  });
});

describe('Crew list — the submission and its stages', () => {
  it('runs submitted → received → being arranged → complete, and holds at the end', () => {
    expect(CREW_LIST_STAGES).toEqual([
      'Submitted to GAC',
      'Received by GAC',
      'Being arranged',
      'Crew change complete',
    ]);
    expect(nextCrewListStage('Submitted to GAC')).toBe('Received by GAC');
    expect(nextCrewListStage('Received by GAC')).toBe('Being arranged');
    expect(nextCrewListStage('Being arranged')).toBe('Crew change complete');
    expect(nextCrewListStage('Crew change complete')).toBe('Crew change complete');
    expect(nextCrewListStage('garbage')).toBe('Submitted to GAC');
    expect(isTerminalCrewListStage('Crew change complete')).toBe(true);
    expect(isTerminalCrewListStage('Being arranged')).toBe(false);
  });

  it('offers one simulate button per stage, each moving one step, none at the end', () => {
    expect(simulateCrewListAction('Submitted to GAC')).toEqual({
      label: 'Simulate: GAC confirms receipt',
      steps: 1,
    });
    expect(simulateCrewListAction('Received by GAC')).toEqual({
      label: 'Simulate: GAC arranges the services',
      steps: 1,
    });
    expect(simulateCrewListAction('Being arranged')).toEqual({
      label: 'Simulate: crew change complete',
      steps: 1,
    });
    expect(simulateCrewListAction('Crew change complete')).toBeNull();
    for (const s of CREW_LIST_STAGES) {
      const a = simulateCrewListAction(s);
      if (a) expect(CREW_LIST_STAGES).toContain(nextCrewListStage(s));
    }
  });

  it('deletion is a withdrawal before receipt, a deletion after, and nothing once done', () => {
    expect(deletionAvailability(submission())).toEqual({
      allowed: true,
      label: 'Withdraw and delete crew data',
      note: 'GAC has not confirmed receipt yet — withdrawing deletes the list before anyone has acted on it.',
    });
    for (const stage of ['Received by GAC', 'Being arranged', 'Crew change complete'] as const) {
      const a = deletionAvailability(submission({ stage }));
      expect(a.allowed).toBe(true);
      expect(a.label).toBe('Delete crew data');
      expect(a.note).toMatch(/asks GAC to delete its working copy/);
      expect(a.note).toMatch(/stay for the invoice/);
    }
    expect(deletionAvailability(redactSubmission(submission(), 'now'))).toEqual({
      allowed: false,
      label: 'Personal data deleted',
      note: '',
    });
  });
});

describe('Crew list — retention: thirty days after completion', () => {
  const completed = '2026-09-01T12:00:00.000Z';

  it('the retention period is the thirty days the notice promises', () => {
    expect(RETENTION_DAYS_AFTER_COMPLETION).toBe(30);
    expect(CREW_DATA_NOTICE.points.some((p) => /thirty days/.test(p.body))).toBe(true);
  });

  it('the purge date is thirty days after completion, and nothing until then', () => {
    expect(purgeAtIso(submission())).toBeNull();
    expect(purgeAtIso(submission({ stage: 'Being arranged' }))).toBeNull();
    expect(
      purgeAtIso(submission({ stage: 'Crew change complete', completedAtIso: completed })),
    ).toBe('2026-10-01T12:00:00.000Z');
    expect(purgeAtIso(submission({ completedAtIso: 'not a date' }))).toBeNull();
  });

  it('is due the moment the period has run — false the day before, true the day after', () => {
    const done = submission({ stage: 'Crew change complete', completedAtIso: completed });
    expect(isDueForPurge(done, new Date('2026-09-30T12:00:00.000Z'))).toBe(false);
    expect(isDueForPurge(done, new Date('2026-10-01T11:59:59.000Z'))).toBe(false);
    expect(isDueForPurge(done, new Date('2026-10-01T12:00:00.000Z'))).toBe(true);
    expect(isDueForPurge(done, new Date('2026-10-02T12:00:00.000Z'))).toBe(true);
    // Not before the crew change completes, however old the list is.
    expect(isDueForPurge(submission(), new Date('2030-01-01T00:00:00.000Z'))).toBe(false);
    // Nothing left to purge once the data has gone.
    expect(isDueForPurge(redactSubmission(done, 'earlier'), new Date('2030-01-01'))).toBe(false);
  });

  it('purgeExpired redacts what is due, labels it automatic, and leaves the rest untouched', () => {
    const due = submission({
      id: 'CL-0001',
      stage: 'Crew change complete',
      completedAtIso: completed,
    });
    const open = submission({ id: 'CL-0002', stage: 'Being arranged' });
    const recent = submission({
      id: 'CL-0003',
      stage: 'Crew change complete',
      completedAtIso: '2026-09-20T12:00:00.000Z',
    });
    const list = [due, open, recent];
    const before = purgeExpired(list, new Date('2026-09-30T12:00:00.000Z'));
    expect(before).toBe(list); // nothing due — same array, nothing to write back
    const after = purgeExpired(list, new Date('2026-10-02T12:00:00.000Z'));
    expect(after).not.toBe(list);
    expect(after.map((s) => hasPersonalData(s))).toEqual([false, true, true]);
    expect(after[0]!.personalDataDeletedAt).toMatch(/· automatic$/);
    expect(after[0]!.deletionConfirmedByGac).toBe(true);
    expect(after[0]!.crewCount).toBe(8);
    expect(after[1]).toBe(open);
    expect(after[2]).toBe(recent);
    expect(purgeExpired([], new Date())).toEqual([]);
  });

  it('applyRetention sweeps the letters raised from a purged list along with it', () => {
    const due = submission({
      id: 'CL-0001',
      stage: 'Crew change complete',
      completedAtIso: completed,
    });
    const open = submission({ id: 'CL-0002', stage: 'Being arranged' });
    const linked: CrewRequest = {
      id: 'LOI-0001',
      createdAt: 'Sat 23 Aug · 09:00',
      kind: 'loi',
      form: loiFormFromRow(due.crew![0]!, due.vesselId, due.port),
      stage: 'GAC checking',
      crewListId: 'CL-0001',
    };
    const other: CrewRequest = { ...linked, id: 'LOI-0002', crewListId: 'CL-0002' };
    const standalone: CrewRequest = {
      id: 'LOI-0003',
      createdAt: linked.createdAt,
      kind: 'loi',
      form: LOI_DEMO_FORM,
      stage: 'GAC checking',
    };

    const before = applyRetention(
      [due, open],
      [linked, other, standalone],
      new Date('2026-09-30T12:00:00.000Z'),
    );
    expect(before.lists[0]).toBe(due); // nothing due — same entries, nothing to write back
    expect(before.requests[0]).toBe(linked);

    const after = applyRetention(
      [due, open],
      [linked, other, standalone],
      new Date('2026-10-02T12:00:00.000Z'),
    );
    expect(hasPersonalData(after.lists[0]!)).toBe(false);
    expect(after.requests[0]!.redacted).toBe(true);
    expect(JSON.stringify(after.requests[0])).not.toContain(due.crew![0]!.passportNumber);
    // A letter from a list that is not due, and a letter from no list, are untouched.
    expect(after.requests[1]).toBe(other);
    expect(after.requests[2]).toBe(standalone);
    // Already-redacted letters are left as they are, not re-wrapped.
    const again = applyRetention(after.lists, after.requests, new Date('2026-10-03T12:00:00.000Z'));
    expect(again.requests).toBe(after.requests);
  });
});

describe('Crew list — deletion leaves nothing personal behind', () => {
  it('redaction is exhaustive: no passport, name or date of birth survives anywhere in the record', () => {
    const sub = submission({ stage: 'Received by GAC', receivedAt: 'Sun 23 Aug · 10:02' });
    const crew = sub.crew!;
    expect(crew.length).toBe(8);
    const redacted = redactSubmission(sub, 'Sun 23 Aug · 11:15');
    const text = JSON.stringify(redacted);
    for (const r of crew) {
      expect(text).not.toContain(r.passportNumber);
      expect(text).not.toContain(r.familyName);
      expect(text).not.toContain(r.forenames);
      expect(text).not.toContain(r.dateOfBirth);
      expect(text).not.toContain(r.passportExpiry || 'never-matches');
    }
    expect(text).not.toMatch(/X000000\d/);
    expect(text).not.toMatch(/DEMO/);
    expect(redacted.crew).toBeNull();
    expect(hasPersonalData(redacted)).toBe(false);
    expect(redacted.personalDataDeletedAt).toBe('Sun 23 Aug · 11:15');
    expect(redacted.deletionConfirmedByGac).toBe(true);
    // The reference, counts, services and linked letters stay for the invoice.
    expect(redacted).toMatchObject({
      id: 'CL-0001',
      crewCount: 8,
      onCount: 5,
      offCount: 3,
      services: sub.services,
      stage: 'Received by GAC',
      receivedAt: 'Sun 23 Aug · 10:02',
      linkedRequestIds: sub.linkedRequestIds,
    });
    // The original is untouched — the store replaces, it does not mutate.
    expect(sub.crew).toBe(crew);
  });

  it('an LOI raised from the list is redacted field by field, keeping vessel, port and the visa flag', () => {
    const form = loiFormFromRow(demoImport().rows[0]!, VESSELS[0]!.id, 'Aberdeen');
    const redacted = redactLoiForm(form);
    const text = JSON.stringify(redacted);
    expect(text).not.toContain('X0000001');
    expect(text).not.toContain('DEMO');
    expect(text).not.toContain('Crew Member');
    expect(text).not.toContain('01/01/1990');
    expect(text).not.toContain('ZZ 417');
    expect(redacted.vesselId).toBe(VESSELS[0]!.id);
    expect(redacted.port).toBe('Aberdeen');
    expect(redacted.visaNational).toBe(true);
    expect(isLoiForm(redacted)).toBe(true);
    expect(redacted.familyName).toBe('—');
  });
});

describe('Crew list — persisted shape guard', () => {
  it('accepts a well-formed submission, with crew present or deleted', () => {
    expect(isCrewListSubmission(submission())).toBe(true);
    expect(isCrewListSubmission(redactSubmission(submission(), 'now'))).toBe(true);
    expect(isCrewListSubmission(JSON.parse(JSON.stringify(submission())))).toBe(true);
    expect(isCrewRow(row())).toBe(true);
  });

  it('rejects junk: wrong types, a stage from another pipeline, a crew row with a missing field', () => {
    const good = submission();
    expect(isCrewListSubmission(null)).toBe(false);
    expect(isCrewListSubmission('CL-0001')).toBe(false);
    expect(isCrewListSubmission({ ...good, id: 1 })).toBe(false);
    expect(isCrewListSubmission({ ...good, stage: 'Submitted by client' })).toBe(false);
    expect(isCrewListSubmission({ ...good, services: undefined })).toBe(false);
    expect(isCrewListSubmission({ ...good, services: { ...good.services, loi: 'yes' } })).toBe(
      false,
    );
    expect(isCrewListSubmission({ ...good, crewCount: '8' })).toBe(false);
    expect(isCrewListSubmission({ ...good, crew: 'eight people' })).toBe(false);
    expect(isCrewListSubmission({ ...good, crew: [{ ...row(), passportNumber: 1 }] })).toBe(false);
    expect(isCrewListSubmission({ ...good, crew: [{ ...row(), movement: 'sideways' }] })).toBe(
      false,
    );
    expect(isCrewListSubmission({ ...good, crew: [{ ...row(), issues: 'none' }] })).toBe(false);
    expect(isCrewListSubmission({ ...good, crew: [{ ...row(), visaNational: 'yes' }] })).toBe(
      false,
    );
    expect(isCrewListSubmission({ ...good, linkedRequestIds: 'LOI-0001' })).toBe(false);
    expect(isCrewListSubmission({ ...good, receivedAt: 5 })).toBe(false);
    expect(isCrewListSubmission({ ...good, deletionConfirmedByGac: 'true' })).toBe(false);
    expect(isCrewListSubmission({ ...good, personalDataDeletedAt: undefined })).toBe(false);
    expect(isCrewRow({ ...row(), id: undefined })).toBe(false);
  });
});

describe('Crew list — copy and demo data guardrails', () => {
  it('the data-protection notice says thirty days and delete, and never shouts or names an address', () => {
    const text = JSON.stringify(CREW_DATA_NOTICE);
    expect(CREW_DATA_NOTICE.title).toBe('How crew data is handled');
    expect(CREW_DATA_NOTICE.points).toHaveLength(5);
    expect(text).not.toMatch(/!/);
    expect(text).not.toMatch(/@/);
    expect(text).toMatch(/thirty days/);
    expect(text).toMatch(/delete/);
    expect(CREW_DATA_NOTICE.intro).toMatch(/^Illustrative/);
    expect(CREW_DATA_NOTICE.acknowledgement).toMatch(/authorised/); // British English
    expect(text).not.toMatch(/authorized/);
  });

  it('the rest of the section copy is free of exclamation marks and addresses too', () => {
    const text = JSON.stringify({
      CREW_LIST_ILLUSTRATIVE,
      CREW_SERVICE_CARDS,
      CREW_LIST_STEPS,
      DELETE_CONFIRM,
      CREW_TEMPLATE_HEADERS,
    });
    expect(text).not.toMatch(/!/);
    expect(text).not.toMatch(/@/);
    expect(CREW_LIST_ILLUSTRATIVE).toMatch(/^Illustrative/);
    expect(CREW_LIST_ILLUSTRATIVE).toMatch(/do not upload real passport data/);
    expect(CREW_LIST_STEPS).toEqual([
      'Upload',
      'Check',
      'Choose services',
      'Submit',
      'Delete when done',
    ]);
    expect(Object.keys(CREW_SERVICE_CARDS)).toEqual(['loi', 'hotels', 'taxis']);
    expect(DELETE_CONFIRM.title).toBe('Delete crew data?');
    expect(DELETE_CONFIRM.confirm).toBe('Delete crew data');
    expect(DELETE_CONFIRM.cancel).toBe('Keep for now');
    expect(DELETE_CONFIRM.body).toMatch(/cannot be undone/);
    // The delete-all dialog must not say 'for this list' about many lists.
    expect(DELETE_CONFIRM.body).toMatch(/for this list/);
    expect(DELETE_CONFIRM.bodyAll).toMatch(/for every list that still holds them/);
    expect(DELETE_CONFIRM.bodyAll).not.toMatch(/for this list/);
    expect(DELETE_CONFIRM.bodyAll).toMatch(/cannot be undone/);
    // The template file name carries no brand string (src/config/brand.ts is the only place).
    expect(CREW_TEMPLATE_FILE_NAME).toBe('crew-list-template.xlsx');
  });

  it('the demo crew are obviously fictional — DEMO family, X0000001…8 passports, ZZ flights, demo nationalities', () => {
    expect(DEMO_CREW_ROWS).toHaveLength(8);
    for (const r of DEMO_CREW_ROWS) expect(r).toHaveLength(CREW_TEMPLATE_HEADERS.length);
    expect(DEMO_CREW_ROWS.map((r) => r[0])).toEqual(Array(8).fill('DEMO'));
    expect(DEMO_CREW_ROWS.map((r) => r[1])).toEqual(
      [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `Crew Member ${n}`),
    );
    expect(DEMO_CREW_ROWS.map((r) => r[5])).toEqual(
      [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `X000000${n}`),
    );
    for (const r of DEMO_CREW_ROWS) {
      expect(r[3]).toMatch(/^Demo nationality [AB]$/);
      expect(r[8]).toMatch(/^ZZ \d{3}$/);
      expect(r[12]).toBe(VESSELS[0]!.name);
      expect(r[13]).toBe('Aberdeen');
    }
    // Five on-signers on ZZ 417 ×3 and ZZ 122 ×2; three off-signers on ZZ 204 ×2 and ZZ 131 ×1.
    expect(DEMO_CREW_ROWS.map((r) => r[7])).toEqual([
      'On',
      'On',
      'On',
      'On',
      'On',
      'Off',
      'Off',
      'Off',
    ]);
    expect(DEMO_CREW_ROWS.map((r) => r[8])).toEqual([
      'ZZ 417',
      'ZZ 417',
      'ZZ 417',
      'ZZ 122',
      'ZZ 122',
      'ZZ 204',
      'ZZ 204',
      'ZZ 131',
    ]);
    // Every demo flight is one the simulated feed knows, with its scheduled time on the sheet.
    for (const r of DEMO_CREW_ROWS) {
      const feed = DEMO_FLIGHTS[r[8]!.replace(' ', '')];
      expect(feed, r[8]).toBeDefined();
      expect(r[10]).toBe(feed!.scheduled);
    }
    // Row 7 — an off-signer — is the one without a passport expiry.
    expect(DEMO_CREW_ROWS[6]![6]).toBe('');
    expect(DEMO_CREW_ROWS[6]![7]).toBe('Off');
    expect(DEMO_CREW_ROWS.filter((r) => r[6] === '')).toHaveLength(1);
  });
});
