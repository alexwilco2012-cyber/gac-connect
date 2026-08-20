import { TIERS } from '../lib/tier';

/**
 * Service lines — the shape of the platform navigation.
 *
 * The nav used to be flat: Crew change, Procurement, Bunkers and Certification
 * sat as peers of Invoices and SVS, which mixed a workflow, a commodity, a
 * record and a trust system in one row, and left nowhere to put the services
 * still to come. It is now grouped the way GAC sells and invoices — Agency,
 * Logistics, Customs, Procurement — so the tabs and the tier discount
 * (2 / 4 / 7, non-cumulative) finally describe the same thing. Customs keeps
 * its own tab rather than folding into Logistics precisely so the 2·4·7 reads
 * straight off the navigation.
 *
 * Two rules hold every hub together, and both are printed on the page because
 * an unstated rule reads as a bug:
 *
 *  · **Marketplace lists who is vetted; a service line lists what you can ask
 *    for.** The same supplier appears in both — one is the directory, the other
 *    is the job.
 *  · **Every service says who performs it.** `gac` is GAC's own people and
 *    equipment and carries the line's tier discount; `network` is an
 *    SVS-vetted supplier, booked through GAC and accountable through GAC, and
 *    is not discounted. Blurring the two would blur the tier story.
 *
 * All copy and data here is illustrative.
 */

export type ServiceLineId = 'agency' | 'logistics' | 'customs' | 'procurement';

/** Who actually performs the service. */
export type Provision = 'gac' | 'network';

export const PROVISION_LABEL: Record<Provision, string> = {
  gac: '★ GAC service',
  network: '◇ GAC network',
};

/** The key printed under every hub's services grid. */
export const PROVISION_KEY =
  'GAC service — GAC’s own people and equipment, and the charges the tier discount applies to. GAC network — an SVS-vetted supplier, booked through GAC and accountable through GAC.';

/** Why a hub is not a second copy of the marketplace. */
export const DIRECTORY_POINTER =
  'The marketplace lists who is vetted. This page lists what you can ask for.';

/**
 * What happens when a client engages a GAC in-house service that has no
 * separate screen. Same wording as the marketplace's in-house action: the
 * request lands with the agent the client already has, not in a new queue.
 */
export const AGENT_ENGAGED =
  'request sent to your GAC agent, surfaced inside the existing relationship, not a new queue.';

/** What a service card does when the client acts on it. */
export type LineAction =
  /** Opens a screen — the service already has working software behind it. */
  | { kind: 'link'; label: string; to: string }
  /** Opens the shared request modal for a marketplace category. */
  | { kind: 'request'; label: string; category: string; service?: string }
  /** GAC in-house with no separate screen: it goes to the client's own agent. */
  | { kind: 'agent'; label: string };

export interface LineService {
  id: string;
  label: string;
  body: string;
  provision: Provision;
  /** Beta services carry the scope banner on their own screen. */
  beta?: boolean;
  action: LineAction;
}

/** A section of a hub that holds working software (chips under the services grid). */
export interface LineSection {
  id: string;
  label: string;
  summary: string;
}

export interface ServiceLine {
  id: ServiceLineId;
  /** Nav label. */
  label: string;
  /** Full name as invoiced — 'GAC Agency'. */
  name: string;
  to: string;
  headline: string;
  intro: string;
  /** Tier percentage for the line, or null where the line is included at any tier. */
  tierPct: number | null;
  tierLabel: string;
  /** Marketplace categories this line coordinates. Empty where the line is GAC-only. */
  categories: readonly string[];
  /** Shown in place of the supplier strip when the line has no network layer. */
  noNetworkNote?: string;
  services: LineService[];
  sections?: LineSection[];
}

