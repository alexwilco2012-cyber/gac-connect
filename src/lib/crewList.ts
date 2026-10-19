import { HEADER_SYNONYMS } from '../data/crewList';
import { supplierById } from '../data/suppliers';
import { parseDateText, redactRequest, stampLabel } from './crewChange';
import type { CrewRequest, LoiForm } from './crewChange';
import { isFinalStageIn, isStageOf, nextStageIn, stageIndexIn } from './pipeline';
import { addMinutes, normaliseFlightNo, trackFlight, TRANSFER_BUFFERS } from './transfers';

/**
 * Crew list upload — the domain rules for a crew coordinator's own
 * spreadsheet (owner's ask, 23 Aug 2026). The coordinator uploads the list
 * they already keep — names, passports, flights, in whatever columns they
 * use — and the platform reads the headings, normalises the rows, flags what
 * is missing and offers the services that hang off the list: an LOI per
 * visa-national on-signer, rooms, and taxis grouped by flight and timed to
 * it. Then the personal data is deleted — by the coordinator at any time, or
 * automatically thirty days after the crew change completes.
 *
 * This module knows nothing about files: the spreadsheet reader (`lib/xlsx`)
 * hands it a grid of strings and the section glues the two together. Nothing
 * here is persisted except the submission record, and redaction of that
 * record is exhaustive by construction — the whole `crew` array goes, not
 * selected fields — which the tests prove by string-searching the result.
 */

/* ------------------------------------------------------------------ Fields */

export type CrewField =
  | 'familyName'
  | 'forenames'
  | 'fullName'
  | 'rank'
  | 'nationality'
  | 'dateOfBirth'
  | 'passportNumber'
  | 'passportExpiry'
  | 'movement'
  | 'flightNumber'
  | 'flightDate'
  | 'flightTime'
  | 'flightFrom'
  | 'vessel'
  | 'port'
  | 'visaNational';

/**
 * Every field a column can be mapped to, with the column name shown in the
 * mapping selects and the template. `required` marks the name: a list needs
 * either a family-name column or a full-name column (one of the two), and the
 * rest are reported as issues row by row rather than refused up front.
 */
export const CREW_FIELDS: { id: CrewField; label: string; required?: boolean }[] = [
  { id: 'familyName', label: 'Family name', required: true },
  { id: 'forenames', label: 'Forenames' },
  { id: 'fullName', label: 'Full name', required: true },
  { id: 'rank', label: 'Rank' },
  { id: 'nationality', label: 'Nationality' },
  { id: 'dateOfBirth', label: 'Date of birth' },
  { id: 'passportNumber', label: 'Passport number' },
  { id: 'passportExpiry', label: 'Passport expiry' },
  { id: 'movement', label: 'On/Off signer' },
  { id: 'flightNumber', label: 'Flight number' },
  { id: 'flightDate', label: 'Flight date' },
  { id: 'flightTime', label: 'Arrival/Departure time' },
  { id: 'flightFrom', label: 'From/To' },
  { id: 'vessel', label: 'Vessel' },
  { id: 'port', label: 'Port' },
  { id: 'visaNational', label: 'Visa national' },
];

export function crewFieldLabel(field: CrewField): string {
  return CREW_FIELDS.find((f) => f.id === field)?.label ?? field;
}

/** One entry per source column; null = the column is ignored. */
export type ColumnMapping = (CrewField | null)[];

export interface CrewRow {
  /** 'r1'… — the source row's position, so it survives a remap. */
  id: string;
  familyName: string;
  forenames: string;
  rank: string;
  nationality: string;
  /** Normalised DD/MM/YYYY, or '' (the raw text stays in the import's `raw`). */
  dateOfBirth: string;
  passportNumber: string;
  /** DD/MM/YYYY or ''. */
  passportExpiry: string;
  /** On-signer / off-signer / not stated. */
  movement: 'on' | 'off' | '';
  flightNumber: string;
  /** DD/MM/YYYY or ''. */
  flightDate: string;
  /** HH:MM or ''. */
  flightTime: string;
  flightFrom: string;
  vessel: string;
  port: string;
  /** null = not stated in the list. */
  visaNational: boolean | null;
  /** Human, e.g. 'Passport number missing'. */
  issues: string[];
}

