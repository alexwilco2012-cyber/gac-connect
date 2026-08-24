/* Crew list — presenter mirror of the site's Crew list section (owner's ask,
   23 Aug 2026): the crew coordinator uploads the spreadsheet they already keep,
   checks what the platform read, chooses the LOIs, hotel rooms and taxis that
   hang off it, submits the lot in one go, and can delete the crew's personal
   data afterwards — or it goes by itself thirty days after the crew change
   completes. Feature module: registers state / bindings / Escape handling with
   the core Component via Component._features (see component.js "feature-module
   extension points"). It is the first section of Crew change and the default
   one; crew-change.js owns the section strip and names it there.

   Mirrors src/lib/xlsx.ts (the clXlsx* reader and writer), src/lib/crewList.ts
   (the cl* rules), src/data/crewList.ts (CL_* copy and demo data), the
   crew-list half of src/store/crewChange.ts and
   src/screens/app/crew/CrewListSection.tsx — copy verbatim, rules ported
   verbatim. The partial is the crew-list block of 56-crew-change.html plus the
   delete dialog in 75-crew-delete.html.

   Included straight after features/crew-change.js. The x-dc script is one
   scope, so this module reads that module's helpers directly rather than
   copying them: the vessels and ports (CC_VESSELS, CC_PORTS), the date parser
   and name formatter (ccParseDateText, ccFormatCrewName, ccStampLabel), the
   flight feed (trTrackFlight, trAddMinutes, trNormaliseFlightNo, TR_BUFFERS,
   TR_TRANSFER_PORTS), the style strings (CC_PILL, CC_BTN_*, CC_TRACK*,
   CC_SWITCH, CC_KNOB) and the requests store keys (CC_KEY_REQUESTS,
   CC_KEY_SEQ). An LOI raised from a list goes into the same ccRequests the
   letters section shows, tagged crewListId, and is redacted when the list's
   data is deleted — crew-change.js renders that card as "Personal data
   deleted" with a "from CL-0001" chip.

   The draft — the file, the mapping, the choices — lives in state only and is
   never persisted: the notice promises nothing leaves this browser until
   Submit, so a reload drops it by design (site decision). Only the submission
   record is stored, under 'pres.crewChange.crewLists' next to the letters'
   'pres.' keys, hydrated through the shape guard and the retention purge. All
   data on this screen is illustrative and fictional: DEMO, Crew Member n with
   X000000n passports and ZZ flights. */

/* ---------- spreadsheets without a dependency (src/lib/xlsx.ts, verbatim) ----------
   An .xlsx is a zip of small XML parts: the browser inflates a zip entry with
   DecompressionStream('deflate-raw') and DOMParser reads the XML. Stored or
   deflated entries, shared strings (rich-text runs), inline strings, formula
   cached values, booleans and numbers, with date- and time-styled numbers
   turned back into DD/MM/YYYY and HH:MM from the workbook's styles. The old
   binary .xls, password-protected workbooks, zip64 archives and any other
   compression are refused with a message that says what to do instead. The
   writer makes the smallest .xlsx Excel will open — stored entries with
   CRC-32, inline strings, numbers as numbers — for the template and the demo.
   The README rule keeps a literal '<' out of every string literal in the x-dc
   script, so the XML below is spelt with LT. */
const LT = '\u003c';

/* True when this runtime can inflate deflated zip entries, which every .xlsx needs. */
function clCanReadXlsx() { return typeof DecompressionStream === 'function'; }

/* Column letters → 0-based index: A → 0, Z → 25, AA → 26. Stops at the first non-letter; no letters → -1. */
function clColumnIndex(letters) {
  let n = 0;
  let seen = false;
  const up = String(letters).toUpperCase();
  for (let i = 0; i < up.length; i += 1) {
    const code = up.charCodeAt(i);
    if (code < 65 || code > 90) break;
    n = n * 26 + (code - 64);
    seen = true;
  }
  return seen ? n - 1 : -1;
}
/* 0-based index → column letters: 0 → A, 25 → Z, 26 → AA. */
function clColumnLetters(index) {
  let n = Math.max(0, Math.floor(index)) + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}
/* Escape the five XML-special characters for element text and attribute values. */
function clEscapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
/* Drop the control characters XML 1.0 forbids (everything below 0x20 except tab, LF and CR). */
function clXmlSafe(s) { return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); }
const CL_ENCODER = new TextEncoder();
const CL_UTF8 = new TextDecoder('utf-8');

/* Excel's 1900 date system counts days from this epoch (the 1900 leap-year bug is why it is 30 Dec, not 31). */
const CL_EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
const CL_DAY_MS = 86400000;
function clPad2(n) { return n < 10 ? '0' + n : String(n); }
function clYmdLabel(d) { return clPad2(d.getUTCDate()) + '/' + clPad2(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear(); }
/* Excel serial date → 'DD/MM/YYYY' (fractional part ignored). Not a finite number → ''. */
function clExcelSerialToDate(serial) {
  if (!Number.isFinite(serial)) return '';
  return clYmdLabel(new Date(CL_EXCEL_EPOCH_MS + Math.floor(serial) * CL_DAY_MS));
}
/* The fractional part of an Excel serial → 'HH:MM', to the nearest minute. */
function clExcelSerialToTime(serial) {
  if (!Number.isFinite(serial)) return '';
  const minutes = Math.round((serial - Math.floor(serial)) * 1440) % 1440;
  return clPad2(Math.floor(minutes / 60)) + ':' + clPad2(minutes % 60);
}
/* Date and time together, rolling the date on when the minutes round up past midnight. */
function clExcelSerialToDateTime(serial) {
  if (!Number.isFinite(serial)) return '';
  const total = Math.round(serial * 1440);
  const days = Math.floor(total / 1440);
  const minutes = total - days * 1440;
  return clYmdLabel(new Date(CL_EXCEL_EPOCH_MS + days * CL_DAY_MS)) + ' ' + clPad2(Math.floor(minutes / 60)) + ':' + clPad2(minutes % 60);
}

/* --- zip reading --- */
const CL_SIG_LOCAL = 0x04034b50;
const CL_SIG_CENTRAL = 0x02014b50;
const CL_SIG_EOCD = 0x06054b50;
const CL_NOT_A_WORKBOOK = 'This file is not an .xlsx workbook — in your spreadsheet program choose Save As and pick .xlsx or .csv, then try again.';
function clReadCentralDirectory(buf) {
  const dv = new DataView(buf);
  const len = buf.byteLength;
  /* The end-of-central-directory record is the last 22 bytes plus an optional
     comment of up to 65,535 bytes, so scan back for its signature. */
  let eocd = -1;
  for (let i = len - 22; i >= 0 && i >= len - 22 - 0xffff; i -= 1) {
    if (dv.getUint32(i, true) === CL_SIG_EOCD) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error(CL_NOT_A_WORKBOOK);
  const count = dv.getUint16(eocd + 10, true);
  const cdOffset = dv.getUint32(eocd + 16, true);
  if (count === 0xffff || cdOffset === 0xffffffff) {
    throw new Error('This workbook is a zip64 archive, which the platform cannot read — save it again as .xlsx or .csv.');
  }
  const entries = [];
  let p = cdOffset;
  for (let i = 0; i < count; i += 1) {
    if (p + 46 > len || dv.getUint32(p, true) !== CL_SIG_CENTRAL) throw new Error(CL_NOT_A_WORKBOOK);
    const flags = dv.getUint16(p + 8, true);
    const method = dv.getUint16(p + 10, true);
    const compressedSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localHeaderOffset = dv.getUint32(p + 42, true);
    const name = CL_UTF8.decode(new Uint8Array(buf, p + 46, nameLen));
    entries.push({ name: name, flags: flags, method: method, compressedSize: compressedSize, localHeaderOffset: localHeaderOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}
/* A ReadableStream of the bytes piped through the browser's inflater. */
function clInflateRaw(bytes) {
  const source = new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } });
  return new Response(source.pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
}
async function clReadEntry(buf, entry) {
  const dv = new DataView(buf);
  const p = entry.localHeaderOffset;
  if (p + 30 > buf.byteLength || dv.getUint32(p, true) !== CL_SIG_LOCAL) throw new Error(CL_NOT_A_WORKBOOK);
  if (entry.flags & 0x1) {
    throw new Error('This workbook is password-protected, which the platform cannot read — remove the password or save it as .csv.');
  }
  const nameLen = dv.getUint16(p + 26, true);
  const extraLen = dv.getUint16(p + 28, true);
  const start = p + 30 + nameLen + extraLen;
  const end = start + entry.compressedSize;
  if (end > buf.byteLength) throw new Error(CL_NOT_A_WORKBOOK);
  if (entry.method === 0) return buf.slice(start, end);
  if (entry.method === 8) {
    if (!clCanReadXlsx()) {
      throw new Error('This browser cannot unpack .xlsx workbooks — save the list as .csv and upload that instead.');
    }
    try {
      return await clInflateRaw(new Uint8Array(buf, start, entry.compressedSize));
    } catch (e) {
      throw new Error('The workbook could not be unpacked — the file may be damaged. Save it again and retry.');
    }
  }
  throw new Error('This workbook uses a compression method the platform cannot read — save it again as .xlsx or .csv.');
}
/* A zip opened for reading: a part's decoded text on demand, or null when the zip has no such entry. */
function clOpenZip(buf) {
  const byName = new Map();
  clReadCentralDirectory(buf).forEach((e) => { byName.set(e.name.replace(/^\/+/, ''), e); });
  return {
    text: async (name) => {
      const entry = byName.get(name);
      if (!entry) return null;
      return CL_UTF8.decode(await clReadEntry(buf, entry));
    }
  };
}

/* --- workbook reading --- */
const CL_REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
function clParseXml(text, what) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('The workbook’s ' + what + ' could not be read — save the file again as .xlsx or .csv and retry.');
  }
  return doc;
}
/* Elements by local name, whatever prefix the file happens to use. */
function clByLocalName(root, name) { return Array.from(root.getElementsByTagNameNS('*', name)); }
/* A relationship attribute (r:id), found by prefix or by namespace. */
function clRelAttr(el, name) { return el.getAttribute('r:' + name) ?? el.getAttributeNS(CL_REL_NS, name); }
/* Resolve a relationship target against the xl/ folder: 'worksheets/sheet1.xml', '/xl/worksheets/sheet1.xml' and '../xl/x.xml' all land on a zip entry name. */
function clResolvePart(target) {
  if (target.startsWith('/')) return target.slice(1);
  const parts = ['xl'];
  target.split('/').forEach((seg) => {
    if (seg === '..') parts.pop();
    else if (seg && seg !== '.') parts.push(seg);
  });
  return parts.join('/');
}
async function clReadRels(zip) {
  const text = await zip.text('xl/_rels/workbook.xml.rels');
  if (!text) return [];
  return clByLocalName(clParseXml(text, 'relationships'), 'Relationship').map((el) => ({
    id: el.getAttribute('Id') ?? '',
    type: el.getAttribute('Type') ?? '',
    target: clResolvePart(el.getAttribute('Target') ?? '')
  }));
}
/* Concatenate every t under an element — rich-text runs become one string; phonetic hints are skipped. */
function clTextRuns(el) {
  let out = '';
  clByLocalName(el, 't').forEach((t) => {
    if (t.parentElement && t.parentElement.localName === 'rPh') return;
    out += t.textContent ?? '';
  });
  return out;
}
async function clReadSharedStrings(zip, rels) {
  const rel = rels.find((r) => r.type.endsWith('/sharedStrings'));
  const text = await zip.text(rel ? rel.target : 'xl/sharedStrings.xml');
  if (!text) return [];
  return clByLocalName(clParseXml(text, 'shared strings'), 'si').map(clTextRuns);
}
/* Built-in number formats that show a date, a time, or both (ECMA-376 §18.8.30). */
const CL_BUILTIN_DATE = new Set([14, 15, 16, 17, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 50, 51, 52, 53, 54, 55, 56, 57, 58]);
const CL_BUILTIN_TIME = new Set([18, 19, 20, 21, 45, 46, 47]);
const CL_BUILTIN_DATETIME = new Set([22]);
/* Classify a custom format code by the date/time letters left once sections,
   literals and AM/PM are stripped. Elapsed-time tokens — [h], [hh], [mm], [ss] —
   are checked first: stripping the brackets would leave [h]:mm as ':mm', which
   reads as a date, and an elapsed format is a time by definition. */
function clFormatKind(code) {
  if (/\[(h+|m+|s+)\]/i.test(code)) return 'time';
  const bare = code.replace(/\[[^\]]*\]/g, '').replace(/"[^"]*"/g, '').replace(/\\./g, '').replace(/AM\/PM|A\/P/gi, '').toLowerCase();
  const hasDate = /[dy]/.test(bare);
  const hasTime = /[hs]/.test(bare);
  if (hasDate && hasTime) return 'datetime';
  if (hasTime) return 'time';
  if (hasDate || /m/.test(bare)) return 'date';
  return 'none';
}
function clBuiltinKind(id) {
  if (CL_BUILTIN_DATETIME.has(id)) return 'datetime';
  if (CL_BUILTIN_TIME.has(id)) return 'time';
  if (CL_BUILTIN_DATE.has(id)) return 'date';
  return 'none';
}
/* One kind per cell style index (s= on a cell), from the styles part. */
async function clReadStyleKinds(zip, rels) {
  const rel = rels.find((r) => r.type.endsWith('/styles'));
  const text = await zip.text(rel ? rel.target : 'xl/styles.xml');
  if (!text) return [];
  const doc = clParseXml(text, 'styles');
  const custom = new Map();
  const numFmts = clByLocalName(doc, 'numFmts')[0];
  (numFmts ? clByLocalName(numFmts, 'numFmt') : []).forEach((nf) => {
    custom.set(Number(nf.getAttribute('numFmtId')), nf.getAttribute('formatCode') ?? '');
  });
  const cellXfs = clByLocalName(doc, 'cellXfs')[0];
  if (!cellXfs) return [];
  return clByLocalName(cellXfs, 'xf').map((xf) => {
    const id = Number(xf.getAttribute('numFmtId') ?? '0');
    const code = custom.get(id);
    return code !== undefined ? clFormatKind(code) : clBuiltinKind(id);
  });
}
/* A numeric v as text — plain digits for ordinary numbers, no exponent, float noise (44.299999999999997) settled. */
function clNumberText(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return v.trim();
  if (Math.abs(n) >= 1e21 || (n !== 0 && Math.abs(n) < 1e-6)) {
    return n.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 });
  }
  return String(n);
}
function clCellText(c, shared, styles) {
  const t = c.getAttribute('t') ?? 'n';
  if (t === 'inlineStr') return clTextRuns(c);
  const vEl = clByLocalName(c, 'v')[0];
  const v = vEl ? (vEl.textContent ?? '') : '';
  if (t === 's') return shared[Number(v)] ?? '';
  if (t === 'str' || t === 'd') return v; /* formula text, or an ISO 8601 date cell */
  if (t === 'b') return v.trim() === '1' ? 'TRUE' : 'FALSE';
  if (t === 'e') return '';
  if (v.trim() === '') return '';
  const n = Number(v);
  const kind = styles[Number(c.getAttribute('s') ?? '0')] ?? 'none';
  if (Number.isFinite(n)) {
    if (kind === 'date') return clExcelSerialToDate(n);
    if (kind === 'time') return clExcelSerialToTime(n);
    if (kind === 'datetime') return clExcelSerialToDateTime(n);
  }
  return clNumberText(v);
}
/* Pad every row to the widest, drop trailing rows and trailing columns that are empty throughout. */
function clRectangular(rows) {
  let lastRow = rows.length - 1;
  while (lastRow >= 0 && rows[lastRow].every((cell) => cell === '')) lastRow -= 1;
  const kept = rows.slice(0, lastRow + 1);
  let width = 0;
  kept.forEach((row) => {
    let w = row.length;
    while (w > 0 && row[w - 1] === '') w -= 1;
    width = Math.max(width, w);
  });
  return kept.map((row) => {
    const out = row.slice(0, width);
    while (out.length < width) out.push('');
    return out;
  });
}
/* Excel's own sheet limits (XFD1048576). A crafted ref beyond them would grow arrays until the tab dies, so the cell is skipped instead. */
const CL_MAX_ROW_INDEX = 1048575;
const CL_MAX_COL_INDEX = 16383;
function clReadSheetRows(xml, shared, styles) {
  const doc = clParseXml(xml, 'worksheet');
  const sheetData = clByLocalName(doc, 'sheetData')[0];
  if (!sheetData) return [];
  const rows = [];
  let rowIdx = -1;
  clByLocalName(sheetData, 'row').forEach((rowEl) => {
    const r = Number(rowEl.getAttribute('r'));
    rowIdx = Number.isInteger(r) && r >= 1 ? r - 1 : rowIdx + 1;
    if (rowIdx > CL_MAX_ROW_INDEX) return;
    while (rows.length <= rowIdx) rows.push([]);
    const row = rows[rowIdx];
    let colIdx = -1;
    clByLocalName(rowEl, 'c').forEach((c) => {
      const ref = /^([A-Za-z]+)\d*$/.exec(c.getAttribute('r') ?? '');
      colIdx = ref ? clColumnIndex(ref[1]) : colIdx + 1;
      if (colIdx > CL_MAX_COL_INDEX) return;
      while (row.length <= colIdx) row.push('');
      row[colIdx] = clCellText(c, shared, styles);
    });
  });
  return clRectangular(rows);
}
/* Parse an .xlsx ArrayBuffer into sheets of text cells, in workbook order. Rejects with a readable message. */
async function clParseXlsx(buf) {
  const zip = clOpenZip(buf);
  const workbookXml = await zip.text('xl/workbook.xml');
  if (!workbookXml) {
    throw new Error('This file is a zip but not an Excel workbook — save it as .xlsx or .csv from your spreadsheet program and try again.');
  }
  const rels = await clReadRels(zip);
  const shared = await clReadSharedStrings(zip, rels);
  const styles = await clReadStyleKinds(zip, rels);
  const sheets = [];
  const sheetEls = clByLocalName(clParseXml(workbookXml, 'workbook'), 'sheet');
  for (let i = 0; i < sheetEls.length; i += 1) {
    const sheetEl = sheetEls[i];
    const rel = rels.find((r) => r.id === clRelAttr(sheetEl, 'id'));
    if (!rel || (rel.type && !rel.type.endsWith('/worksheet'))) continue;
    const xml = await zip.text(rel.target);
    sheets.push({
      name: sheetEl.getAttribute('name') ?? ('Sheet' + (sheets.length + 1)),
      rows: xml ? clReadSheetRows(xml, shared, styles) : []
    });
  }
  return sheets;
}