export const SERVICE_LINES: ServiceLine[] = [
  {
    id: 'agency',
    label: 'Agency',
    name: 'GAC Agency',
    to: '/app/agency',
    headline: 'The port call, end to end',
    intro:
      'Everything that happens between arrival and departure: the berth, the crew, the paperwork and the quayside services the call needs. GAC is the ship’s agent; the marketplace supplies the quay.',
    tierPct: TIERS.agency,
    tierLabel: `${TIERS.agency}% tier`,
    categories: [
      'Cranes',
      'FLT',
      'Launches',
      'Taxis',
      'Hotels',
      'Medical',
      'Scaffolding',
      'Diving',
      'NDT',
      'Welding',
      'Catering',
      'Waste',
      'Bunkers',
    ],
    services: [
      {
        id: 'crew-change',
        label: 'Crew change',
        body: 'Hotels, taxis, launches, immigration guidance and the two letters — an Immigration Support Letter for each on-signer, a repatriation letter for each off-signer.',
        provision: 'gac',
        action: { kind: 'link', label: 'Open crew change', to: '/app/agency/crew-change' },
      },
      {
        id: 'port-call',
        label: 'Port call and berth booking',
        body: 'Nomination, berth booking, pilotage and towage ordered against the call, port dues, and the call file the invoice is later checked against.',
        provision: 'gac',
        action: { kind: 'agent', label: 'Engage service' },
      },
      {
        id: 'husbandry',
        label: 'Husbandry and vessel support',
        body: 'Cash to master, mail and spares to the quay, provisions ordered against the call, and the run ashore that goes with each of them.',
        provision: 'gac',
        action: { kind: 'agent', label: 'Engage service' },
      },
      {
        id: 'fender-hire',
        label: 'Fender hire and site equipment',
        body: 'Fenders, portable cabins, security fencing and specialist equipment from GAC’s own pool, delivered to the berth.',
        provision: 'gac',
        action: { kind: 'agent', label: 'Engage service' },
      },
      {
        id: 'quayside',
        label: 'Quayside services',
        body: 'Cranes, forklifts, scaffolding, waste, welding, diving and NDT from SVS-vetted suppliers — quoted against the deadline you set, booked through your agent.',
        provision: 'network',
        action: { kind: 'link', label: 'Browse suppliers', to: '/app/marketplace?category=Cranes' },
      },
      {
        id: 'certification',
        label: 'Crew certification tracking',
        body: 'Credentials held at vessel level with the SVS expiry engine pointed at them. A direction the platform supports, not a live service.',
        provision: 'gac',
        beta: true,
        action: { kind: 'link', label: 'Open preview', to: '/app/agency/certification' },
      },
      {
        id: 'bunkers',
        label: 'Bunkers',
        body: 'Vessel-matched enquiries, price windows compared side by side, delivery confirmed on the platform. A direction the platform supports, not a live service.',
        provision: 'gac',
        beta: true,
        action: { kind: 'link', label: 'Open preview', to: '/app/agency/bunkers' },
      },
    ],
  },
  {
    id: 'logistics',
    label: 'Logistics',
    name: 'GAC Logistics',
    to: '/app/logistics',
    headline: 'Cargo to the quay, tracked the whole way',
    intro:
      'Freight forwarding, warehousing and project cargo run alongside the agency work, so a consignment arrives against a port call rather than against a hope. Book a movement and the platform shows every leg to the berth.',
    tierPct: TIERS.logistics,
    tierLabel: `${TIERS.logistics}% tier`,
    categories: ['Haulage'],
    services: [
      {
        id: 'consignments',
        label: 'Consignments',
        body: 'Book a movement — origin, delivery point, ready date, pieces and weight — and follow it from collection to the quay.',
        provision: 'gac',
        action: {
          kind: 'link',
          label: 'Book a consignment',
          to: '/app/logistics?section=consignments',
        },
      },
      {
        id: 'warehousing',
        label: 'Warehousing',
        body: 'GAC’s own Aberdeen warehouse: goods received against the vessel, held until the call, and released to the berth on the day.',
        provision: 'gac',
        action: {
          kind: 'link',
          label: 'What the warehouse does',
          to: '/app/logistics?section=warehousing',
        },
      },
      {
        id: 'project-cargo',
        label: 'Project cargo',
        body: 'Out-of-gauge and heavy-lift movements planned as one job — route survey, lift plan, and the crane booked against the same call.',
        provision: 'gac',
        action: {
          kind: 'link',
          label: 'How a project moves',
          to: '/app/logistics?section=project-cargo',
        },
      },
      {
        id: 'haulage',
        label: 'Haulage',
        body: 'Vetted hauliers for the road legs — curtainsiders, low-loaders and escorted abnormal loads, booked through GAC.',
        provision: 'network',
        action: { kind: 'link', label: 'Browse hauliers', to: '/app/marketplace?category=Haulage' },
      },
    ],
    sections: [
      {
        id: 'consignments',
        label: 'Consignments',
        summary:
          'Movements booked on the platform, each one from collection to the quay. Everything here is illustrative.',
      },
      {
        id: 'warehousing',
        label: 'Warehousing',
        summary:
          'Goods received against the vessel and held until the call, so nothing sits on the quay waiting for a ship.',
      },
      {
        id: 'project-cargo',
        label: 'Project cargo',
        summary:
          'Out-of-gauge and heavy-lift movements planned as one job across logistics, customs and the port call.',
      },
    ],
  },
  {
    id: 'customs',
    label: 'Customs',
    name: 'GAC Customs',
    to: '/app/customs',
    headline: 'Cleared before it reaches the gate',
    intro:
      'T1 transit, import and export clearance and the documentation behind them, prepared and submitted in-house. Customs is the highest tier because it is the line where a delay costs the most and where GAC holds every step itself.',
    tierPct: TIERS.customs,
    tierLabel: `${TIERS.customs}% tier`,
    categories: [],
    noNetworkNote:
      'Customs is GAC in-house end to end — GAC prepares and submits the declaration itself, so no third party sits between you and the entry. That is why it carries the 7% tier.',
    services: [
      {
        id: 'declarations',
        label: 'Declarations',
        body: 'Raise a T1 transit, an import clearance or an export clearance against a consignment and follow it through to cleared.',
        provision: 'gac',
        action: {
          kind: 'link',
          label: 'Raise a declaration',
          to: '/app/customs?section=declarations',
        },
      },
      {
        id: 'documents',
        label: 'What GAC needs from you',
        body: 'The document set behind every entry, and what a missing line actually costs at the border.',
        provision: 'gac',
        action: { kind: 'link', label: 'Open the checklist', to: '/app/customs?section=documents' },
      },
      {
        id: 'ship-spares',
        label: 'Ship’s spares in transit',
        body: 'Spares moving to a vessel under transit relief, cleared against the call and released to the quay with the rest of the delivery.',
        provision: 'gac',
        action: { kind: 'agent', label: 'Engage service' },
      },
    ],
    sections: [
      {
        id: 'declarations',
        label: 'Declarations',
        summary:
          'Entries raised on the platform, each one from documents received to cleared. Everything here is illustrative.',
      },
      {
        id: 'documents',
        label: 'What GAC needs',
        summary:
          'The document set behind every entry. GAC informs — the tariff classification and the customs position remain the importer’s.',
      },
    ],
  },
  {
    id: 'procurement',
    label: 'Procurement',
    name: 'GAC Procurement',
    to: '/app/procurement',
    headline: 'One list, one supplier, one invoice',
    intro:
      'Send the vessel’s list to Compass, GAC’s procurement branch. Compass sources and supplies every line itself and confirms the list back, and the invoice comes to you via Compass under GAC.',
    tierPct: null,
    tierLabel: 'Included at any tier',
    categories: [],
    noNetworkNote:
      'Compass supplies the list itself, from its own stock and its own supply network — one invoice, one relationship, GAC accountable for the whole basket.',
    services: [
      {
        id: 'list',
        label: 'Send a list',
        body: 'Build the list against the vessel and the delivery point, send it to Compass, and watch it through to invoiced.',
        provision: 'gac',
        action: { kind: 'link', label: 'Open procurement', to: '/app/procurement' },
      },
    ],
  },
];

/** The four lines in nav order. */
export const SERVICE_LINE_IDS = SERVICE_LINES.map((l) => l.id);

export function serviceLine(id: ServiceLineId): ServiceLine {
  const line = SERVICE_LINES.find((l) => l.id === id);
  if (!line) throw new Error(`Unknown service line: ${id}`);
  return line;
}
