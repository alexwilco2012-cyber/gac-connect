/* Invoices — presenter mirror of the site's Invoice review screen (v12 §5).
   Feature module: registers state / bindings / Escape handling with the core
   Component via Component._features (see component.js "feature-module
   extension points"). Ports src/lib/invoices.ts (the seven-day window, state
   derivation, admin-fee rule), src/data/invoices.ts (the three fictional
   invoices and the rules strip) and the invoice slice of src/store/app.ts
   (invoiceDecisions, jobRatings, resetInvoices) so the demo behaves exactly
   like the site. Storage keys are prefixed 'pres.' so they never collide with
   the site's own stores on the same origin.

   The client persona never sees the supplier-side mechanics behind an invoice
   — the plan, the band, or what is deducted when it matches (17 Aug review):
   none of it is in this module. Every figure here is illustrative. */

/* ── the window (lib/invoices.ts) ── */
const INV_REVIEW_WINDOW_DAYS = 7;

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
  }
];

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
/* Hydration is defensive: storage may hold an older shape or a hand-edited
   value; anything that is not a live invoice id mapped to a live allocation id
   is dropped rather than left to select an option that no longer exists. */
function invReadDecisions(get) {
  const stored = get(INV_KEY_DECISIONS, {});
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
  const out = {};
  Object.keys(stored).forEach((k) => {
    const invoice = INV_INVOICES.find((i) => i.id === k);
    const value = stored[k];
    if (!invoice || !value || typeof value !== 'object') return;
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
    /* The allocation each card has selected but not yet confirmed — the site
       holds this in the card's own useState, so it starts at the invoice's
       default and is not persisted. */
    const chosen = {};
    INV_INVOICES.forEach((i) => { chosen[i.id] = i.defaultAllocationId; });
    return {
      invDecisions: invReadDecisions(get),
      invRatings: invReadRatings(get),
      invChosen: chosen
    };
  },

  vals(st) {
    const decisions = st.invDecisions || {};
    const ratings = st.invRatings || {};
    const chosen = st.invChosen || {};

    const awaiting = INV_INVOICES.filter((i) => invState(i.receivedDaysAgo, decisions[i.id]) === 'awaiting');
    const dirty = Object.keys(decisions).length > 0 || Object.keys(ratings).length > 0;
    /* The window that bites first among those still open — the one the dashboard leads with. */
    const tightest = awaiting.reduce((acc, i) => (acc === null || i.receivedDaysAgo > acc ? i.receivedDaysAgo : acc), null);

    /* store semantics (store/app.ts): a decision is written through on confirm,
       a rating on submit, and Reset demo clears both. */
    const matchInvoice = (id, allocationId) => {
      const next = Object.assign({}, this.state.invDecisions, { [id]: { allocationId: allocationId } });
      this._set(INV_KEY_DECISIONS, next);
      this.setState({ invDecisions: next });
    };
    const rateJob = (jobRef, stars) => {
      const clamped = Math.min(5, Math.max(1, Math.round(stars)));
      const next = Object.assign({}, this.state.invRatings, { [jobRef]: clamped });
      this._set(INV_KEY_RATINGS, next);
      this.setState({ invRatings: next });
    };

    const cards = INV_INVOICES.map((inv) => {
      const decision = decisions[inv.id];
      const state = invState(inv.receivedDaysAgo, decision);
      const appliedLabel = invAllocationLabel(inv, decision ? decision.allocationId : inv.defaultAllocationId);
      const rated = ratings[inv.jobRef];
      const awaitingThis = state === 'awaiting';
      const tight = invDaysLeft(inv.receivedDaysAgo) <= 2;
      const supplier = this.SUPPLIERS.find((s) => s.id === inv.supplierId);

      /* Countdown while the window is open; the outcome once it has closed. */
      const pill = state === 'matched'
        ? { style: invPill('verified'), label: '✓ Matched to GA · ' + appliedLabel }
        : state === 'auto-matched'
          ? { style: invPill('neutral'), label: 'Matched to GA as it stood · window closed' }
          : { style: invPill(tight ? 'warn' : 'info'), label: invWindowLabel(inv.receivedDaysAgo) };

      const allocations = inv.allocations.map((a) => ({
        id: a.id,
        label: a.label,
        inputId: 'alloc-' + inv.id + '-' + a.id,
        group: 'allocation-' + inv.id,
        checked: (chosen[inv.id] || inv.defaultAllocationId) === a.id,
        fromProfile: !!a.fromVesselProfile,
        onPick: () => this.setState({ invChosen: Object.assign({}, this.state.invChosen, { [inv.id]: a.id }) })
      }));

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
        openSupplier: () => this.nav('supplier/' + inv.supplierId),
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
        allocations: allocations,
        matchTestId: 'match-' + inv.id,
        confirmHint: 'Matches in GAC Agent against ' + inv.poRef + ' under the billing party you choose',
        confirm: () => {
          const pick = (this.state.invChosen || {})[inv.id] || inv.defaultAllocationId;
          matchInvoice(inv.id, pick);
          this.toastMsg(inv.id + ' matched to GA — ' + invAllocationLabel(inv, pick) + '. Billing party applied against ' + inv.poRef + '; changes from here carry an administrative fee at published rates.', 'GA');
        },
        appliedLabel: appliedLabel,
        asReceived: state === 'auto-matched',
        poRef: inv.poRef,
        showAdminFee: invCarriesAdminFee(state),
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
        INV_INVOICES.forEach((i) => { chosenReset[i.id] = i.defaultAllocationId; });
        this.setState({ invDecisions: {}, invRatings: {}, invChosen: chosenReset });
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
