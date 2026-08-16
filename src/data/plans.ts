/** Supplier plans and promotion products — 03 §3.2 (v12 commission model). */

import { COMMISSION_BANDS } from '../lib/commission';
import type { Plan } from './suppliers';

export interface PlanDef {
  id: Plan;
  name: string;
  priceLine: string;
  perLine: string;
  /** Commission band on third-party work won through the platform. */
  commissionPct: number;
  popular?: boolean;
  features: { text: string; included: boolean }[];
  cta: string;
}

export const PLANS: PlanDef[] = [
  {
    id: 'free',
    name: 'Basic',
    priceLine: '£0',
    perLine: 'free, forever',
    commissionPct: COMMISSION_BANDS.free,
    features: [
      { text: 'SVS-verified profile and GAC Verified badge', included: true },
      { text: 'Appear in marketplace search', included: true },
      { text: 'Receive and respond to quote requests', included: true },
      { text: 'Compliance vault with expiry alerts', included: true },
      { text: 'Featured category placement', included: false },
      { text: 'Performance analytics', included: false },
      { text: 'Eligible for the GAC Gold Band audit', included: false },
    ],
    cta: 'Start on Basic',
  },
  {
    id: 'professional',
    name: 'Professional',
    priceLine: '£900',
    perLine: 'per year',
    commissionPct: COMMISSION_BANDS.professional,
    popular: true,
    features: [
      { text: 'Everything in Basic', included: true },
      { text: 'Enhanced profile: photos, case studies, capability statements', included: true },
      { text: 'Featured category placement (2 campaigns / month)', included: true },
      { text: 'Performance analytics: views, quote requests, win rate', included: true },
      { text: 'Priority verification renewals', included: true },
      { text: 'Eligible for the GAC Gold Band audit', included: false },
    ],
    cta: 'Choose Professional',
  },
  {
    id: 'premium',
    name: 'Premium',
    priceLine: '£1,800',
    perLine: 'per year',
    commissionPct: COMMISSION_BANDS.premium,
    features: [
      { text: 'Everything in Professional', included: true },
      {
        text: 'Eligible for the GAC Gold Band audit — earned annually, never bought',
        included: true,
      },
      { text: 'Homepage spotlight rotation', included: true },
      { text: 'Category sponsorship (own a category for a month)', included: true },
      { text: 'Promoted placement in relevant searches, always labelled', included: true },
      { text: 'Full analytics with market benchmarking', included: true },
      { text: 'Quarterly performance review with GAC commercial team', included: true },
    ],
    cta: 'Choose Premium',
  },
];

export function planById(id: Plan): PlanDef {
  return PLANS.find((p) => p.id === id) ?? PLANS[0]!;
}

/** Founder Programme (v12): first 50 suppliers, first year free, and a
 *  5-point commission-band reduction for the first 24 months. */
export const FOUNDER_LEAD = 'The first 50 suppliers join free for the first year';
export const FOUNDER_BODY =
  'full Professional features, no charge — and hold a 5-point commission-band reduction for 24 months. Founder suppliers shape the platform and carry the badge to prove it.';
export const FOUNDER_PROGRAMME = `${FOUNDER_LEAD} — ${FOUNDER_BODY}`;

/** How commission works — the one new mechanism the platform introduces. */
export const COMMISSION_RULE =
  'Commission applies only to third-party work won through the platform, and is deducted when the supplier invoice matches in GAC Agent — no separate collection, nothing charged to clients, no booking fee. A supplier who commits more keeps more of each job, and can quote sharper because of it.';

export const PROMOTION_PRODUCTS = [
  {
    title: 'Featured category placement',
    body: 'Your listing pinned to the top of a chosen service category for the campaign period, with the Promoted label.',
  },
  {
    title: 'Homepage spotlight',
    body: 'Rotating placement on the client landing view — the first thing operators see when they open the platform.',
  },
  {
    title: 'Category sponsorship',
    body: 'Own a category banner for a month: “Cranes — sponsored by Caledonia Lifting.” One sponsor per category.',
  },
] as const;

export const PROMOTION_RULE =
  'Advertising buys visibility, never trust: promoted listings are always labelled, and no promotion overrides SVS compliance status. A blocked supplier cannot advertise its way back into search.';

/** Supplier analytics example — 03 §3.4. */
export const ANALYTICS_EXAMPLE = [
  { label: 'Profile views (30 days)', value: '412', barPct: 72 },
  { label: 'Quote requests received', value: '38', barPct: 58 },
  { label: 'Win rate', value: '34%', barPct: 34 },
  { label: 'Avg. response time', value: '2.1 hrs', barPct: 86 },
] as const;

/** 30-day quote-request sparkline data (illustrative). */
export const SPARKLINE_30D = [
  1, 2, 1, 0, 3, 2, 1, 2, 4, 1, 0, 2, 3, 1, 2, 0, 1, 3, 2, 4, 2, 1, 0, 2, 1, 3, 2, 1, 2, 3,
] as const;
