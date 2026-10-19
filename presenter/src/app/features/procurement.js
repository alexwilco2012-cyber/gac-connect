/* Procurement — presenter mirror of the site's Procurement (via Compass) screen
   (17 Aug review). Feature module: registers state / bindings / Escape handling
   with the core Component via Component._features (see component.js
   "feature-module extension points"). Ports src/lib/procurement.ts (stages,
   email, invoice maths), src/data/procurement.ts (default request,
   copy tables, demo prices) and src/store/procurement.ts (what is persisted,
   send / advance / reset semantics) so the demo behaves exactly like the site.
   Storage keys are prefixed 'pres.' so they never collide with the site's own
   stores on the same origin. Everything numeric here is illustrative. */

/* ── stage machine (lib/procurement.ts) ── */
const PR_STAGES = ['draft', 'sent', 'sourcing', 'confirmed', 'invoiced'];
const PR_FINAL_STAGE = 'invoiced';
const PR_TIMELINE_STAGES = PR_STAGES.filter((s) => s !== 'draft');
const PR_STAGE_LABELS = {
  draft: 'Draft — not yet sent',
  sent: 'Sent to Compass',
  sourcing: 'Compass sourcing',
  confirmed: 'Compass confirms the list',
  invoiced: 'Invoiced via Compass — under GAC'
};
/* Label of the simulate button that advances FROM this stage. */
const PR_SIMULATE_LABELS = {
  sent: 'Simulate: Compass starts sourcing',
  sourcing: 'Simulate: Compass confirms supply',
  confirmed: 'Simulate: invoice raised via Compass'
};
/* Every line on the list is supplied by Compass — there is no second source to
   distinguish, so one shared string covers the whole list (owner's follow-up to
   the 17 Aug review). The card header pill and the per-line pills both read it,
   so the two can never drift apart (lib/procurement.ts LINE_CONFIRMATION). */
const PR_LINE_CONFIRMATION = 'Confirmed by Compass';
/* Header pill for the request card, per stage (screens/app/Procurement.tsx). */
const PR_STAGE_PILL = {
  draft: { tone: 'neutral', label: 'Draft · ready to send' },
  sent: { tone: 'info', label: 'With Compass' },
  sourcing: { tone: 'info', label: 'With Compass · sourcing' },
  confirmed: { tone: 'info', label: PR_LINE_CONFIRMATION },
  invoiced: { tone: 'verified', label: '✓ Invoiced via Compass' }
};

/* ── data (data/procurement.ts + data/vessels.ts) — all fictional ── */
const PR_VESSELS = [
  { id: 'choice', name: 'MV Choice', operatorLine: 'Browne Energy / Grizzell Marine (60/40)', port: 'Aberdeen' },
  { id: 'boreal', name: 'MV Boreal', operatorLine: 'Stronach Subsea', port: 'Peterhead' },
  { id: 'granite-coast', name: 'MV Granite Coast', operatorLine: 'Wilkinson Drilling', port: 'Aberdeen' }
];
/* The draft the dashboard calls "1 procurement list ready to send". */
const PR_DEFAULT_REQUEST = {
  ref: 'PR-1042',
  vesselId: 'choice',
  deliveryPoint: 'Regent Quay, Aberdeen',
  neededBy: 'Fri 08:00',
  lines: [
    { id: 'engine-room', qty: '1 lot', description: 'Engine room consumables — lube oil, filters' },
    { id: 'provisions', qty: '12 crew · 5 days', description: 'Fresh provisions' },
    { id: 'deck-stores', qty: '4 tails · 8 shackles', description: 'Deck stores — mooring tails, shackles' },
    { id: 'bonded-stores', qty: '1 lot', description: 'Bonded stores' },
    { id: 'galley-gas', qty: '2 × 47 kg', description: 'Galley gas' }
  ]
};
/* Illustrative address — no mail is sent from this proof of concept. */
const PR_COMPASS_ADDRESS = 'procurement@compass.example';
/* The platform user who raises the request. */
const PR_SENDER = { name: 'A. Wilkinson', org: 'Aberdeen Agency' };
/* Illustrative demo prices per line id; added lines take the fallback. Nothing here is a real Compass price. */
const PR_PRICES_GBP = { 'engine-room': 1240, provisions: 2150, 'deck-stores': 860, 'bonded-stores': 540, 'galley-gas': 190, 'mooring-tails': 520, shackles: 340 };
const PR_PRICE_FALLBACK_GBP = 250;
/* The client's paperwork carries Compass's prices only (17 Aug review, owner's follow-up):
   Compass prices every line through its own network and the client sees those
   prices and one total — nothing about Compass's cost base or margin is surfaced. */
