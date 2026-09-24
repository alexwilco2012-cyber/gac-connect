import { ChartFigure, Heatmap } from '../../../components/charts';
import {
  HOUR_BLOCK_NAMES,
  HOUR_BLOCKS,
  PERIOD_SUMMARY,
  WEEKDAY_NAMES,
  WEEKDAYS,
  type Period,
} from '../../../data/analytics';
import { count, plural } from '../../../lib/format';
import { readDemand, sharePct } from './model';

/**
 * Lower bound of each colour step. The 90-day grid holds about three times
 * the requests, so its steps are wider; both keep five, with the single peak
 * alone in the darkest.
 */
const BINS: Record<Period, number[]> = {
  30: [0, 1, 2, 3, 5],
  90: [0, 1, 3, 5, 8],
};

const requests = (n: number) => plural(n, 'request', 'requests');

/**
 * When requests arrive (spec §5 item 6): weekday × two-hour heatmap on the
 * sequential sea ramp, quantised to five labelled steps, with the three
 * readings a supplier would act on beside it — the peak slot, the busiest
 * day, and how much arrives outside the working day.
 */
export function DemandFigure({ period }: { period: Period }) {
  const grid = PERIOD_SUMMARY[period].heatmap;
  const d = readDemand(grid);
  const cellLabel = (row: string, col: string, v: number) =>
    `${WEEKDAY_NAMES[WEEKDAYS.indexOf(row)] ?? row} ${HOUR_BLOCK_NAMES[HOUR_BLOCKS.indexOf(col)] ?? col} · ${requests(v)}`;

  const facts = [
    {
      term: 'Busiest two hours',
      value: `${d.peak.day} ${d.peak.block}`,
      detail: requests(d.peak.count),
    },
    {
      term: 'Busiest day',
      value: d.busiestDay.day,
      detail: `${count(d.busiestDay.count)} of ${requests(d.total)}`,
    },
    {
      term: 'Out of hours',
      value: `${sharePct(d.outOfHours, d.total)}%`,
      detail: `${count(d.outOfHours)} of ${requests(d.total)} came before 08:00, after 18:00 or at a weekend`,
    },
  ];

  return (
    <ChartFigure
      testId="analytics-heatmap"
      title="When requests arrive"
      subtitle={`Quote requests by weekday and time of day · last ${period} days`}
      takeaway={`Requests cluster on weekday mornings, peaking on ${d.peak.day} ${d.peak.block} with ${requests(d.peak.count)}.`}
      table={{
        caption: `Quote requests by weekday and two-hour block, last ${period} days`,
        columns: ['Day', ...HOUR_BLOCKS],
        rows: grid.map((row, r) => [WEEKDAYS[r] ?? '', ...row.map(count)]),
      }}
    >
      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[468px_minmax(0,1fr)]">
        <Heatmap
          rows={[...WEEKDAYS]}
          cols={[...HOUR_BLOCKS]}
          values={grid}
          bins={BINS[period]}
          cellLabel={cellLabel}
          ariaLabel={`Quote requests by weekday and two-hour block, last ${period} days`}
        />
        <dl className="grid content-start gap-x-6 gap-y-4 border-t border-line pt-5 sm:grid-cols-3 lg:grid-cols-1 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
          {facts.map((f) => (
            <div key={f.term} className="min-w-0">
              <dt className="text-[12px] text-ink-soft">{f.term}</dt>
              <dd className="mt-0.5 font-display text-[17px] leading-snug font-bold text-ink">
                {f.value}
              </dd>
              <dd className="text-[12.5px] leading-snug text-ink-soft">{f.detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </ChartFigure>
  );
}
