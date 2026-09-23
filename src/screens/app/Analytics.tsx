import { Link } from 'react-router-dom';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Icon } from '../../components/ui/Icon';
import { Pill } from '../../components/ui/Pill';
import { DEMO_SUPPLIER_ID } from '../../data/desk';
import { supplierById } from '../../data/suppliers';
import { BenchmarkFigure } from './analytics/BenchmarkFigure';
import { DemandFigure } from './analytics/DemandFigure';
import { SearchesFigure, SourcesFigure } from './analytics/DiscoveryFigures';
import { FunnelFigure } from './analytics/FunnelFigure';
import { KpiTiles } from './analytics/KpiTiles';
import { periodRange } from './analytics/model';
import { PeriodSwitch } from './analytics/PeriodSwitch';
import { RatingsFigure } from './analytics/RatingsFigure';
import { TrendFigure } from './analytics/TrendFigure';
import { usePeriod } from './analytics/usePeriod';

/**
 * Supplier analytics — the example dashboard a subscribed supplier sees
 * (01 B8; rebuilt for the live dashboards, 23 Sep, spec §5). Reached from
 * For Suppliers, the Premium profile and the supplier dashboard; not a nav
 * tab (DECISIONS 2026-08-19).
 *
 * One period switch (`?period=30|90`) drives every figure on the page, and
 * every chart is a figure with its numbers a click away. Everything reads
 * from `data/analytics`, the one seeded dataset the deck mirrors. Gold stays
 * reserved: no chart colour, highlight or plan pill wears it here.
 */
export default function Analytics() {
  const [period, setPeriod] = usePeriod();
  const supplier = supplierById(DEMO_SUPPLIER_ID)!;

  return (
    <div className="screen-enter" data-testid="analytics-screen">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="max-w-[600px] min-w-0">
          <Eyebrow>Supplier analytics · example</Eyebrow>
          <h1 className="mt-1 font-display text-2xl font-bold">{supplier.name} — performance</h1>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Pill tone="neutral">Premium plan</Pill>
            <Pill tone="info">Available on Professional and Premium</Pill>
          </div>
          <p className="mt-3 text-[14px] text-ink-soft">
            An example of the dashboard a subscribed supplier sees. Views, quote requests, win rate
            and response time are fed from platform activity — illustrative here.
          </p>
        </div>
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <PeriodSwitch period={period} onChange={setPeriod} />
          <p className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft tabular-nums">
            <Icon name="calendar" size={14} />
            {periodRange(period)} · against the {period} days before
          </p>
          <p className="sr-only" aria-live="polite">
            Showing the last {period} days.
          </p>
        </div>
      </header>

      {/* flex gap, not space-y: a figure's own m-0 would cancel the margin. */}
      <div className="mt-6 flex flex-col gap-5">
        <KpiTiles period={period} />
        <TrendFigure period={period} supplier={supplier.name} />
        <div className="grid gap-5 lg:grid-cols-2">
          <FunnelFigure period={period} />
          <BenchmarkFigure period={period} />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <SourcesFigure period={period} />
          <SearchesFigure period={period} />
        </div>
        <DemandFigure period={period} />
        <RatingsFigure rating={supplier.rating} ratingCount={supplier.ratingCount} />
      </div>

      <p className="mt-6 max-w-[760px] text-[12.5px] text-ink-soft">
        Figures are illustrative. Analytics are included with Professional and Premium; Premium adds
        market benchmarking.{' '}
        <Link to="/for-suppliers" className="font-semibold whitespace-nowrap text-sea">
          See plans →
        </Link>
      </p>
    </div>
  );
}
