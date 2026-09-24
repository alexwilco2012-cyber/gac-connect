import { Card } from '../../../../components/ui/Card';
import { CardHeader } from '../../../../components/ui/CardHeader';
import { Pill } from '../../../../components/ui/Pill';
import { VIZ } from '../../../../components/charts';
import { DEMO_SUPPLIER_ID, EXAMPLE_JOB_GBP } from '../../../../data/desk';
import { planById } from '../../../../data/plans';
import { supplierById } from '../../../../data/suppliers';
import { commissionDue, commissionPct, supplierKeeps } from '../../../../lib/commission';
import { gbp } from '../../../../lib/format';

/**
 * Your plan (spec §3 — copy unchanged, compacted): the plan, its commission
 * band, and the worked example on a £4,400 job. The split bar uses the
 * earnings chart's colours, so the example reads as one column of it.
 * The only card on the dashboard that names the band; the client view never
 * mounts it.
 */
export function PlanCard({ className = '' }: { className?: string }) {
  const supplier = supplierById(DEMO_SUPPLIER_ID)!;
  const plan = planById(supplier.plan);
  const band = commissionPct(supplier.plan);
  const keeps = supplierKeeps(EXAMPLE_JOB_GBP, supplier.plan);
  const due = commissionDue(EXAMPLE_JOB_GBP, supplier.plan);
  const keptShare = (keeps / EXAMPLE_JOB_GBP) * 100;

  return (
    <Card className={className} data-testid="supplier-plan">
      <CardHeader
        title="Your plan"
        subtitle={`${plan.name} · ${plan.priceLine} ${plan.perLine}`}
        action={<Pill tone="neutral">{band}% commission</Pill>}
      />
      <p className="mt-2.5 text-[13px] text-ink-soft">
        Commission applies only to third-party work won through the platform, and comes off when
        your invoice matches in GAC Agent. Nothing is collected separately, and nothing is charged
        to the client.
      </p>

      <div className="mt-3.5 rounded-lg border border-line bg-paper p-3.5">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <p className="text-[12.5px] text-ink-soft">
            A {gbp(EXAMPLE_JOB_GBP)} job won through the platform
          </p>
          <p className="text-right">
            <span
              className="font-display text-[22px] leading-none font-bold text-ink tabular-nums"
              data-testid="supplier-keeps"
            >
              {gbp(keeps)}
            </span>
          </p>
        </div>
        <div
          role="img"
          aria-label={`Of ${gbp(EXAMPLE_JOB_GBP)}, ${gbp(keeps)} is yours and ${gbp(due)} is the ${band}% band`}
          className="mt-2.5 flex h-2 gap-[2px] overflow-hidden rounded-full"
        >
          <span className="block h-full" style={{ width: `${keptShare}%`, background: VIZ.sea }} />
          <span className="block h-full flex-1" style={{ background: VIZ.deduction }} />
        </div>
        <p className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-[12px] text-ink-soft">
          <span>
            yours, after the {band}% {plan.name} band
          </span>
          <span className="ml-auto tabular-nums">{gbp(due)} band</span>
        </p>
      </div>

      <p className="mt-3 text-[12.5px] text-ink-soft">
        Commit more and you keep more of each job: the bands are 20 / 15 / 10 across Basic,
        Professional and Premium.
      </p>
    </Card>
  );
}
