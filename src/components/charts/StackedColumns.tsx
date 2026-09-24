import { useId, useRef, type PointerEvent } from 'react';
import { ChartTooltip, type TooltipRow } from './ChartTooltip';
import { VIZ } from './palette';
import {
  bandLayout,
  columnPath,
  fitTicks,
  nearestIndex,
  spreadLabels,
  stackSegments,
} from './scale';
import { NAV_HINT, TICK_GAP, px, textWidth, tickGutter } from './svg';
import { linearKeys, liveLine, useElementWidth, useEntrance, usePlotNav } from './useChart';

export interface StackSeries {
  id: string;
  label: string;
  /** Fixed to the entity (e.g. `LINE_COLOURS.customs`) — never by rank. */
  color: string;
  values: number[];
}

export interface StackLower {
  label: string;
  color: string;
  values: number[];
  format: (n: number) => string;
}

const TOP = 18;
const PLOT_H = 190;
const LOWER_H = 56;

/**
 * Stacked columns (spec §2 GAC spend, §3 earnings): series stack bottom →
 * top in the order given, 2px geometric gaps, the rounded data end on the
 * top segment only. `lower` adds an aligned panel on the same x-axis and
 * tooltip ("Saved by your tier discount"); `directLabelLast` names the
 * latest column's segments in a right-hand gutter and sets its total, named
 * as one ("Sep total £12,600"), above the column.
 * A series whose values are all zero simply draws nothing — the survivors
 * keep their colours.
 */
