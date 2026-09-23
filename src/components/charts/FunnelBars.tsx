import { BarRows } from './BarRows';
import { VIZ } from './palette';

/** Ordinal ramp for `n` steps: all five for five, else spread over the first four. */
function funnelColour(i: number, n: number): string {
  if (n >= 5) return VIZ.ord[Math.min(i, 4)]!;
  if (n <= 1) return VIZ.ord[3]!;
  return VIZ.ord[Math.round((i * 3) / (n - 1))]!;
}

/**
 * From search to signed job (spec §5 item 3): horizontal bars on a linear
 * scale — no trapezoids, no log scale — light → dark on the ordinal ramp,
 * the value at each tip and the step rate between rows. A small last step
 * is the honest reading; its label sits outside the bar.
 */
export function FunnelBars({
  steps,
  format,
  rateLabels,
  ariaLabel,
}: {
  steps: { label: string; value: number }[];
  format: (n: number) => string;
  /** One per step after the first: "13.9% opened your profile". */
  rateLabels: string[];
  ariaLabel: string;
}) {
  const n = steps.length;
  const max = Math.max(0, ...steps.map((s) => s.value));
  return (
    <BarRows
      ariaLabel={ariaLabel}
      max={max}
      rows={steps.map((s, i) => ({
        id: `${i}-${s.label}`,
        label: s.label,
        value: s.value,
        valueText: format(s.value),
        color: funnelColour(i, n),
      }))}
      between={(i) =>
        rateLabels[i] ? (
          <p className="flex items-center gap-1.5 px-2 py-0.5 text-[12px] leading-tight text-ink-soft @sm:pl-[calc(var(--bar-label)+1.5rem)]">
            <span aria-hidden="true" className="text-[11px]">
              ↓
            </span>
            {rateLabels[i]}
          </p>
        ) : null
      }
      tooltip={(i) => {
        const s = steps[i]!;
        const rate = i > 0 ? rateLabels[i - 1] : undefined;
        return {
          header: s.label,
          rows: [
            { key: 'v', color: funnelColour(i, n), value: format(s.value), label: '' },
            ...(rate ? [{ key: 'rate', value: '', label: rate }] : []),
          ],
        };
      }}
    />
  );
}
