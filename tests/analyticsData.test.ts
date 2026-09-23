import { describe, expect, it } from 'vitest';
import {
  CATEGORY_VIEWS_90,
  DAY_LABELS_90,
  HOUR_BLOCKS,
  PERIOD_SUMMARY,
  RATINGS_DISTRIBUTION,
  REQUESTS_90,
  VIEWS_90,
  WEEK_LABELS_13,
  WEEKDAYS,
  seriesFor,
  weeklySums,
  type Period,
} from '../src/data/analytics';
import { ANALYTICS_EXAMPLE } from '../src/data/plans';
import { supplierById } from '../src/data/suppliers';
import { EARNINGS_MONTHS, EARNINGS_WON, SUPPLIER_KPIS } from '../src/data/supplierDesk';
import { supplierKeeps } from '../src/lib/commission';

/**
 * Supplier analytics (live dashboards, spec §5.1). The series were generated
 * once by a seeded script and pasted in as literals, so both surfaces draw the
 * same numbers; these tests pin the totals the copy quotes, so a hand edit to a
 * single day cannot quietly make "412 profile views" untrue.
 */

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

function maxCount(xs: readonly number[]): { max: number; at: number[] } {
  const max = Math.max(...xs);
  return { max, at: xs.flatMap((v, i) => (v === max ? [i] : [])) };
}

describe('the 90-day calendar', () => {
  it('runs 90 days from Fri 26 Jun to Wed 23 Sep 2026', () => {
    expect(DAY_LABELS_90).toHaveLength(90);
    expect(DAY_LABELS_90[0]).toBe('Fri 26 Jun');
    expect(DAY_LABELS_90[89]).toBe('Wed 23 Sep');
    expect(new Set(DAY_LABELS_90).size).toBe(90);
  });

  it('has a value for every day in every series', () => {
    expect(VIEWS_90).toHaveLength(90);
    expect(REQUESTS_90).toHaveLength(90);
    expect(CATEGORY_VIEWS_90).toHaveLength(90);
    for (const v of [...VIEWS_90, ...REQUESTS_90]) {
      expect(Number.isInteger(v) && v >= 0).toBe(true);
    }
  });

  it('bins into thirteen trailing weeks, the oldest taking the remainder', () => {
    expect(WEEK_LABELS_13).toHaveLength(13);
    expect(WEEK_LABELS_13[0]).toBe('26 Jun–1 Jul');
    expect(WEEK_LABELS_13[12]).toBe('17–23 Sep');
    expect(weeklySums(REQUESTS_90)).toHaveLength(13);
    expect(sum(weeklySums(REQUESTS_90))).toBe(101);
    expect(weeklySums([1, 1, 1, 1, 1, 1, 1, 1, 1])).toEqual([2, 7]);
  });
});

describe('hard totals (spec §5.1)', () => {
  it('profile views: 412 last 30, 349 the 30 before, 318 before that, 1,079 in all', () => {
    expect(sum(VIEWS_90.slice(60))).toBe(412);
    expect(sum(VIEWS_90.slice(30, 60))).toBe(349);
    expect(sum(VIEWS_90.slice(0, 30))).toBe(318);
    expect(sum(VIEWS_90)).toBe(1079);
  });

  it('quote requests: 38 last 30, 34 the 30 before, 29 before that, 101 in all', () => {
    expect(sum(REQUESTS_90.slice(60))).toBe(38);
    expect(sum(REQUESTS_90.slice(30, 60))).toBe(34);
    expect(sum(REQUESTS_90.slice(0, 30))).toBe(29);
    expect(sum(REQUESTS_90)).toBe(101);
  });

  it('the last 30 days of requests have one peak, so one day can be labelled', () => {
    const { at } = maxCount(REQUESTS_90.slice(60));
    expect(at).toHaveLength(1);
    // Never the final day, where the end label already sits.
    expect(at[0]).toBeLessThan(29);
  });

  it('the category average runs at 9.1 views a day', () => {
    expect(Math.round((sum(CATEGORY_VIEWS_90) / 90) * 10) / 10).toBe(9.1);
  });

  it('the summaries agree with the series they summarise', () => {
    expect(PERIOD_SUMMARY[30].views).toBe(412);
    expect(PERIOD_SUMMARY[30].viewsPrev).toBe(349);
    expect(PERIOD_SUMMARY[30].requests).toBe(38);
    expect(PERIOD_SUMMARY[30].requestsPrev).toBe(34);
    expect(PERIOD_SUMMARY[90].views).toBe(1079);
    expect(PERIOD_SUMMARY[90].viewsPrev).toBe(951);
    expect(PERIOD_SUMMARY[90].requests).toBe(101);
    expect(PERIOD_SUMMARY[90].requestsPrev).toBe(88);
  });
});

