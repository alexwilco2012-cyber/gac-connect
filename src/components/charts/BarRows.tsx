import {
  Fragment,
  useId,
  useRef,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { ChartTooltip, type TooltipRow } from './ChartTooltip';
import { NAV_HINT, textWidth } from './svg';
import { linearKeys, liveLine, useEntrance, usePlotNav } from './useChart';

export interface BarRowSpec {
  id: string;
  label: string;
  tag?: string;
  value: number;
  /** Text at the bar tip. */
  valueText: string;
  color: string;
}

/**
 * Horizontal bar rows in HTML (crisp text that wraps like prose): labels in
 * a left column when the chart has room and above the bar when it does not,
 * 18px bars with a 4px rounded tip and 10px between rows, the value at every
 * tip. One tab stop; ↑/↓ or ←/→ move row by row with a per-row tooltip and
 * a full-row hover band. Internal — screens use `HBarList` and `FunnelBars`.
 */
export function BarRows({
  rows,
  max,
  ariaLabel,
  between,
  tooltip,
}: {
  rows: BarRowSpec[];
  max: number;
  ariaLabel: string;
  /** Rendered between row i and row i + 1 (the funnel's step rates). */
  between?: (i: number) => ReactNode;
  tooltip: (i: number) => { header: string; rows: TooltipRow[] };
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const plotRef = useRef<HTMLDivElement>(null);
  const n = rows.length;
  const animating = useEntrance(true);
  // The label column fits its longest label (a tag may wrap under it).
  const labelW = Math.round(
    Math.min(168, Math.max(40, ...rows.map((r) => textWidth(r.label, 12.5, true) + 6))),
  );
  // Short labels ("5 ★") stay beside their bars even on a phone; longer ones
  // move above the bar when the chart is narrower than 24rem.
  const columns =
    labelW <= 64
      ? 'grid-cols-[var(--bar-label)_minmax(0,1fr)]'
      : '@sm:grid-cols-[var(--bar-label)_minmax(0,1fr)]';

  const nav = usePlotNav<number>({
    ref: plotRef,
    initial: () => (n ? 0 : null),
    keyMove: linearKeys(n, { vertical: true }),
    pointAt: (e: PointerEvent<Element>) => {
      const els = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[data-row]'));
      let best = -1;
      let dist = Infinity;
      for (const el of els) {
        const r = el.getBoundingClientRect();
        const d =
          e.clientY < r.top ? r.top - e.clientY : e.clientY > r.bottom ? e.clientY - r.bottom : 0;
        if (d < dist) {
          dist = d;
          best = Number(el.dataset.row);
        }
      }
      return best >= 0 ? best : null;
    },
  });
  const active = nav.active !== null && nav.active < n ? nav.active : null;
  const tip = active !== null ? tooltip(active) : null;
  const live = tip && nav.source !== 'pointer' ? liveLine(tip.header, tip.rows) : '';

  const anchor = (box: HTMLElement) => {
    if (active === null) return null;
    const row = box.querySelector<HTMLElement>(`[data-row="${active}"]`);
    const bar = row?.querySelector<HTMLElement>('[data-bar]');
    if (!row || !bar) return null;
    const b = box.getBoundingClientRect();
    const rr = row.getBoundingClientRect();
    const br = bar.getBoundingClientRect();
    return { x: br.right - b.left, y: rr.top - b.top + 4, below: rr.bottom - b.top };
  };

  return (
    <div
      ref={boxRef}
      className="@container relative"
      style={{ '--bar-label': `${labelW}px` } as CSSProperties}
    >
      <div
        ref={plotRef}
        {...nav.bind}
        role="group"
        aria-label={ariaLabel}
        aria-describedby={hintId}
        className="touch-pan-y rounded-lg select-none"
      >
        {rows.map((r, i) => {
          const pct = max > 0 ? Math.max(0, Math.min(1, r.value / max)) : 0;
          return (
            <Fragment key={r.id}>
              <div
                data-row={i}
                className={`grid items-center gap-x-4 gap-y-1 rounded-md px-2 py-[5px] ${columns} ${
                  active === i ? 'bg-[#F1F4F8]' : ''
                }`}
              >
                <p className="min-w-0 text-[12.5px] leading-tight font-semibold text-ink">
                  {r.label}
                  {r.tag ? (
                    <>
                      {' '}
                      <span className="text-[11px] font-bold whitespace-nowrap text-promoted">
                        {r.tag}
                      </span>
                    </>
                  ) : null}
                </p>
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    data-bar=""
                    className={`block h-[18px] shrink-0 rounded-r-[4px] ${animating ? 'viz-grow-x' : ''}`}
                    style={{
                      width: `calc((100% - 5.5rem) * ${pct.toFixed(4)})`,
                      minWidth: 2,
                      background: r.color,
                      animationDelay: animating
                        ? `${Math.round((i / Math.max(1, n - 1)) * 240)}ms`
                        : undefined,
                    }}
                  />
                  <span className="text-[12px] font-bold whitespace-nowrap text-ink tabular-nums">
                    {r.valueText}
                  </span>
                </div>
              </div>
              {between && i < n - 1 ? between(i) : null}
            </Fragment>
          );
        })}
      </div>
      {tip ? (
        <ChartTooltip
          boxRef={boxRef}
          anchor={anchor}
          placement="above"
          header={tip.header}
          rows={tip.rows}
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
