import type { LoiForm, RepatForm } from '../lib/crewChange';
import { VESSELS } from './vessels';

/**
 * Crew change screen copy and demo data (17 Aug 2026 review). All illustrative
 * and deliberately fictional — the demo forms carry obviously fake passport
 * details, and the screen tells the user not to enter real ones.
 */

export type CrewSectionId = 'hotels' | 'taxis' | 'launches' | 'immigration' | 'loi' | 'repat';

export interface CrewSection {
  id: CrewSectionId;
  label: string;
  /** One-line summary shown under the section strip. */
  summary: string;
}

export const CREW_SECTIONS: CrewSection[] = [
  {
    id: 'hotels',
    label: 'Hotels',
    summary: 'Rooms for crew held ashore — off-signers, transit crews, medical stand-downs.',
  },
  {
    id: 'taxis',
    label: 'Taxis',
    summary:
      'Airport, hotel and quay runs, timed to the crew member’s tracked flight when you give us the flight number.',
  },
  {
    id: 'launches',
    label: 'Launches',
    summary:
      'Crew, stores and light freight out to vessels at anchor — capacity and whether freight is included, launch by launch, port by port.',
  },
  {
    id: 'immigration',
    label: 'Immigration',
    summary: 'What your GAC agent needs before any letter goes out, and what GAC does not do.',
  },
  {
    id: 'loi',
    label: 'LOI (on-signers)',
    summary:
      'Immigration Support Letter for a visa-national crew member joining through the UK — issued and signed by GAC as agents.',
  },
  {
    id: 'repat',
    label: 'Repat letters (off-signers)',
    summary:
      'Disembarkation / repatriation letter for a crew member leaving through the UK — prepared by GAC, endorsed by UK Border Force.',
  },
];

/** Ports the letters cover in this proof of concept. */
export const CREW_PORTS = ['Aberdeen', 'Peterhead', 'Montrose'] as const;

/** Shown above both templates. */
export const ILLUSTRATIVE_NOTICE =
  'Illustrative — do not enter real passport data in this proof of concept.';

/** How the letters flow — three cards under the header. */
export const CREW_FLOW = [
  {
    title: 'The platform holds the templates',
    body: 'One template per letter, kept current by GAC. You never start from a blank page or an old email attachment.',
  },
  {
    title: 'You fill them in',
    body: 'One letter per crew member, details as printed in the passport, vessel and port as on the call, flights as on the itinerary.',
  },
  {
    title: 'GAC endorses or routes, then returns',
    body: 'LOIs are signed by GAC as agents and sent back. Repatriation letters go to UK Border Force for endorsement and come back endorsed.',
  },
] as const;

/** Taxis section — copy for the flight-timed planner. */
export const TAXIS_INTRO =
  'Give us the flight number and the platform tracks the flight and times the transport to it: the taxi meets the crew at arrivals, the launch leaves the quay when they get there, and a delay moves the whole chain — no phone calls.';

/** Taxis → Launches: the planner times the launch leg, the operators live elsewhere. */
export const TAXIS_LAUNCH_POINTER =
  'The planner times the launch leg with the taxi. The launch operators themselves — capacity, freight and port notes — are under Launches.';

/** Launches → Taxis: the reciprocal pointer, so a run can be hung off the flight. */
export const LAUNCHES_TAXI_POINTER =
  'A run can be timed to the crew member’s tracked flight — the planner under Taxis times the taxi and the launch to the same flight.';

/** Which section the screen opens on when the URL carries no ?section=. */
export const DEFAULT_CREW_SECTION: CrewSectionId = 'hotels';

export function isCrewSectionId(v: string | null | undefined): v is CrewSectionId {
  return !!v && CREW_SECTIONS.some((s) => s.id === v);
}

/**
 * Section ids that have been renamed. A link minted before taxis and launches
 * were split (`?section=transfers`) still lands somewhere sensible instead of
 * silently dropping the visitor on Hotels.
 */
export const RETIRED_CREW_SECTIONS: Record<string, CrewSectionId> = { transfers: 'taxis' };

/** The section a URL asks for: current id, retired id, or the default. */
export function resolveCrewSection(v: string | null | undefined): CrewSectionId {
  if (isCrewSectionId(v)) return v;
  if (v && RETIRED_CREW_SECTIONS[v]) return RETIRED_CREW_SECTIONS[v];
  return DEFAULT_CREW_SECTION;
}