const PR_RULES = [
  { step: '1', title: 'The list goes straight to Compass by email', body: 'You build the list here; the platform composes the email and sends it to Compass, GAC’s own procurement branch. No separate purchase orders, no phoning round.' },
  { step: '2', title: 'Compass sources and supplies the whole list', body: 'Compass works the list line by line, from its own stock and its own supply network.' },
  { step: '3', title: 'Compass confirms the list back to you', body: 'Every line comes back confirmed by Compass — one point of contact, nobody else to chase.' },
  { step: '4', title: 'You are invoiced via Compass, under GAC', body: 'One invoice, from GAC, covering every line. One relationship, and GAC accountable for the whole basket.' }
];
const PR_SIMULATION_NOTICE = 'Illustrative — the Compass side is simulated in this proof of concept. No email is sent and every price is a demo figure.';

/* ── the suggested list (data/procurementHistory.ts + lib/procurementSuggest.ts) ──
   Drafted from a vessel's previous calls once her next call is planned, and
   sent to the client before she arrives. Rules: the last PR_SUGGEST_WINDOW
   calls (fewer if that is all there are); a line is suggested when it was
   ordered on at least half of them; the quantity is the median of the calls it
   was ordered on, rounded up to a whole unit. Every vessel, date and quantity
   is fictional. */
const PR_SUGGEST_WINDOW = 6;
const PR_STORES_ITEMS = [
  { id: 'engine-room', description: 'Engine room consumables — lube oil, filters', unit: { one: 'lot', other: 'lots' } },
  { id: 'provisions', description: 'Fresh provisions', unit: { one: 'day', other: 'days' } },
  { id: 'galley-gas', description: 'Galley gas', unit: { one: 'cylinder · 47 kg', other: 'cylinders · 47 kg' } },
  { id: 'mooring-tails', description: 'Mooring tails', unit: { one: 'tail', other: 'tails' } },
  { id: 'shackles', description: 'Shackles', unit: { one: 'shackle', other: 'shackles' } },
  { id: 'bonded-stores', description: 'Bonded stores', unit: { one: 'lot', other: 'lots' } },
  { id: 'chart-corrections', description: 'Chart corrections', unit: { one: 'folio', other: 'folios' } },
  { id: 'deck-paint', description: 'Deck paint — touch-up', unit: { one: 'tin', other: 'tins' } }
];
const PR_PLANNED_CALLS = [
  { vesselId: 'choice', port: 'Aberdeen', eta: 'Fri 08:00', deliveryPoint: 'Regent Quay, Aberdeen', neededBy: 'Fri 08:00' },
  { vesselId: 'boreal', port: 'Peterhead', eta: 'Fri 14:30', deliveryPoint: 'Smith Quay, Peterhead', neededBy: 'Fri 14:30' }
];
/* Previous calls per vessel, newest first: [date, [[itemId, qty], …]]. MV Granite Coast has no call planned. */
const PR_CALL_HISTORY = {
  choice: [
    ['2026-10-02', [['engine-room', 1], ['provisions', 5], ['galley-gas', 2], ['mooring-tails', 4], ['shackles', 8], ['chart-corrections', 1]]],
    ['2026-09-11', [['engine-room', 1], ['provisions', 5], ['mooring-tails', 4], ['bonded-stores', 1]]],
    ['2026-08-21', [['engine-room', 1], ['provisions', 4], ['galley-gas', 3], ['shackles', 6], ['deck-paint', 2]]],
    ['2026-07-31', [['engine-room', 1], ['provisions', 5], ['galley-gas', 2], ['mooring-tails', 2], ['bonded-stores', 1]]],
    ['2026-07-10', [['engine-room', 2], ['provisions', 6], ['galley-gas', 2], ['shackles', 8], ['chart-corrections', 1]]],
    ['2026-06-19', [['engine-room', 1], ['provisions', 5], ['mooring-tails', 6], ['bonded-stores', 1]]]
  ],
  boreal: [
    ['2026-09-26', [['engine-room', 1], ['provisions', 7], ['galley-gas', 1]]],
    ['2026-08-29', [['engine-room', 1], ['provisions', 7], ['chart-corrections', 1]]],
    ['2026-08-01', [['engine-room', 1], ['provisions', 6], ['galley-gas', 1], ['mooring-tails', 2]]],
    ['2026-07-04', [['engine-room', 2], ['provisions', 7]]]
  ]
};
const PR_SUGGESTION_COPY = {
  pill: 'Drafted before the call',
  intro: 'Drafted from what she ordered on her previous calls, ready before she arrives. Untick anything she does not need this time, change a quantity, then send the list to Compass.',
  sendLabel: 'Send suggested list to Compass',
  noneTicked: 'Tick at least one line to send',
  badQty: 'Every ticked line needs a quantity of 1 or more'
};