export interface CrewImport {
  fileName: string;
  sheetName: string;
  headers: string[];
  mapping: ColumnMapping;
  /** Index of the header row in the sheet. */
  headerRow: number;
  /** Data rows after the header row, rectangular. */
  raw: string[][];
  /** Derived from raw + mapping — recompute with applyMapping. */
  rows: CrewRow[];
  /** Fields no column was mapped to (informational). */
  unmapped: CrewField[];
}

/* ---------------------------------------------------------------- Headers */

/** 'PPT No.' → 'pptno' — what a heading looks like once case, spaces and punctuation are gone. */
export function normaliseHeader(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

let synonymIndex: Map<string, CrewField> | null = null;

/** Normalised synonym → field. The first field that claims a word keeps it. */
function synonyms(): Map<string, CrewField> {
  if (synonymIndex) return synonymIndex;
  const index = new Map<string, CrewField>();
  for (const f of CREW_FIELDS) {
    for (const word of [f.label, ...HEADER_SYNONYMS[f.id]]) {
      const key = normaliseHeader(word);
      if (key && !index.has(key)) index.set(key, f.id);
    }
  }
  synonymIndex = index;
  return index;
}

/** The field a heading names, or null when it is not one the platform knows. */
export function fieldForHeader(header: string): CrewField | null {
  return synonyms().get(normaliseHeader(header)) ?? null;
}

/**
 * The header row: the first row with three or more filled cells of which at
 * least two are headings the platform knows. A title line or a blank row
 * above the table is skipped; when nothing qualifies the first row is used.
 */
export function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const filled = row.filter((c) => c.trim() !== '');
    if (filled.length < 3) continue;
    const known = filled.filter((c) => fieldForHeader(c) !== null).length;
    if (known >= 2) return i;
  }
  return 0;
}

/** Map each heading to a field by synonym. A field maps at most once — the first column wins. */
export function detectMapping(headers: string[]): ColumnMapping {
  const used = new Set<CrewField>();
  return headers.map((h) => {
    const field = fieldForHeader(h);
    if (!field || used.has(field)) return null;
    used.add(field);
    return field;
  });
}

/**
 * Fields no column carries. A full-name column covers family name and
 * forenames, and the pair covers full name, so neither is reported as missing
 * when the other form is present.
 */
export function unmappedFields(mapping: ColumnMapping): CrewField[] {
  const mapped = new Set(mapping.filter((m): m is CrewField => m !== null));
  return CREW_FIELDS.map((f) => f.id).filter((id) => {
    if (mapped.has(id)) return false;
    if (id === 'fullName') return !mapped.has('familyName');
    if (id === 'familyName' || id === 'forenames') return !mapped.has('fullName');
    return true;
  });
}

/* ------------------------------------------------------------ Normalising */

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function ddmmyyyy(d: Date): string {
  return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/**
 * Split 'DD/MM/YYYY HH:MM', '2026-08-22T13:55:00' or '22 Aug 2026 13:55'
 * into its date text and its time text. Plain dates come back with time ''.
 */
export function splitDateTime(text: string): { date: string; time: string } {
  const t = clean(text);
  let m =
    /^(\d{4}-\d{1,2}-\d{1,2})[T ](\d{1,2}:\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/i.exec(
      t,
    );
  if (m) return { date: m[1]!, time: m[2]! };
  m = /^(.+?)\s+(\d{1,2}:\d{2})(?::\d{2})?(?:\s*(am|pm))?$/i.exec(t);
  if (m && m[1] && normaliseDate(m[1]) !== '') {
    return { date: m[1], time: m[3] ? `${m[2]} ${m[3]}` : m[2]! };
  }
  return { date: t, time: '' };
}

/**
 * A date as a crew list writes it → 'DD/MM/YYYY', or '' when it is not one.
 * Takes everything `parseDateText` takes (ISO, British numeric, day month-name
 * year), plus '22-Aug-2026', 'Aug 22, 2026' and any of those with a time on
 * the end. Two-digit years are refused — '22/08/26' is not a date anyone
 * should put on a letter.
 */
export function normaliseDate(text: string): string {
  let t = clean(text);
  if (!t) return '';
  // Trailing time — 'DD/MM/YYYY HH:MM', ISO datetime.
  const iso = /^(\d{4}-\d{1,2}-\d{1,2})[T ]\d{1,2}:\d{2}/i.exec(t);
  if (iso) t = iso[1]!;
  else {
    const withTime = /^(.+?)\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:am|pm))?$/i.exec(t);
    if (withTime) t = withTime[1]!;
  }
  const direct = parseDateText(t);
  if (direct) return ddmmyyyy(direct);
  // 22-Aug-2026 / 22.Aug.2026 / 22Aug2026
  let m = /^(\d{1,2})[-./ ]?([A-Za-z]{3,9})[-./ ,]?\s?(\d{4})$/.exec(t);
  if (m) {
    const month = MONTHS[m[2]!.slice(0, 3).toLowerCase()];
    if (!month) return '';
    const d = parseDateText(`${m[1]}/${month}/${m[3]}`);
    return d ? ddmmyyyy(d) : '';
  }
  // Aug 22, 2026 / August 22 2026
  m = /^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/.exec(t);
  if (m) {
    const month = MONTHS[m[1]!.slice(0, 3).toLowerCase()];
    if (!month) return '';
    const d = parseDateText(`${m[2]}/${month}/${m[3]}`);
    return d ? ddmmyyyy(d) : '';
  }
  return '';
}

