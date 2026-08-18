import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Pill } from '../../components/ui/Pill';
import type { PillTone } from '../../components/ui/Pill';
import { DEFAULT_REQUEST, PROCUREMENT_RULES, SIMULATION_NOTICE } from '../../data/procurement';
import { VESSELS } from '../../data/vessels';
import { gbp } from '../../lib/format';
import {
  composeEmail,
  invoiceLines,
  invoiceTotals,
  LINE_CONFIRMATION,
  simulateLabel,
  stageLabel,
  stageReached,
  stageStatus,
  TIMELINE_STAGES,
  timeOf,
} from '../../lib/procurement';
import type { Stage, StageStatus } from '../../lib/procurement';
import { useApp } from '../../store/app';
import { canSend, useProcurement } from '../../store/procurement';

/**
 * Procurement via Compass — a working example of the flow raised on 17 Aug
 * (point 4). The client builds a list; the platform emails it straight to
 * Compass, GAC's own procurement branch; Compass sources and supplies every
 * line from its own stock and supply network, and confirms the list back; the
 * client is invoiced via Compass, under GAC — one invoice, one relationship.
 * There is no mail server behind this proof of concept: the email is composed
 * and shown, the Compass side is advanced by "Simulate" buttons, and the
 * screen says so.
 */

const INPUT =
  'block min-h-[40px] w-full rounded-lg border-[1.5px] border-line-strong bg-white px-2.5 py-2 text-[13.5px] font-semibold text-ink';

/** Header pill for the request card, per stage. */
const STAGE_PILL: Record<Stage, { tone: PillTone; label: string }> = {
  draft: { tone: 'neutral', label: 'Draft · ready to send' },
  sent: { tone: 'info', label: 'With Compass' },
  sourcing: { tone: 'info', label: 'With Compass · sourcing' },
  // The header pill and the per-line pills read from the one exported string,
  // so the two can never drift apart.
  confirmed: { tone: 'info', label: LINE_CONFIRMATION },
  invoiced: { tone: 'verified', label: '✓ Invoiced via Compass' },
};

const MARKER: Record<StageStatus, string> = {
  done: 'bg-success text-white',
  current: 'bg-sea text-white',
  pending: 'border-[1.5px] border-line-strong bg-white text-transparent',
};

