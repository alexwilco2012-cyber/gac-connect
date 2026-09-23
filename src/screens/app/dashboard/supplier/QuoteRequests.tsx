import { useCallback, useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { CardHeader } from '../../../../components/ui/CardHeader';
import { Icon, type IconName } from '../../../../components/ui/Icon';
import { Pill } from '../../../../components/ui/Pill';
import {
  AWAITING_QUOTES,
  SUPPLIER_INBOX,
  WON_THIS_MONTH,
  type InboxRequest,
} from '../../../../data/supplierDesk';
import { gbp } from '../../../../lib/format';
import { useSupplierDesk } from '../../../../store/supplierDesk';
import { QuoteModal } from './QuoteModal';

/**
 * Quote requests (spec §3): the supplier's inbox with a three-step pipeline
 * above it — New (not yet quoted) · Quoted (with the client: the seeded three
 * plus anything sent here) · Won this month. "Send a quote" opens the quote
 * modal; a sent row keeps its place and shows the price, so nothing jumps.
 */

/** One pipeline step. On a phone the label and caption take their short form. */
function Counter({
  label,
  shortLabel = label,
  caption,
  shortCaption = caption,
  value,
  icon,
  testId,
}: {
  label: string;
  shortLabel?: string;
  caption: string;
  shortCaption?: string;
  value: number;
  icon: IconName;
  testId: string;
}) {
  return (
    <div className="min-w-0 px-3 py-3 sm:px-4">
      <dt className="flex items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap text-ink-soft">
        <Icon name={icon} size={14} className="shrink-0 text-sea max-[400px]:hidden" />
        <span className="sm:hidden">{shortLabel}</span>
        <span className="max-sm:hidden">{label}</span>
      </dt>
      <dd className="mt-1 font-display text-[22px] leading-none font-bold text-ink tabular-nums">
        <span data-testid={testId}>{value}</span>
      </dd>
      <dd className="mt-1 text-[11.5px] whitespace-nowrap text-ink-soft">
        <span className="sm:hidden">{shortCaption}</span>
        <span className="max-sm:hidden">{caption}</span>
      </dd>
    </div>
  );
}

export function QuoteRequests({ className = '' }: { className?: string }) {
  const quotes = useSupplierDesk((s) => s.quotes);
  const [open, setOpen] = useState<InboxRequest | null>(null);
  const close = useCallback(() => setOpen(null), []);

  const unanswered = SUPPLIER_INBOX.filter((r) => !quotes[r.id]).length;
  const sentHere = SUPPLIER_INBOX.length - unanswered;
  const quoted = AWAITING_QUOTES.length + sentHere;

  return (
    <Card className={className} data-testid="supplier-inbox">
      <CardHeader
        title="Quote requests"
        subtitle="Answer inside the window and the client compares you side by side"
      />

      <dl
        aria-label="Quote pipeline"
        className="mt-4 grid grid-cols-3 divide-x divide-line rounded-lg border border-line bg-paper"
      >
        <Counter
          label="New"
          caption="to answer"
          value={unanswered}
          icon="inbox"
          testId="pipeline-new"
        />
        <Counter
          label="Quoted"
          caption="with the client"
          shortCaption="with clients"
          value={quoted}
          icon="send"
          testId="pipeline-quoted"
        />
        <Counter
          label="Won this month"
          shortLabel="Won"
          caption="September"
          shortCaption="this month"
          value={WON_THIS_MONTH}
          icon="badge-check"
          testId="pipeline-won"
        />
      </dl>

      <ul role="list" className="mt-2 list-none">
        {SUPPLIER_INBOX.map((r) => {
          const sent = quotes[r.id];
          return (
            <li
              key={r.id}
              data-testid={`inbox-${r.id}`}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line py-4 last:border-b-0"
            >
              <div className="flex min-w-0 flex-1 basis-[260px] items-start gap-3">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                    sent ? 'bg-success-soft text-success' : 'bg-sea-soft text-sea'
                  }`}
                >
                  <Icon name={sent ? 'circle-check' : 'message-square-quote'} size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] leading-snug font-semibold text-ink">{r.service}</p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">
                    {r.vessel} · {r.detail}
                  </p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                    {sent ? (
                      <Pill tone="info">Quoted {gbp(sent.amountGbp)} · awaiting client</Pill>
                    ) : (
                      <Pill tone={r.tone}>
                        {r.tone === 'warn' ? <Icon name="clock" size={12} /> : null}
                        {r.replyBy}
                      </Pill>
                    )}
                    <span className="text-[11.5px] font-semibold tracking-[0.03em] text-ink-soft tabular-nums">
                      {r.id.toUpperCase()}
                      {sent ? ` · ${sent.leadTime} · valid ${sent.validity}` : null}
                    </span>
                  </p>
                </div>
              </div>
              {/* aria-disabled rather than disabled: the button keeps focus when
                  the modal hands it back, so a keyboard user stays on the row. */}
              <Button
                variant="ghost"
                aria-disabled={sent ? true : undefined}
                onClick={() => {
                  if (!sent) setOpen(r);
                }}
                className="min-w-[148px] max-sm:w-full aria-disabled:cursor-default aria-disabled:border-line aria-disabled:text-success aria-disabled:hover:border-line"
              >
                <Icon name={sent ? 'check' : 'send'} size={16} />
                {sent ? 'Quote sent' : 'Send a quote'}
                <span className="sr-only"> for {r.service}</span>
              </Button>
            </li>
          );
        })}
      </ul>

      <div className="mt-2 rounded-lg border border-line">
        <p className="border-b border-line px-3.5 py-2.5 text-[11px] font-extrabold tracking-[0.12em] text-ink-soft uppercase">
          Awaiting the client
        </p>
        <ul role="list" className="list-none divide-y divide-line">
          {AWAITING_QUOTES.map((q) => (
            <li key={q.id} className="flex items-start justify-between gap-4 px-3.5 py-2.5">
              <span className="min-w-0">
                <span className="block text-[13px] leading-snug font-semibold text-ink">
                  {q.service}
                </span>
                <span className="block text-[12px] leading-snug text-ink-soft">
                  {q.vessel} · <span className="tabular-nums">{q.id.toUpperCase()}</span>
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[13px] font-bold text-ink tabular-nums">
                  {gbp(q.amountGbp)}
                </span>
                <span className="block text-[12px] text-ink-soft">{q.sentLabel}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-3 text-[12.5px] text-ink-soft">
        Replies sent as ordinary Outlook emails are parsed into the same comparison — you do not
        have to work inside the platform to win work through it.
      </p>

      <QuoteModal request={open} onClose={close} />
    </Card>
  );
}
