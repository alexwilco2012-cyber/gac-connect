/**
 * Supplier analytics (live dashboards, 23 Sep; spec §5.1) — Silver City
 * Welding's example dashboard, illustrative like everything else here.
 *
 * The daily series were generated once by a seeded script (mulberry32,
 * weekday-weighted, a gentle upward trend, each 30-day block drawn to its exact
 * total) and pasted in as literals, so the site and the deck draw the same
 * numbers and a reload never reshuffles them. The totals the copy quotes are
 * pinned by `tests/analyticsData.test.ts`:
 *
 *                   last 30   previous 30   days 61–90   90 days   "previous 90"
 *   profile views     412         349          318        1,079        951
 *   quote requests     38          34           29          101         88
 *
 * Calendar: 90 days ending Wed 23 Sep 2026 — "yesterday" from the demo's
 * Thursday 08:00.
 */

export type Period = 30 | 90;

/** 'Fri 26 Jun' … 'Wed 23 Sep' — one label per day, oldest first. */
export const DAY_LABELS_90: readonly string[] = (() => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const end = Date.UTC(2026, 8, 23);
  return Array.from({ length: 90 }, (_, i) => {
    const d = new Date(end - (89 - i) * 86_400_000);
    return `${days[(d.getUTCDay() + 6) % 7]} ${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
  });
})();

/** Thirteen trailing weeks ending Wed 23 Sep; the oldest is six days (90 = 12 × 7 + 6). */
export const WEEK_LABELS_13: readonly string[] = [
  '26 Jun–1 Jul',
  '2–8 Jul',
  '9–15 Jul',
  '16–22 Jul',
  '23–29 Jul',
  '30 Jul–5 Aug',
  '6–12 Aug',
  '13–19 Aug',
  '20–26 Aug',
  '27 Aug–2 Sep',
  '3–9 Sep',
  '10–16 Sep',
  '17–23 Sep',
];

/** Profile views per day. */
export const VIEWS_90: readonly number[] = [
  11, 5, 5, 14, 15, 12, 13, 12, 5, 5, 13, 14, 12, 13, 11, 5, 5, 12, 14, 15, 12, 11, 5, 5, 14, 16,
  13, 12, 13, 6, 5, 13, 16, 14, 15, 14, 5, 5, 13, 14, 14, 13, 11, 6, 5, 13, 14, 13, 15, 14, 6, 6,
  16, 15, 14, 15, 15, 7, 6, 17, 18, 18, 14, 12, 7, 5, 18, 17, 18, 17, 13, 7, 7, 15, 20, 15, 16, 13,
  7, 6, 18, 18, 17, 14, 16, 8, 6, 16, 17, 19,
];

/** Quote requests per day. The last 30 peak once, at 4 on Tue 1 Sep. */
export const REQUESTS_90: readonly number[] = [
  1, 0, 1, 0, 1, 1, 3, 1, 0, 0, 0, 2, 2, 0, 2, 0, 0, 3, 3, 2, 3, 1, 0, 0, 2, 0, 1, 0, 0, 0, 0, 1, 3,
  0, 0, 3, 0, 1, 2, 0, 3, 0, 1, 0, 0, 1, 3, 1, 2, 0, 1, 0, 4, 2, 2, 0, 2, 0, 0, 2, 1, 1, 3, 0, 0, 0,
  1, 4, 1, 1, 1, 0, 0, 2, 3, 2, 1, 1, 0, 0, 3, 2, 1, 1, 1, 0, 0, 3, 2, 3,
];

/** Category average views per day across verified Welding suppliers — smoother, 9.1 a day. */
export const CATEGORY_VIEWS_90: readonly number[] = [
  8.5, 6.7, 6.5, 9.6, 9.7, 9.4, 9.3, 8.7, 7, 6.5, 9.4, 9.6, 9.8, 9.4, 8.8, 7, 6.4, 9.7, 9.7, 10,
  9.4, 9.2, 7, 6.4, 9.6, 9.8, 9.8, 9.8, 8.9, 7.3, 6.6, 9.9, 10.2, 10.2, 9.8, 9.4, 7.4, 6.5, 9.8,
  10.1, 9.9, 9.5, 9.1, 7.4, 6.7, 10, 10.2, 10.4, 10, 9.5, 7.3, 6.8, 9.9, 10.1, 10.4, 9.9, 9.3, 7.5,
  6.8, 10, 10.6, 10.6, 10.1, 9.8, 7.6, 7.1, 10.1, 10.6, 10.5, 10.5, 9.9, 7.7, 7.1, 10.8, 11, 10.5,
  10.5, 9.5, 7.7, 7, 10.7, 10.8, 10.8, 10.7, 9.9, 7.9, 7.1, 10.7, 11, 10.7,
];

/** Heatmap rows, Monday first. */
export const WEEKDAYS: readonly string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAY_NAMES: readonly string[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/** Heatmap columns: twelve two-hour blocks. */
export const HOUR_BLOCKS: readonly string[] = Array.from(
  { length: 12 },
  (_, i) => `${String(i * 2).padStart(2, '0')}–${String(i * 2 + 2).padStart(2, '0')}`,
);
/** The same blocks as times, for tooltips: '08:00–10:00'. */
export const HOUR_BLOCK_NAMES: readonly string[] = Array.from(
  { length: 12 },
  (_, i) => `${String(i * 2).padStart(2, '0')}:00–${String(i * 2 + 2).padStart(2, '0')}:00`,
);

/**
 * When requests arrive: rows Mon–Sun × two-hour blocks. Each row is that
 * weekday's requests in the period, so the heatmap and the daily series agree;
 * the 90-day grid is the 30-day grid plus the 60 days before it. One peak in
 * each, at Tuesday 08:00–10:00.
 */
const HEATMAP_30: number[][] = [
  [0, 0, 0, 2, 2, 2, 0, 0, 1, 2, 0, 0],
  [0, 1, 0, 2, 5, 0, 1, 2, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 4, 2, 1, 0, 0, 0, 0],
  [0, 0, 1, 0, 0, 1, 0, 1, 2, 0, 0, 1],
  [0, 0, 0, 0, 2, 0, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];
const HEATMAP_90: number[][] = [
  [0, 0, 0, 3, 7, 5, 1, 0, 5, 3, 0, 0],
  [0, 1, 1, 3, 9, 2, 4, 4, 1, 0, 1, 0],
  [0, 0, 0, 2, 3, 7, 3, 2, 2, 1, 0, 0],
  [0, 0, 1, 3, 1, 3, 1, 1, 2, 0, 1, 1],
  [1, 0, 0, 1, 3, 1, 1, 2, 3, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
];

export interface PeriodSummary {
  views: number;
  viewsPrev: number;
  requests: number;
  requestsPrev: number;
  /** Per cent, whole numbers. */
  winRate: number;
  winRatePrev: number;
  won: number;
  quoted: number;
  responseHrs: number;
  responseHrsPrev: number;
  /** Premium only (market benchmarking): the anonymised category average. */
  categoryWinRate: number;
  categoryResponseHrs: number;
  funnel: { label: string; value: number }[];
  sources: { label: string; value: number; promoted?: boolean; other?: boolean }[];
  searches: { term: string; count: number }[];
  heatmap: number[][];
}

const SEARCH_TERMS = [
  'coded welder aberdeen',
  'onboard welding repair',
  'pipework repair',
  'skid frame fabrication',
  '24/7 welding call-out',
] as const;

const SOURCE_LABELS = [
  'Marketplace search',
  'Welding category page',
  'Promoted placement',
  'Service-line hub',
  'Direct link and other',
] as const;

const FUNNEL_LABELS = [
  'Search appearances',
  'Profile views',
  'Quote requests',
  'Quotes sent',
  'Jobs won',
] as const;

function summary(p: {
  views: number;
  viewsPrev: number;
  requests: number;
  requestsPrev: number;
  winRate: number;
  winRatePrev: number;
  won: number;
  quoted: number;
  responseHrs: number;
  responseHrsPrev: number;
  categoryWinRate: number;
  categoryResponseHrs: number;
  appearances: number;
  sources: readonly [number, number, number, number, number];
  searches: readonly [number, number, number, number, number];
  heatmap: number[][];
}): PeriodSummary {
  const funnelValues = [p.appearances, p.views, p.requests, p.quoted, p.won];
  return {
    views: p.views,
    viewsPrev: p.viewsPrev,
    requests: p.requests,
    requestsPrev: p.requestsPrev,
    winRate: p.winRate,
    winRatePrev: p.winRatePrev,
    won: p.won,
    quoted: p.quoted,
    responseHrs: p.responseHrs,
    responseHrsPrev: p.responseHrsPrev,
    categoryWinRate: p.categoryWinRate,
    categoryResponseHrs: p.categoryResponseHrs,
    funnel: FUNNEL_LABELS.map((label, i) => ({ label, value: funnelValues[i]! })),
    sources: SOURCE_LABELS.map((label, i) => ({
      label,
      value: p.sources[i]!,
      ...(i === 2 ? { promoted: true } : {}),
      ...(i === 4 ? { other: true } : {}),
    })),
    searches: SEARCH_TERMS.map((term, i) => ({ term, count: p.searches[i]! })),
    heatmap: p.heatmap.map((row) => [...row]),
  };
}

export const PERIOD_SUMMARY: Record<Period, PeriodSummary> = {
  30: summary({
    views: 412,
    viewsPrev: 349,
    requests: 38,
    requestsPrev: 34,
    winRate: 34,
    winRatePrev: 30,
    won: 12,
    quoted: 35,
    responseHrs: 2.1,
    responseHrsPrev: 2.6,
    categoryWinRate: 27,
    categoryResponseHrs: 5.4,
    appearances: 2960,
    sources: [168, 104, 71, 38, 31],
    searches: [64, 41, 33, 18, 15],
    heatmap: HEATMAP_30,
  }),
  90: summary({
    views: 1079,
    viewsPrev: 951,
    requests: 101,
    requestsPrev: 88,
    winRate: 32,
    winRatePrev: 29,
    won: 30,
    quoted: 93,
    responseHrs: 2.4,
    responseHrsPrev: 2.9,
    categoryWinRate: 26,
    categoryResponseHrs: 5.6,
    appearances: 8140,
    sources: [441, 272, 186, 99, 81],
    searches: [171, 118, 92, 49, 37],
    heatmap: HEATMAP_90,
  }),
};

/** What each funnel step says about the one before it, in order after the first. */
export const FUNNEL_RATE_VERBS: readonly string[] = [
  'opened your profile',
  'asked for a quote',
  'quoted',
  'won',
];

/**
 * One funnel step as a share of the one before: whole per cent from 20% up,
 * one decimal below it ("13.9%", "9.2%", "92%"), so a small rate keeps its
 * detail and a large one does not pretend to it. The one rounding rule for
 * every funnel on the site.
 */
export function stepRate(from: number, to: number): string {
  const pct = from === 0 ? 0 : (to / from) * 100;
  return pct >= 20 ? `${Math.round(pct)}%` : `${pct.toFixed(1)}%`;
}

/** "13.9% opened your profile", "9.2% asked for a quote", "92% quoted", "34% won". */
export function funnelRateLabels(funnel: readonly { value: number }[]): string[] {
  return FUNNEL_RATE_VERBS.map(
    (verb, i) => `${stepRate(funnel[i]?.value ?? 0, funnel[i + 1]?.value ?? 0)} ${verb}`,
  );
}

/** Ratings behind the 4.4 ★ · 72 ratings on the profile. All time, not per period. */
export const RATINGS_DISTRIBUTION: readonly { stars: 5 | 4 | 3 | 2 | 1; count: number }[] = [
  { stars: 5, count: 42 },
  { stars: 4, count: 21 },
  { stars: 3, count: 6 },
  { stars: 2, count: 2 },
  { stars: 1, count: 1 },
];

/** Trailing seven-day sums ending on the last value; the oldest bin takes the remainder. */
export function weeklySums(values: readonly number[]): number[] {
  const out: number[] = [];
  for (let end = values.length; end > 0; end -= 7) {
    const start = Math.max(0, end - 7);
    out.unshift(values.slice(start, end).reduce((a, b) => a + b, 0));
  }
  return out;
}

export interface PeriodSeries {
  /** One label per day in the period. */
  labels: string[];
  /** Daily profile views. */
  views: number[];
  /** Daily category average views (the Premium benchmark line). */
  category: number[];
  /** Quote requests — daily at 30 days, weekly sums at 90 (13 columns). */
  requests: number[];
  /** Labels matching `requests`: days at 30, weeks at 90. */
  requestLabels: string[];
  /** KPI sparklines — daily at 30 days, weekly sums at 90 (13 points). */
  sparkViews: number[];
  sparkRequests: number[];
}

/** Every series the analytics screen draws for one period. */
export function seriesFor(period: Period): PeriodSeries {
  const from = 90 - period;
  const labels = DAY_LABELS_90.slice(from);
  const views = VIEWS_90.slice(from);
  const requests = REQUESTS_90.slice(from);
  const category = CATEGORY_VIEWS_90.slice(from);
  if (period === 30) {
    return {
      labels,
      views,
      category,
      requests,
      requestLabels: [...labels],
      sparkViews: [...views],
      sparkRequests: [...requests],
    };
  }
  const weeklyRequests = weeklySums(requests);
  return {
    labels,
    views,
    category,
    requests: weeklyRequests,
    requestLabels: [...WEEK_LABELS_13],
    sparkViews: weeklySums(views),
    sparkRequests: [...weeklyRequests],
  };
}
