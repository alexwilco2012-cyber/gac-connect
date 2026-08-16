import type { Cert, GoldBandState } from '../lib/svs';

/**
 * Canonical mock suppliers — 03_COMMERCIAL_RULES §3.4. Fictional only;
 * never substitute real companies (07_GUARDRAILS).
 */

export type Esg = 'A' | 'B' | 'C';

export type Plan = 'free' | 'professional' | 'premium';

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
  /** Fictional recent activity for the profile page. */
  recentJobs: string[];
}

export const CATEGORIES = [
  'All',
  'Cranes',
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
