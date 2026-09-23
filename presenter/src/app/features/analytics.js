/* Supplier analytics (live dashboards, 23 Sep 2026, task T11; spec section 5).

   The deck's port of the site's src/screens/app/Analytics.tsx and
   src/screens/app/analytics/*: the example dashboard a subscribed supplier
   sees, reached from For Suppliers and the supplier dashboard, never a nav
   tab. Same cards in the same order, the same copy word for word and the
   same figures: every number comes from DK (desk-data.js, the mirror of the
   site's data/analytics.ts), and the words about the numbers are ported
   from the site's analytics/model.ts (kpisFor, benchmarkLines,
   daysAboveCategory, readDemand, periodRange) so the two cannot drift.

   One period switch drives every figure on the page. On the site it lives
   in the address (?period=90); here it is this module's own state, not
   persisted, so Reset demo and a fresh visit both open on 30 days.

   Charts come from VZ (viz.js). The bindings return React elements, cached
   per period: the data never changes, so a re-render of the deck for any
   other reason hands React the same elements and the charts are left alone
   (their hover and keyboard state included).

   Gold stays out of this screen entirely: no chart colour, highlight or
   plan pill wears it (spec rule 5).

   Owner: T11 · binding prefix an* · partial 50-analytics.html · responsive
   rules gac-an-* in the analytics block of styles/base.css.
   Script-scope rules: the deck is one script, so every top-level name here
   starts with AN_. Keep the less-than character out of string literals. */

const AN_h = React.createElement;
const AN_PERIODS = [30, 90];
const AN_MINUS = '−';
const AN_DISPLAY = "'Space Grotesk','Segoe UI','Avenir Next',Arial,sans-serif";
const AN_INK = '#0A2540';
const AN_INK_SOFT = '#33475F';
const AN_CARD = {
  background: '#FFFFFF',
  border: '1px solid #E5EAF1',
  borderRadius: '14px',
  boxShadow: '0 1px 3px rgba(10,37,64,.07)',
  padding: '22px',
  boxSizing: 'border-box',
};
const AN_SR = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
};
/* The site's Pill tones used here: neutral (paper, ink-soft, line-strong
   border) and info (sea-soft, sea). Never the in-house gold. */
const AN_PILL = {
  neutral: { background: '#FAFBFD', color: AN_INK_SOFT, border: '1px solid #CBD6E2' },
  info: { background: '#E8F1F7', color: '#0E5E8A', border: '1px solid transparent' },
};
const AN_TONE = {
  success: ['#E7F4EF', '#047857'],
  warn: ['#FBF0E1', '#A84D08'],
};

/* Lower bound of each colour step (DemandFigure.tsx BINS). The 90-day grid
   holds about three times the requests, so its steps are wider; both keep
   five, with the single peak alone in the darkest. */
const AN_BINS = { 30: [0, 1, 2, 3, 5], 90: [0, 1, 3, 5, 8] };
/* Heatmap columns 4 to 8 are 08:00 to 18:00; rows 0 to 4 are Monday to Friday. */
const AN_WORKDAY_ROWS = 5;
const AN_WORK_START_COL = 4;
const AN_WORK_END_COL = 8;

/* Lucide paths, verbatim from the site's Icon.tsx (ISC licence, Lucide
   Contributors; portions MIT, Cole Bemis, as part of Feather). */
