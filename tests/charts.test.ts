import { createElement } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LINE_COLOURS, VIZ } from '../src/components/charts/palette';
import { StackedColumns } from '../src/components/charts/StackedColumns';
import { TimeSeriesPanels } from '../src/components/charts/TimeSeriesPanels';
import { seriesFor } from '../src/data/analytics';
import { SPEND_MONTHS } from '../src/data/clientDesk';
import { EARNINGS_MONTHS, EARNINGS_WON } from '../src/data/supplierDesk';
import { monthlySaving, spendSeries } from '../src/lib/clientDesk';
import { supplierKeeps } from '../src/lib/commission';
import { compactGbp, gbp } from '../src/lib/format';
import {
  bandLayout,
  binLabels,
  binRanges,
  columnPath,
  edgeAnchor,
  fitTicks,
  nearestIndex,
  niceTicks,
  peakIndex,
  placeTooltip,
  quantize,
  seqIndex,
  spreadLabels,
  stackSegments,
  xTickIndices,
} from '../src/components/charts/scale';

describe('niceTicks — 3 to 6 clean ticks from zero', () => {
  it('a zero or empty domain is a single tick', () => {
    expect(niceTicks(0)).toEqual([0]);
    expect(niceTicks(-3)).toEqual([0]);
    expect(niceTicks(Number.NaN)).toEqual([0]);
  });

  it('38 quote requests → tens up to 40', () => {
    expect(niceTicks(38)).toEqual([0, 10, 20, 30, 40]);
  });

  it('412 profile views → hundreds up to 500', () => {
    expect(niceTicks(412)).toEqual([0, 100, 200, 300, 400, 500]);
  });

  it('money domains land on round thousands (compactGbp never shows £7.5k)', () => {
    expect(niceTicks(45000)).toEqual([0, 10000, 20000, 30000, 40000, 50000]);
    expect(niceTicks(12600)).toEqual([0, 5000, 10000, 15000]);
    for (const t of niceTicks(12600)) expect(t % 1000).toBe(0);
  });

  it('a maximum that is already a tick is the top tick', () => {
    expect(niceTicks(40)).toEqual([0, 10, 20, 30, 40]);
    expect(niceTicks(8)).toEqual([0, 2, 4, 6, 8]);
  });

  it('integer counts never get half steps', () => {
    expect(niceTicks(4, 5, { integer: true })).toEqual([0, 1, 2, 3, 4]);
    expect(niceTicks(2, 5, { integer: true })).toEqual([0, 1, 2]);
    expect(niceTicks(2)).toEqual([0, 0.5, 1, 1.5, 2]);
  });

  it('a smaller count gives fewer ticks for short panels', () => {
    const t = niceTicks(5, 3, { integer: true });
    expect(t[0]).toBe(0);
    expect(t.at(-1)).toBeGreaterThanOrEqual(5);
    expect(t.length).toBeLessThanOrEqual(4);
  });

  it('the top tick always covers the maximum', () => {
    for (const max of [1, 3, 7, 13, 99, 101, 250, 1079, 2960, 56100]) {
      expect(niceTicks(max).at(-1)).toBeGreaterThanOrEqual(max);
    }
  });
});

describe('fitTicks — the tightest clean axis within a tick budget', () => {
  it('spend peaking at £42k tops out at £50k, not £60k', () => {
    expect(fitTicks(42000)).toEqual([0, 10000, 20000, 30000, 40000, 50000]);
  });

  it('keeps a round scale when no tighter one fits the budget', () => {
    expect(fitTicks(12600)).toEqual([0, 5000, 10000, 15000]);
  });

  it('a short panel gets three ticks', () => {
    expect(fitTicks(4, { integer: true, minTicks: 3, maxTicks: 3 })).toEqual([0, 2, 4]);
    expect(fitTicks(1890, { minTicks: 3, maxTicks: 3 })).toEqual([0, 1000, 2000]);
  });

  it('never exceeds the budget and always covers the maximum', () => {
    for (const max of [3, 9, 22, 27, 101, 412, 1079, 45000, 56100]) {
      const t = fitTicks(max);
      expect(t.length).toBeLessThanOrEqual(6);
      expect(t.at(-1)).toBeGreaterThanOrEqual(max);
    }
    expect(fitTicks(0)).toEqual([0]);
  });
});

