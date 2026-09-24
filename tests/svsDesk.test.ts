import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SUPPLIERS, supplierById } from '../src/data/suppliers';
import { CLIENT_ACTIVITY } from '../src/data/clientDesk';
import {
  AWAITING_QUOTES,
  RECOMMENDED_FOR_WELDING,
  SILVER_CITY_VAULT,
  SUPPLIER_INBOX,
  VAULT_AS_OF_ISO,
} from '../src/data/supplierDesk';
import {
  CERT_TYPES,
  CHECKS,
  ONBOARDING_STAGES,
  SEED_APPLICATIONS,
  SEED_EVIDENCE,
  type Actor,
  type Application,
  type EvidenceSubmission,
} from '../src/data/svsDesk';
import { ALERT_TIERS, complianceWatch, deriveStatus } from '../src/lib/svs';
import { readQuotes, useSupplierDesk } from '../src/store/supplierDesk';
import { APPROVED_NOTE, readApplications, readEvidence, useSvsDesk } from '../src/store/svsDesk';
import {
  ACCEPTED_EXTENSIONS,
  EMPTY_CERT_FORM,
  EXAMPLE_CERT_FORM,
  MAX_FILE_BYTES,
  approveBlocker,
  approvedCount,
  canApprove,
  certInForce,
  certsWithApproved,
  checklistProgress,
  daysBetween,
  deskStamp,
  evidenceOpenCount,
  evidenceStatus,
  exampleCertForm,
  fileSizeLabel,
  formatDateGB,
  nextApplicationRef,
  nextEvidenceRef,
  nextOnboardingStage,
  onboardingOpenCount,
  recommendedStatus,
  shiftISO,
  slaState,
  validateCertForm,
  vaultRows,
  type CertForm,
} from '../src/lib/svsDesk';

/**
 * The SVS desk (live dashboards, spec §4): certificate evidence from
 * suppliers, and the onboarding queue for new ones. The rules are pure so the
 * site and the deck can run the same ones; the load-bearing rule is the last
 * block here — approving evidence never moves a supplier's status.
 */

const TODAY = '2026-09-24';
const ISSUED_IN_FUTURE = 'issue date today or earlier — the issue date cannot be in the future';
const app = (id: string): Application => {
  const found = SEED_APPLICATIONS.find((a) => a.id === id);
  if (!found) throw new Error(id);
  return structuredClone(found);
};

function submission(over: Partial<EvidenceSubmission>): EvidenceSubmission {
  return {
    id: 'EVD-2039',
    supplierId: 'silver-city-welding',
    supplierName: 'Silver City Welding',
    kind: 'new',
    certType: 'ISO 9001 quality management',
    certLabel: 'ISO 9001 quality management',
    issuer: 'Northgate Quality Assurance',
    reference: 'QA-9001-2618',
    issuedOn: '2026-09-02',
    expiresOn: '2029-09-01',
    daysLeft: 1073,
    fileName: 'ISO9001-certificate.pdf',
    fileSize: 253_952,
    submittedAt: 'Today 09:12',
    stage: 'submitted',
    trail: [{ at: 'Today 09:12', by: 'Supplier', text: 'Certificate uploaded' }],
    ...over,
  };
}

describe('validateCertForm', () => {
  const valid: CertForm = { ...EXAMPLE_CERT_FORM };

  it('accepts the worked example', () => {
    expect(validateCertForm(valid, TODAY)).toEqual([]);
  });

  it('lists everything missing from an empty form', () => {
    const problems = validateCertForm(EMPTY_CERT_FORM, TODAY);
    expect(problems).toEqual([
      'certificate type',
      'issuing body',
      'reference or certificate number',
      'issue date',
      'expiry date',
      'a file',
      'the confirmation tick',
    ]);
  });

  it('asks for a description only when the type is Other', () => {
    expect(validateCertForm({ ...valid, certType: 'Other' }, TODAY)).toEqual([
      'a description of the certificate',
    ]);
    expect(
      validateCertForm({ ...valid, certType: 'Other', otherLabel: 'Hot work permit' }, TODAY),
    ).toEqual([]);
  });

  it('needs the expiry after the issue date', () => {
    const problems = validateCertForm(
      { ...valid, issuedOn: '2026-09-20', expiresOn: '2026-09-19' },
      TODAY,
    );
    expect(problems).toContain('expiry after issue');
    expect(problems).not.toContain(ISSUED_IN_FUTURE);
  });

  it('refuses an issue date after today', () => {
    expect(validateCertForm({ ...valid, issuedOn: '2026-09-25' }, TODAY)).toEqual([
      ISSUED_IN_FUTURE,
    ]);
    expect(
      validateCertForm({ ...valid, issuedOn: '2028-01-01', expiresOn: '2031-01-01' }, TODAY),
    ).toEqual([ISSUED_IN_FUTURE]);
    // Issued today is fine.
    expect(validateCertForm({ ...valid, issuedOn: TODAY }, TODAY)).toEqual([]);
  });

  it('refuses a certificate that has already expired', () => {
    const problems = validateCertForm(
      { ...valid, issuedOn: '2024-01-01', expiresOn: '2026-09-01' },
      TODAY,
    );
    expect(problems).toEqual(['expiry in the future — this certificate has already expired']);
    expect(validateCertForm({ ...valid, expiresOn: TODAY }, TODAY)).toContain(
      'expiry in the future — this certificate has already expired',
    );
  });

  it('takes PDF, JPG and PNG only, under 10 MB', () => {
    expect(ACCEPTED_EXTENSIONS).toEqual(['.pdf', '.jpg', '.jpeg', '.png']);
    expect(validateCertForm({ ...valid, fileName: 'scan.PNG' }, TODAY)).toEqual([]);
    expect(validateCertForm({ ...valid, fileName: 'photo.jpeg' }, TODAY)).toEqual([]);
    expect(validateCertForm({ ...valid, fileName: 'setup.exe' }, TODAY)).toEqual([
      'file must be a PDF, JPG or PNG',
    ]);
    expect(validateCertForm({ ...valid, fileSize: MAX_FILE_BYTES + 1 }, TODAY)).toEqual([
      'file must be under 10 MB',
    ]);
    expect(validateCertForm({ ...valid, fileSize: MAX_FILE_BYTES }, TODAY)).toEqual([]);
  });

  it('needs the confirmation tick', () => {
    expect(validateCertForm({ ...valid, declared: false }, TODAY)).toEqual([
      'the confirmation tick',
    ]);
  });
});

