/* Procurement — presenter mirror of the site's Procurement (via Compass) screen
   (17 Aug review). Feature module: registers state / bindings / Escape handling
   with the core Component via Component._features (see component.js
   "feature-module extension points"). Ports src/lib/procurement.ts (stages,
   routing, email, invoice maths), src/data/procurement.ts (default request,
   copy tables, demo prices) and src/store/procurement.ts (what is persisted,
   send / advance / reset semantics) so the demo behaves exactly like the site.
   Storage keys are prefixed 'pres.' so they never collide with the site's own
   stores on the same origin. Everything numeric here is illustrative. */

/* ── stage machine (lib/procurement.ts) ── */
const PR_STAGES = ['draft', 'sent', 'sourcing', 'replied', 'chandler-paid', 'invoiced'];
const PR_FINAL_STAGE = 'invoiced';
const PR_TIMELINE_STAGES = PR_STAGES.filter((s) => s !== 'draft');
const PR_STAGE_LABELS = {
  draft: 'Draft — not yet sent',
  sent: 'Sent to Compass',
  sourcing: 'Compass sourcing',
  replied: 'Compass reply: supplied / routed',
  'chandler-paid': 'Compass pays the chandler',
  invoiced: 'Invoiced via Compass — under GAC'
};
/* Label of the simulate button that advances FROM this stage. */
const PR_SIMULATE_LABELS = {
  sent: 'Simulate: Compass starts sourcing',
  sourcing: 'Simulate: Compass replies',
  replied: 'Simulate: chandler paid',
  'chandler-paid': 'Simulate: invoice raised via Compass'
};
/* Header pill for the request card, per stage (screens/app/Procurement.tsx). */
const PR_STAGE_PILL = {
  draft: { tone: 'neutral', label: 'Draft · ready to send' },
  sent: { tone: 'info', label: 'With Compass' },
  sourcing: { tone: 'info', label: 'With Compass · sourcing' },
  replied: { tone: 'info', label: 'Compass replied' },
  'chandler-paid': { tone: 'info', label: 'Chandler paid by Compass' },
  invoiced: { tone: 'verified', label: '✓ Invoiced via Compass' }
};