describe('bandLayout — bars capped at 24px with at least a 2px gap', () => {
  it('six months across 300px: 50px bands, bars capped at 24px', () => {
    const b = bandLayout(6, 300);
    expect(b.band).toBe(50);
    expect(b.bar).toBe(24);
    expect(b.left(0)).toBe(13);
    expect(b.centre(0)).toBe(25);
  });

  it('bars take 60% of a narrow band', () => {
    const b = bandLayout(10, 100);
    expect(b.bar).toBeCloseTo(6);
  });

  it('adjacent bars never touch — the surface gap is at least 2px', () => {
    for (const [n, w] of [
      [30, 150],
      [30, 260],
      [13, 245],
      [90, 600],
      [6, 180],
      [12, 40],
    ] as const) {
      const b = bandLayout(n, w);
      for (let i = 1; i < n; i++) {
        const gap = b.left(i) - (b.left(i - 1) + b.bar);
        expect(gap).toBeGreaterThanOrEqual(2 - 1e-9);
      }
      expect(b.bar).toBeLessThanOrEqual(24);
      expect(b.bar).toBeGreaterThan(0);
    }
  });

  it('an offset shifts every band', () => {
    const b = bandLayout(4, 200, { start: 40 });
    expect(b.centre(0)).toBe(65);
  });
});

describe('stackSegments — geometric 2px gaps, radius on the top segment only', () => {
  const toPx = (v: number) => v / 250;

  it('stacks bottom to top from the baseline, skipping zero values', () => {
    const segs = stackSegments([23000, 8000, 0, 4000], toPx, 200);
    expect(segs.map((s) => s.index)).toEqual([0, 1, 3]);
    expect(segs[0]).toEqual({ index: 0, y: 108, height: 92, radius: 0, top: false });
    expect(segs[1]).toEqual({ index: 1, y: 76, height: 30, radius: 0, top: false });
    expect(segs[2]).toEqual({ index: 3, y: 60, height: 14, radius: 4, top: true });
  });

  it('every pair of neighbours is separated by exactly the gap', () => {
    const segs = stackSegments([4000, 4000, 3000, 5000], toPx, 180, 2);
    for (let i = 1; i < segs.length; i++) {
      const below = segs[i - 1]!;
      const above = segs[i]!;
      expect(below.y - (above.y + above.height)).toBeCloseTo(2);
    }
  });

  it('only the top segment is rounded, and never beyond its own height', () => {
    const segs = stackSegments([20000, 500], toPx, 100, 2, 4);
    expect(segs.filter((s) => s.radius > 0)).toHaveLength(1);
    expect(segs.at(-1)!.top).toBe(true);
    expect(segs.at(-1)!.radius).toBeLessThanOrEqual(segs.at(-1)!.height);
  });

  it('a single series is one rounded column with no gap', () => {
    const segs = stackSegments([10000], toPx, 100);
    expect(segs).toEqual([{ index: 0, y: 60, height: 40, radius: 4, top: true }]);
  });

  it('all zeros draw nothing', () => {
    expect(stackSegments([0, 0], toPx, 100)).toEqual([]);
  });
});

describe('columnPath — rounded data end, square baseline', () => {
  it('rounds the two top corners only', () => {
    const d = columnPath(10, 20, 24, 80, 4);
    expect(d.startsWith('M10 100')).toBe(true);
    expect(d).toContain('L34 100');
    expect((d.match(/Q/g) ?? []).length).toBe(2);
  });

  it('a square column has no curves', () => {
    expect(columnPath(0, 0, 10, 10, 0)).not.toContain('Q');
  });
});

