import {
  ChartFigure,
  LINE_COLOURS,
  Legend,
  StackedColumns,
  VIZ,
  type LegendItem,
} from '../../../../components/charts';
import { SPEND_MONTHS } from '../../../../data/clientDesk';
import { monthlySaving, spendSeries } from '../../../../lib/clientDesk';
import { compactGbp, gbp } from '../../../../lib/format';
import { tierPct } from '../../../../lib/tier';
import { useApp } from '../../../../store/app';

/**
 * "GAC spend, last six months" (spec §2, row 3 left): stacked columns of the
 * lines the client holds, ladder order bottom to top, with what the tier
 * discount saved in an aligned panel underneath.
 *
 * It reads the same `useApp` tier the consolidation card's pillars write, so
 * switching a pillar moves the legend, the bars and the saving while you
 * watch. Colour is fixed to the line (`LINE_COLOURS`), never to its place in
 * the stack, so a survivor never repaints. No celebration at Full Stack: the
 * card above has the one gold moment on the screen.
 *
 * Client-facing: the table, tooltip and accessible names carry spend and
 * saving only — never a supplier's band or commission (03 §3.2).
 */

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

/** "Agency and Procurement" / "Agency, Logistics, Customs and Procurement". */
function listOf(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

export function SpendChart() {
  const tier = useApp((s) => s.tier);
  const pct = tierPct(tier);
  const months = [...SPEND_MONTHS];

  const series = spendSeries(tier).map((s) => ({ ...s, color: LINE_COLOURS[s.id] }));
  const saved = monthlySaving(tier);
  const monthTotals = months.map((_, i) => sum(series.map((s) => s.values[i] ?? 0)));
  const total = sum(monthTotals);
  const savedTotal = sum(saved);
  const names = series.map((s) => s.label);

  const legend: LegendItem[] = series.map((s) => ({ label: s.label, color: s.color }));
  const savedHeader = `Saved at ${pct}%`;

  const takeaway =
    pct > 0
      ? `${gbp(total)} of GAC spend on ${listOf(names)} since April; the ${pct}% tier discount saved ${gbp(savedTotal)}.`
      : `${gbp(total)} of GAC spend on ${listOf(names)} since April; no tier discount is held.`;

  return (
    <ChartFigure
      testId="client-spend"
      title="GAC spend, last six months"
      subtitle="By service line, with what your tier discount saved underneath"
      takeaway={takeaway}
      headline={
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span
            data-testid="client-spend-total"
            className="font-display text-[22px] leading-none font-bold tracking-[-0.01em] text-ink tabular-nums"
          >
            {gbp(total)}
          </span>
          <span className="inline-flex items-baseline gap-1.5 text-[13px] text-ink-soft">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 translate-y-px rounded-[2px]"
              style={{ background: VIZ.derived }}
            />
            <span data-testid="client-spend-saving" className="tabular-nums">
              {pct > 0 ? (
                <>
                  <strong className="font-bold text-ink">{gbp(savedTotal)}</strong> saved at {pct}%
                </>
              ) : (
                'No tier discount held yet'
              )}
            </span>
          </span>
        </p>
      }
      footnote="Illustrative figures. The chart follows the lines held in the tier card above."
      table={{
        caption:
          'GAC spend by service line per month, April to September 2026, and the tier saving',
        columns: ['Month', ...names, 'Total', savedHeader],
        rows: [
          ...months.map((m, i) => [
            m,
            ...series.map((s) => gbp(s.values[i] ?? 0)),
            gbp(monthTotals[i] ?? 0),
            gbp(saved[i] ?? 0),
          ]),
          ['Six months', ...series.map((s) => gbp(sum(s.values))), gbp(total), gbp(savedTotal)],
        ],
      }}
    >
      {/* The legend is ours rather than the figure's so it can hold its height:
          on a phone four lines wrap to two rows, and toggling a pillar should
          not nudge the chart up and down. */}
      <div data-testid="client-spend-legend" className="max-sm:min-h-[42px]">
        <Legend items={legend} />
      </div>
      <div className="mt-3">
        <StackedColumns
          categories={months}
          series={series}
          format={gbp}
          axisFormat={compactGbp}
          directLabelLast
          lower={
            pct > 0
              ? {
                  label: 'Saved by your tier discount',
                  color: VIZ.derived,
                  values: saved,
                  format: gbp,
                }
              : undefined
          }
          ariaLabel="GAC spend by service line per month, April to September, with the tier saving below"
        />
      </div>
    </ChartFigure>
  );
}