export default function Procurement() {
  const pushToast = useApp((s) => s.pushToast);
  const request = useProcurement((s) => s.request);
  const stage = useProcurement((s) => s.stage);
  const stageTimes = useProcurement((s) => s.stageTimes);
  const updateLine = useProcurement((s) => s.updateLine);
  const removeLine = useProcurement((s) => s.removeLine);
  const addLine = useProcurement((s) => s.addLine);
  const setVessel = useProcurement((s) => s.setVessel);
  const setDeliveryPoint = useProcurement((s) => s.setDeliveryPoint);
  const setNeededBy = useProcurement((s) => s.setNeededBy);
  const send = useProcurement((s) => s.send);
  const advance = useProcurement((s) => s.advance);
  const reset = useProcurement((s) => s.reset);

  const [newDesc, setNewDesc] = useState('');
  const [newQty, setNewQty] = useState('');
  const newDescRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLDivElement>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);
  /** Where focus should land after the next stage change (the control that caused it may unmount). */
  const focusNext = useRef<'email' | 'invoice' | null>(null);

  const vessel = VESSELS.find((v) => v.id === request.vesselId) ?? VESSELS[0]!;
  const draft = stage === 'draft';
  const email = composeEmail(request);
  const sentAt = stageTimes.sent;
  const lines = invoiceLines(request);
  const totals = invoiceTotals(lines);
  const nextLabel = simulateLabel(stage);
  const dirty = !draft || JSON.stringify(request) !== JSON.stringify(DEFAULT_REQUEST);
  const pill = STAGE_PILL[stage];
  const lineCount = request.lines.length;
  const lineWord = lineCount === 1 ? 'line' : 'lines';

  // Keyboard users land on what just appeared: the composed email after Send,
  // the invoice after the last simulate (whose button unmounts).
  useEffect(() => {
    const target = focusNext.current;
    if (!target) return;
    if (target === 'email' && stage === 'sent' && emailRef.current) {
      focusNext.current = null;
      emailRef.current.focus();
    } else if (target === 'invoice' && stage === 'invoiced' && invoiceRef.current) {
      focusNext.current = null;
      invoiceRef.current.focus();
    }
  }, [stage]);

  const sendable = canSend(request);

  function onSend() {
    if (!sendable) return;
    focusNext.current = 'email';
    send();
    pushToast(
      `${request.ref} sent to Compass — ${lineCount} ${lineWord}, ${vessel.name}, needed ${request.neededBy}. Compass sources and supplies every line; you see one invoice, from GAC.`,
    );
  }

  function onAdvance() {
    if (stage === 'confirmed') focusNext.current = 'invoice';
    advance();
  }

  function onReset() {
    reset();
    // The Reset button itself unmounts once the demo is clean.
    document.getElementById('procurement-request')?.focus();
  }

  function onAddLine(e: FormEvent) {
    e.preventDefault();
    if (!newDesc.trim()) return;
    addLine(newDesc, newQty);
    setNewDesc('');
    setNewQty('');
    newDescRef.current?.focus();
  }

  /**
   * Copy under each reached timeline stage. These say what has happened to
   * this request; the "How it works" cards say what Compass does in general,
   * so no sentence is repeated between the two.
   */
  function stageNote(s: Stage): string {
    switch (s) {
      case 'sent':
        return 'Your list went to Compass by email. Nothing else for you to do — Compass takes it from here.';
      case 'sourcing':
        return 'Your list is in hand at Compass now — nothing sits with you while it is being worked.';
      case 'confirmed':
        return `Compass has confirmed the list back — all ${lineCount} ${lineWord} covered, each marked confirmed on your request.`;
      case 'invoiced':
        return 'The invoice is raised: every line at Compass’s prices, on one document under GAC.';
      default:
        return '';
    }
  }

  return (
    <div className="screen-enter">
      <Eyebrow>Procurement · via Compass</Eyebrow>
      <h1 className="mt-1 font-display text-2xl font-bold">
        Send the list to Compass. One invoice comes back.
      </h1>
      <p className="mt-1 max-w-[760px] text-[14px] text-ink-soft">
        Your procurement list goes by email straight to Compass, GAC’s own procurement branch.
        Compass sources and supplies every line on it, from its own stock and its own supply
        network, and confirms the list back to you. You are then invoiced via Compass, under GAC —
        one invoice, one relationship.
      </p>
      <p
        className="mt-2 inline-flex max-w-[760px] flex-wrap items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] text-ink-soft"
        data-testid="procurement-illustrative"
      >
        <Pill tone="neutral">Illustrative</Pill>
        <span>{SIMULATION_NOTICE}</span>
      </p>

      {/* How it works */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="how-it-works">
        {PROCUREMENT_RULES.map((r) => (
          <Card key={r.step}>
            <span
              aria-hidden="true"
              className="grid h-7 w-7 place-items-center rounded-full bg-sea-soft font-display text-[13px] font-bold text-sea"
            >
              {r.step}
            </span>
            <p className="mt-2 text-[13.5px] font-bold">
              <span className="sr-only">Step {r.step}: </span>
              {r.title}
            </p>
            <p className="mt-1 text-[12.5px] text-ink-soft">{r.body}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[1.35fr_1fr]">
        {/* ── Left: the request, then the composed email ── */}
        <div className="space-y-5">
          <Card
            id="procurement-request"
            data-testid="procurement-request"
            data-stage={stage}
            tabIndex={-1}
            role="region"
            aria-labelledby="procurement-request-title"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold tracking-[0.02em] text-ink-soft">
                  {request.ref} · Procurement request
                </p>
                <h2
                  id="procurement-request-title"
                  className="mt-0.5 font-display text-[17px] font-bold"
                >
                  {vessel.name} · {vessel.port}
                </h2>
                <p className="mt-0.5 text-[13px] text-ink-soft">
                  {draft
                    ? 'Drafted from the vessel’s call — edit the lines, then send.'
                    : `Sent ${timeOf(sentAt ?? '')} · ${lineCount} ${lineWord} · locked while Compass works it`}
                </p>
              </div>
              <Pill tone={pill.tone}>{pill.label}</Pill>
            </div>

            {/* Vessel · delivery point · needed by */}
            {draft ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label className="text-[12.5px] font-semibold text-ink-soft">
                  Vessel
                  <select
                    value={request.vesselId}
                    onChange={(e) => setVessel(e.target.value)}
                    className={`mt-1 ${INPUT}`}
                    data-testid="request-vessel"
                  >
                    {VESSELS.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} · {v.port}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[12.5px] font-semibold text-ink-soft">
                  Delivery point
                  <input
                    type="text"
                    value={request.deliveryPoint}
                    onChange={(e) => setDeliveryPoint(e.target.value)}
                    className={`mt-1 ${INPUT}`}
                    data-testid="request-delivery"
                  />
                </label>
                <label className="text-[12.5px] font-semibold text-ink-soft">
                  Needed by
                  <input
                    type="text"
                    value={request.neededBy}
                    onChange={(e) => setNeededBy(e.target.value)}
                    className={`mt-1 ${INPUT}`}
                    data-testid="request-needed-by"
                  />
                </label>
              </div>
            ) : (
              <table className="mt-3 w-full border-collapse text-[13px]">
                <tbody>
                  {[
                    ['Vessel', `${vessel.name} · ${vessel.port}`],
                    ['Delivery point', request.deliveryPoint],
                    ['Needed by', request.neededBy],
                  ].map(([k, v]) => (
                    <tr key={k} className="border-b border-dashed border-line last:border-b-0">
                      <td className="py-1.5 pr-3 text-ink-soft">{k}</td>
                      <td className="py-1.5 text-right font-semibold">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Lines */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <Eyebrow>Lines · {lineCount}</Eyebrow>
              {draft ? (
                <span className="text-[12px] text-ink-soft">
                  Nothing is priced on your side — Compass prices the basket
                </span>
              ) : null}
            </div>

            {lineCount === 0 ? (
              <p
                className="mt-2 rounded-lg border border-dashed border-line-strong px-3 py-3 text-[13px] text-ink-soft"
                data-testid="lines-empty"
              >
                No lines yet. Add at least one line to send the request.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-dashed divide-line" data-testid="request-lines">
                {request.lines.map((l, i) => (
                  <li
                    key={l.id}
                    className="py-2"
                    data-testid="procurement-line"
                    data-line-id={l.id}
                  >
                    {draft ? (
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
                        <div>
                          <label htmlFor={`line-desc-${l.id}`} className="sr-only">
                            Line {i + 1} description
                          </label>
                          <input
                            id={`line-desc-${l.id}`}
                            type="text"
                            value={l.description}
                            onChange={(e) => updateLine(l.id, { description: e.target.value })}
                            className={INPUT}
                          />
                        </div>
                        <div className="col-start-1 sm:col-start-auto">
                          <label htmlFor={`line-qty-${l.id}`} className="sr-only">
                            Line {i + 1} quantity
                          </label>
                          <input
                            id={`line-qty-${l.id}`}
                            type="text"
                            value={l.qty}
                            onChange={(e) => updateLine(l.id, { qty: e.target.value })}
                            className={INPUT}
                            placeholder="Qty"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() => removeLine(l.id)}
                          aria-label={`Remove line: ${l.description || `line ${i + 1}`}`}
                          data-testid={`remove-line-${l.id}`}
                          className="col-start-2 row-start-1 !min-h-[40px] !px-3 sm:col-start-auto sm:row-start-auto"
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[13.5px]">
                        <span>
                          <strong>{l.description}</strong>
                          <span className="text-ink-soft"> · {l.qty}</span>
                        </span>
                        {stageReached(stage, 'confirmed') ? (
                          <Pill tone="verified">{LINE_CONFIRMATION}</Pill>
                        ) : (
                          <Pill tone="neutral">
                            {stage === 'sent' ? 'With Compass' : 'Being sourced'}
                          </Pill>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* Add a line */}
            {draft ? (
              <form
                onSubmit={onAddLine}
                className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 rounded-lg border border-line bg-paper p-3 sm:grid-cols-[minmax(0,1fr)_160px_auto]"
              >
                <label className="text-[12.5px] font-semibold text-ink-soft">
                  Add a line
                  <input
                    ref={newDescRef}
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="e.g. Chart corrections, folio 12"
                    className={`mt-1 ${INPUT}`}
                    data-testid="add-line-description"
                  />
                </label>
                <label className="col-start-1 text-[12.5px] font-semibold text-ink-soft sm:col-start-auto">
                  Quantity
                  <input
                    type="text"
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    placeholder="1"
                    className={`mt-1 ${INPUT}`}
                    data-testid="add-line-qty"
                  />
                </label>
                <Button
                  type="submit"
                  variant="ghost"
                  disabled={!newDesc.trim()}
                  className="col-start-2 row-start-1 !min-h-[40px] sm:col-start-auto sm:row-start-auto"
                  data-testid="add-line"
                >
                  Add line
                </Button>
              </form>
            ) : null}

            {/* Send */}
            {draft ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button onClick={onSend} disabled={!sendable} data-testid="send-to-compass">
                  Send to Compass
                </Button>
                <span className="text-[12.5px] text-ink-soft">
                  {sendable
                    ? 'The platform composes the email and shows it here — nothing to type'
                    : lineCount === 0
                      ? 'Add at least one line to send'
                      : 'Every line needs a description before it can go to Compass'}
                </span>
              </div>
            ) : null}
          </Card>

          {/* Email preview */}
          {!draft ? (
            <div
              ref={emailRef}
              tabIndex={-1}
              data-testid="compass-email"
              className="rounded-brand"
              aria-label="Email sent to Compass"
              role="region"
            >
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Eyebrow>Email · sent to Compass</Eyebrow>
                  <span className="text-[12px] text-ink-soft" data-testid="compass-email-sent">
                    sent {timeOf(sentAt ?? '')}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13px]">
                  <dt className="text-ink-soft">To</dt>
                  <dd>
                    <span className="font-semibold">{email.to}</span>{' '}
                    <span className="text-ink-soft">(illustrative address)</span>
                  </dd>
                  <dt className="text-ink-soft">From</dt>
                  <dd className="font-semibold">{email.from}</dd>
                  <dt className="text-ink-soft">Subject</dt>
                  <dd className="font-semibold" data-testid="compass-email-subject">
                    {email.subject}
                  </dd>
                </dl>
                <pre
                  className="mt-3 rounded-lg border border-line bg-paper px-3.5 py-3 font-sans text-[13px] leading-[1.55] whitespace-pre-wrap"
                  data-testid="compass-email-body"
                >
                  {email.body}
                </pre>
              </Card>
            </div>
          ) : null}
        </div>

        {/* ── Right: the Compass timeline, then the invoice ── */}
        <div className="space-y-5">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Eyebrow>Status · Compass</Eyebrow>
              <span className="text-[12px] text-ink-soft">
                {draft ? 'Not sent yet' : stageLabel(stage)}
              </span>
            </div>
            <ol className="mt-3" data-testid="compass-timeline" data-stage={stage}>
              {TIMELINE_STAGES.map((s, i) => {
                const status = draft ? 'pending' : stageStatus(stage, s);
                const at = stageTimes[s];
                const last = i === TIMELINE_STAGES.length - 1;
                return (
                  <li
                    key={s}
                    className="relative flex gap-3 pb-4 last:pb-0"
                    data-stage={s}
                    data-status={status}
                    aria-current={status === 'current' ? 'step' : undefined}
                  >
                    {!last ? (
                      <span
                        aria-hidden="true"
                        className="absolute top-6 bottom-0 left-[11px] w-px bg-line"
                      />
                    ) : null}
                    <span
                      aria-hidden="true"
                      className={`relative z-[1] mt-0.5 grid h-[23px] w-[23px] shrink-0 place-items-center rounded-full text-[12px] font-bold ${MARKER[status]}`}
                    >
                      {status === 'done' ? '✓' : status === 'current' ? '●' : '○'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-[13.5px] font-bold ${
                          status === 'pending' ? 'text-ink-soft' : ''
                        }`}
                      >
                        {stageLabel(s)}
                        {status === 'current' ? <span className="sr-only"> (current)</span> : null}
                        {at ? (
                          <span className="ml-2 text-[12px] font-semibold text-ink-soft">
                            {timeOf(at)}
                          </span>
                        ) : null}
                      </p>
                      {/* The per-line confirmation lives on the request card, against
                          the line the client wrote; the timeline carries the count so
                          the same words are not announced twice per line. */}
                      {status !== 'pending' ? (
                        <p className="mt-0.5 text-[12.5px] text-ink-soft">{stageNote(s)}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>

            {nextLabel ? (
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-dashed border-line pt-3">
                <Button variant="ghost" onClick={onAdvance} data-testid="simulate-next">
                  {nextLabel}
                </Button>
                <span className="text-[12px] text-ink-soft">
                  Illustrative — stands in for Compass’s side of the exchange
                </span>
              </div>
            ) : null}
          </Card>

          {/* The one invoice, from GAC */}
          {stage === 'invoiced' ? (
            <div
              ref={invoiceRef}
              tabIndex={-1}
              data-testid="compass-invoice"
              className="rounded-brand"
              role="region"
              aria-label="Invoice from GAC via Compass"
            >
              <Card className="border-[1.5px] border-success">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Eyebrow>Invoice · illustrative</Eyebrow>
                    <h2 className="mt-1 font-display text-[17px] font-bold">GAC — via Compass</h2>
                  </div>
                  <Pill tone="verified">One invoice</Pill>
                </div>
                <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13px]">
                  <dt className="text-ink-soft">From</dt>
                  <dd className="font-semibold">GAC — via Compass</dd>
                  <dt className="text-ink-soft">To</dt>
                  <dd className="font-semibold">
                    {vessel.operatorLine} · {vessel.name}
                  </dd>
                  <dt className="text-ink-soft">Reference</dt>
                  <dd className="font-semibold">{request.ref}</dd>
                </dl>
                <table className="mt-3 w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="text-left text-[11.5px] tracking-[0.02em] text-ink-soft uppercase">
                      <th scope="col" className="py-1.5 pr-3 font-semibold">
                        Line
                      </th>
                      <th scope="col" className="py-1.5 text-right font-semibold">
                        Price
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.id} className="border-t border-dashed border-line">
                        <td className="py-1.5 pr-3">
                          {l.description} <span className="text-ink-soft">· {l.qty}</span>
                        </td>
                        <td className="py-1.5 text-right font-semibold whitespace-nowrap">
                          {gbp(l.priceGBP)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-ink">
                      <td className="py-2 pr-3 font-bold">Total</td>
                      <td
                        className="py-2 text-right font-display text-[18px] font-bold"
                        data-testid="invoice-total"
                      >
                        {gbp(totals.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
                <p className="mt-2 text-[12px] text-ink-soft">
                  Prices are Compass’s, through its network. Every figure above is a demo figure.
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px]">
                  <li>Compass sourced and supplied every line. You see one invoice, from GAC.</li>
                  <li>
                    No separate supplier invoice to reconcile — the whole list sits on this one
                    document.
                  </li>
                </ul>
              </Card>
            </div>
          ) : null}
        </div>
      </div>

      {/* Compass strip */}
      <div className="mt-5 flex flex-wrap items-center gap-4 rounded-brand bg-ink px-4.5 py-3.5 text-[13.5px] text-[#D8E2EC]">
        <span className="rounded-md bg-white/12 px-2 py-0.5 text-[11.5px] font-bold">Compass</span>
        <span className="flex-1">
          One supplier relationship. One invoice. Compass sources and supplies the whole list, and
          GAC is accountable for the basket.
        </span>
        {dirty ? (
          <Button
            variant="dark-outline"
            onClick={onReset}
            className="!min-h-[36px] !py-1"
            data-testid="reset-procurement"
          >
            Reset demo
          </Button>
        ) : null}
      </div>
    </div>
  );
}
