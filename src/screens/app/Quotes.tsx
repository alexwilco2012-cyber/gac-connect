import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Modal } from '../../components/ui/Modal';
import { Pill } from '../../components/ui/Pill';
import { gbp } from '../../lib/format';
import { ACCEPTANCE_TOAST, QUOTES, REQUEST_QUEUE } from '../../data/quotes';
import type { Quote } from '../../data/quotes';
import { useApp } from '../../store/app';

function QuoteCard({ quote, onAccept }: { quote: Quote; onAccept: (q: Quote) => void }) {
  const acceptedQuoteId = useApp((s) => s.acceptedQuoteId);
  const accepted = acceptedQuoteId === quote.id;
  const anotherAccepted = acceptedQuoteId !== null && !accepted;

  return (
    <Card className={quote.best ? 'border-[1.5px] border-success' : ''}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="font-display text-[15px]">{quote.supplierName}</strong>
        <Pill tone="verified">✓ GAC Verified</Pill>
      </div>
      <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-ink-soft">
        <span
          aria-hidden="true"
          className={`inline-block h-[7px] w-[7px] rounded-full ${
            quote.source === 'outlook' ? 'bg-[#0F6CBD]' : 'bg-sea'
          }`}
        />
        {quote.source === 'outlook' ? 'Parsed from Outlook reply' : 'Replied via platform'} ·{' '}
        {quote.sourceTime}
      </p>
      <p className="mt-2.5 font-display text-[24px] font-bold">
        {gbp(quote.priceGBP)}{' '}
        {quote.best ? (
          <span className="align-middle">
            <Pill tone="info">Best match</Pill>
          </span>
        ) : null}
      </p>
      <table className="mt-1.5 w-full border-collapse text-[13px]">
        <tbody>
          {[
            ['Availability', quote.availability],
            ['Capacity', quote.capacity],
            ['Rating', `${quote.rating.toFixed(1)} ★`],
            ['ESG score', quote.esg],
          ].map(([k, v]) => (
            <tr key={k} className="border-b border-dashed border-line last:border-b-0">
              <td className="py-1.5 text-ink-soft">{k}</td>
              <td className="py-1.5 text-right font-semibold">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3">
        {accepted ? (
          <Pill tone="verified">✓ Accepted — PO 48211 generated</Pill>
        ) : (
          <Button
            variant={quote.best ? 'primary' : 'ghost'}
            className="w-full"
            disabled={anotherAccepted}
            title={anotherAccepted ? 'Another quote has been accepted for this job' : undefined}
            onClick={() => onAccept(quote)}
          >
            Accept quote
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function Quotes() {
  const pushToast = useApp((s) => s.pushToast);
  const acceptQuote = useApp((s) => s.acceptQuote);
  const resetQuote = useApp((s) => s.resetQuote);
  const acceptedQuoteId = useApp((s) => s.acceptedQuoteId);
  const [signing, setSigning] = useState<Quote | null>(null);

  function confirmBooking() {
    if (!signing) return;
    acceptQuote(signing.id);
    setSigning(null);
    pushToast(ACCEPTANCE_TOAST, 'GA');
  }

  return (
    <div className="screen-enter">
      <Eyebrow>Quote comparison</Eyebrow>
      <h1 className="mt-1 font-display text-2xl font-bold">
        Crane hire — MV Caledonian Star, Aberdeen
      </h1>
      <p className="mt-1 text-[14px] text-ink-soft">
        3 of 3 suppliers have replied. One reply was parsed automatically from Outlook — no manual
        logging.
      </p>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[220px_1fr]">
        {/* Request queue sidebar */}
        <Card className="order-2 lg:order-1" data-tour="queue">
          <Eyebrow>Open requests</Eyebrow>
          <ul className="mt-2">
            {REQUEST_QUEUE.map((r) => (
              <li
                key={r.id}
                className={`border-b border-dashed border-line py-2.5 last:border-b-0 ${
                  r.active ? '' : 'opacity-70'
                }`}
              >
                <p className="text-[13.5px] font-bold">
                  {r.title}
                  {r.active ? (
                    <span className="ml-2 align-middle">
                      <Pill tone="info">This view</Pill>
                    </span>
                  ) : null}
                </p>
                <p className="text-[12px] text-ink-soft">{r.vessel}</p>
                <p className="text-[12px] text-ink-soft">{r.status}</p>
              </li>
            ))}
          </ul>
        </Card>

        {/* Quote cards */}
        <div className="order-1 lg:order-2">
          <div className="grid items-stretch gap-4 md:grid-cols-3">
            {QUOTES.map((q) => (
              <QuoteCard key={q.id} quote={q} onAccept={setSigning} />
            ))}
          </div>

          {/* GA strip */}
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-brand bg-ink px-4.5 py-3.5 text-[13.5px] text-[#D8E2EC]">
            <span className="rounded-md bg-white/12 px-2 py-0.5 text-[11.5px] font-bold">GA</span>
            <span className="flex-1">
              <strong className="text-white">GAC Agent is ready.</strong> On acceptance, a purchase
              order is generated automatically against MV Caledonian Star with the 60/40 Northmoor
              Energy / Solway Marine billing split applied from the vessel profile. No re-keying.
            </span>
            {acceptedQuoteId ? (
              <Button variant="dark-outline" onClick={resetQuote} className="!min-h-[36px] !py-1">
                Reset demo
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Per-transaction agreement modal */}
      <Modal open={signing !== null} onClose={() => setSigning(null)} labelledBy="sign-title">
        {signing ? (
          <>
            <Eyebrow>Per-transaction agreement</Eyebrow>
            <h2 id="sign-title" className="mt-1 font-display text-[19px] font-bold">
              Accept quote — {signing.supplierName}
            </h2>
            <p className="mt-2.5 text-[13.5px] text-ink-soft">
              Scope: 1 × mobile crane, MV Caledonian Star, Aberdeen, Fri 06:00–18:00. Price:{' '}
              <strong className="text-ink">{gbp(signing.priceGBP)}</strong>. Terms incorporated by
              reference from the platform Terms of Use. Both parties sign electronically; the
              agreement is stored with a full audit trail.
            </p>
            <p className="mt-5 border-b-2 border-ink px-1 pb-0.5 font-serif text-[22px] italic">
              A. Fraser
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
