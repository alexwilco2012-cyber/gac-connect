import { Fragment, useLayoutEffect, useRef, type RefObject } from 'react';
import { placeTooltip, type TooltipPlacement } from './scale';

export interface TooltipRow {
  key: string;
  /** Series colour for the key; omit for a total or a note row. */
  color?: string;
  /** A 12×2 line key (default), an ink tick for a benchmark, or nothing. */
  shape?: 'line' | 'tick' | 'none';
  value: string;
  label: string;
}

/**
 * The chart tooltip (spec §6): an HTML overlay over the plot — white, 1px
 * grid border, radius 8, soft shadow — with a header line and one row per
 * series, value first. It positions itself after layout (so it can measure
 * its own size), flips at the edges of the chart box and never takes the
 * pointer. Screen readers get the same text through the chart's
 * `aria-live` line, so the overlay itself is hidden from them.
 */
export function ChartTooltip({
  boxRef,
  anchor,
  placement,
  offset,
  header,
  rows,
}: {
  boxRef: RefObject<HTMLElement | null>;
  /** Anchor point in the box's coordinates, read after layout (the box is passed in). */
  anchor: (box: HTMLElement) => { x: number; y: number; below?: number } | null;
  placement: TooltipPlacement;
  offset?: number;
  header: string;
  rows: readonly TooltipRow[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const box = boxRef.current;
    if (!el || !box) return;
    const a = anchor(box);
    if (!a) {
      el.style.visibility = 'hidden';
      return;
    }
    const { left, top } = placeTooltip({
      x: a.x,
      y: a.y,
      below: a.below,
      width: el.offsetWidth,
      height: el.offsetHeight,
      boxWidth: box.clientWidth,
      boxHeight: box.clientHeight,
      placement,
      offset,
    });
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.visibility = 'visible';
  });

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-chart-tooltip=""
      className="pointer-events-none absolute top-0 left-0 z-20 w-max max-w-[240px] rounded-lg border border-[#E5EAF1] bg-white px-2.5 py-2 text-left shadow-[0_4px_14px_rgba(10,37,64,0.12)]"
    >
      <p className="text-[11.5px] leading-snug font-semibold text-ink-soft">{header}</p>
      {rows.length ? (
        <div className="mt-1 grid grid-cols-[12px_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1">
          {rows.map((r) => (
            <Fragment key={r.key}>
              <Key color={r.color} shape={r.shape ?? (r.color ? 'line' : 'none')} />
              <span className="text-right text-[13px] leading-tight font-bold text-ink tabular-nums">
                {r.value}
              </span>
              <span className="text-[12px] leading-tight text-ink-soft">{r.label}</span>
            </Fragment>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Key({ color, shape }: { color?: string; shape: 'line' | 'tick' | 'none' }) {
  if (shape === 'none' || !color) return <span />;
  if (shape === 'tick') {
    return (
      <span className="flex justify-center">
        <span className="block h-2.5 w-[2px]" style={{ background: color }} />
      </span>
    );
  }
  return <span className="block h-[2px] w-3 rounded-full" style={{ background: color }} />;
}
