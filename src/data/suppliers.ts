import type { Cert, GoldBandState } from '../lib/svs';

/**
 * Canonical mock suppliers — 03_COMMERCIAL_RULES §3.4. Fictional only;
 * never substitute real companies (07_GUARDRAILS).
 */

export type Esg = 'A' | 'B' | 'C';

export type Plan = 'free' | 'professional' | 'premium';

/** A short label/value pair rendered as a fact chip on the listing and profile. */
export interface ListingFact {
  label: string;
  value: string;
}

/**
 * Launch (crew boat / workboat) service details — the Launches tab (17 Aug
 * review): where the launch runs from, how many it carries, and whether
 * freight is included in the run. Ports are examples (Macduff, Aberdeen).
 */
export interface LaunchDetails {
  /** Home port the launch runs from, e.g. 'Aberdeen', 'Macduff'. */
  port: string;
  /** The launch's own name (fictional). */
  vesselName: string;
  /** Maximum passengers carried per run. */
  maxPassengers: number;
  /** Whether freight (deck cargo, stores) is included in the quoted run. */
  freightIncluded: boolean;
  /** What "freight included" means in practice — allowance, or the add-on basis. */
  freightNote: string;
  /** Typical transit to the anchorage / field, e.g. '25 min to Aberdeen anchorage'. */
  transit: string;
  /** Operating pattern, e.g. '24 h · 30 min notice'. */
  availability: string;
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  description: string;
  rating: number;
  /** Ratings actually submitted by agents and clients on completed jobs. */
  ratingCount: number;
  esg: Esg;
  certs: Cert[];
  promoted?: boolean;
  plan: Plan;
  /** GAC Gold Band audit tier — Premium only, earned not bought (lib/svs). */
  goldBand?: GoldBandState;
  /** When the Gold Band audit was last renewed (held) or is booked (scheduled). */
  goldBandDate?: string;
  /** Booking terms shown with the listing — e.g. a hotel's availability caveat. */
  bookingNote?: string;
  /** Extra facts shown as chips on the row and profile (capacity, freight, port…). */
  facts?: ListingFact[];
  /** Present on Launches suppliers — drives the Launches tab. */
  launch?: LaunchDetails;
  /** Fictional recent activity for the profile page. */
  recentJobs: string[];
}

export const CATEGORIES = [
  'All',
  'Cranes',
  'FLT',
  'Launches',
  'Taxis',
  'Haulage',
  'Medical',
  'Scaffolding',
  'Diving',
  'NDT',
  'Welding',
  'Catering',
  'Hotels',
  'Waste',
  'Bunkers',
] as const;

const fullCerts = (names: string[]): Cert[] => names.map((name) => ({ name, state: 'ok' }));