describe('heatmap binning', () => {
  const bins = [0, 1, 3, 6, 10];

  it('quantises a value to the last bin whose floor it reaches', () => {
    expect(quantize(0, bins)).toBe(0);
    expect(quantize(1, bins)).toBe(1);
    expect(quantize(2, bins)).toBe(1);
    expect(quantize(3, bins)).toBe(2);
    expect(quantize(9, bins)).toBe(3);
    expect(quantize(10, bins)).toBe(4);
    expect(quantize(42, bins)).toBe(4);
  });

  it('labels the ranges for the scale legend', () => {
    expect(binLabels(bins)).toEqual(['0', '1–2', '3–5', '6–9', '10+']);
    expect(binLabels([0, 1, 2, 3, 4])).toEqual(['0', '1', '2', '3', '4+']);
  });

  it('spreads fewer bins across the five-step ramp, keeping both ends', () => {
    expect([0, 1, 2, 3, 4].map((i) => seqIndex(i, 5))).toEqual([0, 1, 2, 3, 4]);
    expect([0, 1, 2].map((i) => seqIndex(i, 3))).toEqual([0, 2, 4]);
  });
});

describe('interaction helpers', () => {
  it('nearestIndex snaps a pointer to its band and clamps at the ends', () => {
    expect(nearestIndex(0, 40, 10, 30)).toBe(0);
    expect(nearestIndex(44, 40, 10, 30)).toBe(0);
    expect(nearestIndex(55, 40, 10, 30)).toBe(1);
    expect(nearestIndex(9999, 40, 10, 30)).toBe(29);
  });

  it('peakIndex finds the first maximum and says whether it is unique', () => {
    expect(peakIndex([1, 4, 2, 4])).toEqual({ index: 1, single: false });
    expect(peakIndex([1, 2, 5, 3])).toEqual({ index: 2, single: true });
    expect(peakIndex([])).toEqual({ index: -1, single: false });
  });

  it('xTickIndices keeps first and last and spaces the rest evenly', () => {
    const idx = xTickIndices(30, 600, 90);
    expect(idx[0]).toBe(0);
    expect(idx.at(-1)).toBe(29);
    expect(idx.length).toBeLessThanOrEqual(7);
    expect(xTickIndices(1, 600, 90)).toEqual([0]);
    expect(xTickIndices(30, 200, 90)).toEqual([0, 29]);
  });

  it('binRanges splits labels into bins that end on the last label', () => {
    const r = binRanges(90, 13);
    expect(r).toHaveLength(13);
    expect(r.at(-1)).toEqual([83, 89]);
    expect(r[0]).toEqual([0, 5]);
    for (let i = 1; i < r.length; i++) expect(r[i]![0]).toBe(r[i - 1]![1] + 1);
    expect(binRanges(30, 30)[4]).toEqual([4, 4]);
  });

  it('spreadLabels pushes colliding labels apart and keeps them in bounds', () => {
    const out = spreadLabels([50, 52, 54], 13, 0, 200);
    expect(out[1]! - out[0]!).toBeGreaterThanOrEqual(13);
    expect(out[2]! - out[1]!).toBeGreaterThanOrEqual(13);
    const low = spreadLabels([195, 198], 13, 0, 200);
    expect(low[1]).toBeLessThanOrEqual(200);
    expect(low[1]! - low[0]!).toBeGreaterThanOrEqual(13);
    expect(spreadLabels([10, 100], 13, 0, 200)).toEqual([10, 100]);
  });

  it('edgeAnchor keeps a label inside its track near either end', () => {
    expect(edgeAnchor(3)).toBe('start');
    expect(edgeAnchor(50)).toBe('middle');
    expect(edgeAnchor(96)).toBe('end');
  });
});

