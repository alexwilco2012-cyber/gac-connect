import { useId, useRef, type PointerEvent } from 'react';
import { ChartTooltip, type TooltipRow } from './ChartTooltip';
import { VIZ } from './palette';
import { binLabels, quantize, seqIndex } from './scale';
import { px, textWidth } from './svg';
import { useElementWidth, usePlotNav } from './useChart';

type Cell = { r: number; c: number };

/** The one cell holding the maximum, or null when it is shared or zero. */
function findSinglePeak(values: readonly (readonly number[])[]): Cell | null {
  let best: Cell | null = null;
  let max = 0;
  let count = 0;
  for (let r = 0; r < values.length; r++) {
    const row = values[r]!;
    for (let c = 0; c < row.length; c++) {
      const x = row[c]!;
      if (x > max) {
        max = x;
        best = { r, c };
        count = 1;
      } else if (x === max && x > 0) {
        count += 1;
      }
    }
  }
  return count === 1 ? best : null;
}

const ROW_LABEL = 38;
const GAP = 2;
const MIN_CELL = 16;
const MAX_CELL = 34;

const GRID_HINT =
  'Use the arrow keys to move between cells, Home and End to jump along a row, and Escape to hide the details.';

/**
 * When requests arrive (spec §5 item 6): rows × columns of square cells
 * (≥ 16px, 3px radius, 2px gaps) on the sequential sea ramp, quantised to the
 * given bin floors, with a labelled "Fewer … More" scale. Only the single
 * peak cell carries its number (ink on the light steps, white on the
 * darkest, none on step 4). Keyboard moves in two dimensions; touch scrubs
 * to the nearest cell.
 */