export const SUPPLIERS: Supplier[] = [
  {
    id: 'caledonia-lifting',
    name: 'Caledonia Lifting Ltd',
    category: 'Cranes',
    description: 'Mobile cranes to 130t, Aberdeen and Peterhead. Same-day mobilisation.',
    rating: 4.9,
    ratingCount: 127,
    esg: 'A',
    certs: fullCerts(['LOLER', 'Insurance', 'GWO']),
    plan: 'premium',
    goldBand: 'held',
    goldBandDate: 'Audit renewed May 2026',
    recentJobs: [
      'Crane hire — MV Caledonian Star, Aberdeen',
      'Heavy lift support — Browne Energy quayside works',
      'Lift plan and appointed person — Wilkinson Drilling mobilisation',
    ],
  },
  {
    id: 'north-sea-crane',
    name: 'North Sea Crane Co.',
    category: 'Cranes',
    description: 'Mobile and crawler cranes, lift planning, appointed person services.',
    rating: 4.7,
    ratingCount: 84,
    esg: 'B',
    certs: fullCerts(['LOLER', 'Insurance', 'GWO']),
    plan: 'professional',
    recentJobs: [
      'Crawler crane — Stronach Subsea spoolbase',
      'Quayside lifts — Grizzell Marine cargo runs',
    ],
  },
  {
    id: 'granite-cranes',
    name: 'Granite Cranes',
    category: 'Cranes',
    description: 'Mobile cranes to 110t, contract lift and CPA hire across the north-east.',
    rating: 4.5,
    ratingCount: 46,
    esg: 'B',
    certs: fullCerts(['LOLER', 'Insurance', 'GWO']),
    plan: 'free',
    recentJobs: ['Contract lift — Wilkinson Drilling laydown area'],
  },
  {
    id: 'quayside-forklift-hire',
    name: 'Quayside Forklift Hire',
    category: 'FLT',
    description:
      'Counterbalance and telehandler FLTs to 16t with operator, Aberdeen and Peterhead quaysides. Same-day where the plant is free.',
    rating: 4.5,
    ratingCount: 29,
    esg: 'B',
    certs: fullCerts(['LOLER', 'Insurance', 'Operator certificates']),
    plan: 'free',
    recentJobs: [
      'FLT with operator, 1 day — MV Caledonian Star stores load',
      'Telehandler hire — Grizzell Marine quayside laydown',
    ],
  },
  {
    id: 'granite-launches',
    name: 'Granite Launches',
    category: 'Launches',
    description:
      'Crew launch and workboat runs from Aberdeen to the anchorage and inshore fields. Crew, stores, and spares in one run.',
    rating: 4.7,
    ratingCount: 53,
    esg: 'B',
    certs: fullCerts(['Insurance', 'MCA workboat certificate', 'Crew STCW']),
    plan: 'professional',
    launch: {
      port: 'Aberdeen',
      vesselName: 'Granite Runner',
      maxPassengers: 12,
      freightIncluded: true,
      freightNote:
        'Deck cargo to 500 kg included in the run; pallets and stores above that quoted per lift.',
      transit: '25 min to Aberdeen anchorage',
      availability: '24 h · 1 h notice',
    },
    recentJobs: [
      'Crew change, 9 pax + stores — MV Caledonian Star at anchor',
      'Spares run — Wilkinson Drilling standby vessel',
    ],
  },
  {
    id: 'torry-workboats',
    name: 'Torry Workboats',
    category: 'Launches',
    description:
      'Small fast launch for crew transfers and pilot-style runs out of Aberdeen. Passengers and hand luggage only.',
    rating: 4.4,
    ratingCount: 27,
    esg: 'C',
    certs: fullCerts(['Insurance', 'MCA workboat certificate']),
    plan: 'free',
    launch: {
      port: 'Aberdeen',
      vesselName: 'Torry Tern',
      maxPassengers: 8,
      freightIncluded: false,
      freightNote:
        'Freight not included — hand luggage only; stores go by a separate workboat run, quoted per pallet.',
      transit: '20 min to Aberdeen anchorage',
      availability: '06:00–22:00 · 30 min notice',
    },
    recentJobs: ['Crew transfer, 6 pax — Grizzell Marine coaster at anchor'],
  },
  {
    id: 'deveron-launch-services',
    name: 'Deveron Launch Services',
    category: 'Launches',
    description:
      'Launch and workboat cover from Macduff for vessels working the Moray Firth. Crew, stores, and light spares.',
    rating: 4.6,
    ratingCount: 38,
    esg: 'B',
    certs: fullCerts(['Insurance', 'MCA workboat certificate', 'Crew STCW']),
    plan: 'professional',
    launch: {
      port: 'Macduff',
      vesselName: 'Deveron Lass',
      maxPassengers: 10,
      freightIncluded: true,
      freightNote: 'Stores and spares to 300 kg included; anything larger is a workboat quote.',
      transit: '40 min to the Moray Firth anchorages',
      availability: 'Daylight hours · 2 h notice',
    },
    recentJobs: [
      'Crew change, 8 pax — Stronach Subsea survey vessel off Macduff',
      'Stores run — MV Boreal at anchor',
    ],
  },
  {
    id: 'regent-quay-cars',
    name: 'Regent Quay Cars',
    category: 'Taxis',
    description:
      'Crew taxis and 8-seat minibuses between Aberdeen airport, the hotels, and the quay. Airport meet-and-greet timed to the tracked flight.',
    rating: 4.6,
    ratingCount: 112,
    esg: 'B',
    certs: fullCerts(['Insurance', 'Operator licence', 'Driver checks']),
    plan: 'professional',
    facts: [
      { label: 'Vehicles', value: 'Saloon · 8-seat minibus' },
      { label: 'Airport', value: 'Meet and greet, flight-tracked' },
      { label: 'Availability', value: '24 h' },
    ],
    bookingNote:
      'Airport pickups are timed to the tracked flight — a delay moves the pickup automatically, and the driver waits at arrivals.',
    recentJobs: [
      'Airport → Regent Quay, 6 crew — MV Caledonian Star on-signers',
      'Hotel → quay minibus — Grizzell Marine crew change',
    ],
  },
  {
    id: 'deveron-cabs',
    name: 'Deveron Cabs',
    category: 'Taxis',
    description:
      'Taxis and a minibus covering Macduff, Banff, and the run to and from Aberdeen airport for crews working the Moray Firth.',
    rating: 4.4,
    ratingCount: 39,
    esg: 'C',
    certs: fullCerts(['Insurance', 'Operator licence', 'Driver checks']),
    plan: 'free',
    facts: [
      { label: 'Vehicles', value: 'Saloon · 6-seat minibus' },
      { label: 'Airport', value: 'Aberdeen airport runs, flight-tracked' },
      { label: 'Availability', value: '05:00–23:00' },
    ],
    bookingNote:
      'Airport pickups are timed to the tracked flight — a delay moves the pickup automatically, and the driver waits at arrivals.',
    recentJobs: ['Airport → Macduff harbour, 4 crew — Stronach Subsea crew change'],
  },
  {
    id: 'formartine-freight',
    name: 'Formartine Freight Services',
    category: 'Haulage',
    description:
      'Curtainsiders and flatbeds between the central belt and the Aberdeen quays, with a nightly trunk run into the GAC warehouse.',
    rating: 4.7,
    ratingCount: 76,
    esg: 'B',
    certs: fullCerts(['Operator licence', 'Insurance', 'CMR cover']),
    plan: 'professional',
    facts: [
      { label: 'Fleet', value: 'Curtainsider · flatbed · van' },
      { label: 'Trunk run', value: 'Nightly, central belt → Aberdeen' },
      { label: 'Booking notice', value: '4 h for a same-day collection' },
    ],
    recentJobs: [
      'Spares collection, Grangemouth → GAC Aberdeen warehouse',
      'Quayside delivery, 6 pallets — MV Caledonian Star',
    ],
  },
  {
    id: 'mearns-heavy-transport',
    name: 'Mearns Heavy Transport',
    category: 'Haulage',
    description:
      'Low-loaders and escorted abnormal loads for project cargo, including route survey and lift liaison at the berth.',
    rating: 4.5,
    ratingCount: 31,
    esg: 'B',
    certs: [
      { name: 'Operator licence', state: 'ok' },
      { name: 'Insurance', state: 'ok' },
      { name: 'Abnormal load notifications', state: 'due', daysToExpiry: 24 },
    ],
    plan: 'free',
    facts: [
      { label: 'Fleet', value: 'Low-loader · step-frame · escort' },
      { label: 'Max load', value: '80 t, out of gauge' },
      { label: 'Notice', value: '5 working days for an escorted move' },
    ],
    recentJobs: ['Module move, Montrose → Aberdeen berth — Browne Energy project cargo'],
  },
  {
    id: 'aberdeen-offshore-medical',
    name: 'Aberdeen Offshore Medical',
    category: 'Medical',
    description: 'Offshore medics, topside support, OGUK medicals, emergency cover.',
    rating: 4.8,
    ratingCount: 93,
    esg: 'A',
    certs: fullCerts(['BOSIET', 'HUET', 'Medical certificates']),
    plan: 'professional',
    recentJobs: [
      'Medical cover — MV Caledonian Star port call',
      'Topside medic — Browne Energy shutdown',
    ],
  },
  {
    id: 'caledonia-scaffolding',
    name: 'Caledonia Scaffolding',
    category: 'Scaffolding',
    description: 'Quayside and onboard access scaffolding, inspection-tagged systems.',
    rating: 4.5,
    ratingCount: 31,
    esg: 'B',
    certs: fullCerts(['Insurance', 'Inspection records']),
    plan: 'free',
    recentJobs: ['Access scaffolding — MV Boreal, Peterhead'],
  },
  {
    id: 'granite-ndt',
    name: 'Granite NDT Ltd',
    category: 'NDT',
    description: 'UT, MPI, and radiographic testing. Offshore-certified technicians.',
    rating: 4.6,
    ratingCount: 58,
    esg: 'B',
    certs: [
      { name: 'Insurance', state: 'ok' },
      { name: 'GWO', state: 'due', daysToExpiry: 21 },
    ],
    plan: 'professional',
    recentJobs: ['Weld inspection — Stronach Subsea fabrication'],
  },
  {
    id: 'peterhead-diving',
    name: 'Peterhead Diving Services',
    category: 'Diving',
    description: 'Inshore commercial diving, hull inspection, prop clearance.',
    rating: 4.2,
    ratingCount: 19,
    esg: 'C',
    certs: [
      { name: 'HUET', state: 'ok' },
      { name: 'Insurance', state: 'lapsed' },
    ],
    plan: 'free',
    recentJobs: ['Hull inspection — Grizzell Marine coaster'],
  },
  {
    id: 'silver-city-welding',
    name: 'Silver City Welding',
    category: 'Welding',
    description: 'Coded welders, onboard fabrication and repair, 24/7 call-out.',
    rating: 4.4,
    ratingCount: 72,
    esg: 'B',
    certs: fullCerts(['Insurance', 'Coding certificates']),
    promoted: true,
    plan: 'premium',
    goldBand: 'scheduled',
    goldBandDate: 'Audit booked for September 2026',
    recentJobs: [
      'Onboard pipework repair — MV Granite Coast',
      'Fabrication — Wilkinson Drilling skid frames',
    ],
  },
  {
    id: 'quayside-catering',
    name: 'Quayside Catering Co.',
    category: 'Catering',
    description: 'Crew provisions and fresh catering, Aberdeen harbour delivery.',
    rating: 4.7,
    ratingCount: 64,
    esg: 'B',
    certs: fullCerts(['Insurance', 'Food hygiene certificates']),
    plan: 'free',
    recentJobs: ['Crew provisions — MV Caledonian Star'],
  },
  {
    id: 'granite-quay-hotel',
    name: 'Granite Quay Hotel',
    category: 'Hotels',
    description:
      'Crew accommodation five minutes from Regent Quay. 24-hour check-in, quiet rooms for off-signers and crew held ashore.',
    rating: 4.6,
    ratingCount: 88,
    esg: 'B',
    certs: fullCerts(['Insurance', 'Fire safety certificate', 'Food hygiene certificates']),
    plan: 'professional',
    bookingNote:
      'GAC rate is indicative and subject to availability. If the hotel is fully booked, your agent steps in to secure an alternative and confirms it on the platform.',
    recentJobs: [
      'Crew rooms, 2 nights — MV Caledonian Star off-signers',
      'Medical stand-down stay — Browne Energy crew member',
    ],
  },
  {
    id: 'caledonia-rooms',
    name: 'Caledonia Rooms',
    category: 'Hotels',
    description:
      'Budget crew rooms near the harbour, early breakfast from 05:00, secure kit storage for transit crews.',
    rating: 4.3,
    ratingCount: 41,
    esg: 'C',
    certs: fullCerts(['Insurance', 'Fire safety certificate']),
    plan: 'free',
    bookingNote:
      'GAC rate is indicative and subject to availability. If the hotel is fully booked, your agent steps in to secure an alternative and confirms it on the platform.',
    recentJobs: ['Transit crew, 1 night — Grizzell Marine crew change'],
  },
];

