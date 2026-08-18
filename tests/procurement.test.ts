import { beforeEach, describe, expect, it } from 'vitest';
import {
  CANNOT_ASSIST_IDS,
  CHANDLER_NAME,
  COMPASS_ADDRESS,
  DEFAULT_REQUEST,
  ILLUSTRATIVE_PRICES_GBP,
} from '../src/data/procurement';
import { VESSELS } from '../src/data/vessels';
import {
  composeEmail,
  FINAL_STAGE,
  ILLUSTRATIVE_MARKUP_PCT,
  invoiceLines,
  invoiceTotals,
  isFinalStage,
  markupAmount,
  markupTotal,
  nextStage,
  routeLines,
  simulateLabel,
  sourceLabel,
  stageLabel,
  stageReached,
  STAGES,
  stageStatus,
  TIMELINE_STAGES,
} from '../src/lib/procurement';
import type { Stage } from '../src/lib/procurement';
import { useProcurement } from '../src/store/procurement';

describe('Procurement via Compass — stage machine', () => {
  it('runs draft → sent → sourcing → replied → chandler-paid → invoiced', () => {
    expect(STAGES).toEqual(['draft', 'sent', 'sourcing', 'replied', 'chandler-paid', 'invoiced']);
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
    expect(TIMELINE_STAGES).toEqual(['sent', 'sourcing', 'replied', 'chandler-paid', 'invoiced']);
  });

  it('labels name the Compass flow', () => {
    expect(stageLabel('sent')).toBe('Sent to Compass');
    expect(stageLabel('sourcing')).toBe('Compass sourcing');
    expect(stageLabel('replied')).toBe('Compass reply: supplied / routed');
    expect(stageLabel('chandler-paid')).toBe('Compass pays the chandler');
    expect(stageLabel('invoiced')).toBe('Invoiced via Compass — under GAC');
  });

  it('reached / status derive from the order', () => {
    expect(stageReached('replied', 'sent')).toBe(true);
    expect(stageReached('replied', 'replied')).toBe(true);
    expect(stageReached('replied', 'invoiced')).toBe(false);
    expect(stageStatus('replied', 'sent')).toBe('done');
    expect(stageStatus('replied', 'replied')).toBe('current');
    expect(stageStatus('replied', 'chandler-paid')).toBe('pending');
  });

  it('a simulate button exists for every stage between sent and the invoice, and nowhere else', () => {
    expect(simulateLabel('draft')).toBeNull();
    expect(simulateLabel('invoiced')).toBeNull();
    for (const s of ['sent', 'sourcing', 'replied', 'chandler-paid'] as const) {
      expect(simulateLabel(s)).toMatch(/^Simulate: /);
    }
  });
});

describe('Procurement via Compass — routing lines', () => {
  it('marks exactly the cannot-assist ids as chandler, everything else Compass', () => {
    const routed = routeLines(DEFAULT_REQUEST.lines, ['bonded-stores', 'galley-gas']);
    const chandler = routed.filter((l) => l.source === 'chandler').map((l) => l.id);
    const compass = routed.filter((l) => l.source === 'compass').map((l) => l.id);
    expect(chandler).toEqual(['bonded-stores', 'galley-gas']);
    expect(compass).toEqual(['engine-room', 'provisions', 'deck-stores']);
    // Order and count preserved.
    expect(routed.map((l) => l.id)).toEqual(DEFAULT_REQUEST.lines.map((l) => l.id));
  });

  it('defaults to the demo cannot-assist ids, which all exist on the default request', () => {
    const ids = DEFAULT_REQUEST.lines.map((l) => l.id);
    for (const id of CANNOT_ASSIST_IDS) expect(ids).toContain(id);
    const routed = routeLines(DEFAULT_REQUEST.lines);
    expect(routed.filter((l) => l.source === 'chandler')).toHaveLength(CANNOT_ASSIST_IDS.length);
  });

  it('a user-added line is supplied by Compass unless told otherwise', () => {
    const routed = routeLines([{ id: 'x1', qty: '1', description: 'Chart folio' }]);
    expect(routed[0]!.source).toBe('compass');
  });

  it('the chandler is named in the reply line, and Compass on its own lines', () => {
    expect(sourceLabel('compass')).toBe('Supplied by Compass');
    expect(sourceLabel('chandler')).toContain('routed to a third-party chandler');
    expect(sourceLabel('chandler')).toContain(CHANDLER_NAME);
  });
});

describe('Procurement via Compass — the one invoice', () => {
  it('mark-up is illustrative, 10%, whole pounds', () => {
    expect(ILLUSTRATIVE_MARKUP_PCT).toBe(10);
    expect(markupTotal(1000, 10)).toBe(1100);
    expect(markupTotal(1000)).toBe(1100);
    expect(markupAmount(4980, 10)).toBe(498);
    expect(markupTotal(333, 10)).toBe(366); // 333 + 33.3 → rounded
    expect(markupTotal(0, 10)).toBe(0);
  });

  it('one invoice line per request line, illustrative prices, no chandler on the paperwork', () => {
    const lines = invoiceLines(DEFAULT_REQUEST);
    expect(lines).toHaveLength(DEFAULT_REQUEST.lines.length);
    for (const l of lines) {
      expect(l.priceGBP).toBe(ILLUSTRATIVE_PRICES_GBP[l.id]);
      expect(Object.keys(l)).not.toContain('source');
      expect(JSON.stringify(l)).not.toContain(CHANDLER_NAME);
    }
  });

  it('totals add up: subtotal + mark-up = total', () => {
    const lines = invoiceLines(DEFAULT_REQUEST);
    const t = invoiceTotals(lines);
    expect(t.subtotal).toBe(1240 + 2150 + 860 + 540 + 190);
    expect(t.markup).toBe(markupAmount(t.subtotal));
    expect(t.total).toBe(t.subtotal + t.markup);
    expect(t.total).toBe(markupTotal(t.subtotal));
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
    for (let i = 0; i < 10; i++) s.advance();
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
});
