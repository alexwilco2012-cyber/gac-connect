import { CATEGORIES } from './suppliers';

/**
 * The SVS desk (live dashboards, 23 Sep; spec §4.1): the SVS team's two queues
 * — certificate evidence sent in by suppliers, and new suppliers working
 * through onboarding. Seeded here, run through `store/svsDesk`.
 *
 * Nothing here enters `SUPPLIERS`. Applicants are not vetted yet, so they are
 * not in the marketplace, the category counts or the compliance watch; and the
 * seeded evidence comes from suppliers already Verified, so approving it moves
 * no status anywhere (spec §4.4, tested).
 *
 * Fictional companies only (each applicant name was checked against Companies
 * House and a web search on 23 Sep 2026), fictional issuers, obviously
 * illustrative references, and roles — never people — in every audit trail.
 */

/** The certificate types a supplier can send in, in the order the form lists them. */
export const CERT_TYPES: readonly string[] = [
  'Coded welder qualification (BS EN ISO 9606-1)',
  'ISO 9001 quality management',
  'ISO 3834 welding quality requirements',
  'ISO 45001 occupational health and safety',
  'ISO 14001 environmental management',
  'Employers’ liability insurance',
  'Public liability insurance',
  'GWO Basic Safety Training',
  'BOSIET offshore survival',
  'LOLER thorough examination report',
  'Offshore medical',
  'Other',
];

export const ONBOARDING_STAGES = ['Applied', 'Documents', 'Checks', 'Decision'] as const;
export type OnboardingStage = (typeof ONBOARDING_STAGES)[number];

export type CheckId =
  'company' | 'insurance' | 'hse' | 'sanctions' | 'bank' | 'references' | 'category' | 'policies';

export type CheckState = 'pending' | 'passed' | 'failed' | 'na';

/** The eight onboarding checks, in order. The category check's label is per applicant. */
export const CHECKS: readonly { id: CheckId; label: string }[] = [
  { id: 'company', label: 'Company registration and VAT number' },
  { id: 'insurance', label: 'Employers’ and public liability insurance' },
  { id: 'hse', label: 'Health and safety policy, signed within 12 months' },
  { id: 'sanctions', label: 'Sanctions and adverse media screen' },
  { id: 'bank', label: 'Bank details confirmed (Confirmation of Payee)' },
  { id: 'references', label: 'Two trade references' },
  { id: 'category', label: 'Category competence evidence' },
  { id: 'policies', label: 'Anti-bribery and modern slavery statements' },
];

/** Who did it. Roles only — the audit trail never names a person. */
export type Actor = 'SVS team' | 'Applicant' | 'Supplier' | 'System';

export interface TrailEntry {
  at: string;
  by: Actor;
  text: string;
}

export type Risk = 'Low' | 'Medium' | 'High';

export interface Application {
  id: string;
  company: string;
  category: string;
  port: string;
  appliedLabel: string;
  /** Working days since the application arrived; the SLA is five. */
  daysInReview: number;
  stage: OnboardingStage;
  outcome: 'open' | 'approved' | 'declined';
  risk: Risk;
  /** The category check, worded for this applicant's trade. */
  categoryCheckLabel: string;
  checks: Record<CheckId, CheckState>;
  /** An open request for more information, waiting on the applicant. */
  infoRequest?: string;
  /** The approval note or the reason for declining. */
  decisionNote?: string;
  /** Oldest first. */
  trail: TrailEntry[];
}

const checks = (passed: readonly CheckId[]): Record<CheckId, CheckState> => ({
  company: passed.includes('company') ? 'passed' : 'pending',
  insurance: passed.includes('insurance') ? 'passed' : 'pending',
  hse: passed.includes('hse') ? 'passed' : 'pending',
  sanctions: passed.includes('sanctions') ? 'passed' : 'pending',
  bank: passed.includes('bank') ? 'passed' : 'pending',
  references: passed.includes('references') ? 'passed' : 'pending',
  category: passed.includes('category') ? 'passed' : 'pending',
  policies: passed.includes('policies') ? 'passed' : 'pending',
});

const RECEIVED = 'Application received through the For Suppliers page';

