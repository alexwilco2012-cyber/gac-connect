import type { CrewField } from '../lib/crewList';
import { VESSELS } from './vessels';

/**
 * Crew list upload — copy and demo data (owner's ask, 23 Aug 2026: let the
 * crew coordinator upload the spreadsheet they already keep, offer the LOIs,
 * hotel rooms and taxis that follow from it, and let them delete the crew's
 * personal data once the job is done).
 *
 * Everything here is illustrative and deliberately fictional. The demo crew
 * are eight rows of the DEMO family with X0000001…X0000008 passports and ZZ
 * flights — numbers that cannot belong to anyone — and the screen tells the
 * user not to upload real passport data in this proof of concept.
 */

/**
 * Column headings a crew coordinator's own spreadsheet might carry, per field.
 * Matching is case-, space- and punctuation-insensitive ('PPT No.' and
 * 'ppt no' are the same heading), so these are written plainly. The first
 * field that claims a heading wins; keep genuinely ambiguous words ('date',
 * 'name', 'type', 'status') on the field a crew list most often means by them.
 */
export const HEADER_SYNONYMS: Record<CrewField, string[]> = {
  familyName: ['family name', 'surname', 'last name', 'lastname', 'family'],
  forenames: [
    'forenames',
    'forename',
    'first name',
    'first names',
    'given name',
    'given names',
    'other names',
  ],
  fullName: ['full name', 'name', 'crew name', 'crew member', 'seafarer', 'crew', 'names'],
  rank: ['rank', 'position', 'role', 'rank position', 'job title', 'capacity'],
  nationality: ['nationality', 'nat', 'nationality nat', 'country', 'citizenship', 'natl'],
  dateOfBirth: ['date of birth', 'dob', 'birth date', 'birthdate', 'born', 'd o b'],
  passportNumber: [
    'passport number',
    'passport no',
    'passport',
    'passport num',
    'ppt',
    'ppt no',
    'ppt number',
    'pp no',
    'pp number',
    'passport nr',
  ],
  passportExpiry: [
    'passport expiry',
    'passport expiry date',
    'expiry',
    'expiry date',
    'exp',
    'exp date',
    'date of expiry',
    'valid until',
    'valid to',
    'passport valid to',
    'passport valid until',
    'ppt exp',
    'ppt expiry',
    'pp exp',
    'pp expiry',
    'passport exp',
  ],
  movement: [
    'on off',
    'on off signer',
    'on',
    'off',
    'movement',
    'type',
    'direction',
    'joining leaving',
    'joiner leaver',
    'status',
    'signing',
    'sign on off',
    'on signer off signer',
    'crew change',
    'join leave',
  ],
  flightNumber: ['flight', 'flight no', 'flight number', 'flt', 'flt no', 'flight nr', 'flights'],
  flightDate: [
    'flight date',
    'date',
    'travel date',
    'arrival date',
    'arr date',
    'departure date',
    'dep date',
    'date of travel',
    'date of flight',
    'flight dt',
  ],
  flightTime: [
    'time',
    'eta',
    'etd',
    'sta',
    'std',
    'eta etd',
    'arrival time',
    'arr time',
    'departure time',
    'dep time',
    'flight time',
    'arrival departure time',
    'arrival',
    'departure',
  ],
  flightFrom: ['from', 'origin', 'routing', 'via', 'from to', 'route', 'sector', 'to'],
  vessel: ['vessel', 'ship', 'vessel name', 'ship name', 'unit', 'rig'],
  port: ['port', 'location', 'port of call', 'joining port', 'crew change port', 'place'],
  visaNational: ['visa', 'visa national', 'visa required', 'visa nat', 'visa needed', 'visa y n'],
};

/** Column order of the downloadable template — and of the demo crew list. */
export const CREW_TEMPLATE_HEADERS: string[] = [
  'Family name',
  'Forenames',
  'Rank',
  'Nationality',
  'Date of birth',
  'Passport number',
  'Passport expiry',
  'On/Off signer',
  'Flight number',
  'Flight date',
  'Arrival/Departure time',
  'From/To',
  'Vessel',
  'Port',
];

const DEMO_VESSEL = VESSELS[0]!;

/**
 * Eight obviously fictional crew in template order. Five on-signers on two
 * arriving flights the demo feed knows (ZZ 417 ×3, ZZ 122 ×2), three
 * off-signers on two departing ones (ZZ 204 ×2, ZZ 131 ×1). Row 7 — an
 * off-signer, where a missing expiry is low-stakes — has no passport expiry,
 * so the check step shows what an issue looks like.
 */
