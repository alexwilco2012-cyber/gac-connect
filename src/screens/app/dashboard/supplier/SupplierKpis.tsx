import type { ReactNode } from 'react';
import { VIZ } from '../../../../components/charts';
import { Card } from '../../../../components/ui/Card';
import { Icon, type IconName } from '../../../../components/ui/Icon';
import { Sparkline } from '../../../../components/ui/Sparkline';
import { PERIOD_SUMMARY } from '../../../../data/analytics';
import { SUPPLIER_KPIS, type SupplierKpi } from '../../../../data/supplierDesk';

/**
 * The four KPI tiles (spec §3 row 1): each figure with its change against the
 * previous 30 days. Views and requests carry their 30-day sparkline; win rate
 * and response time, which have no daily series, carry the category average
 * instead (market benchmarking — Silver City is on Premium), so every tile
 * ends on a visual and the row reads level. The same figures as the
 * analytics screen's 30-day view.
 *
 * A local tile rather than `StatCard`: the label carries a small inline icon
 * (a 36px medallion squeezed the label and delta onto two lines at four
 * across), and the foot takes either visual.
 */

const ICONS: Record<SupplierKpi['id'], IconName> = {
  views: 'eye',
  requests: 'inbox',
  win: 'trending-up',
  response: 'timer',
};

const pct = (v: number, max: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;

/** A small bullet: sea fill (or a sea dot, when lower is better) and an ink tick for the category. */
function MiniBenchmark({
  value,
  benchmark,
  max,
  lowerIsBetter = false,
  caption,
  label,
}: {
  value: number;
  benchmark: number;
  max: number;
  lowerIsBetter?: boolean;
  caption: ReactNode;
  label: string;
}) {
  return (
    <div role="img" aria-label={label}>
      <div className="relative h-3.5">
        <span
          className="absolute inset-x-0 top-[4px] block h-1.5 rounded-full"
          style={{ background: VIZ.track }}
        />
        {lowerIsBetter ? (
          <span
            className="absolute top-[1px] block h-3 w-3 -translate-x-1/2 rounded-full"
            style={{
              left: pct(value, max),
              background: VIZ.sea,
              boxShadow: `0 0 0 2px ${VIZ.surface}`,
            }}
          />
        ) : (
          <span
            className="absolute top-[4px] left-0 block h-1.5 rounded-full"
            style={{ width: pct(value, max), background: VIZ.sea }}
          />
        )}
        <span
          className="absolute top-0 block h-3.5 w-[2px] -translate-x-1/2 rounded-full"
          style={{
            left: pct(benchmark, max),
            background: VIZ.ref,
            boxShadow: `0 0 0 2px ${VIZ.surface}`,
          }}
        />
      </div>
      <p className="mt-1.5 flex justify-between gap-2 text-[11.5px] leading-none text-ink-soft">
        {caption}
      </p>
    </div>
  );
}

function KpiTile({ kpi, foot }: { kpi: SupplierKpi; foot: ReactNode }) {
  return (
    <Card className="flex min-w-0 flex-col">
      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-soft">
        <Icon name={ICONS[kpi.id]} size={14} className="shrink-0 text-sea" />
        <span className="min-w-0">{kpi.label}</span>
      </p>
      <p className="mt-2 font-display text-[26px] leading-none font-bold text-ink tabular-nums">
        {kpi.value}
      </p>
      <p className="mt-2.5">
        <span className="inline-block max-w-full rounded-[10px] bg-success-soft px-2 py-0.5 text-[11.5px] leading-snug font-bold text-success">
          {kpi.delta}
        </span>
      </p>
      <div className="mt-auto pt-4">{foot}</div>
    </Card>
  );
}

export function SupplierKpis() {
  const s = PERIOD_SUMMARY[30];

  function footFor(k: SupplierKpi): ReactNode {
    if (k.series && k.series.length > 1) return <Sparkline points={k.series} height={36} />;
    if (k.id === 'win') {
      return (
        <MiniBenchmark
          value={s.winRate}
          benchmark={s.categoryWinRate}
          max={100}
          label={`Win rate ${s.winRate}%, against a category average of ${s.categoryWinRate}%`}
          caption={
            <>
              <span>Category average</span>
              <span className="font-semibold text-ink tabular-nums">{s.categoryWinRate}%</span>
            </>
          }
        />
      );
    }
    return (
      <MiniBenchmark
        value={s.responseHrs}
        benchmark={s.categoryResponseHrs}
        max={8}
        lowerIsBetter
        label={`Average response ${s.responseHrs} hours, against a category average of ${s.categoryResponseHrs} hours`}
        caption={
          <>
            <span>Category average</span>
            <span className="font-semibold text-ink tabular-nums">{s.categoryResponseHrs} hrs</span>
          </>
        }
      />
    );
  }

  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {SUPPLIER_KPIS.map((k) => (
        <KpiTile key={k.id} kpi={k} foot={footFor(k)} />
      ))}
    </div>
  );
}