const AN_ICON_PATHS = {
  eye: [
    [
      'path',
      {
        d: 'M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0',
      },
    ],
    ['circle', { cx: 12, cy: 12, r: 3 }],
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
  'trending-up': [
    ['path', { d: 'M16 7h6v6' }],
    ['path', { d: 'm22 7-8.5 8.5-5-5L2 17' }],
  ],
  clock: [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['path', { d: 'M12 6v6l4 2' }],
  ],
  calendar: [
    ['path', { d: 'M8 2v3' }],
    ['path', { d: 'M16 2v3' }],
    ['rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }],
    ['path', { d: 'M3 9h18' }],
  ],
};

function AN_icon(name, size) {
  return AN_h(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.75,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
      focusable: 'false',
      style: { display: 'block', flexShrink: 0 },
    },
    (AN_ICON_PATHS[name] || []).map((d, i) => AN_h(d[0], Object.assign({ key: i }, d[1]))),
  );
}

function AN_pill(text, tone) {
  const t = AN_PILL[tone] || AN_PILL.neutral;
  return AN_h(
    'span',
    {
      style: Object.assign(
        {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          borderRadius: '999px',
          padding: '2px 10px',
          fontSize: '11.5px',
          lineHeight: 1.5,
          fontWeight: 700,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
        },
        t,
      ),
    },
    text,
  );
}

/* ---------- words about the figures (site: analytics/model.ts) ---------- */

function AN_count(n) {
  return Number(n).toLocaleString('en-GB');
}
function AN_plural(n, one, many) {
  return AN_count(n) + ' ' + (n === 1 ? one : many);
}
/* Whole-number share of a total, for "168 · 41%". */
function AN_share(v, total) {
  return total > 0 ? Math.round((v / total) * 100) : 0;
}
function AN_signed(n) {
  return n < 0 ? AN_MINUS + Math.abs(n) : '+' + n;
}
function AN_oneDp(n) {
  return (Math.round(n * 10) / 10).toFixed(1);
}
/* "34%" / "2.1 hrs" for the tiles' comparison rows. */
function AN_unitText(n, unit) {
  return unit === 'pct' ? n + '%' : AN_oneDp(n) + ' hrs';
}
function AN_requests(n) {
  return AN_plural(n, 'request', 'requests');
}

/* "25 Aug – 23 Sep 2026": the window a period covers (the calendar ends yesterday). */
function AN_periodRange(period) {
  const day = (label) => String(label || '').replace(/^\w+ /, '');
  const labels = DK.DAY_LABELS_90;
  return day(labels[90 - period]) + ' – ' + day(labels[labels.length - 1]) + ' 2026';
}

/* The four tiles: value, the change on the previous period, and a small visual. */
function AN_kpisFor(period) {
  const s = DK.PERIOD_SUMMARY[period];
  const series = DK_seriesFor(period);
  const previous = 'the previous ' + period + ' days';
  const growth = (now, prev) => AN_signed(Math.round((now / prev - 1) * 100)) + '%';
  const winPts = s.winRate - s.winRatePrev;
  const faster = Math.round((s.responseHrsPrev - s.responseHrs) * 10) / 10;
  const views = growth(s.views, s.viewsPrev);
  const requests = growth(s.requests, s.requestsPrev);
  return [
    {
      id: 'views',
      label: 'Profile views',
      value: AN_count(s.views),
      change: views,
      changeText: views + ' on ' + previous,
      tone: s.views >= s.viewsPrev ? 'success' : 'warn',
      caption: AN_count(s.viewsPrev) + ' in ' + previous,
      icon: 'eye',
      series: series.sparkViews,
    },
    {
      id: 'requests',
      label: 'Quote requests',
      value: AN_count(s.requests),
      change: requests,
      changeText: requests + ' on ' + previous,
      tone: s.requests >= s.requestsPrev ? 'success' : 'warn',
      caption: AN_count(s.requestsPrev) + ' in ' + previous,
      icon: 'inbox',
      series: series.sparkRequests,
    },
    {
      id: 'win',
      label: 'Win rate',
      value: s.winRate + '%',
      change: AN_signed(winPts) + ' pts',
      changeText: AN_signed(winPts) + ' points on ' + previous,
      tone: winPts >= 0 ? 'success' : 'warn',
      caption: s.won + ' won of ' + s.quoted + ' quoted',
      icon: 'trending-up',
      compare: { now: s.winRate, before: s.winRatePrev, unit: 'pct' },
    },
    {
      id: 'response',
      label: 'Avg. response time',
      value: AN_oneDp(s.responseHrs) + ' hrs',
      /* Down is good here: the sign says which way, the tone says whether it helps. */
      change: (faster >= 0 ? AN_MINUS : '+') + AN_oneDp(Math.abs(faster)) + ' hrs',
      changeText:
        AN_oneDp(Math.abs(faster)) +
        ' hrs ' +
        (faster >= 0 ? 'faster' : 'slower') +
        ' than ' +
        previous,
      tone: faster >= 0 ? 'success' : 'warn',
      caption: 'Average time to first reply',
      icon: 'clock',
      compare: { now: s.responseHrs, before: s.responseHrsPrev, unit: 'hrs' },
    },
  ];
}

/* "7 points above the category average" / "3.3 hrs faster than the category average". */
function AN_benchmarkLines(period) {
  const s = DK.PERIOD_SUMMARY[period];
  const pts = s.winRate - s.categoryWinRate;
  const hrs = s.categoryResponseHrs - s.responseHrs;
  return {
    win:
      pts === 0
        ? 'Level with the category average'
        : AN_plural(Math.abs(pts), 'point', 'points') +
          ' ' +
          (pts > 0 ? 'above' : 'below') +
          ' the category average',
    response:
      AN_oneDp(Math.abs(hrs)) +
      ' hrs ' +
      (hrs >= 0 ? 'faster' : 'slower') +
      ' than the category average',
  };
}

/* Days in the period on which profile views beat the category average. */
function AN_daysAboveCategory(period) {
  const sr = DK_seriesFor(period);
  return sr.views.filter((v, i) => v > (sr.category[i] ?? Infinity)).length;
}

/* The three facts beside the heatmap, read from the grid itself. */
function AN_readDemand(grid) {
  let total = 0;
  let inHours = 0;
  let peak = { r: 0, c: 0, v: -1 };
  let day = { r: 0, v: -1 };
  grid.forEach((row, r) => {
    const rowSum = row.reduce((a, b) => a + b, 0);
    total += rowSum;
    if (rowSum > day.v) day = { r: r, v: rowSum };
    row.forEach((v, c) => {
      if (v > peak.v) peak = { r: r, c: c, v: v };
      if (r < AN_WORKDAY_ROWS && c >= AN_WORK_START_COL && c <= AN_WORK_END_COL) inHours += v;
    });
  });
  return {
    total: total,
    peak: {
      day: DK.WEEKDAY_NAMES[peak.r] ?? '',
      block: DK.HOUR_BLOCK_NAMES[peak.c] ?? '',
      count: Math.max(0, peak.v),
    },
    busiestDay: { day: DK.WEEKDAY_NAMES[day.r] ?? '', count: Math.max(0, day.v) },
    outOfHours: total - inHours,
  };
}

/* ---------- KPI tiles (site: analytics/KpiTiles.tsx) ---------- */

/* Two thin bars from zero: this period (sea) over the one before (neutral). */
function AN_compare(c, period) {
  const max = Math.max(c.now, c.before) || 1;
  const rows = [
    { key: 'now', label: 'This period', value: c.now, color: VZ.C.sea, strong: true },
    { key: 'before', label: 'Previous', value: c.before, color: VZ.C.context, strong: false },
  ];
  return AN_h(
    'div',
    {
      role: 'img',
      'aria-label':
        'Last ' +
        period +
        ' days ' +
        AN_unitText(c.now, c.unit) +
        '; previous ' +
        period +
        ' days ' +
        AN_unitText(c.before, c.unit),
      style: {
        display: 'grid',
        height: '36px',
        gridTemplateColumns: 'auto minmax(0,1fr) auto',
        alignContent: 'center',
        alignItems: 'center',
        columnGap: '10px',
        rowGap: '6px',
        fontSize: '11px',
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
      },
    },
    rows.map((r) => [
      AN_h('span', { key: r.key + '-l', style: { color: AN_INK_SOFT } }, r.label),
      AN_h(
        'span',
        {
          key: r.key + '-b',
          style: {
            display: 'block',
            height: '6px',
            borderRadius: '999px',
            background: VZ.C.track,
          },
        },
        AN_h('span', {
          style: {
            display: 'block',
            height: '100%',
            borderRadius: '999px',
            width: (r.value / max) * 100 + '%',
            background: r.color,
          },
        }),
      ),
      AN_h(
        'span',
        {
          key: r.key + '-v',
          style: {
            textAlign: 'right',
            fontWeight: r.strong ? 700 : 400,
            color: r.strong ? AN_INK : AN_INK_SOFT,
          },
        },
        AN_unitText(r.value, c.unit),
      ),
    ]),
  );
}

/* Each tile has the same four rows so the row reads level at any width:
   label, value with its change chip, one line of context, and a 36px visual
   (the sparkline where there is a series, this period against the one
   before for the two rates, which have none). */
function AN_tile(k, period) {
  const tone = AN_TONE[k.tone] || AN_TONE.success;
  return AN_h(
    'div',
    {
      key: k.id,
      'data-testid': 'kpi-' + k.id,
      style: Object.assign({}, AN_CARD, { display: 'flex', flexDirection: 'column', minWidth: 0 }),
    },
    AN_h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
        },
      },
      AN_h(
        'p',
        {
          style: {
            margin: 0,
            paddingTop: '2px',
            fontSize: '12.5px',
            fontWeight: 600,
            color: AN_INK_SOFT,
          },
        },
        k.label,
      ),
      AN_h(
        'span',
        {
          'aria-hidden': 'true',
          style: {
            marginTop: '-2px',
            display: 'grid',
            placeItems: 'center',
            width: '28px',
            height: '28px',
            flexShrink: 0,
            borderRadius: '8px',
            background: '#E8F1F7',
            color: '#0E5E8A',
          },
        },
        AN_icon(k.icon, 15),
      ),
    ),
    AN_h(
      'p',
      /* wraps rather than push the chip past the card's edge */
      {
        style: {
          margin: '4px 0 0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          columnGap: '8px',
          rowGap: '4px',
        },
      },
      AN_h(
        'span',
        {
          'data-kpi-value': '',
          style: {
            fontFamily: AN_DISPLAY,
            fontSize: '26px',
            lineHeight: 1.25,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            color: AN_INK,
          },
        },
        k.value,
      ),
      AN_h(
        'span',
        {
          style: {
            borderRadius: '999px',
            padding: '2px 8px',
            fontSize: '11.5px',
            lineHeight: 1.375,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            fontVariantNumeric: 'tabular-nums',
            background: tone[0],
            color: tone[1],
          },
        },
        AN_h('span', { 'aria-hidden': 'true' }, k.change),
        AN_h('span', { style: AN_SR }, k.changeText),
      ),
    ),
    AN_h(
      'p',
      {
        style: {
          margin: '2px 0 0',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: '12px',
          color: AN_INK_SOFT,
        },
      },
      k.caption,
    ),
    AN_h(
      'div',
      { style: { marginTop: 'auto', paddingTop: '14px' } },
      k.series
        ? VZ.sparkline(k.series, { height: 36 })
        : k.compare
          ? AN_compare(k.compare, period)
          : null,
    ),
  );
}