/**
 * A time as a crew list writes it → 'HH:MM', or ''. '14:35', '1435', '935',
 * '14.35', '14h35', '2:35 pm', '2 pm' and '09:40:00' all count; so does the
 * time on the end of a date-time cell.
 */
export function normaliseTime(text: string): string {
  let t = clean(text).toLowerCase();
  if (!t) return '';
  const split = splitDateTime(t);
  if (split.time) t = split.time.toLowerCase();
  let h: number;
  let mm: number;
  let meridian: string | undefined;
  let m = /^(\d{1,2})[:.h](\d{2})(?::\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?$/.exec(t);
  if (m) {
    h = Number(m[1]);
    mm = Number(m[2]);
    meridian = m[3];
  } else if ((m = /^(\d{1,2})(\d{2})$/.exec(t))) {
    h = Number(m[1]);
    mm = Number(m[2]);
  } else if ((m = /^(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)$/.exec(t))) {
    h = Number(m[1]);
    mm = 0;
    meridian = m[2];
  } else {
    return '';
  }
  if (meridian) {
    const pm = meridian.startsWith('p');
    if (h < 1 || h > 12) return '';
    if (h === 12) h = pm ? 12 : 0;
    else if (pm) h += 12;
  }
  if (h > 23 || mm > 59) return '';
  return `${pad2(h)}:${pad2(mm)}`;
}

const ON_WORDS = new Set([
  'on',
  'onsigner',
  'onsigners',
  'onsign',
  'signon',
  'signingon',
  'join',
  'joiner',
  'joiners',
  'joining',
  'embark',
  'embarking',
  'embarkation',
  'arrival',
  'arriving',
  'arrive',
  'in',
  'inbound',
  'j',
  'onboard',
]);

const OFF_WORDS = new Set([
  'off',
  'offsigner',
  'offsigners',
  'offsign',
  'signoff',
  'signingoff',
  'leave',
  'leaver',
  'leavers',
  'leaving',
  'disembark',
  'disembarking',
  'disembarkation',
  'repat',
  'repatriation',
  'repatriate',
  'departure',
  'departing',
  'depart',
  'out',
  'outbound',
  'l',
  'offboard',
]);

/** 'On' / 'joiner' / 'embarking' → 'on'; 'Off' / 'leaver' / 'repat' → 'off'; anything else → ''. */
export function normaliseMovement(text: string): 'on' | 'off' | '' {
  const key = text.toLowerCase().replace(/[^a-z]+/g, '');
  if (ON_WORDS.has(key)) return 'on';
  if (OFF_WORDS.has(key)) return 'off';
  return '';
}

const VISA_YES = new Set(['yes', 'y', 'true', 'required', 'visa', 'visanational', '1', 'needed']);
const VISA_NO = new Set([
  'no',
  'n',
  'false',
  'notrequired',
  'notneeded',
  'waiver',
  'visawaiver',
  'eea',
  'eu',
  'none',
  '0',
  'exempt',
]);

/** 'Yes' / 'required' → true; 'No' / 'waiver' / 'EEA' → false; blank or anything else → null. */
export function normaliseVisaNational(text: string): boolean | null {
  const key = text.toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (VISA_YES.has(key)) return true;
  if (VISA_NO.has(key)) return false;
  return null;
}

/**
 * 'SMITH, John' → family SMITH, forenames John. 'John Smith' → family Smith,
 * forenames John (the last word is the family name). One word → family only.
 */
export function splitFullName(text: string): { familyName: string; forenames: string } {
  const t = clean(text);
  if (!t) return { familyName: '', forenames: '' };
  const comma = t.indexOf(',');
  if (comma !== -1) {
    return { familyName: clean(t.slice(0, comma)), forenames: clean(t.slice(comma + 1)) };
  }
  const parts = t.split(' ');
  if (parts.length === 1) return { familyName: t, forenames: '' };
  return { familyName: parts[parts.length - 1]!, forenames: parts.slice(0, -1).join(' ') };
}

/* ------------------------------------------------------------------- Rows */

/** The raw text of the date cells, for the 'Date not recognised' issue. */
export interface RawDateCells {
  dateOfBirth?: string;
  passportExpiry?: string;
  flightDate?: string;
}

type CrewRowInput = Omit<CrewRow, 'id' | 'issues'>;

/**
 * What is wrong with a row, in the words the check table shows. A date cell
 * that held something the platform could not read is reported with its raw
 * text rather than as 'missing', so the coordinator can see what to fix.
 */
export function rowIssues(row: CrewRowInput, raw: RawDateCells = {}): string[] {
  const issues: string[] = [];
  const unreadable = (field: keyof RawDateCells): boolean =>
    clean(raw[field] ?? '') !== '' && row[field] === '';
  if (!row.familyName.trim()) issues.push('Name missing');
  if (!row.passportNumber.trim()) issues.push('Passport number missing');
  if (!row.passportExpiry && !unreadable('passportExpiry')) issues.push('Passport expiry missing');
  const expiry = parseDateText(row.passportExpiry);
  const travel = parseDateText(row.flightDate);
  if (expiry && travel && expiry.getTime() <= travel.getTime()) {
    issues.push('Passport expired or expiring before travel');
  }
  if (!row.dateOfBirth && !unreadable('dateOfBirth')) issues.push('Date of birth missing');
  if (row.movement === '') issues.push('On- or off-signer not stated');
  if (!row.flightNumber.trim() && !row.flightTime) issues.push('Flight not stated');
  for (const field of ['dateOfBirth', 'passportExpiry', 'flightDate'] as const) {
    if (unreadable(field)) issues.push(`Date not recognised: ${clean(raw[field]!)}`);
  }
  return issues;
}

/**
 * Build the crew rows from the data grid and the mapping. When two columns
 * carry the same field the later column wins (the mapping selects let a
 * coordinator move a field; the last choice is the one they meant). Rows that
 * are wholly empty, or empty in every mapped column, are skipped. Ids follow
 * the source row so a remap keeps them.
 */
export function applyMapping(raw: string[][], mapping: ColumnMapping): CrewRow[] {
  const col: Partial<Record<CrewField, number>> = {};
  mapping.forEach((field, i) => {
    if (field) col[field] = i;
  });
  const cell = (row: string[], field: CrewField): string => {
    const i = col[field];
    return i === undefined ? '' : clean(row[i] ?? '');
  };
  const mappedCols = Object.values(col) as number[];
  const rows: CrewRow[] = [];
  raw.forEach((source, index) => {
    if (source.every((c) => clean(c) === '')) return;
    if (mappedCols.length && mappedCols.every((i) => clean(source[i] ?? '') === '')) return;
    const split = splitFullName(cell(source, 'fullName'));
    const flightDateText = cell(source, 'flightDate');
    const fromDate = splitDateTime(flightDateText);
    const base: CrewRowInput = {
      familyName: cell(source, 'familyName') || split.familyName,
      forenames: cell(source, 'forenames') || split.forenames,
      rank: cell(source, 'rank'),
      nationality: cell(source, 'nationality'),
      dateOfBirth: normaliseDate(cell(source, 'dateOfBirth')),
      passportNumber: cell(source, 'passportNumber'),
      passportExpiry: normaliseDate(cell(source, 'passportExpiry')),
      movement: normaliseMovement(cell(source, 'movement')),
      flightNumber: cell(source, 'flightNumber'),
      flightDate: normaliseDate(flightDateText),
      flightTime: normaliseTime(cell(source, 'flightTime')) || normaliseTime(fromDate.time),
      flightFrom: cell(source, 'flightFrom'),
      vessel: cell(source, 'vessel'),
      port: cell(source, 'port'),
      visaNational: normaliseVisaNational(cell(source, 'visaNational')),
    };
    const issues = rowIssues(base, {
      dateOfBirth: cell(source, 'dateOfBirth'),
      passportExpiry: cell(source, 'passportExpiry'),
      flightDate: flightDateText,
    });
    rows.push({ id: `r${index + 1}`, ...base, issues });
  });
  return rows;
}

/** Index just past the last filled cell in a row. */
function filledWidth(row: string[]): number {
  let w = row.length;
  while (w > 0 && clean(row[w - 1] ?? '') === '') w -= 1;
  return w;
}

/** Cut or pad every row to one width so the table and the mapping line up. */
function rectangular(rows: string[][], width: number): string[][] {
  return rows.map((r) => {
    const row = r.slice(0, width);
    while (row.length < width) row.push('');
    return row;
  });
}

/**
 * A whole import from one sheet of strings: find the header row, detect the
 * mapping, build the rows. Trailing columns that are blank in the header and
 * in every data row are dropped. The section calls this once per file and
 * then `withMapping` / `withoutRow` as the coordinator adjusts it.
 */
export function importFromTable(fileName: string, sheetName: string, rows: string[][]): CrewImport {
  const headerRow = findHeaderRow(rows);
  const data = rows.slice(headerRow + 1);
  const width = Math.max(filledWidth(rows[headerRow] ?? []), ...data.map(filledWidth), 0);
  const headers = rectangular([rows[headerRow] ?? []], width)[0]!.map((h) => clean(h));
  const mapping = detectMapping(headers);
  const raw = rectangular(data, width);
  return {
    fileName,
    sheetName,
    headers,
    mapping,
    headerRow,
    raw,
    rows: applyMapping(raw, mapping),
    unmapped: unmappedFields(mapping),
  };
}

/** The same import with one column re-mapped (or ignored). */
export function withMapping(imp: CrewImport, column: number, field: CrewField | null): CrewImport {
  const mapping = imp.mapping.map((m, i) => (i === column ? field : m));
  return {
    ...imp,
    mapping,
    rows: applyMapping(imp.raw, mapping),
    unmapped: unmappedFields(mapping),
  };
}

/** The same import without one crew row — the source row goes too, so a remap does not bring it back. */
export function withoutRow(imp: CrewImport, rowId: string): CrewImport {
  const index = Number(/^r(\d+)$/.exec(rowId)?.[1] ?? NaN) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= imp.raw.length) return imp;
  // Blank the source row rather than splicing it, so the other ids stay put.
  const raw = imp.raw.map((r, i) => (i === index ? r.map(() => '') : r));
  return { ...imp, raw, rows: applyMapping(raw, imp.mapping) };
}

