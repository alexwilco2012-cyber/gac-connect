import { beforeEach, describe, expect, it } from 'vitest';
import { ILLUSTRATIVE_PRICES_GBP } from '../src/data/procurement';
import { CALL_HISTORY, PLANNED_CALLS, STORES_ITEMS } from '../src/data/procurementHistory';
import type { PastCall } from '../src/data/procurementHistory';
import { VESSELS } from '../src/data/vessels';
import { composeEmail, invoiceLines, invoiceTotals } from '../src/lib/procurement';
import {
  callsConsideredFor,
  canSendSuggestion,
  editsFor,
  formatQty,
  meetsThreshold,
  medianQty,
  noPlannedCall,
  plannedCallFor,
  recentCalls,
  SUGGEST_WINDOW,
  SUGGESTION_COPY,
  suggestedRequestLines,
  suggestionEyebrow,
  suggestionFor,
  suggestionReason,
  suggestionRule,
  suggestionSendHint,
  suggestionTitle,
  suggestStores,
} from '../src/lib/procurementSuggest';
import { readSuggestion, useProcurement } from '../src/store/procurement';

const call = (date: string, lines: [string, number][]): PastCall => ({
  date,
  port: 'Aberdeen',
  lines: lines.map(([itemId, qty]) => ({ itemId, qty })),
});

describe('Suggested list — the rules', () => {
  it('median quantity: middle value, mean of the middle two, rounded up to a whole unit', () => {
    expect(medianQty([])).toBe(0);
    expect(medianQty([3])).toBe(3);
    expect(medianQty([5, 4, 6])).toBe(5);
    expect(medianQty([2, 4, 4, 6])).toBe(4);
    expect(medianQty([1, 2])).toBe(2); // 1.5 rounds up
    expect(medianQty([1, 1, 1, 2])).toBe(1);
  });

  it('threshold: ordered on at least half of the calls considered', () => {
    expect(meetsThreshold(3, 6)).toBe(true);
    expect(meetsThreshold(2, 6)).toBe(false);
    expect(meetsThreshold(2, 4)).toBe(true);
    expect(meetsThreshold(1, 3)).toBe(false);
    expect(meetsThreshold(2, 3)).toBe(true);
    expect(meetsThreshold(0, 0)).toBe(false);
  });

  it('looks at the most recent calls only, newest first, however the history is ordered', () => {
    const history = [
      call('2026-01-01', [['shackles', 9]]),
      call('2026-03-01', [['shackles', 1]]),
      call('2026-02-01', [['shackles', 1]]),
    ];
    expect(recentCalls(history, 2).map((c) => c.date)).toEqual(['2026-03-01', '2026-02-01']);
    // The old call's 9 falls outside a window of two.
    expect(suggestStores(history, STORES_ITEMS, 2)[0]!.qty).toBe(1);
    expect(suggestStores(history, STORES_ITEMS, 3)[0]!.timesOrdered).toBe(3);
  });

  it('drops lines below the threshold and orders the rest by how often they were ordered', () => {
    const history = [
      call('2026-04-01', [
        ['provisions', 5],
        ['shackles', 8],
      ]),
      call('2026-03-01', [
        ['provisions', 5],
        ['engine-room', 1],
      ]),
      call('2026-02-01', [['provisions', 4]]),
      call('2026-01-01', [
        ['provisions', 6],
        ['engine-room', 1],
        ['deck-paint', 2],
      ]),
    ];
    const out = suggestStores(history);
    expect(out.map((l) => l.itemId)).toEqual(['provisions', 'engine-room']);
    expect(out[0]).toMatchObject({ qty: 5, timesOrdered: 4, callsConsidered: 4 });
    expect(out[0]!.reason).toBe('Ordered on 4 of the last 4 calls');
    expect(suggestStores([])).toEqual([]);
  });

  it('formats quantities with the unit, singular and plural', () => {
    expect(formatQty(1, { one: 'lot', other: 'lots' })).toBe('1 lot');
    expect(formatQty(5, { one: 'day', other: 'days' })).toBe('5 days');
    expect(suggestionReason(5, 6)).toBe('Ordered on 5 of the last 6 calls');
  });
});

