/* Invoices — presenter mirror of the site's Invoice review screen (v12 §5).
   Feature module: registers state / bindings / Escape handling with the core
   Component via Component._features (see component.js "feature-module
   extension points"). Ports src/lib/invoices.ts (the seven-day window, state
   derivation, admin-fee rule), src/data/invoices.ts (the fictional invoices and
   the rules strip) and the invoice slice of src/store/app.ts (invoiceDecisions,
   jobRatings, resetInvoices) so the demo behaves like the site. Storage keys
   are prefixed 'pres.' so they never collide with the site's own stores on the
   same origin.

   AHEAD OF THE SITE (owner's call, 19 Aug): the fourth invoice — the port
   disbursement split at an off-hire — exists here only. The site still has the
   three whole-invoice ones, so `INV_INVOICES[3]`, everything under "line-level
   split" below, and the matching parts of 57-invoices.html are the presenter's
   own until they are ported back to src/{data,lib,screens}. Keep that in mind
   before calling this file a straight port.

   The client persona never sees the supplier-side mechanics behind an invoice
   — the plan, the band, or what is deducted when it matches (17 Aug review):
   none of it is in this module. Every figure here is illustrative. */

/* ── the window (lib/invoices.ts) ── */
const INV_REVIEW_WINDOW_DAYS = 7;

/* ── line-level split (presenter-only, 19 Aug) ──
   A port call that straddles a delivery or redelivery does not have one billing
   party: the vessel is on the charterer's time inbound and the owners' from the
   moment she goes off-hire, so a single disbursement carries costs belonging to
   both. The charter party decides where the line falls — every cost incurred
   while the vessel is still on-hire is the charterer's, everything from the
   off-hire moment is the owners' — and the client can move any line either way
   before it matches. The parties are per invoice, not global, because the same
   client can be charterer on one call and owner on the next. */
const INV_PARTY_CHARTERER = 'charterer';
const INV_PARTY_OWNER = 'owner';
const INV_PARTIES = [INV_PARTY_CHARTERER, INV_PARTY_OWNER];