/** Immigration guidance — the checklist the client works through first. */
export const IMMIGRATION_CHECKLIST = [
  {
    title: 'Visa national, or EEA / visa-waiver?',
    body: 'An LOI is only needed for visa-national crew. EEA and visa-waiver nationals travel without one — settle this before anything else.',
  },
  {
    title: 'Passport validity against the travel dates',
    body: 'The passport must be valid for the whole transit and beyond the joining date. An expiry close to the travel dates is a question for the owner, not for the letter.',
  },
  {
    title: 'Details from the passport itself',
    body: 'Family name, forenames, date of birth, nationality and passport number exactly as printed — never retyped from a crew list.',
  },
  {
    title: 'Vessel name and port as on the call',
    body: 'The letter names the vessel and the port where the crew member joins or leaves, matching the port call on the platform.',
  },
  {
    title: 'Flights as on the itinerary',
    body: 'The arriving flight into the UK for an on-signer; the repatriation flights out for an off-signer — as booked, not as planned.',
  },
  {
    title: 'One letter per crew member',
    body: 'Always. A shared letter for a group is not accepted and slows everyone down at the desk.',
  },
] as const;

/** LOI, never OKTB — in plain words. */
export const LOI_NOT_OKTB =
  'GAC issues an Immigration Support Letter — a letter of invitation, the LOI — and signs it as agents. GAC does not issue OKTB (“OK to board”) letters: that would take on carrier-style liability. The LOI is what UK carriers and Border Force accept for a visa-national crew member transiting to join.';

/** Informs, not advises. */
export const INFORMS_NOT_ADVISES =
  'Right of entry is distinct from permission to work aboard inside 12 nautical miles. GAC informs, it does not advise — compliance determinations rest with owners and the attending authorities.';

/** Shown on the LOI form when the visa-national toggle is off. */
export const LOI_NOT_REQUIRED_NOTE =
  'No LOI is required for EEA or visa-waiver nationals. Switch the toggle back on for a visa-national crew member.';

/** Repat — what UKBF endorsement means for the off-signer. */
export const REPAT_INTRO =
  'UK Border Force endorses the disembarkation letter as written leave to enter, so the crew member can travel home through the UK. GAC prepares it from your template, sends it to UKBF for endorsement and returns the endorsed letter to you.';

/** The Yes/No question every repatriation letter must answer. */
export const REPAT_QUESTION =
  'Did the crew member join the vessel outside the UK, or has the vessel called at any non-UK port since they joined?';

/** What happens at each stage — one line for the tracker. */
export const STAGE_NOTES: Record<string, string> = {
  'Submitted by client': 'Template completed on the platform.',
  'GAC checking': 'Details checked against the passport; vessel checked against the registry.',
  'Endorsed by GAC — signed as agents': 'Letter issued and signed by your GAC agent, as agents.',
  'Prepared by GAC': 'Letter prepared from your template by your GAC agent.',
  'Sent to UK Border Force for endorsement': 'With UKBF for endorsement as written leave to enter.',
  'Endorsed by UKBF': 'Endorsed by UK Border Force.',
  'Returned to client': 'Endorsed letter back with you.',
};

const DEMO_VESSEL = VESSELS[0]!;

/** Obviously fictional prefill for the LOI template. */
export const LOI_DEMO_FORM: LoiForm = {
  familyName: 'Demo',
  forenames: 'Crew Member',
  nationality: 'Demo nationality',
  dateOfBirth: '01/01/1990',
  passportNumber: 'X0000000',
  passportExpiry: '01/01/2030',
  vesselId: DEMO_VESSEL.id,
  port: DEMO_VESSEL.port,
  joiningDate: '22/08/2026',
  arrivingFlight: 'XX 000 · arriving Aberdeen 22/08/2026 14:35',
  visaNational: true,
};

/** Obviously fictional prefill for the repatriation-letter template. */
export const REPAT_DEMO_FORM: RepatForm = {
  familyName: 'Demo',
  forenames: 'Crew Member',
  dateOfBirth: '01/01/1990',
  nationality: 'Demo nationality',
  passportNumber: 'X0000000',
  vesselId: DEMO_VESSEL.id,
  port: DEMO_VESSEL.port,
  disembarkationDate: '22/08/2026',
  joinedOutsideUk: '',
  flights: ['XX 001 · Aberdeen → London 23/08/2026 07:10', '', ''],
};