/* ---------- the figures, in the site's order ---------- */

/* Views and quote requests (TrendFigure.tsx): two small multiples on one
   shared time axis with one synced crosshair, never a dual axis. Views are
   daily in both periods; requests are daily at 30 days and weekly at 90. */
function AN_trend(period, supplier) {
  const s = DK.PERIOD_SUMMARY[period];
  const series = DK_seriesFor(period);
  const above = AN_daysAboveCategory(period);
  const weekly = period === 90;
  let table;
  if (weekly) {
    const views = DK_weeklySums(series.views);
    const category = DK_weeklySums(series.category);
    table = {
      caption: 'Profile views, category average and quote requests per week, last 90 days',
      columns: ['Week', 'Profile views', 'Category average', 'Quote requests'],
      rows: series.requestLabels.map((week, k) => [
        week,
        AN_count(views[k] ?? 0),
        AN_count(Math.round(category[k] ?? 0)),
        AN_count(series.requests[k] ?? 0),
      ]),
    };
  } else {
    table = {
      caption: 'Profile views, category average and quote requests per day, last 30 days',
      columns: ['Day', 'Profile views', 'Category average', 'Quote requests'],
      rows: series.labels.map((day, i) => [
        day,
        AN_count(series.views[i] ?? 0),
        (series.category[i] ?? 0).toFixed(1),
        AN_count(series.requests[i] ?? 0),
      ]),
    };
  }
  const requestsPanel = {
    id: 'requests',
    label: weekly ? 'Quote requests per week' : 'Quote requests per day',
    kind: 'columns',
    values: series.requests,
    format: AN_count,
  };
  if (weekly) requestsPanel.binLabels = series.requestLabels;
  return VZ.figure({
    testId: 'analytics-trend',
    title: 'Views and quote requests',
    subtitle: weekly
      ? 'Last 90 days · views per day, requests per week'
      : 'Last 30 days · views and requests per day',
    takeaway:
      AN_count(s.views) +
      ' profile views and ' +
      AN_count(s.requests) +
      ' quote requests in the last ' +
      period +
      ' days. Views beat the category average on ' +
      above +
      ' of ' +
      period +
      ' days.',
    legend: [
      { label: supplier, color: VZ.C.sea, shape: 'line' },
      { label: 'Category average (Premium)', color: VZ.C.context, shape: 'line' },
    ],
    table: table,
    children: VZ.timeSeries({
      labels: series.labels,
      ariaLabel: 'Profile views and quote requests, last ' + period + ' days',
      panels: [
        {
          id: 'views',
          label: 'Profile views per day',
          kind: 'area',
          values: series.views,
          format: AN_count,
          benchmark: { label: 'Category average', values: series.category },
        },
        requestsPanel,
      ],
    }),
  });
}

