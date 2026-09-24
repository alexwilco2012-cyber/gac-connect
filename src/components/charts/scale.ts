/**
 * Pure geometry for the chart kit — no React, no DOM, unit-tested in
 * `tests/charts.test.ts`. The components only turn these numbers into marks.
 */

/** Round to two decimals for SVG path data (keeps markup short and stable). */
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Clean ticks from zero to a round number at or above `max`: steps of
 * 1, 2 or 5 × 10ⁿ (never 2.5, so money ticks through `compactGbp` stay
 * whole thousands). `count` is the target number of intervals; `integer`
 * forbids fractional steps for counts of things.
 */
export function niceTicks(max: number, count = 5, opts: { integer?: boolean } = {}): number[] {
  if (!(max > 0) || !Number.isFinite(max)) return [0];
  const rough = max / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / mag;
  let step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  if (opts.integer) step = Math.max(1, Math.round(step));
  const top = Math.ceil(max / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let k = 0; k * step <= top + step * 1e-9; k++) ticks.push(Number((k * step).toFixed(10)));
  return ticks;
}

/**
 * The tightest clean axis for `max` whose tick count sits inside
 * [minTicks, maxTicks] — so £42k tops out at £50k rather than £60k. Ties go
 * to fewer ticks. Falls back to `niceTicks(max, 4)`.
 */
export function fitTicks(
  max: number,
  opts: { integer?: boolean; minTicks?: number; maxTicks?: number } = {},
): number[] {
  const { integer, minTicks = 4, maxTicks = 6 } = opts;
  let best: number[] | null = null;
  for (const count of [2, 3, 4, 5]) {
    const t = niceTicks(max, count, { integer });
    if (t.length < minTicks || t.length > maxTicks) continue;
    const top = t.at(-1)!;
    const bestTop = best?.at(-1) ?? Infinity;
    if (top < bestTop || (top === bestTop && t.length < best!.length)) best = t;
  }
  return best ?? niceTicks(max, 4, { integer });
}

export interface BandLayout {
  /** Width of each category's slot. */
  band: number;
  /** Bar thickness: ≤ 24px, ≤ 60% of the band, and at least a 2px gap. */
  bar: number;
  /** Left edge of bar `i`. */
  left: (i: number) => number;
  /** Centre of band `i` — where points, ticks and crosshairs sit. */
  centre: (i: number) => number;
}

/** Band scale for `n` categories across `width` px, starting at `start`. */
export function bandLayout(
  n: number,
  width: number,
  opts: { start?: number; maxBar?: number; ratio?: number; minGap?: number } = {},
): BandLayout {
  const { start = 0, maxBar = 24, ratio = 0.6, minGap = 2 } = opts;
  const band = n > 0 ? width / n : width;
  const bar = Math.max(0.5, Math.min(maxBar, band * ratio, band - minGap));
  return {
    band,
    bar,
    left: (i) => start + i * band + (band - bar) / 2,
    centre: (i) => start + (i + 0.5) * band,
  };
}

export interface Segment {
  /** Index into the input values (zero values are skipped). */
  index: number;
  y: number;
  height: number;
  /** 4px on the top segment only (clamped to its height); 0 elsewhere. */
  radius: number;
  top: boolean;
}

/**
 * Stack non-zero values upwards from `baseline`. The 2px surface gap is
 * geometric — taken off the bottom of every segment above the first — never
 * a stroke. Only the top segment gets the rounded data end.
 */
export function stackSegments(
  values: readonly number[],
  toPx: (v: number) => number,
  baseline: number,
  gap = 2,
  radius = 4,
): Segment[] {
  let last = -1;
  values.forEach((v, i) => {
    if (v > 0) last = i;
  });
  const out: Segment[] = [];
  let cum = 0;
  values.forEach((v, i) => {
    if (!(v > 0)) return;
    const bottomPx = baseline - toPx(cum);
    const topPx = baseline - toPx(cum + v);
    cum += v;
    const bottom = out.length === 0 ? bottomPx : bottomPx - gap;
    // A sliver the gap would erase keeps 1px, so the stack still reads and
    // its top stays rounded.
    const height = Math.max(1, bottom - topPx);
    const top = i === last;
    const y = Math.min(topPx, bottom - height);
    out.push({ index: i, y, height, radius: top ? Math.min(radius, height) : 0, top });
  });
  return out;
}

/** A column with its two top corners rounded and a square baseline. */
export function columnPath(x: number, y: number, w: number, h: number, radius = 4): string {
  const r = Math.max(0, Math.min(radius, w / 2, h));
  const b = r2(y + h);
  const L = r2(x);
  const R = r2(x + w);
  const T = r2(y);
  if (r === 0) return `M${L} ${b}L${L} ${T}L${R} ${T}L${R} ${b}Z`;
  return (
    `M${L} ${b}L${L} ${r2(y + r)}Q${L} ${T} ${r2(x + r)} ${T}` +
    `L${r2(x + w - r)} ${T}Q${R} ${T} ${R} ${r2(y + r)}L${R} ${b}Z`
  );
}

/** Heatmap bin for a value: the last bin whose lower bound it reaches. */
export function quantize(v: number, bins: readonly number[]): number {
  let idx = 0;
  bins.forEach((lo, i) => {
    if (v >= lo) idx = i;
  });
  return idx;
}

