/* Supplier desk (live dashboards, 23 Sep 2026, task T9).

   The deck's supplier view of the dashboard (spec sections 3 and 4.4),
   ported from the site's src/screens/app/dashboard/SupplierView.tsx and
   dashboard/supplier/*: the standing pills under the name, four KPI tiles,
   the quote inbox with its pipeline and the quote modal, earnings through
   the platform, the certificates with a real (simulated) upload to the SVS
   team, the plan, recent ratings, how the listing reads and the way into
   analytics. Same copy, same figures, same order as the site.

   Owner: T9 · binding prefix sd* · partials 41-dashboard.html (supplier
   view), 75-cert-modal.html and 76-quote-modal.html.
   Shared state lives in desk-state.js: st.dkEvidence and st.dkQuotes,
   changed only through this._dkSubmitEvidence(…) and this._dkSendQuote(…);
   the rows come from DK_vaultRows(DK.SILVER_CITY_VAULT, st.dkEvidence,
   DK.DEMO_SUPPLIER_ID). The two modal drafts (st.sdQuote, st.sdCert) are
   this module's own and never persisted.

   The file input is uncontrolled: its value is never bound, the chosen
   file's name and size are read in the change (or drop) handler, and the
   file itself is never read or stored. Nothing leaves the browser.

   This is the one view where the plan and the commission band appear; the
   client view never renders any of it. Uses CD_icon, CD_pill and CD_tile from
   client-desk.js. Script-scope rules: every top-level name here starts with
   SD; no less-than character inside a string literal. */

const SD_NOTE_MAX = 280;
const SD_ADD_ID = 'sd-add-certificate';
/* The deck's roster only knows Premium (premium: true) or not; the site's
   plans.ts, for the plan card and the earnings band. */
const SD_PLAN = { name: 'Premium', priceLine: '£1,800', perLine: 'per year', band: 10 };
const SD_MONTH_NAMES = {
  Apr: 'April',
  May: 'May',
  Jun: 'June',
  Jul: 'July',
  Aug: 'August',
  Sep: 'September',
};
const SD_KPI_ICONS = { views: 'eye', requests: 'inbox', win: 'trending-up', response: 'timer' };
const SD_GLYPH = { verified: '✓', warn: '⚠', danger: '✗', info: '' };

const SD_BTN_GHOST =
  'display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;box-sizing:border-box;' +
  'background:#FFFFFF;color:#0E5E8A;border:1.5px solid #CBD6E2;border-radius:8px;padding:8px 16px;' +
  'font-weight:700;font-size:13.5px;cursor:pointer;font-family:inherit;transition:border-color .15s,color .15s;';

/* The site's lib/commission: the band comes off at invoice matching. */
function SD_due(amount) {
  return Math.round((amount * SD_PLAN.band) / 100);
}
function SD_keeps(amount) {
  return amount - SD_due(amount);
}

function SD_count(n) {
  return Number(n).toLocaleString('en-GB');
}

/* A step as a share of the one before: one decimal under 20%. */
function SD_rate(from, to) {
  const pct = from ? (to / from) * 100 : 0;
  return pct >= 20 ? Math.round(pct) + '%' : pct.toFixed(1) + '%';
}

function SD_statusPill(status) {
  if (status === 'blocked') return { label: '✗ Booking blocked', style: CD_pill('danger') };
  if (status === 'due') return { label: '⚠ Renewal due', style: CD_pill('warn') };
  return { label: '✓ GAC Verified', style: CD_pill('verified') };
}

/* Whole pounds above zero; "2,450" and "£2450" both read as 2450. */
function SD_priceProblem(raw) {
  const cleaned = String(raw || '').replace(/[£,\s]/g, '');
  if (!cleaned) return 'price';
  if (!/^\d+$/.test(cleaned) || Number(cleaned) <= 0) return 'a price in whole pounds, above £0';
  return null;
}

/* 'CW-26-0418' to 'CW-26-0419': the next certificate number from the same issuer. */
function SD_nextReference(ref) {
  const m = /^(.*?)(\d+)$/.exec(ref);
  if (!m) return ref + '-R';
  return m[1] + String(Number(m[2]) + 1).padStart(m[2].length, '0');
}

function SD_vault(id) {
  return DK.SILVER_CITY_VAULT.find((v) => v.id === id) || null;
}

/* A renewal is made out against the certificate in force: an approved
   renewal, if any (the site's Certificates renewFor, via certInForce). */
function SD_inForce(id, evidence) {
  const v = SD_vault(id);
  return v ? DK_certInForce(v, evidence, DK.DEMO_SUPPLIER_ID) : null;
}

/* The form each way in starts from (the site's initialForm). */
function SD_initialForm(mode, evidence) {
  const empty = Object.assign({}, DK.EMPTY_CERT_FORM);
  if (mode.kind === 'renewal') {
    const v = SD_vault(mode.vaultId);
    return Object.assign(empty, { certType: v ? v.name : '' });
  }
  if (mode.kind === 'reupload') {
    const s = evidence.find((e) => e.id === mode.submissionId);
    if (!s) return empty;
    return Object.assign(empty, {
      certType: s.certType,
      otherLabel: s.certType === 'Other' ? s.certLabel : '',
      issuer: s.issuer,
      reference: s.reference,
      issuedOn: s.issuedOn,
      expiresOn: s.expiresOn,
    });
  }
  return Object.assign(empty, { certType: mode.presetType || '' });
}