/* ── persistence keys (store/procurement.ts, presenter-prefixed) ── */
const PR_KEY_REQUEST = 'pres.procurement.request';
const PR_KEY_STAGE = 'pres.procurement.stage';
const PR_KEY_TIMES = 'pres.procurement.stageTimes';
const PR_KEY_SUGGESTION = 'pres.procurement.suggestion';

/* ── styles (inline, mirroring the marketplace partial's strings) ── */
const PR_PILL_BASE = 'display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:3px 10px;font-size:11.5px;font-weight:700;letter-spacing:.02em;white-space:nowrap;';
const PR_PILL_TONES = {
  neutral: 'background:#FAFBFD;color:#33475F;border:1px solid #CBD6E2;',
  info: 'background:#E8F1F7;color:#0E5E8A;',
  verified: 'background:#E7F4EF;color:#047857;'
};
const PR_BTN_PRIMARY = 'display:inline-flex;align-items:center;justify-content:center;min-height:44px;background:#0E5E8A;color:#FFFFFF;border:none;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13.5px;cursor:pointer;font-family:inherit;white-space:nowrap;';
const PR_BTN_GHOST = 'display:inline-flex;align-items:center;justify-content:center;min-height:40px;background:#FFFFFF;color:#0E5E8A;border:1.5px solid #CBD6E2;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13.5px;cursor:pointer;font-family:inherit;white-space:nowrap;';
const PR_BTN_DISABLED = 'opacity:.5;cursor:not-allowed;';
const PR_MARKER_BASE = 'position:relative;z-index:1;margin-top:2px;display:grid;place-items:center;width:23px;height:23px;flex-shrink:0;border-radius:50%;font-size:12px;font-weight:700;';
const PR_MARKER = {
  done: 'background:#047857;color:#FFFFFF;',
  current: 'background:#0E5E8A;color:#FFFFFF;',
  pending: 'border:1.5px solid #CBD6E2;background:#FFFFFF;color:transparent;'
};

let prLineSeq = 1;

/* ── pure helpers (lib/procurement.ts + store hydration) ── */
function prPill(tone) { return PR_PILL_BASE + (PR_PILL_TONES[tone] || PR_PILL_TONES.neutral); }
function prCloneDefault() {
  return Object.assign({}, PR_DEFAULT_REQUEST, { lines: PR_DEFAULT_REQUEST.lines.map((l) => Object.assign({}, l)) });
}
function prIsLine(v) {
  return !!v && typeof v === 'object' && typeof v.id === 'string' && typeof v.description === 'string' && typeof v.qty === 'string';
}
/* Hydration is defensive: storage may hold an older shape or a hand-edited value; anything odd falls back to the default. */
function prReadRequest(get) {
  const stored = get(PR_KEY_REQUEST, null);
  if (!stored || typeof stored !== 'object') return prCloneDefault();
  if (typeof stored.ref !== 'string' || typeof stored.vesselId !== 'string' || typeof stored.deliveryPoint !== 'string' ||
      typeof stored.neededBy !== 'string' || !Array.isArray(stored.lines) || !stored.lines.every(prIsLine)) {
    return prCloneDefault();
  }
  return Object.assign(prCloneDefault(), stored, { lines: stored.lines.map((l) => ({ id: l.id, qty: l.qty, description: l.description })) });
}
/* The stage the visitor left the demo at. A stored name that is no longer part of
   the flow — an earlier visit, or a hand-edited entry — starts the demo over at
   the draft rather than leaving the screen on a stage that no longer exists. */
function prReadStage(get) {
  const stored = get(PR_KEY_STAGE, 'draft');
  return typeof stored === 'string' && PR_STAGES.includes(stored) ? stored : 'draft';
}
/* Timestamps for the stages reached so far. Anything the current stage has not
   reached is dropped, so a stage list that has changed since the last visit
   cannot leave a stray time against a step that has not happened. */
