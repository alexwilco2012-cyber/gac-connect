/** The five-stop tour (01 §C): one sentence per stop, keyboard-operable. */

export interface TourStep {
  /** Route the step lives on. */
  route: string;
  /** data-tour anchor on that route (null = page itself). */
  anchor: string | null;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    route: '/app',
    anchor: 'predictive',
    title: 'The morning starts done',
    body: 'The platform drafts each arriving vessel’s procurement list from GA history before you open it.',
  },
  {
    route: '/app/marketplace',
    anchor: 'search',
    title: 'Every listing is vetted',
    body: 'Search 40+ categories — in-house lines pin first, promoted listings are labelled, blocked suppliers cannot be booked.',
  },
  {
    route: '/app/quotes',
    anchor: 'queue',
    title: 'Quotes compare themselves',
    body: 'Replies land side by side — even ones sent as plain Outlook emails — and accepting one generates the PO.',
  },
  {
    route: '/app/tiers',
    anchor: 'calculator',
    title: 'Consolidation pays',
    body: 'Toggle services and drag the spend slider — the highest single tier you qualify for applies, up to 7%.',
  },
  {
    route: '/app/svs',
    anchor: null,
    title: 'Compliance is the floor',
    body: 'The SVS watches every certificate and blocks lapsed suppliers automatically — nothing reaches a client unchecked.',
  },
];