/* ── data (data/invoices.ts) — all fictional ── */
const INV_INVOICES = [
  {
    id: 'INV-4471',
    supplierId: 'caledonia-lifting',
    supplierName: 'Caledonia Lifting Ltd',
    service: 'Crane hire — 130t mobile',
    vessel: 'MV Caledonian Star',
    jobRef: 'CS-2207',
    amountGBP: 4400,
    receivedDaysAgo: 2,
    poRef: 'PO 48211',
    allocations: [
      { id: 'split-60-40', label: 'Browne Energy / Grizzell Marine — 60/40', fromVesselProfile: true },
      { id: 'browne-100', label: 'Browne Energy — 100%' },
      { id: 'grizzell-100', label: 'Grizzell Marine — 100%' }
    ],
    defaultAllocationId: 'split-60-40',
    serviceConfirmed: 'Delivered Fri · confirmed by both parties'
  },
  {
    id: 'INV-4468',
    supplierId: 'aberdeen-offshore-medical',
    supplierName: 'Aberdeen Offshore Medical',
    service: 'Medical cover — topside medic, 2 days',
    vessel: 'MV Caledonian Star',
    jobRef: 'CS-2204',
    amountGBP: 1850,
    receivedDaysAgo: 5,
    poRef: 'PO 48196',
    allocations: [
      { id: 'split-60-40', label: 'Browne Energy / Grizzell Marine — 60/40', fromVesselProfile: true },
      { id: 'browne-100', label: 'Browne Energy — 100%' },
      { id: 'grizzell-100', label: 'Grizzell Marine — 100%' }
    ],
    defaultAllocationId: 'split-60-40',
    serviceConfirmed: 'Delivered Tue · deemed confirmed (no dispute raised)'
  },
  {
    id: 'INV-4452',
    supplierId: 'caledonia-scaffolding',
    supplierName: 'Caledonia Scaffolding',
    service: 'Access scaffolding — onboard',
    vessel: 'MV Boreal',
    jobRef: 'BO-1188',
    amountGBP: 2900,
    receivedDaysAgo: 8,
    poRef: 'PO 48140',
    allocations: [
      { id: 'stronach-100', label: 'Stronach Subsea — 100%', fromVesselProfile: true }
    ],
    defaultAllocationId: 'stronach-100',
    serviceConfirmed: 'Delivered last week · confirmed by both parties'
  },
  /* The redelivery call. MV Granite Coast comes in on-hire under the charter,
     is redelivered to owners alongside at 14:20, and stays for two days' repair
     work on owners' account before sailing. One disbursement, two payers, and
     the split falls where the charter party puts it: the inbound — pilotage,
     towage, linesmen made fast, dues to 14:20 — is the charterer's; the shift
     into the maintenance berth, the dues across the repair days, linesmen let
     go and pilotage outward are the owners'. Today an agent splits this by hand
     on the disbursement account; here the platform already knows the off-hire
     moment and pre-allocates every line to the right party.
     The harbour is not a marketplace supplier, so there is nothing to rate. */
  {
    id: 'INV-4483',
    supplierId: null,
    supplierName: 'Aberdeen port authority',
    rateable: false,
    service: 'Port disbursement — arrival, off-hire, sailing',
    vessel: 'MV Granite Coast',
    jobRef: 'GC-3120',
    receivedDaysAgo: 1,
    poRef: 'PO 48233',
    serviceConfirmed: 'Call closed Sat 06:00 · figures agreed with the harbour',
    hire: {
      chartererLabel: 'Wilkinson Drilling — charterer',
      ownerLabel: 'Stronach Subsea — owners',
      chartererShort: 'Wilkinson Drilling',
      ownerShort: 'Stronach Subsea',
      headline: 'On-hire inbound · redelivered to owners alongside Thu 14:20',
      note: 'The vessel came in on the charterer’s time and went off-hire alongside at 14:20, then stayed two days under repair on the owners’ account. Costs are pre-allocated at that moment, from the charter party held on the vessel profile. Move any line if the parties have agreed it differently.'
    },
    lines: [
      { id: 'pilot-in', description: 'Pilotage — inward', when: 'Thu 06:40 · arrival', amountGBP: 680, defaultParty: INV_PARTY_CHARTERER },
      { id: 'tow-in', description: 'Towage — inward, one tug', when: 'Thu 06:40 · arrival', amountGBP: 1240, defaultParty: INV_PARTY_CHARTERER },
      { id: 'lines-in', description: 'Linesmen — mooring on arrival', when: 'Thu 06:40 · made fast', amountGBP: 310, defaultParty: INV_PARTY_CHARTERER },
      { id: 'dues-on', description: 'Harbour dues — arrival to off-hire', when: 'Thu 06:40–14:20', amountGBP: 1180, defaultParty: INV_PARTY_CHARTERER },
      { id: 'shift-maint', description: 'Berth shift to Pocra Quay — pilot and linesmen, both ends', when: 'Thu 16:05 · into maintenance', amountGBP: 540, defaultParty: INV_PARTY_OWNER },
      { id: 'dues-off', description: 'Harbour dues — off-hire to sailing, incl. two days alongside under repair', when: 'Thu 14:20–Sat 06:00', amountGBP: 2360, defaultParty: INV_PARTY_OWNER },
      { id: 'lines-out', description: 'Linesmen — unmooring on sailing', when: 'Sat 06:00 · let go', amountGBP: 310, defaultParty: INV_PARTY_OWNER },
      { id: 'pilot-out', description: 'Pilotage — outward', when: 'Sat 06:00 · sailing', amountGBP: 680, defaultParty: INV_PARTY_OWNER }
    ]
  }
];

