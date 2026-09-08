/** Canonical vessels and operators — 03 §3.4. All fictional. */

import type { IconName } from '../components/ui/Icon';

export interface Vessel {
  id: string;
  name: string;
  operatorLine: string;
  port: string;
  scheduleLine: string;
  statusPill: { label: string; tone: 'info' | 'warn' | 'success' };
  /** Where the call sits on the dashboard's 48-hour strip: hours after the
   *  demo "now" (Thursday 08:00 — the morning the greeting describes). */
  timeline: { offsetHours: number; kind: 'ETA' | 'ETD'; label: string };
}

/** The dashboard timeline window, in hours from the demo "now". */
export const TIMELINE_WINDOW_HOURS = 48;

/** Axis ticks for the 48-hour strip. */
export const TIMELINE_TICKS = [
  { offsetHours: 0, label: 'Now' },
  { offsetHours: 12, label: 'Thu 20:00' },
  { offsetHours: 24, label: 'Fri 08:00' },
  { offsetHours: 36, label: 'Fri 20:00' },
  { offsetHours: 48, label: 'Sat 08:00' },
] as const;

export const OPERATORS = [
  'Browne Energy',
  'Grizzell Marine',
  'Stronach Subsea',
  'Wilkinson Drilling',
] as const;

export const BILLING_SPLIT = '60/40 Browne Energy / Grizzell Marine';

export const VESSELS: Vessel[] = [
  {
    id: 'choice',
    name: 'MV Choice',
    operatorLine: 'Browne Energy / Grizzell Marine (60/40)',
    port: 'Aberdeen',
    scheduleLine: 'Aberdeen · ETA Fri 08:00 · Berth: Regent Quay',
    statusPill: { label: 'Procurement list ready', tone: 'info' },
    timeline: { offsetHours: 24, kind: 'ETA', label: 'Fri 08:00' },
  },
  {
    id: 'boreal',
    name: 'MV Boreal',
    operatorLine: 'Stronach Subsea',
    port: 'Peterhead',
    scheduleLine: 'Peterhead · ETA Fri 14:30 · Berth: Smith Quay',
    statusPill: { label: '2 certs expiring on booked supplier', tone: 'warn' },
    timeline: { offsetHours: 30.5, kind: 'ETA', label: 'Fri 14:30' },
  },
  {
    id: 'granite-coast',
    name: 'MV Granite Coast',
    operatorLine: 'Wilkinson Drilling',
    port: 'Aberdeen',
    scheduleLine: 'Aberdeen · ETD Sat 06:00 · Customs: T1 in progress',
    statusPill: { label: 'All documents complete', tone: 'success' },
    timeline: { offsetHours: 46, kind: 'ETD', label: 'Sat 06:00' },
  },
];

/** The predictive-procurement scenario (MV Choice, Aberdeen). */
export const PREDICTED_NEEDS = [
  { service: 'Crane hire', matched: 3 },
  { service: 'Medical cover', matched: 3 },
  { service: 'Scaffolding', matched: 3 },
] as const;

/** Dashboard KPIs — 03 §3.4. Series are the last seven weeks, illustrative
 *  like everything else on the screen, ending on the headline value. */
export const DASHBOARD_KPIS: readonly {
  label: string;
  value: string;
  delta: string;
  /** Chip tone: growth reads success (default); a plain annotation reads info. */
  deltaTone?: 'success' | 'info';
  icon: IconName;
  series: readonly number[];
}[] = [
  {
    label: 'Active jobs',
    value: '14',
    delta: '+3 this week',
    icon: 'briefcase',
    series: [9, 10, 12, 11, 13, 11, 14],
  },
  {
    label: 'Open quote requests',
    value: '6',
    delta: '2 replies awaiting review',
    deltaTone: 'info',
    icon: 'send',
    series: [2, 4, 3, 5, 4, 6, 6],
  },
  {
    label: 'SVS-verified suppliers',
    value: '52',
    delta: '4 onboarding',
    icon: 'badge-check',
    series: [44, 46, 47, 48, 50, 51, 52],
  },
  {
    label: 'Admin time saved (mo.)',
    value: '31 hrs',
    delta: 'vs manual workflow',
    deltaTone: 'info',
    icon: 'timer',
    series: [22, 24, 26, 27, 29, 30, 31],
  },
] as const;