/* "Fill with an example", dated from `today` (read in the button's
   handler), so the form never refuses its own example as expired: the
   ISO 9001 the listing is missing; for a renewal, the same issuer and the
   next reference, issued two days before today for the certificate's usual
   term; for a re-upload, a clear scan of the same one. */
function SD_exampleFor(mode, current, evidence, today) {
  if (mode.kind === 'renewal') {
    const v = SD_inForce(mode.vaultId, evidence);
    if (!v) return DK_exampleCertForm(today);
    const years = Math.max(1, Number(v.expiresOn.slice(0, 4)) - Number(v.issuedOn.slice(0, 4)));
    const reference = SD_nextReference(v.reference);
    const issuedOn = DK_shiftISO(today, { days: -2 });
    return Object.assign({}, DK.EMPTY_CERT_FORM, {
      certType: v.name,
      issuer: v.issuer,
      reference: reference,
      issuedOn: issuedOn,
      expiresOn: DK_shiftISO(issuedOn, { years: years, days: -1 }),
      fileName: reference + '.pdf',
      fileSize: 312 * 1024,
      declared: true,
    });
  }
  if (mode.kind === 'reupload') {
    const base = SD_initialForm(mode, evidence);
    const s = evidence.find((e) => e.id === mode.submissionId);
    return Object.assign(base, {
      fileName: (s ? s.reference : 'certificate') + '-clear-scan.pdf',
      fileSize: 356 * 1024,
      declared: true,
      issuer: current.issuer || base.issuer,
      reference: current.reference || base.reference,
    });
  }
  return DK_exampleCertForm(today);
}

/* Told the moment a file is chosen; the send would refuse it anyway. */
function SD_fileProblem(name, size) {
  if (!name) return null;
  if (!DK_hasAcceptedExtension(name)) {
    return 'This file is not a PDF, JPG or PNG. Choose another file.';
  }
  if (size > DK.MAX_FILE_BYTES) {
    return 'This file is ' + DK_fileSizeLabel(size) + '; the limit is 10 MB.';
  }
  return null;
}

/* What a screen reader hears for a certificate's days-left bar. */
function SD_barLabel(row) {
  const date = DK_formatDateGB(row.expiresOn);
  if (row.state === 'lapsed') return row.name + ': lapsed on ' + date;
  if (row.state === 'pending') {
    return (
      row.name + ': awaiting SVS review; ' + (row.daysLeft || 0) + ' days to its expiry on ' + date
    );
  }
  if (row.daysLeft === null) return row.name + ': ' + row.statusLabel.toLowerCase();
  return row.name + ': ' + row.daysLeft + ' days left, expires ' + date;
}

/* A small bullet: sea fill (or a sea dot, when lower is better) and an ink
   tick for the category average (the site's SupplierKpis MiniBenchmark). */
function SD_miniBenchmark(p) {
  const h = React.createElement;
  const at = (v) => Math.max(0, Math.min(100, (v / p.max) * 100)) + '%';
  const abs = { position: 'absolute', display: 'block' };
  return h(
    'div',
    { role: 'img', 'aria-label': p.label },
    h(
      'div',
      { style: { position: 'relative', height: '14px' } },
      h('span', {
        style: Object.assign({}, abs, {
          left: 0,
          right: 0,
          top: '4px',
          height: '6px',
          borderRadius: '999px',
          background: VZ.C.track,
        }),
      }),
      p.lowerIsBetter
        ? h('span', {
            style: Object.assign({}, abs, {
              top: '1px',
              left: at(p.value),
              width: '12px',
              height: '12px',
              transform: 'translateX(-50%)',
              borderRadius: '999px',
              background: VZ.C.sea,
              boxShadow: '0 0 0 2px #FFFFFF',
            }),
          })
        : h('span', {
            style: Object.assign({}, abs, {
              top: '4px',
              left: 0,
              height: '6px',
              width: at(p.value),
              borderRadius: '999px',
              background: VZ.C.sea,
            }),
          }),
      h('span', {
        style: Object.assign({}, abs, {
          top: 0,
          left: at(p.benchmark),
          width: '2px',
          height: '14px',
          transform: 'translateX(-50%)',
          borderRadius: '999px',
          background: VZ.C.ref,
          boxShadow: '0 0 0 2px #FFFFFF',
        }),
      }),
    ),
    h(
      'p',
      {
        style: {
          margin: '6px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '8px',
          fontSize: '11.5px',
          lineHeight: 1,
          color: '#33475F',
        },
      },
      h('span', null, 'Category average'),
      h(
        'span',
        { style: { fontWeight: 600, color: '#0A2540', fontVariantNumeric: 'tabular-nums' } },
        p.benchText,
      ),
    ),
  );
}