export function StackedColumns({
  categories,
  series,
  format,
  axisFormat,
  lower,
  directLabelLast = false,
  ariaLabel,
}: {
  categories: string[];
  series: StackSeries[];
  /** Tooltip, table and direct-label figures (`gbp`). */
  format: (n: number) => string;
  /** Axis ticks (`compactGbp`); defaults to `format`. */
  axisFormat?: (n: number) => string;
  lower?: StackLower;
  directLabelLast?: boolean;
  ariaLabel: string;
}) {
  const [boxRef, width] = useElementWidth<HTMLDivElement>();
  const hintId = useId();
  const plotRef = useRef<SVGSVGElement>(null);
  const n = categories.length;
  const last = n - 1;
  const axis = axisFormat ?? format;

  const totals = categories.map((_, i) => series.reduce((a, s) => a + (s.values[i] ?? 0), 0));
  const ticks = fitTicks(Math.max(0, ...totals));
  const lowerTicks = lower
    ? fitTicks(Math.max(0, ...lower.values), { minTicks: 3, maxTicks: 3 })
    : [];
  const gutterLeft = tickGutter([...ticks, ...lowerTicks].map(axis), 24);

  // The gutter holds the series names (and the lower panel's figure); the
  // total sits above its column instead, so it never needs the room.
  const labelled = series.filter((s) => (s.values[last] ?? 0) > 0);
  const labelW = directLabelLast
    ? Math.max(
        0,
        ...labelled.map((s) => textWidth(s.label)),
        lower ? textWidth(lower.format(lower.values[last] ?? 0), 11, true) : 0,
      )
    : 0;
  // Direct labels only if they fit: never at the cost of squeezing the plot
  // below 55% of the chart (the legend and the table still name every series).
  const labelsFit = width - gutterLeft - (labelW + 16) >= Math.max(160, width * 0.55);
  const showDirect = directLabelLast && labelsFit;
  const gutterRight = showDirect ? labelW + 16 : 4;

  const plotLeft = gutterLeft;
  const plotRight = Math.max(plotLeft + 10, width - gutterRight);
  const plotW = plotRight - plotLeft;
  const band = bandLayout(Math.max(1, n), plotW, { start: plotLeft });
  const baseline = TOP + PLOT_H;
  const topTick = ticks.at(-1) || 1;
  const toPx = (v: number) => (v / topTick) * PLOT_H;
  const y = (v: number) => baseline - toPx(v);

  const lowerTitleY = baseline + 42;
  const lowerTop = baseline + 54;
  const lowerBottom = lowerTop + LOWER_H;
  const lowerTopTick = lowerTicks.at(-1) || 1;
  const ly = (v: number) => lowerBottom - (v / lowerTopTick) * LOWER_H;
  const height = lower ? lowerBottom + 6 : baseline + 26;

  const ready = width > 0 && n > 0;
  const animating = useEntrance(ready);
  const stagger = (i: number) => `${Math.round((i / Math.max(1, last)) * 240)}ms`;
  const growClass = animating ? 'viz-grow' : undefined;
  const grow = (i: number) => (animating ? { animationDelay: stagger(i) } : undefined);

  const columns = categories.map((_, i) =>
    stackSegments(
      series.map((s) => s.values[i] ?? 0),
      toPx,
      baseline,
    ),
  );

  // ——— interaction ———
  const nav = usePlotNav<number>({
    ref: plotRef,
    initial: () => (n ? last : null),
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
    for (const s of [...series].reverse()) {
      tipRows.push({
        key: s.id,
        color: s.color,
        value: format(s.values[active] ?? 0),
        label: s.label,
      });
    }
    if (series.length > 1) {
      tipRows.push({ key: 'total', value: format(totals[active] ?? 0), label: 'Total' });
    }
    if (lower) {
      tipRows.push({
        key: 'lower',
        color: lower.color,
        value: lower.format(lower.values[active] ?? 0),
        label: lower.label,
      });
    }
  }
  const header = active !== null ? (categories[active] ?? '') : '';
  const live = active !== null && nav.source !== 'pointer' ? liveLine(header, tipRows) : '';
  const anchor = () => {
    if (active === null) return null;
    const segs = columns[active] ?? [];
    return { x: band.centre(active), y: segs.at(-1)?.y ?? baseline - 10 };
  };

  // ——— direct labels on the latest column ———
  // The total is its own label, named ("Sep total £12,600") and set above the
  // column; the series names sit beside their segments a clear line below it.
  // A bare figure stacked over a name reads as that segment's value.
  const direct = (() => {
    if (!showDirect || !ready) return null;
    const segs = columns[last] ?? [];
    if (!segs.length) return null;
    const totalLead = `${categories[last] ?? ''} total `;
    const totalFigure = format(totals[last] ?? 0);
    const half = (textWidth(totalLead) + textWidth(totalFigure, 11, true)) / 2;
    const tx = Math.min(band.centre(last), width - 2 - half);
    // Above every column the label spans, not just the latest one; and if a
    // gridline would run through the words, lifted just clear above it.
    const under = columns.flatMap((c, i) =>
      band.left(i) < tx + half && band.left(i) + band.bar > tx - half && c.length
        ? [c.at(-1)!.y]
        : [],
    );
    let ty = Math.min(baseline, ...under) - 7;
    const grid = ticks.map((t) => Math.round(y(t)) + 0.5).find((g) => g > ty - 10 && g < ty + 4);
    if (grid !== undefined) ty = grid - 4;
    ty = Math.max(11, ty);
    const items = segs.map((sg) => ({
      key: series[sg.index]!.id,
      text: series[sg.index]!.label,
      at: sg.y + sg.height / 2,
    }));
    const ys = spreadLabels(
      items.map((it) => it.at),
      13,
      Math.max(TOP - 4, ty + 13),
      baseline - 4,
    );
    const x0 = band.left(last) + band.bar;
    const lx = x0 + 12;
    return (
      <g>
        <text
          x={px(tx)}
          y={px(ty)}
          fontSize={11}
          fontWeight={500}
          fill={VIZ.inkSoft}
          textAnchor="middle"
        >
          {totalLead}
          <tspan fontWeight={700} fill={VIZ.ink}>
            {totalFigure}
          </tspan>
        </text>
        {items.map((it, k) => {
          const yy = ys[k]!;
          return (
            <g key={it.key}>
              <path
                d={`M${px(x0 + 2)} ${px(it.at)}L${px(x0 + 5)} ${px(it.at)}L${px(lx - 3)} ${px(yy)}`}
                fill="none"
                stroke={VIZ.axis}
                strokeWidth={1}
              />
              <text
                x={px(lx)}
                y={px(yy)}
                dy="0.32em"
                fontSize={11}
                fontWeight={500}
                fill={VIZ.inkSoft}
              >
                {it.text}
              </text>
            </g>
          );
        })}
        {lower && (lower.values[last] ?? 0) > 0 ? (
          <text
            x={px(lx)}
            y={px(
              ly(lower.values[last]!) + Math.min(10, (lowerBottom - ly(lower.values[last]!)) / 2),
            )}
            dy="0.32em"
            fontSize={11}
            fontWeight={700}
            fill={VIZ.ink}
          >
            {lower.format(lower.values[last]!)}
          </text>
        ) : null}
      </g>
    );
  })();

  // Every category label that fits its band; otherwise every k-th, counted
  // back from the latest so it always carries a label.
  const every = Math.max(
    1,
    Math.ceil((Math.max(0, ...categories.map((c) => textWidth(c))) + 4) / Math.max(1, band.band)),
  );
  const xLabels = categories.map((_, i) => i).filter((i) => (last - i) % every === 0);

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
            {active !== null ? (
              <rect
                x={px(band.centre(active) - band.band / 2 + 1)}
                y={TOP - 8}
                width={px(Math.max(0, band.band - 2))}
                height={(lower ? lowerBottom : baseline) - TOP + 8}
                rx={4}
                fill={VIZ.hover}
              />
            ) : null}

            {ticks.map((t) => {
              const ty = Math.round(y(t)) + 0.5;
              return (
                <g key={t}>
                  <line
                    x1={plotLeft}
                    x2={plotRight}
                    y1={ty}
                    y2={ty}
                    stroke={t === 0 ? VIZ.axis : VIZ.grid}
                  />
                  <text
                    x={plotLeft - TICK_GAP}
                    y={ty}
                    dy="0.32em"
                    fontSize={11}
                    fill={VIZ.tick}
                    textAnchor="end"
                  >
                    {axis(t)}
                  </text>
                </g>
              );
            })}

            {columns.map((segs, i) => (
              <g key={categories[i]} className={growClass} style={grow(i)}>
                {segs.map((sg) => (
                  <path
                    key={series[sg.index]!.id}
                    d={columnPath(band.left(i), sg.y, band.bar, sg.height, sg.radius)}
                    fill={series[sg.index]!.color}
                  />
                ))}
              </g>
            ))}

            {xLabels.map((i) => (
              <text
                key={i}
                x={px(band.centre(i))}
                y={baseline + 17}
                fontSize={11}
                fill={VIZ.tick}
                textAnchor="middle"
                fontWeight={i === active ? 700 : 400}
              >
                {categories[i]}
              </text>
            ))}

            {lower ? (
              <g>
                <text x={0} y={lowerTitleY} fontSize={12} fontWeight={600} fill={VIZ.inkSoft}>
                  {lower.label}
                </text>
                {lowerTicks.map((t) => {
                  const ty = Math.round(ly(t)) + 0.5;
                  return (
                    <g key={t}>
                      <line
                        x1={plotLeft}
                        x2={plotRight}
                        y1={ty}
                        y2={ty}
                        stroke={t === 0 ? VIZ.axis : VIZ.grid}
                      />
                      <text
                        x={plotLeft - TICK_GAP}
                        y={ty}
                        dy="0.32em"
                        fontSize={11}
                        fill={VIZ.tick}
                        textAnchor="end"
                      >
                        {axis(t)}
                      </text>
                    </g>
                  );
                })}
                {lower.values.map((v, i) =>
                  v > 0 ? (
                    <path
                      key={i}
                      d={columnPath(band.left(i), ly(v), band.bar, lowerBottom - ly(v), 4)}
                      fill={lower.color}
                      className={growClass}
                      style={grow(i)}
                    />
                  ) : null,
                )}
              </g>
            ) : null}

            {direct}
          </g>
        </svg>
      ) : null}
      {active !== null ? (
        <ChartTooltip
          boxRef={boxRef}
          anchor={anchor}
          placement="side"
          offset={12 + band.bar / 2}
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
