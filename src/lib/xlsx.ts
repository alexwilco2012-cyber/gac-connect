/**
 * Spreadsheets without a dependency — the crew-list upload (owner, 23 Aug
 * 2026). A crew coordinator already keeps the crew change in a workbook:
 * names, passports, flights, one row per crew member. This module reads that
 * file in the browser so nothing leaves the device until Submit, and writes
 * the downloadable template the same way. It adds no npm package: an .xlsx is
 * a zip of small XML parts, every evergreen browser (and Node 22) can inflate
 * a zip entry with `DecompressionStream('deflate-raw')`, and `DOMParser`
 * reads the XML.
 *
 * What it reads: Office Open XML workbooks (.xlsx), stored or deflated
 * entries, shared strings including rich-text runs, inline strings, formula
 * cached values, booleans, and numbers — with date- and time-styled numbers
 * turned back into DD/MM/YYYY and HH:MM from the workbook's styles. Every
 * cell comes back as text; the crew-list rules decide what it means.
 *
 * What it does not read: the old binary .xls, password-protected workbooks,
 * zip64 archives, or any compression other than stored and deflate — each is
 * refused with a message that says what to do instead (save as .xlsx or
 * .csv). Formulas are never evaluated; the cached result is used.
 *
 * What it writes: the smallest .xlsx Excel will open — stored (uncompressed)
 * zip entries with CRC-32, inline strings, numbers as numbers, and a minimal
 * styles part. Good for a template and a demo crew list; not a general
 * exporter.
 */

/** One worksheet as text cells. Rectangular: every row is padded to the widest row. */
export interface SheetTable {
  name: string;
  rows: string[][];
}

/** True when this runtime can inflate deflated zip entries, which every .xlsx needs. */
export function canReadXlsx(): boolean {
  return typeof DecompressionStream === 'function';
}

// ---------------------------------------------------------------------------
// Small shared helpers

/** Column letters → 0-based index: A → 0, Z → 25, AA → 26. Case-insensitive; stops at the first non-letter, so 'AB12' → 27. Empty or non-letter input → -1. */
export function columnIndex(letters: string): number {
  let n = 0;
  let seen = false;
  for (const ch of letters.toUpperCase()) {
    const code = ch.charCodeAt(0);
    if (code < 65 || code > 90) break;
    n = n * 26 + (code - 64);
    seen = true;
  }
  return seen ? n - 1 : -1;
}

