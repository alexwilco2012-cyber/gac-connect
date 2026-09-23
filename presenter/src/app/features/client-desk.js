/* Client desk (live dashboards, 23 Sep 2026, task T9).

   The deck's client view of the dashboard (spec section 2), ported from the
   site's src/screens/app/dashboard/ClientView.tsx and dashboard/client/*:
   "Start something", the port calls milestone by milestone, six months of
   GAC spend with what the tier saved underneath, the lines, what is waiting
   on the client and what has moved since yesterday. Same copy, same
   figures, same order as the site.

   Owner: T9 · binding prefix cd* · partial 41-dashboard.html (client view).
   Nothing here is persisted: the view reads st.calc (the tier the
   consolidation card's pillars write), the invoice decisions, the crew-change
   letters and the logistics and customs records, so every count moves with
   the screens that own them. The consolidation card and the header keep the
   core's bindings.

   Commission is a supplier mechanism: no binding here may carry the word, a
   band or a percentage of a supplier's work, including table captions and
   accessible names (spec section 0, rule 1).

   Also shared with supplier-desk.js (included after this file): CD_icon, the
   tone map, the pill and tile styles. Script-scope rules: every top-level
   name here starts with CD; no less-than character inside a string literal. */

/* ---------- icons ----------
   Vendored from Lucide (https://lucide.dev), the same paths as the site's
   src/components/ui/Icon.tsx. ISC licence: Copyright (c) for portions of
   Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other
   copyright (c) for Lucide are held by Lucide Contributors 2022. Permission
   to use, copy, modify, and/or distribute this software for any purpose with
   or without fee is hereby granted, provided that the above copyright notice
   and this permission notice appear in all copies. */