describe('placeTooltip — offset 12px, flips at the edges', () => {
  const box = { boxWidth: 600, boxHeight: 300 };

  it('sits to the right of a crosshair with room to spare', () => {
    const p = placeTooltip({ ...box, x: 100, y: 150, width: 180, height: 60, placement: 'side' });
    expect(p.left).toBe(112);
    expect(p.top).toBe(120);
  });

  it('flips to the left near the right edge', () => {
    const p = placeTooltip({ ...box, x: 520, y: 150, width: 180, height: 60, placement: 'side' });
    expect(p.left).toBe(520 - 12 - 180);
  });

  it('clamps inside a narrow box rather than spilling out', () => {
    const p = placeTooltip({
      boxWidth: 299,
      boxHeight: 200,
      x: 150,
      y: 20,
      width: 200,
      height: 60,
      placement: 'side',
    });
    expect(p.left).toBeGreaterThanOrEqual(0);
    expect(p.left + 200).toBeLessThanOrEqual(299);
    expect(p.top).toBeGreaterThanOrEqual(0);
  });

  it('above a mark, flipping below when there is no headroom', () => {
    const up = placeTooltip({ ...box, x: 300, y: 150, width: 100, height: 40, placement: 'above' });
    expect(up).toEqual({ left: 250, top: 98 });
    const down = placeTooltip({
      ...box,
      x: 300,
      y: 20,
      width: 100,
      height: 40,
      placement: 'above',
    });
    expect(down.top).toBe(32);
  });

  it('flipping below clears the whole mark, not just its top edge', () => {
    const p = placeTooltip({
      ...box,
      x: 300,
      y: 20,
      below: 54,
      width: 100,
      height: 40,
      placement: 'above',
    });
    expect(p.top).toBe(66);
  });
});

