import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LineSectionStrip } from '../../components/LineSections';
import { RequestQuoteModal } from '../../components/RequestQuoteModal';
import type { RequestTarget } from '../../components/RequestQuoteModal';
import { ServiceLineHub } from '../../components/ServiceLineHub';
import type { LiveStat } from '../../components/ServiceLineHub';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Pill } from '../../components/ui/Pill';
import { StageTrack } from '../../components/ui/StageTrack';
import { Toggle } from '../../components/ui/Toggle';
import { CLIENT_EORI, EORI_CONFIRM_LABEL, EORI_NOTE } from '../../data/customs';
import {
  CONSIGNMENT_NOTICE,
  CUSTOMS_POINTER,
  DELIVERY_POINTS,
  DEMO_CONSIGNMENT,
  EMPTY_CONSIGNMENT,
  FLT_DELAY_LABEL,
  FLT_SERVICE,
  FLT_SUGGESTION_TITLE,
  LOGISTICS_INTRO,
  ORIGIN_EXAMPLES,
  PROJECT_CARGO,
  WAREHOUSING,
} from '../../data/logistics';
import { AGENT_ENGAGED, serviceLine } from '../../data/serviceLines';
import type { LineService } from '../../data/serviceLines';
import { VESSELS } from '../../data/vessels';
import {
  CONSIGNMENT_MODES,
  CONSIGNMENT_STAGES,
  consignmentAction,
  consignmentStageTone,
  FLT_RULE,
  fltMovedText,
  fltRequestButton,
  fltRequestedText,
  fltSuggestion,
  fltSuggestionText,
  isConsignmentDelivered,
  validateConsignment,
} from '../../lib/logistics';
import type { Consignment, ConsignmentForm, ConsignmentMode } from '../../lib/logistics';
import { useLineSection } from '../../lib/useLineSection';
import { useApp } from '../../store/app';
import { useLogistics } from '../../store/logistics';

/**
 * Logistics — freight to the quay. The line's working screen is the
 * consignment: book a movement against a port call and follow it from
 * collection to the berth, with a customs cross-link the moment the cargo
 * comes from outside the UK (the 4% line and the 7% line meeting on one job).
 *
 * Every stage is advanced by a labelled "simulate" button — there is no
 * carrier feed behind this proof of concept, and the screen says so.
 */

const INPUT =
  'mt-1 block min-h-[40px] w-full rounded-lg border-[1.5px] border-line-strong bg-white px-2.5 py-2 text-[13.5px] font-semibold text-ink';
const LABEL = 'text-[12.5px] font-semibold text-ink-soft';

function vesselName(id: string): string {
  return VESSELS.find((v) => v.id === id)?.name ?? '—';
}

/* ----------------------------------------------------------- Booking form */

