import type { IconName } from '../components/ui/Icon';

/**
 * The client dashboard's seeded content (live dashboards, 23 Sep; spec §2):
 * where each port call stands, what has moved since yesterday, six months of
 * GAC spend by service line, and the five things a client most often starts.
 *
 * Illustrative, like everything else on the platform, and written from the
 * demo's "now" — Thursday 08:00, the morning the 48-hour strip describes — so
 * "Today 07:42" and "Yesterday 16:20" agree with every other screen.
 *
 * Client-facing throughout: nothing here may mention commission, a band or a
 * mark-up (tested).
 */

/** The four GAC service lines, in tier-ladder order (bottom to top of a stack). */
export type LineId = 'agency' | 'logistics' | 'customs' | 'procurement';

export const LINE_ORDER: readonly LineId[] = ['agency', 'logistics', 'customs', 'procurement'];

export const LINE_LABELS: Record<LineId, string> = {
  agency: 'Agency',
  logistics: 'Logistics',
  customs: 'Customs',
  procurement: 'Procurement',
};

/** Milestones of a port call, first to last. */
export const PORT_CALL_STAGES = [
  'Pre-arrival',
  'Pilot booked',
  'Berth confirmed',
  'Alongside',
  'Sailed',
] as const;

export type PortCallStage = (typeof PORT_CALL_STAGES)[number];

export interface PortCallChip {
  label: string;
  /** Where the chip leads; a chip without one is a plain status. */
  to?: string;
  tone: 'info' | 'warn' | 'success';
}

export interface PortCall {
  /** `VESSELS[].id` — name and operator come from there. */
  vesselId: string;
  stage: PortCallStage;
  when: string;
  countdown: string;
  berth: string;
  chips: PortCallChip[];
}

/** One row per vessel, in `VESSELS` order. */
export const PORT_CALLS: PortCall[] = [
  {
    vesselId: 'choice',
    stage: 'Berth confirmed',
    when: 'ETA Fri 08:00',
    countdown: 'in 24 hrs',
    berth: 'Regent Quay, Aberdeen',
    chips: [
      { label: 'Crane hire · 3 quotes', to: '/app/quotes', tone: 'info' },
      { label: 'Compass list ready', to: '/app/procurement', tone: 'info' },
      { label: 'Crew change', to: '/app/agency/crew-change', tone: 'info' },
    ],
  },
  {
    vesselId: 'boreal',
    stage: 'Pilot booked',
    when: 'ETA Fri 14:30',
    countdown: 'in 30 hrs',
    berth: 'Smith Quay, Peterhead',
    chips: [
      { label: '2 certs expiring on booked supplier', to: '/app/svs', tone: 'warn' },
      { label: 'Diving support booked', to: '/app/marketplace', tone: 'info' },
    ],
  },
  {
    vesselId: 'granite-coast',
    stage: 'Alongside',
    when: 'ETD Sat 06:00',
    countdown: 'sails in 46 hrs',
    berth: 'Regent Quay, Aberdeen',
    chips: [
      { label: 'Customs: T1 in progress', to: '/app/customs', tone: 'info' },
      { label: 'All documents complete', tone: 'success' },
    ],
  },
];

export interface ActivityItem {
  id: string;
  /** Relative to the demo's Thursday 08:00. */
  when: string;
  /** The line it belongs to; Logistics and Customs rows show only while held. */
  line: LineId | 'quotes' | 'invoices' | 'svs';
  icon: IconName;
  text: string;
  to: string;
}

/** "Latest from GAC" — newest first. */
export const CLIENT_ACTIVITY: ActivityItem[] = [
  {
    id: 'act-pilot-choice',
    when: 'Today 07:42',
    line: 'agency',
    icon: 'anchor',
    text: 'Pilot booked for MV Choice — Regent Quay, 08:00 tomorrow',
    to: '/app/agency',
  },
  {
    id: 'act-crane-quote',
    when: 'Today 07:15',
    line: 'quotes',
    icon: 'message-square-quote',
    text: 'Third crane-hire quote in for MV Choice — ready to compare',
    to: '/app/quotes',
  },
  {
    id: 'act-consignment-glasgow',
    when: 'Yesterday 16:20',
    line: 'logistics',
    icon: 'truck',
    text: 'Consignment collected in Glasgow, due at the GAC warehouse on Friday',
    to: '/app/logistics',
  },
  {
    id: 'act-invoice-4471',
    when: 'Yesterday 14:05',
    line: 'invoices',
    icon: 'receipt',
    text: 'Invoice INV-4471 received — in your seven-day review window',
    to: '/app/invoices',
  },
  {
    id: 'act-t1-granite-coast',
    when: 'Yesterday 11:30',
    line: 'customs',
    icon: 'stamp',
    text: 'T1 transit declaration submitted to HMRC for MV Granite Coast',
    to: '/app/customs',
  },
  {
    id: 'act-stores-list',
    when: 'Mon 09:10',
    line: 'procurement',
    icon: 'clipboard-list',
    text: 'Stores list for MV Choice drafted — ready to send to Compass',
    to: '/app/procurement',
  },
  {
    id: 'act-berth-boreal',
    when: 'Mon 08:30',
    line: 'agency',
    icon: 'anchor',
    text: 'Berth confirmed at Smith Quay, Peterhead for MV Boreal',
    to: '/app/agency',
  },
  {
    id: 'act-svs-alert-boreal',
    when: 'Sun 17:45',
    line: 'svs',
    icon: 'shield-check',
    text: 'SVS alert: a supplier booked for MV Boreal has two certificates due for renewal',
    to: '/app/svs',
  },
];

/** The spend chart's months, April to September 2026. */
export const SPEND_MONTHS: readonly string[] = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];

/**
 * Monthly GAC spend per line, in pounds. At Full Stack the six months total
 * £250,000 — half of the £500,000 a year the tier calculator assumes — so the
 * £17,500 saved at 7% is half of its annual saving and the two screens agree.
 */
export const SPEND_BY_LINE: Record<LineId, readonly number[]> = {
  agency: [23000, 24000, 21000, 26000, 25000, 27000],
  logistics: [8000, 9000, 7000, 10000, 9000, 11000],
  customs: [4000, 4000, 3000, 5000, 4000, 5000],
  procurement: [4000, 4000, 5000, 4000, 4000, 4000],
};

export interface QuickAction {
  label: string;
  icon: IconName;
  to: string;
}

/** "Start something" — one row of the things a client starts most often. */
export const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Request a quote', icon: 'message-square-quote', to: '/app/marketplace' },
  { label: 'Book a movement', icon: 'truck', to: '/app/logistics' },
  { label: 'Start a crew change', icon: 'ship', to: '/app/agency/crew-change' },
  { label: 'Raise a customs entry', icon: 'stamp', to: '/app/customs' },
  { label: 'Send a Compass list', icon: 'clipboard-list', to: '/app/procurement' },
];