describe('palette — colour follows the entity, gold never appears', () => {
  const GOLD = ['#C9A227', '#FFC72C', '#7A6210', '#9A7B14', '#FBF6E3'];
  const all = (): string[] =>
    Object.values(VIZ).flatMap((v) =>
      typeof v === 'string' ? [v] : Array.isArray(v) ? [...v] : Object.values(v),
    );

  it('fixes each service line to its slot', () => {
    expect(LINE_COLOURS).toEqual({
      agency: '#0E5E8A',
      logistics: '#3F95C6',
      customs: '#C86892',
      procurement: '#5DCAB7',
    });
  });

  it('has five sequential and five ordinal steps', () => {
    expect(VIZ.seq).toHaveLength(5);
    expect(VIZ.ord).toHaveLength(5);
    expect(VIZ.seq.at(-1)).toBe(VIZ.sea);
  });

  it('never uses a reserved gold', () => {
    const upper = all().map((c) => c.toUpperCase());
    for (const g of GOLD) expect(upper).not.toContain(g);
  });

  it('mirrors the --viz-* tokens in tokens.css exactly', async () => {
    // Read the stylesheet itself (vitest runs with css: false, so a ?raw
    // import comes back empty). No Node typings in this repo, hence the cast.
    const fsId = 'node:fs';
    const { readFileSync } = (await import(/* @vite-ignore */ fsId)) as {
      readFileSync: (path: string, encoding: 'utf8') => string;
    };
    const tokensCss = readFileSync('src/styles/tokens.css', 'utf8');
    const token = (name: string) =>
      tokensCss.match(new RegExp(`--viz-${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1]?.toUpperCase();
    const pairs: [string, string][] = [
      ['sea', VIZ.sea],
      ['sky', VIZ.sky],
      ['rose', VIZ.rose],
      ['seafoam', VIZ.seafoam],
      ['cornflower', VIZ.cornflower],
      ['other', VIZ.other],
      ['context', VIZ.context],
      ['deduction', VIZ.deduction],
      ['derived', VIZ.derived],
      ['grid', VIZ.grid],
      ['axis', VIZ.axis],
      ['tick', VIZ.tick],
      ['ref', VIZ.ref],
      ['track', VIZ.track],
      ['hover', VIZ.hover],
      ...VIZ.seq.map((hex, i): [string, string] => [`seq-${i + 1}`, hex]),
      ...VIZ.ord.map((hex, i): [string, string] => [`ord-${i + 1}`, hex]),
    ];
    for (const [name, hex] of pairs) expect(token(name), `--viz-${name}`).toBe(hex.toUpperCase());
  });
});

/*
 * Rendered layout. jsdom has no ResizeObserver, so every chart draws at a
 * fixed 600px and the positions below are the chart's own arithmetic.
 */

interface SvgText {
  text: string;
  x: number;
  y: number;
  anchor: string;
  weight: string | null;
}

function svgTexts(root: HTMLElement): SvgText[] {
  return [...root.querySelectorAll('svg text')].map((t) => ({
    text: t.textContent ?? '',
    x: Number(t.getAttribute('x')),
    y: Number(t.getAttribute('y')),
    anchor: t.getAttribute('text-anchor') ?? 'start',
    weight: t.getAttribute('font-weight'),
  }));
}

/** Inter draws '£' and tabular figures about 0.64em wide — wider than `textWidth` guesses. */
const inkWidth = (s: string, size = 11) => s.length * size * 0.64;

function spendChart() {
  const tier = { agency: true, logistics: false, customs: false };
  return render(
    createElement(StackedColumns, {
      categories: [...SPEND_MONTHS],
      series: spendSeries(tier).map((s) => ({ ...s, color: LINE_COLOURS[s.id] })),
      format: gbp,
      axisFormat: compactGbp,
      directLabelLast: true,
      lower: {
        label: 'Saved by your tier discount',
        color: VIZ.derived,
        values: monthlySaving(tier),
        format: gbp,
      },
      ariaLabel: 'GAC spend',
    }),
  );
}

function earningsChart() {
  const kept = EARNINGS_WON.map((w) => supplierKeeps(w, 'premium'));
  return render(
    createElement(StackedColumns, {
      categories: [...EARNINGS_MONTHS],
      series: [
        { id: 'keep', label: 'You keep', color: VIZ.sea, values: kept },
        {
          id: 'band',
          label: '10% Premium band',
          color: VIZ.deduction,
          values: EARNINGS_WON.map((w, i) => w - kept[i]!),
        },
      ],
      format: gbp,
      axisFormat: compactGbp,
      directLabelLast: true,
      ariaLabel: 'Earnings',
    }),
  );
}

function trendChart() {
  const s = seriesFor(30);
  const count = (n: number) => n.toLocaleString('en-GB');
  return render(
    createElement(TimeSeriesPanels, {
      labels: s.labels,
      ariaLabel: 'Views and requests',
      panels: [
        {
          id: 'views',
          label: 'Profile views per day',
          kind: 'area',
          values: s.views,
          format: count,
          benchmark: { label: 'Category average', values: s.category },
        },
        {
          id: 'requests',
          label: 'Quote requests per day',
          kind: 'columns',
          values: s.requests,
          format: count,
        },
      ],
    }),
  );
}

describe('StackedColumns — labels', () => {
  it('every y-axis tick clears the left edge as Inter draws it (£500 was shaved)', () => {
    const ticks = svgTexts(spendChart().container).filter((t) => t.anchor === 'end');
    expect(ticks.map((t) => t.text)).toContain('£500');
    for (const t of ticks) expect(t.x - inkWidth(t.text), t.text).toBeGreaterThanOrEqual(0);
  });

  it('the latest total names itself and sits above the name stack, never a bare figure over a series', () => {
    const texts = svgTexts(earningsChart().container);
    expect(texts.map((t) => t.text)).toContain('Sep total £12,600');
    expect(texts.map((t) => t.text)).not.toContain('£12,600');
    const total = texts.find((t) => t.text === 'Sep total £12,600')!;
    for (const name of ['You keep', '10% Premium band']) {
      const label = texts.find((t) => t.text === name)!;
      // The names sit beside their segments, a clear line below the total.
      expect(label.y - total.y, name).toBeGreaterThanOrEqual(12);
    }
  });

  it('the spend chart labels its total the same way', () => {
    const texts = svgTexts(spendChart().container).map((t) => t.text);
    expect(texts).toContain('Sep total £31,000');
    expect(texts).not.toContain('£31,000');
    expect(texts).toContain('Procurement');
  });
});

describe('TimeSeriesPanels — labels', () => {
  it('a peak label at the top tick clears its panel title', () => {
    const texts = svgTexts(trendChart().container);
    const pairs: [string, string][] = [
      ['Profile views per day', '20'],
      ['Quote requests per day', '4'],
    ];
    for (const [title, peak] of pairs) {
      const t = texts.find((x) => x.text === title)!;
      const p = texts.find((x) => x.text === peak && x.anchor === 'middle')!;
      expect(p, peak).toBeDefined();
      // Cap height 8px + a 1.5px halo above the label's baseline; the title's
      // descenders reach about 3px below its own.
      expect(p.y - 9.5, `${title} / ${peak}`).toBeGreaterThanOrEqual(t.y + 3);
    }
  });

  it('"Category average" sits past the end of both lines, where no point can cross it', () => {
    const { container } = trendChart();
    const lines = [...container.querySelectorAll('path[fill="none"]')];
    const lastX = Math.max(
      ...lines.flatMap((p) =>
        [...(p.getAttribute('d') ?? '').matchAll(/[ML]([\d.]+) /g)].map((m) => Number(m[1])),
      ),
    );
    const label = svgTexts(container).filter((t) => /Category|average/.test(t.text));
    expect(label.length).toBeGreaterThan(0);
    for (const t of label) {
      expect(t.anchor, t.text).toBe('start');
      expect(t.x, t.text).toBeGreaterThan(lastX + 4);
    }
  });

  it('when both lines end together, the benchmark name steps clear of the last value', () => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const { container } = render(
      createElement(TimeSeriesPanels, {
        labels,
        ariaLabel: 'Views',
        panels: [
          {
            id: 'views',
            label: 'Profile views per day',
            kind: 'area',
            values: [6, 14, 9, 12, 10],
            format: String,
            benchmark: { label: 'Category average', values: [8, 9, 9, 10, 10] },
          },
        ],
      }),
    );
    const texts = svgTexts(container);
    const end = texts.find((t) => t.text === '10' && t.weight === '700' && t.anchor === 'start')!;
    const bench = texts.filter((t) => t.text === 'Category' || t.text === 'average');
    expect(end).toBeDefined();
    expect(bench).toHaveLength(2);
    // Ink: a line's cap height reaches 4.5px above its centre, descenders 6px below.
    const blockTop = Math.min(...bench.map((t) => t.y)) - 4.5;
    const blockBottom = Math.max(...bench.map((t) => t.y)) + 6;
    const clear = blockTop >= end.y + 3.5 + 2 || blockBottom <= end.y - 4.5 - 2;
    expect(clear, `value at ${end.y}, name ${blockTop}–${blockBottom}`).toBe(true);
  });
});

describe('ExpiryBar — rules come from lib/svs', () => {
  it('draws its rules and scale from ALERT_TIERS, so the two cannot drift', async () => {
    vi.resetModules();
    vi.doMock('../src/lib/svs', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../src/lib/svs')>()),
      ALERT_TIERS: [60, 14] as const,
    }));
    try {
      const { ExpiryBar } = await import('../src/components/charts/ExpiryBar');
      const { container } = render(
        createElement(ExpiryBar, { daysLeft: 100, state: 'ok', label: 'Expires', scale: true }),
      );
      const scale = [...container.querySelectorAll('[role="img"] > div:nth-child(2) span')];
      expect(scale.map((s) => s.textContent)).toEqual(['14', '60 days']);
      const rules = [...container.querySelectorAll('span.w-px')] as HTMLElement[];
      expect(rules.map((r) => r.style.left)).toEqual([
        `${(14 / 180) * 100}%`,
        `${(60 / 180) * 100}%`,
      ]);
    } finally {
      vi.doUnmock('../src/lib/svs');
      vi.resetModules();
    }
  });
});
