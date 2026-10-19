import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  canReadXlsx,
  columnIndex,
  columnLetters,
  crc32,
  escapeXml,
  excelSerialToDate,
  excelSerialToTime,
  parseCsv,
  parseSpreadsheet,
  parseXlsx,
  writeXlsx,
} from '../src/lib/xlsx';

/**
 * Zero-dependency spreadsheet reader and writer (crew-list upload, 23 Aug).
 * The deflated workbook below is built by hand with node:zlib so the
 * DecompressionStream('deflate-raw') path is the one under test — no
 * polyfill was needed: Node 22's DecompressionStream is present under
 * vitest's jsdom environment.
 */

const enc = new TextEncoder();

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** Latin-1 view of zip bytes, so entry names and stored XML can be searched as text. */
function latin1(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]!);
  return s;
}

interface TestEntry {
  name: string;
  text: string;
  /** method 8 when true, stored otherwise */
  deflate: boolean;
}

/** An independent little zip writer for the tests — stored or deflated entries, so the reader is not checked against its own writer alone. */
function buildZip(entries: TestEntry[]): ArrayBuffer {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = enc.encode(e.name);
    const raw = enc.encode(e.text);
    const data = e.deflate ? new Uint8Array(deflateRawSync(raw)) : raw;
    const crc = crc32(raw);
    const local = new Uint8Array(30 + name.length + data.length);
    const l = new DataView(local.buffer);
    l.setUint32(0, 0x04034b50, true);
    l.setUint16(4, 20, true);
    l.setUint16(6, 0, true);
    l.setUint16(8, e.deflate ? 8 : 0, true);
    l.setUint16(10, 0, true);
    l.setUint16(12, 0x5a21, true);
    l.setUint32(14, crc, true);
    l.setUint32(18, data.length, true);
    l.setUint32(22, raw.length, true);
    l.setUint16(26, name.length, true);
    l.setUint16(28, 0, true);
    local.set(name, 30);
    local.set(data, 30 + name.length);
    chunks.push(local);

    const cd = new Uint8Array(46 + name.length);
    const c = new DataView(cd.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0, true);
    c.setUint16(10, e.deflate ? 8 : 0, true);
    c.setUint16(12, 0, true);
    c.setUint16(14, 0x5a21, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true);
    c.setUint32(24, raw.length, true);
    c.setUint16(28, name.length, true);
    c.setUint16(30, 0, true);
    c.setUint16(32, 0, true);
    c.setUint16(34, 0, true);
    c.setUint16(36, 0, true);
    c.setUint32(38, 0, true);
    c.setUint32(42, offset, true);
    cd.set(name, 46);
    central.push(cd);
    offset += local.length;
  }
  const cdSize = central.reduce((n, c) => n + c.length, 0);
  const eocd = new Uint8Array(22);
  const v = new DataView(eocd.buffer);
  v.setUint32(0, 0x06054b50, true);
  v.setUint16(8, entries.length, true);
  v.setUint16(10, entries.length, true);
  v.setUint32(12, cdSize, true);
  v.setUint32(16, offset, true);
  const total = offset + cdSize + 22;
  const out = new Uint8Array(total);
  let p = 0;
  for (const part of [...chunks, ...central, eocd]) {
    out.set(part, p);
    p += part.length;
  }
  return toArrayBuffer(out);
}

const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';

/**
 * A workbook the way Excel writes one: shared strings (with a rich-text run),
 * date/time/datetime styles both built-in and custom, a prefixed namespace on
 * the workbook part, an absolute rel target, rows and cells without `r`,
 * formatted-but-empty cells, and a second sheet listed after the first in the
 * workbook but before it in the rels. Every entry is deflated.
 */
