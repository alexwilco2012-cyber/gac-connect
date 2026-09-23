import { BarRows } from './BarRows';
import { VIZ } from './palette';

export interface HBarRow {
  id: string;
  label: string;
  value: number;
  /** Tip text when it should say more than the value ("168 · 41%"). */
  valueLabel?: string;
  /** A text tag after the label ("▲ Promoted") — the bar keeps its colour. */
  tag?: string;
  /** Defaults to sea; "Direct link and other" passes `VIZ.other`. */
  color?: string;
}

/**
 * Ranked horizontal bars on one hue (spec §5 items 5, 7, 8): a value at
 * every tip, "Other" last in `#8595A8`, tags in text rather than colour.
 */
export function HBarList({
  rows,
  max,
  format,
  ariaLabel,
}: {
  rows: HBarRow[];
  /** Scale maximum; defaults to the largest value. */
  max?: number;
  format: (n: number) => string;
  ariaLabel: string;
}) {
  const top = max ?? Math.max(0, ...rows.map((r) => r.value));
  return (
    <BarRows
      ariaLabel={ariaLabel}
      max={top}
      rows={rows.map((r) => ({
        id: r.id,
        label: r.label,
        tag: r.tag,
        value: r.value,
        valueText: r.valueLabel ?? format(r.value),
        color: r.color ?? VIZ.sea,
      }))}
      tooltip={(i) => {
        const r = rows[i]!;
        return {
          header: r.tag ? `${r.label} · ${r.tag}` : r.label,
          rows: [
            {
              key: r.id,
              color: r.color ?? VIZ.sea,
              value: r.valueLabel ?? format(r.value),
              label: '',
            },
          ],
        };
      }}
    />
  );
}