const CD_ICON_PATHS = {
  anchor: [
    ['path', { d: 'M12 22V8' }],
    ['path', { d: 'M5 12H2a10 10 0 0 0 20 0h-3' }],
    ['circle', { cx: 12, cy: 5, r: 3 }],
  ],
  'badge-check': [
    [
      'path',
      {
        d: 'M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z',
      },
    ],
    ['path', { d: 'm9 12 2 2 4-4' }],
  ],
  'bar-chart-3': [
    ['path', { d: 'M3 3v16a2 2 0 0 0 2 2h16' }],
    ['path', { d: 'M18 17V9' }],
    ['path', { d: 'M13 17V5' }],
    ['path', { d: 'M8 17v-3' }],
  ],
  check: [['path', { d: 'M20 6 9 17l-5-5' }]],
  'chevron-right': [['path', { d: 'm9 18 6-6-6-6' }]],
  'circle-check': [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['path', { d: 'm9 12 2 2 4-4' }],
  ],
  'clipboard-list': [
    ['rect', { width: 8, height: 4, x: 8, y: 2, rx: 1, ry: 1 }],
    ['path', { d: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2' }],
    ['path', { d: 'M12 11h4' }],
    ['path', { d: 'M12 16h4' }],
    ['path', { d: 'M8 11h.01' }],
    ['path', { d: 'M8 16h.01' }],
  ],
  clock: [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['path', { d: 'M12 6v6l4 2' }],
  ],
  eye: [
    [
      'path',
      {
        d: 'M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0',
      },
    ],
    ['circle', { cx: 12, cy: 12, r: 3 }],
  ],
  'file-check': [
    ['path', { d: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z' }],
    ['path', { d: 'M14 2v4a2 2 0 0 0 2 2h4' }],
    ['path', { d: 'm9 15 2 2 4-4' }],
  ],
  'file-plus': [
    [
      'path',
      {
        d: 'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z',
      },
    ],
    ['path', { d: 'M14 2v5a1 1 0 0 0 1 1h5' }],
    ['path', { d: 'M9 15h6' }],
    ['path', { d: 'M12 18v-6' }],
  ],
  inbox: [
    ['polyline', { points: '22 12 16 12 14 15 10 15 8 12 2 12' }],
    [
      'path',
      {
        d: 'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
      },
    ],
  ],
  'message-square-quote': [
    ['path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' }],
    ['path', { d: 'M8 12a2 2 0 0 0 2-2V8H8' }],
    ['path', { d: 'M14 12a2 2 0 0 0 2-2V8h-2' }],
  ],
  receipt: [
    ['path', { d: 'M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z' }],
    ['path', { d: 'M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8' }],
    ['path', { d: 'M12 17.5v-11' }],
  ],
  send: [
    [
      'path',
      {
        d: 'M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z',
      },
    ],
    ['path', { d: 'm21.854 2.147-10.94 10.939' }],
  ],
  'shield-check': [
    [
      'path',
      {
        d: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
      },
    ],
    ['path', { d: 'm9 12 2 2 4-4' }],
  ],
  ship: [
    ['path', { d: 'M12 10.189V14' }],
    ['path', { d: 'M12 2v3' }],
    ['path', { d: 'M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6' }],
    [
      'path',
      {
        d: 'M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76',
      },
    ],
    [
      'path',
      {
        d: 'M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1',
      },
    ],
  ],
  stamp: [
    ['path', { d: 'M5 22h14' }],
    [
      'path',
      {
        d: 'M19.27 13.73A2.5 2.5 0 0 0 17.5 13h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-.66-.26-1.3-.73-1.77Z',
      },
    ],
    ['path', { d: 'M14 13V8.5C14 7 15 7 15 5a3 3 0 0 0-3-3c-1.66 0-3 1-3 3s1 2 1 3.5V13' }],
  ],
  store: [
    ['path', { d: 'm2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7' }],
    ['path', { d: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8' }],
    ['path', { d: 'M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4' }],
    ['path', { d: 'M2 7h20' }],
    [
      'path',
      {
        d: 'M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7',
      },
    ],
  ],
  timer: [
    ['line', { x1: 10, x2: 14, y1: 2, y2: 2 }],
    ['line', { x1: 12, x2: 15, y1: 14, y2: 11 }],
    ['circle', { cx: 12, cy: 14, r: 8 }],
  ],
  'trending-up': [
    ['path', { d: 'M16 7h6v6' }],
    ['path', { d: 'm22 7-8.5 8.5-5-5L2 17' }],
  ],
  'triangle-alert': [
    ['path', { d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3' }],
    ['path', { d: 'M12 9v4' }],
    ['path', { d: 'M12 17h.01' }],
  ],
  truck: [
    ['path', { d: 'M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2' }],
    ['path', { d: 'M15 18H9' }],
    [
      'path',
      { d: 'M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14' },
    ],
    ['circle', { cx: 17, cy: 18, r: 2 }],
    ['circle', { cx: 7, cy: 18, r: 2 }],
  ],
  upload: [
    ['path', { d: 'M12 3v12' }],
    ['path', { d: 'm17 8-5-5-5 5' }],
    ['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }],
  ],
};

/* A stroke icon on the 24-unit grid, decorative (the text beside it names
   the thing). `opts`: { strokeWidth, style, key }. */
function CD_icon(name, size, opts) {
  const o = opts || {};
  const parts = CD_ICON_PATHS[name] || [];
  return React.createElement(
    'svg',
    {
      key: o.key,
      width: size || 20,
      height: size || 20,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: o.strokeWidth || 1.75,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
      focusable: 'false',
      style: Object.assign({ display: 'block', flexShrink: 0 }, o.style || {}),
    },
    parts.map((p, i) => React.createElement(p[0], Object.assign({ key: i }, p[1]))),
  );
}

/* ---------- the site's tokens, as the deck writes them (inline hex) ---------- */

/* [background, text, border]: the site's Pill tones. */
const CD_TONES = {
  info: ['#E8F1F7', '#0E5E8A', ''],
  warn: ['#FBF0E1', '#B45309', ''],
  success: ['#E7F4EF', '#047857', ''],
  verified: ['#E7F4EF', '#047857', ''],
  danger: ['#FBEAEA', '#B91C1C', ''],
  neutral: ['#FAFBFD', '#33475F', '#CBD6E2'],
  promoted: ['#EFE9FB', '#5B3FA8', '#D9CCF5'],
};

function CD_pill(tone) {
  const t = CD_TONES[tone] || CD_TONES.info;
  return (
    'display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:2px 10px;' +
    'font-size:11.5px;line-height:1.5;font-weight:700;letter-spacing:.02em;white-space:nowrap;' +
    'background:' +
    t[0] +
    ';color:' +
    t[1] +
    ';' +
    (t[2] ? 'border:1px solid ' + t[2] + ';' : '')
  );
}

/* An icon tile: 32 or 36px, rounded, in a soft tone. */
function CD_tile(size, bg, fg) {
  return (
    'display:grid;place-items:center;flex-shrink:0;width:' +
    size +
    'px;height:' +
    size +
    'px;border-radius:8px;background:' +
    bg +
    ';color:' +
    fg +
    ';'
  );
}

/* A site path ('/app/agency/crew-change') as a deck route ('agency/crew-change';
   _parseHash drops the agency segment, as the site's redirect does). */
function CD_route(to) {
  return String(to || '').replace(/^\/app\//, '');
}

/* The site's VESSELS (src/data/vessels.ts), as the port-call rows name them. */
const CD_VESSELS = {
  choice: { name: 'MV Choice', operatorLine: 'Browne Energy / Grizzell Marine (60/40)' },
  boreal: { name: 'MV Boreal', operatorLine: 'Stronach Subsea' },
  'granite-coast': { name: 'MV Granite Coast', operatorLine: 'Wilkinson Drilling' },
};

const CD_SOURCE_LABELS = {
  agency: 'Agency',
  logistics: 'Logistics',
  customs: 'Customs',
  procurement: 'Procurement',
  quotes: 'Quotes',
  invoices: 'Invoices',
  svs: 'SVS',
};

const CD_CHIP_HOVER = { info: '#D5E7F2', warn: '#F6E2C6', success: '#D3EBE1' };

function CD_sum(xs) {
  return xs.reduce((a, b) => a + b, 0);
}

/* "Agency and Procurement" / "Agency, Logistics, Customs and Procurement". */
function CD_listOf(names) {
  if (names.length <= 1) return names.join('');
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}

/* ---------- the spend chart ---------- */

/* "GAC spend, last six months" (site: client/SpendChart.tsx). Stacks of the
   lines held, ladder order bottom to top, colour fixed to the line; the tier
   saving in the aligned lower panel. Spend and saving only. */
function CD_spendChart(calc) {
  const pct = DK_tierPct(calc);
  const months = DK.SPEND_MONTHS.slice();
  const series = DK_spendSeries(calc).map((s) =>
    Object.assign({}, s, { color: VZ.LINE_COLOURS[s.id] }),
  );
  const saved = DK_monthlySaving(calc);
  const monthTotals = months.map((_, i) => CD_sum(series.map((s) => s.values[i] || 0)));
  const total = CD_sum(monthTotals);
  const savedTotal = CD_sum(saved);
  const names = series.map((s) => s.label);
  const h = React.createElement;

  const takeaway =
    pct > 0
      ? VZ.gbp(total) +
        ' of GAC spend on ' +
        CD_listOf(names) +
        ' since April; the ' +
        pct +
        '% tier discount saved ' +
        VZ.gbp(savedTotal) +
        '.'
      : VZ.gbp(total) +
        ' of GAC spend on ' +
        CD_listOf(names) +
        ' since April; no tier discount is held.';

  const headline = h(
    'p',
    {
      style: {
        margin: 0,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        columnGap: '12px',
        rowGap: '4px',
      },
    },
    h(
      'span',
      {
        'data-testid': 'client-spend-total',
        style: {
          fontFamily: "'Space Grotesk',sans-serif",
          fontSize: '22px',
          lineHeight: 1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          color: '#0A2540',
          fontVariantNumeric: 'tabular-nums',
        },
      },
      VZ.gbp(total),
    ),
    h(
      'span',
      {
        style: {
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: '6px',
          fontSize: '13px',
          color: '#33475F',
        },
      },
      h('span', {
        'aria-hidden': 'true',
        style: {
          display: 'inline-block',
          width: '10px',
          height: '10px',
          borderRadius: '2px',
          transform: 'translateY(1px)',
          background: VZ.C.derived,
        },
      }),
      h(
        'span',
        { 'data-testid': 'client-spend-saving', style: { fontVariantNumeric: 'tabular-nums' } },
        pct > 0
          ? [
              h(
                'strong',
                { key: 's', style: { fontWeight: 700, color: '#0A2540' } },
                VZ.gbp(savedTotal),
              ),
              ' saved at ' + pct + '%',
            ]
          : 'No tier discount held yet',
      ),
    ),
  );

  return VZ.figure({
    testId: 'client-spend',
    title: 'GAC spend, last six months',
    subtitle: 'By service line, with what your tier discount saved underneath',
    takeaway: takeaway,
    headline: headline,
    footnote: 'Illustrative figures. The chart follows the lines held in the tier card above.',
    table: {
      caption: 'GAC spend by service line per month, April to September 2026, and the tier saving',
      columns: ['Month'].concat(names, ['Total', 'Saved at ' + pct + '%']),
      rows: months
        .map((m, i) =>
          [m].concat(
            series.map((s) => VZ.gbp(s.values[i] || 0)),
            [VZ.gbp(monthTotals[i] || 0), VZ.gbp(saved[i] || 0)],
          ),
        )
        .concat([
          ['Six months'].concat(
            series.map((s) => VZ.gbp(CD_sum(s.values))),
            [VZ.gbp(total), VZ.gbp(savedTotal)],
          ),
        ]),
    },
    /* The legend is the chart's own rather than the figure's, so it can hold
       its height on a phone while the pillars change (gac-cd-legend). */
    children: [
      h(
        'div',
        { key: 'legend', className: 'gac-cd-legend', 'data-testid': 'client-spend-legend' },
        VZ.legend(series.map((s) => ({ label: s.label, color: s.color }))),
      ),
      h(
        'div',
        { key: 'plot', style: { marginTop: '12px' } },
        VZ.stacked({
          categories: months,
          series: series,
          format: VZ.gbp,
          axisFormat: VZ.compactGbp,
          directLabelLast: true,
          lower: {
            label: 'Saved by your tier discount',
            color: VZ.C.derived,
            values: saved,
            format: VZ.gbp,
          },
          ariaLabel:
            'GAC spend by service line per month, April to September, with the tier saving below',
        }),
      ),
    ],
  });
}

/* ---------- registration ---------- */

(Component._features = Component._features || []).push({
  vals(st) {
    const self = this;
    const calc = st.calc || { agency: true, logistics: false, customs: false };
    const onScreen = st.route === 'dashboard' && st.dashView !== 'supplier';

    /* Invoices inside the seven-day window (features/invoices.js rules). */
    const decisions = st.invDecisions || {};
    const awaiting = INV_INVOICES.filter(
      (inv) => invState(inv.receivedDaysAgo, decisions[inv.id]) === 'awaiting',
    );
    const tightest = awaiting.reduce(
      (acc, inv) =>
        acc === null || invDaysLeft(inv.receivedDaysAgo) < invDaysLeft(acc)
          ? inv.receivedDaysAgo
          : acc,
      null,
    );
    const tightTone = tightest !== null && invDaysLeft(tightest) <= 2 ? 'warn' : 'info';

    /* LOI and repatriation letters not yet returned (features/crew-change.js). */
    const letters = (st.ccRequests || []).filter((r) => !ccIsTerminalStage(r.kind, r.stage)).length;
    /* Movements not yet at the quay, declarations not yet cleared (service-lines.js). */
    const moving = (st.slConsignments || []).filter(
      (c) => c.stage !== SL_CONSIGNMENT_STAGES[SL_CONSIGNMENT_STAGES.length - 1],
    ).length;
    const clearing = (st.slDeclarations || []).filter(
      (d) => d.stage !== SL_DECLARATION_STAGES[SL_DECLARATION_STAGES.length - 1],
    ).length;

    /* ---- the side stats beside the consolidation card (22px: one number leads) ---- */
    const sideStats = [
      {
        label: 'Port calls in the window',
        value: String(DK.PORT_CALLS.length),
        chip: 'Aberdeen and Peterhead',
        chipStyle: CD_pill('info'),
      },
      {
        label: 'Quotes to compare',
        value: String(this.QUOTES.length),
        chip: 'Crane hire · MV Choice',
        chipStyle: CD_pill('info'),
      },
      {
        label: 'Invoices in your window',
        value: String(awaiting.length),
        chip: tightest === null ? 'All matched' : invWindowLabel(tightest),
        chipStyle: CD_pill(tightTone),
      },
    ];

    /* ---- Start something ---- */
    const quickActions = DK.QUICK_ACTIONS.map((a) => ({
      label: a.label,
      icon: CD_icon(a.icon, 17),
      go: self._go(CD_route(a.to)),
    }));

    /* ---- Your port calls ---- */
    const stages = DK.PORT_CALL_STAGES;
    const portCalls = DK.PORT_CALLS.map((call, row) => {
      const vessel = CD_VESSELS[call.vesselId] || { name: call.vesselId, operatorLine: '' };
      const step = DK_portCallStep(call.stage);
      const at = step - 1;
      const last = row === DK.PORT_CALLS.length - 1;
      return {
        name: vessel.name,
        berthLine: call.berth + ' · ' + vessel.operatorLine,
        when: call.when,
        countdown: '· ' + call.countdown,
        clockIcon: CD_icon('clock', 13, { style: { color: '#33475F' } }),
        shipIcon: CD_icon('ship', 17),
        rowStyle:
          'display:flex;gap:12px;padding:' +
          (row === 0 ? '12px' : '16px') +
          ' 0 ' +
          (last ? '0' : '16px') +
          ';' +
          (last ? '' : 'border-bottom:1px dashed #CBD6E2;'),
        railLabel: vessel.name + ' milestones',
        steps: stages.map((stage, i) => {
          const state = i < at ? 'done' : i === at ? 'current' : 'pending';
          const dot =
            state === 'done'
              ? 'background:#E7F4EF;color:#047857;box-shadow:0 0 0 1.5px rgba(4,120,87,.4);'
              : state === 'current'
                ? 'background:#0E5E8A;color:#FFFFFF;box-shadow:0 0 0 4px #E8F1F7;'
                : 'background:#FFFFFF;box-shadow:0 0 0 1.5px #CBD6E2;';
          return {
            label: stage,
            state: state,
            current: state === 'current' ? 'step' : null,
            sr: ' (' + state + ')',
            hasLine: i > 0,
            lineStyle:
              'position:absolute;top:9px;left:-50%;right:50%;height:2px;background:' +
              (i <= at ? '#047857' : '#CBD6E2') +
              ';',
            dotStyle:
              'position:relative;z-index:1;display:grid;place-items:center;width:20px;height:20px;border-radius:999px;' +
              dot,
            mark:
              state === 'done'
                ? CD_icon('check', 12, { strokeWidth: 3 })
                : state === 'current'
                  ? React.createElement('span', {
                      style: {
                        display: 'block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '999px',
                        background: '#FFFFFF',
                      },
                    })
                  : null,
            labelStyle:
              'margin-top:6px;font-size:11.5px;line-height:1.25;' +
              (state === 'current'
                ? 'font-weight:700;color:#0A2540;'
                : state === 'done'
                  ? 'color:#33475F;'
                  : 'color:#5B6B7F;'),
          };
        }),
        compactLabel: 'Step ' + step + ' of ' + stages.length + ' · ' + call.stage,
        segments: stages.map((stage, i) => ({
          style:
            'display:block;height:4px;border-radius:999px;background:' +
            (i < at ? '#047857' : i === at ? '#0E5E8A' : '#E5EAF1') +
            ';',
        })),
        chips: call.chips.map((chip) => {
          const t = CD_TONES[chip.tone] || CD_TONES.info;
          return {
            label: chip.label,
            tone: chip.tone,
            link: !!chip.to,
            plain: !chip.to,
            style:
              'position:relative;display:inline-flex;align-items:center;gap:6px;min-height:32px;box-sizing:border-box;' +
              'border-radius:999px;padding:0 12px;font-size:12px;font-weight:700;font-family:inherit;border:none;' +
              'background:' +
              t[0] +
              ';color:' +
              t[1] +
              ';' +
              (chip.to ? 'cursor:pointer;transition:background-color .15s;' : ''),
            glyph:
              chip.tone === 'warn'
                ? CD_icon('triangle-alert', 13)
                : chip.tone === 'success'
                  ? CD_icon('circle-check', 13)
                  : null,
            chevron: CD_icon('chevron-right', 13, { style: { marginRight: '-4px', opacity: 0.7 } }),
            go: chip.to ? self._go(CD_route(chip.to)) : null,
          };
        }),
      };
    });

    /* ---- Your work, line by line (counts from the live records) ---- */
    const line = (name, route, icon, on, count, detail, isLast) => ({
      name: name,
      detail: detail,
      count: String(count),
      icon: CD_icon(icon, 17),
      go: self._go(route),
      rowStyle: isLast ? '' : 'border-bottom:1px dashed #CBD6E2;',
      tileStyle:
        CD_tile(36, on ? '#E8F1F7' : '#F1F4F8', on ? '#0E5E8A' : '#8FA3B8') +
        'transition:background-color .35s,color .35s;',
      countStyle:
        'display:grid;place-items:center;min-width:28px;height:28px;box-sizing:border-box;border-radius:999px;' +
        'padding:0 8px;font-size:12.5px;font-weight:700;' +
        (count > 0 ? 'background:#0A2540;color:#FFFFFF;' : 'background:#FAFBFD;color:#33475F;'),
    });
    const lines = [
      line(
        'Agency',
        'agency',
        'anchor',
        calc.agency,
        calc.agency ? DK.PORT_CALLS.length : 0,
        calc.agency
          ? 'Port calls, berths and crew change'
          : 'Not consolidated. Add Agency to reach the 2% tier',
      ),
      line(
        'Logistics',
        'logistics',
        'truck',
        calc.logistics,
        calc.logistics ? moving : 0,
        !calc.logistics
          ? 'Not consolidated. Add Logistics to reach the 4% tier'
          : moving === 0
            ? 'Nothing in transit — book a movement'
            : 'Consignments on their way to the quay',
      ),
      line(
        'Customs',
        'customs',
        'stamp',
        calc.customs,
        calc.customs ? clearing : 0,
        !calc.customs
          ? 'Not consolidated. Customs is the 7% pillar'
          : clearing === 0
            ? 'No declarations open'
            : 'Declarations working through to clearance',
      ),
      line(
        'Procurement',
        'procurement',
        'clipboard-list',
        true,
        1,
        'One list ready to send to Compass',
        true,
      ),
    ];

    /* ---- Waiting on you (the site's useNeedsYou; the bell reads the same) ----
       Ranked by deadline: the invoice window when one is open (days left,
       at most seven), then compliance (10), then letters (90). With no
       invoice open, invoices rank 80, under compliance. */
    const watch = this._complianceWatch();
    const blocked = watch.filter((w) => w.blocked).length;
    const invFirst = tightest !== null && invDaysLeft(tightest) < 10;
    const feedRow = (first, last) =>
      'display:flex;align-items:flex-start;gap:12px;padding:' +
      (first ? '0' : '12px') +
      ' 0 ' +
      (last ? '0' : '12px') +
      ';' +
      (last ? '' : 'border-bottom:1px dashed #CBD6E2;');
    const feedTile = (clear) =>
      CD_tile(32, clear ? '#E7F4EF' : '#E8F1F7', clear ? '#047857' : '#0E5E8A') + 'margin-top:2px;';
    const invClear = awaiting.length === 0;
    const watchClear = watch.length === 0;
    const lettersClear = letters === 0;

    const invHeadline = invClear
      ? 'Invoices — all clear'
      : awaiting.length +
        (awaiting.length === 1 ? ' invoice' : ' invoices') +
        ' awaiting your review';
    const watchHeadline =
      watch.length === 0
        ? 'Compliance — all clear'
        : watch.length + (watch.length === 1 ? ' supplier' : ' suppliers') + ' on compliance watch';
    const lettersHeadline = lettersClear
      ? 'No letters in progress'
      : letters + (letters === 1 ? ' letter' : ' letters') + ' in progress';

    /* ---- Latest from GAC ---- */
    const activity = DK_visibleActivity(calc);
    const activityRows = activity.map((item, i) => ({
      text: item.text,
      meta: item.when + ' · ' + (CD_SOURCE_LABELS[item.line] || ''),
      line: item.line,
      icon: CD_icon(item.icon, 16),
      go: self._go(CD_route(item.to)),
      thread: i < activity.length - 1,
      rowStyle:
        'position:relative;display:flex;gap:12px;' +
        (i < activity.length - 1 ? 'padding-bottom:16px;' : '') +
        (item.line === 'logistics' || item.line === 'customs'
          ? 'animation:fadeUp .3s ease both;'
          : ''),
    }));

    return {
      cdSideStats: sideStats,
      cdQuickActions: quickActions,
      cdPortCalls: portCalls,
      cdLettersTail: letters > 0 ? ' ' + letters + ' in progress.' : '',
      cdSpendChart: onScreen ? CD_spendChart(calc) : null,
      cdLines: lines,

      /* Waiting on you: invoices, compliance, letters */
      cdWatchFirst: !invFirst,
      cdWatchSecond: invFirst,
      cdInvRowStyle: feedRow(invFirst, false),
      cdWatchRowStyle: feedRow(!invFirst, false),
      cdLettersRowStyle: feedRow(false, true),
      cdInvTile: feedTile(invClear),
      cdInvIcon: CD_icon(invClear ? 'circle-check' : 'receipt', 16),
      cdInvHeadline: invHeadline,
      cdInvAria: invHeadline + ' — Review invoices',
      cdInvDetail: invClear
        ? 'Everything received has matched in GAC Agent.'
        : 'Left alone, an invoice matches as it stands.',
      cdInvChip: tightest !== null,
      cdInvChipLabel: tightest !== null ? invWindowLabel(tightest) : '',
      cdInvChipStyle: CD_pill(tightTone),
      cdWatchTile: feedTile(watchClear),
      cdWatchIcon: CD_icon(watchClear ? 'circle-check' : 'triangle-alert', 16),
      cdWatchHeadline: watchHeadline,
      cdWatchAria: watchHeadline + ' — Open SVS',
      cdWatchChip: blocked > 0,
      cdWatchChipLabel: blocked + ' blocked from booking',
      cdWatchChipStyle: CD_pill('danger'),
      cdLettersTile: feedTile(lettersClear),
      cdLettersIcon: CD_icon(lettersClear ? 'circle-check' : 'file-check', 16),
      cdLettersHeadline: lettersHeadline,
      cdLettersAria: lettersHeadline + ' — Open crew change',
      cdLettersDetail: lettersClear
        ? 'LOI and repatriation templates live in crew change.'
        : 'LOI and repatriation letters on their way through GAC and Border Force.',
      cdChevron: CD_icon('chevron-right', 14, {
        style: { display: 'inline-block', marginLeft: '2px', verticalAlign: '-2px' },
      }),

      cdActivity: activityRows,
      cdShieldIcon: CD_icon('shield-check', 16, { style: { marginTop: '2px', color: '#0E5E8A' } }),
      cdClientIcon: CD_icon('ship', 15, { style: { marginRight: '8px' } }),
      cdSupplierIcon: CD_icon('store', 15, { style: { marginRight: '8px' } }),
    };
  },
});
