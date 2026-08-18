import type { LaunchDetails } from '../data/suppliers';

/**
 * Flight-timed transfers — the crew-change transport leg (17 Aug review,
 * owner's follow-up): taxis and launches sit inside Crew change, and if the
 * client gives the crew member's flight number the platform tracks the
 * flight and times the transport to it. Arriving on-signers: flight lands →
 * taxi from the airport → quay → launch to the vessel. Departing off-signers:
 * launch from the vessel → quay → taxi to the airport, back from the check-in
 * deadline. A delay re-times every leg from the new estimate.
 *
 * There is no live feed in this proof of concept: `trackFlight` looks a
 * flight up in a small illustrative table and a "delay" is applied on demand.
 * In production the estimate comes from a flight-status feed (Skyscanner-style
 * or an airline/airport status API); the timing rules below do not change.
 */

/**
 * Ports a taxi run can serve. Taxis stand on their own (owner's follow-up):
 * they cover every port the letters cover plus the launch ports, so the
 * planner is not limited to the two ports that happen to have a launch.
 */
export const TRANSFER_PORTS = ['Aberdeen', 'Peterhead', 'Montrose', 'Macduff'] as const;

export type Direction = 'arriving' | 'departing';

export type FlightPhase = 'scheduled' | 'in-air' | 'delayed' | 'landed';

export interface FlightStatus {
  /** Normalised flight number, e.g. 'ZZ417'. */
  flight: string;
  /** Human route line, e.g. 'Amsterdam → Aberdeen'. */
  route: string;
  /** For arrivals the scheduled landing; for departures the scheduled take-off. HH:MM. */
  scheduled: string;
  /** Live estimate — scheduled plus any delay. HH:MM. */
  estimated: string;
  delayMin: number;
  phase: FlightPhase;
  direction: Direction;
}

/** Illustrative flights — the demo's flight-status "feed". Fictional flight numbers. */
export const DEMO_FLIGHTS: Record<
  string,
  Omit<FlightStatus, 'estimated' | 'delayMin' | 'phase'>
> = {
  ZZ417: {
    flight: 'ZZ417',
    route: 'Amsterdam → Aberdeen',
    scheduled: '13:55',
    direction: 'arriving',
  },
  ZZ122: {
    flight: 'ZZ122',
    route: 'London Heathrow → Aberdeen',
    scheduled: '09:40',
    direction: 'arriving',
  },
  ZZ204: {
    flight: 'ZZ204',
    route: 'Aberdeen → Amsterdam',
    scheduled: '17:10',
    direction: 'departing',
  },
  ZZ131: {
    flight: 'ZZ131',
    route: 'Aberdeen → London Heathrow',
    scheduled: '19:25',
    direction: 'departing',
  },
};

/** Where the estimate comes from — one line of honesty on the screen. */
export const FLIGHT_FEED_NOTE =
  'Illustrative — flight status is simulated here. In production the estimate comes from a live flight-status feed (Skyscanner-style, or the airport’s own status API) and the transport re-times itself.';

/** Timing rules, in minutes. Illustrative but sensible; a production platform reads them from client policy. */
export const TRANSFER_BUFFERS = {
  /** Landing → bags, immigration, out to the taxi. */
  bagsAndImmigrationMin: 40,
  /** Airport ↔ quay by road, from Aberdeen airport. Illustrative. */
  taxiMin: { Aberdeen: 25, Peterhead: 55, Montrose: 60, Macduff: 75 } as Record<string, number>,
  /** Quay handover, kit onto the launch. */
  quayHandoverMin: 20,
  /** Off-signers: be at the airport this long before departure. */
  checkInBeforeDepartureMin: 120,
  /** Illustrative delay for the "Simulate" button. */
  simulatedDelayMin: 40,
} as const;

/** 'ZZ 417' / 'zz417' / ' Zz-417 ' → 'ZZ417'. */
export function normaliseFlightNo(input: string): string {
  return input.replace(/[^a-z0-9]/gi, '').toUpperCase();
}

