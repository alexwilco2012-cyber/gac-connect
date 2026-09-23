import { ChartFigure, FunnelBars } from '../../../../components/charts';
import { ButtonLink } from '../../../../components/ui/Button';
import { Icon } from '../../../../components/ui/Icon';
import { PERIOD_SUMMARY } from '../../../../data/analytics';

/**
 * Where the work comes from (spec §3): a three-step funnel from the last 30
 * days — profile views, quote requests, jobs won — and the way into the full
 * analytics screen. Benchmarking is Premium only; the copy says so.
 */

const count = (n: number) => n.toLocaleString('en-GB');

function rate(from: number, to: number): string {
  const pct = from ? (to / from) * 100 : 0;
  return pct >= 20 ? `${Math.round(pct)}%` : `${pct.toFixed(1)}%`;
}

export function AnalyticsTeaser({ className = '' }: { className?: string }) {
  const s = PERIOD_SUMMARY[30];
  const steps = [
    { label: 'Profile views', value: s.views },
    { label: 'Quote requests', value: s.requests },
    { label: 'Jobs won', value: s.won },
  ];
  const shortRates = [rate(s.views, s.requests), rate(s.requests, s.won)];
  const rates = [
    `${shortRates[0]} of views asked for a quote`,
    `${shortRates[1]} of requests became a job`,
  ];

  return (
    <ChartFigure
      className={className}
      title="Where the work comes from"
      subtitle="Views, quote requests, win rate and response time"
      takeaway={`Last 30 days: ${count(s.views)} profile views became ${s.requests} quote requests and ${s.won} jobs won.`}
      table={{
        caption:
          'Profile views to jobs won, last 30 days, with each step as a share of the one before',
        columns: ['Step', 'Count', 'Rate'],
        rows: steps.map((st, i) => [st.label, count(st.value), i ? shortRates[i - 1]! : '—']),
      }}
    >
      <p className="-mt-1 mb-2 text-[12px] text-ink-soft">Last 30 days</p>
      <FunnelBars
        steps={steps}
        format={count}
        rateLabels={rates}
        ariaLabel="Profile views to quote requests to jobs won, last 30 days"
      />
      <p className="mt-3 text-[12.5px] text-ink-soft">
        Views, quote requests and win rate come with Professional; Premium adds market benchmarking.
      </p>
      <div className="mt-3">
        <ButtonLink to="/app/analytics" variant="ghost" className="max-sm:w-full">
          <Icon name="bar-chart-3" size={16} />
          Open analytics
        </ButtonLink>
      </div>
    </ChartFigure>
  );
}
