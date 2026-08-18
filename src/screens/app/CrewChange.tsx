import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LaunchesPanel } from '../../components/LaunchesPanel';
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
  DEFAULT_CREW_SECTION,
  ILLUSTRATIVE_NOTICE,
  isCrewSectionId,
  IMMIGRATION_CHECKLIST,
  INFORMS_NOT_ADVISES,
  LOI_DEMO_FORM,
  LOI_NOT_OKTB,
  LOI_NOT_REQUIRED_NOTE,
  REPAT_DEMO_FORM,
  REPAT_INTRO,
  REPAT_QUESTION,
  STAGE_NOTES,
  TRANSFERS_INTRO,
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
import { launchPorts, launchSuppliers } from '../../lib/launches';
import type { LaunchSupplier } from '../../lib/launches';
import { deriveStatus, isBookable } from '../../lib/svs';
import {
  DEMO_FLIGHTS,
  FLIGHT_FEED_NOTE,
  planTransfers,
  trackFlight,
  TRANSFER_BUFFERS,
} from '../../lib/transfers';
import type { Direction, FlightStatus } from '../../lib/transfers';
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
const TAXIS = SUPPLIERS.filter((s) => s.category === 'Taxis');
const LAUNCHES = launchSuppliers(SUPPLIERS);
const LAUNCH_PORTS = launchPorts(SUPPLIERS);

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

/* ------------------------------------------------------------- Transfers */

const DIRECTIONS: { id: Direction; label: string; hint: string }[] = [
  { id: 'arriving', label: 'On-signers arriving', hint: 'flight lands → taxi → quay → launch' },
  { id: 'departing', label: 'Off-signers departing', hint: 'launch → quay → taxi → flight' },
];

const PHASE_TONE = {
  scheduled: 'neutral',
  'in-air': 'info',
  delayed: 'warn',
  landed: 'verified',
} as const;
const PHASE_LABEL = {
  scheduled: 'Scheduled',
  'in-air': 'In the air',
  delayed: 'Delayed',
  landed: 'Landed',
} as const;