function prReadStageTimes(get, stage) {
  const stored = get(PR_KEY_TIMES, {});
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
  const out = {};
  Object.keys(stored).forEach((k) => {
    if (PR_STAGES.includes(k) && typeof stored[k] === 'string' && prStageReached(stage, k)) out[k] = stored[k];
  });
  return out;
}
function prRemove(k) { try { localStorage.removeItem('gac-connect:' + k); } catch (e) {} }
/* A request is sendable when it has at least one line and no blank descriptions. */
function prCanSend(request) {
  return request.lines.length > 0 && request.lines.every((l) => l.description.trim().length > 0);
}
function prStageIndex(stage) { return PR_STAGES.indexOf(stage); }
function prNextStage(stage) { return PR_STAGES[Math.min(prStageIndex(stage) + 1, PR_STAGES.length - 1)] || PR_FINAL_STAGE; }
function prStageReached(current, stage) { return prStageIndex(current) >= prStageIndex(stage); }
function prStageStatus(current, stage) {
  const c = prStageIndex(current), s = prStageIndex(stage);
  if (s < c) return 'done';
  if (s === c) return 'current';
  return 'pending';
}
function prIllustrativePrice(lineId) { return Object.prototype.hasOwnProperty.call(PR_PRICES_GBP, lineId) ? PR_PRICES_GBP[lineId] : PR_PRICE_FALLBACK_GBP; }
/* The client-facing invoice: one line per item, from GAC via Compass. No source
   column — every line is Compass's own supply, under GAC. */
function prInvoiceLines(request) {
  return request.lines.map((l) => ({ id: l.id, qty: l.qty, description: l.description, priceGBP: prIllustrativePrice(l.id) }));
}
/* Sum of the line prices — the figure the client pays (lib/procurement.ts invoiceTotals). */
function prInvoiceTotals(lines) {
  return { total: lines.reduce((sum, l) => sum + l.priceGBP, 0) };
}
function prVesselFor(request) { return PR_VESSELS.find((v) => v.id === request.vesselId) || PR_VESSELS[0]; }
/* "PR-1042 — MV Choice, Aberdeen — needed Fri 08:00" */
function prRequestSummary(request) {
  const v = prVesselFor(request);
  return request.ref + ' — ' + v.name + ', ' + v.port + ' — needed ' + request.neededBy;
}
/* The email the platform sends to Compass. Body lists every line, numbered. */
function prComposeEmail(request, brandName) {
  const v = prVesselFor(request);
  const lineList = request.lines.map((l, i) => (i + 1) + '. ' + l.description + ' (' + l.qty + ')').join('\n');
  const body = [
    'Compass team,',
    '',
    'Please source the following for ' + v.name + ', alongside at ' + request.deliveryPoint + '. Needed by ' + request.neededBy + '.',
    '',
    lineList,
    '',
    'Please confirm supply against each line and invoice via Compass under GAC as usual.',
    '',
    'Regards,',
    PR_SENDER.name + ' · ' + PR_SENDER.org,
    'Sent via ' + brandName + ' · reference ' + request.ref
  ].join('\n');
  return {
    to: PR_COMPASS_ADDRESS,
    from: PR_SENDER.name + ' · ' + PR_SENDER.org + ' · via ' + brandName,
    subject: 'Procurement request ' + prRequestSummary(request),
    body: body
  };
}
/* "09:41" — the time part of an ISO timestamp, British English (same as the site's timeOf). */
function prTimeOf(iso) {
  const d = new Date(iso || '');
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function prNow() { return new Date().toISOString(); }

/* ── suggested list helpers (lib/procurementSuggest.ts) ── */
function prMedianQty(values) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return Math.ceil(sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2);
}
function prMeetsThreshold(times, calls) { return calls > 0 && times * 2 >= calls; }
function prFormatQty(qty, unit) { return qty + ' ' + (qty === 1 ? unit.one : unit.other); }
function prRecentCalls(vesselId) {
  return (PR_CALL_HISTORY[vesselId] || []).slice().sort((a, b) => b[0].localeCompare(a[0])).slice(0, PR_SUGGEST_WINDOW);
}
function prPlannedCallFor(vesselId) { return PR_PLANNED_CALLS.find((c) => c.vesselId === vesselId) || null; }
/* Every catalogue item that meets the threshold, most often ordered first, then in catalogue order. */
function prSuggestionFor(vesselId) {
  if (!prPlannedCallFor(vesselId)) return [];
  const calls = prRecentCalls(vesselId);
  const n = calls.length;
  const out = [];
  PR_STORES_ITEMS.forEach((item, order) => {
    const qtys = [];
    calls.forEach((c) => { const l = c[1].find((x) => x[0] === item.id); if (l && l[1] > 0) qtys.push(l[1]); });
    if (!prMeetsThreshold(qtys.length, n)) return;
    out.push({ itemId: item.id, description: item.description, unit: item.unit, qty: prMedianQty(qtys), timesOrdered: qtys.length, reason: 'Ordered on ' + qtys.length + ' of the last ' + n + ' calls', order: order });
  });
  return out.sort((a, b) => b.timesOrdered - a.timesOrdered || a.order - b.order);
}
/* Edits apply to the vessel they were made for; any other vessel starts clean. */
function prEditsFor(edits, vesselId) {
  return edits && edits.vesselId === vesselId ? edits : { vesselId: vesselId, off: [], qty: {} };
}
function prIsTicked(edits, itemId) { return edits.off.indexOf(itemId) === -1; }
function prEffectiveQty(line, edits) { return typeof edits.qty[line.itemId] === 'number' ? edits.qty[line.itemId] : line.qty; }
/* The ticked lines as procurement lines — the same shape a hand-written list has. */
function prSuggestedRequestLines(suggested, edits) {
  return suggested.filter((l) => prIsTicked(edits, l.itemId)).map((l) => ({ id: l.itemId, description: l.description, qty: prFormatQty(prEffectiveQty(l, edits), l.unit) }));
}
function prCanSendSuggestion(suggested, edits) {
  const ticked = suggested.filter((l) => prIsTicked(edits, l.itemId));
  return ticked.length > 0 && ticked.every((l) => { const q = prEffectiveQty(l, edits); return Number.isInteger(q) && q >= 1; });
}
/* The stored changes to the suggested list, or null when there are none or they look wrong. */
function prReadSuggestion(get) {
  const e = get(PR_KEY_SUGGESTION, null);
  if (!e || typeof e !== 'object' || Array.isArray(e)) return null;
  if (typeof e.vesselId !== 'string' || !Array.isArray(e.off) || !e.off.every((x) => typeof x === 'string') ||
      !e.qty || typeof e.qty !== 'object' || Array.isArray(e.qty) || !Object.keys(e.qty).every((k) => typeof e.qty[k] === 'number')) {
    return null;
  }
  return { vesselId: e.vesselId, off: e.off.slice(), qty: Object.assign({}, e.qty) };
}
function prFocus(id) { setTimeout(() => { const el = document.getElementById(id); if (el) el.focus(); }, 0); }

