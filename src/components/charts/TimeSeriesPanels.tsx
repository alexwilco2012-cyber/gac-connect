import { useId, useRef, type PointerEvent } from 'react';
import { ChartTooltip, type TooltipRow } from './ChartTooltip';
import { VIZ } from './palette';
import {
  bandLayout,
  binRanges,
  columnPath,
  fitTicks,
  nearestIndex,
  peakIndex,
  xTickIndices,
} from './scale';
import { linearKeys, liveLine, useElementWidth, useEntrance, usePlotNav } from './useChart';
import { Dot } from './Dot';
import { HALO, NAV_HINT, TICK_GAP, px, textWidth, tickGutter } from './svg';

export interface TimeSeriesPanel {
  id: string;
  /** Panel title, also the tooltip label ("Profile views per day"). */
  label: string;
  kind: 'area' | 'columns';
  /**
   * One value per label, or fewer: then each value is a bin of labels ending
   * on the last one (weekly sums across a 90-day axis — see `binRanges`).
   */
  values: number[];
  /** Tooltip value text. */
  format: (n: number) => string;
  /** A context line (Premium: "Category average"), `#8595A8`, same axis. */
  benchmark?: { label: string; values: number[] };
  /** Axis and direct-label text; defaults to the number, comma'd. */
  axisFormat?: (n: number) => string;
  /** When values are binned, a label per bin for the tooltip ("17–23 Sep"). */
  binLabels?: string[];
}

const MAIN_H = 170;
const SUB_H = 88;
// Panel title row + headroom, so a value label above a peak at the top tick
// clears the title's descenders.
const TITLE = 36;
const PANEL_GAP = 22;
const AXIS = 26;

const plain = (n: number) => n.toLocaleString('en-GB');

interface PanelGeo {
  panel: TimeSeriesPanel;
  titleY: number;
  top: number;
  bottom: number;
  ticks: number[];
  y: (v: number) => number;
  /** Label-index range covered by each value. */
  slots: [number, number][];
  xs: number[];
  slotW: number[];
  axis: (n: number) => string;
}

/**
 * Small multiples on one shared time axis with one synced crosshair
 * (spec §5 item 2): never a dual axis. Areas are a 2px line over a flat 10%
 * wash; columns are ≤ 24px with a rounded data end. The last value and a
 * single peak are labelled; everything else is in the tooltip and the table.
 */
