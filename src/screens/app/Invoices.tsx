import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Pill } from '../../components/ui/Pill';
import { gbp, ratingLine } from '../../lib/format';
import {
  changeCarriesAdminFee,
  daysLeft,
  defaultLineParties,
  invoiceState,
  isSplitDecision,
  movedOffCharterTerms,
  splitTotals,
  windowLabel,
} from '../../lib/invoices';
import type { InvoiceState, LineParties } from '../../lib/invoices';
import { INVOICES, INVOICE_RULES } from '../../data/invoices';
import type {
  AllocatedInvoice,
  HireParty,
  SplitInvoice,
  SupplierInvoice,
} from '../../data/invoices';
import { supplierById } from '../../data/suppliers';
import { useApp } from '../../store/app';

/**
 * Invoice review — the client's seven-day loop before anything matches in GA
 * (v12 §5). The client allocates the billing party and any split; left alone,
 * the invoice matches as it stands. The agent rates the supplier on job
 * close-out. This is the client's view: supplier-side mechanics (plan, band,
 * what is deducted at matching) are deliberately not shown here — they belong
 * to the supplier surfaces (17 Aug review).
 *
 * Two kinds of invoice share the screen. Most carry one billing party. A port
 * disbursement across a delivery or redelivery carries two: the vessel is on
 * the charterer's time until the off-hire moment and the owners' from it, so
 * the costs split line by line at that moment (`SplitCard`).
 */

const STARS = [1, 2, 3, 4, 5] as const;

/** Countdown / outcome pill for one invoice. */
function StatePill({
  state,
  receivedDaysAgo,
  matchedLabel,
}: {
  state: InvoiceState;
  receivedDaysAgo: number;
  matchedLabel: string;
}) {
  if (state === 'matched') {
    return <Pill tone="verified">✓ Matched to GA · {matchedLabel}</Pill>;
  }
  if (state === 'auto-matched') {
    return <Pill tone="neutral">Matched to GA as it stood · window closed</Pill>;
  }
  const tight = daysLeft(receivedDaysAgo) <= 2;
  return <Pill tone={tight ? 'warn' : 'info'}>{windowLabel(receivedDaysAgo)}</Pill>;
}

/** Header, reference table and rating — everything both kinds of card share. */
function InvoiceShell({
  invoice,
  state,
  matchedLabel,
  children,
}: {
  invoice: SupplierInvoice;
  state: InvoiceState;
  matchedLabel: string;
  children: ReactNode;
}) {
  const pushToast = useApp((s) => s.pushToast);
  const rated = useApp((s) => s.jobRatings[invoice.jobRef]);
  const rateJob = useApp((s) => s.rateJob);
  const supplier = invoice.kind === 'allocated' ? supplierById(invoice.supplierId) : undefined;

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
    <Card data-testid={`invoice-${invoice.id}`} data-state={state} className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.02em] text-ink-soft">
            {invoice.id} · {invoice.poRef} · Job {invoice.jobRef}
          </p>
          <h2 className="mt-0.5 font-display text-[17px] font-bold">
            {invoice.kind === 'allocated' ? (
              <Link
                to={`/app/marketplace/${invoice.supplierId}`}
                className="text-ink no-underline hover:text-sea hover:underline"
              >
                {invoice.supplierName}
              </Link>
            ) : (
              invoice.supplierName
            )}
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
              matchedLabel={matchedLabel}
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
            [
              'Invoice received',
              `${invoice.receivedDaysAgo} ${invoice.receivedDaysAgo === 1 ? 'day' : 'days'} ago`,
            ],
          ].map(([k, v]) => (
            <tr key={k} className="border-b border-dashed border-line last:border-b-0">
              <td className="py-1.5 pr-3 text-ink-soft">{k}</td>
              <td className="py-1.5 text-right font-semibold">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {children}

      {/* Agent rating on job close-out. You rate a supplier you booked through
          the platform; a port disbursement has nobody to rate. */}
      {invoice.kind === 'allocated' ? (
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
      ) : null}
    </Card>
  );
}

