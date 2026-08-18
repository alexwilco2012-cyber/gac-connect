import { beforeEach, describe, expect, it } from 'vitest';
import {
  COMPASS_ADDRESS,
  DEFAULT_REQUEST,
  ILLUSTRATIVE_PRICES_GBP,
  PROCUREMENT_RULES,
  SIMULATION_NOTICE,
} from '../src/data/procurement';
import { VESSELS } from '../src/data/vessels';
import {
  composeEmail,
  FINAL_STAGE,
  invoiceLines,
  invoiceTotals,
  isFinalStage,
  LINE_CONFIRMATION,
  nextStage,
  simulateLabel,
  stageLabel,
  stageReached,
  STAGES,
  stageStatus,
  TIMELINE_STAGES,
} from '../src/lib/procurement';
import type { Stage } from '../src/lib/procurement';
import { readStage, readStageTimes, useProcurement } from '../src/store/procurement';

describe('Procurement via Compass — stage machine', () => {
  it('runs draft → sent → sourcing → confirmed → invoiced', () => {
    expect(STAGES).toEqual(['draft', 'sent', 'sourcing', 'confirmed', 'invoiced']);
    let s: Stage = 'draft';
    const walked: Stage[] = [s];
    for (let i = 0; i < STAGES.length - 1; i++) {
      s = nextStage(s);
      walked.push(s);
    }
    expect(walked).toEqual([...STAGES]);
  });

  it('ends at the invoice stage and does not advance past it', () => {
    expect(FINAL_STAGE).toBe('invoiced');
    expect(isFinalStage('invoiced')).toBe(true);
    expect(nextStage('invoiced')).toBe('invoiced');
    expect(nextStage(nextStage('invoiced'))).toBe('invoiced');
  });

  it('the timeline is every stage after the draft, in order', () => {
    expect(TIMELINE_STAGES).toEqual(['sent', 'sourcing', 'confirmed', 'invoiced']);
  });

  it('labels name the Compass flow', () => {
    expect(stageLabel('sent')).toBe('Sent to Compass');
    expect(stageLabel('sourcing')).toBe('Compass sourcing');
    expect(stageLabel('confirmed')).toBe('Compass confirms the list');
    expect(stageLabel('invoiced')).toBe('Invoiced via Compass — under GAC');
  });

  it('reached / status derive from the order', () => {
    expect(stageReached('confirmed', 'sent')).toBe(true);
    expect(stageReached('confirmed', 'confirmed')).toBe(true);
    expect(stageReached('confirmed', 'invoiced')).toBe(false);
    expect(stageStatus('confirmed', 'sent')).toBe('done');
    expect(stageStatus('confirmed', 'confirmed')).toBe('current');
    expect(stageStatus('confirmed', 'invoiced')).toBe('pending');
  });

  it('a simulate button exists for every stage between sent and the invoice, and nowhere else', () => {
    expect(simulateLabel('draft')).toBeNull();
    expect(simulateLabel('invoiced')).toBeNull();
    for (const s of ['sent', 'sourcing', 'confirmed'] as const) {
      expect(simulateLabel(s)).toMatch(/^Simulate: /);
    }
    // Three clicks take a sent request to the invoice.
    expect(TIMELINE_STAGES.filter((s) => simulateLabel(s) !== null)).toHaveLength(3);
  });
});

describe('Procurement via Compass — Compass supplies the whole list', () => {
  it('no client-facing string leaks a third-party supplier', () => {
    // Compass is GAC's own supply operation: the client's view carries one
    // supplier, start to finish (owner's follow-up to the 17 Aug review).
    const copy = [
      JSON.stringify(PROCUREMENT_RULES),
      SIMULATION_NOTICE,
      LINE_CONFIRMATION,
      ...STAGES.map(stageLabel),
      ...STAGES.map((s) => simulateLabel(s) ?? ''),
      composeEmail(DEFAULT_REQUEST).body,
    ].join(' ');
    expect(copy).not.toMatch(/chandler/i);
    expect(copy).not.toMatch(/third[- ]party/i);
    expect(copy).not.toMatch(/cannot assist/i);
  });

  it('every line carries the same Compass confirmation — there is nowhere else for one to go', () => {
    expect(LINE_CONFIRMATION).toBe('Confirmed by Compass');
    expect(LINE_CONFIRMATION).toMatch(/Compass/);
  });

  it('the "how it works" strip is four steps, ending at one invoice under GAC', () => {
    expect(PROCUREMENT_RULES).toHaveLength(4);
    expect(PROCUREMENT_RULES.map((r) => r.step)).toEqual(['1', '2', '3', '4']);
    expect(PROCUREMENT_RULES[3]!.title).toContain('invoiced via Compass, under GAC');
    const copy = PROCUREMENT_RULES.map((r) => `${r.title} ${r.body}`).join(' ');
    expect(copy).not.toMatch(/!/);
    // Nothing is claimed beyond what the owner said: Compass sources, supplies
    // and confirms the list, and the client is invoiced under GAC. No delivery
    // promise rides along with it.
    expect(copy).not.toMatch(/deliver/i);
  });
});