/* The headline figure is the sum of the lines, so the two can never disagree. */
INV_INVOICES.forEach((inv) => {
  if (inv.lines) inv.amountGBP = inv.lines.reduce((sum, l) => sum + l.amountGBP, 0);
});

/* Rules strip (data/invoices.ts INVOICE_RULES) — v12 §5, with the third card
   as the 17 Aug review left it: the rating rule, not the supplier-side one. */
const INV_RULES = [
  {
    title: 'The invoice comes to you first',
    body: 'When a supplier invoice arrives, it routes to the client before anything matches. You have seven days to allocate it to the correct billing party and apply splits where required.'
  },
  {
    title: 'Left alone, it matches as it stands',
    body: 'If the window passes without action, the invoice matches to GAC Agent as received. Changes requested after matching carry an administrative fee at published rates.'
  },
  {
    title: 'Rate the job when it closes',
    body: 'When the job closes, your agent rates the supplier — thirty seconds of agent time. That rating feeds the live score every client sees in the marketplace, always with the number of ratings behind it.'
  }
];

/* ── persistence keys (store/app.ts, presenter-prefixed) ── */
const INV_KEY_DECISIONS = 'pres.invoiceDecisions';
const INV_KEY_RATINGS = 'pres.jobRatings';

/* ── styles (inline, mirroring the procurement partial's strings) ── */
const INV_PILL_BASE = 'display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:3px 10px;font-size:11.5px;font-weight:700;letter-spacing:.02em;';
const INV_PILL_TONES = {
  neutral: 'background:#FAFBFD;color:#33475F;border:1px solid #CBD6E2;',
  info: 'background:#E8F1F7;color:#0E5E8A;',
  warn: 'background:#FBF6E3;color:#9A7B14;border:1px solid #E5D89A;',
  verified: 'background:#E7F4EF;color:#047857;'
};
const INV_BTN_PRIMARY = 'display:inline-flex;align-items:center;justify-content:center;min-height:44px;background:#0E5E8A;color:#FFFFFF;border:none;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13.5px;cursor:pointer;font-family:inherit;white-space:nowrap;';
const INV_STAR_BASE = 'display:grid;place-items:center;width:36px;height:36px;border:none;background:none;border-radius:6px;font-size:22px;line-height:1;cursor:pointer;font-family:inherit;';

/* ── pure helpers (lib/invoices.ts) ── */
function invPill(tone) { return INV_PILL_BASE + (INV_PILL_TONES[tone] || INV_PILL_TONES.neutral); }
/* Whole days remaining in the client review window; never negative. */
function invDaysLeft(receivedDaysAgo) { return Math.max(0, INV_REVIEW_WINDOW_DAYS - receivedDaysAgo); }
/* A client decision always wins; otherwise the window decides — open means
   awaiting, closed means the invoice matched to GA as it stood. */
function invState(receivedDaysAgo, decision) {
  if (decision) return 'matched';
  return invDaysLeft(receivedDaysAgo) === 0 ? 'auto-matched' : 'awaiting';
}
/* Once matched (by the client or by the window), changes carry the admin fee. */
function invCarriesAdminFee(state) { return state !== 'awaiting'; }
function invWindowLabel(receivedDaysAgo) {
  const left = invDaysLeft(receivedDaysAgo);
  if (left === 0) return 'Window closed';
  if (left === 1) return '1 day left';
  return left + ' days left';
}
function invAllocationLabel(invoice, id) {
  const found = invoice.allocations.find((a) => a.id === id);
  return found ? found.label : invoice.allocations[0].label;
}
/* ── line-level split helpers ── */
/* The split the charter party implies: every line on its default party. */
function invDefaultParties(invoice) {
  const out = {};
  (invoice.lines || []).forEach((l) => { out[l.id] = l.defaultParty; });
  return out;
}
/* What each side pays under a given split, and the whole. The total is summed
   from the lines rather than carried separately, so the two halves always add
   up to the invoice however the lines have been moved. */