/* ── data (data/procurement.ts + data/vessels.ts) — all fictional ── */
const PR_VESSELS = [
  { id: 'caledonian-star', name: 'MV Caledonian Star', operatorLine: 'Browne Energy / Grizzell Marine (60/40)', port: 'Aberdeen' },
  { id: 'boreal', name: 'MV Boreal', operatorLine: 'Stronach Subsea', port: 'Peterhead' },
  { id: 'granite-coast', name: 'MV Granite Coast', operatorLine: 'Wilkinson Drilling', port: 'Aberdeen' }
];
/* The draft the dashboard calls "1 procurement list ready to send". */
const PR_DEFAULT_REQUEST = {
  ref: 'PR-1042',
  vesselId: 'caledonian-star',
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
/* Lines Compass cannot assist on in the demo — routed to a third-party chandler, which Compass pays. */
const PR_CANNOT_ASSIST_IDS = ['bonded-stores', 'galley-gas'];
/* Fictional third-party chandler for the routed lines. */
const PR_CHANDLER_NAME = 'Granite Ship Chandlers';
/* Illustrative demo prices per line id; added lines take the fallback. Nothing here is a real Compass price. */
const PR_PRICES_GBP = { 'engine-room': 1240, provisions: 2150, 'deck-stores': 860, 'bonded-stores': 540, 'galley-gas': 190 };
const PR_PRICE_FALLBACK_GBP = 250;
/* Illustrative only. Compass's actual rate is set by Compass, not by this platform. */
const PR_MARKUP_PCT = 10;
const PR_RULES = [
  { step: '1', title: 'The list goes straight to Compass by email', body: 'You build the list here; the platform composes the email and sends it to Compass, GAC’s own procurement branch. No separate purchase orders, no phoning round.' },
  { step: '2', title: 'Compass supplies from its own stock and network', body: 'Compass works the list line by line and supplies what it can directly.' },
  { step: '3', title: 'If Compass cannot assist on a line, it sources it — and pays', body: 'A ship chandler, for example. Compass places the order and pays the chandler itself. The chandler is Compass’s supplier, not yours.' },
  { step: '4', title: 'You are invoiced via Compass, under GAC, with a mark-up', body: 'One invoice, from GAC, covering every line. No third-party paperwork; GAC accountable for the whole basket.' }
];
const PR_SIMULATION_NOTICE = 'Illustrative — Compass replies are simulated in this proof of concept. No email is sent and every price is a demo figure.';

/* ── persistence keys (store/procurement.ts, presenter-prefixed) ── */
const PR_KEY_REQUEST = 'pres.procurement.request';
const PR_KEY_STAGE = 'pres.procurement.stage';
const PR_KEY_TIMES = 'pres.procurement.stageTimes';

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
function prReadStage(get) {
  const stored = get(PR_KEY_STAGE, 'draft');
  return typeof stored === 'string' && PR_STAGES.includes(stored) ? stored : 'draft';
}
function prReadStageTimes(get) {
  const stored = get(PR_KEY_TIMES, {});
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
  const out = {};
  Object.keys(stored).forEach((k) => { if (PR_STAGES.includes(k) && typeof stored[k] === 'string') out[k] = stored[k]; });
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
/* Compass supplies every line it can; exactly the cannot-assist ids are routed to a third-party chandler. */
function prRouteLines(lines) {
  return lines.map((l) => Object.assign({}, l, { source: PR_CANNOT_ASSIST_IDS.includes(l.id) ? 'chandler' : 'compass' }));
}
function prSourceLabel(source) {
  return source === 'compass' ? 'Supplied by Compass' : 'Cannot assist — routed to a third-party chandler · ' + PR_CHANDLER_NAME;
}
function prMarkupAmount(subtotal) { return Math.round((subtotal * PR_MARKUP_PCT) / 100); }
function prMarkupTotal(subtotal) { return Math.round(subtotal + prMarkupAmount(subtotal)); }
function prIllustrativePrice(lineId) { return Object.prototype.hasOwnProperty.call(PR_PRICES_GBP, lineId) ? PR_PRICES_GBP[lineId] : PR_PRICE_FALLBACK_GBP; }
/* The client-facing invoice: one line per item — no source column, the chandler never appears on the client's paperwork. */
function prInvoiceLines(request) {
  return request.lines.map((l) => ({ id: l.id, qty: l.qty, description: l.description, priceGBP: prIllustrativePrice(l.id) }));
}
function prInvoiceTotals(lines) {
  const subtotal = lines.reduce((sum, l) => sum + l.priceGBP, 0);
  return { subtotal: subtotal, markup: prMarkupAmount(subtotal), total: prMarkupTotal(subtotal) };
}
function prVesselFor(request) { return PR_VESSELS.find((v) => v.id === request.vesselId) || PR_VESSELS[0]; }
/* "PR-1042 — MV Caledonian Star, Aberdeen — needed Fri 08:00" */
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
    'Where Compass cannot assist on a line, please source it and invoice via Compass under GAC as usual.',
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
function prFocus(id) { setTimeout(() => { const el = document.getElementById(id); if (el) el.focus(); }, 0); }

(Component._features = Component._features || []).push({
  state() {
    return {
      prRequest: prReadRequest((k, d) => this._get(k, d)),
      prStage: prReadStage((k, d) => this._get(k, d)),
      prStageTimes: prReadStageTimes((k, d) => this._get(k, d)),
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
    const routed = prRouteLines(request.lines);
    const chandlerLines = routed.filter((l) => l.source === 'chandler');
    const brandName = (this.props.brandName ?? 'GAC Connect').trim() || 'GAC Connect';
    const email = prComposeEmail(request, brandName);
    const sentAt = stageTimes.sent;
    const invLines = prInvoiceLines(request);
    const totals = prInvoiceTotals(invLines);
    const nextLabel = PR_SIMULATE_LABELS[stage] || '';
    const dirty = !draft || JSON.stringify(request) !== JSON.stringify(PR_DEFAULT_REQUEST);
    const pill = PR_STAGE_PILL[stage] || PR_STAGE_PILL.draft;
    const sendable = prCanSend(request);
    const n = request.lines.length;
    const linesWord = n === 1 ? 'line' : 'lines';

    /* store semantics — every draft edit is written through, as on the site */
    const saveRequest = (next) => { this._set(PR_KEY_REQUEST, next); this.setState({ prRequest: next }); };
    const patchRequest = (patch) => saveRequest(Object.assign({}, this.state.prRequest, patch));
    const updateLine = (id, patch) => patchRequest({ lines: this.state.prRequest.lines.map((l) => (l.id === id ? Object.assign({}, l, patch) : l)) });
    const removeLine = (id) => patchRequest({ lines: this.state.prRequest.lines.filter((l) => l.id !== id) });
    const addLine = (description, qty) => {
      const desc = description.trim();
      if (!desc) return;
      const id = 'line-' + Date.now().toString(36) + '-' + (prLineSeq++);
      patchRequest({ lines: this.state.prRequest.lines.concat([{ id: id, description: desc, qty: qty.trim() || '1' }]) });
    };

    /* Copy under each reached timeline stage. */
    const stageNote = (s) => {
      switch (s) {
        case 'sent': return 'The platform composed the email and sent it to Compass. Nothing else for you to do — Compass takes it from here.';
        case 'sourcing': return 'Compass works the list line by line: its own stock and network first.';
        case 'replied': return 'Compass replies per line. Where it cannot assist, it has already placed the order with a third-party chandler.';
        case 'chandler-paid': return chandlerLines.length > 0
          ? 'Compass pays ' + PR_CHANDLER_NAME + ' directly. The chandler’s invoice goes to Compass — never to you.'
          : 'No third-party lines on this request — nothing for Compass to settle.';
        case 'invoiced': return 'One invoice, from GAC via Compass, covering every line with Compass’s mark-up applied. No third-party paperwork.';
        default: return '';
      }
    };

    const lines = routed.map((l, i) => {
      const linePill = prStageReached(stage, 'replied')
        ? { style: prPill(l.source === 'compass' ? 'verified' : 'info'), label: l.source === 'compass' ? 'Compass' : 'Chandler · via Compass' }
        : { style: prPill('neutral'), label: stage === 'sent' ? 'With Compass' : 'Being sourced' };
      return {
        id: l.id, description: l.description, qty: l.qty, source: l.source,
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
        note: status !== 'pending' ? stageNote(s) : '',
        showReplies: s === 'replied' && status !== 'pending'
      };
    });

    const replyLines = routed.map((l) => ({ description: l.description, source: l.source, sourceLabel: prSourceLabel(l.source) }));

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
      prSend: () => {
        const cur = this.state;
        if (cur.prStage !== 'draft' || !prCanSend(cur.prRequest)) return;
        /* Snapshot the request as sent, so what is on disk is what went to Compass. */
        this._set(PR_KEY_REQUEST, cur.prRequest);
        const times = Object.assign({}, cur.prStageTimes, { sent: prNow() });
        this._set(PR_KEY_STAGE, 'sent');
        this._set(PR_KEY_TIMES, times);
        this.setState({ prStage: 'sent', prStageTimes: times });
        const v = prVesselFor(cur.prRequest);
        const count = cur.prRequest.lines.length;
        this.toastMsg(cur.prRequest.ref + ' sent to Compass — ' + count + ' ' + (count === 1 ? 'line' : 'lines') + ', ' + v.name + ', needed ' + cur.prRequest.neededBy + '. Compass sources every line; you see one invoice, from GAC.');
        prFocus('pres-compass-email');
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
      prReplyLines: replyLines,
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

      /* the one invoice, from GAC */
      prShowInvoice: stage === PR_FINAL_STAGE,
      prInvoiceTo: vessel.operatorLine + ' · ' + vessel.name,
      prInvoiceRows: invoiceRows,
      prSubtotal: this._gbp(totals.subtotal),
      prMarkupLabel: 'Compass mark-up · illustrative ' + PR_MARKUP_PCT + '%',
      prMarkup: this._gbp(totals.markup),
      prTotal: this._gbp(totals.total),

      /* Compass strip */
      prDirty: dirty,
      prReset: () => {
        prRemove(PR_KEY_REQUEST); prRemove(PR_KEY_STAGE); prRemove(PR_KEY_TIMES);
        this.setState({ prRequest: prCloneDefault(), prStage: 'draft', prStageTimes: {}, prNewDesc: '', prNewQty: '' });
        prFocus('procurement-request');
      }
    };
  },

  escape() { return false; }
});
