/**
 * Procurement via Compass — the working example from the 17 Aug review.
 * A client's list goes by email straight to Compass, GAC's procurement
 * branch. Compass supplies what it can from its own stock and network; where
 * it cannot assist on a line it sources it (a ship chandler, for example) and
 * pays that supplier itself. The client is invoiced via Compass, under GAC,
 * one invoice, no third-party paperwork. Everything here is
 * fictional and illustrative — there is no mail server behind the proof of
 * concept, and every price is a demo figure.
 */

export interface ProcurementLine {
  id: string;
  /** Free-text quantity — "1 lot", "12 crew · 5 days", "2 × 47 kg". */
  qty: string;
  description: string;
}

export interface ProcurementRequest {
  /** The request reference — "PR-1042". */
  ref: string;
  /** Vessel id from data/vessels. */
  vesselId: string;
  deliveryPoint: string;
  neededBy: string;
  lines: ProcurementLine[];
}

/** The draft the dashboard calls "1 procurement list ready to send". */
export const DEFAULT_REQUEST: ProcurementRequest = {
  ref: 'PR-1042',
  vesselId: 'caledonian-star',
  deliveryPoint: 'Regent Quay, Aberdeen',
  neededBy: 'Fri 08:00',
  lines: [
    {
      id: 'engine-room',
      qty: '1 lot',
      description: 'Engine room consumables — lube oil, filters',
    },
    {
      id: 'provisions',
      qty: '12 crew · 5 days',
      description: 'Fresh provisions',
    },
    {
      id: 'deck-stores',
      qty: '4 tails · 8 shackles',
      description: 'Deck stores — mooring tails, shackles',
    },
    {
      id: 'bonded-stores',
      qty: '1 lot',
      description: 'Bonded stores',
    },
    {
      id: 'galley-gas',
      qty: '2 × 47 kg',
      description: 'Galley gas',
    },
  ],
};

/** Illustrative address — no mail is sent from this proof of concept. */
export const COMPASS_ADDRESS = 'procurement@compass.example';

/** The platform user who raises the request. */
export const SENDER = { name: 'A. Wilkinson', org: 'Aberdeen Agency' } as const;

/**
 * Lines Compass cannot assist on in the demo — routed to a third-party
 * chandler, which Compass pays; the client never sees the chandler on paper.
 */
export const CANNOT_ASSIST_IDS: readonly string[] = ['bonded-stores', 'galley-gas'];

/** Fictional third-party chandler for the routed lines. */
export const CHANDLER_NAME = 'Granite Ship Chandlers';

/**
 * Illustrative demo prices per line, keyed by line id. Lines the user adds
 * take the fallback. Nothing here is a real Compass price.
 */
export const ILLUSTRATIVE_PRICES_GBP: Record<string, number> = {
  'engine-room': 1240,
  provisions: 2150,
  'deck-stores': 860,
  'bonded-stores': 540,
  'galley-gas': 190,
};

export const ILLUSTRATIVE_LINE_PRICE_FALLBACK_GBP = 250;

/** Copy for the "How it works" strip. */
export const PROCUREMENT_RULES = [
  {
    step: '1',
    title: 'The list goes straight to Compass by email',
    body: 'You build the list here; the platform composes the email and sends it to Compass, GAC’s own procurement branch. No separate purchase orders, no phoning round.',
  },
  {
    step: '2',
    title: 'Compass supplies from its own stock and network',
    body: 'Compass works the list line by line and supplies what it can directly.',
  },
  {
    step: '3',
    title: 'If Compass cannot assist on a line, it sources it — and pays',
    body: 'A ship chandler, for example. Compass places the order and pays the chandler itself. The chandler is Compass’s supplier, not yours.',
  },
  {
    step: '4',
    title: 'You are invoiced via Compass, under GAC',
    body: 'One invoice, from GAC, covering every line. No third-party paperwork; GAC accountable for the whole basket.',
  },
] as const;

/** Copy for the illustrative notice — the Compass side is simulated. */
export const SIMULATION_NOTICE =
  'Illustrative — Compass replies are simulated in this proof of concept. No email is sent and every price is a demo figure.';