function invSplitTotals(invoice, parties) {
  const totals = { charterer: 0, owner: 0, total: 0 };
  (invoice.lines || []).forEach((l) => {
    const party = parties && parties[l.id] === INV_PARTY_OWNER ? INV_PARTY_OWNER : INV_PARTY_CHARTERER;
    totals[party] += l.amountGBP;
    totals.total += l.amountGBP;
  });
  return totals;
}
/* "Wilkinson Drilling £3,410 · Stronach Subsea £3,890" — the settled summary. */
function invSplitSummary(invoice, parties, gbp) {
  const t = invSplitTotals(invoice, parties);
  return invoice.hire.chartererShort + ' ' + gbp(t.charterer) + ' · ' + invoice.hire.ownerShort + ' ' + gbp(t.owner);
}
/* Hydration is defensive: storage may hold an older shape or a hand-edited
   value; anything that is not a live invoice id mapped to a live allocation id
   — or, for a split invoice, a live line id mapped to a live party — is dropped
   rather than left to select an option that no longer exists. A split invoice
   is only restored when every one of its lines is accounted for, since a
   half-read split would show totals that do not add up to the invoice. */
function invReadDecisions(get) {
  const stored = get(INV_KEY_DECISIONS, {});
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
  const out = {};
  Object.keys(stored).forEach((k) => {
    const invoice = INV_INVOICES.find((i) => i.id === k);
    const value = stored[k];
    if (!invoice || !value || typeof value !== 'object') return;
    if (invoice.lines) {
      const lp = value.lineParties;
      if (!lp || typeof lp !== 'object' || Array.isArray(lp)) return;
      if (!invoice.lines.every((l) => INV_PARTIES.includes(lp[l.id]))) return;
      const clean = {};
      invoice.lines.forEach((l) => { clean[l.id] = lp[l.id]; });
      out[k] = { lineParties: clean };
      return;
    }
    if (invoice.allocations.some((a) => a.id === value.allocationId)) out[k] = { allocationId: value.allocationId };
  });
  return out;
}
/* Same treatment for ratings: a live job reference and a whole 1–5. */
function invReadRatings(get) {
  const stored = get(INV_KEY_RATINGS, {});
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
  const out = {};
  Object.keys(stored).forEach((k) => {
    const n = stored[k];
    if (INV_INVOICES.some((i) => i.jobRef === k) && typeof n === 'number' && n >= 1 && n <= 5) out[k] = Math.round(n);
  });
  return out;
}
function invRemove(k) { try { localStorage.removeItem('gac-connect:' + k); } catch (e) {} }
function invFocus(id) { setTimeout(() => { const el = document.getElementById(id); if (el) el.focus(); }, 0); }