/* Earnings through the platform (site: supplier/Earnings.tsx). */
function SD_earnings() {
  const h = React.createElement;
  const bandLabel = SD_PLAN.band + '% ' + SD_PLAN.name + ' band';
  const months = DK.EARNINGS_MONTHS.slice();
  const won = DK.EARNINGS_WON.slice();
  const kept = won.map(SD_keeps);
  const band = won.map((w, i) => w - kept[i]);
  const wonTotal = CD_sum(won);
  const keptTotal = CD_sum(kept);
  const best = won.indexOf(Math.max.apply(null, won));
  const bestMonth = SD_MONTH_NAMES[months[best]] || months[best] || '';
  return VZ.figure({
    title: 'Earnings through the platform',
    subtitle: 'Work won through GAC Connect, and what you keep after your band',
    takeaway:
      VZ.gbp(keptTotal) +
      ' kept of ' +
      VZ.gbp(wonTotal) +
      ' won from April to September 2026; ' +
      bestMonth +
      ' was the strongest month at ' +
      VZ.gbp(won[best] || 0) +
      ' won.',
    headline: h(
      'p',
      {
        style: {
          margin: 0,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          columnGap: '10px',
          rowGap: '2px',
        },
      },
      h(
        'span',
        {
          style: {
            fontFamily: "'Space Grotesk',sans-serif",
            fontSize: '22px',
            lineHeight: 1,
            fontWeight: 700,
            color: '#0A2540',
            fontVariantNumeric: 'tabular-nums',
          },
        },
        VZ.gbp(keptTotal) + ' kept',
      ),
      h(
        'span',
        { style: { fontSize: '13px', color: '#33475F', fontVariantNumeric: 'tabular-nums' } },
        'of ' + VZ.gbp(wonTotal) + ' won since April',
      ),
    ),
    legend: [
      { label: 'You keep', color: VZ.C.sea },
      { label: bandLabel, color: VZ.C.deduction },
    ],
    table: {
      caption: 'Work won, the ' + bandLabel + ' and what you keep, April to September 2026',
      columns: ['Month', 'Won', 'Band', 'You keep'],
      rows: months
        .map((m, i) => [m, VZ.gbp(won[i]), VZ.gbp(band[i]), VZ.gbp(kept[i])])
        .concat([['Total', VZ.gbp(wonTotal), VZ.gbp(wonTotal - keptTotal), VZ.gbp(keptTotal)]]),
    },
    footnote:
      'Illustrative figures. The band comes off when your invoice matches in GAC Agent; nothing is charged to the client.',
    children: VZ.stacked({
      categories: months,
      series: [
        { id: 'keep', label: 'You keep', color: VZ.C.sea, values: kept },
        { id: 'band', label: bandLabel, color: VZ.C.deduction, values: band },
      ],
      format: VZ.gbp,
      axisFormat: VZ.compactGbp,
      directLabelLast: true,
      ariaLabel:
        'Work won each month, April to September, split into what you keep and the ' + bandLabel,
    }),
  });
}

/* Where the work comes from (site: supplier/AnalyticsTeaser.tsx). */
function SD_teaser(openAnalytics) {
  const h = React.createElement;
  const s = DK.PERIOD_SUMMARY[30];
  const steps = [
    { label: 'Profile views', value: s.views },
    { label: 'Quote requests', value: s.requests },
    { label: 'Jobs won', value: s.won },
  ];
  const shortRates = [SD_rate(s.views, s.requests), SD_rate(s.requests, s.won)];
  const rates = [
    shortRates[0] + ' of views asked for a quote',
    shortRates[1] + ' of requests became a job',
  ];
  return VZ.figure({
    style: { flex: '1 1 auto' },
    title: 'Where the work comes from',
    subtitle: 'Views, quote requests, win rate and response time',
    takeaway:
      'Last 30 days: ' +
      SD_count(s.views) +
      ' profile views became ' +
      s.requests +
      ' quote requests and ' +
      s.won +
      ' jobs won.',
    table: {
      caption:
        'Profile views to jobs won, last 30 days, with each step as a share of the one before',
      columns: ['Step', 'Count', 'Rate'],
      rows: steps.map((st, i) => [st.label, SD_count(st.value), i ? shortRates[i - 1] : '—']),
    },
    children: [
      h(
        'p',
        { key: 'p', style: { margin: '-4px 0 8px', fontSize: '12px', color: '#33475F' } },
        'Last 30 days',
      ),
      h(
        'div',
        { key: 'f' },
        VZ.funnel({
          steps: steps,
          format: SD_count,
          rateLabels: rates,
          ariaLabel: 'Profile views to quote requests to jobs won, last 30 days',
        }),
      ),
      h(
        'p',
        { key: 'c', style: { margin: '12px 0 0', fontSize: '12.5px', color: '#33475F' } },
        'Views, quote requests and win rate come with Professional; Premium adds market benchmarking.',
      ),
      h(
        'div',
        { key: 'b', style: { marginTop: '12px' } },
        h(
          'button',
          {
            type: 'button',
            className: 'gac-sd-ghost gac-sd-phonefull',
            onClick: openAnalytics,
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              minHeight: '44px',
              boxSizing: 'border-box',
              background: '#FFFFFF',
              color: '#0E5E8A',
              border: '1.5px solid #CBD6E2',
              borderRadius: '8px',
              padding: '8px 16px',
              fontWeight: 700,
              fontSize: '13.5px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            },
          },
          CD_icon('bar-chart-3', 16),
          'Open analytics',
        ),
      ),
    ],
  });
}

/* After a modal closes, focus goes back to what opened it (the core's
   componentDidUpdate). If that went with the change (the "Add it" link, once
   ISO 9001 is sent), land on "Add a certificate" instead, as the site does. */
function SD_refocus() {
  const later = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : setTimeout;
  later(() => {
    const active = document.activeElement;
    if (!active || active === document.body) {
      const add = document.getElementById(SD_ADD_ID);
      if (add) add.focus();
    }
  });
}

/* ---------- registration ---------- */

