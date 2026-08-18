/** Quote scenario — crane hire, MV Caledonian Star (03 §3.4). */

export interface Quote {
  id: string;
  supplierId: string;
  supplierName: string;
  priceGBP: number;
  availability: string;
  capacity: string;
  rating: number;
  /** Ratings actually submitted — mirrors the supplier record. */
  ratingCount: number;
  esg: 'A' | 'B' | 'C';
  source: 'platform' | 'outlook';
  sourceTime: string;
  best?: boolean;
}

export const QUOTES: Quote[] = [
  {
    id: 'q-north-sea',
    supplierId: 'north-sea-crane',
    supplierName: 'North Sea Crane Co.',
    priceGBP: 4850,
    availability: 'Fri 06:00',
    capacity: '120t mobile',
    rating: 4.7,
    ratingCount: 84,
    esg: 'B',
    source: 'platform',
    sourceTime: '09:42',
  },
  {
    id: 'q-caledonia',
    supplierId: 'caledonia-lifting',
    supplierName: 'Caledonia Lifting Ltd',
    priceGBP: 4400,
    availability: 'Fri 06:00',
    capacity: '130t mobile',
    rating: 4.9,
    ratingCount: 127,
    esg: 'A',
    source: 'outlook',
    sourceTime: '10:15',
    best: true,
  },
  {
    id: 'q-granite',
    supplierId: 'granite-cranes',
    supplierName: 'Granite Cranes',
    priceGBP: 5100,
    availability: 'Fri 09:00',
    capacity: '110t mobile',
    rating: 4.5,
    ratingCount: 46,
    esg: 'B',
    source: 'platform',
    sourceTime: '11:03',
  },
];

/**
 * A crane or FLT price covers a booked window (data/serviceTerms). The demo's
 * standard window is a day shift of this many hours from the needed-by time —
 * illustrative, not a supplier's actual hire terms.
 */
export const HIRE_WINDOW_HOURS = 12;

/** The demo's standard booked window — the crane scenario and a fresh request both start here. */
export const DEFAULT_BOOKED_WINDOW = 'Fri 06:00–18:00';

/**
 * The booked window a request defaults to for a needed-by time, so the two
 * stay coherent when the client edits one: 'Fri 06:00' → 'Fri 06:00–18:00'.
 * Free text without a trailing HH:MM falls back to the demo default.
 */
export function bookedWindowFrom(neededBy: string): string {
  const match = /^(.*?)(\d{1,2}):(\d{2})\s*$/.exec(neededBy.trim());
  if (!match) return DEFAULT_BOOKED_WINDOW;
  const [, prefix, hh, mm] = match;
  const startHour = Number(hh);
  if (startHour > 23 || Number(mm) > 59) return DEFAULT_BOOKED_WINDOW;
  const endHour = (startHour + HIRE_WINDOW_HOURS) % 24;
  return `${prefix}${hh}:${mm}–${String(endHour).padStart(2, '0')}:${mm}`;
}

/**
 * The request behind this comparison. The client sets the reply-by deadline
 * when the request goes out; suppliers quote against it. The category drives
 * the hire terms shown with every quote (data/serviceTerms): crane work is
 * priced for the booked window, so the window the prices cover travels with
 * the request.
 */
export const QUOTE_REQUEST = {
  service: 'Crane hire',
  category: 'Cranes',
  vessel: 'MV Caledonian Star',
  port: 'Aberdeen',
  neededBy: 'Fri 06:00',
  /** The window the quoted prices cover — overrun beyond it is charged on top. */
  bookedWindow: DEFAULT_BOOKED_WINDOW,
  replyBy: 'Thu 12:00',
  replyWindowLabel: '4 hours',
  sentAt: 'Thu 08:00',
} as const;

export const ACCEPTANCE_TOAST =
  'PO 48211 generated in GAC Agent — billing split 60/40 Browne Energy / Grizzell Marine applied automatically.';

/** The request queue sidebar — this job plus two other open requests (01 §B5). */
export const REQUEST_QUEUE = [
  {
    id: 'crane-hire',
    title: 'Crane hire',
    vessel: 'MV Caledonian Star',
    status: '3 of 3 replied',
    active: true,
  },
  {
    id: 'medical-cover',
    title: 'Medical cover',
    vessel: 'MV Caledonian Star',
    status: '2 of 3 replied',
    active: false,
  },
  {
    id: 'scaffolding',
    title: 'Scaffolding',
    vessel: 'MV Caledonian Star',
    status: 'Awaiting replies',
    active: false,
  },
] as const;
