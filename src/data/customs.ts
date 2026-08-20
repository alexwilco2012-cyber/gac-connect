import type { Declaration, DeclarationForm } from '../lib/customs';

/**
 * Customs screen copy and demo data. All illustrative and deliberately
 * fictional: no real commodity codes, EORI numbers, entry numbers or
 * declarations appear anywhere on this screen, and none should ever be added.
 */

export const CUSTOMS_INTRO =
  'GAC prepares and submits the entry itself — no broker sits between you and HMRC. Raise a declaration against a movement and the platform carries it through to cleared. Submission and the HMRC response are simulated in this proof of concept.';

/** The boundary, stated on the screen. GAC informs; the customs position is the client's. */
export const INFORMS_NOT_ADVISES =
  'GAC informs, it does not advise. The tariff classification, the customs valuation and the declared position remain yours as importer or exporter — GAC prepares and submits the entry against what you declare, and tells you when something is missing.';

export const DECLARATION_NOTICE =
  'Illustrative — do not enter real commodity codes, EORI numbers or entry references in this proof of concept.';

/** What the client is confirming when they tick the document box. */
export const DOCUMENT_CHECKLIST = [
  {
    title: 'Commercial invoice',
    body: 'Seller, buyer, terms of delivery, currency and a line-by-line value. A pro-forma is accepted for goods moving without a sale, and it has to say so.',
  },
  {
    title: 'Packing list',
    body: 'Packages, marks and numbers, net and gross weight. The weights on the packing list and the transport document should be the same figure.',
  },
  {
    title: 'Transport document',
    body: 'CMR, air waybill or bill of lading, matching the movement the entry is raised against.',
  },
  {
    title: 'Description that identifies the goods',
    body: '“Spares” is not a description. What the item is, what it is made of and what it does — enough for the classification to stand up.',
  },
  {
    title: 'Origin evidence, where preference is claimed',
    body: 'A statement on origin or a certificate. Without it, claim no preference rather than a preference you cannot support.',
  },
  {
    title: 'Licences and controls, where they apply',
    body: 'Dual-use, dangerous goods and controlled items each have their own paperwork. Tell your agent early — this is the item that holds a load at the gate.',
  },
] as const;

/** What a missing line actually costs — the reason the checklist exists. */
export const DELAY_NOTE =
  'An entry raised on an incomplete set is the commonest reason goods sit at the border. The platform will not take a declaration until the set is confirmed complete, which is a day saved at the gate rather than a form saved at the desk.';

const seed = (
  id: string,
  stage: Declaration['stage'],
  createdAt: string,
  form: DeclarationForm,
): Declaration => ({ id, stage, createdAt, form });

/**
 * One entry already running when the visitor arrives, tied to the seeded
 * Rotterdam movement in the logistics store — the 4% line and the 7% line
 * meeting on the same job.
 */
export const SEED_DECLARATIONS: Declaration[] = [
  seed('DEC-1187', 'Submitted to HMRC', 'Tue 19 Aug · 15:05', {
    kind: 'Import clearance',
    consignmentRef: 'CN-2042',
    goods: 'Thruster seal kit — rubber and steel seals for a marine propulsion unit',
    movedFrom: 'Rotterdam',
    movedTo: 'Aberdeen — Regent Quay',
    packages: '1',
    grossWeightKg: '380',
    documentsConfirmed: true,
  }),
];

export const EMPTY_DECLARATION: DeclarationForm = {
  kind: 'Import clearance',
  consignmentRef: '',
  goods: '',
  movedFrom: '',
  movedTo: '',
  packages: '',
  grossWeightKg: '',
  documentsConfirmed: false,
};

/** The demo-fill button — a plausible entry, obviously an example. */
export const DEMO_DECLARATION: DeclarationForm = {
  kind: 'T1 transit',
  consignmentRef: '',
  goods: 'Valve skid and fittings — carbon steel valve assembly on a transport frame',
  movedFrom: 'Stavanger',
  movedTo: 'Aberdeen — Regent Quay',
  packages: '2',
  grossWeightKg: '860',
  documentsConfirmed: false,
};
