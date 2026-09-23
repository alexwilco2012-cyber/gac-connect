import { useId, type ReactNode } from 'react';
import { Icon } from '../ui/Icon';

/** The numbers behind a chart, pre-formatted (`gbp` for money, not `compactGbp`). */
export interface TableSpec {
  caption: string;
  columns: string[];
  rows: string[][];
}

export interface LegendItem {
  label: string;
  color: string;
  /** Mirror the mark: a 10×10 square for bars and areas, a 14×2 line for lines. */
  shape?: 'rect' | 'line';
}

/**
 * Every chart's frame (spec §6): `<figure>` + `<figcaption>` (title,
 * subtitle, a screen-reader takeaway) + the plot + `<details>` "Show the
 * numbers" with a real table. Chart components never render a figure of
 * their own — screens compose `ChartFigure` around one or more charts.
 *
 * `variant="card"` (default) draws the white card around it; use `plain`
 * inside a card that already exists. Never place a chart on the in-house
 * (gold) or dark card variants.
 */
export function ChartFigure({
  title,
  subtitle,
  takeaway,
  legend,
  headline,
  action,
  table,
  footnote,
  testId,
  as: Heading = 'h2',
  variant = 'card',
  className = '',
  children,
}: {
  title: string;
  subtitle?: string;
  /** One sentence a screen reader hears as the chart's point. */
  takeaway: string;
  legend?: LegendItem[];
  /** Header figures (≤ 22px) under the title, e.g. a period total. */
  headline?: ReactNode;
  /** A right-aligned control beside the title. */
  action?: ReactNode;
  table: TableSpec;
  footnote?: ReactNode;
  testId?: string;
  as?: 'h2' | 'h3';
  variant?: 'card' | 'plain';
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  const titleId = `${id}-title`;
  const takeawayId = `${id}-takeaway`;
  const frame =
    variant === 'card' ? 'rounded-brand border border-line bg-white p-[22px] shadow-card' : '';

  return (
    <figure
      data-testid={testId}
      aria-labelledby={titleId}
      aria-describedby={takeawayId}
      className={`m-0 min-w-0 ${frame} ${className}`}
    >
      <figcaption className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <Heading
            id={titleId}
            className="font-display text-[15.5px] font-bold tracking-[-0.01em] text-ink"
          >
            {title}
          </Heading>
          {subtitle ? <p className="mt-0.5 text-[12.5px] text-ink-soft">{subtitle}</p> : null}
          <span id={takeawayId} className="sr-only">
            {takeaway}
          </span>
        </div>
        {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
      </figcaption>

      {headline ? <div className="mt-3">{headline}</div> : null}
      {legend && legend.length > 1 ? <Legend items={legend} className="mt-3" /> : null}

      <div className="mt-3">{children}</div>

      {footnote ? <p className="mt-3 text-[12px] leading-snug text-ink-soft">{footnote}</p> : null}

      <details className="group mt-2">
        <summary className="inline-flex min-h-[44px] cursor-pointer list-none items-center gap-1 rounded text-[12.5px] font-bold text-sea hover:text-[#0B4C70] sm:min-h-[32px] [&::-webkit-details-marker]:hidden">
          <Icon
            name="chevron-right"
            size={15}
            className="transition-transform duration-150 group-open:rotate-90"
          />
          Show the numbers
        </summary>
        <ChartTable table={table} />
      </details>
    </figure>
  );
}

/** One row above the plot, swatch mirroring the mark, slot/stack order. */
export function Legend({ items, className = '' }: { items: LegendItem[]; className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink-soft ${className}`}>
      {items.map((it) => (
        <li key={it.label} className="inline-flex items-center gap-1.5">
          {it.shape === 'line' ? (
            <span
              aria-hidden="true"
              className="block h-[2px] w-3.5 rounded-full"
              style={{ background: it.color }}
            />
          ) : (
            <span
              aria-hidden="true"
              className="block h-2.5 w-2.5 rounded-[2px]"
              style={{ background: it.color }}
            />
          )}
          {it.label}
        </li>
      ))}
    </ul>
  );
}

function ChartTable({ table }: { table: TableSpec }) {
  const wide = table.columns.length > 4;
  return (
    <div
      className="mt-1 overflow-x-auto rounded-lg border border-line"
      {...(wide ? { tabIndex: 0, role: 'region', 'aria-label': table.caption } : {})}
    >
      <table className="w-full border-collapse text-[12.5px]">
        <caption className="sr-only">{table.caption}</caption>
        <thead>
          <tr>
            {table.columns.map((c, i) => (
              <th
                key={c}
                scope="col"
                className={`bg-ink px-3 py-2 text-[11px] font-bold tracking-[0.05em] whitespace-nowrap text-white uppercase ${
                  i === 0 ? 'text-left' : 'text-right'
                }`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={`${row[0] ?? ''}-${r}`} className="border-t border-line first:border-t-0">
              {row.map((cell, i) =>
                i === 0 ? (
                  <th
                    key={i}
                    scope="row"
                    className="px-3 py-1.5 text-left font-semibold whitespace-nowrap text-ink"
                  >
                    {cell}
                  </th>
                ) : (
                  <td
                    key={i}
                    className="px-3 py-1.5 text-right whitespace-nowrap text-ink tabular-nums"
                  >
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