describe('Procurement via Compass — the one invoice', () => {
  it('nothing about a mark-up reaches the client: no percentage, no line, no word', () => {
    // 17 Aug review follow-up: pricing is Compass's, through its network —
    // the client sees line prices and one total, nothing else.
    const t = invoiceTotals(invoiceLines(DEFAULT_REQUEST));
    expect(Object.keys(t)).toEqual(['total']);
    const copy = JSON.stringify(PROCUREMENT_RULES) + SIMULATION_NOTICE;
    expect(copy.toLowerCase()).not.toMatch(/mark-?up|margin/);
  });

  it('one invoice line per request line, illustrative prices, no source column', () => {
    const lines = invoiceLines(DEFAULT_REQUEST);
    expect(lines).toHaveLength(DEFAULT_REQUEST.lines.length);
    for (const l of lines) {
      expect(l.priceGBP).toBe(ILLUSTRATIVE_PRICES_GBP[l.id]);
      expect(Object.keys(l)).not.toContain('source');
      expect(JSON.stringify(l)).not.toMatch(/chandler/i);
    }
  });

  it('the total is the sum of the line prices — nothing added on top', () => {
    const lines = invoiceLines(DEFAULT_REQUEST);
    const t = invoiceTotals(lines);
    expect(t.total).toBe(1240 + 2150 + 860 + 540 + 190);
    expect(invoiceTotals([]).total).toBe(0);
  });

  it('a user-added line takes the fallback illustrative price', () => {
    const lines = invoiceLines({
      ...DEFAULT_REQUEST,
      lines: [{ id: 'new-1', qty: '1', description: 'Something new' }],
    });
    expect(lines[0]!.priceGBP).toBeGreaterThan(0);
  });
});

describe('Procurement via Compass — the email', () => {
  it('goes to the illustrative Compass address', () => {
    expect(COMPASS_ADDRESS).toMatch(/@compass\.example$/);
    expect(composeEmail(DEFAULT_REQUEST).to).toBe(COMPASS_ADDRESS);
  });

  it('subject carries the PR reference, the vessel and the needed-by time', () => {
    const vessel = VESSELS.find((v) => v.id === DEFAULT_REQUEST.vesselId)!;
    const { subject } = composeEmail(DEFAULT_REQUEST);
    expect(subject).toBe(
      'Procurement request PR-1042 — MV Caledonian Star, Aberdeen — needed Fri 08:00',
    );
    expect(subject).toContain(DEFAULT_REQUEST.ref);
    expect(subject).toContain(vessel.name);
    expect(subject).toContain(DEFAULT_REQUEST.neededBy);
  });

  it('body lists every line, in order, with its quantity', () => {
    const { body } = composeEmail(DEFAULT_REQUEST);
    let lastIndex = -1;
    DEFAULT_REQUEST.lines.forEach((l, i) => {
      const idx = body.indexOf(`${i + 1}. ${l.description}`);
      expect(idx, l.description).toBeGreaterThan(lastIndex);
      expect(body).toContain(l.qty);
      lastIndex = idx;
    });
    expect(body).toContain(DEFAULT_REQUEST.deliveryPoint);
    expect(body).toContain(DEFAULT_REQUEST.neededBy);
    expect(body).not.toMatch(/!/);
  });

  it('subject and body follow an edited request', () => {
    const edited = {
      ...DEFAULT_REQUEST,
      vesselId: 'boreal',
      neededBy: 'Sat 06:00',
      lines: [{ id: 'a', qty: '3', description: 'Fenders' }],
    };
    const mail = composeEmail(edited);
    expect(mail.subject).toContain('MV Boreal, Peterhead');
    expect(mail.subject).toContain('Sat 06:00');
    expect(mail.body).toContain('1. Fenders (3)');
    expect(mail.body).not.toContain('Bonded stores');
  });
});

