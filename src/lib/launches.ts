import type { LaunchDetails, Supplier } from '../data/suppliers';

/**
 * Launches — crew and light freight out to vessels at anchor or working
 * inshore (17 Aug review: "Macduff, Aberdeen as examples, if freight is
 * included, max capacity of vessel"). The two facts a client needs at a glance
 * are the launch's maximum capacity and whether freight is included in the
 * run; everything on the Launches tab derives from those two fields so the
 * tab, the marketplace chips, and the request modal always agree.
 */

/** A supplier that carries launch details — the Launches tab renders these. */
export type LaunchSupplier = Supplier & { launch: LaunchDetails };

/** How a launch measures up to a requirement (passengers + freight). */
export type RunFit = 'fits' | 'runs' | 'no-freight';

/**
 * Short port notes for the section headings. Generic and illustrative — no
 * real operators, berths, or tariffs (07_GUARDRAILS).
 */
export const LAUNCH_PORT_NOTES: Record<string, string> = {
  Aberdeen:
    'Runs from the harbour to the outer anchorage and the inshore fields. Transit is short, so most operators run round the clock; check capacity against the crew list before booking.',
  Macduff:
    'Cover for the Moray Firth anchorages and vessels working the firth. Transits are longer and daylight running is the norm, so plan the return leg with the operator.',
};

export function launchSuppliers(list: readonly Supplier[]): LaunchSupplier[] {
  return list.filter((s): s is LaunchSupplier => s.launch !== undefined);
}

/** Distinct home ports, in order of first appearance in the data. */
export function launchPorts(list: readonly Supplier[]): string[] {
  const ports: string[] = [];
  for (const s of launchSuppliers(list)) {
    if (!ports.includes(s.launch.port)) ports.push(s.launch.port);
  }
  return ports;
}

export function launchesAt(list: readonly Supplier[], port: string): LaunchSupplier[] {
  return launchSuppliers(list).filter((s) => s.launch.port === port);
}

/** Runs needed to move `pax` passengers on a launch carrying `maxPassengers` — ceil, never below 1. */
export function runsNeeded(maxPassengers: number, pax: number): number {
  const max = Number.isFinite(maxPassengers) && maxPassengers > 0 ? Math.floor(maxPassengers) : 1;
  const people = Number.isFinite(pax) ? Math.floor(pax) : 0;
  return Math.max(1, Math.ceil(people / max));
}

/**
 * Freight wins: a launch that does not carry freight is the wrong launch when
 * freight has to go out, however many runs it could make. Then capacity: more
 * than one run is 'runs'; otherwise it fits.
 */
export function fitsRun(launch: LaunchDetails, pax: number, needsFreight: boolean): RunFit {
  if (needsFreight && !launch.freightIncluded) return 'no-freight';
  if (runsNeeded(launch.maxPassengers, pax) > 1) return 'runs';
  return 'fits';
}

/** Pill label for a fit — the same words on every card. */
export function fitLabel(fit: RunFit, runs: number): string {
  if (fit === 'no-freight') return 'No freight';
  if (fit === 'runs') return `${runs} runs needed`;
  return 'Fits in one run';
}

/**
 * Warning for a request that exceeds the launch's capacity, or undefined when
 * it fits. Same wording in the modal and the tests.
 */
export function overCapacityWarning(launch: LaunchDetails, pax: number): string | undefined {
  if (pax <= launch.maxPassengers) return undefined;
  const runs = runsNeeded(launch.maxPassengers, pax);
  return `${pax} is over ${launch.vesselName}’s ${launch.maxPassengers} passenger limit — this will take ${runs} runs, or choose a larger launch`;
}

function paxPhrase(pax: number): string {
  return `${pax} ${pax === 1 ? 'passenger' : 'passengers'}`;
}

/** One launch against the requirement, in words — used when nothing fits in a single run. */
export function describeFit(launch: LaunchDetails, pax: number, needsFreight: boolean): string {
  const fit = fitsRun(launch, pax, needsFreight);
  const runs = runsNeeded(launch.maxPassengers, pax);
  const who = `${launch.vesselName} (${launch.maxPassengers})`;
  if (fit === 'fits') return `${who} carries ${paxPhrase(pax)} in one run`;
  if (fit === 'runs') return `${who} needs ${runs} runs for ${paxPhrase(pax)}`;
  return runs > 1
    ? `${who} needs ${runs} runs for ${paxPhrase(pax)} and does not carry freight`
    : `${who} does not carry freight`;
}

/**
 * The live sentence under the plan-a-run card:
 *   "2 launches at Aberdeen can carry 9 passengers with freight included in a single run."
 *   "No launch at Aberdeen carries 14 passengers with freight in a single run —
 *    Granite Runner (12) needs 2 runs for 14 passengers; Torry Tern (8) needs 2 runs
 *    for 14 passengers and does not carry freight."
 */
export function planSummary(
  list: readonly Supplier[],
  port: string,
  pax: number,
  needsFreight: boolean,
): string {
  const launches = launchesAt(list, port);
  if (launches.length === 0) return `No launches are listed at ${port}.`;
  const fitting = launches.filter((s) => fitsRun(s.launch, pax, needsFreight) === 'fits');
  if (fitting.length > 0) {
    const n = fitting.length;
    return `${n} ${n === 1 ? 'launch' : 'launches'} at ${port} can carry ${paxPhrase(pax)}${
      needsFreight ? ' with freight included' : ''
    } in a single run.`;
  }
  const detail = launches.map((s) => describeFit(s.launch, pax, needsFreight)).join('; ');
  return `No launch at ${port} carries ${paxPhrase(pax)}${
    needsFreight ? ' with freight' : ''
  } in a single run — ${detail}.`;
}
