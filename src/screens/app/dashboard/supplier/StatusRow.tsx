import { GoldBandPill, Pill, StatusPill } from '../../../../components/ui/Pill';
import { DEMO_SUPPLIER_ID } from '../../../../data/desk';
import { planById } from '../../../../data/plans';
import { supplierById } from '../../../../data/suppliers';
import { deriveStatus, goldBandActive } from '../../../../lib/svs';

/**
 * The supplier's standing at a glance (spec §3 header): SVS status, plan,
 * promotion and the Gold Band audit. The audit reads neutral until the band
 * is held — gold is the marque's, and only once it is earned.
 */
export function StatusRow() {
  const supplier = supplierById(DEMO_SUPPLIER_ID)!;
  const status = deriveStatus(supplier.certs);
  const goldBand = goldBandActive(supplier.goldBand, supplier.certs);
  const plan = planById(supplier.plan);

  return (
    <ul role="list" aria-label="Listing standing" className="mt-3 flex list-none flex-wrap gap-2">
      <li>
        <StatusPill status={status} />
      </li>
      <li>
        <Pill tone="neutral">{plan.name} plan</Pill>
      </li>
      {supplier.promoted ? (
        <li>
          <Pill tone="promoted">▲ Promoted</Pill>
        </li>
      ) : null}
      {goldBand ? (
        <li>
          <GoldBandPill />
        </li>
      ) : supplier.goldBand === 'scheduled' ? (
        <li>
          <Pill tone="neutral">Gold Band audit booked</Pill>
        </li>
      ) : null}
    </ul>
  );
}
