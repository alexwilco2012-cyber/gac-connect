import { useId, useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Icon } from '../../../../components/ui/Icon';
import { Modal } from '../../../../components/ui/Modal';
import { Pill } from '../../../../components/ui/Pill';
import { LEAD_TIMES, VALIDITY, type InboxRequest } from '../../../../data/supplierDesk';
import { useApp } from '../../../../store/app';
import { useSupplierDesk } from '../../../../store/supplierDesk';
import { InViewport, ModalHeading, StillNeeded } from './form';
import { INPUT, LABEL } from './formStyles';

/**
 * Send a quote (spec §3 Quote modal): price in whole pounds, lead time,
 * validity and an optional note. The quote is stored against the request,
 * the row turns into "Quoted £… · awaiting client" and the pipeline counters
 * move. Nothing is sent anywhere — the toast says so.
 */

const NOTE_MAX = 280;
const TITLE_ID = 'supplier-quote-title';

/** Whole pounds above zero; "2,450" and "£2450" both read as 2450. */
function priceProblem(raw: string): string | null {
  const cleaned = raw.replace(/[£,\s]/g, '');
  if (!cleaned) return 'price';
  if (!/^\d+$/.test(cleaned) || Number(cleaned) <= 0) return 'a price in whole pounds, above £0';
  return null;
}

export function QuoteModal({
  request,
  onClose,
}: {
  request: InboxRequest | null;
  onClose: () => void;
}) {
  // The form mounts fresh for each request (Modal renders nothing while closed).
  // Portalled to <body>: see `InViewport` in ./form.
  return (
    <InViewport>
      <Modal open={request !== null} onClose={onClose} labelledBy={TITLE_ID}>
        {request ? <QuoteForm key={request.id} request={request} onClose={onClose} /> : null}
      </Modal>
    </InViewport>
  );
}

function QuoteForm({ request, onClose }: { request: InboxRequest; onClose: () => void }) {
  const sendQuote = useSupplierDesk((s) => s.sendQuote);
  const pushToast = useApp((s) => s.pushToast);
  const ids = useId();

  const [price, setPrice] = useState('');
  const [leadTime, setLeadTime] = useState(LEAD_TIMES[1] ?? '');
  const [validity, setValidity] = useState(VALIDITY[1] ?? '');
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);

  const problem = tried ? priceProblem(price) : null;

  function send() {
    setTried(true);
    if (priceProblem(price)) return;
    const amountGbp = Number(price.replace(/[£,\s]/g, ''));
    sendQuote(request.id, { amountGbp, leadTime, validity, note });
    pushToast(
      `Quote sent for ${request.service} — ${request.vessel}. It lands in the client’s comparison view beside every other reply (simulated).`,
    );
    onClose();
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <ModalHeading
        id={TITLE_ID}
        eyebrow={`Quote request · ${request.id.toUpperCase()}`}
        title={`Quote: ${request.service}`}
      >
        <p>
          {request.vessel} · {request.detail}
        </p>
        <p className="mt-2">
          <Pill tone={request.tone}>{request.replyBy}</Pill>
        </p>
      </ModalHeading>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor={`${ids}-price`} className={LABEL}>
            Price (£)
          </label>
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 mt-0.5 -translate-y-1/2 text-[13.5px] font-bold text-ink-soft"
            >
              £
            </span>
            <input
              id={`${ids}-price`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              aria-invalid={problem ? true : undefined}
              aria-describedby={`${ids}-price-help`}
              className={`${INPUT} pl-7 tabular-nums ${problem ? 'border-warn' : ''}`}
            />
          </div>
          <p id={`${ids}-price-help`} className="mt-1 text-[12px] text-ink-soft">
            Whole pounds — the figure the client sees in the comparison.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${ids}-lead`} className={LABEL}>
              Lead time
            </label>
            <select
              id={`${ids}-lead`}
              value={leadTime}
              onChange={(e) => setLeadTime(e.target.value)}
              className={INPUT}
            >
              {LEAD_TIMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${ids}-valid`} className={LABEL}>
              Valid for
            </label>
            <select
              id={`${ids}-valid`}
              value={validity}
              onChange={(e) => setValidity(e.target.value)}
              className={INPUT}
            >
              {VALIDITY.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={`${ids}-note`} className={LABEL}>
              Note to the client <span className="font-normal">(optional)</span>
            </label>
            <span id={`${ids}-note-count`} className="text-[11.5px] text-ink-soft tabular-nums">
              <span aria-hidden="true">
                {note.length} / {NOTE_MAX}
              </span>
              <span className="sr-only">
                {note.length} of {NOTE_MAX} characters used
              </span>
            </span>
          </div>
          <textarea
            id={`${ids}-note`}
            rows={3}
            maxLength={NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-describedby={`${ids}-note-count`}
            className={`${INPUT} min-h-[84px] resize-y leading-snug font-normal`}
          />
        </div>
      </div>

      <StillNeeded problems={problem ? [problem] : []} />

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">
          <Icon name="send" size={16} />
          Send quote
        </Button>
      </div>
    </form>
  );
}
