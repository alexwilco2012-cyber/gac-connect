import { ChartFigure, StackedColumns, VIZ } from '../../../../components/charts';
import { BRAND_NAME } from '../../../../config/brand';
import { DEMO_SUPPLIER_ID } from '../../../../data/desk';
import { planById } from '../../../../data/plans';
import { EARNINGS_MONTHS, EARNINGS_WON } from '../../../../data/supplierDesk';
import { supplierById } from '../../../../data/suppliers';
import { commissionPct, supplierKeeps } from '../../../../lib/commission';
import { compactGbp, gbp } from '../../../../lib/format';

/**
 * Earnings through the platform (spec §3, supplier view only): six months of
 * work won through the platform as stacked columns — what the supplier keeps
 * (sea) at the base, the plan's commission band (the deduction grey) on top —
 * so the band reads as a thin slice of each job, not a bill. The arithmetic
 * is `lib/commission`, the same rule the plan card and invoice matching use.
 */

const MONTH_NAMES: Record<string, string> = {
  Apr: 'April',
  May: 'May',
  Jun: 'June',
  Jul: 'July',
  Aug: 'August',
  Sep: 'September',
};

export function Earnings({ className = '' }: { className?: string }) {
  const supplier = supplierById(DEMO_SUPPLIER_ID)!;
  const plan = planById(supplier.plan);
  const pct = commissionPct(supplier.plan);
  const bandLabel = `${pct}% ${plan.name} band`;

  const months = [...EARNINGS_MONTHS];
  const won = [...EARNINGS_WON];
  const kept = won.map((w) => supplierKeeps(w, supplier.plan));
  const band = won.map((w, i) => w - kept[i]!);
  const wonTotal = won.reduce((a, b) => a + b, 0);
  const keptTotal = kept.reduce((a, b) => a + b, 0);
  const best = won.indexOf(Math.max(...won));
  const bestMonth = MONTH_NAMES[months[best] ?? ''] ?? months[best] ?? '';

  return (
    <ChartFigure
      className={className}
      title="Earnings through the platform"
      subtitle={`Work won through ${BRAND_NAME}, and what you keep after your band`}
      takeaway={`${gbp(keptTotal)} kept of ${gbp(wonTotal)} won from April to September 2026; ${bestMonth} was the strongest month at ${gbp(won[best] ?? 0)} won.`}
      headline={
        <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <span className="font-display text-[22px] leading-none font-bold text-ink tabular-nums">
            {gbp(keptTotal)} kept
          </span>
          <span className="text-[13px] text-ink-soft tabular-nums">
            of {gbp(wonTotal)} won since April
          </span>
        </p>
      }
      legend={[
        { label: 'You keep', color: VIZ.sea },
        { label: bandLabel, color: VIZ.deduction },
      ]}
      table={{
        caption: `Work won, the ${bandLabel} and what you keep, April to September 2026`,
        columns: ['Month', 'Won', 'Band', 'You keep'],
        rows: [
          ...months.map((m, i) => [m, gbp(won[i]!), gbp(band[i]!), gbp(kept[i]!)]),
          ['Total', gbp(wonTotal), gbp(wonTotal - keptTotal), gbp(keptTotal)],
        ],
      }}
      footnote="Illustrative figures. The band comes off when your invoice matches in GAC Agent; nothing is charged to the client."
    >
      <StackedColumns
        categories={months}
        series={[
          { id: 'keep', label: 'You keep', color: VIZ.sea, values: kept },
          { id: 'band', label: bandLabel, color: VIZ.deduction, values: band },
        ]}
        format={gbp}
        axisFormat={compactGbp}
        directLabelLast
        ariaLabel={`Work won each month, April to September, split into what you keep and the ${bandLabel}`}
      />
    </ChartFigure>
  );
}