describe('Suggested list — the seeded vessels', () => {
  it('MV Choice: six calls considered, six lines suggested with their usual quantities', () => {
    expect(callsConsideredFor('choice')).toBe(SUGGEST_WINDOW);
    const out = suggestionFor('choice');
    expect(out.map((l) => [l.itemId, l.qty, l.timesOrdered])).toEqual([
      ['engine-room', 1, 6],
      ['provisions', 5, 6],
      ['galley-gas', 2, 4],
      ['mooring-tails', 4, 4],
      ['shackles', 8, 3],
      ['bonded-stores', 1, 3],
    ]);
    // Chart corrections (2 of 6) and deck paint (1 of 6) fall below half.
    expect(out.map((l) => l.itemId)).not.toContain('chart-corrections');
    expect(out.map((l) => l.itemId)).not.toContain('deck-paint');
  });

  it('MV Boreal: four calls, three lines; MV Granite Coast has no call planned', () => {
    expect(suggestionFor('boreal').map((l) => [l.itemId, l.qty])).toEqual([
      ['engine-room', 1],
      ['provisions', 7],
      ['galley-gas', 1],
    ]);
    expect(plannedCallFor('granite-coast')).toBeNull();
    expect(suggestionFor('granite-coast')).toEqual([]);
  });

  it('every planned call is a seeded vessel with history, and every history line is in the catalogue', () => {
    const ids = new Set(STORES_ITEMS.map((i) => i.id));
    for (const c of PLANNED_CALLS) {
      expect(VESSELS.some((v) => v.id === c.vesselId)).toBe(true);
      expect(CALL_HISTORY[c.vesselId]?.length ?? 0).toBeGreaterThan(0);
    }
    for (const calls of Object.values(CALL_HISTORY)) {
      for (const c of calls)
        for (const l of c.lines) expect(ids.has(l.itemId), l.itemId).toBe(true);
    }
    // MV Choice's planned call matches her schedule: Aberdeen, Fri 08:00, Regent Quay.
    const choice = VESSELS.find((v) => v.id === 'choice')!;
    const planned = plannedCallFor('choice')!;
    expect(choice.scheduleLine).toContain(planned.eta);
    expect(planned.deliveryPoint).toContain('Regent Quay');
  });

  it('every line that can be suggested has a demo price', () => {
    for (const vesselId of Object.keys(CALL_HISTORY)) {
      for (const l of suggestionFor(vesselId)) {
        expect(ILLUSTRATIVE_PRICES_GBP[l.itemId], l.itemId).toBeGreaterThan(0);
      }
    }
  });
});

describe('Suggested list — edits and the lines it sends', () => {
  it('unticked lines are left off; changed quantities replace the suggestion', () => {
    const s = suggestionFor('choice');
    const e = { vesselId: 'choice', off: ['shackles'], qty: { provisions: 6 } };
    const lines = suggestedRequestLines(s, e);
    expect(lines.map((l) => l.id)).not.toContain('shackles');
    expect(lines.find((l) => l.id === 'provisions')!.qty).toBe('6 days');
    expect(lines.find((l) => l.id === 'galley-gas')!.qty).toBe('2 cylinders · 47 kg');
  });

  it('cannot send with nothing ticked or a ticked quantity below 1', () => {
    const s = suggestionFor('choice');
    expect(canSendSuggestion(s, editsFor(null, 'choice'))).toBe(true);
    expect(canSendSuggestion(s, { vesselId: 'choice', off: s.map((l) => l.itemId), qty: {} })).toBe(
      false,
    );
    expect(canSendSuggestion(s, { vesselId: 'choice', off: [], qty: { provisions: 0 } })).toBe(
      false,
    );
    // A zero on an unticked line does not block the rest.
    expect(
      canSendSuggestion(s, { vesselId: 'choice', off: ['provisions'], qty: { provisions: 0 } }),
    ).toBe(true);
  });

  it('edits made for one vessel do not carry to another', () => {
    const e = { vesselId: 'choice', off: ['shackles'], qty: {} };
    expect(editsFor(e, 'choice')).toBe(e);
    expect(editsFor(e, 'boreal')).toEqual({ vesselId: 'boreal', off: [], qty: {} });
  });
});