export const DEMO_CREW_ROWS: string[][] = [
  [
    'DEMO',
    'Crew Member 1',
    'Master',
    'Demo nationality A',
    '01/01/1990',
    'X0000001',
    '01/01/2031',
    'On',
    'ZZ 417',
    '22/08/2026',
    '13:55',
    'Amsterdam',
    DEMO_VESSEL.name,
    'Aberdeen',
  ],
  [
    'DEMO',
    'Crew Member 2',
    'Chief Officer',
    'Demo nationality A',
    '02/02/1988',
    'X0000002',
    '01/06/2030',
    'On',
    'ZZ 417',
    '22/08/2026',
    '13:55',
    'Amsterdam',
    DEMO_VESSEL.name,
    'Aberdeen',
  ],
  [
    'DEMO',
    'Crew Member 3',
    'Second Engineer',
    'Demo nationality B',
    '03/03/1992',
    'X0000003',
    '15/09/2032',
    'On',
    'ZZ 417',
    '22/08/2026',
    '13:55',
    'Amsterdam',
    DEMO_VESSEL.name,
    'Aberdeen',
  ],
  [
    'DEMO',
    'Crew Member 4',
    'Bosun',
    'Demo nationality B',
    '04/04/1985',
    'X0000004',
    '30/11/2030',
    'On',
    'ZZ 122',
    '22/08/2026',
    '09:40',
    'London Heathrow',
    DEMO_VESSEL.name,
    'Aberdeen',
  ],
  [
    'DEMO',
    'Crew Member 5',
    'Able Seaman',
    'Demo nationality A',
    '05/05/1995',
    'X0000005',
    '12/03/2033',
    'On',
    'ZZ 122',
    '22/08/2026',
    '09:40',
    'London Heathrow',
    DEMO_VESSEL.name,
    'Aberdeen',
  ],
  [
    'DEMO',
    'Crew Member 6',
    'Chief Engineer',
    'Demo nationality B',
    '06/06/1980',
    'X0000006',
    '20/07/2031',
    'Off',
    'ZZ 204',
    '22/08/2026',
    '17:10',
    'Amsterdam',
    DEMO_VESSEL.name,
    'Aberdeen',
  ],
  [
    'DEMO',
    'Crew Member 7',
    'Cook',
    'Demo nationality A',
    '07/07/1991',
    'X0000007',
    '',
    'Off',
    'ZZ 204',
    '22/08/2026',
    '17:10',
    'Amsterdam',
    DEMO_VESSEL.name,
    'Aberdeen',
  ],
  [
    'DEMO',
    'Crew Member 8',
    'Oiler',
    'Demo nationality B',
    '08/08/1987',
    'X0000008',
    '28/02/2032',
    'Off',
    'ZZ 131',
    '22/08/2026',
    '19:25',
    'London Heathrow',
    DEMO_VESSEL.name,
    'Aberdeen',
  ],
];

/** File name of the downloadable template (no brand string — see src/config/brand.ts). */
export const CREW_TEMPLATE_FILE_NAME = 'crew-list-template.xlsx';

/** The data-protection disclosure shown before anything is uploaded. */
export const CREW_DATA_NOTICE = {
  title: 'How crew data is handled',
  intro:
    'Illustrative notice for this proof of concept — GAC’s published privacy notice governs the live service.',
  points: [
    {
      title: 'What is collected',
      body: 'Names, ranks, nationality, dates of birth, passport numbers and expiry dates, and flight details — the columns your list carries that a crew change needs.',
    },
    {
      title: 'Why',
      body: 'To arrange the crew change you ask for: the immigration letters, the rooms and the transport. Passport details are used only where a letter or a carrier requires them.',
    },
    {
      title: 'Where it goes',
      body: 'Your file is read in this browser and nothing leaves it until you press Submit. From then on GAC’s agency team holds the list for this crew change. Hotels receive names and dates only; taxi operators receive names, flight numbers and pick-up times; immigration letters carry passport details and go to GAC, the carrier and UK Border Force. No supplier you did not choose sees anything.',
    },
    {
      title: 'How long',
      body: 'Until the crew change is complete, plus thirty days, then it is deleted automatically. You can delete it sooner, at any time, from the crew list’s card — one click, confirmed back to you.',
    },
    {
      title: 'Crew members’ rights',
      body: 'Crew can ask what is held about them and for it to be corrected or deleted. Route the request through your GAC agent and it is actioned on the platform the same way.',
    },
  ],
  acknowledgement:
    'I am authorised to share these details for this crew change and the crew have been told they are passed to GAC for it.',
} as const;

/** Shown above the drop zone — same warn style as the letters' notice. */
export const CREW_LIST_ILLUSTRATIVE =
  'Illustrative — do not upload real passport data in this proof of concept. Use the demo crew list or the template with made-up details.';

/** The three service cards offered once the list is checked. */
export const CREW_SERVICE_CARDS = {
  loi: {
    title: 'LOIs for on-signers',
    body: 'An Immigration Support Letter for each visa-national on-signer, raised into the letters pipeline — GAC checks, endorses as agents and returns each one.',
  },
  hotels: {
    title: 'Hotel rooms',
    body: 'Rooms for crew ashore at a GAC-vetted hotel, subject to availability — your agent steps in if the hotel cannot confirm.',
  },
  taxis: {
    title: 'Taxis, timed to the flights',
    body: 'One run per flight, grouped from the list. Flights the feed knows are tracked and re-time on a delay; the rest are timed from the itinerary.',
  },
} as const;

/** The stepper across the top of the section. */
export const CREW_LIST_STEPS = ['Upload', 'Check', 'Choose services', 'Submit', 'Delete when done'];

/** The delete dialog. `bodyAll` is the same sentence scoped to every list, for the delete-all path. */
export const DELETE_CONFIRM = {
  title: 'Delete crew data?',
  body: 'This removes names, passport details, dates of birth and flight details for this list from this device, redacts any letters raised from it, and asks GAC to delete its working copy. The reference, the crew count and the services stay for the invoice. This cannot be undone.',
  bodyAll:
    'This removes names, passport details, dates of birth and flight details for every list that still holds them from this device, redacts any letters raised from them, and asks GAC to delete its working copies. The references, the crew counts and the services stay for the invoice. This cannot be undone.',
  confirm: 'Delete crew data',
  cancel: 'Keep for now',
} as const;
