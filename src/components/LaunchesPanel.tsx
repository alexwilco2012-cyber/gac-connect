import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LaunchRequestModal } from './LaunchRequestModal';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Eyebrow } from './ui/Eyebrow';
import { Pill, StatusPill } from './ui/Pill';
import type { PillTone } from './ui/Pill';
import { Rating } from './ui/Rating';
import { Toggle } from './ui/Toggle';
import {
  fitLabel,
  fitsRun,
  LAUNCH_PORT_NOTES,
  launchPorts,
  launchesAt,
  planSummary,
  runsNeeded,
} from '../lib/launches';
import type { LaunchSupplier, RunFit } from '../lib/launches';
import { deriveStatus, isBookable } from '../lib/svs';
import { SUPPLIERS } from '../data/suppliers';

/**
 * Launches panel — crew, stores, and light freight out to vessels at anchor or
 * working inshore (17 Aug review). Lives inside Crew change › Transfers
 * (owner's follow-up: launches belong with taxis and the crew's flights, not
 * on a tab of their own). Every operator is SVS-vetted like the rest of the
 * marketplace; what this panel adds is the two facts a client needs before
 * booking a run: the launch's maximum capacity and whether freight is
 * included. Ports are examples (Aberdeen, Macduff); figures are illustrative.
 */

const FIT_TONE: Record<RunFit, PillTone> = {
  fits: 'verified',
  runs: 'warn',
  'no-freight': 'neutral',
};

const FIELD =
  'mt-1 block min-h-[40px] w-full rounded-lg border-[1.5px] border-line-strong bg-white px-2.5 py-2 text-[13.5px] font-semibold text-ink';

const PORTS = launchPorts(SUPPLIERS);
const DEFAULT_PAX = 9;

function LaunchCard({
  supplier,
  pax,
  needsFreight,
  onRequest,
}: {
  supplier: LaunchSupplier;
  pax: number;
  needsFreight: boolean;
  onRequest: (s: LaunchSupplier) => void;
}) {
  const launch = supplier.launch;
  const status = deriveStatus(supplier.certs);
  const bookable = isBookable(supplier.certs);
  const fit = fitsRun(launch, pax, needsFreight);
  const runs = runsNeeded(launch.maxPassengers, pax);

  const rows: [string, string][] = [
    ['Max capacity', `${launch.maxPassengers} passengers`],
    ['Freight', launch.freightIncluded ? 'Included ✓' : 'Not included ✗'],
    ['Transit', launch.transit],
    ['Availability', launch.availability],
  ];

  return (
    <Card data-testid={`launch-${supplier.id}`} data-fit={fit} className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-[16px] font-bold">
          <Link
            to={`/app/marketplace/${supplier.id}`}
            className="text-ink no-underline hover:text-sea hover:underline"
          >
            {supplier.name}
          </Link>
        </h3>
        <StatusPill status={status} />
        <span data-testid={`fit-${supplier.id}`}>
          <Pill tone={FIT_TONE[fit]}>{fitLabel(fit, runs)}</Pill>
        </span>
      </div>
      <p className="mt-1.5 flex flex-wrap items-baseline gap-x-3.5 text-[13px] text-ink-soft">
        <Rating rating={supplier.rating} count={supplier.ratingCount} size="sm" />
        <span>
          Launch <strong className="text-ink">{launch.vesselName}</strong>
        </span>
      </p>
      <p className="mt-1.5 text-[13px] text-ink-soft">{supplier.description}</p>

      <table className="mt-3 w-full border-collapse text-[13px]">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-dashed border-line">
              <td className="py-1.5 pr-3 align-top text-ink-soft">{k}</td>
              <td className="py-1.5 text-right font-semibold">{v}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={2} className="py-1.5 text-[12px] text-ink-soft">
              {launch.freightNote}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
        {bookable ? (
          <Button onClick={() => onRequest(supplier)} data-testid={`request-${supplier.id}`}>
            Request launch
          </Button>
        ) : (
          <Button disabled title="Blocked by SVS — compliance evidence required">
            Unavailable
          </Button>
        )}
        <Link
          to={`/app/marketplace/${supplier.id}`}
          className="text-[12.5px] font-semibold text-sea"
        >
          View profile →
        </Link>
      </div>
    </Card>
  );
}

