import { VIZ } from '../../../components/charts';
import { Card } from '../../../components/ui/Card';
import { Icon } from '../../../components/ui/Icon';
import { Sparkline } from '../../../components/ui/Sparkline';
import type { Period } from '../../../data/analytics';
import { kpisFor, unitText, type Kpi } from './model';

const TONE: Record<Kpi['tone'], string> = {
  success: 'bg-success-soft text-success',
  warn: 'bg-warn-soft text-warn',
};

/**
 * The four numbers a supplier checks first (spec §5 item 1). Each tile has
 * the same four rows so the row reads level at any width: label, value with
 * its change chip, one line of context, and a 36px visual — the sparkline
 * where there is a series (daily at 30 days, weekly sums at 90), and this
 * period against the one before for the two rates, which have none.
 *
 * Four across only from 1180px: below that, with the sidebar out, a quarter
 * of the row is too narrow for a caption or the response time's chip, so the
 * tiles sit two by two rather than cut their context short. The breakpoint is
 * in rem (73.75rem) because a px one sorts before `sm:` and never applies.
 */
export function KpiTiles({ period }: { period: Period }) {
  return (
    <section
      aria-label={`Key figures, last ${period} days`}
      data-testid="analytics-kpis"
      className="grid gap-4 sm:grid-cols-2 min-[73.75rem]:grid-cols-4"
    >
      {kpisFor(period).map((k) => (
        <Tile key={k.id} kpi={k} period={period} />
      ))}
    </section>
  );
}

function Tile({ kpi, period }: { kpi: Kpi; period: Period }) {
  return (
    <Card data-testid={`kpi-${kpi.id}`} className="flex min-w-0 flex-col">
      <div className="flex items-start justify-between gap-3">
        <p className="pt-0.5 text-[12.5px] font-semibold text-ink-soft">{kpi.label}</p>
        <span
          aria-hidden="true"
          className="-mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-sea-soft text-sea"
        >
          <Icon name={kpi.icon} size={15} />
        </span>
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          data-kpi-value=""
          className="font-display text-[26px] leading-tight font-bold whitespace-nowrap text-ink"
        >
          {kpi.value}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11.5px] leading-snug font-bold whitespace-nowrap tabular-nums ${TONE[kpi.tone]}`}
        >
          <span aria-hidden="true">{kpi.change}</span>
          <span className="sr-only">{kpi.changeText}</span>
        </span>
      </p>
      <p className="mt-0.5 truncate text-[12px] text-ink-soft">{kpi.caption}</p>
      <div className="mt-auto pt-3.5">
        {kpi.series ? (
          <Sparkline points={kpi.series} height={36} />
        ) : kpi.compare ? (
          <Compare {...kpi.compare} period={period} />
        ) : null}
      </div>
    </Card>
  );
}

/** Two thin bars from zero: this period (sea) over the one before (neutral). */
function Compare({
  now,
  before,
  unit,
  period,
}: {
  now: number;
  before: number;
  unit: 'pct' | 'hrs';
  period: Period;
}) {
  const max = Math.max(now, before) || 1;
  const rows = [
    { label: 'This period', value: now, color: VIZ.sea, strong: true },
    { label: 'Previous', value: before, color: VIZ.context, strong: false },
  ];
  return (
    <div
      role="img"
      aria-label={`Last ${period} days ${unitText(now, unit)}; previous ${period} days ${unitText(before, unit)}`}
      className="grid h-9 grid-cols-[auto_minmax(0,1fr)_auto] content-center items-center gap-x-2.5 gap-y-1.5 text-[11px] leading-none tabular-nums"
    >
      {rows.map((r) => (
        <div key={r.label} className="contents">
          <span className="text-ink-soft">{r.label}</span>
          <span className="block h-1.5 rounded-full" style={{ background: VIZ.track }}>
            <span
              className="block h-full rounded-full"
              style={{ width: `${(r.value / max) * 100}%`, background: r.color }}
            />
          </span>
          <span className={`text-right ${r.strong ? 'font-bold text-ink' : 'text-ink-soft'}`}>
            {unitText(r.value, unit)}
          </span>
        </div>
      ))}
    </div>
  );
}