(Component._features = Component._features || []).push({
  state() {
    /* the open modal's draft: never persisted, gone on Reset demo */
    return { sdQuote: null, sdCert: null };
  },

  vals(st) {
    const self = this;
    const h = React.createElement;
    const sup = this.SUPPLIERS.find((s) => s.id === DK.DEMO_SUPPLIER_ID);
    const onScreen = st.route === 'dashboard' && st.dashView === 'supplier';
    /* Left the supplier view with a dialog open (Back, the tour, the client
       switch): drop the draft after this render rather than during it, as
       svs-screen does. The site's modals unmount with the view, so a draft
       never outlives it there either. */
    if (!onScreen && (st.sdQuote || st.sdCert) && !this._sdTidyT) {
      this._sdTidyT = setTimeout(() => {
        this._sdTidyT = null;
        const s = this.state;
        if (!(s.route === 'dashboard' && s.dashView === 'supplier')) {
          this.setState({ sdQuote: null, sdCert: null });
        }
      }, 0);
    }
    const evidence = st.dkEvidence || [];
    const quotes = st.dkQuotes || {};
    const status = SD_statusPill(sup ? this.deriveStatus(sup) : 'verified');
    if (!this._sdFileRef) this._sdFileRef = React.createRef();

    /* ---- standing (under the name) ---- */
    const standing = [status];
    standing.push({ label: SD_PLAN.name + ' plan', style: CD_pill('neutral') });
    if (sup && sup.promoted) standing.push({ label: '▲ Promoted', style: CD_pill('promoted') });
    if (sup && sup.goldBand === 'held' && this.deriveStatus(sup) !== 'blocked') {
      /* the marque, once earned: gold as identity, never decoration */
      standing.push({
        label: '◆ GAC Gold Band',
        style: CD_pill('neutral') + 'background:#0A2540;color:#FFC72C;border:1px solid #C9A227;',
      });
    } else if (sup && sup.goldBand === 'scheduled') {
      standing.push({ label: 'Gold Band audit booked', style: CD_pill('neutral') });
    }

    /* ---- the four KPI tiles (same figures as analytics at 30 days) ---- */
    const s30 = DK.PERIOD_SUMMARY[30];
    const kpis = DK.SUPPLIER_KPIS.map((k) => {
      let foot = null;
      if (onScreen) {
        if (k.series && k.series.length > 1) foot = VZ.sparkline(k.series, { height: 36 });
        else if (k.id === 'win')
          foot = SD_miniBenchmark({
            value: s30.winRate,
            benchmark: s30.categoryWinRate,
            max: 100,
            benchText: s30.categoryWinRate + '%',
            label:
              'Win rate ' +
              s30.winRate +
              '%, against a category average of ' +
              s30.categoryWinRate +
              '%',
          });
        else
          foot = SD_miniBenchmark({
            value: s30.responseHrs,
            benchmark: s30.categoryResponseHrs,
            max: 8,
            lowerIsBetter: true,
            benchText: s30.categoryResponseHrs + ' hrs',
            label:
              'Average response ' +
              s30.responseHrs +
              ' hours, against a category average of ' +
              s30.categoryResponseHrs +
              ' hours',
          });
      }
      return {
        label: k.label,
        value: k.value,
        delta: k.delta,
        icon: CD_icon(SD_KPI_ICONS[k.id], 14, { style: { color: '#0E5E8A' } }),
        foot: foot,
      };
    });

    /* ---- quote requests: the pipeline and the inbox ---- */
    const inbox = DK.SUPPLIER_INBOX;
    const unanswered = inbox.filter((r) => !quotes[r.id]).length;
    const quoted = DK.AWAITING_QUOTES.length + (inbox.length - unanswered);
    const openQuote = (r) => () => {
      if (self.state.dkQuotes && self.state.dkQuotes[r.id]) return;
      self.setState({
        sdQuote: {
          id: r.id,
          price: '',
          leadTime: DK.LEAD_TIMES[1],
          validity: DK.VALIDITY[1],
          note: '',
          tried: false,
        },
      });
    };
    const inboxRows = inbox.map((r, i) => {
      const sent = quotes[r.id];
      return {
        id: r.id,
        service: r.service,
        sub: r.vessel + ' · ' + r.detail,
        sent: !!sent,
        open: !sent,
        rowStyle:
          'display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;column-gap:16px;row-gap:12px;padding:16px 0;' +
          (i < inbox.length - 1 ? 'border-bottom:1px solid #E5EAF1;' : ''),
        tileStyle:
          CD_tile(36, sent ? '#E7F4EF' : '#E8F1F7', sent ? '#047857' : '#0E5E8A') +
          'margin-top:2px;',
        tileIcon: CD_icon(sent ? 'circle-check' : 'message-square-quote', 18),
        pillLabel: sent ? 'Quoted ' + VZ.gbp(sent.amountGbp) + ' · awaiting client' : r.replyBy,
        pillStyle: CD_pill(sent ? 'info' : r.tone),
        pillIcon: !sent && r.tone === 'warn' ? CD_icon('clock', 12) : null,
        /* the ID in its own nowrap span, so it never breaks at its hyphen */
        refId: r.id.toUpperCase(),
        refTail: sent ? ' · ' + sent.leadTime + ' · valid ' + sent.validity : '',
        btnLabel: sent ? 'Quote sent' : 'Send a quote',
        btnIcon: CD_icon(sent ? 'check' : 'send', 16),
        btnSr: ' for ' + r.service,
        btnDisabled: sent ? 'true' : null,
        btnStyle:
          SD_BTN_GHOST +
          'min-width:148px;' +
          (sent ? 'border-color:#E5EAF1;color:#047857;cursor:default;' : ''),
        onQuote: openQuote(r),
      };
    });
    const awaiting = DK.AWAITING_QUOTES.map((q, i) => ({
      service: q.service,
      vessel: q.vessel,
      id: q.id.toUpperCase(),
      amount: VZ.gbp(q.amountGbp),
      sentLabel: q.sentLabel,
      rowStyle:
        'display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:10px 14px;' +
        (i > 0 ? 'border-top:1px solid #E5EAF1;' : ''),
    }));

    /* ---- the quote modal ---- */
    const q = st.sdQuote;
    const qReq = q ? inbox.find((r) => r.id === q.id) : null;
    const qOpen = !!(q && qReq) && onScreen;
    const qProblem = q && q.tried ? SD_priceProblem(q.price) : null;
    const patchQuote = (p) => {
      const cur = self.state.sdQuote;
      if (cur) self.setState({ sdQuote: Object.assign({}, cur, p) });
    };
    const closeQuote = () => self.setState({ sdQuote: null });

    /* ---- certificates ---- */
    const rows = DK_vaultRows(DK.SILVER_CITY_VAULT, evidence, DK.DEMO_SUPPLIER_ID);
    const openCert = (mode) => () =>
      self.setState({
        sdCert: {
          mode: mode,
          form: SD_initialForm(mode, self.state.dkEvidence || []),
          tried: false,
          problems: [],
          dragging: false,
        },
      });
    const certRows = rows.map((row, i) => {
      const showExpiry = row.daysLeft !== null || row.state === 'lapsed';
      const renew = row.vaultId ? openCert({ kind: 'renewal', vaultId: row.vaultId }) : null;
      const sub =
        !row.vaultId && (row.state === 'info' || row.state === 'rejected')
          ? evidence.find((e) => e.id === row.submissionId)
          : null;
      const reupload = sub ? openCert({ kind: 'reupload', submissionId: sub.id }) : null;
      const action = renew || reupload;
      return {
        name: row.name,
        issuer: row.issuer + ' · ',
        reference: row.reference,
        showExpiry: showExpiry,
        expires: 'Expires ' + DK_formatDateGB(row.expiresOn),
        bar:
          showExpiry && onScreen
            ? VZ.expiry({
                daysLeft: row.daysLeft,
                state: row.state,
                scale: i === 0,
                label: SD_barLabel(row),
              })
            : null,
        statusLabel: row.statusLabel,
        statusStyle: CD_pill(row.statusTone),
        statusGlyph: SD_GLYPH[row.statusTone] || '',
        statusHasGlyph: !!SD_GLYPH[row.statusTone],
        statusClock: row.statusTone === 'info' ? CD_icon('clock', 12) : null,
        hasAction: !!action,
        action: action,
        actionLabel: renew ? 'Upload renewal' : 'Re-upload',
        actionSr: ' for ' + row.name,
        actionIcon: CD_icon('upload', 14),
        hasNote: !!row.note,
        note: row.note || '',
        noteStyle:
          'margin:8px 0 0;border-radius:8px;border-left:4px solid;padding:8px 12px;font-size:12.5px;color:#0A2540;' +
          (row.statusTone === 'danger'
            ? 'border-color:#B91C1C;background:#FBEAEA;'
            : 'border-color:#A84D08;background:#FBF0E1;'),
        rowStyle:
          'padding:' +
          (i === 0 ? '12px' : '16px') +
          ' 0 ' +
          (i === rows.length - 1 ? '4px' : '16px') +
          ';' +
          (i > 0 ? 'border-top:1px solid #E5EAF1;' : ''),
      };
    });
    const rec = DK_recommendedStatus(rows);
    const firstMissing = rec.missing[0];
    const segments = [];
    for (let i = 0; i < rec.total; i += 1) {
      segments.push({
        style:
          'display:block;height:6px;flex:1 1 0;border-radius:999px;background:' +
          (i < rec.onFile
            ? '#0E5E8A'
            : i < rec.onFile + rec.pending.length
              ? '#A8CFE9'
              : '#CBD6E2') +
          ';',
      });
    }

    /* ---- the certificate modal ---- */
    const c = st.sdCert;
    const cOpen = !!c && onScreen;
    const mode = c ? c.mode : { kind: 'new' };
    const form = c ? c.form : DK.EMPTY_CERT_FORM;
    /* "In force now" names the approved renewal, once there is one */
    const cVault = mode.kind === 'renewal' ? SD_inForce(mode.vaultId, evidence) : null;
    const cSub =
      mode.kind === 'reupload' ? evidence.find((e) => e.id === mode.submissionId) || null : null;
    const locked = mode.kind !== 'new';
    const lockedLabel = cVault ? cVault.name : cSub ? cSub.certLabel : '';
    const certTitle =
      mode.kind === 'renewal'
        ? 'Upload a renewal: ' + lockedLabel
        : mode.kind === 'reupload'
          ? 'Re-upload: ' + lockedLabel
          : 'Add a certificate';
    let certLede = 'The SVS team checks it with the issuer before it shows on your listing.';
    if (mode.kind === 'renewal' && cVault) {
      certLede =
        'In force now: ' +
        cVault.issuer +
        ' · ' +
        cVault.reference +
        ', expires ' +
        DK_formatDateGB(cVault.expiresOn) +
        '. It stays in force while the SVS team reviews the renewal.';
    } else if (mode.kind === 'reupload') {
      certLede =
        cSub && cSub.note
          ? ['The SVS team asked: ', h('q', { key: 'q', style: { color: '#0A2540' } }, cSub.note)]
          : 'Send the certificate again with the corrected file.';
    }
    const fileProblem = SD_fileProblem(form.fileName, form.fileSize);
    const replaceForm = (next) => {
      const cur = self.state.sdCert;
      if (!cur) return;
      self.setState({
        sdCert: Object.assign({}, cur, {
          form: next,
          problems: cur.tried ? DK_validateCertForm(next, DK_todayISO()) : cur.problems,
        }),
      });
    };
    const patchForm = (p) => {
      const cur = self.state.sdCert;
      if (cur) replaceForm(Object.assign({}, cur.form, p));
    };
    const setDragging = (on) => {
      const cur = self.state.sdCert;
      if (cur && cur.dragging !== on)
        self.setState({ sdCert: Object.assign({}, cur, { dragging: on }) });
    };
    const closeCert = () => {
      self.setState({ sdCert: null });
      SD_refocus();
    };
    const dragging = !!(c && c.dragging);

    return {
      /* standing and tiles */
      sdStanding: standing,
      sdKpis: kpis,

      /* quote requests */
      sdPipelineNew: String(unanswered),
      sdPipelineQuoted: String(quoted),
      sdPipelineWon: String(DK.WON_THIS_MONTH),
      sdIconInbox: CD_icon('inbox', 14, { style: { color: '#0E5E8A' } }),
      sdIconSend: CD_icon('send', 14, { style: { color: '#0E5E8A' } }),
      sdIconWon: CD_icon('badge-check', 14, { style: { color: '#0E5E8A' } }),
      sdInbox: inboxRows,
      sdAwaiting: awaiting,

      /* earnings */
      sdEarnings: onScreen ? SD_earnings() : null,

      /* certificates */
      sdStatusLabel: status.label,
      sdStatusStyle: status.style,
      sdAddIcon: CD_icon('file-plus', 17),
      sdAddCert: openCert({ kind: 'new' }),
      sdCertRows: certRows,
      sdRecShow: rec.onFile !== rec.total,
      sdRecCount: rec.onFile + ' of ' + rec.total + ' on file',
      sdRecMeterLabel:
        rec.onFile +
        ' of ' +
        rec.total +
        ' recommended certificates on file' +
        (rec.pending.length ? ', ' + rec.pending.length + ' awaiting review' : ''),
      sdRecSegments: segments,
      sdRecMissing: rec.missing.length > 0,
      sdRecMissingNames: rec.missing.join(' and '),
      sdRecMissingTail: rec.pending.length ? '; ' : '.',
      sdRecPending: rec.pending.length > 0,
      sdRecPendingNames: rec.pending.join(' and '),
      sdRecAdd: !!firstMissing,
      sdRecAddSr: firstMissing ? ' — ' + firstMissing : '',
      sdRecAddGo: firstMissing
        ? openCert(
            DK.CERT_TYPES.includes(firstMissing)
              ? { kind: 'new', presetType: firstMissing }
              : { kind: 'new' },
          )
        : null,
      sdRecAddIcon: CD_icon('file-plus', 14),

      /* plan: the one card that names the band */
      sdPlanSubtitle: SD_PLAN.name + ' · ' + SD_PLAN.priceLine + ' ' + SD_PLAN.perLine,
      sdPlanBand: SD_PLAN.band + '% commission',
      sdPlanJob: 'A ' + VZ.gbp(DK.EXAMPLE_JOB_GBP) + ' job won through the platform',
      sdPlanKeeps: VZ.gbp(SD_keeps(DK.EXAMPLE_JOB_GBP)),
      sdPlanSplitLabel:
        'Of ' +
        VZ.gbp(DK.EXAMPLE_JOB_GBP) +
        ', ' +
        VZ.gbp(SD_keeps(DK.EXAMPLE_JOB_GBP)) +
        ' is yours and ' +
        VZ.gbp(SD_due(DK.EXAMPLE_JOB_GBP)) +
        ' is the ' +
        SD_PLAN.band +
        '% band',
      sdPlanKeptStyle:
        'display:block;height:100%;background:#0E5E8A;width:' +
        (SD_keeps(DK.EXAMPLE_JOB_GBP) / DK.EXAMPLE_JOB_GBP) * 100 +
        '%;',
      sdPlanYours: 'yours, after the ' + SD_PLAN.band + '% ' + SD_PLAN.name + ' band',
      sdPlanDue: VZ.gbp(SD_due(DK.EXAMPLE_JOB_GBP)) + ' band',

      /* the listing, the ratings, the way into analytics */
      sdMonogram: sup ? this._monogram(sup.name) : '',
      sdName: sup ? sup.name : '',
      sdPromoted: !!(sup && sup.promoted),
      sdScore: sup ? sup.rating.toFixed(1) + ' ★' : '',
      sdScoreCount: sup ? '· ' + sup.ratingCount + ' ratings' : '',
      sdCategory: sup ? sup.cat : '',
      sdDesc: sup ? sup.desc : '',
      sdGoldNote:
        sup && sup.goldBand === 'scheduled' && sup.goldBandDate
          ? sup.goldBandDate +
            '. The Gold Band is held from the audit, not from advertising — it appears here the day it is passed, and goes the day compliance lapses.'
          : '',
      sdHasGoldNote: !!(sup && sup.goldBand === 'scheduled' && sup.goldBandDate),
      sdStoreIcon: CD_icon('store', 16),
      sdViewProfile: () => self.nav('supplier/' + DK.DEMO_SUPPLIER_ID),
      sdReviews: DK.RECENT_REVIEWS.map((r, i) => ({
        stars: r.stars + ' ★',
        by: r.by,
        /* no-break space: the dot stays with the job, never opens a line */
        job: r.job + ' · ',
        when: r.when,
        text: '“' + r.text + '”',
        rowStyle:
          'display:flex;align-items:flex-start;gap:12px;padding:14px 0 ' +
          (i === DK.RECENT_REVIEWS.length - 1 ? '0' : '14px') +
          ';' +
          (i > 0 ? 'border-top:1px solid #E5EAF1;' : ''),
      })),
      sdTeaser: onScreen ? SD_teaser(() => self.nav('analytics')) : null,

      /* ---- quote modal (76) ---- */
      sdQuoteOpen: qOpen,
      sdQuoteEyebrow: qReq ? 'Quote request · ' + qReq.id.toUpperCase() : '',
      sdQuoteTitle: qReq ? 'Quote: ' + qReq.service : '',
      sdQuoteLede: qReq ? qReq.vessel + ' · ' + qReq.detail : '',
      sdQuotePill: qReq ? qReq.replyBy : '',
      sdQuotePillStyle: CD_pill(qReq ? qReq.tone : 'info'),
      sdQuotePrice: q ? q.price : '',
      sdQuotePriceInvalid: qProblem ? 'true' : null,
      sdQuotePriceBorder: qProblem ? '#A84D08' : '#CBD6E2',
      sdOnPrice: (e) => patchQuote({ price: e.target.value }),
      sdQuoteLead: q ? q.leadTime : '',
      sdOnLead: (e) => patchQuote({ leadTime: e.target.value }),
      sdLeadOptions: DK.LEAD_TIMES.map((t) => ({ value: t, label: t })),
      sdQuoteValid: q ? q.validity : '',
      sdOnValid: (e) => patchQuote({ validity: e.target.value }),
      sdValidOptions: DK.VALIDITY.map((v) => ({ value: v, label: v })),
      sdQuoteNote: q ? q.note : '',
      sdOnNote: (e) => patchQuote({ note: String(e.target.value).slice(0, SD_NOTE_MAX) }),
      sdQuoteNoteCount: (q ? q.note.length : 0) + ' / ' + SD_NOTE_MAX,
      sdQuoteNoteSr: (q ? q.note.length : 0) + ' of ' + SD_NOTE_MAX + ' characters used',
      sdQuoteProblem: !!qProblem,
      sdQuoteProblemText: qProblem ? 'Still needed: ' + qProblem : '',
      sdQuoteSendIcon: CD_icon('send', 16),
      sdQuoteCancel: closeQuote,
      sdQuoteOverlay: (e) => {
        if (e.target === e.currentTarget) closeQuote();
      },
      sdQuoteSubmit: (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const cur = self.state.sdQuote;
        if (!cur) return;
        const req = DK.SUPPLIER_INBOX.find((r) => r.id === cur.id);
        if (!req) return;
        if (SD_priceProblem(cur.price)) {
          self.setState({ sdQuote: Object.assign({}, cur, { tried: true }) });
          return;
        }
        self._dkSendQuote(req.id, {
          amountGbp: Number(String(cur.price).replace(/[£,\s]/g, '')),
          leadTime: cur.leadTime,
          validity: cur.validity,
          note: cur.note,
        });
        self.setState({ sdQuote: null });
        self.toastMsg(
          'Quote sent for ' +
            req.service +
            ' — ' +
            req.vessel +
            '. It lands in the client’s comparison view beside every other reply (simulated).',
          'SENT',
        );
      },

      /* ---- certificate modal (75) ---- */
      sdCertOpen: cOpen,
      sdCertTitle: certTitle,
      sdCertLede: certLede,
      sdCertLocked: locked,
      sdCertUnlocked: !locked,
      sdCertLockedLabel: lockedLabel,
      sdCertLockedHelp:
        mode.kind === 'renewal'
          ? 'Locked to the certificate you are renewing.'
          : 'Locked to the certificate you are sending again.',
      sdShieldIcon: CD_icon('shield-check', 13),
      sdShieldIconSea: CD_icon('shield-check', 15, {
        style: { marginTop: '1px', color: '#0E5E8A' },
      }),
      sdCertType: form.certType,
      sdOnType: (e) => patchForm({ certType: e.target.value }),
      sdTypeOptions: DK.CERT_TYPES.map((t) => ({ value: t, label: t })),
      sdCertOther: !locked && form.certType === 'Other',
      sdCertOtherLabel: form.otherLabel,
      sdOnOther: (e) => patchForm({ otherLabel: e.target.value }),
      sdCertIssuer: form.issuer,
      sdOnIssuer: (e) => patchForm({ issuer: e.target.value }),
      sdCertRef: form.reference,
      sdOnRef: (e) => patchForm({ reference: e.target.value }),
      sdCertIssued: form.issuedOn,
      /* the picker offers no future issue date; validation still refuses one */
      sdCertIssuedMax: DK_todayISO(),
      sdOnIssued: (e) => patchForm({ issuedOn: e.target.value }),
      sdCertExpires: form.expiresOn,
      sdOnExpires: (e) => patchForm({ expiresOn: e.target.value }),
      sdFileRef: this._sdFileRef,
      sdOnFile: (e) => {
        const f = e.target.files && e.target.files[0];
        /* name and size only: the file itself is never read or stored */
        if (f) patchForm({ fileName: f.name, fileSize: f.size });
        try {
          /* cleared, so choosing the same file again still registers */
          e.target.value = '';
        } catch (err) {
          /* nothing to clear */
        }
      },
      sdBrowse: () => {
        const el = self._sdFileRef && self._sdFileRef.current;
        if (el) el.click();
      },
      sdUploadIcon: CD_icon('upload', 19),
      sdBrowseIcon: CD_icon('file-plus', 16),
      sdDropText: dragging
        ? 'Drop the file to attach it'
        : 'Drag a PDF, JPG or PNG here, or browse',
      sdDropStyle:
        'margin-top:4px;border-radius:8px;border:1.5px dashed ' +
        (dragging ? '#0E5E8A' : '#CBD6E2') +
        ';background:' +
        (dragging ? '#E8F1F7' : '#FAFBFD') +
        ';padding:16px;transition:background-color .15s,border-color .15s;',
      sdDragEnter: (e) => {
        e.preventDefault();
        setDragging(true);
      },
      sdDragOver: (e) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        setDragging(true);
      },
      sdDragLeave: (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
      },
      sdDrop: (e) => {
        e.preventDefault();
        const cur = self.state.sdCert;
        if (!cur) return;
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        const next = f
          ? Object.assign({}, cur.form, { fileName: f.name, fileSize: f.size })
          : cur.form;
        self.setState({
          sdCert: Object.assign({}, cur, {
            dragging: false,
            form: next,
            problems: cur.tried ? DK_validateCertForm(next, DK_todayISO()) : cur.problems,
          }),
        });
      },
      sdHasFile: !!form.fileName,
      /* "{name} · {size}": the name may be shortened, the size never is */
      sdFileName: form.fileName,
      sdFileSize: form.fileName ? DK_fileSizeLabel(form.fileSize) : '',
      /* the always-mounted polite line: the file going on, and any refusal */
      sdFileLive: form.fileName
        ? 'Attached ' +
          form.fileName +
          ', ' +
          DK_fileSizeLabel(form.fileSize) +
          '.' +
          (fileProblem ? ' ' + fileProblem : '')
        : '',
      sdFileBoxStyle:
        'display:flex;align-items:center;gap:10px;border-radius:8px;background:#FFFFFF;padding:8px 12px;border:1px solid ' +
        (fileProblem ? '#B91C1C' : '#E5EAF1') +
        ';',
      sdFileIcon: CD_icon(fileProblem ? 'triangle-alert' : 'file-check', 17, {
        style: { color: fileProblem ? '#B91C1C' : '#0E5E8A' },
      }),
      sdRemoveSr: ' ' + form.fileName,
      sdRemoveFile: () => {
        patchForm({ fileName: '', fileSize: 0 });
        setTimeout(() => {
          const b = document.getElementById('sd-cert-browse');
          if (b) b.focus();
        }, 0);
      },
      sdFileProblem: !!fileProblem,
      sdFileProblemText: fileProblem || '',
      sdCertDeclared: !!form.declared,
      sdOnDeclared: (e) => patchForm({ declared: !!e.target.checked }),
      sdCertProblems: !!(c && c.problems && c.problems.length),
      sdCertProblemsText: c && c.problems ? 'Still needed: ' + c.problems.join(' · ') : '',
      sdCertSendIcon: CD_icon('send', 16),
      sdCertExample: () => {
        const cur = self.state.sdCert;
        if (cur) {
          replaceForm(
            SD_exampleFor(cur.mode, cur.form, self.state.dkEvidence || [], DK_todayISO()),
          );
        }
      },
      sdCertCancel: closeCert,
      sdCertOverlay: (e) => {
        if (e.target === e.currentTarget) closeCert();
      },
      sdCertSubmit: (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const cur = self.state.sdCert;
        if (!cur || !sup) return;
        const found = DK_validateCertForm(cur.form, DK_todayISO());
        if (found.length) {
          self.setState({ sdCert: Object.assign({}, cur, { tried: true, problems: found }) });
          return;
        }
        const kind = cur.mode.kind === 'renewal' ? 'renewal' : 'new';
        const input = {
          supplierId: sup.id,
          supplierName: sup.name,
          kind: kind,
          form: cur.form,
        };
        if (kind === 'renewal') input.vaultId = cur.mode.vaultId;
        self._dkSubmitEvidence(input);
        const label =
          cur.form.certType === 'Other' ? cur.form.otherLabel.trim() : cur.form.certType;
        self.setState({ sdCert: null });
        self.toastMsg(
          'Sent to the SVS team: ' + label + '. It shows as awaiting review until they decide.',
          'SVS',
        );
        SD_refocus();
      },
    };
  },

  escape() {
    /* A dialog is only ever on screen in the supplier view; off it, the
       Escape belongs to whatever is showing (the tour, an SVS dialog). */
    if (!(this.state.route === 'dashboard' && this.state.dashView === 'supplier')) return false;
    if (this.state.sdCert) {
      this.setState({ sdCert: null });
      SD_refocus();
      return true;
    }
    if (this.state.sdQuote) {
      this.setState({ sdQuote: null });
      return true;
    }
    return false;
  },
});