(Component._features = Component._features || []).push({
  state() {
    const get = (k, d) => this._get(k, d);
    const stage = prReadStage(get);
    return {
      prRequest: prReadRequest(get),
      prStage: stage,
      prStageTimes: prReadStageTimes(get, stage),
      prSuggestion: prReadSuggestion(get),
      prNewDesc: '',
      prNewQty: ''
    };
  },

  vals(st) {
    const request = st.prRequest;
    const stage = st.prStage;
    const stageTimes = st.prStageTimes || {};
    const draft = stage === 'draft';
    const vessel = prVesselFor(request);
    const brandName = (this.props.brandName ?? 'GAC Connect').trim() || 'GAC Connect';
    const email = prComposeEmail(request, brandName);
    const sentAt = stageTimes.sent;
    const invLines = prInvoiceLines(request);
    const totals = prInvoiceTotals(invLines);
    const nextLabel = PR_SIMULATE_LABELS[stage] || '';
    const dirty = !draft || !!st.prSuggestion || JSON.stringify(request) !== JSON.stringify(PR_DEFAULT_REQUEST);
    const pill = PR_STAGE_PILL[stage] || PR_STAGE_PILL.draft;
    const sendable = prCanSend(request);
    const n = request.lines.length;
    const linesWord = n === 1 ? 'line' : 'lines';

    /* store semantics — every draft edit is written through, as on the site */
    const saveRequest = (next) => { this._set(PR_KEY_REQUEST, next); this.setState({ prRequest: next }); };
    const patchRequest = (patch) => saveRequest(Object.assign({}, this.state.prRequest, patch));
    const updateLine = (id, patch) => patchRequest({ lines: this.state.prRequest.lines.map((l) => (l.id === id ? Object.assign({}, l, patch) : l)) });
    const removeLine = (id) => patchRequest({ lines: this.state.prRequest.lines.filter((l) => l.id !== id) });
    /* Send a request to Compass (store/procurement.ts send). The suggested list
       calls this too, with its ticked lines, so both reach the same pipeline. */
    const sendRequest = (req) => {
      const cur = this.state;
      if (cur.prStage !== 'draft' || !prCanSend(req)) return;
      /* Snapshot the request as sent, so what is on disk is what went to Compass. */
      this._set(PR_KEY_REQUEST, req);
      const times = Object.assign({}, cur.prStageTimes, { sent: prNow() });
      this._set(PR_KEY_STAGE, 'sent');
      this._set(PR_KEY_TIMES, times);
      this.setState({ prRequest: req, prStage: 'sent', prStageTimes: times });
      const v = prVesselFor(req);
      const count = req.lines.length;
      this.toastMsg(req.ref + ' sent to Compass — ' + count + ' ' + (count === 1 ? 'line' : 'lines') + ', ' + v.name + ', needed ' + req.neededBy + '. Compass sources and supplies every line; you see one invoice, from GAC.');
      prFocus('pres-compass-email');
    };

    /* The suggested list for the request's vessel (screens/app/procurement/SuggestedList.tsx). */
    const sgCall = prPlannedCallFor(request.vesselId);
    const sgLines = prSuggestionFor(request.vesselId);
    const sgHasList = !!sgCall && sgLines.length > 0;
    const sgEdits = prEditsFor(st.prSuggestion, request.vesselId);
    const sgCalls = prRecentCalls(request.vesselId).length;
    const sgTickedCount = sgLines.filter((l) => prIsTicked(sgEdits, l.itemId)).length;
    const sgSendable = prCanSendSuggestion(sgLines, sgEdits);
    const saveSuggestion = (next) => { this._set(PR_KEY_SUGGESTION, next); this.setState({ prSuggestion: next }); };
    const sgToggle = (itemId) => {
      if (this.state.prStage !== 'draft') return;
      const e = prEditsFor(this.state.prSuggestion, this.state.prRequest.vesselId);
      const off = e.off.indexOf(itemId) === -1 ? e.off.concat([itemId]) : e.off.filter((x) => x !== itemId);
      saveSuggestion(Object.assign({}, e, { off: off }));
    };
    const sgSetQty = (itemId, value) => {
      if (this.state.prStage !== 'draft') return;
      const e = prEditsFor(this.state.prSuggestion, this.state.prRequest.vesselId);
      const num = Number(value);
      const qty = Object.assign({}, e.qty);
      qty[itemId] = Number.isFinite(num) ? Math.max(0, Math.floor(num)) : 0;
      saveSuggestion(Object.assign({}, e, { qty: qty }));
    };
    const sgRows = sgLines.map((l) => {
      const on = prIsTicked(sgEdits, l.itemId);
      const q = prEffectiveQty(l, sgEdits);
      return {
        itemId: l.itemId, description: l.description, reason: l.reason,
        ticked: on, untick: !on, tickedAttr: on ? 'true' : 'false',
        tickId: 'suggested-' + l.itemId, qtyId: 'suggested-qty-' + l.itemId,
        tickTestId: 'suggested-tick-' + l.itemId, qtyTestId: 'suggested-qty-' + l.itemId, reasonTestId: 'suggested-reason-' + l.itemId,
        qtyLabel: 'Quantity: ' + l.description,
        qty: q > 0 ? String(q) : '',
        unit: q === 1 ? l.unit.one : l.unit.other,
        descStyle: 'display:block;font-size:13.5px;font-weight:700;' + (on ? 'color:#0A2540;' : 'color:#33475F;text-decoration:line-through;'),
        qtyStyle: 'display:block;min-height:40px;width:76px;box-sizing:border-box;border:1.5px solid #CBD6E2;border-radius:8px;padding:8px 10px;font-size:13.5px;font-weight:600;background:#FFFFFF;font-family:inherit;color:#0A2540;' + (on ? '' : 'opacity:.5;'),
        onTick: () => sgToggle(l.itemId),
        onQty: (e) => sgSetQty(l.itemId, e.target.value)
      };
    });

    const addLine = (description, qty) => {
      const desc = description.trim();
      if (!desc) return;
      const id = 'line-' + Date.now().toString(36) + '-' + (prLineSeq++);
      patchRequest({ lines: this.state.prRequest.lines.concat([{ id: id, description: desc, qty: qty.trim() || '1' }]) });
    };

    /* Copy under each reached timeline stage. These say what has happened to this
       request; the "How it works" cards say what Compass does in general, so no
       sentence is repeated between the two. */
    const stageNote = (s) => {
      switch (s) {
        case 'sent': return 'Your list went to Compass by email. Nothing else for you to do — Compass takes it from here.';
        case 'sourcing': return 'Your list is in hand at Compass now — nothing sits with you while it is being worked.';
        case 'confirmed': return 'Compass has confirmed the list back — all ' + n + ' ' + linesWord + ' covered, each marked confirmed on your request.';
        case 'invoiced': return 'The invoice is raised: every line at Compass’s prices, on one document under GAC.';
        default: return '';
      }
    };

    const lines = request.lines.map((l, i) => {
      const linePill = prStageReached(stage, 'confirmed')
        ? { style: prPill('verified'), label: PR_LINE_CONFIRMATION }
        : { style: prPill('neutral'), label: stage === 'sent' ? 'With Compass' : 'Being sourced' };
      return {
        id: l.id, description: l.description, qty: l.qty,
        editable: draft, locked: !draft,
        descId: 'line-desc-' + l.id, qtyId: 'line-qty-' + l.id,
        descLabel: 'Line ' + (i + 1) + ' description', qtyLabel: 'Line ' + (i + 1) + ' quantity',
        removeLabel: 'Remove line: ' + (l.description || ('line ' + (i + 1))),
        removeTestId: 'remove-line-' + l.id,
        onDesc: (e) => updateLine(l.id, { description: e.target.value }),
        onQty: (e) => updateLine(l.id, { qty: e.target.value }),
        onRemove: () => removeLine(l.id),
        pillStyle: linePill.style, pillLabel: linePill.label
      };
    });

    const timeline = PR_TIMELINE_STAGES.map((s, i) => {
      const status = draft ? 'pending' : prStageStatus(stage, s);
      const at = stageTimes[s];
      const last = i === PR_TIMELINE_STAGES.length - 1;
      return {
        key: s, status: status, label: PR_STAGE_LABELS[s],
        isCurrent: status === 'current', notPending: status !== 'pending', notLast: !last,
        ariaCurrent: status === 'current' ? 'step' : null,
        markerStyle: PR_MARKER_BASE + PR_MARKER[status],
        markerGlyph: status === 'done' ? '✓' : (status === 'current' ? '●' : '○'),
        labelStyle: 'font-size:13.5px;font-weight:700;margin:0;' + (status === 'pending' ? 'color:#33475F;' : 'color:#0A2540;'),
        liStyle: 'position:relative;display:flex;gap:12px;list-style:none;margin:0;padding:0 0 ' + (last ? '0' : '16px') + ';',
        hasTime: !!at, time: at ? prTimeOf(at) : '',
        /* The per-line confirmation lives on the request card, against the line
           the client wrote; the timeline carries the count so the same words are
           not announced twice per line. */
        note: status !== 'pending' ? stageNote(s) : ''
      };
    });

    const invoiceRows = invLines.map((l) => ({ description: l.description, qty: l.qty, price: this._gbp(l.priceGBP) }));

    return {
      /* header + notice */
      prNotice: PR_SIMULATION_NOTICE,
      prRules: PR_RULES,
      prPillNeutral: prPill('neutral'),
      prPillVerified: prPill('verified'),

      /* request card */
      prStage: stage,
      prIsDraft: draft,
      prIsLocked: !draft,
      prRef: request.ref,
      prVesselTitle: vessel.name + ' · ' + vessel.port,
      prSubline: draft
        ? 'Drafted from the vessel’s call — edit the lines, then send.'
        : 'Sent ' + prTimeOf(sentAt) + ' · ' + n + ' ' + linesWord + ' · locked while Compass works it',
      prStagePillStyle: prPill(pill.tone),
      prStagePillLabel: pill.label,
      prVesselId: request.vesselId,
      prOnVessel: (e) => patchRequest({ vesselId: e.target.value }),
      prDeliveryPoint: request.deliveryPoint,
      prOnDelivery: (e) => patchRequest({ deliveryPoint: e.target.value }),
      prNeededBy: request.neededBy,
      prOnNeededBy: (e) => patchRequest({ neededBy: e.target.value }),
      prLineCount: String(n),
      prHasLines: n > 0,
      prNoLines: n === 0,
      prLines: lines,
      prNewDesc: st.prNewDesc,
      prOnNewDesc: (e) => this.setState({ prNewDesc: e.target.value }),
      prNewQty: st.prNewQty,
      prOnNewQty: (e) => this.setState({ prNewQty: e.target.value }),
      prAddDisabled: !st.prNewDesc.trim(),
      prAddBtnStyle: PR_BTN_GHOST + (!st.prNewDesc.trim() ? PR_BTN_DISABLED : ''),
      prAddLine: (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!this.state.prNewDesc.trim()) return;
        addLine(this.state.prNewDesc, this.state.prNewQty);
        this.setState({ prNewDesc: '', prNewQty: '' });
        prFocus('add-line-description');
      },
      prSendDisabled: !sendable,
      prSendBtnStyle: PR_BTN_PRIMARY + (!sendable ? PR_BTN_DISABLED : ''),
      prSendHint: sendable
        ? 'The platform composes the email and shows it here — nothing to type'
        : (n === 0 ? 'Add at least one line to send' : 'Every line needs a description before it can go to Compass'),
      prSend: () => sendRequest(this.state.prRequest),

      /* suggested list — shown only while the request is a draft */
      sgPlanned: draft && sgHasList,
      sgNone: draft && !sgHasList,
      sgNoneText: 'No call planned for ' + vessel.name + ' yet. A suggested list is drafted from her previous calls once one is.',
      sgEyebrow: 'Suggested list · from the last ' + sgCalls + ' calls',
      sgTitle: sgCall ? 'Next call · ' + vessel.name + ' · ' + sgCall.port + ' · ETA ' + sgCall.eta : '',
      sgIntro: PR_SUGGESTION_COPY.intro,
      sgPill: PR_SUGGESTION_COPY.pill,
      sgPillStyle: prPill('info'),
      sgRows: sgRows,
      sgRule: 'A line is suggested when it was ordered on at least half of the last ' + sgCalls + ' calls. The quantity is the usual order, the median.',
      sgSendLabel: PR_SUGGESTION_COPY.sendLabel,
      sgSendDisabled: !sgSendable,
      sgSendBtnStyle: PR_BTN_PRIMARY + (!sgSendable ? PR_BTN_DISABLED : ''),
      sgHint: sgSendable
        ? 'Goes to Compass as ' + request.ref + ' in place of the draft below, through the same steps to one invoice'
        : (sgTickedCount === 0 ? PR_SUGGESTION_COPY.noneTicked : PR_SUGGESTION_COPY.badQty),
      sgSend: () => {
        const cur = this.state;
        if (cur.prStage !== 'draft') return;
        const vid = cur.prRequest.vesselId;
        const callNow = prPlannedCallFor(vid);
        if (!callNow) return;
        const sug = prSuggestionFor(vid);
        const e = prEditsFor(cur.prSuggestion, vid);
        if (!prCanSendSuggestion(sug, e)) return;
        /* The ticked lines become the request for this call; from here on it is the
           same request, the same stages and the same invoice as a hand-written list. */
        sendRequest(Object.assign({}, cur.prRequest, { vesselId: vid, deliveryPoint: callNow.deliveryPoint, neededBy: callNow.neededBy, lines: prSuggestedRequestLines(sug, e) }));
      },

      /* email preview */
      prShowEmail: !draft,
      prEmailTo: email.to,
      prEmailFrom: email.from,
      prEmailSubject: email.subject,
      prEmailBody: email.body,
      prSentLabel: 'sent ' + prTimeOf(sentAt),

      /* timeline */
      prStatusLabel: draft ? 'Not sent yet' : PR_STAGE_LABELS[stage],
      prTimeline: timeline,
      prHasNext: !!nextLabel,
      prNextLabel: nextLabel,
      prAdvance: () => {
        const cur = this.state.prStage;
        if (cur === 'draft' || cur === PR_FINAL_STAGE) return;
        const next = prNextStage(cur);
        const times = Object.assign({}, this.state.prStageTimes);
        times[next] = prNow();
        this._set(PR_KEY_STAGE, next);
        this._set(PR_KEY_TIMES, times);
        this.setState({ prStage: next, prStageTimes: times });
        if (next === PR_FINAL_STAGE) prFocus('pres-compass-invoice');
      },

      /* the one invoice, from GAC — Compass's line prices and one total, nothing else */
      prShowInvoice: stage === PR_FINAL_STAGE,
      prInvoiceTo: vessel.operatorLine + ' · ' + vessel.name,
      prInvoiceRows: invoiceRows,
      prTotal: this._gbp(totals.total),

      /* Compass strip */
      prDirty: dirty,
      prReset: () => {
        prRemove(PR_KEY_REQUEST); prRemove(PR_KEY_STAGE); prRemove(PR_KEY_TIMES); prRemove(PR_KEY_SUGGESTION);
        this.setState({ prRequest: prCloneDefault(), prStage: 'draft', prStageTimes: {}, prSuggestion: null, prNewDesc: '', prNewQty: '' });
        prFocus('procurement-request');
      }
    };
  },

  escape() { return false; }
});