/** The settled read-out once an invoice has matched, by either route. */
function SettledNote({
  title,
  applied,
  state,
  poRef,
}: {
  title: string;
  applied: string;
  state: InvoiceState;
  poRef: string;
}) {
  return (
    <div className="mt-4 rounded-lg border border-line bg-paper px-3.5 py-3 text-[13px]">
      <p>
        <span className="text-ink-soft">{title}</span> <strong>{applied}</strong>
        {state === 'auto-matched' ? (
          <span className="text-ink-soft"> · applied as received</span>
        ) : null}
      </p>
      <p className="mt-1">
        <span className="text-ink-soft">Matched in GAC Agent against</span> <strong>{poRef}</strong>
      </p>
      {changeCarriesAdminFee(state) ? (
        <p className="mt-1.5 text-[12.5px] text-ink-soft">
          Changes after matching carry an administrative fee at published rates.
        </p>
      ) : null}
    </div>
  );
}

/** One supplier, one billing party. */
function AllocatedCard({ invoice }: { invoice: AllocatedInvoice }) {
  const pushToast = useApp((s) => s.pushToast);
  const decision = useApp((s) => s.invoiceDecisions[invoice.id]);
  const matchInvoice = useApp((s) => s.matchInvoice);
  const [chosenId, setChosenId] = useState(invoice.defaultAllocationId);

  const state = invoiceState(invoice.receivedDaysAgo, decision);
  const appliedId =
    decision && !isSplitDecision(decision) ? decision.allocationId : invoice.defaultAllocationId;
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

  return (
    <InvoiceShell invoice={invoice} state={state} matchedLabel={appliedLabel}>
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
        <SettledNote
          title="Billing party:"
          applied={appliedLabel}
          state={state}
          poRef={invoice.poRef}
        />
      )}
    </InvoiceShell>
  );
}

/**
 * A port disbursement across a delivery or redelivery. Two payers on one
 * document: the platform holds the hire boundary, so every cost arrives on the
 * side that owned the vessel when it fell, and the client moves any line the
 * parties have agreed differently before it matches.
 */