describe('the worked example — dated from today, so it never goes stale', () => {
  it('is the spec’s ISO 9001 on the demo date', () => {
    expect(exampleCertForm(VAULT_AS_OF_ISO)).toEqual(EXAMPLE_CERT_FORM);
    expect(EXAMPLE_CERT_FORM).toMatchObject({
      certType: 'ISO 9001 quality management',
      issuer: 'Northgate Quality Assurance',
      reference: 'QA-9001-2618',
      issuedOn: '2026-09-02',
      expiresOn: '2029-09-01',
      fileName: 'ISO9001-certificate.pdf',
      fileSize: 248 * 1024,
      declared: true,
    });
  });

  it('was issued three weeks ago and runs three years less a day', () => {
    expect(exampleCertForm('2027-09-21')).toMatchObject({
      issuedOn: '2027-08-31',
      expiresOn: '2030-08-30',
    });
    // Across a year end and a leap day.
    expect(exampleCertForm('2027-01-10')).toMatchObject({
      issuedOn: '2026-12-20',
      expiresOn: '2029-12-19',
    });
    expect(exampleCertForm('2028-03-21')).toMatchObject({
      issuedOn: '2028-02-29',
      expiresOn: '2031-02-28',
    });
  });

  it('passes validation on any day it is filled in', () => {
    for (const day of ['2026-09-23', '2027-09-21', '2029-09-02', '2031-02-28', '2040-01-01']) {
      expect(validateCertForm(exampleCertForm(day), day)).toEqual([]);
    }
  });

  it('shiftISO moves a date by years and days, in calendar terms', () => {
    expect(shiftISO('2026-09-23', { days: -21 })).toBe('2026-09-02');
    expect(shiftISO('2026-09-02', { years: 3, days: -1 })).toBe('2029-09-01');
    expect(shiftISO('2026-03-28', { days: 2 })).toBe('2026-03-30');
    expect(shiftISO('2024-02-29', { years: 1 })).toBe('2025-03-01');
    expect(shiftISO('not a date', { days: 1 })).toBe('not a date');
  });
});

describe('formatting helpers', () => {
  it('fileSizeLabel reads like a file browser', () => {
    expect(fileSizeLabel(253_952)).toBe('248 KB');
    expect(fileSizeLabel(1_258_291)).toBe('1.2 MB');
    expect(fileSizeLabel(319_488)).toBe('312 KB');
    expect(fileSizeLabel(512)).toBe('512 bytes');
    expect(fileSizeLabel(MAX_FILE_BYTES)).toBe('10 MB');
    expect(fileSizeLabel(11 * 1024 * 1024)).toBe('11 MB');
    expect(fileSizeLabel(150 * 1024 * 1024)).toBe('150 MB');
  });

  it('fileSizeLabel keeps one decimal near the limit, so a refused file never reads “10 MB”', () => {
    // "This file is 10.3 MB; the limit is 10 MB." — not "10 MB; the limit is 10 MB".
    expect(fileSizeLabel(Math.round(10.3 * 1024 * 1024))).toBe('10.3 MB');
    expect(fileSizeLabel(Math.round(10.49 * 1024 * 1024))).toBe('10.5 MB');
    // A byte over the limit is over it, and says so.
    expect(fileSizeLabel(MAX_FILE_BYTES + 1)).toBe('10.1 MB');
    expect(validateCertForm({ ...EXAMPLE_CERT_FORM, fileSize: MAX_FILE_BYTES + 1 }, TODAY)).toEqual(
      ['file must be under 10 MB'],
    );
    // Just under the limit is accepted, and reads as the limit at most.
    const justUnder = Math.round(9.96 * 1024 * 1024);
    expect(fileSizeLabel(justUnder)).toBe('10 MB');
    expect(validateCertForm({ ...EXAMPLE_CERT_FORM, fileSize: justUnder }, TODAY)).toEqual([]);
  });

  it('deskStamp reads “Today HH:MM”, like the seeded desk entries', () => {
    expect(deskStamp(new Date(2026, 8, 24, 9, 5))).toBe('Today 09:05');
    expect(deskStamp(new Date(2026, 8, 23, 21, 1))).toBe('Today 21:01');
    expect(deskStamp(new Date(2026, 8, 24, 0, 0))).toBe('Today 00:00');
    expect(SEED_EVIDENCE[0]!.submittedAt).toMatch(/^Today \d{2}:\d{2}$/);
  });

  it('every seeded “Today” stamp comes before the demo’s 08:00, so working-day entries read later', () => {
    // A new entry sorts above the seeds ("newest first"); stamped from the
    // device during the working day, it must also read later than them.
    const seeds = JSON.stringify([
      SEED_EVIDENCE,
      SEED_APPLICATIONS,
      CLIENT_ACTIVITY,
      SUPPLIER_INBOX,
      AWAITING_QUOTES,
    ]);
    const stamps = [...seeds.matchAll(/Today (\d{2}:\d{2})/g)].map((m) => m[1]!);
    expect(stamps).toContain('07:35');
    for (const hhmm of stamps) expect(hhmm < '08:00').toBe(true);
    const first = deskStamp(new Date(2026, 8, 24, 8, 0)).slice('Today '.length);
    expect(stamps.every((hhmm) => hhmm < first)).toBe(true);
  });

  it('formatDateGB writes British dates without a leading zero', () => {
    expect(formatDateGB('2027-03-13')).toBe('13 Mar 2027');
    expect(formatDateGB('2029-09-01')).toBe('1 Sep 2029');
    expect(formatDateGB('')).toBe('');
  });

  it('daysBetween counts whole days, whatever the clocks do', () => {
    expect(daysBetween('2026-09-23', '2027-03-13')).toBe(171);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-09-24', '2026-09-23')).toBe(-1);
  });

  it('the vault’s days-left figures are counted from the date they state', () => {
    for (const c of SILVER_CITY_VAULT) {
      expect(daysBetween(VAULT_AS_OF_ISO, c.expiresOn)).toBe(c.daysLeft);
    }
    for (const e of SEED_EVIDENCE) {
      expect(daysBetween(VAULT_AS_OF_ISO, e.expiresOn)).toBe(e.daysLeft);
    }
  });
});