/* From search to signed job (FunnelFigure.tsx): five bars on one linear
   scale, light to dark on the ordinal ramp, with the step rate between rows. */
function AN_funnel(period) {
  const s = DK.PERIOD_SUMMARY[period];
  const rates = DK_funnelRateLabels(s.funnel);
  const appearances = (s.funnel[0] && s.funnel[0].value) ?? 0;
  return VZ.figure({
    testId: 'analytics-funnel',
    title: 'From search to signed job',
    subtitle: 'Last ' + period + ' days · each step as a share of the one before',
    takeaway:
      AN_count(s.won) +
      ' jobs won from ' +
      AN_count(appearances) +
      ' search appearances in the last ' +
      period +
      ' days; ' +
      AN_share(s.quoted, s.requests) +
      '% of quote requests were answered with a quote.',
    table: {
      caption: 'Funnel from search appearance to job won, last ' + period + ' days',
      columns: ['Step', 'Count', 'Rate from the step before'],
      rows: s.funnel.map((step, i) => [
        step.label,
        AN_count(step.value),
        i === 0 ? '—' : (rates[i - 1] ?? ''),
      ]),
    },
    children: VZ.funnel({
      steps: s.funnel,
      format: AN_count,
      rateLabels: rates,
      ariaLabel: 'Funnel from search appearances to jobs won, last ' + period + ' days',
    }),
  });
}

