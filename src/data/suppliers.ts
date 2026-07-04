import type { Cert } from '../lib/svs';

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
  esg: Esg;
  certs: Cert[];
  promoted?: boolean;
  plan: Plan;
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
    esg: 'A',
    certs: fullCerts(['LOLER', 'Insurance', 'GWO']),
    plan: 'professional',
    recentJobs: [
      'Crane hire — MV Caledonian Star, Aberdeen',
      'Heavy lift support — Northmoor Energy quayside works',
      'Lift plan and appointed person — Fairhaven Drilling mobilisation',
    ],
  },
  {
    id: 'north-sea-crane',
    name: 'North Sea Crane Co.',
    category: 'Cranes',
    description: 'Mobile and crawler cranes, lift planning, appointed person services.',
    rating: 4.7,
    esg: 'B',
    certs: fullCerts(['LOLER', 'Insurance', 'GWO']),
    plan: 'professional',
    recentJobs: [
      'Crawler crane — Brinmore Subsea spoolbase',
      'Quayside lifts — Solway Marine cargo runs',
    ],
  },
  {
    id: 'granite-cranes',
    name: 'Granite Cranes',
    category: 'Cranes',
    description: 'Mobile cranes to 110t, contract lift and CPA hire across the north-east.',
    rating: 4.5,
    esg: 'B',
    certs: fullCerts(['LOLER', 'Insurance', 'GWO']),
    plan: 'free',
    recentJobs: ['Contract lift — Fairhaven Drilling laydown area'],
  },
  {
    id: 'aberdeen-offshore-medical',
    name: 'Aberdeen Offshore Medical',
    category: 'Medical',
    description: 'Offshore medics, topside support, OGUK medicals, emergency cover.',
    rating: 4.8,
    esg: 'A',
    certs: fullCerts(['BOSIET', 'HUET', 'Medical certificates']),
    plan: 'professional',
    recentJobs: [
      'Medical cover — MV Caledonian Star port call',
      'Topside medic — Northmoor Energy shutdown',
    ],
  },
  {
    id: 'caledonia-scaffolding',
    name: 'Caledonia Scaffolding',
    category: 'Scaffolding',
    description: 'Quayside and onboard access scaffolding, inspection-tagged systems.',
    rating: 4.5,
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
    esg: 'B',
    certs: [
      { name: 'Insurance', state: 'ok' },
      { name: 'GWO', state: 'due', daysToExpiry: 21 },
    ],
    plan: 'professional',
    recentJobs: ['Weld inspection — Brinmore Subsea fabrication'],
  },
  {
    id: 'peterhead-diving',
    name: 'Peterhead Diving Services',
    category: 'Diving',
    description: 'Inshore commercial diving, hull inspection, prop clearance.',
    rating: 4.2,
    esg: 'C',
    certs: [
      { name: 'HUET', state: 'ok' },
      { name: 'Insurance', state: 'lapsed' },
    ],
    plan: 'free',
    recentJobs: ['Hull inspection — Solway Marine coaster'],
  },
  {
    id: 'silver-city-welding',
    name: 'Silver City Welding',
    category: 'Welding',
    description: 'Coded welders, onboard fabrication and repair, 24/7 call-out.',
    rating: 4.4,
    esg: 'B',
    certs: fullCerts(['Insurance', 'Coding certificates']),
    promoted: true,
    plan: 'premium',
    recentJobs: [
      'Onboard pipework repair — MV Granite Coast',
      'Fabrication — Fairhaven Drilling skid frames',
    ],
  },
  {
    id: 'quayside-catering',
    name: 'Quayside Catering Co.',
    category: 'Catering',
    description: 'Crew provisions and fresh catering, Aberdeen harbour delivery.',
    rating: 4.7,
    esg: 'B',
    certs: fullCerts(['Insurance', 'Food hygiene certificates']),
    plan: 'free',
    recentJobs: ['Crew provisions — MV Caledonian Star'],
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
