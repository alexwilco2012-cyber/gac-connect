import type { CSSProperties } from 'react';
import { VIZ } from './palette';
import { edgeAnchor } from './scale';

const pct = (v: number, max: number) => (max > 0 ? Math.max(0, Math.min(100, (v / max) * 100)) : 0);

/** Absolute position for a label at `p`% that stays inside the track. */
function at(p: number): CSSProperties {
  const a = edgeAnchor(p);
  return {
    left: `${p}%`,
    transform:
      a === 'start' ? 'translateX(-2px)' : a === 'end' ? 'translateX(-100%)' : 'translateX(-50%)',
  };
}

/**
 * Against your category (spec §5 item 4). Higher is better → a bullet: sea
 * fill to the value on the sea-soft track. Lower is better → a dot strip
 * with no fill ("Faster" at the left). Either way the category average is
 * an ink tick on a 6px white ring, and both values are labelled in words, so
 * the visual is static: `role="img"` with the takeaway as its label.
 */
export function BenchmarkBar({
  value,
  benchmark,
  max,
  format,
  lowerIsBetter = false,
  valueLabel,
  benchmarkLabel,
  ariaLabel,
}: {
  value: number;
  benchmark: number;
  max: number;
  format: (n: number) => string;
  lowerIsBetter?: boolean;
  /** Above the mark; defaults to "You · 34%". */
  valueLabel?: string;
  /** Under the tick; defaults to "Category average 27%". */
  benchmarkLabel?: string;
  ariaLabel: string;
}) {
  const vp = pct(value, max);
  const bp = pct(benchmark, max);
  return (
    <div role="img" aria-label={ariaLabel} className="select-none">
      <div className="relative h-5">
        <span
          className="absolute bottom-1 text-[12.5px] leading-none font-bold whitespace-nowrap text-ink tabular-nums"
          style={at(vp)}
        >
          {valueLabel ?? `You · ${format(value)}`}
        </span>
      </div>

      <div className="relative h-4">
        <span
          className="absolute inset-x-0 top-1 block h-2 rounded-full"
          style={{ background: VIZ.track }}
        />
        {lowerIsBetter ? null : (
          <span
            className="absolute top-1 left-0 block h-2 rounded-full"
            style={{ width: `${vp}%`, minWidth: 4, background: VIZ.sea }}
          />
        )}
        <span
          className="absolute top-0 flex h-4 w-[6px] -translate-x-1/2 justify-center bg-white"
          style={{ left: `${bp}%` }}
        >
          <span className="block h-full w-[2px]" style={{ background: VIZ.ref }} />
        </span>
        {lowerIsBetter ? (
          <span
            className="absolute top-1/2 block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${vp}%`, background: VIZ.sea, boxShadow: `0 0 0 2px ${VIZ.surface}` }}
          />
        ) : null}
      </div>

      <div className="relative h-5">
        <span
          className="absolute top-1 text-[11.5px] leading-none whitespace-nowrap text-ink-soft tabular-nums"
          style={at(bp)}
        >
          {benchmarkLabel ?? `Category average ${format(benchmark)}`}
        </span>
      </div>

      <div
        className="mt-1.5 flex justify-between text-[11px] tabular-nums"
        style={{ color: VIZ.tick }}
      >
        <span>{lowerIsBetter ? `← Faster · ${format(0)}` : format(0)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}