export function TimeSeriesPanels({
  labels,
  panels,
  ariaLabel,
}: {
  labels: string[];
  panels: TimeSeriesPanel[];
  ariaLabel: string;
}) {
  const [boxRef, width] = useElementWidth<HTMLDivElement>();
  const hintId = useId();
  const plotRef = useRef<SVGSVGElement>(null);
  const n = labels.length;

  // ——— layout ———
  const geo0 = panels.map((p) => {
    const axis = p.axisFormat ?? plain;
    const all = [...p.values, ...(p.benchmark?.values ?? [])];
    const vmax = all.length ? Math.max(...all) : 0;
    const integer = p.values.every(Number.isInteger) && vmax >= 2;
    const main = p === panels[0];
    const ticks = fitTicks(vmax, main ? { integer } : { integer, minTicks: 3, maxTicks: 3 });
    return { p, axis, ticks };
  });
  const gutterLeft = tickGutter(
    geo0.flatMap((g) => g.ticks.map(g.axis)),
    22,
  );
  // The right gutter carries each area's last value and, when it fits, the
  // benchmark's name ("Category" / "average") beside its own line end: out
  // past both lines, where no point can cross it. It fits unless it would
  // squeeze the plot below 55% of the chart — the legend names it anyway.
  const areas = geo0.filter((g) => g.p.kind === 'area' && g.p.values.length);
  const endW = Math.max(0, ...areas.map((g) => textWidth(g.axis(g.p.values.at(-1)!), 11, true)));
  const benchW = Math.max(
    0,
    ...areas.flatMap((g) =>
      g.p.benchmark ? twoLines(g.p.benchmark.label).map((l) => textWidth(l, 11, true)) : [],
    ),
  );
  const withBench = Math.max(endW, benchW) + 14;
  const showBench = benchW > 0 && width - gutterLeft - withBench >= Math.max(160, width * 0.55);
  const gutterRight = showBench ? withBench : areas.length ? endW + 14 : 6;
  const plotLeft = gutterLeft;
  const plotRight = Math.max(plotLeft + 10, width - gutterRight);
  const plotW = plotRight - plotLeft;
  const band = bandLayout(Math.max(1, n), plotW, { start: plotLeft });

  // Each panel starts where the one above ends (title row, plot, gap).
  const starts = geo0.map((_, idx) =>
    idx === 0 ? 0 : idx * (TITLE + SUB_H + PANEL_GAP) + (MAIN_H - SUB_H),
  );
  const geo: PanelGeo[] = geo0.map((g, idx) => {
    const h = idx === 0 ? MAIN_H : SUB_H;
    const titleY = starts[idx]! + 12;
    const top = starts[idx]! + TITLE;
    const bottom = top + h;
    const topTick = g.ticks.at(-1) || 1;
    const slots: [number, number][] =
      g.p.values.length === n ? labels.map((_, i) => [i, i]) : binRanges(n, g.p.values.length);
    return {
      panel: g.p,
      titleY,
      top,
      bottom,
      ticks: g.ticks,
      y: (v: number) => bottom - (v / topTick) * h,
      slots,
      xs: slots.map(([s, e]) => (band.centre(s) + band.centre(e)) / 2),
      slotW: slots.map(([s, e]) => (e - s + 1) * band.band),
      axis: g.axis,
    };
  });
  const lastBottom = geo.at(-1)?.bottom ?? 0;
  const xSpacing = Math.max(0, ...labels.map((l) => textWidth(l))) + 44;
  const height = lastBottom + AXIS;
  const ready = width > 0 && n > 0;
  const animating = useEntrance(ready);

  const slotOf = (g: PanelGeo, i: number) => g.slots.findIndex(([s, e]) => i >= s && i <= e);

  // ——— interaction ———
  const nav = usePlotNav<number>({
    ref: plotRef,
    initial: () => (n ? n - 1 : null),
    keyMove: linearKeys(n),
    pointAt: (e: PointerEvent<Element>) =>
      nearestIndex(
        e.clientX - e.currentTarget.getBoundingClientRect().left,
        plotLeft,
        band.band,
        n,
      ),
  });
  const active = nav.active !== null && nav.active < n ? nav.active : null;

  const tipRows: TooltipRow[] = [];
  if (active !== null) {
    for (const g of geo) {
      const k = slotOf(g, active);
      const v = g.panel.values[k];
      if (k < 0 || v === undefined) continue;
      const [s, e] = g.slots[k]!;
      const binned = g.panel.binLabels?.[k] ?? `${labels[s]} to ${labels[e]}`;
      const span = s === e ? '' : `, ${binned}`;
      tipRows.push({
        key: g.panel.id,
        color: VIZ.sea,
        value: g.panel.format(v),
        label: `${g.panel.label}${span}`,
      });
      const b = g.panel.benchmark?.values[k];
      if (g.panel.benchmark && b !== undefined) {
        tipRows.push({
          key: `${g.panel.id}-bench`,
          color: VIZ.context,
          value: g.panel.format(b),
          label: g.panel.benchmark.label,
        });
      }
    }
  }
  const header = active !== null ? (labels[active] ?? '') : '';
  const live = active !== null && nav.source !== 'pointer' ? liveLine(header, tipRows) : '';

  const anchor = () => {
    if (active === null) return null;
    const tops = geo.map((g) => {
      const v = g.panel.values[slotOf(g, active)];
      return v === undefined ? Infinity : g.y(v);
    });
    const firstArea = geo.findIndex((g) => g.panel.kind === 'area');
    const y = firstArea >= 0 ? tops[firstArea]! : Math.min(...tops);
    return { x: band.centre(active), y: Number.isFinite(y) ? y : (geo[0]?.top ?? 0) };
  };

  return (
    <div ref={boxRef} className="relative" style={{ height }}>
      {ready ? (
        <svg
          ref={plotRef}
          {...nav.bind}
          role="group"
          aria-label={ariaLabel}
          aria-describedby={hintId}
          width={width}
          height={height}
          className="block touch-pan-y select-none"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          <g aria-hidden="true">
            {geo.map((g) => (
              <Panel
                key={g.panel.id}
                g={g}
                plotLeft={plotLeft}
                plotRight={plotRight}
                activeSlot={active !== null ? slotOf(g, active) : -1}
                animating={animating}
                showBench={showBench}
              />
            ))}

            {/* shared x-axis */}
            {xTickIndices(n, plotW, xSpacing).map((i, k, arr) => {
              const anchorPos = k === 0 ? 'start' : k === arr.length - 1 ? 'end' : 'middle';
              const x =
                anchorPos === 'start' ? plotLeft : anchorPos === 'end' ? plotRight : band.centre(i);
              return (
                <text
                  key={i}
                  x={px(x)}
                  y={lastBottom + 17}
                  fontSize={11}
                  fill={VIZ.tick}
                  textAnchor={anchorPos}
                >
                  {labels[i]}
                </text>
              );
            })}

            {/* synced crosshair and hovered points */}
            {active !== null ? (
              <g>
                <line
                  x1={px(band.centre(active))}
                  x2={px(band.centre(active))}
                  y1={(geo[0]?.top ?? 0) - 6}
                  y2={lastBottom}
                  stroke={VIZ.context}
                  strokeWidth={1}
                />
                {geo.map((g) => {
                  if (g.panel.kind !== 'area') return null;
                  const k = slotOf(g, active);
                  const v = g.panel.values[k];
                  if (v === undefined) return null;
                  const b = g.panel.benchmark?.values[k];
                  return (
                    <g key={g.panel.id}>
                      {b !== undefined ? <Dot x={g.xs[k]!} y={g.y(b)} color={VIZ.context} /> : null}
                      <Dot x={g.xs[k]!} y={g.y(v)} color={VIZ.sea} />
                    </g>
                  );
                })}
              </g>
            ) : null}
          </g>
        </svg>
      ) : null}
      {active !== null ? (
        <ChartTooltip
          boxRef={boxRef}
          anchor={anchor}
          placement="side"
          header={header}
          rows={tipRows}
        />
      ) : null}
      <p id={hintId} className="sr-only">
        {NAV_HINT}
      </p>
      <p className="sr-only" aria-live="polite">
        {live}
      </p>
    </div>
  );
}

