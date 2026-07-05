/**
 * Interactive services landing — copy deck and geometry, verbatim from the
 * "GAC Services Landing" design handoff (high fidelity; only CTA targets
 * were rewired to real routes).
 */

export type ServiceId =
  'agency' | 'logistics' | 'customs' | 'assets' | 'procurement' | 'marketplace';

export interface HarbourService {
  id: ServiceId;
  /** Side-menu label. */
  label: string;
  /** Hotspot chip label. */
  chipLabel: string;
  /** Menu dot colour (design-final). */
  dot: string;
  /** Detail-panel tag chip text. */
  tag: string;
  title: string;
  desc: string;
  bullets: [string, string, string];
  cta: string;
  /** Real route inside this site (rewired from the prototype links). */
  to: string;
  fact: string;
}

export const ORDER: ServiceId[] = [
  'agency',
  'logistics',
  'customs',
  'assets',
  'procurement',
  'marketplace',
];

export const HARBOUR_SERVICES: Record<ServiceId, HarbourService> = {
  agency: {
    id: 'agency',
    label: 'Ship Agency',
    chipLabel: 'Ship Agency',
    dot: '#0E5E8A',
    tag: 'GAC in-house · 2% tier',
    title: 'GAC Agency',
    desc: 'Ship’s agent services: port calls, berthing, vessel support, and crew coordination — your single point of contact on the quay.',
    bullets: [
      'Port call coordination and berth booking',
      'Crew logistics and transfers',
      'Husbandry and owner’s protective agency',
    ],
    cta: 'See tier savings',
    to: '/app/tiers',
    fact: 'Agency is the 2% tier pillar. Add Logistics and Customs and the client reaches Full Stack — 7%.',
  },
  logistics: {
    id: 'logistics',
    label: 'Logistics',
    chipLabel: 'Logistics',
    dot: '#FFC72C',
    tag: 'GAC in-house · 4% tier',
    title: 'GAC Logistics',
    desc: 'Freight forwarding, warehousing, and project cargo — run alongside your agency work, not in a separate silo.',
    bullets: [
      'Freight forwarding, road and sea',
      'Quayside warehousing and laydown',
      'Project cargo and heavy-lift moves',
    ],
    cta: 'See tier savings',
    to: '/app/tiers',
    fact: 'Logistics is the 4% tier pillar — the lorry on this quay is one leg of a door-to-deck chain.',
  },
  customs: {
    id: 'customs',
    label: 'Customs',
    chipLabel: 'Customs',
    dot: '#16A34A',
    tag: 'GAC in-house · 7% tier',
    title: 'GAC Customs',
    desc: 'T1 transit, import and export clearance, and customs documentation — handled end-to-end in-house.',
    bullets: [
      'T1 transit documents',
      'Import / export clearance',
      'Documentation with a full audit trail',
    ],
    cta: 'See tier savings',
    to: '/app/tiers',
    fact: 'Customs is the top tier pillar at 7% — the single biggest consolidation lever a client holds.',
  },
  assets: {
    id: 'assets',
    label: 'Assets',
    chipLabel: 'Assets · crane & kit',
    dot: '#C9A227',
    tag: 'GAC in-house · included at any tier',
    title: 'GAC Assets',
    desc: 'Fender hire, portable cabins, security fencing, and specialist equipment from GAC’s own pool — the crane’s whole toolbox.',
    bullets: [
      'Lifting and quayside equipment',
      'Portable cabins and fencing',
      'Fenders and marine hardware',
    ],
    cta: 'Browse the marketplace',
    to: '/app/marketplace',
    fact: 'Assets and Procurement are included at any tier — added value on top of the discount, not part of the maths.',
  },
  procurement: {
    id: 'procurement',
    label: 'Procurement',
    chipLabel: 'Procurement',
    dot: '#3B82F6',
    tag: 'GAC in-house · included at any tier',
    title: 'GAC Procurement',
    desc: 'Consolidated purchasing through GAC’s vetted supplier network — from consumables to project spares, one warehouse door.',
    bullets: [
      'Consolidated purchasing',
      'Vetted supplier network',
      'Consumables to project spares',
    ],
    cta: 'Browse the marketplace',
    to: '/app/marketplace',
    fact: 'Every predicted procurement list on the dashboard is fulfilled through this pillar.',
  },
  marketplace: {
    id: 'marketplace',
    label: 'The Marketplace',
    chipLabel: 'The Marketplace',
    dot: '#B45309',
    tag: '40+ vetted categories',
    title: 'The Offshore Marketplace',
    desc: 'Cranes, medics, scaffolding, diving, NDT, catering — every third-party supplier passes the Supplier Vetting System before a client ever sees them.',
    bullets: [
      '40+ service categories, SVS-vetted',
      'Quotes compared side by side',
      'Lapsed compliance blocks booking — always',
    ],
    cta: 'Browse the marketplace',
    to: '/app/marketplace',
    fact: 'The platform out there is where marketplace services get delivered — found, vetted, and booked in one place.',
  },
};

/** Menu tag: the tag without the in-house prefix (per the design behaviour). */
export function menuTag(id: ServiceId): string {
  return HARBOUR_SERVICES[id].tag.replace('GAC in-house · ', '');
}

/** Hotspot geometry (percent of scene container) and per-hotspot a11y copy. */
export interface HotspotDef {
  id: ServiceId;
  left: string;
  top: string;
  width: string;
  height: string;
  hoverLift: number;
  ariaLabel: string;
  titleAttr: string;
}

export const HOTSPOTS: HotspotDef[] = [
  {
    id: 'assets',
    left: '7%',
    top: '44.5%',
    width: '17%',
    height: '40.5%',
    hoverLift: 5,
    ariaLabel: 'Crane — GAC Assets: lifting and equipment hire',
    titleAttr: 'Crane — GAC Assets',
  },
  {
    id: 'agency',
    left: '24%',
    top: '56%',
    width: '25%',
    height: '22%',
    hoverLift: 5,
    ariaLabel: 'Ship — GAC Ship Agency: port calls and vessel support',
    titleAttr: 'Ship — GAC Ship Agency',
  },
  {
    id: 'marketplace',
    left: '71.5%',
    top: '31%',
    width: '21%',
    height: '34%',
    hoverLift: 5,
    ariaLabel: 'Offshore platform — the vetted services marketplace',
    titleAttr: 'Offshore platform — the Marketplace',
  },
  {
    id: 'procurement',
    left: '66.5%',
    top: '65.5%',
    width: '21%',
    height: '21.5%',
    hoverLift: 5,
    ariaLabel: 'Warehouse — GAC Procurement: consolidated purchasing',
    titleAttr: 'Warehouse — GAC Procurement',
  },
  {
    id: 'customs',
    left: '51.5%',
    top: '68.5%',
    width: '12.5%',
    height: '19%',
    hoverLift: 5,
    ariaLabel: 'Customs booth — GAC Customs: clearance and documentation',
    titleAttr: 'Customs booth — GAC Customs',
  },
  {
    id: 'logistics',
    left: '6%',
    top: '87%',
    width: '20.5%',
    height: '11%',
    hoverLift: 4,
    ariaLabel: 'Lorry — GAC Logistics: freight, warehousing, project cargo',
    titleAttr: 'Lorry — GAC Logistics',
  },
];