function excelLikeWorkbook(): ArrayBuffer {
  const workbook =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<x:workbook xmlns:x="${NS}" xmlns:r="${REL}"><x:sheets>` +
    `<x:sheet name="Crew" sheetId="1" r:id="rId2"/>` +
    `<x:sheet name="Notes" sheetId="2" r:id="rId1"/>` +
    `</x:sheets></x:workbook>`;
  const rels =
    `<Relationships xmlns="${PKG}">` +
    `<Relationship Id="rId1" Type="${REL}/worksheet" Target="/xl/worksheets/sheet2.xml"/>` +
    `<Relationship Id="rId2" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId3" Type="${REL}/sharedStrings" Target="sharedStrings.xml"/>` +
    `<Relationship Id="rId4" Type="${REL}/styles" Target="styles.xml"/>` +
    `</Relationships>`;
  const shared =
    `<sst xmlns="${NS}" count="4" uniqueCount="4">` +
    `<si><t>Family name</t></si>` +
    `<si><r><rPr><b/></rPr><t>ZZ</t></r><r><t xml:space="preserve"> 417</t></r></si>` +
    `<si><t>DEMO</t></si>` +
    `<si><t>Arrival</t></si>` +
    `</sst>`;
  const styles =
    `<styleSheet xmlns="${NS}">` +
    `<numFmts count="7">` +
    `<numFmt numFmtId="164" formatCode="dd/mm/yyyy"/>` +
    `<numFmt numFmtId="165" formatCode="hh:mm"/>` +
    `<numFmt numFmtId="166" formatCode="dd/mm/yyyy\\ hh:mm"/>` +
    `<numFmt numFmtId="167" formatCode="0.00"/>` +
    `<numFmt numFmtId="168" formatCode="[h]:mm:ss"/>` +
    `<numFmt numFmtId="169" formatCode="[$-F800]dddd\\,\\ mmmm\\ dd\\,\\ yyyy"/>` +
    `<numFmt numFmtId="170" formatCode="&quot;Date: &quot;dd-mmm-yyyy;@"/>` +
    `</numFmts>` +
    `<cellXfs count="11">` +
    `<xf numFmtId="0"/>` + // 0 general
    `<xf numFmtId="14"/>` + // 1 built-in date
    `<xf numFmtId="20"/>` + // 2 built-in time
    `<xf numFmtId="22"/>` + // 3 built-in datetime
    `<xf numFmtId="164"/>` + // 4 custom date
    `<xf numFmtId="165"/>` + // 5 custom time
    `<xf numFmtId="166"/>` + // 6 custom datetime
    `<xf numFmtId="167"/>` + // 7 custom number
    `<xf numFmtId="168"/>` + // 8 elapsed time
    `<xf numFmtId="169"/>` + // 9 locale-tagged long date
    `<xf numFmtId="170"/>` + // 10 literal-prefixed date
    `</cellXfs></styleSheet>`;
  const serial = 46242.5791666667; // 08/08/2026 13:54
  const sheet1 =
    `<worksheet xmlns="${NS}"><sheetData>` +
    `<row r="1">` +
    `<c r="A1" t="s"><v>0</v></c>` +
    `<c r="B1" t="s"><v>3</v></c>` +
    `<c r="C1" t="inlineStr"><is><t>Passport</t></is></c>` +
    `<c r="H1" s="1"/>` + // formatted, empty — must not widen the table
    `</row>` +
    `<row r="2">` +
    `<c r="A2" t="s"><v>2</v></c>` +
    `<c r="B2" t="s"><v>1</v></c>` +
    `<c r="C2"><v>123456789</v></c>` +
    `<c r="D2" s="1"><v>${serial}</v></c>` +
    `<c r="E2" s="2"><v>${serial}</v></c>` +
    `<c r="F2" s="3"><v>${serial}</v></c>` +
    `</row>` +
    `<row r="3">` +
    `<c r="A3" s="4"><v>${serial}</v></c>` +
    `<c r="B3" s="5"><v>${serial}</v></c>` +
    `<c r="C3" s="6"><v>${serial}</v></c>` +
    `<c r="D3" s="7"><v>${serial}</v></c>` +
    `<c r="E3" s="8"><v>0.25</v></c>` +
    `<c r="F3" s="9"><v>45658</v></c>` +
    `</row>` +
    `<row r="4">` +
    `<c r="A4" s="10"><v>45658</v></c>` +
    `<c r="B4" t="b"><v>1</v></c>` +
    `<c r="C4" t="b"><v>0</v></c>` +
    `<c r="D4" t="e"><v>#N/A</v></c>` +
    `<c r="E4" t="str"><f>A2&amp;" "&amp;B2</f><v>DEMO ZZ 417</v></c>` +
    `<c r="F4"><v>44.299999999999997</v></c>` +
    `</row>` +
    `<row r="7"><c r="A7" s="1"/><c r="B7" t="inlineStr"><is><t></t></is></c></row>` + // blank row — trimmed
    `</sheetData></worksheet>`;
  const sheet2 =
    `<worksheet xmlns="${NS}"><sheetData>` +
    `<row><c><v>1</v></c><c><v>2</v></c><c t="inlineStr"><is><t>three</t></is></c></row>` +
    `<row><c r="B2"><v>5</v></c></row>` +
    `</sheetData></worksheet>`;
  return buildZip([
    { name: '[Content_Types].xml', text: '<Types/>', deflate: true },
    { name: '_rels/.rels', text: '<Relationships/>', deflate: true },
    { name: 'xl/workbook.xml', text: workbook, deflate: true },
    { name: 'xl/_rels/workbook.xml.rels', text: rels, deflate: true },
    { name: 'xl/sharedStrings.xml', text: shared, deflate: true },
    { name: 'xl/styles.xml', text: styles, deflate: true },
    { name: 'xl/worksheets/sheet1.xml', text: sheet1, deflate: true },
    { name: 'xl/worksheets/sheet2.xml', text: sheet2, deflate: true },
  ]);
}