const AN_pct = (n) => n + '%';
/* "2.1 hrs" for readings, "8 hrs" for the scale's ends. */
const AN_hrs = (n) => (Number.isInteger(n) ? n : n.toFixed(1)) + ' hrs';

function AN_measure(key, title, note, reading, chart) {
  return AN_h(
    'div',
    { key: key, style: { minWidth: 0 } },
    AN_h(
      'p',
      {
        style: {
          margin: '0 0 8px',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '12px',
        },
      },
      AN_h('span', { style: { fontSize: '13px', fontWeight: 600, color: AN_INK } }, title),
      AN_h('span', { style: { fontSize: '11.5px', color: AN_INK_SOFT } }, note),
    ),
    chart,
    AN_h(
      'p',
      { style: { margin: '10px 0 0', fontSize: '12.5px', fontWeight: 600, color: AN_INK } },
      reading,
    ),
  );
}

/* Against your category (BenchmarkFigure.tsx): market benchmarking, Premium
   only. Win rate is a bullet (higher is better, so it fills); response time
   is a dot strip (lower is better, so nothing fills and "Faster" sits at the
   left). The category average is an ink tick, named in words, never a hue. */
function AN_benchmark(period) {
  const s = DK.PERIOD_SUMMARY[period];
  const lines = AN_benchmarkLines(period);
  return VZ.figure({
    testId: 'analytics-benchmark',
    title: 'Against your category',
    subtitle: 'Market benchmarking · last ' + period + ' days',
    action: AN_pill('Premium', 'neutral'),
    takeaway: 'Win rate ' + lines.win + '; responses ' + lines.response + '.',
    footnote: 'Category average across verified Welding suppliers on the platform, anonymised.',
    table: {
      caption: 'Your figures against the category average, last ' + period + ' days',
      columns: ['Measure', 'You', 'Category average'],
      rows: [
        ['Win rate', AN_pct(s.winRate), AN_pct(s.categoryWinRate)],
        ['Average response time', AN_hrs(s.responseHrs), AN_hrs(s.categoryResponseHrs)],
      ],
    },
    children: AN_h(
      'div',
      {
        className: 'gac-an-bench',
        style: {
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr)',
          columnGap: '32px',
          rowGap: '24px',
          paddingTop: '4px',
        },
      },
      AN_measure(
        'win',
        'Win rate',
        'Higher is better',
        lines.win,
        VZ.benchmark({
          value: s.winRate,
          benchmark: s.categoryWinRate,
          max: 50,
          format: AN_pct,
          benchmarkLabel: 'Category avg. ' + AN_pct(s.categoryWinRate),
          ariaLabel:
            'Win rate ' +
            AN_pct(s.winRate) +
            ', category average ' +
            AN_pct(s.categoryWinRate) +
            ': ' +
            lines.win +
            '.',
        }),
      ),
      AN_measure(
        'response',
        'Response time',
        'Lower is better',
        lines.response,
        VZ.benchmark({
          value: s.responseHrs,
          benchmark: s.categoryResponseHrs,
          max: 8,
          lowerIsBetter: true,
          format: AN_hrs,
          benchmarkLabel: 'Category avg. ' + AN_hrs(s.categoryResponseHrs),
          ariaLabel:
            'Average response ' +
            AN_hrs(s.responseHrs) +
            ', category average ' +
            AN_hrs(s.categoryResponseHrs) +
            ': ' +
            lines.response +
            '.',
        }),
      ),
    ),
  });
}