describe('references', () => {
  it('evidence runs on from the highest reference held', () => {
    expect(nextEvidenceRef(SEED_EVIDENCE)).toBe('EVD-2039');
    expect(nextEvidenceRef([...SEED_EVIDENCE, { id: 'EVD-2044' }])).toBe('EVD-2045');
    expect(nextEvidenceRef([])).toBe('EVD-2039');
  });

  it('applications run on from the highest reference held', () => {
    expect(nextApplicationRef(SEED_APPLICATIONS)).toBe('APP-3108');
    expect(nextApplicationRef([{ id: 'APP-3120' }, { id: 'junk' }])).toBe('APP-3121');
  });
});

describe('evidence status', () => {
  it('labels and tones each stage', () => {
    expect(evidenceStatus('submitted')).toEqual({ label: 'Awaiting SVS review', tone: 'info' });
    expect(evidenceStatus('approved')).toEqual({
      label: 'Verified by the SVS team',
      tone: 'verified',
    });
    expect(evidenceStatus('info-requested')).toEqual({
      label: 'More information needed',
      tone: 'warn',
    });
    expect(evidenceStatus('rejected')).toEqual({ label: 'Rejected', tone: 'danger' });
  });

  it('counts only what is waiting on the SVS team', () => {
    expect(evidenceOpenCount(SEED_EVIDENCE)).toBe(2);
    expect(
      evidenceOpenCount([
        submission({ stage: 'approved' }),
        submission({ id: 'EVD-2040', stage: 'submitted' }),
      ]),
    ).toBe(1);
  });
});

describe('onboarding', () => {
  it('seeds exactly four open applicants — Internal’s “4 onboarding”', () => {
    expect(SEED_APPLICATIONS).toHaveLength(4);
    expect(onboardingOpenCount(SEED_APPLICATIONS)).toBe(4);
    expect(approvedCount(SEED_APPLICATIONS)).toBe(0);
    // One applicant at each stage, newest first.
    expect(SEED_APPLICATIONS.map((a) => a.stage)).toEqual([...ONBOARDING_STAGES]);
    expect(SEED_APPLICATIONS.every((a) => a.outcome === 'open')).toBe(true);
  });

  it('never adds an applicant to the marketplace suppliers', () => {
    const names = new Set(SUPPLIERS.map((s) => s.name));
    for (const a of SEED_APPLICATIONS) expect(names.has(a.company)).toBe(false);
  });

  it('checklistProgress counts passed and not-applicable out of eight', () => {
    expect(CHECKS).toHaveLength(8);
    expect(checklistProgress(app('APP-3101'))).toEqual({ done: 6, total: 8 });
    const withNa = app('APP-3101');
    withNa.checks.sanctions = 'na';
    expect(checklistProgress(withNa)).toEqual({ done: 7, total: 8 });
    expect(checklistProgress(app('APP-3098'))).toEqual({ done: 8, total: 8 });
    expect(checklistProgress(app('APP-3107'))).toEqual({ done: 1, total: 8 });
  });

  it('can approve only at Decision, every check passed or N/A, nothing asked of the applicant', () => {
    const ready = app('APP-3098');
    expect(canApprove(ready)).toBe(true);
    expect(approveBlocker(ready)).toBeNull();

    const checks = app('APP-3101');
    expect(canApprove(checks)).toBe(false);
    expect(approveBlocker(checks)).toMatch(/Sanctions and adverse media screen/);

    const na = app('APP-3098');
    na.checks.references = 'na';
    expect(canApprove(na)).toBe(true);

    const failed = app('APP-3098');
    failed.checks.bank = 'failed';
    expect(canApprove(failed)).toBe(false);
    expect(approveBlocker(failed)).toMatch(/failed/);

    const asked = app('APP-3098');
    asked.infoRequest = 'Please upload the signed policy.';
    expect(canApprove(asked)).toBe(false);
    expect(approveBlocker(asked)).toMatch(/applicant/i);

    const early = app('APP-3098');
    early.stage = 'Checks';
    expect(canApprove(early)).toBe(false);
    expect(approveBlocker(early)).toMatch(/Decision/);

    const done = app('APP-3098');
    done.outcome = 'approved';
    expect(canApprove(done)).toBe(false);
  });

  it('moves one stage at a time and never past Decision', () => {
    expect(nextOnboardingStage('Applied')).toBe('Documents');
    expect(nextOnboardingStage('Documents')).toBe('Checks');
    expect(nextOnboardingStage('Checks')).toBe('Decision');
    expect(nextOnboardingStage('Decision')).toBe('Decision');
  });

  it('slaState: under 4 days is fine, 4–5 is due, beyond 5 is overdue', () => {
    const at = (days: number) => ({ ...app('APP-3107'), daysInReview: days });
    expect(slaState(at(1))).toEqual({ state: 'ok', label: 'Day 1 of 5' });
    expect(slaState(at(3)).state).toBe('ok');
    expect(slaState(at(4))).toEqual({ state: 'due', label: 'Day 4 of 5' });
    expect(slaState(at(5)).state).toBe('due');
    expect(slaState(at(6))).toEqual({ state: 'over', label: 'Overdue · day 6 of 5' });
    expect(slaState(app('APP-3098')).state).toBe('over');
    expect(slaState(app('APP-3101')).state).toBe('due');
  });

  it('names roles, never people, in every audit trail', () => {
    const actors: readonly Actor[] = ['SVS team', 'Applicant', 'Supplier', 'System'];
    const trails = [...SEED_APPLICATIONS, ...SEED_EVIDENCE].flatMap((x) => x.trail);
    expect(trails.length).toBeGreaterThan(0);
    for (const t of trails) expect(actors).toContain(t.by);
    for (const a of SEED_APPLICATIONS) {
      expect(a.trail.length).toBeGreaterThanOrEqual(2);
      expect(a.trail.length).toBeLessThanOrEqual(4);
    }
  });

  it('keeps the certificate list in the stated order, ending with Other', () => {
    expect(CERT_TYPES[0]).toBe('Coded welder qualification (BS EN ISO 9606-1)');
    expect(CERT_TYPES.at(-1)).toBe('Other');
    expect(CERT_TYPES).toHaveLength(12);
  });
});