export function supplierById(id: string): Supplier | undefined {
  return SUPPLIERS.find((s) => s.id === id);
}

/** GAC in-house service lines — pinned above third-party where relevant. */
export interface InHouseLine {
  id: string;
  name: string;
  description: string;
  tierLabel: string;
}

export const IN_HOUSE_LINES: InHouseLine[] = [
  {
    id: 'gac-agency',
    name: 'GAC Agency',
    description:
      'Ship’s agent services, port calls, vessel support, crew coordination — your single point of contact.',
    tierLabel: '2% tier',
  },
  {
    id: 'gac-logistics',
    name: 'GAC Logistics',
    description:
      'Freight forwarding, warehousing, and project cargo, run alongside your agency work.',
    tierLabel: '4% tier',
  },
  {
    id: 'gac-customs',
    name: 'GAC Customs',
    description:
      'T1 transit, import and export clearance, and customs documentation, handled end-to-end in-house.',
    tierLabel: '7% tier',
  },
  {
    id: 'gac-assets',
    name: 'GAC Assets',
    description:
      'Fender hire, portable cabins, security fencing, and specialist equipment from GAC’s own pool.',
    tierLabel: 'Included at any tier',
  },
  {
    id: 'gac-procurement',
    name: 'GAC Procurement',
    description: 'Sourcing and purchasing support for consumables and project materials.',
    tierLabel: 'Included at any tier',
  },
];