/* Where clients found you (DiscoveryFigures.tsx): ranked bars on one hue,
   value and share at every tip. The promoted placement is tagged in words
   and keeps the sea bar; "Direct link and other" sits last in the neutral. */
function AN_sources(period) {
  const s = DK.PERIOD_SUMMARY[period];
  const total = s.sources.reduce((a, r) => a + r.value, 0);
  const top = s.sources[0];
  const promoted = s.sources.find((r) => r.promoted);
  const tip = (v) => AN_count(v) + ' · ' + AN_share(v, total) + '%';
  return VZ.figure({
    testId: 'analytics-sources',
    title: 'Where clients found you',
    subtitle: 'Profile views by source · last ' + period + ' days',
    takeaway:
      ((top && top.label) || '') +
      ' brought ' +
      AN_share((top && top.value) || 0, total) +
      '% of ' +
      AN_count(total) +
      ' profile views' +
      (promoted ? '; the promoted placement ' + AN_share(promoted.value, total) + '%' : '') +
      '.',
    table: {
      caption: 'Profile views by source, last ' + period + ' days',
      columns: ['Source', 'Profile views', 'Share'],
      rows: s.sources.map((r) => [
        r.promoted ? r.label + ' (promoted)' : r.label,
        AN_count(r.value),
        AN_share(r.value, total) + '%',
      ]),
    },
    /* The kit puts the space before "▲ Promoted" itself, so the tag wraps
       under the label as a whole rather than splitting it. */
    children: VZ.hbars({
      rows: s.sources.map((r) =>
        Object.assign(
          { id: r.label, label: r.label, value: r.value, valueLabel: tip(r.value) },
          r.promoted ? { tag: '▲ Promoted' } : {},
          r.other ? { color: VZ.C.other } : {},
        ),
      ),
      format: AN_count,
      ariaLabel: 'Profile views by source, last ' + period + ' days',
    }),
  });
}

/* Searches that found you: the five terms that surfaced the profile. */
function AN_searches(period) {
  const s = DK.PERIOD_SUMMARY[period];
  const top = s.searches[0];
  return VZ.figure({
    testId: 'analytics-searches',
    title: 'Searches that found you',
    subtitle: 'Top five search terms · last ' + period + ' days',
    takeaway:
      '“' +
      ((top && top.term) || '') +
      '” showed your profile most often, ' +
      AN_count((top && top.count) || 0) +
      ' times in the last ' +
      period +
      ' days.',
    table: {
      caption: 'Search terms that showed the profile, last ' + period + ' days',
      columns: ['Search term', 'Searches'],
      rows: s.searches.map((t) => [t.term, AN_count(t.count)]),
    },
    children: VZ.hbars({
      rows: s.searches.map((t) => ({ id: t.term, label: '“' + t.term + '”', value: t.count })),
      format: AN_count,
      ariaLabel: 'Search terms that showed your profile, last ' + period + ' days',
    }),
  });
}

/* When requests arrive (DemandFigure.tsx): weekday by two-hour heatmap on
   the sequential sea ramp, quantised to five labelled steps, with the three
   readings a supplier would act on beside it. */