describe('Procurement via Compass — the store', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useProcurement.getState().reset();
  });

  it('starts as the default draft with five lines', () => {
    const s = useProcurement.getState();
    expect(s.stage).toBe('draft');
    expect(s.request.lines).toHaveLength(5);
    expect(s.request.ref).toBe('PR-1042');
  });

  it('lines can be removed, added, and edited while drafting', () => {
    const s = useProcurement.getState();
    s.removeLine('galley-gas');
    expect(useProcurement.getState().request.lines.map((l) => l.id)).not.toContain('galley-gas');
    s.addLine('Chart corrections', '1 folio');
    const added = useProcurement.getState().request.lines.at(-1)!;
    expect(added.description).toBe('Chart corrections');
    expect(added.qty).toBe('1 folio');
    s.updateLine(added.id, { qty: '2 folios' });
    expect(useProcurement.getState().request.lines.at(-1)!.qty).toBe('2 folios');
    s.addLine('   ', '1'); // blank descriptions are ignored
    expect(useProcurement.getState().request.lines).toHaveLength(5);
  });

  it('send stamps the time and advance walks to the invoice, no further', () => {
    const s = useProcurement.getState();
    s.advance(); // nothing to advance while drafting
    expect(useProcurement.getState().stage).toBe('draft');
    s.send();
    expect(useProcurement.getState().stage).toBe('sent');
    expect(typeof useProcurement.getState().stageTimes.sent).toBe('string');
    // Three simulated steps: sourcing, confirmed, invoiced.
    s.advance();
    expect(useProcurement.getState().stage).toBe('sourcing');
    s.advance();
    expect(useProcurement.getState().stage).toBe('confirmed');
    s.advance();
    expect(useProcurement.getState().stage).toBe('invoiced');
    for (let i = 0; i < 5; i++) s.advance();
    expect(useProcurement.getState().stage).toBe('invoiced');
    expect(useProcurement.getState().stageTimes.invoiced).toBeDefined();
  });

  it('persists through the adapter under procurement.* keys and resets clean', () => {
    const s = useProcurement.getState();
    s.removeLine('engine-room');
    s.send();
    expect(window.localStorage.getItem('gac-connect:procurement.stage')).toBe('"sent"');
    expect(window.localStorage.getItem('gac-connect:procurement.request')).toContain('PR-1042');
    expect(window.localStorage.getItem('gac-connect:procurement.stageTimes')).toContain('sent');
    s.reset();
    expect(window.localStorage.getItem('gac-connect:procurement.stage')).toBeNull();
    expect(useProcurement.getState().stage).toBe('draft');
    expect(useProcurement.getState().request.lines).toHaveLength(5);
  });

  it('cannot send an empty list', () => {
    const s = useProcurement.getState();
    for (const l of [...s.request.lines]) s.removeLine(l.id);
    expect(useProcurement.getState().request.lines).toHaveLength(0);
    s.send();
    expect(useProcurement.getState().stage).toBe('draft');
  });

  it('hydrates a stage stored by an earlier visit, and starts over when it no longer exists', () => {
    // 'replied' and 'chandler-paid' were stages of the older flow; a visitor
    // who left the demo part-way through one must land on a usable screen.
    for (const stored of ['replied', 'chandler-paid', 'nonsense', '', '42']) {
      window.localStorage.setItem('gac-connect:procurement.stage', JSON.stringify(stored));
      expect(readStage(), stored).toBe('draft');
    }
    window.localStorage.setItem('gac-connect:procurement.stage', '"sourcing"');
    expect(readStage()).toBe('sourcing');
    window.localStorage.removeItem('gac-connect:procurement.stage');
    expect(readStage()).toBe('draft');
  });

  it('drops stage times the current stage has not reached, and unknown stage names', () => {
    window.localStorage.setItem(
      'gac-connect:procurement.stageTimes',
      JSON.stringify({
        sent: '2026-08-18T09:41:00.000Z',
        replied: '2026-08-18T09:44:00.000Z',
        'chandler-paid': '2026-08-18T09:45:00.000Z',
        invoiced: '2026-08-18T09:46:00.000Z',
        sourcing: 12,
      }),
    );
    const times = readStageTimes('sourcing');
    expect(Object.keys(times)).toEqual(['sent']);
    expect(times.sent).toBe('2026-08-18T09:41:00.000Z');
    // A draft — the fallback for a stage that no longer exists — shows no times.
    expect(readStageTimes('draft')).toEqual({});
    window.localStorage.setItem('gac-connect:procurement.stageTimes', '"not an object"');
    expect(readStageTimes('invoiced')).toEqual({});
  });
});