describe('Suggested list — the store sends it through the same pipeline', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useProcurement.getState().reset();
  });

  it('send puts the ticked lines on the request and sends it as PR-1042', () => {
    const s = useProcurement.getState();
    s.toggleSuggested('choice', 'bonded-stores');
    s.setSuggestedQty('choice', 'provisions', 6);
    s.sendSuggested('choice');
    const st = useProcurement.getState();
    expect(st.stage).toBe('sent');
    expect(st.request.ref).toBe('PR-1042');
    expect(st.request.deliveryPoint).toBe('Regent Quay, Aberdeen');
    expect(st.request.neededBy).toBe('Fri 08:00');
    expect(st.request.lines.map((l) => l.id)).toEqual([
      'engine-room',
      'provisions',
      'galley-gas',
      'mooring-tails',
      'shackles',
    ]);
    expect(st.request.lines[1]!.qty).toBe('6 days');
    // Same email, same stages, same invoice as a hand-written list.
    const mail = composeEmail(st.request);
    expect(mail.subject).toBe(
      'Procurement request PR-1042 — MV Choice, Aberdeen — needed Fri 08:00',
    );
    expect(mail.body).toContain('2. Fresh provisions (6 days)');
    s.advance();
    s.advance();
    s.advance();
    expect(useProcurement.getState().stage).toBe('invoiced');
    expect(invoiceTotals(invoiceLines(useProcurement.getState().request)).total).toBe(
      1240 + 2150 + 190 + 520 + 340,
    );
  });

  it('a different vessel takes her own planned call and delivery point', () => {
    useProcurement.getState().sendSuggested('boreal');
    const st = useProcurement.getState();
    expect(st.request.vesselId).toBe('boreal');
    expect(st.request.deliveryPoint).toBe('Smith Quay, Peterhead');
    expect(st.request.lines.map((l) => l.id)).toEqual(['engine-room', 'provisions', 'galley-gas']);
  });

  it('does nothing with nothing ticked, with no planned call, or once the request has gone', () => {
    const s = useProcurement.getState();
    s.sendSuggested('granite-coast');
    expect(useProcurement.getState().stage).toBe('draft');
    for (const l of suggestionFor('boreal')) s.toggleSuggested('boreal', l.itemId);
    s.sendSuggested('boreal');
    expect(useProcurement.getState().stage).toBe('draft');
    s.send();
    const before = JSON.stringify(useProcurement.getState().request);
    s.toggleSuggested('choice', 'engine-room');
    s.sendSuggested('choice');
    expect(JSON.stringify(useProcurement.getState().request)).toBe(before);
  });

  it('edits persist under procurement.suggestion and Reset demo clears them', () => {
    const s = useProcurement.getState();
    s.toggleSuggested('choice', 'shackles');
    expect(window.localStorage.getItem('gac-connect:procurement.suggestion')).toContain('shackles');
    expect(readSuggestion()).toEqual({ vesselId: 'choice', off: ['shackles'], qty: {} });
    s.reset();
    expect(window.localStorage.getItem('gac-connect:procurement.suggestion')).toBeNull();
    expect(useProcurement.getState().suggestion).toBeNull();
  });

  it('a corrupt stored suggestion is ignored', () => {
    for (const bad of ['"x"', '[]', '{"vesselId":1}', '{"vesselId":"choice","off":[1],"qty":{}}']) {
      window.localStorage.setItem('gac-connect:procurement.suggestion', bad);
      expect(readSuggestion(), bad).toBeNull();
    }
  });
});

describe('Suggested list — copy', () => {
  it('names no other supplier, no mark-up, and carries no exclamation marks', () => {
    const planned = plannedCallFor('choice')!;
    const copy = [
      JSON.stringify(SUGGESTION_COPY),
      suggestionEyebrow(6),
      suggestionTitle('MV Choice', planned),
      suggestionRule(6),
      suggestionSendHint('PR-1042'),
      noPlannedCall('MV Granite Coast'),
      ...Object.keys(CALL_HISTORY).flatMap((v) =>
        suggestionFor(v).map((l) => `${l.description} ${l.reason}`),
      ),
      ...STORES_ITEMS.map((i) => `${i.description} ${i.unit.one} ${i.unit.other}`),
    ].join(' ');
    expect(copy).not.toMatch(/chandler/i);
    expect(copy).not.toMatch(/third[- ]party/i);
    expect(copy).not.toMatch(/cannot assist/i);
    expect(copy).not.toMatch(/mark-?up|margin/i);
    expect(copy).not.toMatch(/!/);
    expect(copy).toContain('Compass');
  });

  it('the on-screen wording', () => {
    expect(suggestionEyebrow(6)).toBe('Suggested list · from the last 6 calls');
    expect(suggestionTitle('MV Choice', plannedCallFor('choice')!)).toBe(
      'Next call · MV Choice · Aberdeen · ETA Fri 08:00',
    );
    expect(SUGGESTION_COPY.sendLabel).toBe('Send suggested list to Compass');
  });
});
