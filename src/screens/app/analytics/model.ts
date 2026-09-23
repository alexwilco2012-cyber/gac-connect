import type { IconName } from '../../../components/ui/Icon';
import {
  DAY_LABELS_90,
  HOUR_BLOCK_NAMES,
  PERIOD_SUMMARY,
  seriesFor,
  WEEKDAY_NAMES,
  type Period,
} from '../../../data/analytics';

/**
 * What the analytics screen says about its figures — pure, so the words and
 * the numbers cannot drift apart. Everything here derives from
 * `data/analytics` (the one seeded dataset both surfaces draw); the deck's
 * analytics module mirrors these derivations.
 */

export const PERIODS: readonly Period[] = [30, 90];
export const DEFAULT_PERIOD: Period = 30;

/** `?period=` → a period, or null when it is missing or not one we offer. */
export function parsePeriod(raw: string | null): Period | null {
  if (raw === '30') return 30;
  if (raw === '90') return 90;
  return null;
}

export const count = (n: number) => n.toLocaleString('en-GB');

export const plural = (n: number, one: string, many: string) =>
  `${count(n)} ${n === 1 ? one : many}`;

/** Whole-number share of a total, for "168 · 41%". */
export const sharePct = (v: number, total: number) =>
  total > 0 ? Math.round((v / total) * 100) : 0;

const MINUS = '−';
const signed = (n: number) => (n < 0 ? `${MINUS}${Math.abs(n)}` : `+${n}`);
const oneDp = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

/** "25 Aug – 23 Sep 2026": the window a period covers (the calendar ends yesterday). */
export function periodRange(period: Period): string {
  const day = (label: string | undefined) => (label ?? '').replace(/^\w+ /, '');
  return `${day(DAY_LABELS_90[90 - period])} – ${day(DAY_LABELS_90.at(-1))} 2026`;
}

export interface Kpi {
  id: 'views' | 'requests' | 'win' | 'response';
  label: string;
  value: string;
  /** The chip beside the value: "+18%", "+4 pts", "−0.5 hrs". */
  change: string;
  /** The same change in words, for screen readers: "+18% on the previous 30 days". */
  changeText: string;
  /** Good news reads success, a slip warn — the direction is in the text. */
  tone: 'success' | 'warn';
  /** One line under the value: "349 in the previous 30 days". */
  caption: string;
  icon: IconName;
  /** Views and requests: daily at 30 days, weekly sums at 90 (13 points). */
  series?: readonly number[];
  /** Rates with no series: this period against the one before. */
  compare?: { now: number; before: number; unit: 'pct' | 'hrs' };
}

/** The four tiles: value, the change on the previous period, and a small visual. */
export function kpisFor(period: Period): Kpi[] {
  const s = PERIOD_SUMMARY[period];
  const series = seriesFor(period);
  const previous = `the previous ${period} days`;
  const growth = (now: number, prev: number) => `${signed(Math.round((now / prev - 1) * 100))}%`;
  const winPts = s.winRate - s.winRatePrev;
  const faster = Math.round((s.responseHrsPrev - s.responseHrs) * 10) / 10;
  const views = growth(s.views, s.viewsPrev);
  const requests = growth(s.requests, s.requestsPrev);
  return [
    {
      id: 'views',
      label: 'Profile views',
      value: count(s.views),
      change: views,
      changeText: `${views} on ${previous}`,
      tone: s.views >= s.viewsPrev ? 'success' : 'warn',
      caption: `${count(s.viewsPrev)} in ${previous}`,
      icon: 'eye',
      series: series.sparkViews,
    },
    {
      id: 'requests',
      label: 'Quote requests',
      value: count(s.requests),
      change: requests,
      changeText: `${requests} on ${previous}`,
      tone: s.requests >= s.requestsPrev ? 'success' : 'warn',
      caption: `${count(s.requestsPrev)} in ${previous}`,
      icon: 'inbox',
      series: series.sparkRequests,
    },
    {
      id: 'win',
      label: 'Win rate',
      value: `${s.winRate}%`,
      change: `${signed(winPts)} pts`,
      changeText: `${signed(winPts)} points on ${previous}`,
      tone: winPts >= 0 ? 'success' : 'warn',
      caption: `${s.won} won of ${s.quoted} quoted`,
      icon: 'trending-up',
      compare: { now: s.winRate, before: s.winRatePrev, unit: 'pct' },
    },
    {
      id: 'response',
      label: 'Avg. response time',
      value: `${oneDp(s.responseHrs)} hrs`,
      // Down is good here: the sign says which way, the tone says whether it helps.
      change: `${faster >= 0 ? MINUS : '+'}${oneDp(Math.abs(faster))} hrs`,
      changeText: `${oneDp(Math.abs(faster))} hrs ${faster >= 0 ? 'faster' : 'slower'} than ${previous}`,
      tone: faster >= 0 ? 'success' : 'warn',
      caption: 'Average time to first reply',
      icon: 'clock',
      compare: { now: s.responseHrs, before: s.responseHrsPrev, unit: 'hrs' },
    },
  ];
}

/** "34%" / "2.1 hrs" for the tiles' comparison rows. */
export const unitText = (n: number, unit: 'pct' | 'hrs') =>
  unit === 'pct' ? `${n}%` : `${oneDp(n)} hrs`;

/** "7 points above the category average" / "3.3 hrs faster than the category average". */
export function benchmarkLines(period: Period): { win: string; response: string } {
  const s = PERIOD_SUMMARY[period];
  const pts = s.winRate - s.categoryWinRate;
  const hrs = s.categoryResponseHrs - s.responseHrs;
  return {
    win:
      pts === 0
        ? 'Level with the category average'
        : `${plural(Math.abs(pts), 'point', 'points')} ${pts > 0 ? 'above' : 'below'} the category average`,
    response: `${oneDp(Math.abs(hrs))} hrs ${hrs >= 0 ? 'faster' : 'slower'} than the category average`,
  };
}

/** Days in the period on which profile views beat the category average. */
export function daysAboveCategory(period: Period): number {
  const { views, category } = seriesFor(period);
  return views.filter((v, i) => v > (category[i] ?? Infinity)).length;
}

/** Heatmap columns 4–8 are 08:00–18:00; rows 0–4 are Monday to Friday. */
const WORKDAY_ROWS = 5;
const WORK_START_COL = 4;
const WORK_END_COL = 8;

export interface DemandReading {
  total: number;
  peak: { day: string; block: string; count: number };
  busiestDay: { day: string; count: number };
  /** Before 08:00, after 18:00, or any time at the weekend. */
  outOfHours: number;
}

/** The three facts beside the heatmap, read from the grid itself. */
export function readDemand(grid: readonly (readonly number[])[]): DemandReading {
  let total = 0;
  let inHours = 0;
  let peak = { r: 0, c: 0, v: -1 };
  let day = { r: 0, v: -1 };
  grid.forEach((row, r) => {
    const rowSum = row.reduce((a, b) => a + b, 0);
    total += rowSum;
    if (rowSum > day.v) day = { r, v: rowSum };
    row.forEach((v, c) => {
      if (v > peak.v) peak = { r, c, v };
      if (r < WORKDAY_ROWS && c >= WORK_START_COL && c <= WORK_END_COL) inHours += v;
    });
  });
  return {
    total,
    peak: {
      day: WEEKDAY_NAMES[peak.r] ?? '',
      block: HOUR_BLOCK_NAMES[peak.c] ?? '',
      count: Math.max(0, peak.v),
    },
    busiestDay: { day: WEEKDAY_NAMES[day.r] ?? '', count: Math.max(0, day.v) },
    outOfHours: total - inHours,
  };
}
