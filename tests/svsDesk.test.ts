import { beforeEach, describe, expect, it } from 'vitest';
import { SUPPLIERS, supplierById } from '../src/data/suppliers';
import {
  RECOMMENDED_FOR_WELDING,
  SILVER_CITY_VAULT,
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
import { complianceWatch, deriveStatus } from '../src/lib/svs';
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
  certsWithApproved,
  checklistProgress,
  daysBetween,
  evidenceOpenCount,
  evidenceStatus,
  fileSizeLabel,
  formatDateGB,
  nextApplicationRef,
  nextEvidenceRef,
  nextOnboardingStage,
  onboardingOpenCount,
  recommendedStatus,
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
    submittedAt: 'Thu 24 Sep · 09:12',
    stage: 'submitted',
    trail: [{ at: 'Thu 24 Sep · 09:12', by: 'Supplier', text: 'Certificate uploaded' }],
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
    expect(
      validateCertForm({ ...valid, issuedOn: '2029-09-02', expiresOn: '2029-09-01' }, TODAY),
    ).toContain('expiry after issue');
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

describe('formatting helpers', () => {
  it('fileSizeLabel reads like a file browser', () => {
    expect(fileSizeLabel(253_952)).toBe('248 KB');
    expect(fileSizeLabel(1_258_291)).toBe('1.2 MB');
    expect(fileSizeLabel(319_488)).toBe('312 KB');
    expect(fileSizeLabel(512)).toBe('512 bytes');
    expect(fileSizeLabel(MAX_FILE_BYTES)).toBe('10 MB');
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
