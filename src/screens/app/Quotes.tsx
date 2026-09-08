import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Modal } from '../../components/ui/Modal';
import { GoldBandPill, Pill } from '../../components/ui/Pill';
import { Rating } from '../../components/ui/Rating';
import { gbp } from '../../lib/format';
import { goldBandActive, isBookable } from '../../lib/svs';
import { ACCEPTANCE_TOAST, QUOTE_REQUEST, QUOTES, REQUEST_QUEUE } from '../../data/quotes';
import type { Quote } from '../../data/quotes';
import { OVERRUN_TERMS_SHORT, serviceTermsFor } from '../../data/serviceTerms';
import { supplierById } from '../../data/suppliers';
import { useApp } from '../../store/app';

/** What follows acceptance — e-sign, service confirmation, then invoice review (v12 §5). */
const NEXT_STEPS = [
  {
    title: 'Both parties e-sign the per-transaction agreement',
    body: 'Signed electronically on both sides and stored with a full audit trail.',
  },
  {
    title: 'Service confirmation',
    body: 'Either party marks the job complete; the other has a window to confirm or dispute.',
  },
  {
    title: 'Invoice review',
    body: 'The supplier invoice routes to you first: seven days to allocate the billing party and splits, then it matches to GAC Agent.',
  },
];

/**
 * Hire terms for this request's category (data/serviceTerms) — crane work is
 * priced for the booked window, so the clause travels with every quote and
 * into the agreement. Undefined for categories without one.
 */
const REQUEST_TERMS = serviceTermsFor(QUOTE_REQUEST.category);

/** The PO number GAC Agent raises on acceptance — illustrative, like the rest. */
const PO_NUMBER = '48211';

/**
 * Quote comparison (rebuilt to the 5 Sep design handoff): the slide-6 promise
 * made real — three replies side by side, one parsed out of Outlook, and an
 * acceptance that writes a PO into GAC Agent with the billing split already
 * applied. Accepting one card books it, drops the other two to "Not selected",
 * turns the GAC Agent band green and rewrites the queue; the e-sign modal and
 * the what-happens-next loop are unchanged.
 */
function QuoteCard({ quote, onAccept }: { quote: Quote; onAccept: (q: Quote) => void }) {
  const acceptedQuoteId = useApp((s) => s.acceptedQuoteId);
  const accepted = acceptedQuoteId === quote.id;
  const anotherAccepted = acceptedQuoteId !== null && !accepted;
  const supplier = supplierById(quote.supplierId);
  const goldBand = supplier ? goldBandActive(supplier.goldBand, supplier.certs) : false;
  // The SVS gate applies in the booking action itself (03 §3.3), here too.
  const bookable = supplier ? isBookable(supplier.certs) : true;

  const rows: [string, ReactNode][] = [
    ['Availability', quote.availability],
    ['Capacity', quote.capacity],
    ['Rating', <Rating rating={quote.rating} count={quote.ratingCount} size="sm" />],
    ['ESG score (planned)', quote.esg],
  ];

  const border = accepted
    ? 'border-2 border-success'
    : quote.best && acceptedQuoteId === null
      ? 'border-2 border-sea'
      : 'border border-line';

  return (
    <Card className={`flex flex-col ${border} ${anotherAccepted ? 'opacity-55' : ''}`}>
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <p className="font-display text-[17px] leading-tight font-bold">{quote.supplierName}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-soft">
            <span
              aria-hidden="true"
              className={`inline-block h-[7px] w-[7px] shrink-0 rounded-full ${
                quote.source === 'outlook' ? 'bg-gold' : 'bg-sea'
              }`}
            />
            {quote.source === 'outlook' ? 'Parsed from Outlook reply' : 'Replied via platform'} ·{' '}
            {quote.sourceTime}
          </p>
        </div>
        {quote.best && acceptedQuoteId === null ? (
          <span className="inline-flex items-center rounded-full bg-sea px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap text-white">
            Best match
          </span>
        ) : null}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <Pill tone="verified">✓ GAC Verified</Pill>
        {goldBand ? <GoldBandPill /> : null}
        {quote.source === 'outlook' ? <Pill tone="info">Parsed from Outlook</Pill> : null}
      </div>
      <p className="mt-4 font-display text-[36px] leading-none font-bold tracking-[-0.02em]">
        {gbp(quote.priceGBP)}
      </p>
      <p className="mt-1 text-[12px] text-ink-soft">
        for the booked window · {QUOTE_REQUEST.bookedWindow}
      </p>
      <table className="mt-3.5 w-full flex-1 border-collapse text-[13.5px]">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-dashed border-line last:border-b-0">
              <td className="py-[7px] text-ink-soft">{k}</td>
              <td className="py-[7px] text-right font-semibold">{v}</td>
            </tr>
          ))}
          {REQUEST_TERMS ? (
            <tr
              className="border-b border-dashed border-line last:border-b-0"
              data-testid="quote-terms"
            >
              <td className="py-[7px] align-top text-ink-soft">Terms</td>
              <td className="py-[7px] text-right text-[12px] font-semibold text-ink-soft">
                {OVERRUN_TERMS_SHORT}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <div className="mt-4">
        {accepted ? (
          <Button
            variant="primary"
            className="w-full !cursor-default !bg-success hover:!bg-success"
            disabled
          >
            Booked ✓ · PO {PO_NUMBER}
          </Button>
        ) : anotherAccepted ? (
          <Button
            variant="ghost"
            className="w-full !cursor-default !border-transparent !bg-[#F1F4F8] !text-[#8FA3B8]"
            disabled
            title="Another quote has been accepted for this job"
          >
            Not selected
          </Button>
        ) : (
          <Button
            variant={quote.best ? 'primary' : 'ghost'}
            className="w-full"
            disabled={!bookable}
            title={!bookable ? 'Blocked by SVS — compliance evidence required' : undefined}
            onClick={() => onAccept(quote)}
          >
            Accept quote
          </Button>
        )}
      </div>
    </Card>
  );
}

