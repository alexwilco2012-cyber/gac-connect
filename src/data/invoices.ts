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

export interface SupplierInvoice {
  id: string;
  supplierId: string;
  supplierName: string;
  plan: Plan;
  service: string;
  vessel: string;
  jobRef: string;
  amountGBP: number;
  /** How long ago the invoice arrived — drives the 7-day countdown. */
  receivedDaysAgo: number;
  /** Purchase order the booking generated in GA. */
  poRef: string;
  allocations: AllocationOption[];
  defaultAllocationId: string;
  /** Service confirmation state before invoice review (layer 2). */
  serviceConfirmed: string;
}

export const INVOICES: SupplierInvoice[] = [
  {
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
    title: 'Commission is deducted at matching',
    body: 'The supplier’s tier band is applied at the moment of matching, so collection needs no separate process — and your agent is freed of a recurring piece of admin.',
  },
] as const;