function Panel({
  g,
  plotLeft,
  plotRight,
  activeSlot,
  animating,
  showBench,
}: {
  g: PanelGeo;
  plotLeft: number;
  plotRight: number;
  activeSlot: number;
  animating: boolean;
  /** Name the benchmark line in the right gutter (it fits). */
  showBench: boolean;
}) {
  const { panel, xs, y, bottom, top } = g;
  const values = panel.values;
  const last = values.length - 1;
  const peak = peakIndex(values);
  const lastV = values[last];

  return (
    <g>
      <text x={0} y={g.titleY} fontSize={12} fontWeight={600} fill={VIZ.inkSoft}>
        {panel.label}
      </text>

      {g.ticks.map((t) => {
        const ty = Math.round(y(t)) + 0.5;
        return (
          <g key={t}>
            <line
              x1={plotLeft}
              x2={plotRight}
              y1={ty}
              y2={ty}
              stroke={t === 0 ? VIZ.axis : VIZ.grid}
              strokeWidth={1}
            />
            <text
              x={plotLeft - TICK_GAP}
              y={ty}
              dy="0.32em"
              fontSize={11}
              fill={VIZ.tick}
              textAnchor="end"
            >
              {g.axis(t)}
            </text>
          </g>
        );
      })}

      {panel.kind === 'columns' ? (
        <>
          {activeSlot >= 0 ? (
            <rect
              x={px(xs[activeSlot]! - g.slotW[activeSlot]! / 2)}
              y={top}
              width={px(g.slotW[activeSlot]!)}
              height={bottom - top}
              fill={VIZ.hover}
            />
          ) : null}
          {values.map((v, k) => {
            if (!(v > 0)) return null;
            const w = g.slotW[k]!;
            const bw = Math.max(1, Math.min(24, w * 0.6, w - 2));
            const yt = y(v);
            return (
              <path
                key={k}
                d={columnPath(xs[k]! - bw / 2, yt, bw, bottom - yt, 4)}
                fill={VIZ.sea}
                className={animating ? 'viz-grow' : undefined}
                style={
                  animating
                    ? { animationDelay: `${Math.round((k / Math.max(1, last)) * 240)}ms` }
                    : undefined
                }
              />
            );
          })}
          <PointLabels
            g={g}
            last={last}
            peak={peak.single ? peak.index : -1}
            offset={6}
            plotLeft={plotLeft}
            plotRight={plotRight}
          />
        </>
      ) : (
        <>
          {values.length ? (
            <>
              <path
                d={`${linePath(xs, values, y)}L${px(xs[last]!)} ${bottom}L${px(xs[0]!)} ${bottom}Z`}
                fill={VIZ.sea}
                fillOpacity={0.1}
              />
              {panel.benchmark ? (
                <path
                  d={linePath(xs, panel.benchmark.values, y)}
                  fill="none"
                  stroke={VIZ.context}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ) : null}
              <path
                d={linePath(xs, values, y)}
                fill="none"
                stroke={VIZ.sea}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                pathLength={animating ? 1 : undefined}
                className={animating ? 'viz-draw' : undefined}
              />
              {peak.single && peak.index !== last ? (
                <Dot x={xs[peak.index]!} y={y(values[peak.index]!)} color={VIZ.sea} />
              ) : null}
              <Dot x={xs[last]!} y={y(lastV!)} color={VIZ.sea} />
              <text
                x={px(xs[last]! + 9)}
                y={px(y(lastV!))}
                dy="0.32em"
                fontSize={11}
                fontWeight={700}
                fill={VIZ.ink}
              >
                {g.axis(lastV!)}
              </text>
              <PointLabels
                g={g}
                last={-1}
                peak={peak.single && peak.index !== last ? peak.index : -1}
                offset={10}
                plotLeft={plotLeft}
                plotRight={plotRight}
                avoidX={xs[last]}
              />
              {panel.benchmark && showBench ? (
                <BenchmarkLabel
                  label={panel.benchmark.label}
                  x={xs[last]! + 9}
                  top={top}
                  bottom={bottom}
                  mainY={y(lastV!)}
                  benchY={y(panel.benchmark.values.at(-1) ?? 0)}
                />
              ) : null}
            </>
          ) : null}
        </>
      )}
    </g>
  );
}