function BookingForm() {
  const book = useLogistics((s) => s.book);
  const pushToast = useApp((s) => s.pushToast);
  const [form, setForm] = useState<ConsignmentForm>(EMPTY_CONSIGNMENT);
  const [problems, setProblems] = useState<string[]>([]);

  const set = <K extends keyof ConsignmentForm>(key: K, value: ConsignmentForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function submit() {
    const found = validateConsignment(form);
    setProblems(found);
    if (found.length > 0) return;
    const id = book(form);
    setForm(EMPTY_CONSIGNMENT);
    pushToast(
      `${id} booked — ${vesselName(form.vesselId)}, ${form.deliveryPoint}. Illustrative: no carrier is contacted.`,
    );
  }

  return (
    <Card data-testid="consignment-form">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Eyebrow>Book a movement</Eyebrow>
          <h3 className="mt-1 font-display text-[17px] font-bold">
            Booked against the call, not against a date
          </h3>
        </div>
        <Pill tone="neutral">Illustrative</Pill>
      </div>
      <p className="mt-1.5 max-w-[720px] text-[13px] text-ink-soft">{CONSIGNMENT_NOTICE}</p>

      <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
        <label className={`${LABEL} sm:col-span-2`}>
          What is moving
          <input
            className={INPUT}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Deck spares and hose reels, 4 pallets"
          />
        </label>
        <label className={LABEL}>
          Collection from
          <input
            className={INPUT}
            list="consignment-origins"
            value={form.origin}
            onChange={(e) => set('origin', e.target.value)}
            placeholder="Grangemouth"
          />
          <datalist id="consignment-origins">
            {ORIGIN_EXAMPLES.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </label>
        <label className={LABEL}>
          Delivery point
          <select
            className={INPUT}
            value={form.deliveryPoint}
            onChange={(e) => set('deliveryPoint', e.target.value)}
          >
            {DELIVERY_POINTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          Vessel
          <select
            className={INPUT}
            value={form.vesselId}
            onChange={(e) => set('vesselId', e.target.value)}
          >
            {VESSELS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {v.port}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          Mode
          <select
            className={INPUT}
            value={form.mode}
            onChange={(e) => set('mode', e.target.value as ConsignmentMode)}
          >
            {CONSIGNMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          Ready for collection
          <input
            className={INPUT}
            value={form.readyDate}
            onChange={(e) => set('readyDate', e.target.value)}
            placeholder="26 Aug 2026"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={LABEL}>
            Pieces
            <input
              className={INPUT}
              inputMode="numeric"
              value={form.pieces}
              onChange={(e) => set('pieces', e.target.value)}
              placeholder="4"
            />
          </label>
          <label className={LABEL}>
            Gross weight (kg)
            <input
              className={INPUT}
              inputMode="numeric"
              value={form.weightKg}
              onChange={(e) => set('weightKg', e.target.value)}
              placeholder="1250"
            />
          </label>
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-3 rounded-lg border border-line bg-paper p-3">
        <span className="text-[13px] font-semibold">Moving from outside the UK?</span>
        <Toggle
          pressed={form.fromOutsideUk}
          onToggle={() => set('fromOutsideUk', !form.fromOutsideUk)}
          label="Moving from outside the UK"
        />
      </div>
      {form.fromOutsideUk ? (
        <p className="mt-2 text-[12.5px] text-ink-soft" data-testid="customs-pointer">
          {CUSTOMS_POINTER}{' '}
          <Link to="/app/customs" className="font-semibold text-sea">
            Open Customs →
          </Link>
        </p>
      ) : null}

      {problems.length > 0 ? (
        <p
          className="mt-3 rounded-lg border border-warn bg-warn-soft px-3 py-2 text-[12.5px] text-warn"
          role="alert"
          data-testid="consignment-problems"
        >
          Still needed: {problems.join(' · ')}
        </p>
      ) : null}

      <div className="mt-3.5 flex flex-wrap gap-2.5">
        <Button onClick={submit} data-testid="consignment-book">
          Book the movement
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setForm(DEMO_CONSIGNMENT);
            setProblems([]);
          }}
        >
          Fill with an example
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------ Consignments */

/**
 * The forklift suggestion: freight going to a quay with a piece too heavy to
 * land by hand. Needed-by is the freight ETA read live, so when the ETA moves
 * the suggestion moves with it, and a forklift already requested says so.
 */
function FltSuggestion({
  consignment,
  onRequest,
}: {
  consignment: Consignment;
  onRequest: (t: RequestTarget) => void;
}) {
  const requestFlt = useLogistics((s) => s.requestFlt);
  const delayEta = useLogistics((s) => s.delayEta);
  const flt = fltSuggestion(consignment);
  if (!flt) return null;
  const { form } = consignment;
  const delivered = isConsignmentDelivered(consignment.stage);

  return (
    <div
      className="mt-3 rounded-lg border border-sea bg-sea-soft p-3"
      data-testid="flt-suggestion"
      data-requested={flt.requested ? 'true' : 'false'}
    >
      <p className="text-[13px] font-bold text-ink">{FLT_SUGGESTION_TITLE}</p>
      {flt.requested ? (
        <p className="mt-1 text-[12.5px] text-ink" data-testid="flt-requested">
          {fltRequestedText(consignment.fltRequestedFor ?? flt.neededBy, form.deliveryPoint)}
          {flt.moved ? ` ${fltMovedText(flt.neededBy)}` : ''}
        </p>
      ) : (
        <p className="mt-1 text-[12.5px] text-ink" data-testid="flt-text">
          {fltSuggestionText(flt.perPieceKg, form.deliveryPoint, flt.neededBy)}
        </p>
      )}
      <p className="mt-1 text-[11.5px] text-ink-soft" data-testid="flt-rule">
        {FLT_RULE}
      </p>
      {delivered ? null : (
        <div className="mt-2.5 flex flex-wrap gap-2.5">
          {flt.requested ? null : (
            <Button
              onClick={() =>
                onRequest({
                  category: 'FLT',
                  service: `${FLT_SERVICE}, ${consignment.id}`,
                  vesselId: form.vesselId,
                  neededBy: flt.neededBy,
                  onSent: (neededBy) => requestFlt(consignment.id, neededBy),
                })
              }
              data-testid="flt-request"
            >
              {fltRequestButton(flt.neededBy)}
            </Button>
          )}
          <Button variant="ghost" onClick={() => delayEta(consignment.id)} data-testid="flt-delay">
            {FLT_DELAY_LABEL}
          </Button>
        </div>
      )}
    </div>
  );
}

function ConsignmentCard({
  consignment,
  onRequest,
}: {
  consignment: Consignment;
  onRequest: (t: RequestTarget) => void;
}) {
  const advance = useLogistics((s) => s.advance);
  const setEoriConfirmed = useLogistics((s) => s.setEoriConfirmed);
  const pushToast = useApp((s) => s.pushToast);
  const { form } = consignment;
  const action = consignmentAction(consignment.stage);
  const delivered = isConsignmentDelivered(consignment.stage);
  const eoriId = `eori-${consignment.id}`;

  return (
    <Card
      data-testid={`consignment-${consignment.id}`}
      data-stage={consignment.stage}
      className="min-w-0"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="neutral">{form.mode}</Pill>
            <span className="text-[12px] font-semibold tracking-[0.02em] text-ink-soft">
              {consignment.id} · {consignment.createdAt}
            </span>
          </div>
          <h3 className="mt-1 font-display text-[16.5px] font-bold">{form.description}</h3>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            {form.origin} → {form.deliveryPoint} · {vesselName(form.vesselId)}
          </p>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">
            {form.pieces} {Number(form.pieces) === 1 ? 'piece' : 'pieces'} · {form.weightKg} kg ·
            ready {form.readyDate}
            {consignment.eta ? (
              <span data-testid="consignment-eta"> · ETA {consignment.eta}</span>
            ) : null}
          </p>
        </div>
        <div className="max-w-full [&>span]:whitespace-normal">
          <Pill tone={consignmentStageTone(consignment.stage)}>
            {delivered ? '✓ ' : ''}
            {consignment.stage}
          </Pill>
        </div>
      </div>

      <StageTrack stages={CONSIGNMENT_STAGES} current={consignment.stage} />

      <div
        className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-line bg-paper px-3 py-2"
        data-testid="consignment-eori"
      >
        <p className="text-[12.5px] text-ink-soft">
          <span className="font-semibold text-ink">GB EORI {CLIENT_EORI}</span> · {EORI_NOTE}
        </p>
        <label
          htmlFor={eoriId}
          className="flex cursor-pointer items-center gap-2 text-[12.5px] font-semibold text-ink"
        >
          <input
            id={eoriId}
            type="checkbox"
            checked={consignment.eoriConfirmed === true}
            onChange={(e) => setEoriConfirmed(consignment.id, e.target.checked)}
            className="h-4 w-4 accent-sea"
            data-testid="eori-confirm"
          />
          {EORI_CONFIRM_LABEL}
        </label>
      </div>

      <FltSuggestion consignment={consignment} onRequest={onRequest} />

      {form.fromOutsideUk ? (
        <p className="mt-3 text-[12.5px] text-ink-soft" data-testid="consignment-customs">
          Customs entry needed —{' '}
          <Link to="/app/customs?section=declarations" className="font-semibold text-sea">
            raise it against {consignment.id} →
          </Link>
        </p>
      ) : null}

      <div className="mt-3.5 flex flex-wrap items-center gap-3">
        {action ? (
          <Button
            variant="ghost"
            onClick={() => advance(consignment.id)}
            data-testid="consignment-advance"
          >
            {action}
          </Button>
        ) : null}
        {delivered ? (
          <Button
            onClick={() =>
              pushToast('Illustrative — the proof of delivery would download here as a PDF.')
            }
          >
            Proof of delivery
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function ConsignmentsSection() {
  const consignments = useLogistics((s) => s.consignments);
  const reset = useLogistics((s) => s.reset);
  const [target, setTarget] = useState<RequestTarget | null>(null);
  const running = consignments.filter((c) => !isConsignmentDelivered(c.stage)).length;

  return (
    <div className="space-y-4">
      <p className="max-w-[760px] text-[13.5px] text-ink-soft">{LOGISTICS_INTRO}</p>
      <BookingForm />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Eyebrow>Movements · {consignments.length}</Eyebrow>
          <h3 className="mt-0.5 font-display text-[17px] font-bold">On the way to the quay</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12.5px] text-ink-soft" data-testid="consignments-summary">
            {consignments.length === 0
              ? 'No movements booked'
              : `${running} running · ${consignments.length - running} delivered`}
          </span>
          <Button variant="ghost" onClick={reset}>
            Reset movements
          </Button>
        </div>
      </div>

      <div className="space-y-4" data-testid="consignments">
        {consignments.map((c) => (
          <ConsignmentCard key={c.id} consignment={c} onRequest={setTarget} />
        ))}
      </div>
      <RequestQuoteModal target={target} onClose={() => setTarget(null)} />
    </div>
  );
}

function CardGrid({ items }: { items: readonly { title: string; body: string }[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((c) => (
        <Card key={c.title} className="min-w-0">
          <p className="text-[13.5px] font-bold">{c.title}</p>
          <p className="mt-1 text-[12.5px] text-ink-soft">{c.body}</p>
        </Card>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- Screen */

export default function Logistics() {
  const line = serviceLine('logistics');
  const pushToast = useApp((s) => s.pushToast);
  const consignments = useLogistics((s) => s.consignments);
  const [section, setSection] = useLineSection(line);

  const running = consignments.filter((c) => !isConsignmentDelivered(c.stage));
  const awaitingCustoms = running.filter((c) => c.form.fromOutsideUk).length;

  const live: LiveStat[] = [
    {
      label: 'Movements running',
      value: String(running.length),
      note: `${consignments.length - running.length} delivered to the quay`,
      to: '/app/logistics?section=consignments',
    },
    {
      label: 'Needing a customs entry',
      value: String(awaitingCustoms),
      note: awaitingCustoms === 0 ? 'Nothing waiting on an entry' : 'Raise it under Customs',
      to: '/app/customs?section=declarations',
    },
    {
      label: 'In the GAC warehouse',
      value: String(consignments.filter((c) => c.stage === 'At GAC warehouse').length),
      note: 'Held until the berth is ready',
      to: '/app/logistics?section=warehousing',
    },
  ];

  return (
    <ServiceLineHub
      line={line}
      live={live}
      onRequest={() => undefined}
      onAgent={(service: LineService) => pushToast(`${service.label} — ${AGENT_ENGAGED}`)}
    >
      <section className="mt-2" aria-label="Logistics sections">
        <LineSectionStrip line={line} section={section} onSelect={setSection} />
        <div className="mt-4" data-testid="line-section" data-section={section}>
          {section === 'consignments' ? <ConsignmentsSection /> : null}
          {section === 'warehousing' ? <CardGrid items={WAREHOUSING} /> : null}
          {section === 'project-cargo' ? <CardGrid items={PROJECT_CARGO} /> : null}
        </div>
      </section>
    </ServiceLineHub>
  );
}