export interface CrewSummary {
  total: number;
  on: number;
  off: number;
  unstated: number;
  withIssues: number;
  /** On-signers who are, or may be, visa nationals — the LOI count. */
  visaNational: number;
}

export function summarise(rows: readonly CrewRow[]): CrewSummary {
  return {
    total: rows.length,
    on: rows.filter((r) => r.movement === 'on').length,
    off: rows.filter((r) => r.movement === 'off').length,
    unstated: rows.filter((r) => r.movement === '').length,
    withIssues: rows.filter((r) => r.issues.length > 0).length,
    visaNational: planLoi(rows).crew.length,
  };
}

/** 'X0000017' → '••••0017'. Four characters or fewer → '••••'. */
export function maskPassport(n: string): string {
  const t = n.trim();
  if (t.length <= 4) return '••••';
  return `••••${t.slice(-4)}`;
}

/* --------------------------------------------------------------- Services */

export interface ServiceChoices {
  loi: boolean;
  hotels: boolean;
  taxis: boolean;
  hotelId: string;
  hotelNights: number;
  /** Rooms wanted; defaults to one per crew member when absent. */
  hotelRooms?: number;
  port: string;
}

/** On-signers who are, or may be, visa nationals — one letter each. */
export interface LoiPlan {
  crew: CrewRow[];
}