/** Range labels for the scale legend: ['0', '1–2', '3–5', '6–9', '10+']. */
export function binLabels(bins: readonly number[]): string[] {
  return bins.map((lo, i) => {
    const next = bins[i + 1];
    if (next === undefined) return `${lo}+`;
    return next - 1 <= lo ? `${lo}` : `${lo}–${next - 1}`;
  });
}

/** Which of the five sequential steps bin `i` of `len` uses (ends kept). */
export function seqIndex(i: number, len: number): number {
  if (len <= 1) return 4;
  return Math.round((i * 4) / (len - 1));
}

/** Band index under a pointer, clamped to the data. */
export function nearestIndex(pos: number, start: number, band: number, n: number): number {
  if (n <= 0 || !(band > 0)) return 0;
  return Math.max(0, Math.min(n - 1, Math.floor((pos - start) / band)));
}

/** First maximum, and whether it is the only one (the "single peak"). */
export function peakIndex(values: readonly number[]): { index: number; single: boolean } {
  if (values.length === 0) return { index: -1, single: false };
  const max = Math.max(...values);
  if (!(max > 0)) return { index: -1, single: false };
  const index = values.indexOf(max);
  const single = values.filter((v) => v === max).length === 1;
  return { index, single };
}

/** Evenly spaced x-axis labels that keep the first and the last. */
export function xTickIndices(n: number, width: number, minSpacing: number): number[] {
  if (n <= 1) return [0];
  const count = Math.min(n, Math.max(2, Math.floor(width / minSpacing)));
  const out: number[] = [];
  for (let k = 0; k < count; k++) {
    const i = Math.round((k * (n - 1)) / (count - 1));
    if (out.at(-1) !== i) out.push(i);
  }
  return out;
}

/**
 * Split `n` labels into `m` bins that end on the last label (weekly sums
 * ending yesterday): each bin is ⌈n/m⌉ long, the first takes the remainder.
 */
export function binRanges(n: number, m: number): [number, number][] {
  if (m <= 0) return [];
  const size = Math.ceil(n / m);
  const out: [number, number][] = [];
  for (let k = m - 1; k >= 0; k--) {
    const end = Math.max(0, n - 1 - k * size);
    const start = Math.max(0, end - size + 1);
    out.push([start, end]);
  }
  return out;
}

/**
 * Push label positions apart to at least `minGap` while keeping them inside
 * [min, max]; order is preserved and the result matches the input order.
 */
export function spreadLabels(
  ys: readonly number[],
  minGap: number,
  min: number,
  max: number,
): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  const pos = order.map((o) => o.y);
  for (let k = 1; k < pos.length; k++) pos[k] = Math.max(pos[k]!, pos[k - 1]! + minGap);
  if (pos.length && pos[pos.length - 1]! > max) {
    pos[pos.length - 1] = max;
    for (let k = pos.length - 2; k >= 0; k--) pos[k] = Math.min(pos[k]!, pos[k + 1]! - minGap);
  }
  if (pos.length && pos[0]! < min) {
    pos[0] = min;
    for (let k = 1; k < pos.length; k++) pos[k] = Math.max(pos[k]!, pos[k - 1]! + minGap);
  }
  const out = new Array<number>(ys.length);
  order.forEach((o, k) => {
    out[o.i] = pos[k]!;
  });
  return out;
}

/** How to anchor a label at `pct` (0–100) along a track so it stays inside. */
export function edgeAnchor(pct: number): 'start' | 'middle' | 'end' {
  if (pct < 12) return 'start';
  if (pct > 88) return 'end';
  return 'middle';
}

export type TooltipPlacement = 'side' | 'above';

/**
 * Tooltip position inside its chart box, 12px off the anchor. `side` sits
 * beside a crosshair or column (right, flipping left), vertically centred
 * and clamped; `above` sits over a mark (flipping below), horizontally
 * centred and clamped. It never covers the anchor unless the box is too
 * narrow to avoid it.
 */
export function placeTooltip(p: {
  x: number;
  y: number;
  /** Bottom edge of the mark, for flipping below it (defaults to `y`). */
  below?: number;
  width: number;
  height: number;
  boxWidth: number;
  boxHeight: number;
  placement: TooltipPlacement;
  offset?: number;
}): { left: number; top: number } {
  const { x, y, below, width, height, boxWidth, boxHeight, placement, offset = 12 } = p;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  if (placement === 'side') {
    const right = x + offset;
    const leftSide = x - offset - width;
    let left: number;
    if (right + width <= boxWidth) left = right;
    else if (leftSide >= 0) left = leftSide;
    // Neither side fits: take the roomier side and clamp inside the box.
    else left = boxWidth - x > x ? right : leftSide;
    left = clamp(left, 0, Math.max(0, boxWidth - width));
    const top = clamp(y - height / 2, 0, Math.max(0, boxHeight - height));
    return { left: Math.round(left), top: Math.round(top) };
  }
  const left = clamp(x - width / 2, 0, Math.max(0, boxWidth - width));
  let top = y - offset - height;
  if (top < 0) top = (below ?? y) + offset;
  return { left: Math.round(left), top: Math.round(top) };
}
