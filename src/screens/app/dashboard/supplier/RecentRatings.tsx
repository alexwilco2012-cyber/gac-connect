import { Card } from '../../../../components/ui/Card';
import { CardHeader } from '../../../../components/ui/CardHeader';
import { Rating } from '../../../../components/ui/Rating';
import { DEMO_SUPPLIER_ID } from '../../../../data/desk';
import { RECENT_REVIEWS } from '../../../../data/supplierDesk';
import { supplierById } from '../../../../data/suppliers';

/**
 * Recent ratings (spec §3): the latest three of the 72, each with its stars
 * as text, who rated (a client company or a role — never a person), the job
 * and one line. The score in the header travels with its count.
 */
export function RecentRatings({ className = '' }: { className?: string }) {
  const supplier = supplierById(DEMO_SUPPLIER_ID)!;
  return (
    <Card className={className}>
      <CardHeader
        title="Recent ratings"
        subtitle="Given by clients and GAC agents when a job closes"
        action={<Rating rating={supplier.rating} count={supplier.ratingCount} size="sm" />}
      />
      <ul role="list" className="mt-2 list-none divide-y divide-line">
        {RECENT_REVIEWS.map((r) => (
          <li key={r.id} className="flex items-start gap-3 py-3.5 last:pb-0">
            <span className="mt-0.5 inline-flex h-7 min-w-[42px] shrink-0 items-center justify-center rounded-md border border-line bg-paper px-1.5 text-[12.5px] font-bold text-ink tabular-nums">
              <span className="sr-only">Rated </span>
              {r.stars} ★
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-snug font-semibold text-ink">{r.by}</p>
              {/* The dot is tied to the job, so no line ever starts with it. */}
              <p className="text-[12px] leading-snug text-ink-soft">
                {r.job}&nbsp;· <span className="whitespace-nowrap">{r.when}</span>
              </p>
              <p className="mt-1 text-[13px] leading-snug text-ink">“{r.text}”</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
