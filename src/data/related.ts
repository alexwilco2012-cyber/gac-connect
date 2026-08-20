/**
 * Cross-selling — related services the platform suggests alongside a request.
 * The medical example: a crew member needing medical attention or a
 * certificate usually also needs transport there and back, and sometimes a
 * bed for the night. The platform populates the idea; the GAC agent arranges it
 * inside the existing relationship. All copy is illustrative.
 */

export interface RelatedService {
  id: string;
  label: string;
  body: string;
  /** GAC price is indicative and subject to availability (hotel). */
  availabilityCaveat?: string;
  /** Offers the meal-allowance sliding scale when selected (hotel). */
  offersMealAllowance?: boolean;
}

/** The hotel booking terms — shared by the Hotels category and the medical cross-sell. */
export const HOTEL_AVAILABILITY_CAVEAT =
  'GAC rate is indicative and subject to availability. If the hotel is fully booked, your agent steps in to secure an alternative and confirms it on the platform.';

/** Intro line for the related-services block, per category. */
export const RELATED_INTRO: Record<string, string> = {
  Medical:
    'Medical attention ashore usually means getting there and, sometimes, staying over. The platform suggests it; your agent books it inside the existing relationship.',
  Hotels:
    'A crew stay usually needs a run to and from the quay. The platform suggests it; your agent books it inside the existing relationship.',
};

export const RELATED_SERVICES: Record<string, RelatedService[]> = {
  Hotels: [
    {
      id: 'crew-transfer',
      label: 'Crew transfer',
      body: 'Taxi or minibus between the quay and the hotel, arranged by your GAC agent.',
    },
  ],
  Medical: [
    {
      id: 'crew-transfer',
      label: 'Crew transfer',
      body: 'Taxi or minibus, quay to clinic and back, arranged by your GAC agent.',
    },
    {
      id: 'hotel',
      label: 'Hotel accommodation',
      body: 'Overnight stay for crew held ashore for treatment, medicals, or certificate renewal.',
      availabilityCaveat: HOTEL_AVAILABILITY_CAVEAT,
      offersMealAllowance: true,
    },
  ],
};

/** Default service label for a request raised from a category. */
export const CATEGORY_SERVICE: Record<string, string> = {
  Cranes: 'Crane hire',
  FLT: 'Forklift (FLT) hire',
  Launches: 'Launch / crew transfer',
  Taxis: 'Crew taxi / airport transfer',
  Haulage: 'Road haulage',
  Medical: 'Medical cover',
  Scaffolding: 'Access scaffolding',
  Diving: 'Diving services',
  NDT: 'NDT inspection',
  Welding: 'Welding and fabrication',
  Catering: 'Crew provisions',
  Hotels: 'Hotel accommodation',
  Waste: 'Waste collection',
  Bunkers: 'Bunker coordination',
};

export function relatedServicesFor(category: string): RelatedService[] {
  return RELATED_SERVICES[category] ?? [];
}