function AN_demand(period) {
  const grid = DK.PERIOD_SUMMARY[period].heatmap;
  const d = AN_readDemand(grid);
  const cellLabel = (row, col, v) =>
    (DK.WEEKDAY_NAMES[DK.WEEKDAYS.indexOf(row)] ?? row) +
    ' ' +
    (DK.HOUR_BLOCK_NAMES[DK.HOUR_BLOCKS.indexOf(col)] ?? col) +
    ' · ' +
    AN_requests(v);
  const facts = [
    {
      term: 'Busiest two hours',
      value: d.peak.day + ' ' + d.peak.block,
      detail: AN_requests(d.peak.count),
    },
    {
      term: 'Busiest day',
      value: d.busiestDay.day,
      detail: AN_count(d.busiestDay.count) + ' of ' + AN_requests(d.total),
    },
    {
      term: 'Out of hours',
      value: AN_share(d.outOfHours, d.total) + '%',
      detail:
        AN_count(d.outOfHours) +
        ' of ' +
        AN_requests(d.total) +
        ' came before 08:00, after 18:00 or at a weekend',
    },
  ];
  return VZ.figure({
    testId: 'analytics-heatmap',
    title: 'When requests arrive',
    subtitle: 'Quote requests by weekday and time of day · last ' + period + ' days',
    takeaway:
      'Requests cluster on weekday mornings, peaking on ' +
      d.peak.day +
      ' ' +
      d.peak.block +
      ' with ' +
      AN_requests(d.peak.count) +
      '.',
    table: {
      caption: 'Quote requests by weekday and two-hour block, last ' + period + ' days',
      columns: ['Day'].concat(DK.HOUR_BLOCKS),
      rows: grid.map((row, r) => [DK.WEEKDAYS[r] ?? ''].concat(row.map(AN_count))),
    },
    children: AN_h(
      'div',
      {
        className: 'gac-an-demand',
        style: {
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr)',
          columnGap: '40px',
          rowGap: '24px',
        },
      },
      AN_h(
        'div',
        { key: 'map', style: { minWidth: 0 } },
        VZ.heatmap({
          rows: DK.WEEKDAYS.slice(),
          cols: DK.HOUR_BLOCKS.slice(),
          values: grid,
          bins: AN_BINS[period],
          cellLabel: cellLabel,
          ariaLabel: 'Quote requests by weekday and two-hour block, last ' + period + ' days',
        }),
      ),
      AN_h(
        'dl',
        {
          key: 'facts',
          className: 'gac-an-facts',
          style: {
            margin: 0,
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr)',
            alignContent: 'start',
            columnGap: '24px',
            rowGap: '16px',
            borderTop: '1px solid #E5EAF1',
            paddingTop: '20px',
          },
        },
        facts.map((f) =>
          AN_h(
            'div',
            { key: f.term, style: { minWidth: 0 } },
            AN_h('dt', { style: { margin: 0, fontSize: '12px', color: AN_INK_SOFT } }, f.term),
            AN_h(
              'dd',
              {
                style: {
                  margin: '2px 0 0',
                  fontFamily: AN_DISPLAY,
                  fontSize: '17px',
                  lineHeight: 1.375,
                  fontWeight: 700,
                  color: AN_INK,
                },
              },
              f.value,
            ),
            AN_h(
              'dd',
              {
                style: { margin: 0, fontSize: '12.5px', lineHeight: 1.375, color: AN_INK_SOFT },
              },
              f.detail,
            ),
          ),
        ),
      ),
    ),
  });
}

/* Ratings (RatingsFigure.tsx): the score never travels without its count,
   and the bars show what sits behind it, 5 ★ down to 1 ★ in one hue. All
   time, so the period switch leaves it alone. Set in ink: this screen keeps
   gold out entirely. */
function AN_ratings(rating, ratingCount) {
  const dist = DK.RATINGS_DISTRIBUTION;
  const total = dist.reduce((a, r) => a + r.count, 0);
  const fourPlus = dist.filter((r) => r.stars >= 4).reduce((a, r) => a + r.count, 0);
  const fiveRow = dist.find((r) => r.stars === 5);
  const five = fiveRow ? fiveRow.count : 0;
  const countLabel = AN_plural(ratingCount, 'rating', 'ratings');
  return VZ.figure({
    testId: 'analytics-ratings',
    title: 'Ratings',
    subtitle: 'All time · from clients and GAC agents on completed jobs',
    takeaway:
      rating.toFixed(1) +
      ' stars from ' +
      countLabel +
      '; ' +
      AN_count(five) +
      ' of them five stars.',
    table: {
      caption: 'Ratings by stars, all time',
      columns: ['Stars', 'Ratings', 'Share'],
      rows: dist.map((r) => [r.stars + ' ★', AN_count(r.count), AN_share(r.count, total) + '%']),
    },
    children: AN_h(
      'div',
      {
        className: 'gac-an-ratings',
        style: {
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr)',
          alignItems: 'center',
          columnGap: '40px',
          rowGap: '20px',
        },
      },
      AN_h(
        'div',
        { key: 'score' },
        AN_h(
          'p',
          {
            style: {
              margin: 0,
              fontFamily: AN_DISPLAY,
              fontSize: '26px',
              lineHeight: 1,
              fontWeight: 700,
              color: AN_INK,
              fontVariantNumeric: 'tabular-nums',
            },
          },
          rating.toFixed(1) + ' ★',
        ),
        AN_h(
          'p',
          { style: { margin: '6px 0 0', fontSize: '13px', fontWeight: 600, color: AN_INK } },
          countLabel,
        ),
        AN_h(
          'p',
          {
            style: {
              margin: '4px 0 0',
              fontSize: '12.5px',
              lineHeight: 1.375,
              color: AN_INK_SOFT,
            },
          },
          AN_share(fourPlus, total) + '% rated four or five stars',
        ),
      ),
      AN_h(
        'div',
        { key: 'bars', style: { minWidth: 0 } },
        VZ.hbars({
          rows: dist.map((r) => ({
            id: 'stars-' + r.stars,
            label: r.stars + ' ★',
            value: r.count,
          })),
          format: AN_count,
          ariaLabel: 'Ratings by stars, ' + AN_count(total) + ' in all',
        }),
      ),
    ),
  });
}