/* --- CSV --- */
/* Pick the delimiter from the first line: whichever of comma, tab and semicolon
   appears most outside quotes, with the comma winning ties. Excel's
   tab-delimited save does not quote fields containing commas, so a heading like
   'Surname, per passport' must not hand a tabbed file to the comma parser. No
   delimiter at all → comma. */
function clDetectDelimiter(text) {
  const end = text.search(/\r|\n/);
  const line = end < 0 ? text : text.slice(0, end);
  const counts = { ',': 0, '\t': 0, ';': 0 };
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') quoted = !quoted;
    else if (!quoted && (ch === ',' || ch === '\t' || ch === ';')) counts[ch] += 1;
  }
  if (counts[','] >= counts['\t'] && counts[','] >= counts[';'] && counts[','] > 0) return ',';
  if (counts['\t'] === 0 && counts[';'] === 0) return ',';
  return counts['\t'] >= counts[';'] ? '\t' : ';';
}
/* RFC 4180 and the dialects Excel saves: quoted fields, doubled quotes, CRLF or LF, a trailing newline, a leading BOM, ; or tab when the first line carries more of either than commas. Named 'CSV'. */
function clParseCsv(text) {
  const src = text.startsWith('\uFEFF') ? text.slice(1) : text;
  const delim = clDetectDelimiter(src);
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let i = 0;
  const endRow = () => { row.push(field); rows.push(row); row = []; field = ''; };
  while (i < src.length) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i += 1; continue;
      }
      field += ch; i += 1; continue;
    }
    if (ch === '"' && field === '') { quoted = true; i += 1; continue; }
    if (ch === delim) { row.push(field); field = ''; i += 1; continue; }
    if (ch === '\r' || ch === '\n') {
      endRow();
      i += ch === '\r' && src[i + 1] === '\n' ? 2 : 1;
      continue;
    }
    field += ch; i += 1;
  }
  if (field !== '' || row.length > 0) endRow();
  return { name: 'CSV', rows: clRectangular(rows) };
}
/* Decode an uploaded text file: UTF-16 by BOM, otherwise UTF-8, falling back to Windows-1252 for Excel's plain "CSV" save. */
function clDecodeText(buf) {
  const bytes = new Uint8Array(buf);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(buf);
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(buf);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch (e) {
    return new TextDecoder('windows-1252').decode(buf);
  }
}
/* Dispatch on the file name: .xlsx (and .xlsm) → the workbook reader; .csv, .txt and .tsv → CSV. The old binary .xls, and anything else, is refused with a message telling the user to save as .xlsx or .csv. */
async function clParseSpreadsheet(buf, fileName) {
  const m = /\.([A-Za-z0-9]+)$/.exec(String(fileName).trim());
  const ext = m ? m[1].toLowerCase() : '';
  if (ext === 'xlsx' || ext === 'xlsm') return clParseXlsx(buf);
  if (ext === 'csv' || ext === 'txt' || ext === 'tsv') return [clParseCsv(clDecodeText(buf))];
  if (ext === 'xls') {
    throw new Error('Older .xls workbooks cannot be read — in Excel choose Save As and pick .xlsx or .csv, then upload that.');
  }
  throw new Error('Choose an .xlsx or .csv file' + (ext ? ' — .' + ext + ' files cannot be read' : '') + '. In your spreadsheet program choose Save As and pick .xlsx or .csv.');
}

