import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Pill } from '../../components/ui/Pill';
import { gbp, ratingLine } from '../../lib/format';
import { changeCarriesAdminFee, daysLeft, invoiceState, windowLabel } from '../../lib/invoices';
import type { InvoiceState } from '../../lib/invoices';
import { INVOICES, INVOICE_RULES } from '../../data/invoices';
import type { SupplierInvoice } from '../../data/invoices';
import { supplierById } from '../../data/suppliers';
import { useApp } from '../../store/app';

/**
 * Invoice review — the client's seven-day loop before anything matches in GA
 * (v12 §5). The client allocates the billing party and any split; left alone,
 * the invoice matches as it stands. The agent rates the supplier on job
 * close-out. This is the client's view: supplier-side mechanics (plan, band,
 * what is deducted at matching) are deliberately not shown here — they belong
 * to the supplier surfaces (17 Aug review).
 */

const STARS = [1, 2, 3, 4, 5] as const;

/** Countdown / outcome pill for one invoice. */
function StatePill({
  state,
  receivedDaysAgo,
  allocationLabel,
}: {
  state: InvoiceState;
  receivedDaysAgo: number;
  allocationLabel: string;
}) {
  if (state === 'matched') {
    return <Pill tone="verified">✓ Matched to GA · {allocationLabel}</Pill>;
  }
  if (state === 'auto-matched') {
    return <Pill tone="neutral">Matched to GA as it stood · window closed</Pill>;
  }
  const tight = daysLeft(receivedDaysAgo) <= 2;
  return <Pill tone={tight ? 'warn' : 'info'}>{windowLabel(receivedDaysAgo)}</Pill>;
}

