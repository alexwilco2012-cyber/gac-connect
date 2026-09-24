import { ChartFigure, FunnelBars } from '../../../components/charts';
import { funnelRateLabels, PERIOD_SUMMARY, type Period } from '../../../data/analytics';
import { count } from '../../../lib/format';
import { sharePct } from './model';

/**
 * From search to signed job (spec §5 item 3): five bars on one linear scale,
 * light → dark on the ordinal ramp, with the step rate between rows. A small
 * last bar is the honest reading, so there is no log scale to flatter it.
 */
export function FunnelFigure({ period }: { period: Period }) {
  const s = PERIOD_SUMMARY[period];
  const rates = funnelRateLabels(s.funnel);
  const appearances = s.funnel[0]?.value ?? 0;
  return (
    <ChartFigure
      testId="analytics-funnel"
      title="From search to signed job"
      subtitle={`Last ${period} days · each step as a share of the one before`}
      takeaway={`${count(s.won)} jobs won from ${count(appearances)} search appearances in the last ${period} days; ${sharePct(s.quoted, s.requests)}% of quote requests were answered with a quote.`}
      table={{
        caption: `Funnel from search appearance to job won, last ${period} days`,
        columns: ['Step', 'Count', 'Rate from the step before'],
        rows: s.funnel.map((step, i) => [
          step.label,
          count(step.value),
          i === 0 ? '—' : (rates[i - 1] ?? ''),
        ]),
      }}
    >
      <FunnelBars
        steps={s.funnel}
        format={count}
        rateLabels={rates}
        ariaLabel={`Funnel from search appearances to jobs won, last ${period} days`}
      />
    </ChartFigure>
  );
}