describe('vaultRows — how a submission shows on the supplier’s certificate list', () => {
  const SUP = 'silver-city-welding';

  it('with nothing submitted, shows the three vault certificates in date', () => {
    const rows = vaultRows(SILVER_CITY_VAULT, [], SUP);
    expect(rows.map((r) => r.id)).toEqual(['vc-coded', 'vc-insurance', 'vc-gwo']);
    for (const r of rows) {
      expect(r.state).toBe('ok');
      expect(r.statusTone).toBe('verified');
    }
    expect(rows[0]!.daysLeft).toBe(171);
  });

  it('a pending renewal sits beside the current dates', () => {
    const renewal = submission({
      kind: 'renewal',
      vaultId: 'vc-gwo',
      certType: 'GWO Basic Safety Training',
      certLabel: 'GWO Basic Safety Training',
      expiresOn: '2029-01-08',
      daysLeft: 837,
    });
    const gwo = vaultRows(SILVER_CITY_VAULT, [renewal], SUP).find((r) => r.id === 'vc-gwo')!;
    expect(gwo.pendingRenewal).toBe(true);
    expect(gwo.statusLabel).toBe('Renewal awaiting SVS review');
    expect(gwo.statusTone).toBe('info');
    expect(gwo.expiresOn).toBe('2027-01-08');
    expect(gwo.daysLeft).toBe(107);
    expect(gwo.submissionId).toBe('EVD-2039');
  });

  it('an approved renewal takes the new dates', () => {
    const renewal = submission({
      kind: 'renewal',
      vaultId: 'vc-gwo',
      stage: 'approved',
      issuer: 'Quayside Safety Training',
      reference: 'GWO-BST-3310',
      expiresOn: '2029-01-08',
      daysLeft: 837,
    });
    const rows = vaultRows(SILVER_CITY_VAULT, [renewal], SUP);
    const gwo = rows.find((r) => r.id === 'vc-gwo')!;
    expect(gwo.expiresOn).toBe('2029-01-08');
    expect(gwo.daysLeft).toBe(837);
    expect(gwo.reference).toBe('GWO-BST-3310');
    expect(gwo.state).toBe('ok');
    expect(gwo.statusLabel).toBe('Verified by the SVS team');
    expect(gwo.pendingRenewal).toBeFalsy();
    expect(rows).toHaveLength(3);
  });

  describe('a later renewal never undoes an approved one', () => {
    const approvedRenewal = submission({
      id: 'EVD-2039',
      kind: 'renewal',
      vaultId: 'vc-gwo',
      certType: 'GWO Basic Safety Training',
      certLabel: 'GWO Basic Safety Training',
      stage: 'approved',
      issuer: 'Quayside Safety Training',
      reference: 'GWO-BST-2292',
      issuedOn: '2026-09-21',
      expiresOn: '2028-09-20',
      daysLeft: 728,
    });
    const again = (over: Partial<EvidenceSubmission>) =>
      submission({
        ...approvedRenewal,
        id: 'EVD-2040',
        reference: 'GWO-BST-2293',
        expiresOn: '2029-09-20',
        daysLeft: 1093,
        ...over,
      });
    const gwoOf = (evidence: EvidenceSubmission[]) =>
      vaultRows(SILVER_CITY_VAULT, evidence, SUP).find((r) => r.id === 'vc-gwo')!;
    const inForce = { reference: 'GWO-BST-2292', expiresOn: '2028-09-20', daysLeft: 728 };

    it('approved, then another renewal pending: awaiting review beside the approved dates', () => {
      const gwo = gwoOf([approvedRenewal, again({ stage: 'submitted' })]);
      expect(gwo).toMatchObject({
        ...inForce,
        state: 'ok',
        statusLabel: 'Renewal awaiting SVS review',
        statusTone: 'info',
        pendingRenewal: true,
        submissionId: 'EVD-2040',
      });
    });

    it('approved, then another renewal rejected: rejected, and the approved dates stand', () => {
      const gwo = gwoOf([again({ stage: 'rejected', note: 'Wrong course.' }), approvedRenewal]);
      expect(gwo).toMatchObject({
        ...inForce,
        state: 'ok',
        statusLabel: 'Renewal rejected',
        statusTone: 'danger',
        note: 'Wrong course.',
        submissionId: 'EVD-2040',
      });
      expect(gwo.pendingRenewal).toBeFalsy();
    });

    it('approved, then another renewal sent back: more information, the approved dates stand', () => {
      const gwo = gwoOf([approvedRenewal, again({ stage: 'info-requested', note: 'Cut off.' })]);
      expect(gwo).toMatchObject({
        ...inForce,
        state: 'ok',
        statusLabel: 'More information needed',
        note: 'Cut off.',
      });
    });

    it('approved twice: the latest approval is in force', () => {
      const gwo = gwoOf([approvedRenewal, again({ stage: 'approved' })]);
      expect(gwo).toMatchObject({
        reference: 'GWO-BST-2293',
        expiresOn: '2029-09-20',
        daysLeft: 1093,
        statusLabel: 'Verified by the SVS team',
        submissionId: 'EVD-2040',
      });
    });

    it('certInForce hands the renewal form the certificate the row shows', () => {
      const vault = SILVER_CITY_VAULT.find((v) => v.id === 'vc-gwo')!;
      expect(certInForce(vault, [], SUP)).toEqual(vault);
      const evidence = [approvedRenewal, again({ stage: 'rejected', note: 'x' })];
      expect(certInForce(vault, evidence, SUP)).toEqual({
        ...vault,
        issuer: 'Quayside Safety Training',
        reference: 'GWO-BST-2292',
        issuedOn: '2026-09-21',
        expiresOn: '2028-09-20',
        daysLeft: 728,
      });
      // Someone else's approval is not this supplier's certificate.
      expect(certInForce(vault, evidence, 'granite-ndt')).toEqual(vault);
    });
  });

  it('marks a certificate due at the widest SVS alert tier, not before', () => {
    const widest = Math.max(...ALERT_TIERS);
    const at = (daysLeft: number) =>
      vaultRows([{ ...SILVER_CITY_VAULT[0]!, daysLeft }], [], SUP)[0]!;
    expect(at(widest)).toMatchObject({ state: 'due', statusLabel: 'Renewal due' });
    expect(at(widest + 1)).toMatchObject({ state: 'ok', statusLabel: 'In date' });
    expect(at(1).state).toBe('due');
    expect(at(0)).toMatchObject({ state: 'lapsed', statusLabel: 'Lapsed' });
  });

  it('a new certificate is an extra row, and shows each outcome', () => {
    const pending = vaultRows(SILVER_CITY_VAULT, [submission({})], SUP);
    expect(pending).toHaveLength(4);
    expect(pending[3]).toMatchObject({
      name: 'ISO 9001 quality management',
      state: 'pending',
      statusLabel: 'Awaiting SVS review',
      statusTone: 'info',
      submissionId: 'EVD-2039',
    });

    const approved = vaultRows(SILVER_CITY_VAULT, [submission({ stage: 'approved' })], SUP);
    expect(approved[3]).toMatchObject({ state: 'ok', statusLabel: 'Verified by the SVS team' });

    const info = vaultRows(
      SILVER_CITY_VAULT,
      [submission({ stage: 'info-requested', note: 'The scan is cut off.' })],
      SUP,
    );
    expect(info[3]).toMatchObject({
      state: 'info',
      statusLabel: 'More information needed',
      statusTone: 'warn',
      note: 'The scan is cut off.',
    });

    const rejected = vaultRows(
      SILVER_CITY_VAULT,
      [submission({ stage: 'rejected', note: 'Not a certificate.' })],
      SUP,
    );
    expect(rejected[3]).toMatchObject({ state: 'rejected', statusTone: 'danger' });
  });

  it('a re-upload supersedes the earlier submission of the same certificate', () => {
    const rows = vaultRows(
      SILVER_CITY_VAULT,
      [
        submission({ id: 'EVD-2040', stage: 'submitted' }),
        submission({ id: 'EVD-2039', stage: 'info-requested', note: 'Cut off.' }),
      ],
      SUP,
    );
    expect(rows).toHaveLength(4);
    expect(rows[3]!.submissionId).toBe('EVD-2040');
  });

  describe('an approved new certificate stays on file when the same type is sent again', () => {
    const approvedIso = submission({ id: 'EVD-2039', stage: 'approved' });
    const resent = (over: Partial<EvidenceSubmission>) =>
      submission({ id: 'EVD-2040', reference: 'QA-9001-2619', ...over });
    const isoRows = (evidence: EvidenceSubmission[]) =>
      vaultRows(SILVER_CITY_VAULT, evidence, SUP).filter(
        (r) => r.name === 'ISO 9001 quality management',
      );
    /** What the dashboard counts as held must be what the register and profile list. */
    const agrees = (evidence: EvidenceSubmission[]) => {
      const silver = supplierById(SUP)!;
      const held = certsWithApproved(SUP, silver.certs, evidence).map((c) => c.name);
      const rec = recommendedStatus(vaultRows(SILVER_CITY_VAULT, evidence, SUP));
      expect(held.includes('ISO 9001 quality management')).toBe(
        !rec.missing.includes('ISO 9001 quality management') &&
          !rec.pending.includes('ISO 9001 quality management'),
      );
    };

    it('approved, then sent again: the verified row stays, the new one waits beside it', () => {
      const evidence = [resent({ stage: 'submitted' }), approvedIso];
      const rows = isoRows(evidence);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({
        submissionId: 'EVD-2039',
        state: 'ok',
        statusLabel: 'Verified by the SVS team',
        statusTone: 'verified',
        reference: 'QA-9001-2618',
      });
      expect(rows[1]).toMatchObject({
        submissionId: 'EVD-2040',
        state: 'pending',
        statusLabel: 'Update awaiting SVS review',
        statusTone: 'info',
        reference: 'QA-9001-2619',
      });
      expect(recommendedStatus(vaultRows(SILVER_CITY_VAULT, evidence, SUP))).toEqual({
        onFile: 4,
        total: 4,
        missing: [],
        pending: [],
      });
      agrees(evidence);
    });

    it('approved, then sent again and rejected: still on file, the refusal shown on its own row', () => {
      const evidence = [approvedIso, resent({ stage: 'rejected', note: 'Not legible.' })];
      const rows = isoRows(evidence);
      expect(rows.map((r) => [r.submissionId, r.state])).toEqual([
        ['EVD-2039', 'ok'],
        ['EVD-2040', 'rejected'],
      ]);
      expect(rows[1]).toMatchObject({ statusLabel: 'Update rejected', note: 'Not legible.' });
      expect(recommendedStatus(vaultRows(SILVER_CITY_VAULT, evidence, SUP)).missing).toEqual([]);
      agrees(evidence);
    });

    it('approved, then sent again and sent back: more information on the new row only', () => {
      const evidence = [approvedIso, resent({ stage: 'info-requested', note: 'Cut off.' })];
      const rows = isoRows(evidence);
      expect(rows.map((r) => [r.submissionId, r.state])).toEqual([
        ['EVD-2039', 'ok'],
        ['EVD-2040', 'info'],
      ]);
      expect(rows[1]).toMatchObject({ statusLabel: 'More information needed', note: 'Cut off.' });
      agrees(evidence);
    });

    it('only the newest update shows; anything older than the approval is superseded', () => {
      const evidence = [
        submission({ id: 'EVD-2037', stage: 'rejected', note: 'Old.' }),
        approvedIso,
        resent({ stage: 'info-requested', note: 'Cut off.' }),
        resent({ id: 'EVD-2041', stage: 'submitted' }),
      ];
      expect(isoRows(evidence).map((r) => r.submissionId)).toEqual(['EVD-2039', 'EVD-2041']);
      agrees(evidence);
    });

    it('approved again: the latest approval is the one on file, with no update row', () => {
      const evidence = [approvedIso, resent({ stage: 'approved' })];
      expect(isoRows(evidence).map((r) => [r.submissionId, r.state])).toEqual([['EVD-2040', 'ok']]);
      const silver = supplierById(SUP)!;
      expect(
        certsWithApproved(SUP, silver.certs, evidence).filter(
          (c) => c.name === 'ISO 9001 quality management',
        ),
      ).toHaveLength(1);
      agrees(evidence);
    });

    it('with nothing approved, the dashboard and the register agree it is not held', () => {
      agrees([]);
      agrees([submission({})]);
      agrees([submission({ stage: 'rejected', note: 'x' })]);
      agrees([submission({ stage: 'approved' })]);
    });
  });

  it('ignores other suppliers’ evidence', () => {
    expect(vaultRows(SILVER_CITY_VAULT, SEED_EVIDENCE, SUP)).toHaveLength(3);
  });

  it('recommendedStatus counts what the Welding listing still lacks', () => {
    expect(RECOMMENDED_FOR_WELDING).toHaveLength(4);
    expect(recommendedStatus(vaultRows(SILVER_CITY_VAULT, [], SUP))).toEqual({
      onFile: 3,
      total: 4,
      missing: ['ISO 9001 quality management'],
      pending: [],
    });
    expect(recommendedStatus(vaultRows(SILVER_CITY_VAULT, [submission({})], SUP))).toEqual({
      onFile: 3,
      total: 4,
      missing: [],
      pending: ['ISO 9001 quality management'],
    });
    expect(
      recommendedStatus(vaultRows(SILVER_CITY_VAULT, [submission({ stage: 'approved' })], SUP)),
    ).toEqual({ onFile: 4, total: 4, missing: [], pending: [] });
  });
});

