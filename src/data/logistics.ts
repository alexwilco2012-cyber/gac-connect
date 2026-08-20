import type { Consignment, ConsignmentForm } from '../lib/logistics';

/**
 * Logistics screen copy and demo data. All illustrative and deliberately
 * fictional — the movements below are examples of the shape a consignment
 * takes, not a record of anything.
 */

/** The delivery points offered on the booking form — berths and the warehouse. */
export const DELIVERY_POINTS = [
  'Aberdeen — Regent Quay',
  'Aberdeen — Torry Quay',
  'Aberdeen — GAC warehouse',
  'Peterhead — Smith Quay',
  'Montrose — South Quay',
] as const;

/** Collection points offered as examples; the field accepts anything typed. */
export const ORIGIN_EXAMPLES = [
  'Grangemouth',
  'Great Yarmouth',
  'Rotterdam',
  'Stavanger',
  'Houston',
] as const;

export const LOGISTICS_INTRO =
  'A movement booked here is booked against a port call, so the platform already knows the vessel, the berth and the day the cargo is actually needed. Stages below are simulated in this proof of concept.';

/** Shown above the booking form. */
export const CONSIGNMENT_NOTICE =
  'Illustrative — the movements on this screen are examples, and no carrier is contacted.';

/** The customs cross-link, shown when a movement comes from outside the UK. */
export const CUSTOMS_POINTER =
  'Arriving from outside the UK, so it needs a customs entry. Raise it under Customs and the declaration is tied to this movement.';

/** Warehousing section — what the Aberdeen warehouse does for a call. */
export const WAREHOUSING = [
  {
    title: 'Received against the vessel, not against a date',
    body: 'Goods are booked in under the vessel and the call, so a delivery that arrives three weeks early is held rather than turned away.',
  },
  {
    title: 'Held until the berth is ready',
    body: 'Nothing sits on the quay waiting for a ship. The warehouse releases to the berth on the day, in the order the vessel wants it.',
  },
  {
    title: 'One party accountable to the gate',
    body: 'The same GAC job number covers the haulier, the warehouse and the quayside delivery, so a query has one place to go.',
  },
] as const;

/** Project cargo section — how an out-of-gauge move is planned. */
export const PROJECT_CARGO = [
  {
    title: 'Route survey first',
    body: 'The road is surveyed before the load is booked — bridges, roundabouts, overhead lines — and the abnormal-load notifications go in against that survey.',
  },
  {
    title: 'The lift is booked with the move',
    body: 'The crane at the berth is booked against the same call, so the load and the lift are one job rather than two bookings that have to find each other.',
  },
  {
    title: 'Customs planned, not discovered',
    body: 'A project moving from outside the UK has its entry prepared while the load is still on the road, so nothing waits at the gate for paperwork.',
  },
] as const;

const seed = (
  id: string,
  stage: Consignment['stage'],
  createdAt: string,
  form: ConsignmentForm,
): Consignment => ({ id, stage, createdAt, form });

/**
 * Two movements already running when the visitor arrives, so the screen shows
 * a line in progress rather than an empty state. One is a routine UK road
 * movement; the other comes from outside the UK and therefore carries the
 * customs cross-link.
 */
export const SEED_CONSIGNMENTS: Consignment[] = [
  seed('CN-2041', 'In transit', 'Mon 18 Aug · 08:15', {
    description: 'Deck spares and hose reels, 4 pallets',
    origin: 'Grangemouth',
    deliveryPoint: 'Aberdeen — GAC warehouse',
    vesselId: 'caledonian-star',
    mode: 'Road',
    readyDate: '18 Aug 2026',
    pieces: '4',
    weightKg: '1250',
    fromOutsideUk: false,
  }),
  seed('CN-2042', 'Booked', 'Tue 19 Aug · 14:40', {
    description: 'Replacement thruster seal kit, 1 crate',
    origin: 'Rotterdam',
    deliveryPoint: 'Aberdeen — Regent Quay',
    vesselId: 'granite-coast',
    mode: 'Sea',
    readyDate: '21 Aug 2026',
    pieces: '1',
    weightKg: '380',
    fromOutsideUk: true,
  }),
];

/** A blank booking form, pre-set to the commonest case. */
export const EMPTY_CONSIGNMENT: ConsignmentForm = {
  description: '',
  origin: '',
  deliveryPoint: DELIVERY_POINTS[0],
  vesselId: 'caledonian-star',
  mode: 'Road',
  readyDate: '',
  pieces: '',
  weightKg: '',
  fromOutsideUk: false,
};

/** The demo-fill button — a plausible movement, obviously an example. */
export const DEMO_CONSIGNMENT: ConsignmentForm = {
  description: 'Valve skid and fittings, 2 crates',
  origin: 'Stavanger',
  deliveryPoint: 'Aberdeen — Regent Quay',
  vesselId: 'caledonian-star',
  mode: 'Sea',
  readyDate: '26 Aug 2026',
  pieces: '2',
  weightKg: '860',
  fromOutsideUk: true,
};
