/** Canonical vessels and operators — 03 §3.4. All fictional. */

export interface Vessel {
  id: string;
  name: string;
  operatorLine: string;
  port: string;
  scheduleLine: string;
  statusPill: { label: string; tone: 'info' | 'warn' | 'success' };
}

export const OPERATORS = [
  'Browne Energy',
  'Grizzell Marine',
  'Stronach Subsea',
  'Wilkinson Drilling',
] as const;

export const BILLING_SPLIT = '60/40 Browne Energy / Grizzell Marine';

export const VESSELS: Vessel[] = [
  {
    id: 'caledonian-star',
    name: 'MV Caledonian Star',
    operatorLine: 'Browne Energy / Grizzell Marine (60/40)',
    port: 'Aberdeen',
    scheduleLine: 'Aberdeen · ETA Fri 08:00 · Berth: Regent Quay',
    statusPill: { label: 'Procurement list ready', tone: 'info' },
  },
  {
    id: 'boreal',
    name: 'MV Boreal',
    operatorLine: 'Stronach Subsea',
    port: 'Peterhead',
    scheduleLine: 'Peterhead · ETA Fri 14:30 · Berth: Smith Quay',
    statusPill: { label: '2 certs expiring on booked supplier', tone: 'warn' },
  },
  {
    id: 'granite-coast',
    name: 'MV Granite Coast',
    operatorLine: 'Wilkinson Drilling',
    port: 'Aberdeen',
    scheduleLine: 'Aberdeen · ETD Sat 06:00 · Customs: T1 in progress',
    statusPill: { label: 'All documents complete', tone: 'success' },
  },
];

/** The predictive-procurement scenario (MV Caledonian Star, Aberdeen). */
export const PREDICTED_NEEDS = [
  { service: 'Crane hire', matched: 3 },
  { service: 'Medical cover', matched: 3 },
  { service: 'Scaffolding', matched: 3 },
] as const;

/** Dashboard KPIs — 03 §3.4. */
export const DASHBOARD_KPIS = [
  { label: 'Active jobs', value: '14', delta: '+3 this week' },
  { label: 'Open quote requests', value: '6', delta: '2 replies awaiting review' },
  { label: 'SVS-verified suppliers', value: '52', delta: '4 onboarding' },
  { label: 'Admin time saved (mo.)', value: '31 hrs', delta: 'vs manual workflow' },
] as const;