function InvoiceCard({ invoice }: { invoice: SupplierInvoice }) {
  const pushToast = useApp((s) => s.pushToast);
  const decision = useApp((s) => s.invoiceDecisions[invoice.id]);
  const matchInvoice = useApp((s) => s.matchInvoice);
  const rated = useApp((s) => s.jobRatings[invoice.jobRef]);
  const rateJob = useApp((s) => s.rateJob);
  const [chosenId, setChosenId] = useState(invoice.defaultAllocationId);

  const state = invoiceState(invoice.receivedDaysAgo, decision);
  const supplier = supplierById(invoice.supplierId);
  const receivedLabel = `${invoice.receivedDaysAgo} ${
    invoice.receivedDaysAgo === 1 ? 'day' : 'days'
  } ago`;

  const appliedId = decision?.allocationId ?? invoice.defaultAllocationId;
  const appliedLabel =
    invoice.allocations.find((a) => a.id === appliedId)?.label ?? invoice.allocations[0]!.label;

  function confirm() {
    const label = invoice.allocations.find((a) => a.id === chosenId)?.label ?? appliedLabel;
    matchInvoice(invoice.id, chosenId);
    pushToast(
      `${invoice.id} matched to GA — ${label}. Billing party applied against ${invoice.poRef}; changes from here carry an administrative fee at published rates.`,
      'GA',
    );
  }

  function rate(stars: number) {
    rateJob(invoice.jobRef, stars);
    // Illustrative: the live rating would absorb this submission; the mock
    // data itself is never mutated.
    const line = supplier
      ? ratingLine(supplier.rating, supplier.ratingCount + 1)
      : ratingLine(stars, 1);
    pushToast(
      `Rating recorded — ${invoice.supplierName} now shows ${line}. Thirty seconds of agent time, fed straight into the live rating.`,
    );
  }

  return (
    <Card data-testid={`invoice-${invoice.id}`} data-state={state}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.02em] text-ink-soft">
            {invoice.id} · {invoice.poRef} · Job {invoice.jobRef}
          </p>
          <h2 className="mt-0.5 font-display text-[17px] font-bold">
            <Link
              to={`/app/marketplace/${invoice.supplierId}`}
              className="text-ink no-underline hover:text-sea hover:underline"
            >
              {invoice.supplierName}
            </Link>
          </h2>
          <p className="mt-0.5 text-[13.5px] text-ink-soft">
            {invoice.service} · {invoice.vessel}
          </p>
        </div>
        <div className="flex max-w-full flex-col items-start gap-1.5 sm:items-end">
          <p className="font-display text-[24px] font-bold">{gbp(invoice.amountGBP)}</p>
          {/* Long allocation labels may wrap on narrow screens. */}
          <div className="max-w-full [&>span]:whitespace-normal">
            <StatePill
              state={state}
              receivedDaysAgo={invoice.receivedDaysAgo}
              allocationLabel={appliedLabel}
            />
          </div>
        </div>
      </div>

      <table className="mt-3 w-full border-collapse text-[13px]">
        <tbody>
          {[
            ['Vessel', invoice.vessel],
            ['Job reference', `${invoice.jobRef} · ${invoice.poRef}`],
            ['Service confirmation', invoice.serviceConfirmed],
            ['Invoice received', receivedLabel],
          ].map(([k, v]) => (
            <tr key={k} className="border-b border-dashed border-line last:border-b-0">
              <td className="py-1.5 pr-3 text-ink-soft">{k}</td>
              <td className="py-1.5 text-right font-semibold">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {state === 'awaiting' ? (
        <fieldset className="mt-4 rounded-lg border border-line bg-paper p-3.5">
          <legend className="px-1 text-[12.5px] font-bold">Billing party</legend>
          <p className="text-[12.5px] text-ink-soft">
            Allocate this invoice before it matches. The split held on the GA vessel profile is
            pre-selected.
          </p>
          <div className="mt-2 space-y-1.5">
            {invoice.allocations.map((a) => (
              <label
                key={a.id}
                className="flex cursor-pointer flex-wrap items-center gap-2.5 text-[13.5px]"
              >
                <input
                  type="radio"
                  name={`allocation-${invoice.id}`}
                  value={a.id}
                  checked={chosenId === a.id}
                  onChange={() => setChosenId(a.id)}
                  className="h-4 w-4 accent-sea"
                />
                <span className="font-semibold">{a.label}</span>
                {a.fromVesselProfile ? <Pill tone="info">From GA vessel profile</Pill> : null}
              </label>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button onClick={confirm} data-testid={`match-${invoice.id}`}>
              Confirm &amp; match to GA
            </Button>
            <span className="text-[12.5px] text-ink-soft">
              Matches in GAC Agent against {invoice.poRef} under the billing party you choose
            </span>
          </div>
        </fieldset>
      ) : (
        <div className="mt-4 rounded-lg border border-line bg-paper px-3.5 py-3 text-[13px]">
          <p>
            <span className="text-ink-soft">Billing party:</span> <strong>{appliedLabel}</strong>
            {state === 'auto-matched' ? (
              <span className="text-ink-soft"> · applied as received</span>
            ) : null}
          </p>
          <p className="mt-1">
            <span className="text-ink-soft">Matched in GAC Agent against</span>{' '}
            <strong>{invoice.poRef}</strong>
          </p>
          {changeCarriesAdminFee(state) ? (
            <p className="mt-1.5 text-[12.5px] text-ink-soft">
              Changes after matching carry an administrative fee at published rates.
            </p>
          ) : null}
        </div>
      )}

      {/* Agent rating on job close-out */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-line pt-3">
        <p className="text-[13px]">
          <strong>Rate {invoice.supplierName} for this job</strong>
          {rated ? (
            <span className="ml-2 text-ink-soft" data-testid={`rated-${invoice.id}`}>
              You rated this job {rated} ★
            </span>
          ) : (
            <span className="ml-2 text-ink-soft">feeds the live rating in the marketplace</span>
          )}
        </p>
        <div
          className="flex items-center gap-0.5"
          role="group"
          aria-label={`Rate ${invoice.supplierName} for job ${invoice.jobRef}`}
        >
          {STARS.map((n) => {
            const filled = rated !== undefined && n <= rated;
            return (
              <button
                key={n}
                type="button"
                aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
                aria-pressed={filled}
                data-testid={`rate-${invoice.id}-${n}`}
                onClick={() => rate(n)}
                className={`grid h-9 w-9 cursor-pointer place-items-center rounded-md border-none bg-transparent text-[22px] leading-none transition-colors hover:bg-sea-soft ${
                  filled ? 'text-gold-deep' : 'text-line-strong hover:text-gold-deep'
                }`}
              >
                ★
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

export default function Invoices() {
  const invoiceDecisions = useApp((s) => s.invoiceDecisions);
  const jobRatings = useApp((s) => s.jobRatings);
  const resetInvoices = useApp((s) => s.resetInvoices);

  const awaiting = INVOICES.filter(
    (inv) => invoiceState(inv.receivedDaysAgo, invoiceDecisions[inv.id]) === 'awaiting',
  ).length;
  const dirty = Object.keys(invoiceDecisions).length > 0 || Object.keys(jobRatings).length > 0;

  return (
    <div className="screen-enter">
      <Eyebrow>Invoice review · job close-out</Eyebrow>
      <h1 className="mt-1 font-display text-2xl font-bold">
        Supplier invoices, reviewed by you first
      </h1>
      <p className="mt-1 max-w-[720px] text-[14px] text-ink-soft">
        Every supplier invoice routes to the client before it matches in GAC Agent. Seven days to
        allocate the billing party and any split; left alone, it matches as it stands.
      </p>

      {/* Rules strip */}
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {INVOICE_RULES.map((r) => (
          <Card key={r.title}>
            <p className="text-[13.5px] font-bold">{r.title}</p>
            <p className="mt-1 text-[12.5px] text-ink-soft">{r.body}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>Supplier invoices · {INVOICES.length}</Eyebrow>
        <p className="text-[12.5px] text-ink-soft" data-testid="invoices-awaiting">
          {awaiting === 0
            ? 'Nothing awaiting your review'
            : `${awaiting} awaiting your review · ${INVOICES.length - awaiting} matched`}
        </p>
      </div>

      <div className="mt-2 space-y-4" data-tour="invoices">
        {INVOICES.map((inv) => (
          <InvoiceCard key={inv.id} invoice={inv} />
        ))}
      </div>

      {/* GA strip */}
      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-brand bg-ink px-4.5 py-3.5 text-[13.5px] text-[#D8E2EC]">
        <span className="rounded-md bg-white/12 px-2 py-0.5 text-[11.5px] font-bold">GA</span>
        <span className="flex-1">
          The loop gives clients direct control of their own billing structure and removes a
          recurring source of agent admin — the billing party is applied once, in GAC Agent, and
          never re-keyed.
        </span>
        {dirty ? (
          <Button
            variant="dark-outline"
            onClick={resetInvoices}
            className="!min-h-[36px] !py-1"
            data-testid="reset-invoices"
          >
            Reset demo
          </Button>
        ) : null}
      </div>
    </div>
  );
}