/** A room per crew member by default, for the nights asked. */
export interface HotelPlan {
  rooms: number;
  nights: number;
  crew: CrewRow[];
}

export interface TaxiRun {
  key: string;
  flightNumber: string;
  flightDate: string;
  /** The feed's estimate when the flight is tracked, else the time on the sheet. */
  flightTime: string;
  flightFrom: string;
  direction: 'arriving' | 'departing';
  crew: CrewRow[];
  /** True when the demo flight feed knows the flight, so the run re-times on a delay. */
  tracked: boolean;
  /** HH:MM, or '' when there is no time to work from. */
  pickupTime: string;
}

export interface TaxiPlan {
  runs: TaxiRun[];
}

export function planLoi(rows: readonly CrewRow[]): LoiPlan {
  return { crew: rows.filter((r) => r.movement === 'on' && r.visaNational !== false) };
}

export function planHotel(rows: readonly CrewRow[], nights: number): HotelPlan {
  const crew = [...rows];
  return { rooms: crew.length, nights: Math.max(1, Math.floor(nights) || 1), crew };
}

/**
 * One run per flight and date, crew grouped onto it; a row with no flight
 * number gets a run of its own. Arriving runs pick up after bags and
 * immigration; departing runs work back from the check-in deadline and the
 * road time to the port, exactly as the Taxis planner does.
 */
