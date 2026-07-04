/** Quote scenario — crane hire, MV Caledonian Star (03 §3.4). */

export interface Quote {
  id: string;
  supplierId: string;
  supplierName: string;
  priceGBP: number;
  availability: string;
  capacity: string;
  rating: number;
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
    esg: 'B',
    source: 'platform',
    sourceTime: '11:03',
  },
];

export const ACCEPTANCE_TOAST =
  'PO 48211 generated in GAC Agent — billing split 60/40 Northmoor Energy / Solway Marine applied automatically.';

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