/** Flight-timed planner: flight number → tracked status → taxi and launch timings. */
function FlightPlanner() {
  const pushToast = useApp((s) => s.pushToast);
  const [direction, setDirection] = useState<Direction>('arriving');
  const [flightNo, setFlightNo] = useState('ZZ 417');
  const [pax, setPax] = useState('6');
  const [port, setPort] = useState(LAUNCH_PORTS[0] ?? 'Aberdeen');
  const [launchId, setLaunchId] = useState<string>(LAUNCHES[0]?.id ?? '');
  const [tracked, setTracked] = useState<FlightStatus | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [delay, setDelay] = useState(0);

  const launchesHere = LAUNCHES.filter((l) => l.launch.port === port);
  const launch: LaunchSupplier | null =
    launchId === '' ? null : (launchesHere.find((l) => l.id === launchId) ?? null);
  const status = tracked ? trackFlight(tracked.flight, delay) : null;
  const plan = status ? planTransfers(status, port, launch?.launch ?? null) : null;
  const paxN = Math.max(1, Math.floor(Number(pax) || 1));
  const taxi =
    TAXIS.find((t) =>
      port === 'Macduff' ? t.id === 'deveron-cabs' : t.id === 'regent-quay-cars',
    ) ?? TAXIS[0];
  const suggestions = Object.values(DEMO_FLIGHTS).filter((f) => f.direction === direction);

  function track() {
    const found = trackFlight(flightNo);
    if (!found) {
      setTracked(null);
      setNotFound(flightNo.trim() || 'that flight');
      return;
    }
    setNotFound(null);
    setDelay(0);
    setDirection(found.direction);
    setTracked(found);
  }

  function pickDirection(d: Direction) {
    setDirection(d);
    setTracked(null);
    setNotFound(null);
    setDelay(0);
    // Offer a matching demo flight so the button always has something to track.
    const first = Object.values(DEMO_FLIGHTS).find((f) => f.direction === d);
    if (first) setFlightNo(first.flight);
  }

  function send() {
    if (!plan || !status) return;
    const who = `${paxN} ${paxN === 1 ? 'crew member' : 'crew'}`;
    pushToast(
      `Transport request sent — ${who}, ${status.flight} ${status.route}. ${plan.summary} Taxi ${taxi?.name ?? 'operator'}${launch ? `, launch ${launch.name}` : ''} — both hold the flight and re-time on a delay.`,
    );
  }

  return (
    <Card data-testid="flight-planner">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Eyebrow>Flight-timed transport</Eyebrow>
          <h3 className="mt-1 font-display text-[17px] font-bold">
            Give us the flight. We time the taxi and the launch to it.
          </h3>
        </div>
        <Pill tone="neutral">Illustrative</Pill>
      </div>
      <p className="mt-1.5 max-w-[760px] text-[13.5px] text-ink-soft">{TRANSFERS_INTRO}</p>

      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Direction">
        {DIRECTIONS.map((d) => (
          <button
            key={d.id}
            type="button"
            aria-pressed={direction === d.id}
            onClick={() => pickDirection(d.id)}
            data-testid={`direction-${d.id}`}
            className={`min-h-[34px] cursor-pointer rounded-full border-[1.5px] px-3 py-1 text-[12.5px] font-semibold transition-colors ${
              direction === d.id
                ? 'border-ink bg-ink text-white'
                : 'border-line-strong bg-white text-ink-soft hover:border-sea'
            }`}
          >
            {d.label} <span className="font-normal opacity-80">· {d.hint}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className={LABEL}>
          Flight number
          <input
            type="text"
            value={flightNo}
            onChange={(e) => setFlightNo(e.target.value)}
            className={INPUT}
            data-testid="flight-no"
            aria-describedby="flight-suggestions"
          />
        </label>
        <label className={LABEL}>
          Crew travelling
          <input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={pax}
            onChange={(e) => setPax(e.target.value)}
            onBlur={() => {
              if (String(paxN) !== pax) setPax(String(paxN));
            }}
            className={INPUT}
            data-testid="flight-pax"
          />
        </label>
        <label className={LABEL}>
          Port
          <select
            value={port}
            onChange={(e) => {
              setPort(e.target.value);
              const first = LAUNCHES.find((l) => l.launch.port === e.target.value);
              setLaunchId(first?.id ?? '');
            }}
            className={INPUT}
            data-testid="flight-port"
          >
            {LAUNCH_PORTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          Launch to the vessel
          <select
            value={launchId}
            onChange={(e) => setLaunchId(e.target.value)}
            className={INPUT}
            data-testid="flight-launch"
          >
            <option value="">None — vessel alongside</option>
            {launchesHere.map((l) => (
              <option key={l.id} value={l.id}>
                {l.launch.vesselName} · {l.name} · {l.launch.transit}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p id="flight-suggestions" className="mt-1.5 text-[12px] text-ink-soft">
        Demo flights the simulated feed knows:{' '}
        {suggestions.map((f, i) => (
          <span key={f.flight}>
            {i ? ' · ' : ''}
            <button
              type="button"
              className="cursor-pointer border-none bg-transparent p-0 font-semibold text-sea underline"
              onClick={() => setFlightNo(f.flight)}
            >
              {f.flight}
            </button>{' '}
            {f.route} {f.scheduled}
          </span>
        ))}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button onClick={track} data-testid="track-flight">
          Track flight
        </Button>
        {status ? (
          <Button
            variant="ghost"
            onClick={() => setDelay(delay ? 0 : TRANSFER_BUFFERS.simulatedDelayMin)}
            data-testid="simulate-delay"
          >
            {delay
              ? 'Simulate: back on time'
              : `Simulate: flight delayed ${TRANSFER_BUFFERS.simulatedDelayMin} min`}
          </Button>
        ) : null}
        <span className="text-[12px] text-ink-soft">{FLIGHT_FEED_NOTE}</span>
      </div>

      {notFound ? (
        <p
          role="alert"
          className="mt-3 rounded-lg border-l-4 border-warn bg-warn-soft px-3 py-2 text-[12.5px] text-warn"
          data-testid="flight-not-found"
        >
          The feed does not know {notFound}. Check the number, or pick one of the demo flights above
          — in production your agent times the transport from the itinerary instead.
        </p>
      ) : null}

      {status && plan ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <div
            className="rounded-lg border border-line bg-paper p-3.5"
            data-testid="flight-status"
            data-phase={status.phase}
          >
            <div className="flex flex-wrap items-center gap-2">
              <strong className="font-display text-[16px]">{status.flight}</strong>
              <Pill tone={PHASE_TONE[status.phase]}>{PHASE_LABEL[status.phase]}</Pill>
            </div>
            <p className="mt-1 text-[13px]">{status.route}</p>
            <table className="mt-2 w-full border-collapse text-[13px]">
              <tbody>
                <tr className="border-b border-dashed border-line">
                  <td className="py-1 text-ink-soft">
                    Scheduled {status.direction === 'arriving' ? 'landing' : 'departure'}
                  </td>
                  <td className="py-1 text-right font-semibold">{status.scheduled}</td>
                </tr>
                <tr>
                  <td className="py-1 text-ink-soft">Live estimate</td>
                  <td className="py-1 text-right font-semibold" data-testid="flight-estimate">
                    {status.estimated}
                    {status.delayMin ? (
                      <span className="ml-1.5 text-[12px] font-semibold text-warn">
                        +{status.delayMin} min
                      </span>
                    ) : null}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border border-line p-3.5" data-testid="transfer-plan">
            <p className="text-[12.5px] font-bold">Transport, timed to the flight</p>
            <ol className="mt-2 space-y-1.5">
              {plan.legs.map((leg, i) => (
                <li
                  key={leg.label}
                  className="flex items-baseline justify-between gap-3 border-b border-dashed border-line pb-1.5 text-[13px] last:border-b-0"
                >
                  <span>
                    <span
                      aria-hidden="true"
                      className="mr-2 inline-grid h-5 w-5 place-items-center rounded-full bg-sea-soft font-display text-[11px] font-bold text-sea"
                    >
                      {i + 1}
                    </span>
                    {leg.label}
                    {leg.note ? (
                      <span className="ml-1.5 text-[12px] text-ink-soft">· {leg.note}</span>
                    ) : null}
                  </span>
                  <strong className="font-display whitespace-nowrap" data-testid={`leg-${i}`}>
                    {leg.time}
                  </strong>
                </li>
              ))}
            </ol>
            <p className="mt-2.5 text-[12.5px] text-ink-soft">
              Taxi: <strong className="text-ink">{taxi?.name}</strong>
              {launch ? (
                <>
                  {' '}
                  · Launch: <strong className="text-ink">{launch.name}</strong> (
                  {launch.launch.vesselName}, max {launch.launch.maxPassengers} passengers
                  {paxN > launch.launch.maxPassengers ? ` — ${paxN} needs more than one run` : ''})
                </>
              ) : null}
            </p>
            <div className="mt-3">
              <Button onClick={send} data-testid="send-transport">
                Send transport request
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function TaxisSection({ onRequest }: { onRequest: (t: RequestTarget) => void }) {
  return (
    <div data-testid="taxis" className="mt-6">
      <h3 className="font-display text-[17px] font-bold">Taxis and minibuses</h3>
      <p className="mt-1 max-w-[720px] text-[13.5px] text-ink-soft">
        Airport, hotel, and quay runs. Airport pickups hold the tracked flight, so a delay moves the
        pickup — not the crew.
      </p>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {TAXIS.map((t) => {
          const status = deriveStatus(t.certs);
          const bookable = isBookable(t.certs);
          return (
            <Card key={t.id} data-testid={`taxi-${t.id}`} data-status={status}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="font-display text-[16px] font-bold">
                    <Link
                      to={`/app/marketplace/${t.id}`}
                      className="text-ink no-underline hover:text-sea hover:underline"
                    >
                      {t.name}
                    </Link>
                  </h4>
                  <p className="mt-0.5 text-[13px]">
                    <Rating rating={t.rating} count={t.ratingCount} size="sm" />
                  </p>
                </div>
                <StatusPill status={status} />
              </div>
              <p className="mt-2 text-[13px] text-ink-soft">{t.description}</p>
              {t.facts ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {t.facts.map((f) => (
                    <li
                      key={f.label}
                      className="rounded-md border border-line bg-paper px-2 py-0.5 text-[12px] text-ink-soft"
                    >
                      {f.label} <strong className="text-ink">{f.value}</strong>
                    </li>
                  ))}
                </ul>
              ) : null}
              {t.bookingNote ? (
                <p className="mt-2.5 rounded-lg border border-line bg-paper px-3 py-2 text-[12.5px] text-ink-soft">
                  {t.bookingNote}
                </p>
              ) : null}
              <div className="mt-3.5">
                {bookable ? (
                  <Button
                    onClick={() => onRequest({ supplierName: t.name, category: 'Taxis' })}
                    aria-label={`Request taxi from ${t.name}`}
                    data-testid={`book-${t.id}`}
                  >
                    Request taxi
                  </Button>
                ) : (
                  <Button disabled title="Blocked by SVS — compliance evidence required">
                    Unavailable
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function TransfersSection({ onRequest }: { onRequest: (t: RequestTarget) => void }) {
  return (
    <div data-testid="section-transfers">
      <FlightPlanner />
      <TaxisSection onRequest={onRequest} />
      <div className="mt-6">
        <LaunchesPanel />
      </div>
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
  // The active section lives in the URL (?section=transfers) so the dashboard,
  // the old /app/launches route, and a shared link can open straight onto it.
  const [params, setParams] = useSearchParams();
  const fromUrl = params.get('section');
  const section: CrewSectionId = isCrewSectionId(fromUrl) ? fromUrl : DEFAULT_CREW_SECTION;
  const setSection = (id: CrewSectionId) => {
    const next = new URLSearchParams(params);
    if (id === DEFAULT_CREW_SECTION) next.delete('section');
    else next.set('section', id);
    setParams(next, { replace: true });
  };
  const [target, setTarget] = useState<RequestTarget | null>(null);
  // Drafts live here so switching section (say, to the checklist) keeps them.
  const loi = useTemplateState<LoiForm>(LOI_DEMO_FORM);
  const repat = useTemplateState<RepatForm>(REPAT_DEMO_FORM);
  const active = CREW_SECTIONS.find((s) => s.id === section) ?? CREW_SECTIONS[0]!;

  return (
    <div className="screen-enter">
      <Eyebrow>Crew change · hotels, transfers, immigration, letters</Eyebrow>
      <h1 className="mt-1 font-display text-2xl font-bold">
        Everything a crew change needs, in one place
      </h1>
      <p className="mt-1 max-w-[760px] text-[14px] text-ink-soft">
        Rooms for crew held ashore, taxis and launches timed to the crew’s flights, the immigration
        paperwork for visa-national crew, an Immigration Support Letter for each on-signer and a
        repatriation letter for each off-signer. The platform holds the templates, you fill them in,
        GAC endorses or routes them and sends them back — one letter per crew member, always.
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
        {section === 'transfers' ? <TransfersSection onRequest={setTarget} /> : null}
        {section === 'immigration' ? <ImmigrationSection /> : null}
        {section === 'loi' ? <LoiSection state={loi} /> : null}
        {section === 'repat' ? <RepatSection state={repat} /> : null}
      </div>

      <RequestsList />

      <RequestQuoteModal target={target} onClose={() => setTarget(null)} />
    </div>
  );
}