export function planTaxis(rows: readonly CrewRow[], port: string): TaxiPlan {
  const taxi = TRANSFER_BUFFERS.taxiMin[port] ?? 30;
  const groups = new Map<string, CrewRow[]>();
  for (const row of rows) {
    const flight = normaliseFlightNo(row.flightNumber);
    const key = flight ? `${flight}|${row.flightDate}` : `row|${row.id}`;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  const runs: TaxiRun[] = [];
  for (const [key, crew] of groups) {
    const first = crew[0]!;
    const status = first.flightNumber ? trackFlight(first.flightNumber) : null;
    const direction: TaxiRun['direction'] = first.movement === 'off' ? 'departing' : 'arriving';
    const sheetTime = crew.map((r) => r.flightTime).find((t) => t !== '') ?? '';
    const time = status ? status.estimated : sheetTime;
    let pickupTime = '';
    if (time) {
      pickupTime =
        direction === 'arriving'
          ? addMinutes(time, TRANSFER_BUFFERS.bagsAndImmigrationMin)
          : addMinutes(time, -(TRANSFER_BUFFERS.checkInBeforeDepartureMin + taxi));
    }
    runs.push({
      key,
      flightNumber: first.flightNumber,
      flightDate: crew.map((r) => r.flightDate).find((d) => d !== '') ?? '',
      flightTime: time,
      flightFrom: crew.map((r) => r.flightFrom).find((f) => f !== '') ?? status?.route ?? '',
      direction,
      crew,
      tracked: status !== null,
      pickupTime,
    });
  }
  return { runs };
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * The lines the submit card and the toast carry — one per chosen service,
 * none when nothing is chosen. 'Hotel' names the chosen hotel when the id is
 * one of ours and says 'a GAC-vetted hotel' otherwise.
 */
export function serviceSummary(choices: ServiceChoices, rows: readonly CrewRow[]): string[] {
  const lines: string[] = [];
  if (choices.loi) {
    lines.push(`LOIs · ${plural(planLoi(rows).crew.length, 'visa-national on-signer')}`);
  }
  if (choices.hotels) {
    const plan = planHotel(rows, choices.hotelNights);
    const rooms = choices.hotelRooms ?? plan.rooms;
    const hotel = supplierById(choices.hotelId)?.name ?? 'a GAC-vetted hotel';
    lines.push(
      `Hotel · ${plural(rooms, 'room')} × ${plural(plan.nights, 'night')} at ${hotel}, subject to availability`,
    );
  }
  if (choices.taxis) {
    const plan = planTaxis(rows, choices.port);
    lines.push(
      `Taxis · ${plural(plan.runs.length, 'run')} for ${plural(rows.length, 'crew member', 'crew')}, timed to the flights`,
    );
  }
  return lines;
}

/** An LOI template filled from a crew row — the hand-off into the letters pipeline. */
export function loiFormFromRow(row: CrewRow, vesselId: string, port: string): LoiForm {
  const arriving = clean(`arriving ${port} ${row.flightDate} ${row.flightTime}`);
  return {
    familyName: row.familyName,
    forenames: row.forenames,
    nationality: row.nationality,
    dateOfBirth: row.dateOfBirth,
    passportNumber: row.passportNumber,
    passportExpiry: row.passportExpiry,
    vesselId,
    port,
    joiningDate: row.flightDate,
    arrivingFlight: [row.flightNumber, arriving].filter((p) => p !== '').join(' · '),
    visaNational: row.visaNational !== false,
  };
}

/* ------------------------------------------------------------- Submission */

export const CREW_LIST_STAGES = [
  'Submitted to GAC',
  'Received by GAC',
  'Being arranged',
  'Crew change complete',
] as const;
export type CrewListStage = (typeof CREW_LIST_STAGES)[number];

export interface CrewListSubmission {
  /** 'CL-0001'. */
  id: string;
  /** stampLabel() when submitted. */
  createdAt: string;
  /** ISO, for the retention maths. */
  createdAtIso: string;
  vesselId: string;
  port: string;
  fileName: string;
  crewCount: number;
  onCount: number;
  offCount: number;
  services: {
    loi: boolean;
    hotels: boolean;
    taxis: boolean;
    hotelId: string;
    hotelNights: number;
    loiCount: number;
    rooms: number;
    runs: number;
  };
  stage: CrewListStage;
  /** Label for when GAC confirmed receipt. */
  receivedAt: string | null;
  completedAtIso: string | null;
  /** The crew rows — null once the personal data is deleted. */
  crew: CrewRow[] | null;
  /** LOI request ids raised from this list. */
  linkedRequestIds: string[];
  /** Label for when the personal data went. */
  personalDataDeletedAt: string | null;
  /** Simulated — GAC's confirmation that its working copy is gone. */
  deletionConfirmedByGac: boolean;
}

/** The notice promises thirty days after completion; this is that number. */
export const RETENTION_DAYS_AFTER_COMPLETION = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** When the personal data is deleted automatically — null until the crew change completes. */
export function purgeAtIso(sub: CrewListSubmission): string | null {
  if (!sub.completedAtIso) return null;
  const completed = new Date(sub.completedAtIso).getTime();
  if (!Number.isFinite(completed)) return null;
  return new Date(completed + RETENTION_DAYS_AFTER_COMPLETION * DAY_MS).toISOString();
}

export function hasPersonalData(sub: CrewListSubmission): boolean {
  return sub.crew !== null;
}

/** True once the retention period has run and the data is still held. */
export function isDueForPurge(sub: CrewListSubmission, now: Date): boolean {
  if (!hasPersonalData(sub)) return false;
  const at = purgeAtIso(sub);
  return at !== null && now.getTime() >= new Date(at).getTime();
}

/**
 * The submission with every personal detail gone. The whole `crew` array is
 * dropped — not fields within it — so nothing personal can survive by being
 * overlooked; the reference, the counts and the services stay for the
 * invoice, and GAC's (simulated) confirmation is recorded.
 */
export function redactSubmission(sub: CrewListSubmission, whenLabel: string): CrewListSubmission {
  return { ...sub, crew: null, personalDataDeletedAt: whenLabel, deletionConfirmedByGac: true };
}

/**
 * The automatic retention rule: every submission whose thirty days have run
 * is redacted, labelled with the day it fell due. Returns the same array when
 * nothing was due, so a caller can tell whether to write back.
 */
export function purgeExpired(list: CrewListSubmission[], now: Date): CrewListSubmission[] {
  if (!list.some((s) => isDueForPurge(s, now))) return list;
  return list.map((s) => {
    if (!isDueForPurge(s, now)) return s;
    const at = purgeAtIso(s)!;
    return redactSubmission(s, `${stampLabel(new Date(at))} · automatic`);
  });
}

/**
 * The retention rule over BOTH persisted collections in one pure step: every
 * submission whose thirty days have run is redacted, and so is every letter
 * raised from it — the LOI forms carry the same passports, names and dates of
 * birth as the list, so purging one without the other would leave the notice's
 * promise half-kept and the letters list still reading out names under a card
 * that says the data is gone. Returns the same arrays when nothing was due,
 * so a caller can tell whether to write back.
 */
export function applyRetention(
  lists: CrewListSubmission[],
  requests: CrewRequest[],
  now: Date,
): { lists: CrewListSubmission[]; requests: CrewRequest[] } {
  const due = new Set(lists.filter((s) => isDueForPurge(s, now)).map((s) => s.id));
  if (due.size === 0) return { lists, requests };
  const touched = (r: CrewRequest) =>
    r.crewListId !== undefined && due.has(r.crewListId) && r.redacted !== true;
  const swept = requests.some(touched)
    ? requests.map((r) => (touched(r) ? redactRequest(r) : r))
    : requests;
  return { lists: purgeExpired(lists, now), requests: swept };
}

export function nextCrewListStage(stage: string): CrewListStage {
  return nextStageIn(CREW_LIST_STAGES, stage);
}

export function isTerminalCrewListStage(stage: string): boolean {
  return isFinalStageIn(CREW_LIST_STAGES, stage);
}

export function crewListStageIndex(stage: string): number {
  return stageIndexIn(CREW_LIST_STAGES, stage);
}

/** The demo's simulate button for a list at a stage — what GAC does next. Null once complete. */
export function simulateCrewListAction(stage: string): { label: string; steps: number } | null {
  switch (stage as CrewListStage) {
    case 'Submitted to GAC':
      return { label: 'Simulate: GAC confirms receipt', steps: 1 };
    case 'Received by GAC':
      return { label: 'Simulate: GAC arranges the services', steps: 1 };
    case 'Being arranged':
      return { label: 'Simulate: crew change complete', steps: 1 };
    default:
      return null;
  }
}

/**
 * What the delete button offers at this point in the list's life. Before
 * receipt a deletion is a withdrawal; afterwards it removes the personal data
 * and asks GAC to do the same; once done there is nothing left to delete.
 */
export function deletionAvailability(sub: CrewListSubmission): {
  allowed: boolean;
  label: string;
  note: string;
} {
  if (!hasPersonalData(sub)) return { allowed: false, label: 'Personal data deleted', note: '' };
  if (sub.stage === 'Submitted to GAC') {
    return {
      allowed: true,
      label: 'Withdraw and delete crew data',
      note: 'GAC has not confirmed receipt yet — withdrawing deletes the list before anyone has acted on it.',
    };
  }
  return {
    allowed: true,
    label: 'Delete crew data',
    note: 'Removes every personal detail from this device and asks GAC to delete its working copy. The request reference, counts and services stay for the invoice.',
  };
}

/* ----------------------------------------------------------- Shape guards */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

const ROW_STRING_FIELDS: (keyof CrewRow)[] = [
  'id',
  'familyName',
  'forenames',
  'rank',
  'nationality',
  'dateOfBirth',
  'passportNumber',
  'passportExpiry',
  'flightNumber',
  'flightDate',
  'flightTime',
  'flightFrom',
  'vessel',
  'port',
];

/** True when a persisted value has the shape of a crew row. */
export function isCrewRow(v: unknown): v is CrewRow {
  if (!isRecord(v)) return false;
  return (
    ROW_STRING_FIELDS.every((k) => typeof v[k] === 'string') &&
    (v.movement === 'on' || v.movement === 'off' || v.movement === '') &&
    (typeof v.visaNational === 'boolean' || v.visaNational === null) &&
    Array.isArray(v.issues) &&
    v.issues.every((i) => typeof i === 'string')
  );
}

function isStringOrNull(v: unknown): v is string | null {
  return v === null || typeof v === 'string';
}

function isCount(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

/**
 * Shape guard for a persisted submission. Storage reads are defensive: an
 * entry from an older build, or one edited by hand, is dropped rather than
 * taking the screen down. `crew` must be null or an array of well-formed rows.
 */
export function isCrewListSubmission(v: unknown): v is CrewListSubmission {
  if (!isRecord(v)) return false;
  for (const k of ['id', 'createdAt', 'createdAtIso', 'vesselId', 'port', 'fileName'] as const) {
    if (typeof v[k] !== 'string') return false;
  }
  if (!isCount(v.crewCount) || !isCount(v.onCount) || !isCount(v.offCount)) return false;
  const s = v.services;
  if (!isRecord(s)) return false;
  if (typeof s.loi !== 'boolean' || typeof s.hotels !== 'boolean' || typeof s.taxis !== 'boolean') {
    return false;
  }
  if (typeof s.hotelId !== 'string') return false;
  if (!isCount(s.hotelNights) || !isCount(s.loiCount) || !isCount(s.rooms) || !isCount(s.runs)) {
    return false;
  }
  if (!isStageOf(CREW_LIST_STAGES, v.stage)) return false;
  if (!isStringOrNull(v.receivedAt) || !isStringOrNull(v.completedAtIso)) return false;
  if (v.crew !== null && !(Array.isArray(v.crew) && v.crew.every(isCrewRow))) return false;
  if (
    !Array.isArray(v.linkedRequestIds) ||
    !v.linkedRequestIds.every((i) => typeof i === 'string')
  ) {
    return false;
  }
  if (!isStringOrNull(v.personalDataDeletedAt)) return false;
  return typeof v.deletionConfirmedByGac === 'boolean';
}
