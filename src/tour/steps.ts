/**
 * The guided tour: the demo path, in the order it is actually walked.
 *
 * It opens where the client opens, on their dashboard, and ends on the desk.
 * The client sees first what they get: where their work stands, then MV
 * Choice's list already drafted, approved in one click. The service lines
 * follow, then the commercial screens, the vetting gate and the two previews.
 * The last stop is the agent desk behind it all, the same port call from
 * GAC's side (30 Oct: the platform half of the presentation is client-first).
 *
 * The people most likely to press "start" are panel members who scanned the QR
 * and are looking at this alone, with nobody stood next to them narrating, so
 * each stop says what the screen proves, not what it contains.
 *
 * Keep this in step with the presenter's own TOUR (presenter/src/app/data.js):
 * the two surfaces should tell the same story in the same order, so on the day
 * the presenter clicks Next instead of hunting the sidebar. The copy is what
 * has to match word for word; the addresses are each surface's own.
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
    route: '/app/dashboard',
    anchor: 'consolidation',
    title: 'Where your work stands',
    body: 'Your tier, what it has saved you this year, every port call with its milestones, and what is waiting on you. One screen, before you ask anyone.',
  },
  {
    route: '/app/dashboard',
    anchor: 'approve',
    title: 'Your list is already drafted',
    body: 'MV Choice is due Regent Quay at 08:00. What she bought last time is already listed, three vetted suppliers for each, your billing split applied. One click approves it and nine quote requests go.',
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
    body: 'Upload the crew list you already keep and the LOIs, hotel rooms and taxis follow from it. Then delete the crew’s details when the job is done. Give a flight number and every leg times itself.',
  },
  {
    route: '/app/logistics',
    anchor: null,
    title: 'Cargo you can watch',
    body: 'Booked, collected, in transit, at the GAC warehouse, delivered to the quay. Beside the port call it belongs to, not in a separate system.',
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
    body: 'Replies land side by side, including ones sent as plain Outlook emails. Accept one and the purchase order raises itself in GAC Agent with your split already applied. Nobody re-keys it.',
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
    title: 'The gate you never have to check',
    body: 'Every supplier you can see has passed it. Certification is mandatory, alerts fire at 90, 30 and 7 days, and a lapse blocks booking everywhere. No commercial arrangement overrides it.',
  },
  {
    route: '/app/agency/certification',
    anchor: 'beta',
    title: 'What it could become',
    body: 'Crew certification on the same 90, 30 and 7 day engine as the suppliers, by reference and rank, never a name. A preview, clearly outside this proposal’s scope.',
  },
  {
    route: '/app/agency/bunkers',
    anchor: 'beta',
    title: 'Priced against the call',
    body: 'A bunker enquiry priced in dollars a tonne, ranked all in with barging, each price showing how long it holds. A preview too, outside this proposal’s scope: the platform is a chassis, not a single-purpose tool.',
  },
  {
    route: '/app/internal',
    anchor: 'predictive',
    title: 'Behind it, one desk',
    body: 'The same port call from GAC’s side: the list it drafted, the requests it sent, the order it raised. Nothing typed twice, and the agent’s time goes into the next call.',
  },
];
