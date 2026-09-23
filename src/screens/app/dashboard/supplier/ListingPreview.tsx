import { ButtonLink } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { CardHeader } from '../../../../components/ui/CardHeader';
import { Icon } from '../../../../components/ui/Icon';
import { GoldBandPill, Pill, StatusPill } from '../../../../components/ui/Pill';
import { Rating } from '../../../../components/ui/Rating';
import { DEMO_SUPPLIER_ID } from '../../../../data/desk';
import { supplierById } from '../../../../data/suppliers';
import { deriveStatus, goldBandActive } from '../../../../lib/svs';

/**
 * How your listing reads (spec §3 — kept, compact): the marketplace row as a
 * client sees it when Welding comes up. The name here is an h3 on purpose —
 * the page's one h1 is the supplier's name in the header.
 */
export function ListingPreview({ className = '' }: { className?: string }) {
  const supplier = supplierById(DEMO_SUPPLIER_ID)!;
  const status = deriveStatus(supplier.certs);
  const goldBand = goldBandActive(supplier.goldBand, supplier.certs);
  const initials = supplier.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('');

  return (
    <Card className={`flex flex-col ${className}`}>
      <CardHeader
        title="How your listing reads"
        subtitle="What a client sees when your category comes up"
      />
      <div className="mt-3.5 flex items-start gap-3.5 rounded-brand border border-line bg-paper p-4">
        <span
          aria-hidden="true"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-brand bg-promoted-soft font-display text-[15px] font-bold text-promoted"
        >
          {initials}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <h3 className="font-display text-[16px] font-bold text-ink">{supplier.name}</h3>
            <StatusPill status={status} />
            {supplier.promoted ? <Pill tone="promoted">▲ Promoted</Pill> : null}
            {goldBand ? <GoldBandPill /> : null}
          </div>
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-[13px] text-ink-soft">
            <Rating rating={supplier.rating} count={supplier.ratingCount} size="sm" />
            <span aria-hidden="true">·</span>
            <span>{supplier.category}</span>
          </p>
          <p className="mt-1 text-[13px] leading-snug text-ink-soft">{supplier.description}</p>
        </div>
      </div>
      {supplier.goldBand === 'scheduled' ? (
        <p className="mt-3 text-[12.5px] text-ink-soft">
          {supplier.goldBandDate}. The Gold Band is held from the audit, not from advertising — it
          appears here the day it is passed, and goes the day compliance lapses.
        </p>
      ) : null}
      <div className="mt-auto pt-4">
        <ButtonLink
          to={`/app/marketplace/${supplier.id}`}
          variant="ghost"
          className="max-sm:w-full"
        >
          <Icon name="store" size={16} />
          View profile
        </ButtonLink>
      </div>
    </Card>
  );
}
