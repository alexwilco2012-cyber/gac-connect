import type { Plan } from './suppliers';

/**
 * Invoice review scenario — supplier invoices routed to the client before
 * anything matches in GA (v12 §5). All fictional. Days-ago values are fixed
 * so the demo is deterministic: the window is 7 days (lib/invoices).
 */

export interface AllocationOption {
  id: string;
  label: string;
  /** Present when this option is the split held on the GA vessel profile. */
  fromVesselProfile?: boolean;
}

/**
 * The two sides of a charter. A port call that straddles a delivery or a
 * redelivery has both on one disbursement: the vessel is on the charterer's
 * time until the off-hire moment and the owners' from it.
 */
export type HireParty = 'charterer' | 'owner';

/** One cost on a port disbursement, and where the charter party puts it. */
export interface DisbursementLine {
  id: string;
  description: string;
  /** When it fell — the chronology either side of the hire boundary. */
  when: string;
  amountGBP: number;
  defaultParty: HireParty;
}

/** Who the two sides are on a call that changes hands, and when it changed. */
export interface HireSplit {
  chartererLabel: string;
  ownerLabel: string;
  chartererShort: string;
  ownerShort: string;
  headline: string;
  note: string;
}

interface InvoiceCommon {
  id: string;
  supplierName: string;
  service: string;
  vessel: string;
  jobRef: string;
  amountGBP: number;
  /** How long ago the invoice arrived — drives the 7-day countdown. */
  receivedDaysAgo: number;
  /** Purchase order the booking generated in GA. */
  poRef: string;
  /** Service confirmation state before invoice review (layer 2). */
  serviceConfirmed: string;
}

/** One supplier, one billing party — the ordinary case. */
export interface AllocatedInvoice extends InvoiceCommon {
  kind: 'allocated';
  supplierId: string;
  plan: Plan;
  allocations: AllocationOption[];
  defaultAllocationId: string;
}

/**
 * A port disbursement across an on-hire or off-hire: two payers, one document,
 * allocated line by line. The biller is the harbour rather than a marketplace
 * supplier, so there is no profile to open, no plan, and nothing to rate.
 */
export interface SplitInvoice extends InvoiceCommon {
  kind: 'split';
  hire: HireSplit;
  lines: DisbursementLine[];
}

export type SupplierInvoice = AllocatedInvoice | SplitInvoice;

/**
 * MV Granite Coast, Aberdeen: in on the charterer's time, redelivered to owners
 * alongside at 14:20, then two days under repair on the owners' account. The
 * inbound — pilotage, towage, linesmen made fast, dues to 14:20 — is the
 * charterer's; the shift into the maintenance berth, the dues across the repair
 * days, linesmen let go and pilotage outward are the owners'.
 */
const GRANITE_COAST_DISBURSEMENT: DisbursementLine[] = [
  {
    id: 'pilot-in',
    description: 'Pilotage — inward',
    when: 'Thu 06:40 · arrival',
    amountGBP: 680,
    defaultParty: 'charterer',
  },
  {
    id: 'tow-in',
    description: 'Towage — inward, one tug',
    when: 'Thu 06:40 · arrival',
    amountGBP: 1240,
    defaultParty: 'charterer',
  },
  {
    id: 'lines-in',
    description: 'Linesmen — mooring on arrival',
    when: 'Thu 06:40 · made fast',
    amountGBP: 310,
    defaultParty: 'charterer',
  },
  {
    id: 'dues-on',
    description: 'Harbour dues — arrival to off-hire',
    when: 'Thu 06:40–14:20',
    amountGBP: 1180,
    defaultParty: 'charterer',
  },
  {
    id: 'shift-maint',
    description: 'Berth shift to Pocra Quay — pilot and linesmen, both ends',
    when: 'Thu 16:05 · into maintenance',
    amountGBP: 540,
    defaultParty: 'owner',
  },
  {
    id: 'dues-off',
    description: 'Harbour dues — off-hire to sailing, incl. two days alongside under repair',
    when: 'Thu 14:20–Sat 06:00',
    amountGBP: 2360,
    defaultParty: 'owner',
  },
  {
    id: 'lines-out',
    description: 'Linesmen — unmooring on sailing',
    when: 'Sat 06:00 · let go',
    amountGBP: 310,
    defaultParty: 'owner',
  },
  {
    id: 'pilot-out',
    description: 'Pilotage — outward',
    when: 'Sat 06:00 · sailing',
    amountGBP: 680,
    defaultParty: 'owner',
  },
];

/** Headline figure summed from the lines, so the two can never disagree. */
function linesTotal(lines: DisbursementLine[]): number {
  return lines.reduce((sum, l) => sum + l.amountGBP, 0);
}

