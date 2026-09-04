import type { CrewMember, Renewal } from '../lib/certification';

/**
 * Crew certification tracking — copy and demo data for the beta preview.
 *
 * Everything here is fictional and deliberately impersonal: crew appear as a
 * reference and a rank, never as a name, because a register of named
 * seafarers is personal data and a proof of concept has no business holding
 * it. Expiries are days from the demo's fixed today (Thursday 20 Aug 2026),
 * so the register reads the same at every showing.
 */

export const CERT_INTRO =
  'A working preview. Every credential below runs through the same expiry engine the SVS uses on supplier certificates — 90, 30 and 7-day alerts, and a lapse called a lapse. Filter the register, route a renewal, and follow it to the certificate coming back.';

/** Why there are no names on the screen — a product point, not a shortcut. */
export const NO_NAMES_NOTE =
  'Crew are shown by reference and rank. The preview holds no names, dates of birth or passport numbers: the tracking works on what expires and who holds it, and there is no reason to keep the rest.';

/** The boundary, printed on the screen rather than left implied. */
export const NOT_THE_AUTHORITY_NOTE =
  'The platform is not the authority on who may sail. It shows the operator what has gone and who holds it, early enough to book the course — the sailing decision stays with the master and the operator.';

/** Illustrative, and it says so wherever a figure or a stage appears. */
export const CERT_NOTICE =
  'Illustrative — the crew, the credentials and the training providers are fictional, and nothing here is submitted to a provider.';

/** What a lapse actually costs, and why the sweep bites at 30 days. */
export const SWEEP_NOTE =
  'A sweep routes everything lapsed or inside 30 days: 90 days is a warning, 30 is the point where a course has to be booked to land before the date. Renewals already routed are skipped, so a sweep can be run twice without raising the same course twice.';

/**
 * Training providers, by what they run. Fictional, and local to this preview —
 * training is not a marketplace category today, so nothing here implies a
 * vetted supplier exists behind it.
 */
export const PROVIDERS: readonly { name: string; runs: readonly string[] }[] = [
  {
    name: 'Granite City Survival Training',
    runs: ['BOSIET with CA-EBS', 'HUET', 'MIST', 'Sea survival'],
  },
  {
    name: 'Harbour Safety Academy',
    runs: [
      'STCW Basic Safety Training',
      'Advanced firefighting',
      'Confined space entry',
      'Rigging and slinging',
      'GWO Working at Height',
    ],
  },
  { name: 'Northern Marine Medicals', runs: ['ENG1 medical', 'Medical first aid'] },
];

/** The provider that runs a course; the survival school takes anything unmatched. */
export function providerFor(certName: string): string {
  const match = PROVIDERS.find((p) => p.runs.includes(certName));
  return match ? match.name : PROVIDERS[0]!.name;
}

/**
 * The seeded register: nine crew across the three demo vessels, with the
 * spread an operator actually sees — most in date, a handful inside the
 * horizon, one gone. MV Boreal carries the pressure, which is the same vessel
 * the dashboard already flags.
 */
export const SEED_CREW: CrewMember[] = [
  {
    id: 'crew-041',
    ref: 'Crew 041',
    rank: 'Master',
    vesselId: 'elan',
    certs: [
      { name: 'BOSIET with CA-EBS', daysToExpiry: 412 },
      { name: 'ENG1 medical', daysToExpiry: 96 },
      { name: 'STCW Basic Safety Training', daysToExpiry: 233 },
    ],
  },
  {
    id: 'crew-052',
    ref: 'Crew 052',
    rank: 'Chief Engineer',
    vesselId: 'elan',
    certs: [
      { name: 'BOSIET with CA-EBS', daysToExpiry: 74 },
      { name: 'ENG1 medical', daysToExpiry: 188 },
      { name: 'Confined space entry', daysToExpiry: 27 },
    ],
  },
  {
    id: 'crew-063',
    ref: 'Crew 063',
    rank: 'Able Seafarer',
    vesselId: 'elan',
    certs: [
      { name: 'HUET', daysToExpiry: 5 },
      { name: 'MIST', daysToExpiry: 141 },
      { name: 'Rigging and slinging', daysToExpiry: 302 },
    ],
  },
  {
    id: 'crew-074',
    ref: 'Crew 074',
    rank: 'Chief Officer',
    vesselId: 'boreal',
    certs: [
      { name: 'ENG1 medical', daysToExpiry: -6 },
      { name: 'BOSIET with CA-EBS', daysToExpiry: 158 },
      { name: 'Advanced firefighting', daysToExpiry: 61 },
    ],
  },
  {
    id: 'crew-085',
    ref: 'Crew 085',
    rank: 'Crane Operator',
    vesselId: 'boreal',
    certs: [
      { name: 'Rigging and slinging', daysToExpiry: 18 },
      { name: 'MIST', daysToExpiry: 84 },
      { name: 'HUET', daysToExpiry: 209 },
    ],
  },
  {
    id: 'crew-096',
    ref: 'Crew 096',
    rank: 'ETO',
    vesselId: 'boreal',
    certs: [
      { name: 'GWO Working at Height', daysToExpiry: 44 },
      { name: 'BOSIET with CA-EBS', daysToExpiry: 366 },
      { name: 'ENG1 medical', daysToExpiry: 271 },
    ],
  },
  {
    id: 'crew-107',
    ref: 'Crew 107',
    rank: 'Bosun',
    vesselId: 'granite-coast',
    certs: [
      { name: 'MIST', daysToExpiry: 121 },
      { name: 'Medical first aid', daysToExpiry: 29 },
      { name: 'HUET', daysToExpiry: 197 },
    ],
  },
  {
    id: 'crew-118',
    ref: 'Crew 118',
    rank: 'Second Engineer',
    vesselId: 'granite-coast',
    certs: [
      { name: 'ENG1 medical', daysToExpiry: 402 },
      { name: 'BOSIET with CA-EBS', daysToExpiry: 315 },
      { name: 'Confined space entry', daysToExpiry: 168 },
    ],
  },
  {
    id: 'crew-129',
    ref: 'Crew 129',
    rank: 'Deck Cadet',
    vesselId: 'granite-coast',
    certs: [
      { name: 'STCW Basic Safety Training', daysToExpiry: 88 },
      { name: 'Sea survival', daysToExpiry: 256 },
      { name: 'MIST', daysToExpiry: 430 },
    ],
  },
];

/**
 * One renewal already running when the visitor arrives, so the pipeline is
 * not an empty box — the same reason the logistics and customs screens are
 * seeded. It covers the credential the register shows at five days.
 */
export const SEED_RENEWALS: Renewal[] = [
  {
    id: 'CRT-2051',
    crewId: 'crew-063',
    crewRef: 'Crew 063',
    rank: 'Able Seafarer',
    vesselId: 'elan',
    certName: 'HUET',
    daysToExpiry: 5,
    provider: 'Granite City Survival Training',
    stage: 'Course booked',
    createdAt: 'Tue 18 Aug · 09:20',
    automatic: true,
  },
];