export function LaunchesPanel() {
  const [port, setPort] = useState(PORTS[0] ?? 'Aberdeen');
  const [paxText, setPaxText] = useState(String(DEFAULT_PAX));
  const [needsFreight, setNeedsFreight] = useState(true);
  const [target, setTarget] = useState<LaunchSupplier | null>(null);

  const pax = Math.max(1, Math.floor(Number(paxText) || 1));
  const summary = planSummary(SUPPLIERS, port, pax, needsFreight);

  return (
    <div data-testid="launches-panel">
      <h3 className="font-display text-[17px] font-bold">Launches from the quay</h3>
      <p className="mt-1 max-w-[720px] text-[13.5px] text-ink-soft">
        Launch operators run crew, stores, and light freight out to vessels at anchor or working
        inshore. Every operator is SVS-vetted; the two things you need at a glance are the launch’s
        maximum capacity and whether freight is included in the run.
      </p>
      <p className="mt-1 text-[12px] text-ink-soft">
        Ports, capacities, transit times, and availability shown here are illustrative.
      </p>

      {/* Plan a run — the live check against capacity and freight */}
      <Card className="mt-4" data-testid="plan-run">
        <Eyebrow>Plan a run</Eyebrow>
        <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="text-[12.5px] font-semibold text-ink-soft">
            Port
            <select
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className={FIELD}
              data-testid="plan-port"
            >
              {PORTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[12.5px] font-semibold text-ink-soft">
            Passengers needed
            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={paxText}
              onChange={(e) => setPaxText(e.target.value)}
              // What is shown is what is computed: a blank or 0 field settles on the
              // minimum once the user leaves it, instead of silently reading as 1.
              onBlur={() => {
                if (String(pax) !== paxText) setPaxText(String(pax));
              }}
              className={FIELD}
              data-testid="plan-passengers"
            />
          </label>
          <div className="flex min-h-[40px] items-center gap-3 sm:pb-1">
            <span className="text-[13px] font-semibold">Freight to go out?</span>
            <Toggle
              pressed={needsFreight}
              onToggle={() => setNeedsFreight(!needsFreight)}
              label="Freight to go out"
            />
          </div>
        </div>
        <p
          className="mt-3 rounded-lg border-l-4 border-sea bg-sea-soft px-3 py-2 text-[13px] text-ink"
          data-testid="plan-summary"
          aria-live="polite"
        >
          {summary}
        </p>
      </Card>

      {/* One section per port, from the data */}
      {PORTS.map((p) => {
        const launches = launchesAt(SUPPLIERS, p);
        const note = LAUNCH_PORT_NOTES[p];
        const slug = p.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return (
          <section key={p} className="mt-6" aria-labelledby={`launches-${slug}`}>
            <h2 id={`launches-${slug}`} className="font-display text-[17px] font-bold">
              Launches from {p}
            </h2>
            {note ? <p className="mt-1 max-w-[720px] text-[13.5px] text-ink-soft">{note}</p> : null}
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {launches.map((s) => (
                <LaunchCard
                  key={s.id}
                  supplier={s}
                  pax={pax}
                  needsFreight={needsFreight}
                  onRequest={setTarget}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* GA strip */}
      <div className="mt-6 flex flex-wrap items-center gap-4 rounded-brand bg-ink px-4.5 py-3.5 text-[13.5px] text-[#D8E2EC]">
        <span className="rounded-md bg-white/12 px-2 py-0.5 text-[11.5px] font-bold">GA</span>
        <span className="flex-1">
          A launch run is booked like any other marketplace service — quote, e-sign, PO in GAC
          Agent, invoice review — and the operator’s capacity and freight terms travel with the
          booking.
        </span>
      </div>

      <LaunchRequestModal
        supplier={target}
        defaults={{ passengers: pax, freight: needsFreight }}
        onClose={() => setTarget(null)}
      />
    </div>
  );
}