describe('certsWithApproved — the overlay rule (spec §4.4)', () => {
  const approvedIso = submission({ stage: 'approved' });

  it('appends an approved new certificate, in date', () => {
    const silver = supplierById('silver-city-welding')!;
    const certs = certsWithApproved(silver.id, silver.certs, [approvedIso]);
    expect(certs).toEqual([...silver.certs, { name: 'ISO 9001 quality management', state: 'ok' }]);
  });

  it('ignores submissions that are pending, refused, renewals, or someone else’s', () => {
    const silver = supplierById('silver-city-welding')!;
    const noise = [
      submission({ id: 'EVD-2040' }),
      submission({ id: 'EVD-2041', stage: 'rejected', note: 'x' }),
      submission({ id: 'EVD-2042', kind: 'renewal', vaultId: 'vc-gwo', stage: 'approved' }),
      submission({ id: 'EVD-2043', supplierId: 'granite-ndt', stage: 'approved' }),
    ];
    expect(certsWithApproved(silver.id, silver.certs, noise)).toEqual(silver.certs);
  });

  it('never changes an existing certificate, so no status, gate or alert ever moves', () => {
    // Approve everything there is, for every supplier, including the blocked one.
    const everything: EvidenceSubmission[] = [
      ...SEED_EVIDENCE.map((e) => ({ ...e, stage: 'approved' as const })),
      ...SUPPLIERS.map((s, i) =>
        submission({
          id: `EVD-${3000 + i}`,
          supplierId: s.id,
          supplierName: s.name,
          stage: 'approved',
        }),
      ),
    ];
    const overlaid = SUPPLIERS.map((s) => ({
      name: s.name,
      certs: certsWithApproved(s.id, s.certs, everything),
    }));
    SUPPLIERS.forEach((s, i) => {
      expect(deriveStatus(overlaid[i]!.certs)).toBe(deriveStatus(s.certs));
      expect(overlaid[i]!.certs.slice(0, s.certs.length)).toEqual(s.certs);
    });
    expect(complianceWatch(overlaid)).toEqual(complianceWatch(SUPPLIERS));
    expect(complianceWatch(overlaid).map((w) => w.name)).toEqual([
      'Peterhead Diving Services',
      'Granite NDT Ltd',
      'Mearns Heavy Transport',
    ]);
  });

  it('seeds evidence only from verified suppliers, by their real ids', () => {
    expect(SEED_EVIDENCE.map((e) => e.id)).toEqual(['EVD-2038', 'EVD-2036']);
    for (const e of SEED_EVIDENCE) {
      const s = supplierById(e.supplierId);
      expect(s).toBeDefined();
      expect(deriveStatus(s!.certs)).toBe('verified');
      expect(e.supplierName).toBe(s!.name);
    }
  });
});