describe('runtime', () => {
  it('can inflate deflated entries here, as every evergreen browser can', () => {
    expect(canReadXlsx()).toBe(true);
  });
});

describe('helpers', () => {
  it('turns column letters into indexes and back', () => {
    expect(columnIndex('A')).toBe(0);
    expect(columnIndex('Z')).toBe(25);
    expect(columnIndex('AA')).toBe(26);
    expect(columnIndex('AB12')).toBe(27);
    expect(columnIndex('b')).toBe(1);
    expect(columnIndex('')).toBe(-1);
    expect(columnIndex('12')).toBe(-1);
    expect(columnLetters(0)).toBe('A');
    expect(columnLetters(25)).toBe('Z');
    expect(columnLetters(26)).toBe('AA');
    expect(columnLetters(701)).toBe('ZZ');
    expect(columnLetters(702)).toBe('AAA');
    for (const i of [0, 1, 25, 26, 27, 51, 52, 701, 702, 16383]) {
      expect(columnIndex(columnLetters(i))).toBe(i);
    }
  });

  it('escapes the five XML-special characters', () => {
    expect(escapeXml(`Smith & Sons <"O'Neil">`)).toBe(
      'Smith &amp; Sons &lt;&quot;O&apos;Neil&quot;&gt;',
    );
    expect(escapeXml('plain')).toBe('plain');
  });

  it('computes CRC-32 the way zip expects', () => {
    expect(crc32(enc.encode('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array(0))).toBe(0);
  });
});

describe('Excel serial dates', () => {
  it('converts serials to DD/MM/YYYY on the 1900 system', () => {
    // 2026-08-08 is serial 46242 (2025-01-01 = 45658, +365 to 2026-01-01, +219 to 8 Aug).
    expect(excelSerialToDate(46242)).toBe('08/08/2026');
    expect(excelSerialToDate(46244)).toBe('10/08/2026');
    expect(excelSerialToDate(45658)).toBe('01/01/2025');
    expect(excelSerialToDate(46242.9)).toBe('08/08/2026');
    expect(excelSerialToDate(NaN)).toBe('');
  });

  it('converts the fractional part to HH:MM', () => {
    expect(excelSerialToTime(0.5791666667)).toBe('13:54');
    expect(excelSerialToTime(45658.5)).toBe('12:00');
    expect(excelSerialToTime(0)).toBe('00:00');
    expect(excelSerialToTime(0.25)).toBe('06:00');
    expect(excelSerialToTime(Infinity)).toBe('');
  });
});

describe('writer → parser round trip', () => {
  const rows: (string | number)[][] = [
    ['Family name', 'Forenames', 'Passport number', 'Nights', 'Notes'],
    ['DEMO', 'Crew Member 1', 'X0000001', 2, 'Smith & Sons, "the" <best> one'],
    ['DÉMO', 'Çrew Ünïcode — 东京', 'X0000002', 1.5, ''],
    ['DEMO', '', 'X0000003', 0, "it's; fine\ttab"],
  ];

  it('writes a zip with the parts Excel expects', () => {
    const bytes = writeXlsx({ name: 'Crew', rows });
    const text = latin1(bytes);
    expect(text.startsWith('PK\u0003\u0004')).toBe(true);
    for (const part of [
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/worksheets/sheet1.xml',
    ]) {
      expect(text).toContain(part);
    }
    // Stored entries: the sheet XML is readable in the clear, strings inline and escaped.
    expect(text).toContain('t="inlineStr"');
    expect(text).toContain('Smith &amp; Sons, &quot;the&quot; &lt;best&gt; one');
    expect(text).toContain('<c r="D2"><v>2</v></c>');
  });

  it('reads back exactly what it wrote, with blanks padded in', async () => {
    const bytes = writeXlsx({ name: 'Crew', rows });
    const sheets = await parseXlsx(toArrayBuffer(bytes));
    expect(sheets).toHaveLength(1);
    expect(sheets[0]!.name).toBe('Crew');
    expect(sheets[0]!.rows).toEqual([
      ['Family name', 'Forenames', 'Passport number', 'Nights', 'Notes'],
      ['DEMO', 'Crew Member 1', 'X0000001', '2', 'Smith & Sons, "the" <best> one'],
      ['DÉMO', 'Çrew Ünïcode — 东京', 'X0000002', '1.5', ''],
      ['DEMO', '', 'X0000003', '0', "it's; fine\ttab"],
    ]);
  });

  it('goes through parseSpreadsheet by file name too', async () => {
    const bytes = writeXlsx({ name: 'Crew', rows });
    const sheets = await parseSpreadsheet(toArrayBuffer(bytes), 'crew list.XLSX');
    expect(sheets[0]!.rows[1]![0]).toBe('DEMO');
  });

  it('tidies sheet names Excel would refuse and copes with an empty sheet', async () => {
    const sheets = await parseXlsx(
      toArrayBuffer(
        writeXlsx({ name: 'Crew: list [Aug/2026] with a very long name indeed', rows: [] }),
      ),
    );
    expect(sheets[0]!.name).toBe('Crew list Aug 2026 with a very');
    expect(sheets[0]!.name.length).toBeLessThanOrEqual(31);
    expect(sheets[0]!.rows).toEqual([]);
    const blank = await parseXlsx(toArrayBuffer(writeXlsx({ name: '', rows: [['', ''], ['']] })));
    expect(blank[0]!.name).toBe('Sheet1');
    expect(blank[0]!.rows).toEqual([]);
  });
});

describe('an Excel-like workbook with deflated entries', () => {
  it('reads sheets in workbook order, inflating every part', async () => {
    const sheets = await parseXlsx(excelLikeWorkbook());
    expect(sheets.map((s) => s.name)).toEqual(['Crew', 'Notes']);
  });

  it('joins rich-text runs, resolves shared and inline strings, and keeps rows rectangular', async () => {
    const [crew] = await parseXlsx(excelLikeWorkbook());
    const rows = crew!.rows;
    expect(rows).toHaveLength(4); // row 7 is blank and trimmed; 5 and 6 never existed
    for (const row of rows) expect(row).toHaveLength(6); // H1 was a formatted blank, so no seventh/eighth column
    expect(rows[0]).toEqual(['Family name', 'Arrival', 'Passport', '', '', '']);
    expect(rows[1]![0]).toBe('DEMO');
    expect(rows[1]![1]).toBe('ZZ 417');
    expect(rows[1]![2]).toBe('123456789');
  });

  it('turns date-, time- and datetime-styled numbers into readable text', async () => {
    const [crew] = await parseXlsx(excelLikeWorkbook());
    const rows = crew!.rows;
    // built-in formats 14, 20, 22
    expect(rows[1]![3]).toBe('08/08/2026');
    expect(rows[1]![4]).toBe('13:54');
    expect(rows[1]![5]).toBe('08/08/2026 13:54');
    // custom formats
    expect(rows[2]![0]).toBe('08/08/2026'); // dd/mm/yyyy
    expect(rows[2]![1]).toBe('13:54'); // hh:mm
    expect(rows[2]![2]).toBe('08/08/2026 13:54'); // dd/mm/yyyy hh:mm
    expect(rows[2]![3]).toBe('46242.5791666667'); // 0.00 is a number, not a date
    expect(rows[2]![4]).toBe('06:00'); // [h]:mm:ss — elapsed time, still a time
    expect(rows[2]![5]).toBe('01/01/2025'); // [$-F800]dddd, mmmm dd, yyyy
    expect(rows[3]![0]).toBe('01/01/2025'); // "Date: "dd-mmm-yyyy;@
  });

  it('reads booleans, errors, formula strings and noisy doubles', async () => {
    const [crew] = await parseXlsx(excelLikeWorkbook());
    const row = crew!.rows[3]!;
    expect(row[1]).toBe('TRUE');
    expect(row[2]).toBe('FALSE');
    expect(row[3]).toBe('');
    expect(row[4]).toBe('DEMO ZZ 417');
    expect(row[5]).toBe('44.3');
  });

  it('appends rows and cells that carry no reference', async () => {
    const [, notes] = await parseXlsx(excelLikeWorkbook());
    expect(notes!.rows).toEqual([
      ['1', '2', 'three'],
      ['', '5', ''],
    ]);
  });

  it('copes with a bare workbook — no shared strings, no styles, ISO date cells, a stray formatted cell far down', async () => {
    const zip = buildZip([
      {
        name: 'xl/workbook.xml',
        text: `<workbook xmlns="${NS}" xmlns:r="${REL}"><sheets><sheet name="Only" sheetId="1" r:id="rId1"/></sheets></workbook>`,
        deflate: true,
      },
      {
        name: 'xl/_rels/workbook.xml.rels',
        text: `<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
        deflate: false,
      },
      {
        name: 'xl/worksheets/sheet1.xml',
        text:
          `<worksheet xmlns="${NS}"><sheetData>` +
          `<row r="1"><c r="A1" t="inlineStr"><is><t>Joining</t></is></c><c r="B1" t="d"><v>2026-08-08T09:40:00</v></c></row>` +
          `<row r="40"><c r="C40" s="0"/></row>` +
          `</sheetData></worksheet>`,
        deflate: true,
      },
    ]);
    const sheets = await parseXlsx(zip);
    expect(sheets).toEqual([{ name: 'Only', rows: [['Joining', '2026-08-08T09:40:00']] }]);
  });

  it('reads [h]:mm and [hh]:mm elapsed formats as times, not 1899 dates', async () => {
    // Stripping the [..] section first would leave ':mm', which reads as a
    // date — a 13:55 ETA styled [h]:mm must not render as 30/12/1899.
    const zip = buildZip([
      {
        name: 'xl/workbook.xml',
        text: `<workbook xmlns="${NS}" xmlns:r="${REL}"><sheets><sheet name="Times" sheetId="1" r:id="rId1"/></sheets></workbook>`,
        deflate: true,
      },
      {
        name: 'xl/_rels/workbook.xml.rels',
        text:
          `<Relationships xmlns="${PKG}">` +
          `<Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/>` +
          `<Relationship Id="rId2" Type="${REL}/styles" Target="styles.xml"/>` +
          `</Relationships>`,
        deflate: false,
      },
      {
        name: 'xl/styles.xml',
        text:
          `<styleSheet xmlns="${NS}">` +
          `<numFmts count="2"><numFmt numFmtId="164" formatCode="[h]:mm"/><numFmt numFmtId="165" formatCode="[hh]:mm"/></numFmts>` +
          `<cellXfs count="3"><xf numFmtId="0"/><xf numFmtId="164"/><xf numFmtId="165"/></cellXfs>` +
          `</styleSheet>`,
        deflate: true,
      },
      {
        name: 'xl/worksheets/sheet1.xml',
        text:
          `<worksheet xmlns="${NS}"><sheetData>` +
          `<row r="1"><c r="A1" s="1"><v>0.58</v></c><c r="B1" s="2"><v>0.58</v></c></row>` +
          `</sheetData></worksheet>`,
        deflate: true,
      },
    ]);
    const [times] = await parseXlsx(zip);
    expect(times!.rows).toEqual([['13:55', '13:55']]);
  });

  it('skips crafted cell and row references beyond Excel’s own limits instead of allocating for them', async () => {
    // ZZZZZZ names 321 million column slots and r="999999999" a thousand
    // million rows; Excel itself stops at XFD1048576, so anything past that
    // is a crafted file and the cell is skipped rather than grown into.
    const zip = buildZip([
      {
        name: 'xl/workbook.xml',
        text: `<workbook xmlns="${NS}" xmlns:r="${REL}"><sheets><sheet name="Wide" sheetId="1" r:id="rId1"/></sheets></workbook>`,
        deflate: true,
      },
      {
        name: 'xl/_rels/workbook.xml.rels',
        text: `<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
        deflate: false,
      },
      {
        name: 'xl/worksheets/sheet1.xml',
        text:
          `<worksheet xmlns="${NS}"><sheetData>` +
          `<row r="1"><c r="A1" t="inlineStr"><is><t>Name</t></is></c><c r="ZZZZZZ1" s="0"/></row>` +
          `<row r="999999999"><c r="A999999999" t="inlineStr"><is><t>never shown</t></is></c></row>` +
          `</sheetData></worksheet>`,
        deflate: true,
      },
    ]);
    const [wide] = await parseXlsx(zip);
    expect(wide!.rows).toEqual([['Name']]);
  });
});

describe('refusals', () => {
  it('rejects a file that is not a zip with a save-as message', async () => {
    await expect(parseXlsx(toArrayBuffer(enc.encode('Family name,Forenames\n')))).rejects.toThrow(
      /not an \.xlsx workbook/,
    );
    await expect(parseXlsx(new ArrayBuffer(0))).rejects.toThrow(/save as|Save As/i);
  });

  it('rejects a zip that holds no workbook', async () => {
    const zip = buildZip([{ name: 'readme.txt', text: 'hello', deflate: false }]);
    await expect(parseXlsx(zip)).rejects.toThrow(/not an Excel workbook/);
  });

  it('rejects the old binary .xls, telling the user to save as .xlsx or .csv', async () => {
    await expect(parseSpreadsheet(new ArrayBuffer(8), 'crew.xls')).rejects.toThrow(
      /Save As and pick \.xlsx or \.csv/,
    );
  });

  it('rejects other extensions with the same advice', async () => {
    await expect(parseSpreadsheet(new ArrayBuffer(8), 'crew.pdf')).rejects.toThrow(
      /Choose an \.xlsx or \.csv file/,
    );
  });

  it('rejects a workbook compressed with a method it cannot read', async () => {
    const zip = new Uint8Array(
      buildZip([{ name: 'xl/workbook.xml', text: '<workbook/>', deflate: false }]),
    );
    // Patch the method in the central directory from 0 (stored) to 12 (bzip2).
    const text = latin1(zip);
    const cd = text.indexOf('PK\u0001\u0002');
    new DataView(zip.buffer).setUint16(cd + 10, 12, true);
    await expect(parseXlsx(toArrayBuffer(zip))).rejects.toThrow(/compression method/);
  });

  it('never says anything with an exclamation mark', async () => {
    const messages: string[] = [];
    for (const p of [
      parseXlsx(new ArrayBuffer(0)),
      parseSpreadsheet(new ArrayBuffer(0), 'a.xls'),
      parseSpreadsheet(new ArrayBuffer(0), 'a.doc'),
      parseXlsx(buildZip([{ name: 'x', text: 'x', deflate: false }])),
    ]) {
      await p.catch((e: unknown) => messages.push(String(e)));
    }
    expect(messages).toHaveLength(4);
    for (const m of messages) expect(m).not.toMatch(/!/);
  });
});

describe('CSV', () => {
  it('handles quoted commas, doubled quotes, CRLF and a trailing newline', () => {
    const csv =
      'Family name,Forenames,Notes\r\n' +
      'DEMO,"Crew Member 1","Smith, ""the"" one"\r\n' +
      'DEMO,Crew Member 2,\r\n';
    expect(parseCsv(csv)).toEqual({
      name: 'CSV',
      rows: [
        ['Family name', 'Forenames', 'Notes'],
        ['DEMO', 'Crew Member 1', 'Smith, "the" one'],
        ['DEMO', 'Crew Member 2', ''],
      ],
    });
  });

  it('strips a BOM and accepts LF-only files', () => {
    const { rows } = parseCsv('\uFEFFa,b\n1,2\n');
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('uses a semicolon or a tab when the first line has no commas', () => {
    expect(parseCsv('a;b;c\n1;2;3').rows).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
    expect(parseCsv('a\tb\n1\t2\n').rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
    // A comma inside quotes on the first line does not count as a delimiter.
    expect(parseCsv('"Smith, John";Rank\nx;y').rows).toEqual([
      ['Smith, John', 'Rank'],
      ['x', 'y'],
    ]);
  });

  it('does not let one stray comma beat a tab-delimited first line', () => {
    // Excel's tab-delimited save leaves commas unquoted, so a heading like
    // 'Surname, per passport' must not hand the file to the comma parser.
    expect(
      parseCsv('Surname, per passport\tRank\tNationality\nDEMO\tMaster\tDemoland').rows,
    ).toEqual([
      ['Surname, per passport', 'Rank', 'Nationality'],
      ['DEMO', 'Master', 'Demoland'],
    ]);
    // A genuine CSV still wins, and the comma takes ties.
    expect(parseCsv('a,b\tc\n1,2').rows).toEqual([
      ['a', 'b\tc'],
      ['1', '2'],
    ]);
  });

  it('keeps a quoted field that spans lines, pads ragged rows and drops blank trailing rows', () => {
    const { rows } = parseCsv('a,b,c\n"multi\nline",2\n\n\n');
    expect(rows).toEqual([
      ['a', 'b', 'c'],
      ['multi\nline', '2', ''],
    ]);
    expect(parseCsv('').rows).toEqual([]);
    expect(parseCsv('\n\n').rows).toEqual([]);
  });

  it('is reached through parseSpreadsheet for .csv and .txt, decoding a BOM and Windows-1252', async () => {
    const utf8 = toArrayBuffer(enc.encode('\uFEFFFamily name,Forenames\nDÉMO,Çrew\n'));
    const [csv] = await parseSpreadsheet(utf8, 'crew.csv');
    expect(csv!.name).toBe('CSV');
    expect(csv!.rows[1]).toEqual(['DÉMO', 'Çrew']);
    const ansi = new Uint8Array([0x44, 0xc9, 0x4d, 0x4f, 0x2c, 0x78, 0x0a]); // "DÉMO,x" in Windows-1252
    const [txt] = await parseSpreadsheet(toArrayBuffer(ansi), 'crew.txt');
    expect(txt!.rows[0]).toEqual(['DÉMO', 'x']);
  });
});