/** HH:MM plus minutes, wrapping past midnight. */
export function addMinutes(hhmm: string, minutes: number): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return hhmm;
  const total = (((Number(m[1]) * 60 + Number(m[2]) + Math.round(minutes)) % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Look a flight up in the feed and apply a delay; null when the feed does not know it. */
export function trackFlight(flightNo: string, delayMin = 0): FlightStatus | null {
  const key = normaliseFlightNo(flightNo);
  const base = DEMO_FLIGHTS[key];
  if (!base) return null;
  const delay = Math.max(0, Math.round(delayMin));
  const phase: FlightPhase =
    delay > 0 ? 'delayed' : base.direction === 'arriving' ? 'in-air' : 'scheduled';
  return { ...base, estimated: addMinutes(base.scheduled, delay), delayMin: delay, phase };
}

/** Minutes of launch transit parsed from a LaunchDetails.transit like '25 min to Aberdeen anchorage'. */
export function launchTransitMin(
  launch: Pick<LaunchDetails, 'transit'> | null | undefined,
): number {
  if (!launch) return 0;
  const m = /(\d+)\s*min/i.exec(launch.transit);
  return m ? Number(m[1]) : 30;
}

export interface TransferLeg {
  label: string;
  time: string;
  note?: string;
}

export interface TransferPlan {
  direction: Direction;
  legs: TransferLeg[];
  /** One sentence for the toast / summary. */
  summary: string;
}

/**
 * Arriving on-signers: land → taxi → quay → launch → vessel.
 * Departing off-signers: vessel → launch → quay → taxi → airport by the check-in deadline.
 * `launch` is null when the vessel is alongside (no launch leg).
 */
export function planTransfers(
  status: FlightStatus,
  port: string,
  launch: Pick<LaunchDetails, 'transit' | 'vesselName'> | null,
): TransferPlan {
  const taxi = TRANSFER_BUFFERS.taxiMin[port] ?? 30;
  const transit = launchTransitMin(launch);
  if (status.direction === 'arriving') {
    const pickup = addMinutes(status.estimated, TRANSFER_BUFFERS.bagsAndImmigrationMin);
    const quay = addMinutes(pickup, taxi);
    const legs: TransferLeg[] = [
      {
        label: 'Flight lands',
        time: status.estimated,
        note: status.delayMin ? `delayed ${status.delayMin} min` : 'on time',
      },
      {
        label: 'Taxi pickup at arrivals',
        time: pickup,
        note: `${TRANSFER_BUFFERS.bagsAndImmigrationMin} min for bags and immigration`,
      },
      { label: `Arrive at the quay, ${port}`, time: quay, note: `${taxi} min by road` },
    ];
    if (launch) {
      const dep = addMinutes(quay, TRANSFER_BUFFERS.quayHandoverMin);
      legs.push({
        label: `Launch departs (${launch.vesselName})`,
        time: dep,
        note: `${TRANSFER_BUFFERS.quayHandoverMin} min quay handover`,
      });
      legs.push({
        label: 'Alongside the vessel',
        time: addMinutes(dep, transit),
        note: `${transit} min transit`,
      });
    } else {
      legs.push({ label: 'Board the vessel alongside', time: quay });
    }
    return {
      direction: 'arriving',
      legs,
      summary: `Taxi pickup ${pickup} at arrivals, timed to ${status.flight} (${status.estimated}${status.delayMin ? `, delayed ${status.delayMin} min` : ''})${launch ? `; launch ${launch.vesselName} ${legs[3]!.time} from the quay` : ''}.`,
    };
  }
  // Departing — work back from the check-in deadline.
  const atAirport = addMinutes(status.estimated, -TRANSFER_BUFFERS.checkInBeforeDepartureMin);
  const taxiPickup = addMinutes(atAirport, -taxi);
  const legs: TransferLeg[] = [];
  if (launch) {
    const quayArrive = addMinutes(taxiPickup, -TRANSFER_BUFFERS.quayHandoverMin);
    const launchDep = addMinutes(quayArrive, -transit);
    legs.push({
      label: `Launch leaves the vessel (${launch.vesselName})`,
      time: launchDep,
      note: `${transit} min transit`,
    });
    legs.push({
      label: `Ashore at the quay, ${port}`,
      time: quayArrive,
      note: `${TRANSFER_BUFFERS.quayHandoverMin} min quay handover`,
    });
  } else {
    legs.push({ label: `Leave the vessel alongside, ${port}`, time: taxiPickup });
  }
  legs.push({ label: 'Taxi pickup at the quay', time: taxiPickup, note: `${taxi} min by road` });
  legs.push({
    label: 'At the airport',
    time: atAirport,
    note: `${TRANSFER_BUFFERS.checkInBeforeDepartureMin} min before departure`,
  });
  legs.push({
    label: 'Flight departs',
    time: status.estimated,
    note: status.delayMin ? `delayed ${status.delayMin} min` : 'on time',
  });
  return {
    direction: 'departing',
    legs,
    summary: `${launch ? `Launch ${launch.vesselName} leaves the vessel ${legs[0]!.time}; ` : ''}taxi ${taxiPickup} from the quay for ${status.flight} departing ${status.estimated}${status.delayMin ? ` (delayed ${status.delayMin} min)` : ''}.`,
  };
}