/** Four open applicants, one at each stage, newest first — Internal's "4 onboarding". */
export const SEED_APPLICATIONS: Application[] = [
  {
    id: 'APP-3107',
    company: 'Torry Point Rope Access',
    category: 'Rope access',
    port: 'Aberdeen',
    appliedLabel: 'Yesterday',
    daysInReview: 1,
    stage: 'Applied',
    outcome: 'open',
    risk: 'Medium',
    categoryCheckLabel: 'Rope access technician certificates',
    checks: checks(['company']),
    trail: [
      { at: 'Yesterday 14:26', by: 'Applicant', text: RECEIVED },
      {
        at: 'Yesterday 16:05',
        by: 'SVS team',
        text: 'Company registration and VAT number — passed',
      },
    ],
  },
  {
    id: 'APP-3104',
    company: 'Girdle Ness Marine Electrical',
    category: 'Marine electrical',
    port: 'Aberdeen',
    appliedLabel: 'Mon',
    daysInReview: 3,
    stage: 'Documents',
    outcome: 'open',
    risk: 'Low',
    categoryCheckLabel: 'Marine electrical competence certificates',
    checks: checks(['company', 'insurance']),
    infoRequest:
      'The health and safety policy supplied is dated 2023 — please upload the current signed policy.',
    trail: [
      { at: 'Mon 09:40', by: 'Applicant', text: RECEIVED },
      { at: 'Mon 15:10', by: 'SVS team', text: 'Company registration and VAT number — passed' },
      {
        at: 'Tue 10:25',
        by: 'SVS team',
        text: 'Employers’ and public liability insurance — passed',
      },
      {
        at: 'Tue 11:02',
        by: 'SVS team',
        text: 'Asked for more information: the health and safety policy supplied is dated 2023 — please upload the current signed policy.',
      },
    ],
  },
  {
    id: 'APP-3101',
    company: 'Balnagask Hydraulics',
    category: 'Hydraulics',
    port: 'Peterhead',
    appliedLabel: 'Last Fri',
    daysInReview: 4,
    stage: 'Checks',
    outcome: 'open',
    risk: 'Low',
    categoryCheckLabel: 'Hydraulic hose assembly competence',
    checks: checks(['company', 'insurance', 'hse', 'bank', 'category', 'policies']),
    trail: [
      { at: 'Last Fri 11:15', by: 'Applicant', text: RECEIVED },
      { at: 'Mon 10:12', by: 'SVS team', text: 'Documents complete — moved to Checks' },
      {
        at: 'Tue 14:30',
        by: 'SVS team',
        text: 'Bank details confirmed (Confirmation of Payee) — passed',
      },
      { at: 'Wed 09:05', by: 'SVS team', text: 'Sanctions and adverse media screen started' },
    ],
  },
  {
    id: 'APP-3098',
    company: 'Cove Bay Scaffolding',
    category: 'Scaffolding',
    port: 'Montrose',
    appliedLabel: 'Last Wed',
    daysInReview: 6,
    stage: 'Decision',
    outcome: 'open',
    risk: 'Low',
    categoryCheckLabel: 'Scaffolder competence cards',
    checks: checks([
      'company',
      'insurance',
      'hse',
      'sanctions',
      'bank',
      'references',
      'category',
      'policies',
    ]),
    trail: [
      { at: 'Last Wed 10:40', by: 'Applicant', text: RECEIVED },
      { at: 'Last Fri 12:20', by: 'SVS team', text: 'Documents complete — moved to Checks' },
      { at: 'Tue 16:45', by: 'SVS team', text: 'All eight checks passed — moved to Decision' },
    ],
  },
];

export type EvidenceStage = 'submitted' | 'approved' | 'info-requested' | 'rejected';

export interface EvidenceSubmission {
  /** 'EVD-2038' */
  id: string;
  /** `SUPPLIERS[].id` */
  supplierId: string;
  supplierName: string;
  /** A renewal of a certificate already held, or a certificate new to the supplier. */
  kind: 'new' | 'renewal';
  /** One of `CERT_TYPES`, or a vault certificate's name for a renewal. */
  certType: string;
  /** What the certificate is called on screen (the description when the type is Other). */
  certLabel: string;
  /** The vault certificate a renewal replaces. */
  vaultId?: string;
  issuer: string;
  reference: string;
  /** ISO dates. */
  issuedOn: string;
  expiresOn: string;
  /** Days to expiry when it was sent in. */
  daysLeft: number;
  /** Metadata only: the file never leaves the browser. */
  fileName: string;
  fileSize: number;
  submittedAt: string;
  stage: EvidenceStage;
  /** The SVS team's note when it asks for more or rejects. */
  note?: string;
  /** Oldest first. */
  trail: TrailEntry[];
}

/** Two submissions waiting on the SVS team, newest first, from Verified suppliers. */
export const SEED_EVIDENCE: EvidenceSubmission[] = [
  {
    id: 'EVD-2038',
    supplierId: 'caledonia-lifting',
    supplierName: 'Caledonia Lifting Ltd',
    kind: 'renewal',
    certType: 'LOLER thorough examination report',
    certLabel: 'LOLER thorough examination — 60t crawler crane',
    issuer: 'Northgate Lifting Inspection',
    reference: 'LOL-26-5512',
    issuedOn: '2026-09-16',
    expiresOn: '2027-09-15',
    daysLeft: 357,
    fileName: 'LOLER-60t-crawler.pdf',
    fileSize: 1_258_291,
    submittedAt: 'Today 08:05',
    stage: 'submitted',
    trail: [{ at: 'Today 08:05', by: 'Supplier', text: 'Renewal uploaded: LOLER-60t-crawler.pdf' }],
  },
  {
    id: 'EVD-2036',
    supplierId: 'aberdeen-offshore-medical',
    supplierName: 'Aberdeen Offshore Medical',
    kind: 'new',
    certType: 'ISO 45001 occupational health and safety',
    certLabel: 'ISO 45001 occupational health and safety',
    issuer: 'Northgate Quality Assurance',
    reference: 'OHS-45-0877',
    issuedOn: '2026-09-01',
    expiresOn: '2029-08-31',
    daysLeft: 1073,
    fileName: 'ISO45001-certificate.pdf',
    fileSize: 319_488,
    submittedAt: 'Yesterday 15:40',
    stage: 'submitted',
    trail: [
      {
        at: 'Yesterday 15:40',
        by: 'Supplier',
        text: 'Certificate uploaded: ISO45001-certificate.pdf',
      },
    ],
  },
];

/** The SVS team's own measure, shown as a KPI tile. Illustrative. */
export const MEDIAN_VERIFY_LABEL = '3.5 days';

/** Working days the SVS team aims to decide an application in. */
export const SLA_DAYS = 5;

/** Where an invited supplier can be based. */
export const BASE_PORTS: readonly string[] = ['Aberdeen', 'Peterhead', 'Montrose'];

/** The invite form's categories: the applicants' trades, then the marketplace's. */
export const INVITE_CATEGORIES: readonly string[] = [
  ...new Set([
    ...SEED_APPLICATIONS.map((a) => a.category),
    ...CATEGORIES.filter((c) => c !== 'All'),
  ]),
];