/* --- zip writing (stored entries) and the .xlsx parts --- */
const CL_CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();
/* CRC-32 (IEEE), as zip requires for every entry. */
function clCrc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = CL_CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
/* A fixed, valid MS-DOS stamp (1 Jan 2026 00:00) so the bytes are deterministic. */
const CL_DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;
const CL_DOS_TIME = 0;
function clZipStored(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  files.forEach((f) => {
    const name = CL_ENCODER.encode(f.name);
    const crc = clCrc32(f.data);
    const local = new Uint8Array(30 + name.length + f.data.length);
    const ldv = new DataView(local.buffer);
    ldv.setUint32(0, CL_SIG_LOCAL, true);
    ldv.setUint16(4, 20, true);      /* version needed */
    ldv.setUint16(6, 0x0800, true);  /* UTF-8 names */
    ldv.setUint16(8, 0, true);       /* stored */
    ldv.setUint16(10, CL_DOS_TIME, true);
    ldv.setUint16(12, CL_DOS_DATE, true);
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
    cdv.setUint32(0, CL_SIG_CENTRAL, true);
    cdv.setUint16(4, 20, true);      /* version made by */
    cdv.setUint16(6, 20, true);      /* version needed */
    cdv.setUint16(8, 0x0800, true);
    cdv.setUint16(10, 0, true);
    cdv.setUint16(12, CL_DOS_TIME, true);
    cdv.setUint16(14, CL_DOS_DATE, true);
    cdv.setUint32(16, crc, true);
    cdv.setUint32(20, f.data.length, true);
    cdv.setUint32(24, f.data.length, true);
    cdv.setUint16(28, name.length, true);
    cdv.setUint16(30, 0, true);      /* extra */
    cdv.setUint16(32, 0, true);      /* comment */
    cdv.setUint16(34, 0, true);      /* disk */
    cdv.setUint16(36, 0, true);      /* internal attributes */
    cdv.setUint32(38, 0, true);      /* external attributes */
    cdv.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);
    offset += local.length;
  });
  const cdSize = centrals.reduce((n, c) => n + c.length, 0);
  const eocd = new Uint8Array(22);
  const edv = new DataView(eocd.buffer);
  edv.setUint32(0, CL_SIG_EOCD, true);
  edv.setUint16(4, 0, true);
  edv.setUint16(6, 0, true);
  edv.setUint16(8, files.length, true);
  edv.setUint16(10, files.length, true);
  edv.setUint32(12, cdSize, true);
  edv.setUint32(16, offset, true);
  edv.setUint16(20, 0, true);
  const out = new Uint8Array(offset + cdSize + 22);
  let p = 0;
  locals.concat(centrals, [eocd]).forEach((part) => { out.set(part, p); p += part.length; });
  return out;
}
const CL_XML_HEAD = LT + '?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const CL_NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const CL_NS_PKG_RELS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const CL_NS_CT = 'http://schemas.openxmlformats.org/package/2006/content-types';
/* Excel refuses sheet names over 31 characters or containing []:*?/\ — tidy rather than fail. */
function clSheetNameFor(name) {
  const tidy = name.replace(/[[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31).trim();
  return tidy || 'Sheet1';
}
function clSheetXml(rows) {
  const out = [];
  rows.forEach((row, ri) => {
    const cells = [];
    row.forEach((value, ci) => {
      const ref = clColumnLetters(ci) + (ri + 1);
      if (typeof value === 'number' && Number.isFinite(value)) {
        cells.push(LT + 'c r="' + ref + '">' + LT + 'v>' + String(value) + LT + '/v>' + LT + '/c>');
      } else {
        const text = clXmlSafe(String(value));
        if (text === '') return;
        cells.push(LT + 'c r="' + ref + '" t="inlineStr">' + LT + 'is>' + LT + 't xml:space="preserve">' + clEscapeXml(text) + LT + '/t>' + LT + '/is>' + LT + '/c>');
      }
    });
    out.push(LT + 'row r="' + (ri + 1) + '">' + cells.join('') + LT + '/row>');
  });
  return CL_XML_HEAD + LT + 'worksheet xmlns="' + CL_NS_MAIN + '">' + LT + 'sheetData>' + out.join('') + LT + '/sheetData>' + LT + '/worksheet>';
}
/* Build a minimal, Excel-openable .xlsx: one sheet, stored zip entries, inline strings, numbers as numbers. Empty-string cells are left out, as Excel leaves blanks out; the parser pads them back in. */
function clWriteXlsx(sheet) {
  const name = clSheetNameFor(sheet.name);
  const parts = [
    { name: '[Content_Types].xml', data:
      CL_XML_HEAD + LT + 'Types xmlns="' + CL_NS_CT + '">' +
      LT + 'Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      LT + 'Default Extension="xml" ContentType="application/xml"/>' +
      LT + 'Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      LT + 'Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      LT + 'Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      LT + '/Types>' },
    { name: '_rels/.rels', data:
      CL_XML_HEAD + LT + 'Relationships xmlns="' + CL_NS_PKG_RELS + '">' +
      LT + 'Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      LT + '/Relationships>' },
    { name: 'xl/workbook.xml', data:
      CL_XML_HEAD + LT + 'workbook xmlns="' + CL_NS_MAIN + '" xmlns:r="' + CL_REL_NS + '">' +
      LT + 'sheets>' + LT + 'sheet name="' + clEscapeXml(name) + '" sheetId="1" r:id="rId1"/>' + LT + '/sheets>' +
      LT + '/workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', data:
      CL_XML_HEAD + LT + 'Relationships xmlns="' + CL_NS_PKG_RELS + '">' +
      LT + 'Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      LT + 'Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      LT + '/Relationships>' },
    { name: 'xl/styles.xml', data:
      CL_XML_HEAD + LT + 'styleSheet xmlns="' + CL_NS_MAIN + '">' +
      LT + 'fonts count="1">' + LT + 'font>' + LT + 'sz val="11"/>' + LT + 'name val="Calibri"/>' + LT + '/font>' + LT + '/fonts>' +
      LT + 'fills count="2">' + LT + 'fill>' + LT + 'patternFill patternType="none"/>' + LT + '/fill>' + LT + 'fill>' + LT + 'patternFill patternType="gray125"/>' + LT + '/fill>' + LT + '/fills>' +
      LT + 'borders count="1">' + LT + 'border>' + LT + 'left/>' + LT + 'right/>' + LT + 'top/>' + LT + 'bottom/>' + LT + 'diagonal/>' + LT + '/border>' + LT + '/borders>' +
      LT + 'cellStyleXfs count="1">' + LT + 'xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>' + LT + '/cellStyleXfs>' +
      LT + 'cellXfs count="1">' + LT + 'xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' + LT + '/cellXfs>' +
      LT + 'cellStyles count="1">' + LT + 'cellStyle name="Normal" xfId="0" builtinId="0"/>' + LT + '/cellStyles>' +
      LT + '/styleSheet>' },
    { name: 'xl/worksheets/sheet1.xml', data: clSheetXml(sheet.rows) }
  ];
  return clZipStored(parts.map((p) => ({ name: p.name, data: CL_ENCODER.encode(p.data) })));
}
/* A Uint8Array's bytes as an ArrayBuffer of their own, for the parser. */
function clToArrayBuffer(bytes) { return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); }
/* Hand the browser a file to save — the template, built in the page. */
function clDownloadBytes(bytes, fileName) {
  const blob = new Blob([clToArrayBuffer(bytes)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- copy and demo data (src/data/crewList.ts, verbatim) ---------- */
/* Column headings a crew coordinator's own spreadsheet might carry, per field.
   Matching is case-, space- and punctuation-insensitive; the first field that
   claims a heading wins. */
const CL_HEADER_SYNONYMS = {
  familyName: ['family name', 'surname', 'last name', 'lastname', 'family'],
  forenames: ['forenames', 'forename', 'first name', 'first names', 'given name', 'given names', 'other names'],
  fullName: ['full name', 'name', 'crew name', 'crew member', 'seafarer', 'crew', 'names'],
  rank: ['rank', 'position', 'role', 'rank position', 'job title', 'capacity'],
  nationality: ['nationality', 'nat', 'nationality nat', 'country', 'citizenship', 'natl'],
  dateOfBirth: ['date of birth', 'dob', 'birth date', 'birthdate', 'born', 'd o b'],
  passportNumber: ['passport number', 'passport no', 'passport', 'passport num', 'ppt', 'ppt no', 'ppt number', 'pp no', 'pp number', 'passport nr'],
  passportExpiry: ['passport expiry', 'passport expiry date', 'expiry', 'expiry date', 'exp', 'exp date', 'date of expiry', 'valid until', 'valid to', 'passport valid to', 'passport valid until', 'ppt exp', 'ppt expiry', 'pp exp', 'pp expiry', 'passport exp'],
  movement: ['on off', 'on off signer', 'on', 'off', 'movement', 'type', 'direction', 'joining leaving', 'joiner leaver', 'status', 'signing', 'sign on off', 'on signer off signer', 'crew change', 'join leave'],
  flightNumber: ['flight', 'flight no', 'flight number', 'flt', 'flt no', 'flight nr', 'flights'],
  flightDate: ['flight date', 'date', 'travel date', 'arrival date', 'arr date', 'departure date', 'dep date', 'date of travel', 'date of flight', 'flight dt'],
  flightTime: ['time', 'eta', 'etd', 'sta', 'std', 'eta etd', 'arrival time', 'arr time', 'departure time', 'dep time', 'flight time', 'arrival departure time', 'arrival', 'departure'],
  flightFrom: ['from', 'origin', 'routing', 'via', 'from to', 'route', 'sector', 'to'],
  vessel: ['vessel', 'ship', 'vessel name', 'ship name', 'unit', 'rig'],
  port: ['port', 'location', 'port of call', 'joining port', 'crew change port', 'place'],
  visaNational: ['visa', 'visa national', 'visa required', 'visa nat', 'visa needed', 'visa y n']
};
/* Column order of the downloadable template — and of the demo crew list. */
const CL_TEMPLATE_HEADERS = ['Family name', 'Forenames', 'Rank', 'Nationality', 'Date of birth', 'Passport number', 'Passport expiry', 'On/Off signer', 'Flight number', 'Flight date', 'Arrival/Departure time', 'From/To', 'Vessel', 'Port'];
/* Eight obviously fictional crew in template order. Five on-signers on two
   arriving flights the demo feed knows (ZZ 417 ×3, ZZ 122 ×2), three
   off-signers on two departing ones (ZZ 204 ×2, ZZ 131 ×1). Row 7 — an
   off-signer, where a missing expiry is low-stakes — has no passport expiry,
   so the check step shows what an issue looks like. */
const CL_DEMO_ROWS = [
  ['DEMO', 'Crew Member 1', 'Master', 'Demo nationality A', '01/01/1990', 'X0000001', '01/01/2031', 'On', 'ZZ 417', '22/08/2026', '13:55', 'Amsterdam', 'MV Caledonian Star', 'Aberdeen'],
  ['DEMO', 'Crew Member 2', 'Chief Officer', 'Demo nationality A', '02/02/1988', 'X0000002', '01/06/2030', 'On', 'ZZ 417', '22/08/2026', '13:55', 'Amsterdam', 'MV Caledonian Star', 'Aberdeen'],
  ['DEMO', 'Crew Member 3', 'Second Engineer', 'Demo nationality B', '03/03/1992', 'X0000003', '15/09/2032', 'On', 'ZZ 417', '22/08/2026', '13:55', 'Amsterdam', 'MV Caledonian Star', 'Aberdeen'],
  ['DEMO', 'Crew Member 4', 'Bosun', 'Demo nationality B', '04/04/1985', 'X0000004', '30/11/2030', 'On', 'ZZ 122', '22/08/2026', '09:40', 'London Heathrow', 'MV Caledonian Star', 'Aberdeen'],
  ['DEMO', 'Crew Member 5', 'Able Seaman', 'Demo nationality A', '05/05/1995', 'X0000005', '12/03/2033', 'On', 'ZZ 122', '22/08/2026', '09:40', 'London Heathrow', 'MV Caledonian Star', 'Aberdeen'],
  ['DEMO', 'Crew Member 6', 'Chief Engineer', 'Demo nationality B', '06/06/1980', 'X0000006', '20/07/2031', 'Off', 'ZZ 204', '22/08/2026', '17:10', 'Amsterdam', 'MV Caledonian Star', 'Aberdeen'],
  ['DEMO', 'Crew Member 7', 'Cook', 'Demo nationality A', '07/07/1991', 'X0000007', '', 'Off', 'ZZ 204', '22/08/2026', '17:10', 'Amsterdam', 'MV Caledonian Star', 'Aberdeen'],
  ['DEMO', 'Crew Member 8', 'Oiler', 'Demo nationality B', '08/08/1987', 'X0000008', '28/02/2032', 'Off', 'ZZ 131', '22/08/2026', '19:25', 'London Heathrow', 'MV Caledonian Star', 'Aberdeen']
];
/* File names — no brand string (src/config/brand.ts rule). */
const CL_TEMPLATE_FILE_NAME = 'crew-list-template.xlsx';
const CL_DEMO_FILE_NAME = 'crew-list-demo.xlsx';
/* The data-protection disclosure shown before anything is uploaded. */
const CL_DATA_NOTICE = {
  title: 'How crew data is handled',
  intro: 'Illustrative notice for this proof of concept — GAC’s published privacy notice governs the live service.',
  points: [
    { title: 'What is collected', body: 'Names, ranks, nationality, dates of birth, passport numbers and expiry dates, and flight details — the columns your list carries that a crew change needs.' },
    { title: 'Why', body: 'To arrange the crew change you ask for: the immigration letters, the rooms and the transport. Passport details are used only where a letter or a carrier requires them.' },
    { title: 'Where it goes', body: 'Your file is read in this browser and nothing leaves it until you press Submit. From then on GAC’s agency team holds the list for this crew change. Hotels receive names and dates only; taxi operators receive names, flight numbers and pick-up times; immigration letters carry passport details and go to GAC, the carrier and UK Border Force. No supplier you did not choose sees anything.' },
    { title: 'How long', body: 'Until the crew change is complete, plus thirty days, then it is deleted automatically. You can delete it sooner, at any time, from the crew list’s card — one click, confirmed back to you.' },
    { title: 'Crew members’ rights', body: 'Crew can ask what is held about them and for it to be corrected or deleted. Route the request through your GAC agent and it is actioned on the platform the same way.' }
  ],
  acknowledgement: 'I am authorised to share these details for this crew change and the crew have been told they are passed to GAC for it.'
};
/* Shown above the drop zone — same warn style as the letters' notice. */
const CL_ILLUSTRATIVE = 'Illustrative — do not upload real passport data in this proof of concept. Use the demo crew list or the template with made-up details.';
/* The three service cards offered once the list is checked. */
const CL_SERVICE_CARDS = {
  loi: { title: 'LOIs for on-signers', body: 'An Immigration Support Letter for each visa-national on-signer, raised into the letters pipeline — GAC checks, endorses as agents and returns each one.' },
  hotels: { title: 'Hotel rooms', body: 'Rooms for crew ashore at a GAC-vetted hotel, subject to availability — your agent steps in if the hotel cannot confirm.' },
  taxis: { title: 'Taxis, timed to the flights', body: 'One run per flight, grouped from the list. Flights the feed knows are tracked and re-time on a delay; the rest are timed from the itinerary.' }
};
/* The stepper across the top of the section. */
const CL_STEPS = ['Upload', 'Check', 'Choose services', 'Submit', 'Delete when done'];
/* The delete dialog. bodyAll is the same sentence scoped to every list, for the delete-all path. */
const CL_DELETE_CONFIRM = {
  title: 'Delete crew data?',
  body: 'This removes names, passport details, dates of birth and flight details for this list from this device, redacts any letters raised from it, and asks GAC to delete its working copy. The reference, the crew count and the services stay for the invoice. This cannot be undone.',
  bodyAll: 'This removes names, passport details, dates of birth and flight details for every list that still holds them from this device, redacts any letters raised from them, and asks GAC to delete its working copies. The references, the crew counts and the services stay for the invoice. This cannot be undone.',
  confirm: 'Delete crew data',
  cancel: 'Keep for now'
};

/* ---------- crew list rules (src/lib/crewList.ts, verbatim) ---------- */
/* Every field a column can be mapped to, with the column name shown in the
   mapping selects and the template. A list needs either a family-name column
   or a full-name column (one of the two); the rest are reported as issues row
   by row rather than refused up front. */
const CL_FIELDS = [
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
  { id: 'visaNational', label: 'Visa national' }
];
function clCrewFieldLabel(field) { const f = CL_FIELDS.find((x) => x.id === field); return f ? f.label : field; }
/* 'PPT No.' → 'pptno' — what a heading looks like once case, spaces and punctuation are gone. */
function clNormaliseHeader(text) { return String(text).toLowerCase().replace(/[^a-z0-9]+/g, ''); }
let clSynonymIndex = null;
/* Normalised synonym → field. The first field that claims a word keeps it. */
function clSynonyms() {
  if (clSynonymIndex) return clSynonymIndex;
  const index = new Map();
  CL_FIELDS.forEach((f) => {
    [f.label].concat(CL_HEADER_SYNONYMS[f.id]).forEach((word) => {
      const key = clNormaliseHeader(word);
      if (key && !index.has(key)) index.set(key, f.id);
    });
  });
  clSynonymIndex = index;
  return index;
}
/* The field a heading names, or null when it is not one the platform knows. */
function clFieldForHeader(header) { return clSynonyms().get(clNormaliseHeader(header)) ?? null; }
/* The header row: the first row with three or more filled cells of which at
   least two are headings the platform knows; when nothing qualifies, row 0. */
function clFindHeaderRow(rows) {
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const filled = row.filter((c) => c.trim() !== '');
    if (filled.length < 3) continue;
    const known = filled.filter((c) => clFieldForHeader(c) !== null).length;
    if (known >= 2) return i;
  }
  return 0;
}
/* Map each heading to a field by synonym. A field maps at most once — the first column wins. */
function clDetectMapping(headers) {
  const used = new Set();
  return headers.map((h) => {
    const field = clFieldForHeader(h);
    if (!field || used.has(field)) return null;
    used.add(field);
    return field;
  });
}
/* Fields no column carries. A full-name column covers family name and forenames, and the pair covers full name. */
function clUnmappedFields(mapping) {
  const mapped = new Set(mapping.filter((m) => m !== null));
  return CL_FIELDS.map((f) => f.id).filter((id) => {
    if (mapped.has(id)) return false;
    if (id === 'fullName') return !mapped.has('familyName');
    if (id === 'familyName' || id === 'forenames') return !mapped.has('fullName');
    return true;
  });
}
function clClean(text) { return String(text).replace(/\s+/g, ' ').trim(); }
const CL_MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
function clDdmmyyyy(d) { return clPad2(d.getUTCDate()) + '/' + clPad2(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear(); }
/* Split 'DD/MM/YYYY HH:MM', '2026-08-22T13:55:00' or '22 Aug 2026 13:55' into date text and time text. Plain dates come back with time ''. */
function clSplitDateTime(text) {
  const t = clClean(text);
  let m = /^(\d{4}-\d{1,2}-\d{1,2})[T ](\d{1,2}:\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/i.exec(t);
  if (m) return { date: m[1], time: m[2] };
  m = /^(.+?)\s+(\d{1,2}:\d{2})(?::\d{2})?(?:\s*(am|pm))?$/i.exec(t);
  if (m && m[1] && clNormaliseDate(m[1]) !== '') {
    return { date: m[1], time: m[3] ? m[2] + ' ' + m[3] : m[2] };
  }
  return { date: t, time: '' };
}
/* A date as a crew list writes it → 'DD/MM/YYYY', or '' when it is not one.
   Takes everything ccParseDateText takes, plus '22-Aug-2026', 'Aug 22, 2026'
   and any of those with a time on the end. Two-digit years are refused. */
function clNormaliseDate(text) {
  let t = clClean(text);
  if (!t) return '';
  const iso = /^(\d{4}-\d{1,2}-\d{1,2})[T ]\d{1,2}:\d{2}/i.exec(t);
  if (iso) t = iso[1];
  else {
    const withTime = /^(.+?)\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:am|pm))?$/i.exec(t);
    if (withTime) t = withTime[1];
  }
  const direct = ccParseDateText(t);
  if (direct) return clDdmmyyyy(direct);
  let m = /^(\d{1,2})[-./ ]?([A-Za-z]{3,9})[-./ ,]?\s?(\d{4})$/.exec(t);
  if (m) {
    const month = CL_MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (!month) return '';
    const d = ccParseDateText(m[1] + '/' + month + '/' + m[3]);
    return d ? clDdmmyyyy(d) : '';
  }
  m = /^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/.exec(t);
  if (m) {
    const month = CL_MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (!month) return '';
    const d = ccParseDateText(m[2] + '/' + month + '/' + m[3]);
    return d ? clDdmmyyyy(d) : '';
  }
  return '';
}
/* A time as a crew list writes it → 'HH:MM', or ''. '14:35', '1435', '935', '14.35', '14h35', '2:35 pm', '2 pm' and '09:40:00' all count; so does the time on the end of a date-time cell. */
function clNormaliseTime(text) {
  let t = clClean(text).toLowerCase();
  if (!t) return '';
  const split = clSplitDateTime(t);
  if (split.time) t = split.time.toLowerCase();
  let h;
  let mm;
  let meridian;
  let m = /^(\d{1,2})[:.h](\d{2})(?::\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?$/.exec(t);
  if (m) { h = Number(m[1]); mm = Number(m[2]); meridian = m[3]; }
  else if ((m = /^(\d{1,2})(\d{2})$/.exec(t))) { h = Number(m[1]); mm = Number(m[2]); }
  else if ((m = /^(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)$/.exec(t))) { h = Number(m[1]); mm = 0; meridian = m[2]; }
  else return '';
  if (meridian) {
    const pm = meridian.startsWith('p');
    if (h < 1 || h > 12) return '';
    if (h === 12) h = pm ? 12 : 0;
    else if (pm) h += 12;
  }
  if (h > 23 || mm > 59) return '';
  return clPad2(h) + ':' + clPad2(mm);
}
const CL_ON_WORDS = new Set(['on', 'onsigner', 'onsigners', 'onsign', 'signon', 'signingon', 'join', 'joiner', 'joiners', 'joining', 'embark', 'embarking', 'embarkation', 'arrival', 'arriving', 'arrive', 'in', 'inbound', 'j', 'onboard']);
const CL_OFF_WORDS = new Set(['off', 'offsigner', 'offsigners', 'offsign', 'signoff', 'signingoff', 'leave', 'leaver', 'leavers', 'leaving', 'disembark', 'disembarking', 'disembarkation', 'repat', 'repatriation', 'repatriate', 'departure', 'departing', 'depart', 'out', 'outbound', 'l', 'offboard']);
/* 'On' / 'joiner' / 'embarking' → 'on'; 'Off' / 'leaver' / 'repat' → 'off'; anything else → ''. */
function clNormaliseMovement(text) {
  const key = String(text).toLowerCase().replace(/[^a-z]+/g, '');
  if (CL_ON_WORDS.has(key)) return 'on';
  if (CL_OFF_WORDS.has(key)) return 'off';
  return '';
}
const CL_VISA_YES = new Set(['yes', 'y', 'true', 'required', 'visa', 'visanational', '1', 'needed']);
const CL_VISA_NO = new Set(['no', 'n', 'false', 'notrequired', 'notneeded', 'waiver', 'visawaiver', 'eea', 'eu', 'none', '0', 'exempt']);
/* 'Yes' / 'required' → true; 'No' / 'waiver' / 'EEA' → false; blank or anything else → null. */
function clNormaliseVisaNational(text) {
  const key = String(text).toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (CL_VISA_YES.has(key)) return true;
  if (CL_VISA_NO.has(key)) return false;
  return null;
}
/* 'SMITH, John' → family SMITH, forenames John. 'John Smith' → family Smith, forenames John. One word → family only. */
function clSplitFullName(text) {
  const t = clClean(text);
  if (!t) return { familyName: '', forenames: '' };
  const comma = t.indexOf(',');
  if (comma !== -1) return { familyName: clClean(t.slice(0, comma)), forenames: clClean(t.slice(comma + 1)) };
  const parts = t.split(' ');
  if (parts.length === 1) return { familyName: t, forenames: '' };
  return { familyName: parts[parts.length - 1], forenames: parts.slice(0, -1).join(' ') };
}
/* What is wrong with a row, in the words the check table shows. A date cell that
   held something the platform could not read is reported with its raw text
   rather than as 'missing'. */
function clRowIssues(row, raw) {
  const rawCells = raw || {};
  const issues = [];
  const unreadable = (field) => clClean(rawCells[field] ?? '') !== '' && row[field] === '';
  if (!row.familyName.trim()) issues.push('Name missing');
  if (!row.passportNumber.trim()) issues.push('Passport number missing');
  if (!row.passportExpiry && !unreadable('passportExpiry')) issues.push('Passport expiry missing');
  const expiry = ccParseDateText(row.passportExpiry);
  const travel = ccParseDateText(row.flightDate);
  if (expiry && travel && expiry.getTime() <= travel.getTime()) issues.push('Passport expired or expiring before travel');
  if (!row.dateOfBirth && !unreadable('dateOfBirth')) issues.push('Date of birth missing');
  if (row.movement === '') issues.push('On- or off-signer not stated');
  if (!row.flightNumber.trim() && !row.flightTime) issues.push('Flight not stated');
  ['dateOfBirth', 'passportExpiry', 'flightDate'].forEach((field) => {
    if (unreadable(field)) issues.push('Date not recognised: ' + clClean(rawCells[field]));
  });
  return issues;
}
/* Build the crew rows from the data grid and the mapping. When two columns carry
   the same field the later column wins. Rows that are wholly empty, or empty in
   every mapped column, are skipped. Ids follow the source row ('r1'…) so a remap
   keeps them. */
function clApplyMapping(raw, mapping) {
  const col = {};
  mapping.forEach((field, i) => { if (field) col[field] = i; });
  const cell = (row, field) => { const i = col[field]; return i === undefined ? '' : clClean(row[i] ?? ''); };
  const mappedCols = Object.keys(col).map((k) => col[k]);
  const rows = [];
  raw.forEach((source, index) => {
    if (source.every((c) => clClean(c) === '')) return;
    if (mappedCols.length && mappedCols.every((i) => clClean(source[i] ?? '') === '')) return;
    const split = clSplitFullName(cell(source, 'fullName'));
    const flightDateText = cell(source, 'flightDate');
    const fromDate = clSplitDateTime(flightDateText);
    const base = {
      familyName: cell(source, 'familyName') || split.familyName,
      forenames: cell(source, 'forenames') || split.forenames,
      rank: cell(source, 'rank'),
      nationality: cell(source, 'nationality'),
      dateOfBirth: clNormaliseDate(cell(source, 'dateOfBirth')),
      passportNumber: cell(source, 'passportNumber'),
      passportExpiry: clNormaliseDate(cell(source, 'passportExpiry')),
      movement: clNormaliseMovement(cell(source, 'movement')),
      flightNumber: cell(source, 'flightNumber'),
      flightDate: clNormaliseDate(flightDateText),
      flightTime: clNormaliseTime(cell(source, 'flightTime')) || clNormaliseTime(fromDate.time),
      flightFrom: cell(source, 'flightFrom'),
      vessel: cell(source, 'vessel'),
      port: cell(source, 'port'),
      visaNational: clNormaliseVisaNational(cell(source, 'visaNational'))
    };
    const issues = clRowIssues(base, {
      dateOfBirth: cell(source, 'dateOfBirth'),
      passportExpiry: cell(source, 'passportExpiry'),
      flightDate: flightDateText
    });
    rows.push(Object.assign({ id: 'r' + (index + 1) }, base, { issues: issues }));
  });
  return rows;
}
/* Index just past the last filled cell in a row. */
function clFilledWidth(row) {
  let w = row.length;
  while (w > 0 && clClean(row[w - 1] ?? '') === '') w -= 1;
  return w;
}
/* Cut or pad every row to one width so the table and the mapping line up. */
function clPadRows(rows, width) {
  return rows.map((r) => {
    const row = r.slice(0, width);
    while (row.length < width) row.push('');
    return row;
  });
}
/* A whole import from one sheet of strings: find the header row, detect the mapping, build the rows. */
function clImportFromTable(fileName, sheetName, rows) {
  const headerRow = clFindHeaderRow(rows);
  const data = rows.slice(headerRow + 1);
  const width = Math.max.apply(null, [clFilledWidth(rows[headerRow] ?? [])].concat(data.map(clFilledWidth), [0]));
  const headers = clPadRows([rows[headerRow] ?? []], width)[0].map((h) => clClean(h));
  const mapping = clDetectMapping(headers);
  const raw = clPadRows(data, width);
  return {
    fileName: fileName, sheetName: sheetName, headers: headers, mapping: mapping, headerRow: headerRow, raw: raw,
    rows: clApplyMapping(raw, mapping),
    unmapped: clUnmappedFields(mapping)
  };
}
/* The same import with one column re-mapped (or ignored). */
function clWithMapping(imp, column, field) {
  const mapping = imp.mapping.map((m, i) => (i === column ? field : m));
  return Object.assign({}, imp, { mapping: mapping, rows: clApplyMapping(imp.raw, mapping), unmapped: clUnmappedFields(mapping) });
}
/* The same import without one crew row — the source row goes too (blanked, not spliced, so the other ids stay put). */
function clWithoutRow(imp, rowId) {
  const m = /^r(\d+)$/.exec(rowId);
  const index = (m ? Number(m[1]) : NaN) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= imp.raw.length) return imp;
  const raw = imp.raw.map((r, i) => (i === index ? r.map(() => '') : r));
  return Object.assign({}, imp, { raw: raw, rows: clApplyMapping(raw, imp.mapping) });
}
function clSummarise(rows) {
  return {
    total: rows.length,
    on: rows.filter((r) => r.movement === 'on').length,
    off: rows.filter((r) => r.movement === 'off').length,
    unstated: rows.filter((r) => r.movement === '').length,
    withIssues: rows.filter((r) => r.issues.length > 0).length,
    visaNational: clPlanLoi(rows).crew.length
  };
}
/* 'X0000017' → '••••0017'. Four characters or fewer → '••••'. */
function clMaskPassport(n) {
  const t = n.trim();
  if (t.length <= 4) return '••••';
  return '••••' + t.slice(-4);
}
/* --- services --- */
/* On-signers who are, or may be, visa nationals — one letter each. */
function clPlanLoi(rows) { return { crew: rows.filter((r) => r.movement === 'on' && r.visaNational !== false) }; }
/* A room per crew member by default, for the nights asked. */
function clPlanHotel(rows, nights) {
  const crew = rows.slice();
  return { rooms: crew.length, nights: Math.max(1, Math.floor(nights) || 1), crew: crew };
}
/* One run per flight and date, crew grouped onto it; a row with no flight
   number gets a run of its own. Arriving runs pick up after bags and
   immigration; departing runs work back from the check-in deadline and the
   road time to the port, exactly as the Taxis planner does. */
function clPlanTaxis(rows, port) {
  const taxi = TR_BUFFERS.taxiMin[port] ?? 30;
  const groups = new Map();
  rows.forEach((row) => {
    const flight = trNormaliseFlightNo(row.flightNumber);
    const key = flight ? flight + '|' + row.flightDate : 'row|' + row.id;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  });
  const runs = [];
  groups.forEach((crew, key) => {
    const first = crew[0];
    const status = first.flightNumber ? trTrackFlight(first.flightNumber) : null;
    const direction = first.movement === 'off' ? 'departing' : 'arriving';
    const sheetTime = crew.map((r) => r.flightTime).find((t) => t !== '') ?? '';
    const time = status ? status.estimated : sheetTime;
    let pickupTime = '';
    if (time) {
      pickupTime = direction === 'arriving'
        ? trAddMinutes(time, TR_BUFFERS.bagsAndImmigrationMin)
        : trAddMinutes(time, -(TR_BUFFERS.checkInBeforeDepartureMin + taxi));
    }
    runs.push({
      key: key,
      flightNumber: first.flightNumber,
      flightDate: crew.map((r) => r.flightDate).find((d) => d !== '') ?? '',
      flightTime: time,
      flightFrom: crew.map((r) => r.flightFrom).find((f) => f !== '') ?? (status ? status.route : ''),
      direction: direction,
      crew: crew,
      tracked: status !== null,
      pickupTime: pickupTime
    });
  });
  return { runs: runs };
}
function clPlural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
function clHotelName(hotelId) { const h = DC_DATA.SUPPLIERS.find((s) => s.id === hotelId); return h ? h.name : 'a GAC-vetted hotel'; }
/* The lines the submit card and the toast carry — one per chosen service, none when nothing is chosen. */
function clServiceSummary(choices, rows) {
  const lines = [];
  if (choices.loi) lines.push('LOIs · ' + clPlural(clPlanLoi(rows).crew.length, 'visa-national on-signer'));
  if (choices.hotels) {
    const plan = clPlanHotel(rows, choices.hotelNights);
    const rooms = choices.hotelRooms ?? plan.rooms;
    lines.push('Hotel · ' + clPlural(rooms, 'room') + ' × ' + clPlural(plan.nights, 'night') + ' at ' + clHotelName(choices.hotelId) + ', subject to availability');
  }
  if (choices.taxis) {
    const plan = clPlanTaxis(rows, choices.port);
    lines.push('Taxis · ' + clPlural(plan.runs.length, 'run') + ' for ' + clPlural(rows.length, 'crew member', 'crew') + ', timed to the flights');
  }
  return lines;
}
/* An LOI template filled from a crew row — the hand-off into the letters pipeline. */
function clLoiFormFromRow(row, vesselId, port) {
  const arriving = clClean('arriving ' + port + ' ' + row.flightDate + ' ' + row.flightTime);
  return {
    familyName: row.familyName, forenames: row.forenames, nationality: row.nationality, dateOfBirth: row.dateOfBirth,
    passportNumber: row.passportNumber, passportExpiry: row.passportExpiry, vesselId: vesselId, port: port,
    joiningDate: row.flightDate,
    arrivingFlight: [row.flightNumber, arriving].filter((p) => p !== '').join(' · '),
    visaNational: row.visaNational !== false
  };
}
/* --- the submission record --- */
const CL_STAGES = ['Submitted to GAC', 'Received by GAC', 'Being arranged', 'Crew change complete'];
/* The notice promises thirty days after completion; this is that number. */
const CL_RETENTION_DAYS_AFTER_COMPLETION = 30;
/* When the personal data is deleted automatically — null until the crew change completes. */
function clPurgeAtIso(sub) {
  if (!sub.completedAtIso) return null;
  const completed = new Date(sub.completedAtIso).getTime();
  if (!Number.isFinite(completed)) return null;
  return new Date(completed + CL_RETENTION_DAYS_AFTER_COMPLETION * CL_DAY_MS).toISOString();
}
function clHasPersonalData(sub) { return sub.crew !== null; }
/* True once the retention period has run and the data is still held. */
function clIsDueForPurge(sub, now) {
  if (!clHasPersonalData(sub)) return false;
  const at = clPurgeAtIso(sub);
  return at !== null && now.getTime() >= new Date(at).getTime();
}
/* The submission with every personal detail gone: the whole crew array is dropped, not fields within it. */
function clRedactSubmission(sub, whenLabel) {
  return Object.assign({}, sub, { crew: null, personalDataDeletedAt: whenLabel, deletionConfirmedByGac: true });
}
/* The automatic retention rule: every submission whose thirty days have run is redacted, labelled with the day it fell due. Returns the same array when nothing was due. */
function clPurgeExpired(list, now) {
  if (!list.some((s) => clIsDueForPurge(s, now))) return list;
  return list.map((s) => {
    if (!clIsDueForPurge(s, now)) return s;
    return clRedactSubmission(s, ccStampLabel(new Date(clPurgeAtIso(s))) + ' · automatic');
  });
}
/* The retention rule over BOTH persisted collections in one pure step (site:
   applyRetention): a list past its thirty days is redacted, and so is every
   letter raised from it — the LOI forms carry the same passports, names and
   dates of birth as the list. Returns the same arrays when nothing was due. */
function clApplyRetention(lists, requests, now) {
  const due = new Set(lists.filter((s) => clIsDueForPurge(s, now)).map((s) => s.id));
  if (due.size === 0) return { lists: lists, requests: requests };
  const touched = (r) => r.crewListId !== undefined && due.has(r.crewListId) && r.redacted !== true;
  const swept = requests.some(touched) ? requests.map((r) => (touched(r) ? ccRedactRequest(r) : r)) : requests;
  return { lists: clPurgeExpired(lists, now), requests: swept };
}
function clStageIndex(stage) { return CL_STAGES.indexOf(stage); }
function clNextStage(stage) {
  const i = clStageIndex(stage);
  if (i === -1) return CL_STAGES[0];
  return CL_STAGES[Math.min(i + 1, CL_STAGES.length - 1)];
}
function clIsTerminalStage(stage) { return stage === CL_STAGES[CL_STAGES.length - 1]; }
/* The demo's simulate button for a list at a stage — what GAC does next. Null once complete. */
function clSimulateAction(stage) {
  switch (stage) {
    case 'Submitted to GAC': return { label: 'Simulate: GAC confirms receipt', steps: 1 };
    case 'Received by GAC': return { label: 'Simulate: GAC arranges the services', steps: 1 };
    case 'Being arranged': return { label: 'Simulate: crew change complete', steps: 1 };
    default: return null;
  }
}
/* What the delete button offers at this point in the list's life. */
function clDeletionAvailability(sub) {
  if (!clHasPersonalData(sub)) return { allowed: false, label: 'Personal data deleted', note: '' };
  if (sub.stage === 'Submitted to GAC') {
    return { allowed: true, label: 'Withdraw and delete crew data', note: 'GAC has not confirmed receipt yet — withdrawing deletes the list before anyone has acted on it.' };
  }
  return { allowed: true, label: 'Delete crew data', note: 'Removes every personal detail from this device and asks GAC to delete its working copy. The request reference, counts and services stay for the invoice.' };
}
/* --- shape guards: storage reads are defensive, a malformed entry is dropped, never a crash --- */
const CL_ROW_STRING_FIELDS = ['id', 'familyName', 'forenames', 'rank', 'nationality', 'dateOfBirth', 'passportNumber', 'passportExpiry', 'flightNumber', 'flightDate', 'flightTime', 'flightFrom', 'vessel', 'port'];
function clIsCrewRow(v) {
  if (!ccIsRecord(v)) return false;
  return CL_ROW_STRING_FIELDS.every((k) => typeof v[k] === 'string') &&
    (v.movement === 'on' || v.movement === 'off' || v.movement === '') &&
    (typeof v.visaNational === 'boolean' || v.visaNational === null) &&
    Array.isArray(v.issues) && v.issues.every((i) => typeof i === 'string');
}
function clIsStringOrNull(v) { return v === null || typeof v === 'string'; }
function clIsCount(v) { return typeof v === 'number' && Number.isFinite(v) && v >= 0; }
function clIsSubmission(v) {
  if (!ccIsRecord(v)) return false;
  if (!['id', 'createdAt', 'createdAtIso', 'vesselId', 'port', 'fileName'].every((k) => typeof v[k] === 'string')) return false;
  if (!clIsCount(v.crewCount) || !clIsCount(v.onCount) || !clIsCount(v.offCount)) return false;
  const s = v.services;
  if (!ccIsRecord(s)) return false;
  if (typeof s.loi !== 'boolean' || typeof s.hotels !== 'boolean' || typeof s.taxis !== 'boolean') return false;
  if (typeof s.hotelId !== 'string') return false;
  if (!clIsCount(s.hotelNights) || !clIsCount(s.loiCount) || !clIsCount(s.rooms) || !clIsCount(s.runs)) return false;
  if (typeof v.stage !== 'string' || clStageIndex(v.stage) === -1) return false;
  if (!clIsStringOrNull(v.receivedAt) || !clIsStringOrNull(v.completedAtIso)) return false;
  if (v.crew !== null && !(Array.isArray(v.crew) && v.crew.every(clIsCrewRow))) return false;
  if (!Array.isArray(v.linkedRequestIds) || !v.linkedRequestIds.every((i) => typeof i === 'string')) return false;
  if (!clIsStringOrNull(v.personalDataDeletedAt)) return false;
  return typeof v.deletionConfirmedByGac === 'boolean';
}

/* ---------- storage (the crew-list half of store/crewChange.ts) — 'pres.' prefix keeps clear of the site's own keys ---------- */
const CL_KEY_LISTS = 'pres.crewChange.crewLists';
const CL_KEY_SEQ = 'pres.crewChange.crewListSeq';

/* ---------- section helpers (CrewListSection.tsx) ---------- */
const CL_STEP_INDEX = { check: 1, services: 2, submit: 3 };
/* The service lines a stored submission reads as — from its counts, since the crew may be gone. */
function clStoredServiceLines(s) {
  const lines = [];
  if (s.loi) lines.push('LOIs · ' + clPlural(s.loiCount, 'visa-national on-signer'));
  if (s.hotels) lines.push('Hotel · ' + clPlural(s.rooms, 'room') + ' × ' + clPlural(s.hotelNights, 'night') + ' at ' + clHotelName(s.hotelId) + ', subject to availability');
  if (s.taxis) lines.push('Taxis · ' + clPlural(s.runs, 'run') + ', timed to the flights');
  return lines;
}
/* '5 LOIs, 8 hotel rooms and 4 taxi runs' — the toast's services phrase. */
function clServicesPhrase(s) {
  const parts = [];
  if (s.loi) parts.push(clPlural(s.loiCount, 'LOI'));
  if (s.hotels) parts.push(clPlural(s.rooms, 'hotel room'));
  if (s.taxis) parts.push(clPlural(s.runs, 'taxi run'));
  if (parts.length === 0) return 'no services chosen';
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
}
function clShortDate(iso) { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
/* The vessel the sheet names, when it names one of ours; else the first vessel. */
function clVesselFromRows(rows) {
  const named = rows.map((r) => r.vessel.trim().toLowerCase()).find((v) => v !== '');
  const match = named ? CC_VESSELS.find((v) => v.name.toLowerCase() === named) : undefined;
  return (match || CC_VESSELS[0]).id;
}
/* The port the sheet names, when it is one the letters cover; else the vessel's call; else the first. */
function clPortFromRows(rows, vesselId) {
  const named = rows.map((r) => r.port.trim()).find((p) => CC_PORTS.includes(p));
  if (named) return named;
  const v = CC_VESSELS.find((x) => x.id === vesselId);
  const call = v ? v.port : '';
  return CC_PORTS.includes(call) ? call : CC_PORTS[0];
}
function clHotels() { return DC_DATA.SUPPLIERS.filter((s) => s.cat === 'Hotels'); }
function clDefaultChoices(rows, port, bookable) {
  const hotels = clHotels();
  const hotel = hotels.find((h) => bookable(h)) || hotels[0];
  return {
    loi: clPlanLoi(rows).crew.length > 0,
    hotels: true,
    taxis: true,
    hotelId: hotel ? hotel.id : '',
    hotelNights: 1,
    port: TR_TRANSFER_PORTS.includes(port) ? port : TR_TRANSFER_PORTS[0]
  };
}
/* Focus a card by test id on the next tick — the new submission after Submit, a letter from its "LOIs raised" link. */
function clFocusTestId(testId) {
  setTimeout(() => {
    const el = document.querySelector('[data-testid="' + testId + '"]');
    if (!el) return;
    el.scrollIntoView({ block: 'start' });
    el.focus();
  }, 0);
}

/* ---------- style strings (inline, palette from 02; the CC_* strings come from crew-change.js) ---------- */
const CL_TH = 'padding:8px 10px;text-align:left;font-size:11.5px;font-weight:700;letter-spacing:.04em;color:#33475F;text-transform:uppercase;';
const CL_TD = 'padding:8px 10px;vertical-align:top;font-size:13px;';
const CL_INPUT = 'display:block;margin-top:4px;min-height:40px;width:100%;box-sizing:border-box;border:1.5px solid #CBD6E2;border-radius:8px;padding:8px 10px;font-size:13.5px;font-weight:600;background:#FFFFFF;font-family:inherit;color:#0A2540;';
const CL_LINK = 'background:none;border:none;padding:0;font-size:12.5px;font-weight:600;color:#0E5E8A;text-decoration:underline;cursor:pointer;font-family:inherit;';
/* Stepper pills: the current step in ink, done steps in success, the rest outlined (site: Stepper). */
const CL_STEP_PILL = 'border-radius:999px;border:1.5px solid;padding:4px 12px;font-size:12.5px;font-weight:600;';
const CL_STEP_STATE = {
  current: 'border-color:#0A2540;background:#0A2540;color:#FFFFFF;',
  done: 'border-color:#E7F4EF;background:#E7F4EF;color:#047857;',
  pending: 'border-color:#CBD6E2;background:#FFFFFF;color:#33475F;'
};
const CL_DROP = 'border-radius:10px;border:2px dashed;padding:20px;transition:background .15s,border-color .15s;';
const CL_DROP_IDLE = 'border-color:#CBD6E2;background:#FAFBFD;';
const CL_DROP_OVER = 'border-color:#0E5E8A;background:#E8F1F7;';
const CL_DATA_PRESENT = 'margin:12px 0 0;border-radius:8px;border-left:4px solid #0E5E8A;background:#E8F1F7;color:#0E5E8A;padding:8px 12px;font-size:12.5px;';
const CL_DATA_DELETED = 'margin:12px 0 0;border-radius:8px;border-left:4px solid #047857;background:#E7F4EF;color:#047857;padding:8px 12px;font-size:12.5px;';
const CL_REMOVE_BTN = 'min-height:32px;min-width:32px;cursor:pointer;border-radius:6px;border:1px solid #CBD6E2;background:#FFFFFF;padding:0 8px;font-size:13px;font-weight:700;color:#33475F;font-family:inherit;';

(Component._features = Component._features || []).push({
  state() {
    /* Both persisted collections, shape-checked and run through the retention
       rule in one pass (site: hydrateCrewChange): a list past its thirty days
       is redacted here and every letter raised from it with it, written
       straight back, so the personal data is gone before the screen has drawn
       it. Returning ccRequests below OVERRIDES crew-change.js's own hydration
       — feature state merges in include order, and this module is the one
       that knows the joint rule. Entries the shape guards dropped are written
       out of storage as well: data no control can reach must not be data the
       browser still holds. */
    const now = new Date();
    const raw = this._get(CL_KEY_LISTS, []);
    const kept = Array.isArray(raw) ? raw.filter(clIsSubmission) : [];
    const rawReqs = this._get(CC_KEY_REQUESTS, []);
    const keptReqs = Array.isArray(rawReqs) ? rawReqs.filter(ccIsCrewRequest) : [];
    const sweep = clApplyRetention(kept, keptReqs, now);
    const subs = sweep.lists;
    if (!Array.isArray(raw) || kept.length !== raw.length || subs !== kept) this._set(CL_KEY_LISTS, subs);
    if (!Array.isArray(rawReqs) || keptReqs.length !== rawReqs.length || sweep.requests !== keptReqs) this._set(CC_KEY_REQUESTS, sweep.requests);
    return {
      ccRequests: sweep.requests,
      /* the draft — never persisted (site decision: nothing leaves the browser until Submit) */
      clDraft: null,
      clStep: 'check',
      clBusy: false,
      clError: null,
      clDragOver: false,
      clShowPassports: false,
      clChoices: clDefaultChoices([], '', () => true),
      clRooms: null,
      clVesselId: CC_VESSELS[0].id,
      clPort: CC_PORTS[0],
      clAck: false,
      clNoticeOpen: false,
      clAnnounce: '',
      /* the delete dialog: a list id, 'all', or null while closed */
      clDeleteFor: null,
      /* which submitted cards have their crew list open (site: per-card state) */
      clCrewOpen: {},
      /* submitted lists, newest first */
      clSubs: subs
    };
  },

  vals(st) {
    const self = this;
    const bookable = (h) => self.deriveStatus(h) !== 'blocked';
    const draft = st.clDraft;
    const rows = draft ? draft.rows : [];
    const subs = st.clSubs;
    const withData = subs.filter(clHasPersonalData).length;
    const stepName = draft ? st.clStep : 'upload';
    const currentStep = draft ? CL_STEP_INDEX[st.clStep] : (subs.length > 0 ? 4 : 0);

    /* --- store actions (the crew-list half of store/crewChange.ts) --- */
    const saveSubs = (list) => { self._set(CL_KEY_LISTS, list); self.setState({ clSubs: list }); };
    const saveRequests = (list) => { self._set(CC_KEY_REQUESTS, list); self.setState({ ccRequests: list }); };
    const nextListId = () => {
      const seq = (self._get(CL_KEY_SEQ, 0) || 0) + 1;
      self._set(CL_KEY_SEQ, seq);
      return 'CL-' + String(seq).padStart(4, '0');
    };
    /* An LOI raised from a list: the same record the letters section makes, plus the list it came from. */
    const addLoiRequest = (form, crewListId) => {
      const seq = (self._get(CC_KEY_SEQ, 0) || 0) + 1;
      self._set(CC_KEY_SEQ, seq);
      const request = { id: 'LOI-' + String(seq).padStart(4, '0'), createdAt: ccStampLabel(), kind: 'loi', form: form, stage: 'Submitted by client', crewListId: crewListId };
      saveRequests([request].concat(self.state.ccRequests));
      return request.id;
    };
    const addCrewList = (input, opts) => {
      const id = nextListId();
      const linked = [];
      if (opts.raiseLoi && input.crew) {
        clPlanLoi(input.crew).crew.forEach((row) => { linked.push(addLoiRequest(clLoiFormFromRow(row, opts.vesselId, opts.port), id)); });
      }
      const now = new Date();
      const sub = Object.assign({}, input, {
        id: id, createdAt: ccStampLabel(now), createdAtIso: now.toISOString(), stage: 'Submitted to GAC',
        receivedAt: null, completedAtIso: null, linkedRequestIds: linked, personalDataDeletedAt: null, deletionConfirmedByGac: false
      });
      saveSubs([sub].concat(self.state.clSubs));
      return id;
    };
    /* Moves a list forward; records receipt and completion as it passes them. */
    const advanceCrewList = (id, steps) => {
      const list = self.state.clSubs.map((s) => {
        if (s.id !== id) return s;
        let next = s;
        for (let i = 0; i < Math.max(1, steps || 1); i += 1) {
          const stage = clNextStage(next.stage);
          if (stage === next.stage) break;
          next = Object.assign({}, next, { stage: stage });
          if (stage === 'Received by GAC' && next.receivedAt === null) next = Object.assign({}, next, { receivedAt: ccStampLabel() });
          if (clIsTerminalStage(stage) && next.completedAtIso === null) next = Object.assign({}, next, { completedAtIso: new Date().toISOString() });
        }
        return next;
      });
      saveSubs(list);
    };
    /* Drops the personal data from one list and redacts every letter raised from it; both keys persisted in the same breath. */
    const deleteCrewData = (id) => {
      const when = ccStampLabel();
      const list = self.state.clSubs.map((s) => (s.id === id && clHasPersonalData(s) ? clRedactSubmission(s, when) : s));
      const requests = self.state.ccRequests.map((r) => (r.crewListId === id ? ccRedactRequest(r) : r));
      self._set(CL_KEY_LISTS, list);
      self._set(CC_KEY_REQUESTS, requests);
      self.setState({ clSubs: list, ccRequests: requests });
    };
    /* The same, over every list that still holds personal data. Every letter
       raised from ANY list is redacted, not just the lists still in state —
       an entry the shape guard dropped must not shelter its letters. */
    const deleteAllCrewData = () => {
      const when = ccStampLabel();
      const list = self.state.clSubs.map((s) => (clHasPersonalData(s) ? clRedactSubmission(s, when) : s));
      const requests = self.state.ccRequests.map((r) => (r.crewListId !== undefined ? ccRedactRequest(r) : r));
      self._set(CL_KEY_LISTS, list);
      self._set(CC_KEY_REQUESTS, requests);
      self.setState({ clSubs: list, ccRequests: requests });
    };

    /* --- the draft --- */
    const startDraft = (next) => {
      const vessel = clVesselFromRows(next.rows);
      const callPort = clPortFromRows(next.rows, vessel);
      self.setState({
        clDraft: next, clStep: 'check', clShowPassports: false, clChoices: clDefaultChoices(next.rows, callPort, bookable), clRooms: null,
        clVesselId: vessel, clPort: callPort, clAck: false,
        clAnnounce: 'Read ' + clPlural(next.rows.length, 'crew member', 'crew') + ' from ' + next.fileName
      });
    };
    const importBytes = (buf, fileName) => {
      self.setState({ clBusy: true, clError: null });
      return clParseSpreadsheet(buf, fileName).then((sheets) => {
        const sheet = sheets.find((s) => s.rows.length > 1) || sheets[0];
        if (!sheet) throw new Error('No sheets were found in ' + fileName + '.');
        const next = clImportFromTable(fileName, sheet.name, sheet.rows);
        if (next.rows.length === 0) {
          throw new Error('No crew were found in ' + fileName + ' — the sheet needs a header row with at least one crew member under it.');
        }
        startDraft(next);
      }).catch((e) => {
        self.setState({ clError: e instanceof Error ? e.message : fileName + ' could not be read.' });
      }).then(() => { self.setState({ clBusy: false }); });
    };
    const onFile = (file) => {
      file.arrayBuffer().then((buf) => importBytes(buf, file.name)).catch(() => { self.setState({ clError: file.name + ' could not be read.' }); });
    };
    const onClFile = (e) => {
      const file = e.target.files && e.target.files[0];
      /* Let the same file be chosen twice in a row. */
      e.target.value = '';
      if (file) onFile(file);
    };
    const onClDrop = (e) => {
      e.preventDefault();
      self.setState({ clDragOver: false });
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) onFile(file);
    };
    /* The demo takes the same road as a real file: written as .xlsx, then parsed. */
    const onClDemo = () => {
      const bytes = clWriteXlsx({ name: 'Crew list', rows: [CL_TEMPLATE_HEADERS].concat(CL_DEMO_ROWS) });
      importBytes(clToArrayBuffer(bytes), CL_DEMO_FILE_NAME);
    };
    const onClTemplate = () => { clDownloadBytes(clWriteXlsx({ name: 'Crew list', rows: [CL_TEMPLATE_HEADERS] }), CL_TEMPLATE_FILE_NAME); };
    const discard = () => { self.setState({ clDraft: null, clError: null, clAnnounce: 'Crew list discarded — nothing was sent.' }); };
    const setChoices = (patch) => self.setState({ clChoices: Object.assign({}, self.state.clChoices, patch) });
    const continueToServices = () => {
      if (!self.state.clDraft) return;
      /* No on-signers, no letters — the toggle follows the list. */
      if (clPlanLoi(self.state.clDraft.rows).crew.length === 0) setChoices({ loi: false });
      self.setState({ clStep: 'services' });
    };
    const submit = () => {
      const imp = self.state.clDraft;
      if (!imp || !self.state.clAck) return;
      const choices = self.state.clChoices;
      const summary = clSummarise(imp.rows);
      const loiCount = clPlanLoi(imp.rows).crew.length;
      const roomCount = self.state.clRooms ?? clPlanHotel(imp.rows, choices.hotelNights).rooms;
      const runs = clPlanTaxis(imp.rows, choices.port).runs.length;
      const services = {
        loi: choices.loi, hotels: choices.hotels, taxis: choices.taxis, hotelId: choices.hotelId, hotelNights: choices.hotelNights,
        loiCount: choices.loi ? loiCount : 0, rooms: choices.hotels ? roomCount : 0, runs: choices.taxis ? runs : 0
      };
      const id = addCrewList(
        { vesselId: self.state.clVesselId, port: self.state.clPort, fileName: imp.fileName, crewCount: summary.total, onCount: summary.on, offCount: summary.off, services: services, crew: imp.rows },
        { raiseLoi: choices.loi, vesselId: self.state.clVesselId, port: self.state.clPort }
      );
      self.toastMsg('Crew list ' + id + ' submitted — ' + clPlural(summary.total, 'crew member', 'crew') + ', ' + clServicesPhrase(services) + '. GAC confirms receipt, then arranges what you chose.');
      self.setState({ clDraft: null, clAck: false, clAnnounce: 'Crew list ' + id + ' submitted' });
      /* After Submit the new card is where the eye should go. */
      clFocusTestId('crew-list-' + id);
    };
    const closeDelete = () => self.setState({ clDeleteFor: null });
    const confirmDelete = () => {
      const target = self.state.clDeleteFor;
      if (target === null) return;
      /* Confirming unmounts both the dialog and the Delete button that opened
         it, so the core's focus restore has nowhere to land — send focus to
         the affected card instead, exactly as submit does. */
      const holding = self.state.clSubs.filter(clHasPersonalData);
      const focusId = target === 'all' ? (holding[0] ? holding[0].id : null) : target;
      if (target === 'all') {
        const n = holding.length;
        deleteAllCrewData();
        self.toastMsg('Crew data for ' + clPlural(n, 'list') + ' deleted from this device — GAC asked to delete its ' + (n === 1 ? 'copy' : 'copies') + ' (simulated confirmation).');
      } else {
        deleteCrewData(target);
        self.toastMsg('Crew data for ' + target + ' deleted from this device — GAC asked to delete its copy (simulated confirmation).');
      }
      self.setState({ clDeleteFor: null });
      if (focusId !== null) clFocusTestId('crew-list-' + focusId);
    };

    /* --- stepper --- */
    const clSteps = CL_STEPS.map((label, i) => {
      const state = i < currentStep ? 'done' : (i === currentStep ? 'current' : 'pending');
      return { label: label, state: state, ariaCurrent: state === 'current' ? 'step' : null, mark: state === 'done' ? '✓' : String(i + 1), style: CL_STEP_PILL + CL_STEP_STATE[state] };
    });

    /* --- data notice (always open on the upload step; collapsible afterwards) --- */
    const noticeCollapsible = stepName !== 'upload';
    const noticeExpanded = !noticeCollapsible || st.clNoticeOpen;

    /* --- upload --- */
    const xlsxOk = clCanReadXlsx();

    /* --- check --- */
    const summary = clSummarise(rows);
    const clColumns = draft ? draft.headers.map((header, i) => {
      const name = header || ('Column ' + (i + 1));
      return {
        name: name, aria: 'Column: ' + name, testId: 'crew-map-' + i, value: draft.mapping[i] ?? '',
        on: (e) => { const imp = self.state.clDraft; if (imp) self.setState({ clDraft: clWithMapping(imp, i, e.target.value || null) }); }
      };
    }) : [];
    const clRows = rows.map((r) => {
      const name = ccFormatCrewName(r.familyName, r.forenames) || '—';
      const flight = [r.flightNumber, r.flightDate, r.flightTime, r.flightFrom].filter((p) => p !== '').join(' · ');
      return {
        id: r.id, name: name, rank: r.rank || '—', nationality: r.nationality || '—', dob: r.dateOfBirth || '—',
        passport: r.passportNumber ? (st.clShowPassports ? r.passportNumber : clMaskPassport(r.passportNumber)) : '—',
        expiry: r.passportExpiry || '—',
        movementLabel: r.movement === 'on' ? 'On' : (r.movement === 'off' ? 'Off' : 'Not stated'),
        movementStyle: CC_PILL + (r.movement === 'on' ? CC_PILL_TONE.info : (r.movement === 'off' ? CC_PILL_TONE.neutral : CC_PILL_TONE.warn)),
        flight: flight || '—',
        hasIssues: r.issues.length > 0, issues: r.issues.map((text) => ({ text: text })), issuesAttr: r.issues.length ? String(r.issues.length) : null,
        removeAria: 'Remove ' + name + ' from the list',
        /* Removing a row unmounts the button that was pressed, so the change
           is announced and focus moves to the next row's remove button (or to
           Discard when the table empties — Continue is disabled then). */
        onRemove: () => {
          const imp = self.state.clDraft;
          if (!imp) return;
          const index = imp.rows.findIndex((x) => x.id === r.id);
          const next = clWithoutRow(imp, r.id);
          self.setState({
            clDraft: next,
            clAnnounce: 'Removed ' + (name === '—' ? 'crew member' : name) + ' — ' + clPlural(next.rows.length, 'crew member', 'crew') + ' left on the list'
          });
          setTimeout(() => {
            const buttons = document.querySelectorAll('[data-testid="crew-remove"]');
            if (buttons.length > 0) buttons[Math.min(Math.max(index, 0), buttons.length - 1)].focus();
            else { const el = document.querySelector('[data-testid="crew-list-discard"]'); if (el) el.focus(); }
          }, 0);
        }
      };
    });

    /* --- services --- */
    const choices = st.clChoices;
    const loi = clPlanLoi(rows);
    const onSigners = rows.filter((r) => r.movement === 'on').length;
    const hotel = clPlanHotel(rows, choices.hotelNights);
    const roomCount = st.clRooms ?? hotel.rooms;
    const taxis = clPlanTaxis(rows, choices.port);
    const switchVals = (on) => ({ aria: on ? 'true' : 'false', track: CC_SWITCH + (on ? 'background:#0E5E8A;' : 'background:#CBD6E2;'), knob: CC_KNOB + (on ? 'left:23px;' : 'left:3px;') });
    const loiSwitch = switchVals(choices.loi);
    const hotelsSwitch = switchVals(choices.hotels);
    const taxisSwitch = switchVals(choices.taxis);
    const passportsSwitch = switchVals(st.clShowPassports);

    /* --- submit --- */
    const summaryLines = clServiceSummary(Object.assign({}, choices, { hotelRooms: st.clRooms ?? undefined }), rows);
    const onClVessel = (e) => {
      const id = e.target.value;
      const v = CC_VESSELS.find((x) => x.id === id);
      const patch = { clVesselId: id };
      if (v && CC_PORTS.includes(v.port)) {
        patch.clPort = v.port;
        if (TR_TRANSFER_PORTS.includes(v.port)) patch.clChoices = Object.assign({}, self.state.clChoices, { port: v.port });
      }
      self.setState(patch);
    };
    const onClPort = (e) => {
      const p = e.target.value;
      const patch = { clPort: p };
      if (TR_TRANSFER_PORTS.includes(p)) patch.clChoices = Object.assign({}, self.state.clChoices, { port: p });
      self.setState(patch);
    };

    /* --- submitted lists --- */
    const clSubCards = subs.map((sub) => {
      const vessel = CC_VESSELS.find((v) => v.id === sub.vesselId);
      const action = clSimulateAction(sub.stage);
      const deletion = clDeletionAvailability(sub);
      const present = clHasPersonalData(sub);
      const purgeAt = clPurgeAtIso(sub);
      const current = clStageIndex(sub.stage);
      const terminal = clIsTerminalStage(sub.stage);
      const crewOpen = !!st.clCrewOpen[sub.id];
      const lines = clStoredServiceLines(sub.services);
      return {
        id: sub.id, testId: 'crew-list-' + sub.id, stage: sub.stage, personalData: present ? 'present' : 'deleted',
        meta: sub.id + ' · ' + sub.createdAt, fileName: sub.fileName,
        line: (vessel ? vessel.name : '—') + ' · ' + sub.port,
        stageLabel: (terminal ? '✓ ' : '') + sub.stage,
        stageStyle: CC_PILL + CC_PILL_TONE[terminal ? 'verified' : 'info'] + 'white-space:normal;',
        tracker: CL_STAGES.map((s, i) => {
          const state = i < current ? 'done' : (i === current ? 'current' : 'pending');
          return { label: s, state: state, mark: state === 'done' ? '✓' : (state === 'current' ? '●' : '○'), sr: state === 'done' ? ' (done)' : (state === 'current' ? ' (current)' : ' (pending)'), style: CC_TRACK + CC_TRACK_STATE[state] };
        }),
        counts: clPlural(sub.crewCount, 'crew member', 'crew'),
        countsTail: ' · ' + clPlural(sub.onCount, 'on-signer') + ' · ' + clPlural(sub.offCount, 'off-signer'),
        hasLines: lines.length > 0, lines: lines.map((text) => ({ text: text })),
        hasCrew: present && !!sub.crew,
        crewOpen: crewOpen, crewAria: crewOpen ? 'true' : 'false', crewControls: 'crew-list-crew-' + sub.id,
        crewToggleLabel: crewOpen ? 'Hide crew' : 'Show crew (' + (sub.crew ? sub.crew.length : 0) + ')',
        onToggleCrew: () => { const open = Object.assign({}, self.state.clCrewOpen); open[sub.id] = !open[sub.id]; self.setState({ clCrewOpen: open }); },
        crew: (sub.crew || []).map((r) => ({
          id: r.id, name: ccFormatCrewName(r.familyName, r.forenames) || '—',
          tail: ' · ' + (r.passportNumber ? clMaskPassport(r.passportNumber) : 'no passport') + ' · ' + (r.movement === 'on' ? 'on' : (r.movement === 'off' ? 'off' : 'not stated'))
        })),
        hasLinked: sub.linkedRequestIds.length > 0,
        linked: sub.linkedRequestIds.map((rid, i) => ({ id: rid, sep: i ? ' · ' : '', aria: 'Go to ' + rid + ' in the letters list below', on: () => clFocusTestId('crew-request-' + rid) })),
        dataStyle: present ? CL_DATA_PRESENT : CL_DATA_DELETED,
        dataText: present
          ? 'Personal data held on this device and with GAC for this crew change · deleted automatically ' + (purgeAt ? 'on ' + clShortDate(purgeAt) + ' (thirty days after completion)' : 'thirty days after the crew change completes')
          : '✓ Personal data deleted ' + (sub.personalDataDeletedAt ?? '') + ' · GAC confirmed deletion (simulated)',
        hasAction: !!action, actionLabel: action ? action.label : '',
        onAdvance: () => { if (action) advanceCrewList(sub.id, action.steps); },
        canDelete: deletion.allowed, deleteLabel: deletion.label, hasNote: !!deletion.note, note: deletion.note,
        onDelete: () => self.setState({ clDeleteFor: sub.id })
      };
    });

    /* --- delete dialog --- */
    const deleteFor = st.clDeleteFor;
    const deleteAll = deleteFor === 'all';

    return {
      /* stepper + notice + illustrative */
      clSteps: clSteps,
      clAnnounce: st.clAnnounce,
      clNoticeTitle: CL_DATA_NOTICE.title, clNoticeIntro: CL_DATA_NOTICE.intro, clNoticePoints: CL_DATA_NOTICE.points,
      clNoticeCollapsible: noticeCollapsible, clNoticeExpanded: noticeExpanded, clNoticeExpandedAttr: noticeExpanded ? 'true' : 'false',
      clNoticeOpenAria: st.clNoticeOpen ? 'true' : 'false', clNoticeToggleLabel: st.clNoticeOpen ? 'Hide' : 'Show',
      clToggleNotice: () => self.setState({ clNoticeOpen: !self.state.clNoticeOpen }),
      clIllustrative: CL_ILLUSTRATIVE,
      /* which step shows */
      clIsUpload: stepName === 'upload', clIsCheck: stepName === 'check', clIsServices: stepName === 'services', clIsSubmit: stepName === 'submit',
      /* upload */
      clDropStyle: CL_DROP + (st.clDragOver ? CL_DROP_OVER : CL_DROP_IDLE),
      clDragOverAttr: st.clDragOver ? 'true' : 'false',
      onClDragOver: (e) => { e.preventDefault(); if (!self.state.clDragOver) self.setState({ clDragOver: true }); },
      onClDragLeave: () => { if (self.state.clDragOver) self.setState({ clDragOver: false }); },
      onClDrop: onClDrop,
      clAccept: xlsxOk ? '.xlsx,.csv,.txt' : '.csv,.txt',
      onClFile: onClFile,
      clBusy: st.clBusy,
      clDropHeading: xlsxOk ? 'Drop your crew list here, or choose a file — .xlsx or .csv.' : 'Drop your crew list here, or choose a file — .csv.',
      clDropHint: xlsxOk ? 'Any layout: the platform reads your headers.' : '.xlsx cannot be read in this browser — in your spreadsheet program choose Save As and pick .csv, then upload that. Any layout: the platform reads your headers.',
      onClChoose: () => { const el = document.getElementById('crew-list-file-input'); if (el) el.click(); },
      onClTemplate: onClTemplate,
      onClDemo: onClDemo,
      clHasError: !!st.clError, clError: st.clError || '',
      /* check */
      clSummaryText: draft
        ? draft.fileName + ' · ' + draft.sheetName + ' · ' + clPlural(summary.total, 'crew member', 'crew') + ' · ' + clPlural(summary.on, 'on-signer') + ' · ' + clPlural(summary.off, 'off-signer') +
          (summary.unstated ? ' · ' + summary.unstated + ' not stated' : '') + ' · ' +
          (summary.withIssues === 0 ? 'nothing needs attention' : (summary.withIssues === 1 ? '1 needs attention' : summary.withIssues + ' need attention'))
        : '',
      clShowPassportsAria: passportsSwitch.aria, clShowPassportsTrack: passportsSwitch.track, clShowPassportsKnob: passportsSwitch.knob,
      clToggleShowPassports: () => self.setState({ clShowPassports: !self.state.clShowPassports }),
      clColumns: clColumns,
      clFieldOptions: CL_FIELDS.map((f) => ({ id: f.id, label: f.label })),
      clHasUnmapped: !!(draft && draft.unmapped.length > 0),
      clUnmappedText: draft ? draft.unmapped.map(clCrewFieldLabel).join(', ') : '',
      clRows: clRows,
      clContinueDisabled: rows.length === 0,
      clContinueStyle: rows.length === 0 ? CC_BTN_PRIMARY_OFF : CC_BTN_PRIMARY,
      clContinue: continueToServices,
      clDiscard: discard,
      /* services */
      clLoiTitle: CL_SERVICE_CARDS.loi.title, clLoiBody: CL_SERVICE_CARDS.loi.body,
      clHotelsTitle: CL_SERVICE_CARDS.hotels.title, clHotelsBody: CL_SERVICE_CARDS.hotels.body,
      clTaxisTitle: CL_SERVICE_CARDS.taxis.title, clTaxisBody: CL_SERVICE_CARDS.taxis.body,
      clLoiOn: choices.loi, clLoiOnAttr: choices.loi ? 'true' : 'false', clLoiAria: loiSwitch.aria, clLoiTrack: loiSwitch.track, clLoiKnob: loiSwitch.knob,
      clToggleLoi: () => setChoices({ loi: !self.state.clChoices.loi }),
      clLoiCountText: onSigners === 0 ? 'No on-signers on this list' : clPlural(loi.crew.length, 'visa-national on-signer'),
      clHasLoiCrew: loi.crew.length > 0,
      clLoiCrew: loi.crew.map((r) => ({ id: r.id, name: ccFormatCrewName(r.familyName, r.forenames), tail: r.visaNational === null ? ' · visa status not stated, letter offered' : '' })),
      clOpenImmigration: () => { const el = document.getElementById('crew-chip-immigration'); ccWriteHash('immigration'); self.setState({ routeSection: 'immigration' }); if (el) setTimeout(() => el.focus(), 0); },
      clHotelsOn: choices.hotels, clHotelsOnAttr: choices.hotels ? 'true' : 'false', clHotelsOff: !choices.hotels, clHotelsAria: hotelsSwitch.aria, clHotelsTrack: hotelsSwitch.track, clHotelsKnob: hotelsSwitch.knob,
      clToggleHotels: () => setChoices({ hotels: !self.state.clChoices.hotels }),
      clHotelOptions: clHotels().map((h) => ({ id: h.id, label: h.name + (bookable(h) ? '' : ' — blocked by SVS'), disabled: !bookable(h) })),
      clHotelId: choices.hotelId,
      onClHotelId: (e) => setChoices({ hotelId: e.target.value }),
      clNights: choices.hotelNights,
      onClNights: (e) => setChoices({ hotelNights: Math.min(14, Math.max(1, Math.floor(Number(e.target.value) || 1))) }),
      clRoomsValue: roomCount,
      onClRooms: (e) => { const n = Math.floor(Number(e.target.value)); self.setState({ clRooms: Number.isFinite(n) && n >= 1 ? Math.min(99, n) : null }); },
      clHotelLine: clPlural(roomCount, 'room') + ' × ' + clPlural(hotel.nights, 'night') + ' at ' + clHotelName(choices.hotelId),
      clHotelCaveat: self.HOTEL_CAVEAT,
      clTaxisOn: choices.taxis, clTaxisOnAttr: choices.taxis ? 'true' : 'false', clTaxisOff: !choices.taxis, clTaxisAria: taxisSwitch.aria, clTaxisTrack: taxisSwitch.track, clTaxisKnob: taxisSwitch.knob,
      clToggleTaxis: () => setChoices({ taxis: !self.state.clChoices.taxis }),
      clTaxiPorts: TR_TRANSFER_PORTS.map((p) => ({ value: p, label: p })),
      clTaxiPort: choices.port,
      onClTaxiPort: (e) => setChoices({ port: e.target.value }),
      clTaxiLine: clPlural(taxis.runs.length, 'run') + ' for ' + clPlural(rows.length, 'crew member', 'crew'),
      clRuns: taxis.runs.map((run) => ({
        key: run.key, flight: run.flightNumber || 'No flight given', direction: run.direction === 'arriving' ? 'Arriving' : 'Departing',
        from: run.flightFrom || '—', date: run.flightDate || '—', time: run.flightTime || '—', crew: String(run.crew.length),
        trackedAttr: run.tracked ? 'true' : 'false', timingLabel: run.tracked ? 'tracked' : 'from itinerary',
        timingStyle: CC_PILL + (run.tracked ? CC_PILL_TONE.verified : CC_PILL_TONE.neutral),
        pickup: run.pickupTime || '—'
      })),
      clBackToList: () => self.setState({ clStep: 'check' }),
      clToSubmit: () => self.setState({ clStep: 'submit' }),
      /* submit */
      clSubmitIntro: clPlural(rows.length, 'crew member', 'crew') + ' and the services you chose go to GAC’s agency team for this crew change. This is the only step that sends anything.',
      clVessels: CC_VESSELS.map((v) => ({ id: v.id, label: v.name + ' · ' + v.port })),
      clVesselId: st.clVesselId, onClVessel: onClVessel,
      clPorts: CC_PORTS.map((p) => ({ value: p, label: p })),
      clPort: st.clPort, onClPort: onClPort,
      clHasSummaryLines: summaryLines.length > 0, clSummaryLines: summaryLines.map((text) => ({ text: text })),
      clAck: st.clAck, onClAck: (e) => self.setState({ clAck: !!e.target.checked }),
      clAckText: CL_DATA_NOTICE.acknowledgement,
      clBackToServices: () => self.setState({ clStep: 'services' }),
      clSubmit: submit,
      clSubmitDisabled: !st.clAck,
      clSubmitStyle: st.clAck ? CC_BTN_PRIMARY : CC_BTN_PRIMARY_OFF,
      /* submitted lists */
      clHasSubs: subs.length > 0,
      clSubsHeading: 'Submitted crew lists · ' + subs.length,
      clSubsSummary: withData === 0 ? 'Personal data deleted from every list' : clPlural(withData, 'list') + ' still ' + (withData === 1 ? 'holds' : 'hold') + ' personal data',
      clSubCards: clSubCards,
      clHasDataToDelete: withData > 0,
      clDeleteAll: () => self.setState({ clDeleteFor: 'all' }),
      /* delete dialog (75-crew-delete.html) */
      clDeleteOpen: deleteFor !== null,
      clDeleteScope: deleteAll ? 'all' : 'one',
      clDeleteTitle: deleteAll ? 'Delete all crew data?' : CL_DELETE_CONFIRM.title,
      clDeleteBody: deleteAll ? clPlural(withData, 'list') + ' still ' + (withData === 1 ? 'holds' : 'hold') + ' personal data. ' + CL_DELETE_CONFIRM.bodyAll : CL_DELETE_CONFIRM.body,
      clDeleteConfirmLabel: CL_DELETE_CONFIRM.confirm, clDeleteCancelLabel: CL_DELETE_CONFIRM.cancel,
      clCloseDelete: closeDelete,
      clCloseDeleteOverlay: (e) => { if (e.target === e.currentTarget) closeDelete(); },
      clConfirmDelete: confirmDelete,
      /* Reset demo on the crew change screen clears the crew lists too (site:
         reset() removes both pairs of keys). These two bindings are also returned
         by crew-change.js; feature vals merge in include order, so this module's
         versions win — noted there as well. */
      ccHasRequests: st.ccRequests.length > 0 || subs.length > 0,
      ccReset: () => {
        self._set(CC_KEY_REQUESTS, []); self._set(CC_KEY_SEQ, 0);
        self._set(CL_KEY_LISTS, []); self._set(CL_KEY_SEQ, 0);
        self.setState({ ccRequests: [], clSubs: [], clCrewOpen: {}, clDeleteFor: null });
      }
    };
  },

  /* Escape closes the delete dialog; the core's dialog focus parity hands focus
     back to the button that opened it. */
  escape() {
    if (this.state.clDeleteFor !== null) { this.setState({ clDeleteFor: null }); return true; }
    return false;
  }
});
