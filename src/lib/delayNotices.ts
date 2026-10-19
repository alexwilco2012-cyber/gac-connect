import type { TransferLeg } from './transfers';

/**
 * Delay notices — the other half of a flight-timed run (owner's FF06
 * proposal): when the feed reports a delay the platform re-times the legs
 * and tells every supplier on the run, and the client's GAC agent, what moved.
 *
 * The party list is read off the run's own legs (`TransferLeg.party`), never
 * written out as copy: a run with no launch tells no launch operator, a run
 * with no room that night tells no hotel. The agent is always told, against
 * the flight itself. Nothing is sent in this proof of concept; the screen
 * says so with `DELAY_NOTICE_NOTE`.
 */

export type NoticeParty = 'taxi' | 'launch' | 'hotel' | 'agent';

export interface DelayNotice {
  party: NoticeParty;
  /** What they are on the run, e.g. 'Taxi operator'. */
  role: string;
  /** Who was told, e.g. 'Regent Quay Cars'. */
  name: string;
  /** The leg the notice is about, as the plan labels it. */
  leg: string;
  /** Booked time for that leg (HH:MM). */
  from: string;
  /** Re-timed (HH:MM). */
  to: string;
  /** When the notice went out (HH:MM). */
  notifiedAt: string;
}

/** The names the run's legs point at. Launch and hotel are null when the run has none. */
export interface RunParties {
  taxi: string;
  launch?: string | null;
  hotel?: string | null;
}

/** Who the agent line names — never a person. */
export const AGENT_NAME = 'Your GAC agent';

export const PARTY_ROLE: Record<NoticeParty, string> = {
  taxi: 'Taxi operator',
  launch: 'Launch operator',
  hotel: 'Hotel',
  agent: 'Agent',
};

/** Order the parties are listed in: the suppliers in run order, then the agent. */
const SUPPLIER_PARTIES = ['taxi', 'launch', 'hotel'] as const;

/** One line of honesty under the notices, in the flight feed note's style. */
export const DELAY_NOTICE_NOTE =
  'Illustrative — these notices are simulated here and nothing is sent. In production the platform messages each supplier on the run and your GAC agent as soon as the feed reports a delay, and again if it changes.';

/** 'HH:MM' from a clock reading, for the notified stamp. */
export function clockTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * One notice per party on the run, each with its own leg's booked time and
 * the re-timed one. `booked` is the run as planned on time and `current` the
 * same run re-timed to the estimate — the same inputs bar the delay, so legs
 * pair up by party. Empty when nothing moved (no delay, or the delay removed).
 */
export function delayNotices(
  booked: readonly TransferLeg[],
  current: readonly TransferLeg[],
  parties: RunParties,
  notifiedAt: string,
): DelayNotice[] {
  const moved = current.some((leg, i) => booked[i] && booked[i]!.time !== leg.time);
  if (!moved) return [];
  const notices: DelayNotice[] = [];
  for (const party of SUPPLIER_PARTIES) {
    const name = parties[party];
    if (!name) continue;
    const now = current.find((l) => l.party === party);
    const was = booked.find((l) => l.party === party);
    if (!now || !was) continue;
    notices.push({
      party,
      role: PARTY_ROLE[party],
      name,
      leg: now.label,
      from: was.time,
      to: now.time,
      notifiedAt,
    });
  }
  const flightNow = current.find((l) => l.party === 'flight');
  const flightWas = booked.find((l) => l.party === 'flight');
  if (flightNow && flightWas) {
    // The flight leads an arriving run and closes a departing one.
    const whole =
      current.indexOf(flightNow) === 0 ? 'and every leg after it' : 'and every leg before it';
    notices.push({
      party: 'agent',
      role: PARTY_ROLE.agent,
      name: AGENT_NAME,
      leg: `${flightNow.label}, ${whole}`,
      from: flightWas.time,
      to: flightNow.time,
      notifiedAt,
    });
  }
  return notices;
}

/** 'ZZ417 delayed 40 min — 3 parties told, each with the new time for their own leg.' */
export function delayNoticeSummary(flight: string, delayMin: number, count: number): string {
  return `${flight} delayed ${delayMin} min — ${count} ${count === 1 ? 'party' : 'parties'} told, each with the new time for their own leg.`;
}