function SplitCard({ invoice }: { invoice: SplitInvoice }) {
  const pushToast = useApp((s) => s.pushToast);
  const decision = useApp((s) => s.invoiceDecisions[invoice.id]);
  const matchInvoiceSplit = useApp((s) => s.matchInvoiceSplit);
  const [working, setWorking] = useState<LineParties>(() => defaultLineParties(invoice.lines));

  const state = invoiceState(invoice.receivedDaysAgo, decision);
  const awaiting = state === 'awaiting';
  const settled = isSplitDecision(decision)
    ? decision.lineParties
    : defaultLineParties(invoice.lines);
  // While the window is open the card shows what you are building; once it has
  // matched, what was actually applied.
  const shown = awaiting ? working : settled;
  const totals = splitTotals(invoice.lines, shown);
  const summary = `${invoice.hire.chartererShort} ${gbp(totals.charterer)} · ${invoice.hire.ownerShort} ${gbp(totals.owner)}`;

  function confirm() {
    const applied = splitTotals(invoice.lines, working);
    matchInvoiceSplit(invoice.id, working);
    pushToast(
      `${invoice.id} matched to GA — ${invoice.hire.chartererShort} ${gbp(applied.charterer)}, ${invoice.hire.ownerShort} ${gbp(applied.owner)}, split by line against ${invoice.poRef}; changes from here carry an administrative fee at published rates.`,
      'GA',
    );
  }

  const parties: { party: HireParty; label: string }[] = [
    { party: 'charterer', label: invoice.hire.chartererShort },
    { party: 'owner', label: invoice.hire.ownerShort },
  ];

  return (
    <InvoiceShell invoice={invoice} state={state} matchedLabel="split by line">
      {/* The table stays on screen once matched, read only: what went where is
          what a client comes back to check on a disbursement. */}
      <div
        className="mt-4 min-w-0 rounded-lg border border-line bg-paper p-3.5"
        data-testid={`split-${invoice.id}`}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[12.5px] font-bold">Split at the off-hire</p>
          {/* The headline is a sentence, not a chip — let it wrap on a phone
              rather than setting the card's minimum width. */}
          <div className="max-w-full [&>span]:whitespace-normal">
            <Pill tone="info">{invoice.hire.headline}</Pill>
          </div>
        </div>
        <p className="mt-1.5 text-[12.5px] text-ink-soft">{invoice.hire.note}</p>

        <div className="mt-2.5 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b-[1.5px] border-line">
                <th className="py-1.5 pr-3 text-left text-[11.5px] font-extrabold tracking-[0.06em] text-ink-soft uppercase">
                  Cost
                </th>
                <th className="px-3 py-1.5 text-right text-[11.5px] font-extrabold tracking-[0.06em] text-ink-soft uppercase">
                  Amount
                </th>
                <th className="py-1.5 text-left text-[11.5px] font-extrabold tracking-[0.06em] text-ink-soft uppercase">
                  Billed to
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line) => (
                <tr key={line.id} className="border-b border-dashed border-line">
                  <td className="py-2 pr-3 align-top">
                    <span className="font-semibold">{line.description}</span>
                    <span className="mt-px block text-[12px] text-ink-soft">{line.when}</span>
                  </td>
                  <td className="px-3 py-2 text-right align-top font-semibold whitespace-nowrap">
                    {gbp(line.amountGBP)}
                  </td>
                  <td className="py-2 align-top">
                    {awaiting ? (
                      <div className="flex flex-wrap gap-2.5">
                        {parties.map((p) => (
                          <label
                            key={p.party}
                            className="inline-flex cursor-pointer items-center gap-1.5 text-[12.5px] whitespace-nowrap"
                          >
                            <input
                              type="radio"
                              name={`party-${invoice.id}-${line.id}`}
                              value={p.party}
                              checked={shown[line.id] === p.party}
                              onChange={() =>
                                setWorking((prev) => ({ ...prev, [line.id]: p.party }))
                              }
                              aria-label={`${line.description} — bill to ${p.label}`}
                              className="h-[15px] w-[15px] accent-sea"
                            />
                            <span className="font-semibold">{p.label}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[12.5px] font-semibold">
                        {shown[line.id] === 'owner'
                          ? invoice.hire.ownerShort
                          : invoice.hire.chartererShort}
                      </span>
                    )}
                    {movedOffCharterTerms(line, shown) ? (
                      <span
                        className="mt-1 block text-[11.5px] text-gold-deep"
                        data-testid={`moved-${invoice.id}-${line.id}`}
                      >
                        moved off the charter terms
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="pt-2.5 pr-3 pb-0.5 text-ink-soft">{invoice.hire.chartererLabel}</td>
                <td
                  className="px-3 pt-2.5 pb-0.5 text-right font-bold whitespace-nowrap"
                  data-testid={`split-charterer-${invoice.id}`}
                >
                  {gbp(totals.charterer)}
                </td>
                <td />
              </tr>
              <tr>
                <td className="pr-3 text-ink-soft">{invoice.hire.ownerLabel}</td>
                <td
                  className="px-3 text-right font-bold whitespace-nowrap"
                  data-testid={`split-owner-${invoice.id}`}
                >
                  {gbp(totals.owner)}
                </td>
                <td />
              </tr>
              <tr className="border-t-[1.5px] border-line">
                <td className="pt-2 pr-3 font-bold">Total</td>
                <td
                  className="px-3 pt-2 text-right font-extrabold whitespace-nowrap"
                  data-testid={`split-total-${invoice.id}`}
                >
                  {gbp(totals.total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {awaiting ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button onClick={confirm} data-testid={`match-${invoice.id}`}>
              Confirm &amp; match to GA
            </Button>
            <span className="text-[12.5px] text-ink-soft">
              Both parties are applied against {invoice.poRef} in GAC Agent, line by line — no
              second invoice, and nothing re-keyed
            </span>
          </div>
        ) : null}
      </div>

      {!awaiting ? (
        <SettledNote title="Split by line:" applied={summary} state={state} poRef={invoice.poRef} />
      ) : null}
    </InvoiceShell>
  );
}

function InvoiceCard({ invoice }: { invoice: SupplierInvoice }) {
  return invoice.kind === 'split' ? (
    <SplitCard invoice={invoice} />
  ) : (
    <AllocatedCard invoice={invoice} />
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
      <p className="mt-1.5 max-w-[720px] text-[13.5px] text-ink-soft">
        Where a call straddles a delivery or a redelivery, one disbursement carries costs for two
        parties. The platform holds the on-hire and off-hire moments from the charter, allocates
        each cost to the side that owned the vessel when it fell, and lets you move any line before
        it matches.
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