function linePath(xs: number[], values: readonly number[], y: (v: number) => number) {
  return values.map((v, k) => `${k ? 'L' : 'M'}${px(xs[k] ?? 0)} ${px(y(v))}`).join('');
}

/** Value labels above the last mark and the single peak, never colliding. */
function PointLabels({
  g,
  last,
  peak,
  offset,
  plotLeft,
  plotRight,
  avoidX,
}: {
  g: PanelGeo;
  last: number;
  peak: number;
  offset: number;
  plotLeft: number;
  plotRight: number;
  avoidX?: number;
}) {
  const items: { k: number; text: string }[] = [];
  if (last >= 0 && (g.panel.values[last] ?? 0) > 0) {
    items.push({ k: last, text: g.axis(g.panel.values[last]!) });
  }
  if (peak >= 0 && peak !== last) {
    const text = g.axis(g.panel.values[peak]!);
    const clash = (x: number) => Math.abs(g.xs[peak]! - x) < textWidth(text, 11, true) + 8;
    const blocked = (last >= 0 && clash(g.xs[last]!)) || (avoidX !== undefined && clash(avoidX));
    if (!blocked) items.push({ k: peak, text });
  }
  return (
    <>
      {items.map(({ k, text }) => {
        const half = textWidth(text, 11, true) / 2;
        const x = Math.min(plotRight - half, Math.max(plotLeft + half, g.xs[k]!));
        return (
          <text
            key={k}
            x={px(x)}
            y={px(g.y(g.panel.values[k]!) - offset)}
            fontSize={11}
            fontWeight={700}
            fill={VIZ.ink}
            textAnchor="middle"
            {...HALO}
          >
            {text}
          </text>
        );
      })}
    </>
  );
}

/** "Category average" → ["Category", "average"]: the split nearest the middle. */
function twoLines(label: string): string[] {
  const words = label.split(' ');
  let best = [label];
  for (let k = 1; k < words.length; k++) {
    const pair = [words.slice(0, k).join(' '), words.slice(k).join(' ')];
    if (Math.max(...pair.map((l) => l.length)) < Math.max(...best.map((l) => l.length))) {
      best = pair;
    }
  }
  return best;
}

/**
 * The benchmark's name beside the end of its line, in the right gutter with
 * the series' last value — past the end of both lines, so neither can run
 * through it (the halo only tidies a gridline's last few pixels on a wide
 * band). Two short lines, centred on the line's end and nudged clear of the
 * value label when the two ends meet; kept inside the panel.
 */
function BenchmarkLabel({
  label,
  x,
  top,
  bottom,
  mainY,
  benchY,
}: {
  label: string;
  x: number;
  top: number;
  bottom: number;
  mainY: number;
  benchY: number;
}) {
  const lines = twoLines(label);
  const LINE = 12;
  const lift = ((lines.length - 1) * LINE) / 2;
  // Centre to the block's ink (cap height up, descenders down) plus the
  // value label's own half height and a 3px gap.
  const clear = lift + 7 + 4 + 3;
  const clamp = (c: number) => Math.max(top + lift + 5, Math.min(bottom - lift - 6, c));
  const away = (dir: 1 | -1) =>
    clamp(dir > 0 ? Math.max(benchY, mainY + clear) : Math.min(benchY, mainY - clear));
  const dir = benchY >= mainY ? 1 : -1;
  let c = away(dir);
  if (Math.abs(c - mainY) < clear) c = away(dir > 0 ? -1 : 1);
  return (
    <>
      {lines.map((line, i) => (
        <text
          key={line}
          x={px(x)}
          y={px(c - lift + i * LINE)}
          dy="0.32em"
          fontSize={11}
          fontWeight={600}
          fill={VIZ.inkSoft}
          {...HALO}
        >
          {line}
        </text>
      ))}
    </>
  );
}