(Component._features = Component._features || []).push({
  state() {
    const get = (k, d) => this._get(k, d);
    /* What each card has selected but not yet confirmed — the site holds this in
       the card's own useState, so it starts at the invoice's default and is not
       persisted. A split invoice starts on the charter terms. */
    const chosen = {};
    const lineParties = {};
    INV_INVOICES.forEach((i) => {
      if (i.lines) lineParties[i.id] = invDefaultParties(i);
      else chosen[i.id] = i.defaultAllocationId;
    });
    return {
      invDecisions: invReadDecisions(get),
      invRatings: invReadRatings(get),
      invChosen: chosen,
      invLineParties: lineParties
    };
  },

  vals(st) {
    const decisions = st.invDecisions || {};
    const ratings = st.invRatings || {};
    const chosen = st.invChosen || {};
    const lineParties = st.invLineParties || {};

    const awaiting = INV_INVOICES.filter((i) => invState(i.receivedDaysAgo, decisions[i.id]) === 'awaiting');
    const dirty = Object.keys(decisions).length > 0 || Object.keys(ratings).length > 0;
    /* The window that bites first among those still open — the one the dashboard leads with. */
    const tightest = awaiting.reduce((acc, i) => (acc === null || i.receivedDaysAgo > acc ? i.receivedDaysAgo : acc), null);

    /* store semantics (store/app.ts): a decision is written through on confirm,
       a rating on submit, and Reset demo clears both. */
    const recordDecision = (id, decision) => {
      const next = Object.assign({}, this.state.invDecisions, { [id]: decision });
      this._set(INV_KEY_DECISIONS, next);
      this.setState({ invDecisions: next });
    };
    const matchInvoice = (id, allocationId) => recordDecision(id, { allocationId: allocationId });
    const matchSplit = (id, parties) => recordDecision(id, { lineParties: Object.assign({}, parties) });
    const rateJob = (jobRef, stars) => {
      const clamped = Math.min(5, Math.max(1, Math.round(stars)));
      const next = Object.assign({}, this.state.invRatings, { [jobRef]: clamped });
      this._set(INV_KEY_RATINGS, next);
      this.setState({ invRatings: next });
    };

    const cards = INV_INVOICES.map((inv) => {
      const decision = decisions[inv.id];
      const state = invState(inv.receivedDaysAgo, decision);
      const split = !!inv.lines;
      const rated = ratings[inv.jobRef];
      const awaitingThis = state === 'awaiting';
      const tight = invDaysLeft(inv.receivedDaysAgo) <= 2;
      const supplier = inv.supplierId ? this.SUPPLIERS.find((s) => s.id === inv.supplierId) : null;
      /* A split invoice's working parties: what the card has selected while the
         window is open, and what was actually matched once it has closed. */
      const workingParties = split ? (lineParties[inv.id] || invDefaultParties(inv)) : null;
      const settledParties = split ? ((decision && decision.lineParties) || invDefaultParties(inv)) : null;
      const shownParties = split ? (awaitingThis ? workingParties : settledParties) : null;
      const appliedLabel = split
        ? invSplitSummary(inv, settledParties, (n) => this._gbp(n))
        : invAllocationLabel(inv, decision ? decision.allocationId : inv.defaultAllocationId);

      /* Countdown while the window is open; the outcome once it has closed. */
      const pill = state === 'matched'
        ? { style: invPill('verified'), label: split ? '✓ Matched to GA · split by line' : '✓ Matched to GA · ' + appliedLabel }
        : state === 'auto-matched'
          ? { style: invPill('neutral'), label: 'Matched to GA as it stood · window closed' }
          : { style: invPill(tight ? 'warn' : 'info'), label: invWindowLabel(inv.receivedDaysAgo) };

      const allocations = (inv.allocations || []).map((a) => ({
        id: a.id,
        label: a.label,
        inputId: 'alloc-' + inv.id + '-' + a.id,
        group: 'allocation-' + inv.id,
        checked: (chosen[inv.id] || inv.defaultAllocationId) === a.id,
        fromProfile: !!a.fromVesselProfile,
        onPick: () => this.setState({ invChosen: Object.assign({}, this.state.invChosen, { [inv.id]: a.id }) })
      }));

      /* One row per cost on a split invoice: what it was, when it fell, what it
         cost, and which of the two parties is carrying it. */
      const splitTotals = split ? invSplitTotals(inv, shownParties) : null;
      const setLineParty = (lineId, party) => {
        const cur = (this.state.invLineParties || {})[inv.id] || invDefaultParties(inv);
        const next = Object.assign({}, this.state.invLineParties, { [inv.id]: Object.assign({}, cur, { [lineId]: party }) });
        this.setState({ invLineParties: next });
      };
      const splitLines = split ? inv.lines.map((l) => {
        const party = shownParties[l.id];
        return {
          id: l.id,
          description: l.description,
          when: l.when,
          amount: this._gbp(l.amountGBP),
          partyLabel: party === INV_PARTY_OWNER ? inv.hire.ownerShort : inv.hire.chartererShort,
          /* Flagged when the client has moved a cost off the charter terms — the
             one thing an agent checking the disbursement needs to see at a glance. */
          moved: party !== l.defaultParty,
          options: [
            { party: INV_PARTY_CHARTERER, label: inv.hire.chartererShort },
            { party: INV_PARTY_OWNER, label: inv.hire.ownerShort }
          ].map((o) => ({
            label: o.label,
            inputId: 'party-' + inv.id + '-' + l.id + '-' + o.party,
            group: 'party-' + inv.id + '-' + l.id,
            ariaLabel: l.description + ' — bill to ' + o.label,
            checked: party === o.party,
            onPick: () => setLineParty(l.id, o.party)
          }))
        };
      }) : [];

      const stars = [1, 2, 3, 4, 5].map((n) => {
        const filled = rated !== undefined && n <= rated;
        return {
          n: String(n),
          glyph: '★',
          label: n + (n === 1 ? ' star' : ' stars'),
          pressed: filled ? 'true' : 'false',
          style: INV_STAR_BASE + (filled ? 'color:#9A7B14;' : 'color:#CBD6E2;'),
          onRate: () => {
            rateJob(inv.jobRef, n);
            /* Illustrative: the live rating would absorb this submission; the
               demo roster itself is never mutated. */
            const line = supplier
              ? supplier.rating.toFixed(1) + ' ★ · ' + (supplier.ratingCount + 1) + ' ratings'
              : n.toFixed(1) + ' ★ · 1 rating';
            this.toastMsg('Rating recorded — ' + inv.supplierName + ' now shows ' + line + '. Thirty seconds of agent time, fed straight into the live rating.');
          }
        };
      });

      return {
        id: inv.id,
        state: state,
        testId: 'invoice-' + inv.id,
        refLine: inv.id + ' · ' + inv.poRef + ' · Job ' + inv.jobRef,
        supplierName: inv.supplierName,
        /* Only a marketplace supplier has a profile to open; the harbour has none. */
        linkedSupplier: !!inv.supplierId,
        plainSupplier: !inv.supplierId,
        openSupplier: () => { if (inv.supplierId) this.nav('supplier/' + inv.supplierId); },
        serviceLine: inv.service + ' · ' + inv.vessel,
        amount: this._gbp(inv.amountGBP),
        pillStyle: pill.style,
        pillLabel: pill.label,
        rows: [
          { k: 'Vessel', v: inv.vessel },
          { k: 'Job reference', v: inv.jobRef + ' · ' + inv.poRef },
          { k: 'Service confirmation', v: inv.serviceConfirmed },
          { k: 'Invoice received', v: inv.receivedDaysAgo + (inv.receivedDaysAgo === 1 ? ' day' : ' days') + ' ago' }
        ],
        awaiting: awaitingThis,
        settled: !awaitingThis,
        legendId: 'allocation-legend-' + inv.id,
        allocTitle: split ? 'Split at the off-hire' : 'Billing party',
        allocIntro: split
          ? inv.hire.note
          : 'Allocate this invoice before it matches. The split held on the GA vessel profile is pre-selected.',
        /* split-by-line block — the table stays on screen once matched, read
           only, because what went to whom is the thing the client comes back to
           check on a disbursement */
        hasSplit: split,
        splitEditable: split && awaitingThis,
        splitLocked: split && !awaitingThis,
        hasAllocations: !split,
        settledTitle: split ? 'Split by line:' : 'Billing party:',
        hireHeadline: split ? inv.hire.headline : '',
        splitLines: splitLines,
        splitChartererLabel: split ? inv.hire.chartererLabel : '',
        splitOwnerLabel: split ? inv.hire.ownerLabel : '',
        splitChartererTotal: split ? this._gbp(splitTotals.charterer) : '',
        splitOwnerTotal: split ? this._gbp(splitTotals.owner) : '',
        splitTotal: split ? this._gbp(splitTotals.total) : '',
        allocations: allocations,
        matchTestId: 'match-' + inv.id,
        confirmHint: split
          ? 'Both parties are applied against ' + inv.poRef + ' in GAC Agent, line by line — no second invoice, and nothing re-keyed'
          : 'Matches in GAC Agent against ' + inv.poRef + ' under the billing party you choose',
        confirm: () => {
          if (split) {
            const parties = (this.state.invLineParties || {})[inv.id] || invDefaultParties(inv);
            const t = invSplitTotals(inv, parties);
            matchSplit(inv.id, parties);
            this.toastMsg(inv.id + ' matched to GA — ' + inv.hire.chartererShort + ' ' + this._gbp(t.charterer) + ', ' + inv.hire.ownerShort + ' ' + this._gbp(t.owner) + ', split by line against ' + inv.poRef + '; changes from here carry an administrative fee at published rates.', 'GA');
            return;
          }
          const pick = (this.state.invChosen || {})[inv.id] || inv.defaultAllocationId;
          matchInvoice(inv.id, pick);
          this.toastMsg(inv.id + ' matched to GA — ' + invAllocationLabel(inv, pick) + '. Billing party applied against ' + inv.poRef + '; changes from here carry an administrative fee at published rates.', 'GA');
        },
        appliedLabel: appliedLabel,
        asReceived: state === 'auto-matched',
        poRef: inv.poRef,
        showAdminFee: invCarriesAdminFee(state),
        /* You rate a supplier you booked; you do not rate the harbour. */
        rateable: inv.rateable !== false,
        rateTitle: 'Rate ' + inv.supplierName + ' for this job',
        rateGroupLabel: 'Rate ' + inv.supplierName + ' for job ' + inv.jobRef,
        rated: rated !== undefined,
        notRated: rated === undefined,
        ratedLabel: rated !== undefined ? 'You rated this job ' + rated + ' ★' : '',
        stars: stars
      };
    });

    return {
      invBtnPrimary: INV_BTN_PRIMARY,
      invPillInfo: invPill('info'),
      invRules: INV_RULES,
      invCountLabel: 'Supplier invoices · ' + INV_INVOICES.length,
      invAwaitingLabel: awaiting.length === 0
        ? 'Nothing awaiting your review'
        : awaiting.length + ' awaiting your review · ' + (INV_INVOICES.length - awaiting.length) + ' matched',
      invCards: cards,
      invDirty: dirty,
      invReset: () => {
        invRemove(INV_KEY_DECISIONS);
        invRemove(INV_KEY_RATINGS);
        const chosenReset = {};
        const partiesReset = {};
        INV_INVOICES.forEach((i) => {
          if (i.lines) partiesReset[i.id] = invDefaultParties(i);
          else chosenReset[i.id] = i.defaultAllocationId;
        });
        this.setState({ invDecisions: {}, invRatings: {}, invChosen: chosenReset, invLineParties: partiesReset });
        invFocus('invoices-list');
      },

      /* dashboard card — the site's seven-day-window card, same numbers */
      dashInvAwaiting: awaiting.length > 0,
      dashInvLine: awaiting.length === 0
        ? 'No invoices awaiting your review.'
        : awaiting.length + (awaiting.length === 1 ? ' invoice' : ' invoices') + ' awaiting your review',
      dashInvTail: awaiting.length === 0
        ? ' Everything received has matched in GAC Agent.'
        : ' — allocate the billing party before the window closes.',
      dashInvTightest: tightest !== null,
      dashInvTightestStyle: invPill(tightest !== null && invDaysLeft(tightest) <= 2 ? 'warn' : 'info'),
      dashInvTightestLabel: tightest !== null ? invWindowLabel(tightest) : ''
    };
  },

  escape() { return false; }
});
