import type { ReactNode } from 'react';
import { BenchmarkBar, ChartFigure } from '../../../components/charts';
import { Pill } from '../../../components/ui/Pill';
import { PERIOD_SUMMARY, type Period } from '../../../data/analytics';
import { benchmarkLines } from './model';

const pct = (n: number) => `${n}%`;
/** "2.1 hrs" for readings, "8 hrs" for the scale's ends. */
const hrs = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} hrs`;

/**
 * Against your category (spec §5 item 4) — market benchmarking, Premium only.
 * Win rate is a bullet (higher is better, so it fills); response time is a
 * dot strip (lower is better, so nothing fills and "Faster" sits at the
 * left). The category average is an ink tick, named in words, never a hue.
 */
export function BenchmarkFigure({ period }: { period: Period }) {
  const s = PERIOD_SUMMARY[period];
  const lines = benchmarkLines(period);
  return (
    <ChartFigure
      testId="analytics-benchmark"
      title="Against your category"
      subtitle={`Market benchmarking · last ${period} days`}
      action={<Pill tone="neutral">Premium</Pill>}
      takeaway={`Win rate ${lines.win}; responses ${lines.response}.`}
      footnote="Category average across verified Welding suppliers on the platform, anonymised."
      table={{
        caption: `Your figures against the category average, last ${period} days`,
        columns: ['Measure', 'You', 'Category average'],
        rows: [
          ['Win rate', pct(s.winRate), pct(s.categoryWinRate)],
          ['Average response time', hrs(s.responseHrs), hrs(s.categoryResponseHrs)],
        ],
      }}
    >
      <div className="grid gap-x-8 gap-y-6 pt-1 sm:grid-cols-2">
        <Measure title="Win rate" note="Higher is better" reading={lines.win}>
          <BenchmarkBar
            value={s.winRate}
            benchmark={s.categoryWinRate}
            max={50}
            format={pct}
            benchmarkLabel={`Category avg. ${pct(s.categoryWinRate)}`}
            ariaLabel={`Win rate ${pct(s.winRate)}, category average ${pct(s.categoryWinRate)}: ${lines.win}.`}
          />
        </Measure>
        <Measure title="Response time" note="Lower is better" reading={lines.response}>
          <BenchmarkBar
            value={s.responseHrs}
            benchmark={s.categoryResponseHrs}
            max={8}
            lowerIsBetter
            format={hrs}
            benchmarkLabel={`Category avg. ${hrs(s.categoryResponseHrs)}`}
            ariaLabel={`Average response ${hrs(s.responseHrs)}, category average ${hrs(s.categoryResponseHrs)}: ${lines.response}.`}
          />
        </Measure>
      </div>
    </ChartFigure>
  );
}

function Measure({
  title,
  note,
  reading,
  children,
}: {
  title: string;
  note: string;
  reading: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold text-ink">{title}</span>
        <span className="text-[11.5px] text-ink-soft">{note}</span>
      </p>
      {children}
      <p className="mt-2.5 text-[12.5px] font-semibold text-ink">{reading}</p>
    </div>
  );
}
