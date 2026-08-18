import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Link } from 'react-router-dom';
import { RequestQuoteModal } from '../../components/RequestQuoteModal';
import type { RequestTarget } from '../../components/RequestQuoteModal';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Pill, StatusPill } from '../../components/ui/Pill';
import { Rating } from '../../components/ui/Rating';
import { Toggle } from '../../components/ui/Toggle';
import {
  CREW_FLOW,
  CREW_PORTS,
  CREW_SECTIONS,
  ILLUSTRATIVE_NOTICE,
  IMMIGRATION_CHECKLIST,
  INFORMS_NOT_ADVISES,
  LOI_DEMO_FORM,
  LOI_NOT_OKTB,
  LOI_NOT_REQUIRED_NOTE,
  REPAT_DEMO_FORM,
  REPAT_INTRO,
  REPAT_QUESTION,
  STAGE_NOTES,
} from '../../data/crewChange';
import type { CrewSectionId } from '../../data/crewChange';
import { SUPPLIERS } from '../../data/suppliers';
import { VESSELS } from '../../data/vessels';
import {
  formatCrewName,
  isTerminalStage,
  loiRequired,
  simulateAction,
  stageIndex,
  stagesFor,
  stageTone,
  validateLoi,
  validateRepat,
} from '../../lib/crewChange';
import type { CrewRequest, LoiForm, RepatForm } from '../../lib/crewChange';
import { deriveStatus, isBookable } from '../../lib/svs';
import { useApp } from '../../store/app';
import { useCrewChange } from '../../store/crewChange';

/**
 * Crew change — hotels, immigration guidance, and the two letter templates
 * (LOI for on-signers, repatriation letter for off-signers). The client fills
 * a template in; GAC endorses the LOI as agents, or routes the repatriation
 * letter to UK Border Force, and returns it. One letter per crew member.
 * All data on this screen is illustrative.
 */

const INPUT =
  'mt-1 block min-h-[40px] w-full rounded-lg border-[1.5px] border-line-strong bg-white px-2.5 py-2 text-[13.5px] font-semibold text-ink';
const LABEL = 'text-[12.5px] font-semibold text-ink-soft';

const HOTELS = SUPPLIERS.filter((s) => s.category === 'Hotels');

const PORT_SET = new Set<string>(CREW_PORTS);

/**
 * Draft state for one template. Held by the screen, not the section, so a
 * half-filled form survives a trip to the Immigration checklist and back.
 */
interface TemplateState<T> {
  form: T;
  setForm: Dispatch<SetStateAction<T>>;
  problems: string[];
  setProblems: Dispatch<SetStateAction<string[]>>;
}

function useTemplateState<T>(initial: T): TemplateState<T> {
  const [form, setForm] = useState<T>(initial);
  const [problems, setProblems] = useState<string[]>([]);
  return { form, setForm, problems, setProblems };
}