describe('period summaries', () => {
  const periods: Period[] = [30, 90];

  it.each(periods)(
    '%i days: the funnel only narrows, and its steps are the headline figures',
    (p) => {
      const s = PERIOD_SUMMARY[p];
      const values = s.funnel.map((f) => f.value);
      expect(values).toHaveLength(5);
      for (let i = 1; i < values.length; i += 1) {
        expect(values[i]!).toBeLessThanOrEqual(values[i - 1]!);
      }
      expect(values[1]).toBe(s.views);
      expect(values[2]).toBe(s.requests);
      expect(values[3]).toBe(s.quoted);
      expect(values[4]).toBe(s.won);
      expect(Math.round((s.won / s.quoted) * 100)).toBe(s.winRate);
    },
  );

  it.each(periods)('%i days: traffic sources add up to the profile views', (p) => {
    const s = PERIOD_SUMMARY[p];
    expect(sum(s.sources.map((x) => x.value))).toBe(s.views);
    expect(s.sources.at(-1)?.other).toBe(true);
    expect(s.sources.filter((x) => x.promoted)).toHaveLength(1);
  });

  it.each(periods)(
    '%i days: the heatmap is 7 × 12, sums to the requests, peaks once at Tue 08–10',
    (p) => {
      const s = PERIOD_SUMMARY[p];
      expect(s.heatmap).toHaveLength(7);
      for (const row of s.heatmap) expect(row).toHaveLength(12);
      const flat = s.heatmap.flat();
      expect(sum(flat)).toBe(s.requests);
      const { at } = maxCount(flat);
      expect(at).toEqual([1 * 12 + 4]);
      expect(WEEKDAYS[1]).toBe('Tue');
      expect(HOUR_BLOCKS[4]).toBe('08–10');
    },
  );

  it('the heatmap rows are the requests by weekday, so the two views agree', () => {
    // Day 0 is a Friday; Monday is row 0.
    const byDay = (from: number) => {
      const rows = [0, 0, 0, 0, 0, 0, 0];
      REQUESTS_90.slice(from).forEach((v, i) => {
        rows[(4 + from + i) % 7]! += v;
      });
      return rows;
    };
    expect(PERIOD_SUMMARY[30].heatmap.map(sum)).toEqual(byDay(60));
    expect(PERIOD_SUMMARY[90].heatmap.map(sum)).toEqual(byDay(0));
  });

  it('search terms rank highest first', () => {
    for (const p of periods) {
      const counts = PERIOD_SUMMARY[p].searches.map((s) => s.count);
      expect(counts).toEqual([...counts].sort((a, b) => b - a));
      expect(counts).toHaveLength(5);
    }
  });

  it('benchmarks are the category averages the takeaways quote', () => {
    const s = PERIOD_SUMMARY[30];
    expect(s.winRate - s.categoryWinRate).toBe(7);
    expect(Math.round((s.categoryResponseHrs - s.responseHrs) * 10) / 10).toBe(3.3);
  });
});

describe('seriesFor', () => {
  it('30 days: daily everything, ending yesterday', () => {
    const s = seriesFor(30);
    expect(s.labels).toHaveLength(30);
    expect(s.labels[29]).toBe('Wed 23 Sep');
    expect(sum(s.views)).toBe(412);
    expect(sum(s.requests)).toBe(38);
    expect(s.requests).toHaveLength(30);
    expect(s.requestLabels).toEqual(s.labels);
    expect(s.category).toHaveLength(30);
    expect(s.sparkViews).toHaveLength(30);
  });

  it('90 days: views stay daily, requests and the sparklines go weekly (13 points)', () => {
    const s = seriesFor(90);
    expect(s.labels).toHaveLength(90);
    expect(s.views).toHaveLength(90);
    expect(s.requests).toHaveLength(13);
    expect(s.requestLabels).toEqual([...WEEK_LABELS_13]);
    expect(sum(s.requests)).toBe(101);
    expect(s.sparkViews).toHaveLength(13);
    expect(sum(s.sparkViews)).toBe(1079);
    expect(s.sparkRequests).toHaveLength(13);
  });
});

describe('ratings distribution', () => {
  it('sums to the 72 ratings on the profile and averages 4.4', () => {
    const supplier = supplierById('silver-city-welding')!;
    const total = sum(RATINGS_DISTRIBUTION.map((r) => r.count));
    const mean = sum(RATINGS_DISTRIBUTION.map((r) => r.stars * r.count)) / total;
    expect(total).toBe(supplier.ratingCount);
    expect(Math.round(mean * 10) / 10).toBe(supplier.rating);
    expect(RATINGS_DISTRIBUTION.map((r) => r.stars)).toEqual([5, 4, 3, 2, 1]);
  });
});

describe('one series behind every surface', () => {
  it('the headline example keeps its values', () => {
    expect(ANALYTICS_EXAMPLE.map((a) => a.value)).toEqual(['412', '38', '34%', '2.1 hrs']);
  });

  it('the supplier KPI tiles quote the same figures, with honest deltas', () => {
    const byId = Object.fromEntries(SUPPLIER_KPIS.map((k) => [k.id, k]));
    const s = PERIOD_SUMMARY[30];
    expect(byId.views?.value).toBe('412');
    expect(byId.requests?.value).toBe('38');
    expect(byId.win?.value).toBe('34%');
    expect(byId.response?.value).toBe('2.1 hrs');
    expect(byId.views?.delta).toContain(`+${Math.round((s.views / s.viewsPrev - 1) * 100)}%`);
    expect(byId.requests?.delta).toContain(
      `+${Math.round((s.requests / s.requestsPrev - 1) * 100)}%`,
    );
    expect(byId.win?.delta).toContain(`+${s.winRate - s.winRatePrev} pts`);
    expect(byId.win?.delta).toContain(`${s.won} won of ${s.quoted} quoted`);
    expect([...(byId.views?.series ?? [])]).toEqual(VIEWS_90.slice(60));
    expect([...(byId.requests?.series ?? [])]).toEqual(REQUESTS_90.slice(60));
  });

  it('earnings: £56,100 won and £50,490 kept on the Premium band', () => {
    expect(EARNINGS_MONTHS).toEqual(['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']);
    expect(sum(EARNINGS_WON)).toBe(56_100);
    expect(sum(EARNINGS_WON.map((w) => supplierKeeps(w, 'premium')))).toBe(50_490);
  });
});