/** 0-based index → column letters: 0 → A, 25 → Z, 26 → AA. */
export function columnLetters(index: number): string {
  let n = Math.max(0, Math.floor(index)) + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** Escape the five XML-special characters for element text and attribute values. */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Drop the control characters XML 1.0 forbids (everything below 0x20 except tab, LF and CR). */
function xmlSafe(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

const encoder = new TextEncoder();
const utf8 = new TextDecoder('utf-8');

// ---------------------------------------------------------------------------
// Excel serial dates

/** Excel's 1900 date system counts days from this epoch (the 1900 leap-year bug is why it is 30 Dec, not 31). */
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
const DAY_MS = 86_400_000;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function ymdToLabel(d: Date): string {
  return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** Excel serial date → 'DD/MM/YYYY' (1900 system, epoch 1899-12-30; the fractional part is ignored). Not a finite number → ''. */
export function excelSerialToDate(serial: number): string {
  if (!Number.isFinite(serial)) return '';
  return ymdToLabel(new Date(EXCEL_EPOCH_MS + Math.floor(serial) * DAY_MS));
}

/** The fractional part of an Excel serial → 'HH:MM', to the nearest minute (23:59:40 rounds on to 00:00). Not a finite number → ''. */
export function excelSerialToTime(serial: number): string {
  if (!Number.isFinite(serial)) return '';
  const minutes = Math.round((serial - Math.floor(serial)) * 1440) % 1440;
  return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
}

/** Date and time together, rolling the date on when the minutes round up past midnight. */
function excelSerialToDateTime(serial: number): string {
  if (!Number.isFinite(serial)) return '';
  const totalMinutes = Math.round(serial * 1440);
  const days = Math.floor(totalMinutes / 1440);
  const minutes = totalMinutes - days * 1440;
  return `${ymdToLabel(new Date(EXCEL_EPOCH_MS + days * DAY_MS))} ${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
}

// ---------------------------------------------------------------------------
// Zip reading

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;

interface ZipEntry {
  name: string;
  flags: number;
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
}

const NOT_A_WORKBOOK =
  'This file is not an .xlsx workbook — in your spreadsheet program choose Save As and pick .xlsx or .csv, then try again.';

function readCentralDirectory(buf: ArrayBuffer): ZipEntry[] {
  const dv = new DataView(buf);
  const len = buf.byteLength;
  // The end-of-central-directory record is the last 22 bytes plus an optional
  // comment of up to 65,535 bytes, so scan back for its signature.
  let eocd = -1;
  for (let i = len - 22; i >= 0 && i >= len - 22 - 0xffff; i -= 1) {
    if (dv.getUint32(i, true) === SIG_EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error(NOT_A_WORKBOOK);
  const count = dv.getUint16(eocd + 10, true);
  const cdOffset = dv.getUint32(eocd + 16, true);
  if (count === 0xffff || cdOffset === 0xffffffff) {
    throw new Error(
      'This workbook is a zip64 archive, which the platform cannot read — save it again as .xlsx or .csv.',
    );
  }
  const entries: ZipEntry[] = [];
  let p = cdOffset;
  for (let i = 0; i < count; i += 1) {
    if (p + 46 > len || dv.getUint32(p, true) !== SIG_CENTRAL) throw new Error(NOT_A_WORKBOOK);
    const flags = dv.getUint16(p + 8, true);
    const method = dv.getUint16(p + 10, true);
    const compressedSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localHeaderOffset = dv.getUint32(p + 42, true);
    const name = utf8.decode(new Uint8Array(buf, p + 46, nameLen));
    entries.push({ name, flags, method, compressedSize, localHeaderOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function inflateRaw(bytes: Uint8Array<ArrayBuffer>): Promise<ArrayBuffer> {
  // A ReadableStream of the bytes rather than Blob.stream() — identical in
  // the browser, and it also works where Blob has no stream() (jsdom).
  const source = new ReadableStream<BufferSource>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  return new Response(source.pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
}

async function readEntry(buf: ArrayBuffer, entry: ZipEntry): Promise<ArrayBuffer> {
  const dv = new DataView(buf);
  const p = entry.localHeaderOffset;
  if (p + 30 > buf.byteLength || dv.getUint32(p, true) !== SIG_LOCAL)
    throw new Error(NOT_A_WORKBOOK);
  if (entry.flags & 0x1) {
    throw new Error(
      'This workbook is password-protected, which the platform cannot read — remove the password or save it as .csv.',
    );
  }
  const nameLen = dv.getUint16(p + 26, true);
  const extraLen = dv.getUint16(p + 28, true);
  const start = p + 30 + nameLen + extraLen;
  const end = start + entry.compressedSize;
  if (end > buf.byteLength) throw new Error(NOT_A_WORKBOOK);
  if (entry.method === 0) return buf.slice(start, end);
  if (entry.method === 8) {
    if (!canReadXlsx()) {
      throw new Error(
        'This browser cannot unpack .xlsx workbooks — save the list as .csv and upload that instead.',
      );
    }
    try {
      return await inflateRaw(new Uint8Array(buf, start, entry.compressedSize));
    } catch {
      throw new Error(
        'The workbook could not be unpacked — the file may be damaged. Save it again and retry.',
      );
    }
  }
  throw new Error(
    'This workbook uses a compression method the platform cannot read — save it again as .xlsx or .csv.',
  );
}

/** A zip opened for reading: a part's decoded text on demand, or null when the zip has no such entry. */
interface ZipReader {
  text(name: string): Promise<string | null>;
}

function openZip(buf: ArrayBuffer): ZipReader {
  const byName = new Map<string, ZipEntry>();
  for (const e of readCentralDirectory(buf)) byName.set(e.name.replace(/^\/+/, ''), e);
  return {
    async text(name) {
      const entry = byName.get(name);
      if (!entry) return null;
      return utf8.decode(await readEntry(buf, entry));
    },
  };
}

// ---------------------------------------------------------------------------
// Workbook reading

const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function parseXml(text: string, what: string): Document {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error(
      `The workbook’s ${what} could not be read — save the file again as .xlsx or .csv and retry.`,
    );
  }
  return doc;
}

/** Elements by local name, whatever prefix the file happens to use. */
function byLocalName(root: Document | Element, name: string): Element[] {
  return Array.from(root.getElementsByTagNameNS('*', name));
}

/** A relationship attribute (`r:id`), found by prefix or by namespace. */
function relAttr(el: Element, name: string): string | null {
  return el.getAttribute(`r:${name}`) ?? el.getAttributeNS(REL_NS, name);
}

/** Resolve a relationship target against the `xl/` folder: 'worksheets/sheet1.xml', '/xl/worksheets/sheet1.xml' and '../xl/x.xml' all land on a zip entry name. */
function resolvePart(target: string): string {
  if (target.startsWith('/')) return target.slice(1);
  const parts: string[] = ['xl'];
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg && seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

interface Relationship {
  id: string;
  type: string;
  target: string;
}

async function readRels(zip: ZipReader): Promise<Relationship[]> {
  const text = await zip.text('xl/_rels/workbook.xml.rels');
  if (!text) return [];
  return byLocalName(parseXml(text, 'relationships'), 'Relationship').map((el) => ({
    id: el.getAttribute('Id') ?? '',
    type: el.getAttribute('Type') ?? '',
    target: resolvePart(el.getAttribute('Target') ?? ''),
  }));
}

/** Concatenate every `<t>` under an element — rich-text runs become one string; phonetic hints are skipped. */
function textRuns(el: Element): string {
  let out = '';
  for (const t of byLocalName(el, 't')) {
    if (t.parentElement?.localName === 'rPh') continue;
    out += t.textContent ?? '';
  }
  return out;
}

async function readSharedStrings(zip: ZipReader, rels: Relationship[]): Promise<string[]> {
  const part =
    rels.find((r) => r.type.endsWith('/sharedStrings'))?.target ?? 'xl/sharedStrings.xml';
  const text = await zip.text(part);
  if (!text) return [];
  return byLocalName(parseXml(text, 'shared strings'), 'si').map(textRuns);
}

type StyleKind = 'none' | 'date' | 'time' | 'datetime';

/** Built-in number formats that show a date, a time, or both (ECMA-376 §18.8.30). */
const BUILTIN_DATE = new Set([
  14, 15, 16, 17, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 50, 51, 52, 53, 54, 55, 56, 57, 58,
]);
const BUILTIN_TIME = new Set([18, 19, 20, 21, 45, 46, 47]);
const BUILTIN_DATETIME = new Set([22]);

/**
 * Classify a custom format code by the date/time letters left once sections,
 * literals and AM/PM are stripped. Elapsed-time tokens — `[h]`, `[hh]`, `[mm]`,
 * `[ss]` — are checked first: stripping the brackets would leave `[h]:mm` as
 * ':mm', which reads as a date, and an elapsed format is a time by definition.
 */
function formatKind(code: string): StyleKind {
  if (/\[(h+|m+|s+)\]/i.test(code)) return 'time';
  const bare = code
    .replace(/\[[^\]]*\]/g, '')
    .replace(/"[^"]*"/g, '')
    .replace(/\\./g, '')
    .replace(/AM\/PM|A\/P/gi, '')
    .toLowerCase();
  const hasDate = /[dy]/.test(bare);
  const hasTime = /[hs]/.test(bare);
  if (hasDate && hasTime) return 'datetime';
  if (hasTime) return 'time';
  if (hasDate || /m/.test(bare)) return 'date';
  return 'none';
}

function builtinKind(id: number): StyleKind {
  if (BUILTIN_DATETIME.has(id)) return 'datetime';
  if (BUILTIN_TIME.has(id)) return 'time';
  if (BUILTIN_DATE.has(id)) return 'date';
  return 'none';
}

/** One kind per cell style index (`s=` on a cell), from the styles part. */
async function readStyleKinds(zip: ZipReader, rels: Relationship[]): Promise<StyleKind[]> {
  const part = rels.find((r) => r.type.endsWith('/styles'))?.target ?? 'xl/styles.xml';
  const text = await zip.text(part);
  if (!text) return [];
  const doc = parseXml(text, 'styles');
  const custom = new Map<number, string>();
  const numFmts = byLocalName(doc, 'numFmts')[0];
  for (const nf of numFmts ? byLocalName(numFmts, 'numFmt') : []) {
    custom.set(Number(nf.getAttribute('numFmtId')), nf.getAttribute('formatCode') ?? '');
  }
  const cellXfs = byLocalName(doc, 'cellXfs')[0];
  if (!cellXfs) return [];
  return byLocalName(cellXfs, 'xf').map((xf) => {
    const id = Number(xf.getAttribute('numFmtId') ?? '0');
    const code = custom.get(id);
    return code !== undefined ? formatKind(code) : builtinKind(id);
  });
}

/** A numeric `<v>` as text — plain digits for ordinary numbers, no exponent, float noise (44.299999999999997) settled. */
function numberText(v: string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return v.trim();
  if (Math.abs(n) >= 1e21 || (n !== 0 && Math.abs(n) < 1e-6)) {
    // Beyond what String() prints plainly — spell it out rather than '1e+21'.
    return n.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 });
  }
  return String(n);
}

function cellText(c: Element, shared: string[], styles: StyleKind[]): string {
  const t = c.getAttribute('t') ?? 'n';
  if (t === 'inlineStr') return textRuns(c);
  const v = byLocalName(c, 'v')[0]?.textContent ?? '';
  if (t === 's') return shared[Number(v)] ?? '';
  if (t === 'str' || t === 'd') return v; // formula text, or an ISO 8601 date cell
  if (t === 'b') return v.trim() === '1' ? 'TRUE' : 'FALSE';
  if (t === 'e') return '';
  if (v.trim() === '') return '';
  const n = Number(v);
  const kind = styles[Number(c.getAttribute('s') ?? '0')] ?? 'none';
  if (Number.isFinite(n)) {
    if (kind === 'date') return excelSerialToDate(n);
    if (kind === 'time') return excelSerialToTime(n);
    if (kind === 'datetime') return excelSerialToDateTime(n);
  }
  return numberText(v);
}

/** Pad every row to the widest, drop trailing rows and trailing columns that are empty throughout. */
function rectangular(rows: string[][]): string[][] {
  let lastRow = rows.length - 1;
  while (lastRow >= 0 && rows[lastRow]!.every((cell) => cell === '')) lastRow -= 1;
  const kept = rows.slice(0, lastRow + 1);
  let width = 0;
  for (const row of kept) {
    let w = row.length;
    while (w > 0 && row[w - 1] === '') w -= 1;
    width = Math.max(width, w);
  }
  return kept.map((row) => {
    const out = row.slice(0, width);
    while (out.length < width) out.push('');
    return out;
  });
}

/** Excel's own sheet limits (XFD1048576). A crafted ref beyond them would grow arrays until the tab dies, so the cell is skipped instead. */
const MAX_ROW_INDEX = 1_048_575;
const MAX_COL_INDEX = 16_383;

function readSheetRows(xml: string, shared: string[], styles: StyleKind[]): string[][] {
  const doc = parseXml(xml, 'worksheet');
  const sheetData = byLocalName(doc, 'sheetData')[0];
  if (!sheetData) return [];
  const rows: string[][] = [];
  let rowIdx = -1;
  for (const rowEl of byLocalName(sheetData, 'row')) {
    const r = Number(rowEl.getAttribute('r'));
    rowIdx = Number.isInteger(r) && r >= 1 ? r - 1 : rowIdx + 1;
    if (rowIdx > MAX_ROW_INDEX) continue;
    while (rows.length <= rowIdx) rows.push([]);
    const row = rows[rowIdx]!;
    let colIdx = -1;
    for (const c of byLocalName(rowEl, 'c')) {
      const ref = /^([A-Za-z]+)\d*$/.exec(c.getAttribute('r') ?? '');
      colIdx = ref ? columnIndex(ref[1]!) : colIdx + 1;
      if (colIdx > MAX_COL_INDEX) continue;
      while (row.length <= colIdx) row.push('');
      row[colIdx] = cellText(c, shared, styles);
    }
  }
  return rectangular(rows);
}

/**
 * Parse an .xlsx ArrayBuffer into sheets of text cells, in workbook order.
 * Rejects with a readable message when the file is not a zip or holds no
 * workbook.
 */
export async function parseXlsx(buf: ArrayBuffer): Promise<SheetTable[]> {
  const zip = openZip(buf);
  const workbookXml = await zip.text('xl/workbook.xml');
  if (!workbookXml) {
    throw new Error(
      'This file is a zip but not an Excel workbook — save it as .xlsx or .csv from your spreadsheet program and try again.',
    );
  }
  const rels = await readRels(zip);
  const [shared, styles] = await Promise.all([
    readSharedStrings(zip, rels),
    readStyleKinds(zip, rels),
  ]);
  const sheets: SheetTable[] = [];
  for (const sheetEl of byLocalName(parseXml(workbookXml, 'workbook'), 'sheet')) {
    const rel = rels.find((r) => r.id === relAttr(sheetEl, 'id'));
    if (!rel || (rel.type && !rel.type.endsWith('/worksheet'))) continue;
    const xml = await zip.text(rel.target);
    sheets.push({
      name: sheetEl.getAttribute('name') ?? `Sheet${sheets.length + 1}`,
      rows: xml ? readSheetRows(xml, shared, styles) : [],
    });
  }
  return sheets;
}

// ---------------------------------------------------------------------------
// CSV

/**
 * Pick the delimiter from the first line: whichever of comma, tab and
 * semicolon appears most outside quotes, with the comma winning ties. Excel's
 * tab-delimited save does not quote fields containing commas, so a heading
 * like 'Surname, per passport' must not hand a tabbed file to the comma
 * parser. No delimiter at all → comma.
 */
function detectDelimiter(text: string): string {
  const end = text.search(/\r|\n/);
  const line = end < 0 ? text : text.slice(0, end);
  const counts = { ',': 0, '\t': 0, ';': 0 };
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && (ch === ',' || ch === '\t' || ch === ';')) counts[ch] += 1;
  }
  if (counts[','] >= counts['\t'] && counts[','] >= counts[';'] && counts[','] > 0) return ',';
  if (counts['\t'] === 0 && counts[';'] === 0) return ',';
  return counts['\t'] >= counts[';'] ? '\t' : ';';
}

/**
 * Parse CSV text — RFC 4180 and the dialects Excel saves: quoted fields,
 * doubled quotes, CRLF or LF, a trailing newline, a leading BOM, and a
 * semicolon or tab delimiter when the first line carries more of either than
 * commas. Rows come back rectangular, trailing empty rows dropped, named 'CSV'.
 */
export function parseCsv(text: string): SheetTable {
  const src = text.startsWith('\uFEFF') ? text.slice(1) : text;
  const delim = detectDelimiter(src);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let i = 0;
  const endRow = () => {
    row.push(field);
    rows.push(row);
    row = [];
    field = '';
  };
  while (i < src.length) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"' && field === '') {
      quoted = true;
      i += 1;
      continue;
    }
    if (ch === delim) {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (ch === '\r' || ch === '\n') {
      endRow();
      i += ch === '\r' && src[i + 1] === '\n' ? 2 : 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  if (field !== '' || row.length > 0) endRow();
  return { name: 'CSV', rows: rectangular(rows) };
}

/** Decode an uploaded text file: UTF-16 by BOM, otherwise UTF-8, falling back to Windows-1252 for Excel's plain "CSV" save. */
function decodeText(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(buf);
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(buf);
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder('windows-1252').decode(buf);
  }
}

/**
 * Dispatch on the file name: .xlsx (and .xlsm) → `parseXlsx`; .csv, .txt and
 * .tsv → `parseCsv`. The old binary .xls, and anything else, is refused with
 * a message telling the user to save as .xlsx or .csv.
 */
export async function parseSpreadsheet(buf: ArrayBuffer, fileName: string): Promise<SheetTable[]> {
  const ext = /\.([A-Za-z0-9]+)$/.exec(fileName.trim())?.[1]?.toLowerCase() ?? '';
  if (ext === 'xlsx' || ext === 'xlsm') return parseXlsx(buf);
  if (ext === 'csv' || ext === 'txt' || ext === 'tsv') return [parseCsv(decodeText(buf))];
  if (ext === 'xls') {
    throw new Error(
      'Older .xls workbooks cannot be read — in Excel choose Save As and pick .xlsx or .csv, then upload that.',
    );
  }
  throw new Error(
    `Choose an .xlsx or .csv file${ext ? ` — .${ext} files cannot be read` : ''}. In your spreadsheet program choose Save As and pick .xlsx or .csv.`,
  );
}

// ---------------------------------------------------------------------------
// Zip writing (stored entries) and the .xlsx parts

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 (IEEE), as zip requires for every entry. */
export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** A fixed, valid MS-DOS stamp (1 Jan 2026 00:00) so the bytes are deterministic. */
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;
const DOS_TIME = 0;

function zipStored(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = encoder.encode(f.name);
    const crc = crc32(f.data);
    const local = new Uint8Array(30 + name.length + f.data.length);
    const ldv = new DataView(local.buffer);
    ldv.setUint32(0, SIG_LOCAL, true);
    ldv.setUint16(4, 20, true); // version needed
    ldv.setUint16(6, 0x0800, true); // UTF-8 names
    ldv.setUint16(8, 0, true); // stored
    ldv.setUint16(10, DOS_TIME, true);
    ldv.setUint16(12, DOS_DATE, true);
    ldv.setUint32(14, crc, true);
    ldv.setUint32(18, f.data.length, true);
    ldv.setUint32(22, f.data.length, true);
    ldv.setUint16(26, name.length, true);
    ldv.setUint16(28, 0, true);
    local.set(name, 30);
    local.set(f.data, 30 + name.length);
    locals.push(local);

    const central = new Uint8Array(46 + name.length);
    const cdv = new DataView(central.buffer);
    cdv.setUint32(0, SIG_CENTRAL, true);
    cdv.setUint16(4, 20, true); // version made by
    cdv.setUint16(6, 20, true); // version needed
    cdv.setUint16(8, 0x0800, true);
    cdv.setUint16(10, 0, true);
    cdv.setUint16(12, DOS_TIME, true);
    cdv.setUint16(14, DOS_DATE, true);
    cdv.setUint32(16, crc, true);
    cdv.setUint32(20, f.data.length, true);
    cdv.setUint32(24, f.data.length, true);
    cdv.setUint16(28, name.length, true);
    cdv.setUint16(30, 0, true); // extra
    cdv.setUint16(32, 0, true); // comment
    cdv.setUint16(34, 0, true); // disk
    cdv.setUint16(36, 0, true); // internal attributes
    cdv.setUint32(38, 0, true); // external attributes
    cdv.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);
    offset += local.length;
  }
  const cdSize = centrals.reduce((n, c) => n + c.length, 0);
  const eocd = new Uint8Array(22);
  const edv = new DataView(eocd.buffer);
  edv.setUint32(0, SIG_EOCD, true);
  edv.setUint16(4, 0, true);
  edv.setUint16(6, 0, true);
  edv.setUint16(8, files.length, true);
  edv.setUint16(10, files.length, true);
  edv.setUint32(12, cdSize, true);
  edv.setUint32(16, offset, true);
  edv.setUint16(20, 0, true);

  const out = new Uint8Array(offset + cdSize + 22);
  let p = 0;
  for (const part of [...locals, ...centrals, eocd]) {
    out.set(part, p);
    p += part.length;
  }
  return out;
}

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_PKG_RELS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const NS_CT = 'http://schemas.openxmlformats.org/package/2006/content-types';

/** Excel refuses sheet names over 31 characters or containing []:*?/\ — tidy rather than fail. */
function sheetNameFor(name: string): string {
  const tidy = name
    .replace(/[[\]:*?/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 31)
    .trim();
  return tidy || 'Sheet1';
}

function sheetXml(rows: (string | number)[][]): string {
  const out: string[] = [];
  rows.forEach((row, ri) => {
    const cells: string[] = [];
    row.forEach((value, ci) => {
      const ref = `${columnLetters(ci)}${ri + 1}`;
      if (typeof value === 'number' && Number.isFinite(value)) {
        cells.push(`<c r="${ref}"><v>${String(value)}</v></c>`);
      } else {
        const text = xmlSafe(String(value));
        if (text === '') return;
        cells.push(
          `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`,
        );
      }
    });
    out.push(`<row r="${ri + 1}">${cells.join('')}</row>`);
  });
  return `${XML_HEAD}<worksheet xmlns="${NS_MAIN}"><sheetData>${out.join('')}</sheetData></worksheet>`;
}

/**
 * Build a minimal, Excel-openable .xlsx: one sheet, stored zip entries,
 * inline strings, numbers as numbers. Empty-string cells are left out, as
 * Excel itself leaves blanks out; the parser pads them back in.
 */
export function writeXlsx(sheet: { name: string; rows: (string | number)[][] }): Uint8Array {
  const name = sheetNameFor(sheet.name);
  const parts: { name: string; data: string }[] = [
    {
      name: '[Content_Types].xml',
      data:
        `${XML_HEAD}<Types xmlns="${NS_CT}">` +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '</Types>',
    },
    {
      name: '_rels/.rels',
      data:
        `${XML_HEAD}<Relationships xmlns="${NS_PKG_RELS}">` +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>',
    },
    {
      name: 'xl/workbook.xml',
      data:
        `${XML_HEAD}<workbook xmlns="${NS_MAIN}" xmlns:r="${REL_NS}">` +
        `<sheets><sheet name="${escapeXml(name)}" sheetId="1" r:id="rId1"/></sheets>` +
        '</workbook>',
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data:
        `${XML_HEAD}<Relationships xmlns="${NS_PKG_RELS}">` +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>',
    },
    {
      name: 'xl/styles.xml',
      data:
        `${XML_HEAD}<styleSheet xmlns="${NS_MAIN}">` +
        '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>' +
        '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>' +
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
        '</styleSheet>',
    },
    { name: 'xl/worksheets/sheet1.xml', data: sheetXml(sheet.rows) },
  ];
  return zipStored(parts.map((p) => ({ name: p.name, data: encoder.encode(p.data) })));
}