/** Vessel + port selects shared by both templates. Port follows the vessel's call. */
function VesselAndPort({
  vesselId,
  port,
  portLabel,
  onVessel,
  onPort,
}: {
  vesselId: string;
  port: string;
  portLabel: string;
  onVessel: (id: string, callPort: string | null) => void;
  onPort: (p: string) => void;
}) {
  return (
    <>
      <label className={LABEL}>
        Vessel
        <select
          value={vesselId}
          onChange={(e) => {
            const v = VESSELS.find((x) => x.id === e.target.value);
            onVessel(e.target.value, v && PORT_SET.has(v.port) ? v.port : null);
          }}
          className={INPUT}
        >
          {VESSELS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} · {v.port}
            </option>
          ))}
        </select>
      </label>
      <label className={LABEL}>
        {portLabel}
        <select value={port} onChange={(e) => onPort(e.target.value)} className={INPUT}>
          {CREW_PORTS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

/** The "do not enter real passport data" notice; its id is what the form's aria-describedby points at. */
function IllustrativeNotice({ testId }: { testId: string }) {
  return (
    <p
      id={testId}
      className="rounded-lg border-l-4 border-warn bg-warn-soft px-3 py-2 text-[12.5px] font-semibold text-warn"
      data-testid={testId}
    >
      {ILLUSTRATIVE_NOTICE}
    </p>
  );
}

function Problems({ problems, testId }: { problems: string[]; testId: string }) {
  if (problems.length === 0) return null;
  return (
    <p
      role="alert"
      className="mt-3 rounded-lg border-l-4 border-danger bg-danger-soft px-3 py-2 text-[12.5px] text-danger"
      data-testid={testId}
    >
      Please complete: {problems.join(' · ')}.
    </p>
  );
}

/* ---------------------------------------------------------------- Hotels */

function HotelsSection({ onRequest }: { onRequest: (t: RequestTarget) => void }) {
  return (
    <div data-testid="section-hotels">
      <div className="grid gap-4 md:grid-cols-2">
        {HOTELS.map((h) => {
          // SVS status comes from the certificates, and blocking is enforced in
          // the booking action itself (03 §3.3) — the same gate as the Marketplace.
          const status = deriveStatus(h.certs);
          const bookable = isBookable(h.certs);
          return (
            <Card key={h.id} data-testid={`hotel-${h.id}`} data-status={status}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-[17px] font-bold">
                    <Link
                      to={`/app/marketplace/${h.id}`}
                      className="text-ink no-underline hover:text-sea hover:underline"
                    >
                      {h.name}
                    </Link>
                  </h3>
                  <p className="mt-0.5 text-[13px]">
                    <Rating rating={h.rating} count={h.ratingCount} size="sm" />
                  </p>
                </div>
                <StatusPill status={status} />
              </div>
              <p className="mt-2 text-[13px] text-ink-soft">{h.description}</p>
              {h.bookingNote ? (
                <p className="mt-2.5 rounded-lg border border-line bg-paper px-3 py-2 text-[12.5px] text-ink-soft">
                  {h.bookingNote}
                </p>
              ) : null}
              <div className="mt-3.5">
                {bookable ? (
                  <Button
                    onClick={() => onRequest({ supplierName: h.name, category: 'Hotels' })}
                    aria-label={`Request booking at ${h.name}`}
                    data-testid={`book-${h.id}`}
                  >
                    Request booking
                  </Button>
                ) : (
                  <Button
                    disabled
                    title="Blocked by SVS — compliance evidence required"
                    aria-label={`${h.name} unavailable — blocked by SVS`}
                    data-testid={`book-${h.id}`}
                  >
                    Unavailable
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      <p className="mt-3 text-[12.5px] text-ink-soft">
        Both hotels are also listed under the <strong>Hotels</strong> chip in the{' '}
        <Link to="/app/marketplace" className="font-semibold text-sea">
          Marketplace
        </Link>
        , with the same booking terms. A crew stay usually needs a run to and from the quay — your
        GAC agent arranges the transfer.
      </p>
    </div>
  );
}

/* ----------------------------------------------------------- Immigration */

function ImmigrationSection() {
  return (
    <div data-testid="section-immigration" className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <p className="text-[13.5px] font-bold">Before any letter goes out — your checklist</p>
        <ul className="mt-2.5 space-y-2.5">
          {IMMIGRATION_CHECKLIST.map((item) => (
            <li key={item.title} className="flex gap-2.5 text-[13px]">
              <span aria-hidden="true" className="mt-0.5 font-bold text-success">
                ✓
              </span>
              <span>
                <strong>{item.title}</strong>
                <span className="block text-ink-soft">{item.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <div className="space-y-4">
        <Card>
          <p className="text-[13.5px] font-bold">LOI, never OKTB</p>
          <p className="mt-1.5 text-[13px] text-ink-soft" data-testid="loi-not-oktb">
            {LOI_NOT_OKTB}
          </p>
        </Card>
        <Card variant="dark">
          <p className="text-[13.5px] font-bold">Informs, not advises</p>
          <p className="mt-1.5 text-[13px] text-[#D8E2EC]" data-testid="informs-not-advises">
            {INFORMS_NOT_ADVISES}
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- LOI form */

function LoiSection({ state }: { state: TemplateState<LoiForm> }) {
  const addRequest = useCrewChange((s) => s.addRequest);
  const pushToast = useApp((s) => s.pushToast);
  const { form, setForm, problems, setProblems } = state;

  const required = loiRequired(form.visaNational);
  const update = <K extends keyof LoiForm>(k: K, v: LoiForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function submit() {
    if (!required) return;
    const found = validateLoi(form);
    setProblems(found);
    if (found.length > 0) return;
    addRequest('loi', form);
    pushToast(
      `LOI request submitted for ${formatCrewName(form.familyName, form.forenames)} — your GAC agent checks the details against the passport and endorses the letter as agents.`,
    );
    setForm(LOI_DEMO_FORM);
  }

  const text = (key: keyof LoiForm, label: string, extra?: { placeholder?: string }) => (
    <label className={LABEL}>
      {label}
      <input
        type="text"
        value={form[key] as string}
        onChange={(e) => update(key, e.target.value)}
        placeholder={extra?.placeholder}
        className={INPUT}
      />
    </label>
  );

  return (
    <div data-testid="section-loi" className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[13.5px] font-bold">Immigration Support Letter (LOI) — template</p>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">
              One crew member per letter. Details as printed in the passport.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[13px] font-semibold">
            <span aria-hidden="true">Visa national?</span>
            <Toggle
              pressed={form.visaNational}
              onToggle={() => update('visaNational', !form.visaNational)}
              label="Visa national"
            />
          </div>
        </div>

        <div className="mt-3">
          <IllustrativeNotice testId="loi-illustrative" />
        </div>

        {!required ? (
          <p
            className="mt-3 rounded-lg border-l-4 border-sea bg-sea-soft px-3 py-2 text-[12.5px] text-sea"
            data-testid="loi-not-required"
          >
            {LOI_NOT_REQUIRED_NOTE}
          </p>
        ) : null}

        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          aria-describedby="loi-illustrative"
        >
          <fieldset className="border-0 p-0" disabled={!required}>
            <legend className="sr-only">Crew member and travel details</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {text('familyName', 'Family name (as in passport)')}
              {text('forenames', 'Forenames (as in passport)')}
              {text('nationality', 'Nationality')}
              {text('dateOfBirth', 'Date of birth', { placeholder: 'DD/MM/YYYY' })}
              {text('passportNumber', 'Passport number')}
              {text('passportExpiry', 'Passport expiry', { placeholder: 'DD/MM/YYYY' })}
              <VesselAndPort
                vesselId={form.vesselId}
                port={form.port}
                portLabel="Port of joining"
                onVessel={(id, callPort) =>
                  setForm((f) => ({ ...f, vesselId: id, port: callPort ?? f.port }))
                }
                onPort={(p) => update('port', p)}
              />
              {text('joiningDate', 'Joining on or around', { placeholder: 'DD/MM/YYYY' })}
              {text('arrivingFlight', 'Arriving flight (as on the itinerary)')}
            </div>
          </fieldset>
          <Problems problems={problems} testId="loi-errors" />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!required} data-testid="loi-submit">
              Submit LOI request
            </Button>
            <span className="text-[12.5px] text-ink-soft">
              GAC checks, endorses as agents, and returns the letter.
            </span>
          </div>
        </form>
      </Card>

      <div className="space-y-4">
        <Card>
          <p className="text-[13.5px] font-bold">What happens next</p>
          <ol className="mt-2 space-y-2 text-[13px]">
            {stagesFor('loi').map((s, i) => (
              <li key={s} className="flex gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sea-soft text-[11px] font-bold text-sea">
                  {i + 1}
                </span>
                <span>
                  <strong>{s}</strong>
                  <span className="block text-ink-soft">{STAGE_NOTES[s]}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
        <Card>
          <p className="text-[13.5px] font-bold">LOI, never OKTB</p>
          <p className="mt-1.5 text-[12.5px] text-ink-soft">{LOI_NOT_OKTB}</p>
        </Card>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- Repat form */

function RepatSection({ state }: { state: TemplateState<RepatForm> }) {
  const addRequest = useCrewChange((s) => s.addRequest);
  const pushToast = useApp((s) => s.pushToast);
  const { form, setForm, problems, setProblems } = state;

  const update = <K extends keyof RepatForm>(k: K, v: RepatForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function submit() {
    const found = validateRepat(form);
    setProblems(found);
    if (found.length > 0) return;
    addRequest('repat', form);
    pushToast(
      `Repatriation letter request submitted for ${formatCrewName(form.familyName, form.forenames)} — your GAC agent prepares the letter and sends it to UK Border Force for endorsement.`,
    );
    setForm(REPAT_DEMO_FORM);
  }

  const text = (key: keyof RepatForm, label: string, extra?: { placeholder?: string }) => (
    <label className={LABEL}>
      {label}
      <input
        type="text"
        value={form[key] as string}
        onChange={(e) => update(key, e.target.value)}
        placeholder={extra?.placeholder}
        className={INPUT}
      />
    </label>
  );

  return (
    <div data-testid="section-repat" className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <Card>
        <p className="text-[13.5px] font-bold">Disembarkation / repatriation letter — template</p>
        <p className="mt-0.5 text-[12.5px] text-ink-soft">
          One crew member per letter. Details as printed in the passport.
        </p>
        <div className="mt-3">
          <IllustrativeNotice testId="repat-illustrative" />
        </div>

        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          aria-describedby="repat-illustrative"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {text('familyName', 'Family name (as in passport)')}
            {text('forenames', 'Forenames (as in passport)')}
            {text('dateOfBirth', 'Date of birth', { placeholder: 'DD/MM/YYYY' })}
            {text('nationality', 'Nationality')}
            {text('passportNumber', 'Passport number')}
            <VesselAndPort
              vesselId={form.vesselId}
              port={form.port}
              portLabel="Disembarkation port"
              onVessel={(id, callPort) =>
                setForm((f) => ({ ...f, vesselId: id, port: callPort ?? f.port }))
              }
              onPort={(p) => update('port', p)}
            />
            {text('disembarkationDate', 'Disembarkation date', { placeholder: 'DD/MM/YYYY' })}
          </div>

          <fieldset
            className="mt-4 rounded-lg border border-line bg-paper p-3.5"
            data-testid="repat-question"
          >
            <legend className="px-1 text-[12.5px] font-bold">{REPAT_QUESTION}</legend>
            <div className="mt-1 flex flex-wrap gap-5">
              {(['yes', 'no'] as const).map((v) => (
                <label
                  key={v}
                  className="flex cursor-pointer items-center gap-2 text-[13.5px] font-semibold"
                >
                  <input
                    type="radio"
                    name="repat-joined-outside-uk"
                    value={v}
                    checked={form.joinedOutsideUk === v}
                    onChange={() => update('joinedOutsideUk', v)}
                    className="h-4 w-4 accent-sea"
                  />
                  {v === 'yes' ? 'Yes' : 'No'}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-4 border-0 p-0">
            <legend className={LABEL}>Repatriation flights (up to three)</legend>
            <div className="mt-1 grid gap-2">
              {form.flights.map((f, i) => (
                <label key={i} className={LABEL}>
                  <span className="sr-only">Flight {i + 1}</span>
                  <input
                    type="text"
                    value={f}
                    onChange={(e) => {
                      const flights = [...form.flights];
                      flights[i] = e.target.value;
                      update('flights', flights);
                    }}
                    placeholder={`Flight ${i + 1}`}
                    className={INPUT}
                  />
                </label>
              ))}
            </div>
          </fieldset>

          <Problems problems={problems} testId="repat-errors" />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="submit" data-testid="repat-submit">
              Submit repatriation letter request
            </Button>
            <span className="text-[12.5px] text-ink-soft">
              GAC prepares it, UK Border Force endorses it, GAC returns it.
            </span>
          </div>
        </form>
      </Card>

      <div className="space-y-4">
        <Card>
          <p className="text-[13.5px] font-bold">Written leave to enter</p>
          <p className="mt-1.5 text-[12.5px] text-ink-soft" data-testid="repat-intro">
            {REPAT_INTRO}
          </p>
        </Card>
        <Card>
          <p className="text-[13.5px] font-bold">What happens next</p>
          <ol className="mt-2 space-y-2 text-[13px]">
            {stagesFor('repat').map((s, i) => (
              <li key={s} className="flex gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sea-soft text-[11px] font-bold text-sea">
                  {i + 1}
                </span>
                <span>
                  <strong>{s}</strong>
                  <span className="block text-ink-soft">{STAGE_NOTES[s]}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Requests */

function StageTracker({ request }: { request: CrewRequest }) {
  const stages = stagesFor(request.kind);
  const current = stageIndex(request.kind, request.stage);
  return (
    <ol className="mt-3 flex flex-wrap gap-1.5" aria-label="Progress" data-testid="stage-tracker">
      {stages.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'pending';
        return (
          <li
            key={s}
            data-stage-state={state}
            className={`min-w-[150px] flex-1 rounded-md border px-2 py-1.5 text-[11.5px] leading-tight ${
              state === 'current'
                ? 'border-sea bg-sea-soft font-bold text-sea'
                : state === 'done'
                  ? 'border-success-soft bg-success-soft text-success'
                  : 'border-line bg-white text-ink-soft'
            }`}
          >
            <span aria-hidden="true" className="mr-1">
              {state === 'done' ? '✓' : state === 'current' ? '●' : '○'}
            </span>
            {s}
            <span className="sr-only">
              {state === 'done' ? ' (done)' : state === 'current' ? ' (current)' : ' (pending)'}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function RequestCard({ request }: { request: CrewRequest }) {
  const advance = useCrewChange((s) => s.advance);
  const pushToast = useApp((s) => s.pushToast);
  const name = formatCrewName(request.form.familyName, request.form.forenames);
  const vessel = VESSELS.find((v) => v.id === request.form.vesselId)?.name ?? '—';
  const date =
    request.kind === 'loi'
      ? `Joining ${request.form.joiningDate}`
      : `Disembarking ${request.form.disembarkationDate}`;
  const action = simulateAction(request.kind, request.stage);
  const terminal = isTerminalStage(request.kind, request.stage);

  return (
    <Card
      data-testid={`crew-request-${request.id}`}
      data-kind={request.kind}
      data-stage={request.stage}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="neutral">{request.kind === 'loi' ? 'LOI' : 'Repat'}</Pill>
            <span className="text-[12px] font-semibold tracking-[0.02em] text-ink-soft">
              {request.id} · {request.createdAt}
            </span>
          </div>
          <h3 className="mt-1 font-display text-[17px] font-bold" data-testid="crew-name">
            {name}
          </h3>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            {vessel} · {request.form.port} · {date}
          </p>
        </div>
        <div className="max-w-full [&>span]:whitespace-normal" data-testid="crew-stage">
          <Pill tone={stageTone(request.kind, request.stage)}>
            {terminal ? '✓ ' : ''}
            {request.stage}
          </Pill>
        </div>
      </div>

      <StageTracker request={request} />

      <div className="mt-3.5 flex flex-wrap items-center gap-3">
        {action ? (
          <Button
            variant="ghost"
            onClick={() => advance(request.id, action.steps)}
            data-testid="crew-advance"
          >
            {action.label}
          </Button>
        ) : null}
        {terminal ? (
          <Button
            onClick={() =>
              pushToast('Illustrative — the endorsed letter would download here as a PDF.')
            }
            data-testid="crew-download"
          >
            Download letter
          </Button>
        ) : null}
        <span className="text-[12.5px] text-ink-soft">{STAGE_NOTES[request.stage]}</span>
      </div>
    </Card>
  );
}

function RequestsList() {
  const requests = useCrewChange((s) => s.requests);
  const reset = useCrewChange((s) => s.reset);
  const inProgress = requests.filter((r) => !isTerminalStage(r.kind, r.stage)).length;

  return (
    <section className="mt-8" aria-labelledby="crew-requests-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Eyebrow>Requests · {requests.length}</Eyebrow>
          <h2 id="crew-requests-heading" className="mt-0.5 font-display text-[19px] font-bold">
            Letters in progress and returned
          </h2>
        </div>
        <p className="text-[12.5px] text-ink-soft" data-testid="crew-requests-summary">
          {requests.length === 0
            ? 'No requests yet — submit a template above'
            : inProgress === 0
              ? 'All letters returned'
              : `${inProgress} in progress · ${requests.length - inProgress} returned`}
        </p>
      </div>

      <div className="mt-3 space-y-4" data-testid="crew-requests">
        {requests.map((r) => (
          <RequestCard key={r.id} request={r} />
        ))}
      </div>

      {/* GA strip */}
      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-brand bg-ink px-4.5 py-3.5 text-[13.5px] text-[#D8E2EC]">
        <span className="rounded-md bg-white/12 px-2 py-0.5 text-[11.5px] font-bold">GA</span>
        <span className="flex-1">
          Every letter is tied to the port call in GAC Agent, so the vessel, port and dates on the
          letter match the call — and the endorsed copy sits with the job, not in an inbox.
        </span>
        {requests.length > 0 ? (
          <Button
            variant="dark-outline"
            onClick={reset}
            className="!min-h-[36px] !py-1"
            data-testid="reset-crew-change"
          >
            Reset demo
          </Button>
        ) : null}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- Screen */

export default function CrewChange() {
  const [section, setSection] = useState<CrewSectionId>('hotels');
  const [target, setTarget] = useState<RequestTarget | null>(null);
  // Drafts live here so switching section (say, to the checklist) keeps them.
  const loi = useTemplateState<LoiForm>(LOI_DEMO_FORM);
  const repat = useTemplateState<RepatForm>(REPAT_DEMO_FORM);
  const active = CREW_SECTIONS.find((s) => s.id === section) ?? CREW_SECTIONS[0]!;

  return (
    <div className="screen-enter">
      <Eyebrow>Crew change · hotels, immigration, letters</Eyebrow>
      <h1 className="mt-1 font-display text-2xl font-bold">
        Everything a crew change needs, in one place
      </h1>
      <p className="mt-1 max-w-[760px] text-[14px] text-ink-soft">
        Rooms for crew held ashore, the immigration paperwork for visa-national crew, an Immigration
        Support Letter for each on-signer and a repatriation letter for each off-signer. The
        platform holds the templates, you fill them in, GAC endorses or routes them and sends them
        back — one letter per crew member, always.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {CREW_FLOW.map((f) => (
          <Card key={f.title}>
            <p className="text-[13.5px] font-bold">{f.title}</p>
            <p className="mt-1 text-[12.5px] text-ink-soft">{f.body}</p>
          </Card>
        ))}
      </div>

      <div
        className="mt-6 flex flex-wrap gap-2"
        role="group"
        aria-label="Crew change sections"
        data-testid="crew-sections"
      >
        {CREW_SECTIONS.map((s) => (
          <Chip key={s.id} pressed={section === s.id} onClick={() => setSection(s.id)}>
            {s.label}
          </Chip>
        ))}
      </div>

      <div className="mt-4" data-testid="crew-section" data-section={active.id}>
        <h2 className="font-display text-[19px] font-bold">{active.label}</h2>
        <p className="mt-0.5 mb-3 text-[13.5px] text-ink-soft" data-testid="section-summary">
          {active.summary}
        </p>
        {section === 'hotels' ? <HotelsSection onRequest={setTarget} /> : null}
        {section === 'immigration' ? <ImmigrationSection /> : null}
        {section === 'loi' ? <LoiSection state={loi} /> : null}
        {section === 'repat' ? <RepatSection state={repat} /> : null}
      </div>

      <RequestsList />

      <RequestQuoteModal target={target} onClose={() => setTarget(null)} />
    </div>
  );
}
