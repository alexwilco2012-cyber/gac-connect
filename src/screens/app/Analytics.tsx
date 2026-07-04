import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Pill } from '../../components/ui/Pill';
import { StatCard } from '../../components/ui/StatCard';
import { ANALYTICS_EXAMPLE, SPARKLINE_30D } from '../../data/plans';

function Sparkline() {
  const data = [...SPARKLINE_30D];
  const max = Math.max(...data, 1);
  const w = 600;
  const h = 120;
  const step = w / (data.length - 1);
  const points = data.map(
    (v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 12) - 6).toFixed(1)}`,
  );

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="mt-3 w-full"
      role="img"
      aria-label="Quote requests per day over the last 30 days, ranging from zero to four"
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="var(--sea)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {data.map((v, i) => (
        <circle
          key={i}
          cx={i * step}
          cy={h - (v / max) * (h - 12) - 6}
          r="3"
          fill={v === max ? 'var(--gold)' : 'var(--sea)'}
        />
      ))}
    </svg>
  );
}

export default function Analytics() {
  return (
    <div className="screen-enter">
      <Eyebrow>Supplier analytics · example</Eyebrow>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold">Silver City Welding — performance</h1>
        <Pill tone="inhouse">Available on Professional and Premium</Pill>
      </div>
      <p className="mt-1 max-w-[680px] text-[14px] text-ink-soft">
        An example of the dashboard a subscribed supplier sees. Views, quote requests, win rate, and
        response time are fed from platform activity — illustrative here.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ANALYTICS_EXAMPLE.map((a) => (
          <StatCard key={a.label} label={a.label} value={a.value} barPct={a.barPct} />
        ))}
      </div>

      <Card className="mt-5">
        <Eyebrow>Quote requests · last 30 days</Eyebrow>
        <Sparkline />
        <p className="mt-2 text-[12.5px] text-ink-soft">
          The gold point marks the busiest day. Premium adds market benchmarking against the
          category average.
        </p>
      </Card>

      <Card className="mt-5">
        <Eyebrow>Where this lives</Eyebrow>
        <p className="mt-2 text-[14px] text-ink-soft">
          Suppliers reach this view from their profile once subscribed. Considering a plan? The
          ladder is on the{' '}
          <Link to="/for-suppliers" className="font-semibold text-sea">
            For suppliers page
          </Link>
          , and the promoted example on that page shows exactly how paid visibility is labelled.
        </p>
      </Card>
    </div>
  );
}