describe('the SVS desk store', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useSvsDesk.getState().reset();
    useSupplierDesk.getState().reset();
  });

  const byId = (id: string) => useSvsDesk.getState().applications.find((a) => a.id === id)!;
  const evidence = (id: string) => useSvsDesk.getState().evidence.find((e) => e.id === id)!;

  it('a submission keeps metadata only, lands first, and says who sent it', () => {
    const id = useSvsDesk.getState().submitEvidence({
      supplierId: 'silver-city-welding',
      supplierName: 'Silver City Welding',
      kind: 'new',
      form: { ...EXAMPLE_CERT_FORM, certType: 'Other', otherLabel: '  Hot work permit  ' },
    });
    expect(id).toBe('EVD-2039');
    const e = useSvsDesk.getState().evidence[0]!;
    expect(e).toMatchObject({
      id,
      certLabel: 'Hot work permit',
      stage: 'submitted',
      fileName: 'ISO9001-certificate.pdf',
      fileSize: 248 * 1024,
    });
    expect(e.trail.map((t) => t.by)).toEqual(['Supplier']);
    expect(evidenceOpenCount(useSvsDesk.getState().evidence)).toBe(3);
    const stored = JSON.parse(window.localStorage.getItem('gac-connect:svsDesk.evidence')!);
    expect(stored[0].id).toBe(id);
  });

  it('a renewal remembers the vault certificate it replaces', () => {
    const id = useSvsDesk.getState().submitEvidence({
      supplierId: 'silver-city-welding',
      supplierName: 'Silver City Welding',
      kind: 'renewal',
      vaultId: 'vc-gwo',
      form: { ...EXAMPLE_CERT_FORM, certType: 'GWO Basic Safety Training' },
    });
    expect(evidence(id).vaultId).toBe('vc-gwo');
    const rows = vaultRows(
      SILVER_CITY_VAULT,
      useSvsDesk.getState().evidence,
      'silver-city-welding',
    );
    expect(rows.find((r) => r.id === 'vc-gwo')?.pendingRenewal).toBe(true);
  });

  it('asking for more or rejecting needs a note; approving does not', () => {
    useSvsDesk.getState().decideEvidence('EVD-2038', 'rejected', '   ');
    expect(evidence('EVD-2038').stage).toBe('submitted');
    useSvsDesk
      .getState()
      .decideEvidence('EVD-2038', 'info-requested', 'The scan is cut off at the foot.');
    expect(evidence('EVD-2038')).toMatchObject({
      stage: 'info-requested',
      note: 'The scan is cut off at the foot.',
    });
    expect(evidence('EVD-2038').trail.at(-1)?.by).toBe('SVS team');
    // Decided items stay decided.
    useSvsDesk.getState().decideEvidence('EVD-2038', 'approved');
    expect(evidence('EVD-2038').stage).toBe('info-requested');
    useSvsDesk.getState().decideEvidence('EVD-2036', 'approved');
    expect(evidence('EVD-2036').stage).toBe('approved');
    expect(evidenceOpenCount(useSvsDesk.getState().evidence)).toBe(0);
  });

  it('checks, stages and information requests each leave a trail entry', () => {
    const svs = useSvsDesk.getState();
    const before = byId('APP-3107').trail.length;
    svs.setCheck('APP-3107', 'insurance', 'passed');
    svs.setCheck('APP-3107', 'insurance', 'passed'); // no change, no entry
    svs.advanceApplication('APP-3107');
    svs.requestInfo('APP-3107', '');
    svs.requestInfo('APP-3107', 'Please send two trade references.');
    svs.clearInfoRequest('APP-3107');
    const app = byId('APP-3107');
    expect(app.checks.insurance).toBe('passed');
    expect(app.stage).toBe('Documents');
    expect(app.infoRequest).toBeUndefined();
    expect(app.trail.slice(before).map((t) => t.by)).toEqual([
      'SVS team',
      'SVS team',
      'SVS team',
      'Applicant',
    ]);
  });

  it('never advances past Decision, and approves only what canApprove allows', () => {
    const svs = useSvsDesk.getState();
    svs.advanceApplication('APP-3098');
    expect(byId('APP-3098').stage).toBe('Decision');
    svs.approveApplication('APP-3101');
    expect(byId('APP-3101').outcome).toBe('open');
    svs.approveApplication('APP-3098');
    expect(byId('APP-3098')).toMatchObject({ outcome: 'approved', decisionNote: APPROVED_NOTE });
    expect(onboardingOpenCount(useSvsDesk.getState().applications)).toBe(3);
    expect(approvedCount(useSvsDesk.getState().applications)).toBe(1);
    // A decided applicant takes no further changes.
    useSvsDesk.getState().setCheck('APP-3098', 'bank', 'failed');
    expect(byId('APP-3098').checks.bank).toBe('passed');
  });

  it('declining needs a reason', () => {
    useSvsDesk.getState().declineApplication('APP-3104', ' ');
    expect(byId('APP-3104').outcome).toBe('open');
    useSvsDesk.getState().declineApplication('APP-3104', 'No current safety policy.');
    expect(byId('APP-3104')).toMatchObject({
      outcome: 'declined',
      decisionNote: 'No current safety policy.',
    });
  });

  it('an invitation starts at Applied with every check pending', () => {
    const id = useSvsDesk
      .getState()
      .inviteSupplier({ company: ' Nigg Bay Coatings ', category: 'Coatings', port: 'Aberdeen' });
    expect(id).toBe('APP-3108');
    const invited = useSvsDesk.getState().applications[0]!;
    expect(invited).toMatchObject({
      id,
      company: 'Nigg Bay Coatings',
      stage: 'Applied',
      outcome: 'open',
    });
    expect(checklistProgress(invited)).toEqual({ done: 0, total: 8 });
    expect(slaState(invited).label).toBe('New today');
    expect(invited.trail[0]?.text).toBe('Invitation sent by the SVS team (simulated)');
    expect(useSvsDesk.getState().inviteSupplier({ company: '', category: 'x', port: 'y' })).toBe(
      '',
    );
    expect(onboardingOpenCount(useSvsDesk.getState().applications)).toBe(5);
  });

  describe('stamps what it does “Today HH:MM”, like the seeded entries beside it', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 8, 24, 9, 12));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('evidence: the submission, its trail and the decision', () => {
      const id = useSvsDesk.getState().submitEvidence({
        supplierId: 'silver-city-welding',
        supplierName: 'Silver City Welding',
        kind: 'new',
        form: EXAMPLE_CERT_FORM,
      });
      expect(evidence(id).submittedAt).toBe('Today 09:12');
      expect(evidence(id).trail.map((t) => t.at)).toEqual(['Today 09:12']);
      vi.setSystemTime(new Date(2026, 8, 24, 14, 3));
      useSvsDesk.getState().decideEvidence(id, 'approved');
      expect(evidence(id).trail.map((t) => t.at)).toEqual(['Today 09:12', 'Today 14:03']);
    });

    it('onboarding: every trail entry, invitations included', () => {
      const svs = useSvsDesk.getState();
      svs.setCheck('APP-3107', 'insurance', 'passed');
      svs.advanceApplication('APP-3107');
      const id = svs.inviteSupplier({ company: 'Nigg Bay Coatings', category: 'x', port: 'y' });
      expect(
        byId('APP-3107')
          .trail.slice(-2)
          .map((t) => t.at),
      ).toEqual(['Today 09:12', 'Today 09:12']);
      expect(byId(id).trail.map((t) => t.at)).toEqual(['Today 09:12']);
    });

    it('a sent quote', () => {
      useSupplierDesk.getState().sendQuote('req-4471', {
        amountGbp: 2450,
        leadTime: 'Next day',
        validity: '14 days',
        note: '',
      });
      expect(useSupplierDesk.getState().quotes['req-4471']?.sentAt).toBe('Today 09:12');
    });
  });

  it('reads storage defensively: bad entries are dropped, bad shapes reseed', () => {
    window.localStorage.setItem(
      'gac-connect:svsDesk.evidence',
      JSON.stringify([SEED_EVIDENCE[0], { id: 'junk' }]),
    );
    window.localStorage.setItem('gac-connect:svsDesk.applications', JSON.stringify({ nope: 1 }));
    expect(readEvidence()).toEqual([SEED_EVIDENCE[0]]);
    expect(readApplications()).toEqual(SEED_APPLICATIONS);
  });

  it('the supplier desk records a sent quote and forgets it on reset', () => {
    useSupplierDesk.getState().sendQuote('req-4471', {
      amountGbp: 2450,
      leadTime: 'Next day',
      validity: '14 days',
      note: ' ',
    });
    expect(useSupplierDesk.getState().quotes['req-4471']).toMatchObject({
      amountGbp: 2450,
      note: '',
    });
    window.localStorage.setItem(
      'gac-connect:supplierDesk.quotes',
      JSON.stringify({ junk: { amountGbp: 'x' }, ...useSupplierDesk.getState().quotes }),
    );
    expect(Object.keys(readQuotes())).toEqual(['req-4471']);
    useSupplierDesk.getState().reset();
    expect(useSupplierDesk.getState().quotes).toEqual({});
    expect(window.localStorage.getItem('gac-connect:supplierDesk.quotes')).toBeNull();
  });
});
