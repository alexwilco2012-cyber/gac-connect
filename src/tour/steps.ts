/**
 * The guided tour: the demo path, in the order it is actually walked.
 *
 * It used to be five stops covering the core flows. It is now the full
 * walkthrough — the same order the presenter takes a room through, service line
 * by service line — because the people most likely to press "start" are panel
 * members who scanned the QR and are looking at this alone, with nobody stood
 * next to them narrating. Each stop says what the screen proves, not what it
 * contains.
 *
 * Keep this in step with the presenter's own TOUR (presenter/src/app/data.js):
 * the two surfaces should tell the same story in the same order.
 */

export interface TourStep {
  /** Route the step lives on. */
  route: string;
  /** data-tour anchor on that route (null = the screen itself is the point). */
  anchor: string | null;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    route: '/app',
    anchor: 'kpis',
    title: 'Where every call stands',
    body: 'Open jobs, quote requests out, suppliers vetted, and the admin hours this replaces. One glance, before anyone asks.',
  },
  {
    route: '/app',
    anchor: 'predictive',
    title: 'The morning starts done',
    body: 'GA already knows what this vessel buys, so the procurement list is drafted before you open it — with the client billing split applied.',
  },
  {
    route: '/app/marketplace',
    anchor: 'search',
    title: 'Vetted, or not bookable',
    body: 'GAC’s own lines pin first, promoted listings are always labelled, and a supplier with lapsed paperwork cannot be booked at any price.',
  },
  {
    route: '/app/agency/crew-change',
    anchor: null,
    title: 'A crew change, end to end',
    body: 'Hotels, taxis timed off the flight, launches by port, immigration guidance, and the LOI and repatriation letters. Give a flight number and every leg times itself.',
  },
  {
    route: '/app/logistics',
    anchor: null,
    title: 'Cargo you can watch',
    body: 'Booked, collected, in transit, at the GAC warehouse, delivered to the quay — beside the port call it belongs to, not in a separate system.',
  },
  {
    route: '/app/customs',
    anchor: null,
    title: 'Customs, without the guesswork',
    body: 'Documents, preparation, submission, clearance. It will not take a declaration until the document set is complete, and it informs rather than advises.',
  },
  {
    route: '/app/procurement',
    anchor: null,
    title: 'One list, one invoice',
    body: 'The list goes to Compass, GAC’s own procurement branch. Compass sources and supplies every line and confirms it back. One relationship, one invoice.',
  },
  {
    route: '/app/quotes',
    anchor: 'queue',
    title: 'Quotes compare themselves',
    body: 'Replies land side by side, including ones sent as plain Outlook emails. Accepting one raises the PO in GA with the split already applied.',
  },
  {
    route: '/app/invoices',
    anchor: 'invoices',
    title: 'Seven days to check it',
    body: 'Allocate the billing party, split a disbursement line by line, match it to the call. A harbour bill at an off-hire splits down the middle here.',
  },
  {
    route: '/app/tiers',
    anchor: 'calculator',
    title: 'Consolidation pays',
    body: 'The highest single tier applies, never the sum. All three lines is Full Stack: 7%, and £35,000 a year on £500k of GAC spend.',
  },
  {
    route: '/app/svs',
    anchor: 'svs',
    title: 'The gate and the early warning',
    body: 'Certification is mandatory, alerts fire at 90, 30 and 7 days, and a lapse blocks booking everywhere. No commercial arrangement overrides it.',
  },
  {
    route: '/app/agency/certification',
    anchor: 'beta',
    title: 'What it could become',
    body: 'Certification tracking and bunker coordination are previews, clearly outside this proposal’s scope. They show the platform is a chassis, not a single-purpose tool.',
  },
];