export const INVOICES: SupplierInvoice[] = [
  {
    kind: 'allocated',
    id: 'INV-4471',
    supplierId: 'caledonia-lifting',
    supplierName: 'Caledonia Lifting Ltd',
    plan: 'premium',
    service: 'Crane hire — 130t mobile',
    vessel: 'MV Caledonian Star',
    jobRef: 'CS-2207',
    amountGBP: 4400,
    receivedDaysAgo: 2,
    poRef: 'PO 48211',
    allocations: [
      {
        id: 'split-60-40',
        label: 'Browne Energy / Grizzell Marine — 60/40',
        fromVesselProfile: true,
      },
      { id: 'browne-100', label: 'Browne Energy — 100%' },
      { id: 'grizzell-100', label: 'Grizzell Marine — 100%' },
    ],
    defaultAllocationId: 'split-60-40',
    serviceConfirmed: 'Delivered Fri · confirmed by both parties',
  },
  {
    kind: 'allocated',
    id: 'INV-4468',
    supplierId: 'aberdeen-offshore-medical',
    supplierName: 'Aberdeen Offshore Medical',
    plan: 'professional',
    service: 'Medical cover — topside medic, 2 days',
    vessel: 'MV Caledonian Star',
    jobRef: 'CS-2204',
    amountGBP: 1850,
    receivedDaysAgo: 5,
    poRef: 'PO 48196',
    allocations: [
      {
        id: 'split-60-40',
        label: 'Browne Energy / Grizzell Marine — 60/40',
        fromVesselProfile: true,
      },
      { id: 'browne-100', label: 'Browne Energy — 100%' },
      { id: 'grizzell-100', label: 'Grizzell Marine — 100%' },
    ],
    defaultAllocationId: 'split-60-40',
    serviceConfirmed: 'Delivered Tue · deemed confirmed (no dispute raised)',
  },
  {
    kind: 'allocated',
    id: 'INV-4452',
    supplierId: 'caledonia-scaffolding',
    supplierName: 'Caledonia Scaffolding',
    plan: 'free',
    service: 'Access scaffolding — onboard',
    vessel: 'MV Boreal',
    jobRef: 'BO-1188',
    amountGBP: 2900,
    receivedDaysAgo: 8,
    poRef: 'PO 48140',
    allocations: [{ id: 'stronach-100', label: 'Stronach Subsea — 100%', fromVesselProfile: true }],
    defaultAllocationId: 'stronach-100',
    serviceConfirmed: 'Delivered last week · confirmed by both parties',
  },
  {
    kind: 'split',
    id: 'INV-4483',
    supplierName: 'Aberdeen port authority',
    service: 'Port disbursement — arrival, off-hire, sailing',
    vessel: 'MV Granite Coast',
    jobRef: 'GC-3120',
    amountGBP: linesTotal(GRANITE_COAST_DISBURSEMENT),
    receivedDaysAgo: 1,
    poRef: 'PO 48233',
    serviceConfirmed: 'Call closed Sat 06:00 · figures agreed with the harbour',
    hire: {
      chartererLabel: 'Wilkinson Drilling — charterer',
      ownerLabel: 'Stronach Subsea — owners',
      chartererShort: 'Wilkinson Drilling',
      ownerShort: 'Stronach Subsea',
      headline: 'On-hire inbound · redelivered to owners alongside Thu 14:20',
      note: 'The vessel came in on the charterer’s time and went off-hire alongside at 14:20, then stayed two days under repair on the owners’ account. Costs are pre-allocated at that moment, from the charter party held on the vessel profile. Move any line if the parties have agreed it differently.',
    },
    lines: GRANITE_COAST_DISBURSEMENT,
  },
];

export function invoiceById(id: string): SupplierInvoice | undefined {
  return INVOICES.find((i) => i.id === id);
}

/** Copy for the rules strip on the invoice screen — mirrors v12 §5. */
export const INVOICE_RULES = [
  {
    title: 'The invoice comes to you first',
    body: 'When a supplier invoice arrives, it routes to the client before anything matches. You have seven days to allocate it to the correct billing party and apply splits where required.',
  },
  {
    title: 'Left alone, it matches as it stands',
    body: 'If the window passes without action, the invoice matches to GAC Agent as received. Changes requested after matching carry an administrative fee at published rates.',
  },
  {
    title: 'Rate the job when it closes',
    body: 'When the job closes, your agent rates the supplier — thirty seconds of agent time. That rating feeds the live score every client sees in the marketplace, always with the number of ratings behind it.',
  },
] as const;
