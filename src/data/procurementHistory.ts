/**
 * Stores history behind the suggested list on Procurement — what each vessel
 * ordered through Compass on her previous calls, and the call she has planned
 * next. The proposal: once a call is planned, the vessel's history is analysed
 * and a suggested list goes to the client before she arrives. Every vessel,
 * date and quantity here is fictional; prices for these lines live with the
 * other demo prices in data/procurement.
 */

export interface StoresUnit {
  one: string;
  other: string;
}

export interface StoresItem {
  /** Also the procurement line id once the item is on a request. */
  id: string;
  description: string;
  unit: StoresUnit;
}

export interface PastCallLine {
  itemId: string;
  qty: number;
}

export interface PastCall {
  /** ISO date of the call. */
  date: string;
  port: string;
  lines: PastCallLine[];
}

/** The call a vessel has planned next — what the suggested list is drafted for. */
export interface PlannedCall {
  vesselId: string;
  port: string;
  /** "Fri 08:00" — matches the vessel's schedule line. */
  eta: string;
  deliveryPoint: string;
  neededBy: string;
}

export const STORES_ITEMS: readonly StoresItem[] = [
  {
    id: 'engine-room',
    description: 'Engine room consumables — lube oil, filters',
    unit: { one: 'lot', other: 'lots' },
  },
  { id: 'provisions', description: 'Fresh provisions', unit: { one: 'day', other: 'days' } },
  {
    id: 'galley-gas',
    description: 'Galley gas',
    unit: { one: 'cylinder · 47 kg', other: 'cylinders · 47 kg' },
  },
  { id: 'mooring-tails', description: 'Mooring tails', unit: { one: 'tail', other: 'tails' } },
  { id: 'shackles', description: 'Shackles', unit: { one: 'shackle', other: 'shackles' } },
  { id: 'bonded-stores', description: 'Bonded stores', unit: { one: 'lot', other: 'lots' } },
  {
    id: 'chart-corrections',
    description: 'Chart corrections',
    unit: { one: 'folio', other: 'folios' },
  },
  { id: 'deck-paint', description: 'Deck paint — touch-up', unit: { one: 'tin', other: 'tins' } },
];

export const PLANNED_CALLS: readonly PlannedCall[] = [
  {
    vesselId: 'choice',
    port: 'Aberdeen',
    eta: 'Fri 08:00',
    deliveryPoint: 'Regent Quay, Aberdeen',
    neededBy: 'Fri 08:00',
  },
  {
    vesselId: 'boreal',
    port: 'Peterhead',
    eta: 'Fri 14:30',
    deliveryPoint: 'Smith Quay, Peterhead',
    neededBy: 'Fri 14:30',
  },
];

/** Previous calls per vessel, newest first. MV Granite Coast has no call planned. */
export const CALL_HISTORY: Readonly<Record<string, readonly PastCall[]>> = {
  choice: [
    {
      date: '2026-10-02',
      port: 'Aberdeen',
      lines: [
        { itemId: 'engine-room', qty: 1 },
        { itemId: 'provisions', qty: 5 },
        { itemId: 'galley-gas', qty: 2 },
        { itemId: 'mooring-tails', qty: 4 },
        { itemId: 'shackles', qty: 8 },
        { itemId: 'chart-corrections', qty: 1 },
      ],
    },
    {
      date: '2026-09-11',
      port: 'Aberdeen',
      lines: [
        { itemId: 'engine-room', qty: 1 },
        { itemId: 'provisions', qty: 5 },
        { itemId: 'mooring-tails', qty: 4 },
        { itemId: 'bonded-stores', qty: 1 },
      ],
    },
    {
      date: '2026-08-21',
      port: 'Aberdeen',
      lines: [
        { itemId: 'engine-room', qty: 1 },
        { itemId: 'provisions', qty: 4 },
        { itemId: 'galley-gas', qty: 3 },
        { itemId: 'shackles', qty: 6 },
        { itemId: 'deck-paint', qty: 2 },
      ],
    },
    {
      date: '2026-07-31',
      port: 'Aberdeen',
      lines: [
        { itemId: 'engine-room', qty: 1 },
        { itemId: 'provisions', qty: 5 },
        { itemId: 'galley-gas', qty: 2 },
        { itemId: 'mooring-tails', qty: 2 },
        { itemId: 'bonded-stores', qty: 1 },
      ],
    },
    {
      date: '2026-07-10',
      port: 'Aberdeen',
      lines: [
        { itemId: 'engine-room', qty: 2 },
        { itemId: 'provisions', qty: 6 },
        { itemId: 'galley-gas', qty: 2 },
        { itemId: 'shackles', qty: 8 },
        { itemId: 'chart-corrections', qty: 1 },
      ],
    },
    {
      date: '2026-06-19',
      port: 'Aberdeen',
      lines: [
        { itemId: 'engine-room', qty: 1 },
        { itemId: 'provisions', qty: 5 },
        { itemId: 'mooring-tails', qty: 6 },
        { itemId: 'bonded-stores', qty: 1 },
      ],
    },
  ],
  boreal: [
    {
      date: '2026-09-26',
      port: 'Peterhead',
      lines: [
        { itemId: 'engine-room', qty: 1 },
        { itemId: 'provisions', qty: 7 },
        { itemId: 'galley-gas', qty: 1 },
      ],
    },
    {
      date: '2026-08-29',
      port: 'Peterhead',
      lines: [
        { itemId: 'engine-room', qty: 1 },
        { itemId: 'provisions', qty: 7 },
        { itemId: 'chart-corrections', qty: 1 },
      ],
    },
    {
      date: '2026-08-01',
      port: 'Peterhead',
      lines: [
        { itemId: 'engine-room', qty: 1 },
        { itemId: 'provisions', qty: 6 },
        { itemId: 'galley-gas', qty: 1 },
        { itemId: 'mooring-tails', qty: 2 },
      ],
    },
    {
      date: '2026-07-04',
      port: 'Peterhead',
      lines: [
        { itemId: 'engine-room', qty: 2 },
        { itemId: 'provisions', qty: 7 },
      ],
    },
  ],
};