/* Every element the screen shows for one period. The data is fixed, so
   this runs once per period and the same elements are handed back on every
   later render. */
function AN_build(period, supplier) {
  return {
    kpis: AN_kpisFor(period).map((k) => AN_tile(k, period)),
    trend: AN_trend(period, supplier.name),
    funnel: AN_funnel(period),
    benchmark: AN_benchmark(period),
    sources: AN_sources(period),
    searches: AN_searches(period),
    demand: AN_demand(period),
    ratings: AN_ratings(supplier.rating, supplier.ratingCount),
  };
}

/* "30 days | 90 days": the pressed period reads white on ink, as the site's
   PeriodSwitch. The phone height and the hover colour live in base.css
   (gac-an-seg), because inline styles cannot carry either. */
function AN_segStyle(on) {
  return (
    'display:inline-flex;align-items:center;justify-content:center;min-height:34px;min-width:88px;' +
    'padding:0 14px;border:none;border-radius:6px;font-family:inherit;font-size:13px;font-weight:700;' +
    'font-variant-numeric:tabular-nums;cursor:pointer;transition:color .15s,background-color .15s;' +
    (on ? 'background:#0A2540;color:#FFFFFF;' : 'background:transparent;color:#33475F;')
  );
}

(Component._features = Component._features || []).push({
  state() {
    return { anPeriod: 30 };
  },
  vals(st) {
    const period = AN_PERIODS.includes(st.anPeriod) ? st.anPeriod : 30;
    const supplier = (this.SUPPLIERS || []).find((x) => x.id === DK.DEMO_SUPPLIER_ID) || {
      name: 'Silver City Welding',
      rating: 4.4,
      ratingCount: 72,
    };
    if (!this._anSetters) {
      this._anSetters = {
        30: () => this.setState({ anPeriod: 30 }),
        90: () => this.setState({ anPeriod: 90 }),
      };
    }
    /* Build the charts only while the screen is showing. */
    const on = st.route === 'analytics';
    let els = null;
    if (on) {
      this._anEls = this._anEls || {};
      if (!this._anEls[period]) this._anEls[period] = AN_build(period, supplier);
      els = this._anEls[period];
    }
    return {
      anTitle: supplier.name + ' — performance',
      anPeriod: period,
      anRange: AN_periodRange(period) + ' · against the ' + period + ' days before',
      anCalendarIcon: on ? this._anCalendar || (this._anCalendar = AN_icon('calendar', 14)) : null,
      anSeg30Style: AN_segStyle(period === 30),
      anSeg90Style: AN_segStyle(period === 90),
      anSeg30Pressed: period === 30 ? 'true' : 'false',
      anSeg90Pressed: period === 90 ? 'true' : 'false',
      anSet30: this._anSetters[30],
      anSet90: this._anSetters[90],
      anKpisLabel: 'Key figures, last ' + period + ' days',
      anKpis: els ? els.kpis : null,
      anTrend: els ? els.trend : null,
      anFunnel: els ? els.funnel : null,
      anBenchmark: els ? els.benchmark : null,
      anSources: els ? els.sources : null,
      anSearches: els ? els.searches : null,
      anDemand: els ? els.demand : null,
      anRatings: els ? els.ratings : null,
    };
  },
});
