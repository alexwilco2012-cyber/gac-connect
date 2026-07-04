/** Supplier plans and promotion products — 03 §3.2. */

export interface PlanDef {
  id: 'free' | 'professional' | 'premium';
  name: string;
  priceLine: string;
  perLine: string;
  popular?: boolean;
  features: { text: string; included: boolean }[];
  cta: string;
}

export const PLANS: PlanDef[] = [
  {
    id: 'free',
    name: 'Free',
    priceLine: '£0',
    perLine: 'forever',
    features: [
      { text: 'SVS-verified profile and GAC Verified badge', included: true },
      { text: 'Appear in marketplace search', included: true },
      { text: 'Receive and respond to quote requests', included: true },
      { text: 'Compliance vault with expiry alerts', included: true },
      { text: 'Featured category placement', included: false },
      { text: 'Performance analytics', included: false },
      { text: 'Homepage spotlight and sponsorship', included: false },
    ],
    cta: 'Start free',
  },
  {
    id: 'professional',
    name: 'Professional',
    priceLine: '£900',
    perLine: 'per year',
    popular: true,
    features: [
      { text: 'Everything in Free', included: true },
      { text: 'Enhanced profile: photos, case studies, capability statements', included: true },
      { text: 'Featured category placement (2 campaigns / month)', included: true },
      { text: 'Performance analytics: views, quote requests, win rate', included: true },
      { text: 'Priority verification renewals', included: true },
      { text: 'Homepage spotlight and category sponsorship', included: false },
    ],
    cta: 'Choose Professional',
  },
  {
    id: 'premium',
    name: 'Premium',
    priceLine: '£1,800',
    perLine: 'per year',
    features: [
      { text: 'Everything in Professional', included: true },
      { text: 'Homepage spotlight rotation', included: true },
      { text: 'Category sponsorship (own a category for a month)', included: true },
      { text: 'Promoted placement in relevant searches, always labelled', included: true },
      { text: 'Full analytics with market benchmarking', included: true },
      { text: 'Quarterly performance review with GAC commercial team', included: true },
    ],
    cta: 'Choose Premium',
  },
];

export const FOUNDER_PROGRAMME =
  'The first 50 suppliers join free for 12 months — full Professional features, no charge — then keep a 25% discount permanently. Founder suppliers shape the platform and carry the badge to prove it.';

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
