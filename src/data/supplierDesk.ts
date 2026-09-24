import { REQUESTS_90, VIEWS_90 } from './analytics';

/**
 * The supplier dashboard's seeded content (live dashboards, 23 Sep; spec §3) —
 * Silver City Welding, the demo supplier. Its quote inbox, the quotes already
 * with clients, the certificate vault, six months of earnings and its latest
 * ratings. Illustrative throughout.
 *
 * The vault is richer than the supplier's `SUPPLIERS` entry on purpose: that
 * entry is the gate every screen reads (status, bookability, the watch list),
 * so it stays exactly as it was; the vault adds issuers, references and dates
 * for the supplier's own view, and never feeds a status (spec §4.4).
 */

export interface InboxRequest {
  id: string;
  service: string;
  vessel: string;
  detail: string;
  replyBy: string;
  tone: 'warn' | 'info';
}

/** Quote requests sitting in the demo supplier's inbox. */
export const SUPPLIER_INBOX: InboxRequest[] = [
  {
    id: 'req-4471',
    service: 'Onboard pipework repair',
    vessel: 'MV Granite Coast',
    detail: 'Coded welder, two days alongside Regent Quay',
    replyBy: 'Reply by 16:00 today',
    tone: 'warn',
  },
  {
    id: 'req-4478',
    service: 'Fabrication — skid frames',
    vessel: 'Wilkinson Drilling mobilisation',
    detail: 'Three frames to drawing, delivered to the GAC warehouse',
    replyBy: 'Reply by Friday 12:00',
    tone: 'info',
  },
];

export interface AwaitingQuote {
  id: string;
  service: string;
  vessel: string;
  amountGbp: number;
  sentLabel: string;
}

/** Quotes already sent and waiting on the client ("Awaiting the client"). */
export const AWAITING_QUOTES: AwaitingQuote[] = [
  {
    id: 'req-4462',
    service: 'Handrail repair',
    vessel: 'MV Boreal',
    amountGbp: 1850,
    sentLabel: 'Sent Tue',
  },
  {
    id: 'req-4455',
    service: 'Coded welder call-out',
    vessel: 'Regent Quay laydown',
    amountGbp: 2400,
    sentLabel: 'Sent Mon',
  },
  {
    id: 'req-4449',
    service: 'Pipe spool fabrication',
    vessel: 'Stronach Subsea',
    amountGbp: 6300,
    sentLabel: 'Sent last week',
  },
];

/** Jobs won so far this month — the third counter on the pipeline strip. */
export const WON_THIS_MONTH = 4;

/** The quote modal's choices. */
export const LEAD_TIMES: readonly string[] = ['Same day', 'Next day', '2–3 days', 'Within a week'];
export const VALIDITY: readonly string[] = ['7 days', '14 days', '30 days'];

export interface VaultCert {
  id: string;
  name: string;
  /** The matching certificate name in `SUPPLIERS` ('GWO' is not held there — see above). */
  svsName: string;
  issuer: string;
  reference: string;
  /** ISO dates; format with `formatDateGB`. */
  issuedOn: string;
  expiresOn: string;
  /** Days to expiry, counted from `VAULT_AS_OF_ISO`. */
  daysLeft: number;
}

/** The date the seeded days-left figures are counted from. */
export const VAULT_AS_OF_ISO = '2026-09-23';

/**
 * Silver City's certificates. Fictional issuers and obviously illustrative
 * references; all three are more than 90 days out, so the supplier stays
 * Verified and no alert fires.
 */
export const SILVER_CITY_VAULT: VaultCert[] = [
  {
    id: 'vc-coded',
    name: 'Coded welder qualifications (BS EN ISO 9606-1)',
    svsName: 'Coding certificates',
    issuer: 'Northgate Weld Certification',
    reference: 'CW-26-0418',
    issuedOn: '2026-03-14',
    expiresOn: '2027-03-13',
    daysLeft: 171,
  },
  {
    id: 'vc-insurance',
    name: 'Employers’ and public liability insurance',
    svsName: 'Insurance',
    issuer: 'Northsound Mutual Insurance',
    reference: 'NSM-EL-7731',
    issuedOn: '2026-02-01',
    expiresOn: '2027-01-31',
    daysLeft: 130,
  },
  {
    id: 'vc-gwo',
    name: 'GWO Basic Safety Training',
    svsName: 'GWO',
    issuer: 'Quayside Safety Training',
    reference: 'GWO-BST-2291',
    issuedOn: '2025-01-09',
    expiresOn: '2027-01-08',
    daysLeft: 107,
  },
];

/** What a complete Welding listing carries: the vault's three plus ISO 9001. */
export const RECOMMENDED_FOR_WELDING: readonly string[] = [
  'Coded welder qualifications (BS EN ISO 9606-1)',
  'Employers’ and public liability insurance',
  'GWO Basic Safety Training',
  'ISO 9001 quality management',
];

/** Earnings through the platform, April to September 2026. */
export const EARNINGS_MONTHS: readonly string[] = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];

/** Work won through the platform each month, in pounds: £56,100 won, £50,490 kept at 10%. */
export const EARNINGS_WON: readonly number[] = [7200, 9850, 6400, 11300, 8750, 12600];

export interface Review {
  id: string;
  stars: number;
  /** A client company or a role — never a person. */
  by: string;
  job: string;
  text: string;
  when: string;
}

/** "Recent ratings" — the latest three of the 72. */
export const RECENT_REVIEWS: Review[] = [
  {
    id: 'rv-1',
    stars: 5,
    by: 'Browne Energy',
    job: 'Onboard pipework repair, MV Boreal',
    text: 'Coded welder on board inside two hours; job signed off first time.',
    when: '2 weeks ago',
  },
  {
    id: 'rv-2',
    stars: 4,
    by: 'GAC agent on close-out',
    job: 'Fabrication call-out, Regent Quay laydown',
    text: 'Good work; paperwork arrived a day after the job.',
    when: '3 weeks ago',
  },
  {
    id: 'rv-3',
    stars: 5,
    by: 'Wilkinson Drilling',
    job: 'Skid frame modifications',
    text: 'Frames to drawing and delivered to the GAC warehouse on the day promised.',
    when: '5 weeks ago',
  },
];

export interface SupplierKpi {
  id: 'views' | 'requests' | 'win' | 'response';
  label: string;
  value: string;
  /** Against the previous 30 days, in words. */
  delta: string;
  /** Daily, last 30 days — drawn as a sparkline. */
  series?: readonly number[];
}

/** The supplier view's four tiles — the same figures as `PERIOD_SUMMARY[30]`. */
export const SUPPLIER_KPIS: SupplierKpi[] = [
  {
    id: 'views',
    label: 'Profile views (30 days)',
    value: '412',
    delta: '+18% on the previous 30 days',
    series: VIEWS_90.slice(60),
  },
  {
    id: 'requests',
    label: 'Quote requests (30 days)',
    value: '38',
    delta: '+12% on the previous 30 days',
    series: REQUESTS_90.slice(60),
  },
  {
    id: 'win',
    label: 'Win rate',
    value: '34%',
    delta: '+4 pts · 12 won of 35 quoted',
  },
  {
    id: 'response',
    label: 'Avg. response time',
    value: '2.1 hrs',
    delta: '0.5 hrs faster',
  },
];