export function Heatmap({
  rows,
  cols,
  values,
  bins,
  cellLabel,
  ariaLabel,
}: {
  rows: string[];
  cols: string[];
  values: number[][];
  /** Lower bound of each bin, ascending from 0 (at most five). */
  bins: number[];
  /** "Tuesday 08:00–10:00 · 5 requests" — the tooltip and live text. */
  cellLabel: (row: string, col: string, v: number) => string;
  ariaLabel: string;
}) {
  const [boxRef, width] = useElementWidth<HTMLDivElement>();
  const hintId = useId();
  const plotRef = useRef<SVGSVGElement>(null);
  const nr = rows.length;
  const nc = cols.length;

  const fit = Math.floor((width - ROW_LABEL - (nc - 1) * GAP) / Math.max(1, nc));
  const cell = Math.max(MIN_CELL, Math.min(MAX_CELL, fit));
  const step = cell + GAP;
  const gridW = nc * step - GAP;
  const gridH = nr * step - GAP;
  const svgW = ROW_LABEL + gridW;
  const height = gridH + 24;
  const ready = width > 0 && nr > 0 && nc > 0;

  const v = (r: number, c: number) => values[r]?.[c] ?? 0;
  const tone = (x: number) => seqIndex(quantize(x, bins), bins.length);

  const singlePeak = findSinglePeak(values);

  const labelEvery = Math.max(
    1,
    Math.ceil((Math.max(...cols.map((c) => textWidth(c))) + 8) / step),
  );

  const nav = usePlotNav<Cell>({
    ref: plotRef,
    initial: () => singlePeak ?? (nr && nc ? { r: 0, c: 0 } : null),
    keyMove: (key, cur) => {
      const at = cur ?? { r: 0, c: 0 };
      const clampR = (r: number) => Math.max(0, Math.min(nr - 1, r));
      const clampC = (c: number) => Math.max(0, Math.min(nc - 1, c));
      switch (key) {
        case 'ArrowRight':
          return { r: at.r, c: cur ? clampC(at.c + 1) : 0 };
        case 'ArrowLeft':
          return { r: at.r, c: cur ? clampC(at.c - 1) : nc - 1 };
        case 'ArrowDown':
          return { r: cur ? clampR(at.r + 1) : 0, c: at.c };
        case 'ArrowUp':
          return { r: cur ? clampR(at.r - 1) : nr - 1, c: at.c };
        case 'Home':
          return { r: at.r, c: 0 };
        case 'End':
          return { r: at.r, c: nc - 1 };
        default:
          return undefined;
      }
    },
    pointAt: (e: PointerEvent<Element>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left - ROW_LABEL;
      const y = e.clientY - rect.top;
      return {
        r: Math.max(0, Math.min(nr - 1, Math.floor(y / step))),
        c: Math.max(0, Math.min(nc - 1, Math.floor(x / step))),
      };
    },
  });
  const active = nav.active && nav.active.r < nr && nav.active.c < nc ? nav.active : null;

  let header = '';
  const tipRows: TooltipRow[] = [];
  if (active) {
    const text = cellLabel(rows[active.r]!, cols[active.c]!, v(active.r, active.c));
    const cut = text.lastIndexOf(' · ');
    header = cut > 0 ? text.slice(0, cut) : text;
    if (cut > 0) {
      tipRows.push({
        key: 'v',
        color: VIZ.seq[tone(v(active.r, active.c))],
        value: text.slice(cut + 3),
        label: '',
      });
    }
  }
  const live =
    active && nav.source !== 'pointer'
      ? cellLabel(rows[active.r]!, cols[active.c]!, v(active.r, active.c))
      : '';
  const anchor = () =>
    active
      ? {
          x: ROW_LABEL + active.c * step + cell / 2,
          y: active.r * step,
          below: active.r * step + cell,
        }
      : null;

  const legend = binLabels(bins);

  return (
    <div>
      <div ref={boxRef} className="relative" style={{ height }}>
        {ready ? (
          <svg
            ref={plotRef}
            {...nav.bind}
            role="group"
            aria-label={ariaLabel}
            aria-describedby={hintId}
            width={svgW}
            height={height}
            className="block touch-pan-y select-none"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            <g aria-hidden="true">
              {rows.map((row, r) => (
                <text
                  key={row}
                  x={0}
                  y={px(r * step + cell / 2)}
                  dy="0.32em"
                  fontSize={11}
                  fill={VIZ.tick}
                  fontWeight={active?.r === r ? 700 : 400}
                >
                  {row}
                </text>
              ))}
              {values.map((row, r) =>
                row.map((x, c) => (
                  <rect
                    key={`${r}-${c}`}
                    x={ROW_LABEL + c * step}
                    y={r * step}
                    width={cell}
                    height={cell}
                    rx={3}
                    fill={VIZ.seq[tone(x)]}
                  />
                )),
              )}
              {singlePeak && tone(v(singlePeak.r, singlePeak.c)) !== 3 ? (
                <text
                  x={px(ROW_LABEL + singlePeak.c * step + cell / 2)}
                  y={px(singlePeak.r * step + cell / 2)}
                  dy="0.34em"
                  fontSize={11}
                  fontWeight={700}
                  textAnchor="middle"
                  fill={tone(v(singlePeak.r, singlePeak.c)) === 4 ? VIZ.surface : VIZ.ink}
                >
                  {v(singlePeak.r, singlePeak.c)}
                </text>
              ) : null}
              {cols.map((col, c) =>
                c % labelEvery === 0 ? (
                  <text
                    key={col}
                    x={px(ROW_LABEL + c * step + (labelEvery > 1 ? 0 : cell / 2))}
                    y={gridH + 16}
                    fontSize={11}
                    fill={VIZ.tick}
                    textAnchor={labelEvery > 1 ? 'start' : 'middle'}
                    fontWeight={active?.c === c ? 700 : 400}
                  >
                    {col}
                  </text>
                ) : null,
              )}
              {active ? (
                <rect
                  x={ROW_LABEL + active.c * step - 1.5}
                  y={active.r * step - 1.5}
                  width={cell + 3}
                  height={cell + 3}
                  rx={4}
                  fill="none"
                  stroke={VIZ.ink}
                  strokeWidth={2}
                />
              ) : null}
            </g>
          </svg>
        ) : null}
        {active ? (
          <ChartTooltip
            boxRef={boxRef}
            anchor={anchor}
            placement="above"
            offset={8}
            header={header}
            rows={tipRows}
          />
        ) : null}
        <p id={hintId} className="sr-only">
          {GRID_HINT}
        </p>
        <p className="sr-only" aria-live="polite">
          {live}
        </p>
      </div>

      <div className="mt-3 flex items-start gap-2 text-[11px] text-ink-soft" aria-hidden="true">
        <span className="pt-px">Fewer</span>
        <div className="flex gap-[2px]">
          {legend.map((l, i) => (
            <div key={l} className="flex w-8 flex-col items-center gap-1">
              <span
                className="block h-3 w-full rounded-[3px]"
                style={{ background: VIZ.seq[seqIndex(i, bins.length)] }}
              />
              <span className="tabular-nums" style={{ color: VIZ.tick }}>
                {l}
              </span>
            </div>
          ))}
        </div>
        <span className="pt-px">More</span>
      </div>
    </div>
  );
}