/** One cell of the window band above the cards. */
function WindowCell({
  label,
  children,
  gold,
}: {
  label: string;
  children: ReactNode;
  gold?: boolean;
}) {
  return (
    <div className={`px-4 py-3 ${gold ? 'bg-gold-soft' : 'bg-white'}`}>
      <p
        className={`text-[10.5px] font-extrabold tracking-[0.14em] uppercase ${
          gold ? 'text-gold-deep' : 'text-ink-soft'
        }`}
      >
        {label}
      </p>
      <p className="mt-[3px] text-[14px] font-bold">{children}</p>
    </div>
  );
}

export default function Quotes() {
  const pushToast = useApp((s) => s.pushToast);
  const acceptQuote = useApp((s) => s.acceptQuote);
  const resetQuote = useApp((s) => s.resetQuote);
  const acceptedQuoteId = useApp((s) => s.acceptedQuoteId);
  const [signing, setSigning] = useState<Quote | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);

  const acceptedQuote = QUOTES.find((q) => q.id === acceptedQuoteId) ?? null;

  function confirmBooking() {
    if (!signing) return;
    acceptQuote(signing.id);
    setSigning(null);
    pushToast(ACCEPTANCE_TOAST, 'GA');
  }

  return (
    <div className="screen-enter">
      <Eyebrow>Quote comparison</Eyebrow>
      <h1 className="mt-0.5 font-display text-[28px] font-bold tracking-[-0.015em]">
        Crane hire — MV Choice, Aberdeen
      </h1>
      <p className="mt-1 text-[14.5px] text-ink-soft">
        3 of 3 suppliers replied inside the deadline. One reply was parsed automatically from
        Outlook — no manual logging.
      </p>

      {/* The window band: sent, reply-by, needed, the booked window the
          prices cover, and the hire terms — so the presenter points instead
          of describing. */}
      <div
        className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-px overflow-hidden rounded-xl border border-line bg-line"
        data-testid="request-meta"
      >
        <WindowCell label="Sent">{QUOTE_REQUEST.sentAt}</WindowCell>
        <WindowCell label="Reply-by">
          {QUOTE_REQUEST.replyBy}{' '}
          <span className="font-medium text-ink-soft">
            · {QUOTE_REQUEST.replyWindowLabel}, set by the client
          </span>
        </WindowCell>
        <WindowCell label="Needed">{QUOTE_REQUEST.neededBy}</WindowCell>
        <WindowCell label="Booked window" gold>
          {QUOTE_REQUEST.bookedWindow}
        </WindowCell>
        <div className="bg-white px-4 py-3">
          <p className="text-[10.5px] font-extrabold tracking-[0.14em] text-ink-soft uppercase">
            Terms
          </p>
          <p className="mt-[3px] text-[12.5px] leading-[1.35] text-ink-soft">
            {OVERRUN_TERMS_SHORT}
          </p>
        </div>
      </div>
      {REQUEST_TERMS ? (
        <div className="mt-2 text-[12.5px] text-ink-soft" data-testid="request-terms">
          <p>
            Prices cover the booked window{' '}
            <strong className="text-ink">{QUOTE_REQUEST.bookedWindow}</strong> ·{' '}
            {OVERRUN_TERMS_SHORT} ·{' '}
            <button
              type="button"
              aria-expanded={termsOpen}
              aria-controls="request-terms-full"
              onClick={() => setTermsOpen((o) => !o)}
              className="cursor-pointer font-semibold text-sea underline-offset-2 hover:underline"
            >
              {termsOpen ? 'Hide full hire terms' : 'Full hire terms'}
            </button>
          </p>
          {termsOpen ? (
            <p id="request-terms-full" className="mt-1 max-w-[72ch]">
              {REQUEST_TERMS}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Quote cards */}
      <div className="mt-[18px] grid items-stretch gap-[18px] md:grid-cols-3">
        {QUOTES.map((q) => (
          <QuoteCard key={q.id} quote={q} onAccept={setSigning} />
        ))}
      </div>

      {/* GA band — ready before acceptance, the raised PO after it */}
      <div
        className={`mt-[18px] flex flex-wrap items-center gap-3.5 rounded-xl px-4.5 py-3.5 text-[13.5px] text-[#D8E2EC] transition-colors duration-300 ${
          acceptedQuote ? 'bg-[#0B3B2E]' : 'bg-ink'
        }`}
      >
        <span className="shrink-0 rounded-md bg-white/12 px-2 py-0.5 text-[11.5px] font-bold">
          GA
        </span>
        <span className="min-w-[240px] flex-1">
          {acceptedQuote ? (
            <>
              <strong className="text-white">
                Purchase order {PO_NUMBER} raised in GAC Agent.
              </strong>{' '}
              Against MV Choice, with the 60/40 Browne Energy / Grizzell Marine billing split applied
              from the vessel profile. The agreement went to the supplier with the booked window and
              terms. Nothing re-keyed.
            </>
          ) : (
            <>
              <strong className="text-white">GAC Agent is ready.</strong> On acceptance, a purchase
              order is generated automatically against MV Choice with the 60/40 Browne Energy /
              Grizzell Marine billing split applied from the vessel profile. No re-keying.
            </>
          )}
        </span>
        {acceptedQuoteId ? (
          <Button variant="dark-outline" onClick={resetQuote} className="!min-h-[36px] !py-1">
            Reset demo
          </Button>
        ) : null}
      </div>

      {/* Request queue for MV Choice — this job plus two other open requests */}
      <Card className="mt-[18px]" data-tour="queue">
        <Eyebrow>Request queue · MV Choice</Eyebrow>
        <ul className="mt-2.5 grid gap-3 md:grid-cols-3">
          {REQUEST_QUEUE.map((r) => {
            const booked = r.active && acceptedQuote !== null;
            return (
              <li
                key={r.id}
                className={`list-none rounded-[10px] px-3.5 py-3 ${
                  booked
                    ? 'border-[1.5px] border-success bg-success-soft'
                    : r.active
                      ? 'border-[1.5px] border-sea bg-sea-soft'
                      : 'border border-line'
                }`}
              >
                <p className="text-[13.5px] font-bold">{r.title}</p>
                <p className="mt-0.5 text-[12.5px] text-ink-soft">
                  {booked
                    ? `Booked · ${acceptedQuote.supplierName} · PO ${PO_NUMBER}`
                    : r.active
                      ? `${r.status} · reviewing now`
                      : r.status}
                </p>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* What happens next — the accountability loop behind acceptance */}
      <Card className="mt-[18px]" data-testid="what-happens-next">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Eyebrow>What happens next</Eyebrow>
          <ButtonLink to="/app/invoices" variant="ghost" className="!min-h-[36px] !py-1">
            See invoice review →
          </ButtonLink>
        </div>
        <ol className="mt-3 grid gap-3 md:grid-cols-3">
          {NEXT_STEPS.map((step, i) => {
            const current = acceptedQuoteId !== null && i === 2;
            return (
              <li
                key={step.title}
                aria-current={current ? 'step' : undefined}
                className={`list-none rounded-lg border p-3.5 ${
                  current ? 'border-dashed border-sea bg-sea-soft' : 'border-line'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className={`inline-grid h-7 w-7 shrink-0 place-items-center rounded-full font-display text-[12.5px] font-bold ${
                      current ? 'bg-sea text-white' : 'bg-sea-soft text-sea'
                    }`}
                  >
                    {i + 1}
                  </span>
                  {current ? <Pill tone="info">Up next</Pill> : null}
                </div>
                <p className="mt-2.5 text-[13.5px] font-bold">{step.title}</p>
                <p className="mt-1 text-[12.5px] text-ink-soft">{step.body}</p>
              </li>
            );
          })}
        </ol>
      </Card>

      {/* Per-transaction agreement modal */}
      <Modal open={signing !== null} onClose={() => setSigning(null)} labelledBy="sign-title">
        {signing ? (
          <>
            <Eyebrow>Per-transaction agreement</Eyebrow>
            <h2 id="sign-title" className="mt-1 font-display text-[19px] font-bold">
              Accept quote — {signing.supplierName}
            </h2>
            <p className="mt-2.5 text-[13.5px] text-ink-soft" data-testid="agreement-scope">
              Scope: 1 × mobile crane, {QUOTE_REQUEST.vessel}, {QUOTE_REQUEST.port}, booked window{' '}
              {QUOTE_REQUEST.bookedWindow}. Price:{' '}
              <strong className="text-ink">{gbp(signing.priceGBP)}</strong>.{' '}
              {REQUEST_TERMS ? `${REQUEST_TERMS} ` : null}
              Terms incorporated by reference from the platform Terms of Use. Both parties sign
              electronically; the agreement is stored with a full audit trail.
            </p>
            <p className="mt-5 border-b-2 border-ink px-1 pb-0.5 font-serif text-[22px] italic">
              A. Wilkinson
            </p>
            <p className="mt-1.5 text-[12px] text-ink-soft">
              Signed on behalf of client · supplier countersignature requested automatically
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setSigning(null)}>
                Cancel
              </Button>
              <Button variant="gold" onClick={confirmBooking}>
                Sign &amp; book
              </Button>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
}
