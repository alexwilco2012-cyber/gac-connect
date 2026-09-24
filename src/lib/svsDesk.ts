import { RECOMMENDED_FOR_WELDING, VAULT_AS_OF_ISO, type VaultCert } from '../data/supplierDesk';
import {
  CHECKS,
  ONBOARDING_STAGES,
  SLA_DAYS,
  type Application,
  type CheckId,
  type EvidenceStage,
  type EvidenceSubmission,
  type OnboardingStage,
} from '../data/svsDesk';
import { alertTier, type Cert } from './svs';

/**
 * SVS desk rules (live dashboards, 23 Sep; spec §4.2) — pure, unit-tested, and
 * mirrored line for line in the deck's `desk-data.js`.
 *
 * Two queues meet here. Suppliers send certificates in (the upload is
 * simulated: only the file's name and size are kept), and the SVS team
 * approves, asks for more, or rejects. New suppliers work through four
 * onboarding stages and eight checks before the team can approve and list
 * them. The load-bearing rule is the overlay at the foot of the file: an
 * approval adds to what a supplier holds and never changes a certificate the
 * gate already reads, so no status, bell, alert or marketplace row moves.
 */

// ---------------------------------------------------------------------------
// The certificate form
// ---------------------------------------------------------------------------

export interface CertForm {
  certType: string;
  /** The description, when the type is Other. */
  otherLabel: string;
  issuer: string;
  reference: string;
  /** ISO dates from the date inputs. */
  issuedOn: string;
  expiresOn: string;
  fileName: string;
  fileSize: number;
  /** "I confirm this is a true copy of the current certificate." */
  declared: boolean;
}

export const EMPTY_CERT_FORM: CertForm = {
  certType: '',
  otherLabel: '',
  issuer: '',
  reference: '',
  issuedOn: '',
  expiresOn: '',
  fileName: '',
  fileSize: 0,
  declared: false,
};

/**
 * "Fill with an example" — the ISO 9001 the Welding listing is missing, issued
 * three weeks before `todayISO` for three years less a day. Dated from the day
 * it is filled in, so it passes validation whenever the demo runs; on the demo
 * date that is the spec's 2 Sep 2026 to 1 Sep 2029.
 */
export function exampleCertForm(todayISO: string): CertForm {
  const issuedOn = shiftISO(todayISO, { days: -21 });
  return {
    certType: 'ISO 9001 quality management',
    otherLabel: '',
    issuer: 'Northgate Quality Assurance',
    reference: 'QA-9001-2618',
    issuedOn,
    expiresOn: shiftISO(issuedOn, { years: 3, days: -1 }),
    fileName: 'ISO9001-certificate.pdf',
    fileSize: 248 * 1024,
    declared: true,
  };
}

/** The example as it reads on the demo date (`VAULT_AS_OF_ISO`) — a fixed form for tests. */
export const EXAMPLE_CERT_FORM: CertForm = exampleCertForm(VAULT_AS_OF_ISO);

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_EXTENSIONS: readonly string[] = ['.pdf', '.jpg', '.jpeg', '.png'];

function hasAcceptedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * What is still needed before the form can go to the SVS team, in the order
 * the form asks — rendered as one "Still needed: …" line. `todayISO` is passed
 * in, so the rule is pure; call `todayISO()` in the handler, never in render.
 */
export function validateCertForm(form: CertForm, todayISO: string): string[] {
  const problems: string[] = [];
  if (!form.certType) problems.push('certificate type');
  if (form.certType === 'Other' && !form.otherLabel.trim()) {
    problems.push('a description of the certificate');
  }
  if (!form.issuer.trim()) problems.push('issuing body');
  if (!form.reference.trim()) problems.push('reference or certificate number');
  if (!form.issuedOn) problems.push('issue date');
  else if (form.issuedOn > todayISO) {
    problems.push('issue date today or earlier — the issue date cannot be in the future');
  }
  if (!form.expiresOn) problems.push('expiry date');
  if (form.issuedOn && form.expiresOn && form.expiresOn <= form.issuedOn) {
    problems.push('expiry after issue');
  }
  if (form.expiresOn && form.expiresOn <= todayISO) {
    problems.push('expiry in the future — this certificate has already expired');
  }
  if (!form.fileName) {
    problems.push('a file');
  } else {
    if (!hasAcceptedExtension(form.fileName)) problems.push('file must be a PDF, JPG or PNG');
    if (form.fileSize > MAX_FILE_BYTES) problems.push('file must be under 10 MB');
  }
  if (!form.declared) problems.push('the confirmation tick');
  return problems;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * "248 KB", "1.2 MB", "10.3 MB", "512 bytes" — as a file browser would put it.
 * Megabytes keep one decimal below 100, and a file over the limit never rounds
 * down onto it: a refused file must not read "10 MB" beside "the limit is 10 MB".
 */
export function fileSizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 100) return `${Math.round(mb)} MB`;
  const tenths = Math.round(mb * 10);
  const limitTenths = (MAX_FILE_BYTES / (1024 * 1024)) * 10;
  return `${(bytes > MAX_FILE_BYTES ? Math.max(tenths, limitTenths + 1) : tenths) / 10} MB`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseISO(iso: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

/** '2027-03-13' → '13 Mar 2027'. An unreadable date comes back as it went in. */
export function formatDateGB(iso: string): string {
  const p = parseISO(iso);
  if (!p) return iso;
  return `${p.d} ${MONTHS[p.m - 1]} ${p.y}`;
}

/** Whole days from one ISO date to another (negative when `to` is earlier). */
export function daysBetween(fromISO: string, toISO: string): number {
  const a = parseISO(fromISO);
  const b = parseISO(toISO);
  if (!a || !b) return 0;
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
}

/** An ISO date moved by whole years and days: '2026-09-02' + 3 years − 1 day → '2029-09-01'. */
export function shiftISO(iso: string, by: { years?: number; days?: number }): string {
  const p = parseISO(iso);
  if (!p) return iso;
  const d = new Date(Date.UTC(p.y + (by.years ?? 0), p.m - 1, p.d + (by.days ?? 0)));
  return d.toISOString().slice(0, 10);
}

/** Today's date on this device, 'YYYY-MM-DD'. Impure: handlers and store actions only. */
export function todayISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * "Today 09:12" — how the desks stamp a trail entry, a submission or a sent
 * quote: this device's time of day, worded like the seeded "Today 07:35". The
 * seeds are written from the demo's Thursday morning, so a calendar date beside
 * them would read as another day and break "newest first" (spec §4.3, revised
 * 23 Sep). Every seeded "Today" stamp sits before the demo's 08:00 "now", so an
 * entry made in the working day reads later than the seeds it sorts above; a
 * run before 07:35 on the device can still read earlier, and that is accepted.
 * Impure: store actions only.
 */
export function deskStamp(d: Date = new Date()): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `Today ${hh}:${mm}`;
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export function evidenceStatus(stage: EvidenceStage): {
  label: string;
  tone: 'info' | 'verified' | 'warn' | 'danger';
} {
  switch (stage) {
    case 'approved':
      return { label: 'Verified by the SVS team', tone: 'verified' };
    case 'info-requested':
      return { label: 'More information needed', tone: 'warn' };
    case 'rejected':
      return { label: 'Rejected', tone: 'danger' };
    default:
      return { label: 'Awaiting SVS review', tone: 'info' };
  }
}

function nextRef(prefix: string, existing: readonly { id: string }[], floor: number): string {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  const numbers = existing
    .map((x) => Number(pattern.exec(x.id)?.[1] ?? NaN))
    .filter((n) => Number.isFinite(n));
  const top = numbers.length ? Math.max(...numbers) : floor;
  return `${prefix}-${top + 1}`;
}

/** 'EVD-2039' — one above the highest evidence reference held. */
export function nextEvidenceRef(existing: readonly { id: string }[]): string {
  return nextRef('EVD', existing, 2038);
}

/** 'APP-3108' — one above the highest application reference held. */
export function nextApplicationRef(existing: readonly { id: string }[]): string {
  return nextRef('APP', existing, 3107);
}

/** Submissions waiting on the SVS team — the SVS nav badge and the queue's count. */
export function evidenceOpenCount(ev: readonly EvidenceSubmission[]): number {
  return ev.filter((e) => e.stage === 'submitted').length;
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

/** The label a check carries for this applicant (the category check is per trade). */
export function checkLabel(app: Application, id: CheckId): string {
  if (id === 'category') return app.categoryCheckLabel;
  return CHECKS.find((c) => c.id === id)?.label ?? id;
}

/** Checks passed or not applicable, out of eight. */
export function checklistProgress(app: Application): { done: number; total: number } {
  const done = CHECKS.filter((c) => {
    const state = app.checks[c.id];
    return state === 'passed' || state === 'na';
  }).length;
  return { done, total: CHECKS.length };
}

/**
 * Why "Approve and list" is not available yet, in words; null when it is. The
 * button shows this reason beside it rather than just greying out.
 */
export function approveBlocker(app: Application): string | null {
  if (app.outcome === 'approved') return 'This applicant has already been approved.';
  if (app.outcome === 'declined') return 'This application was declined.';
  if (app.infoRequest) {
    return 'Waiting on the applicant: mark the information request as answered first.';
  }
  const failed = CHECKS.filter((c) => app.checks[c.id] === 'failed').map((c) =>
    checkLabel(app, c.id),
  );
  if (failed.length) {
    return `A check has failed (${failed.join('; ')}). Ask for more information, or decline.`;
  }
  const pending = CHECKS.filter((c) => app.checks[c.id] === 'pending').map((c) =>
    checkLabel(app, c.id),
  );
  if (pending.length) {
    const count = pending.length === 1 ? 'One check' : `${pending.length} checks`;
    return `${count} still to complete: ${pending.join('; ')}.`;
  }
  if (app.stage !== 'Decision') return 'Move the application to Decision first.';
  return null;
}

/** Open, at Decision, every check passed or N/A, and nothing waiting on the applicant. */
export function canApprove(app: Application): boolean {
  return approveBlocker(app) === null;
}

/** The stage after this one. Decision is the last: approve or decline from there. */
export function nextOnboardingStage(stage: OnboardingStage): OnboardingStage {
  const i = ONBOARDING_STAGES.indexOf(stage);
  if (i === -1) return ONBOARDING_STAGES[0];
  return ONBOARDING_STAGES[Math.min(i + 1, ONBOARDING_STAGES.length - 1)]!;
}

/** Against the five-day SLA: fine under four days, due at four or five, overdue beyond. */
export function slaState(app: Application): { state: 'ok' | 'due' | 'over'; label: string } {
  const d = app.daysInReview;
  if (d > SLA_DAYS) return { state: 'over', label: `Overdue · day ${d} of ${SLA_DAYS}` };
  if (d <= 0) return { state: 'ok', label: 'New today' };
  return { state: d >= SLA_DAYS - 1 ? 'due' : 'ok', label: `Day ${d} of ${SLA_DAYS}` };
}

export function onboardingOpenCount(apps: readonly Application[]): number {
  return apps.filter((a) => a.outcome === 'open').length;
}

export function approvedCount(apps: readonly Application[]): number {
  return apps.filter((a) => a.outcome === 'approved').length;
}

// ---------------------------------------------------------------------------
// The overlay rule (spec §4.4)
// ---------------------------------------------------------------------------

export interface VaultRow {
  id: string;
  name: string;
  issuer: string;
  reference: string;
  expiresOn: string;
  /** Null when there is no certificate in force to count down (info needed, rejected). */
  daysLeft: number | null;
  /** Drives the days-left bar: ok/due/lapsed from the dates, the rest from the review. */
  state: 'ok' | 'due' | 'lapsed' | 'pending' | 'info' | 'rejected';
  statusLabel: string;
  statusTone: 'verified' | 'warn' | 'danger' | 'info';
  /** The SVS team's note when it asked for more or rejected. */
  note?: string;
  vaultId?: string;
  submissionId?: string;
  /** A renewal is with the SVS team; the row still shows the certificate in force. */
  pendingRenewal?: boolean;
}

/**
 * The SVS alert tiers (`lib/svs`) applied to a certificate's own dates: due
 * inside the widest tier, so the rows cannot drift from the supplier rule.
 */
function stateFromDays(daysLeft: number): 'ok' | 'due' | 'lapsed' {
  if (daysLeft <= 0) return 'lapsed';
  return alertTier(daysLeft) !== null ? 'due' : 'ok';
}

function inForceStatus(state: 'ok' | 'due' | 'lapsed'): {
  statusLabel: string;
  statusTone: VaultRow['statusTone'];
} {
  if (state === 'lapsed') return { statusLabel: 'Lapsed', statusTone: 'danger' };
  if (state === 'due') return { statusLabel: 'Renewal due', statusTone: 'warn' };
  return { statusLabel: 'In date', statusTone: 'verified' };
}

/** An approved certificate's status: verified while in date, the alert tier once due. */
function approvedStatus(state: 'ok' | 'due' | 'lapsed'): {
  statusLabel: string;
  statusTone: VaultRow['statusTone'];
} {
  return state === 'ok'
    ? { statusLabel: 'Verified by the SVS team', statusTone: 'verified' }
    : inForceStatus(state);
}

/**
 * The trailing number of a reference ('EVD-2041' → 2041). References are
 * issued in order, so this is what "newest" means everywhere on the desk: the
 * latest submission here and the newest-first lists on the SVS screens.
 */
export function refNumber(id: string): number {
  return Number(/(\d+)$/.exec(id)?.[1] ?? 0);
}

/** The most recent of a set of submissions, by reference — order-independent. */
function latest(subs: readonly EvidenceSubmission[]): EvidenceSubmission | undefined {
  return subs.reduce<EvidenceSubmission | undefined>(
    (best, s) => (!best || refNumber(s.id) > refNumber(best.id) ? s : best),
    undefined,
  );
}

/** Certificate names match whatever their case or spacing. */
function certKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * A vault certificate as it stands: the latest approved renewal's issuer,
 * reference and dates, or the vault's own when none is approved. A renewal
 * still with the SVS team, sent back or rejected changes nothing here.
 */
export function certInForce(
  cert: VaultCert,
  evidence: readonly EvidenceSubmission[],
  supplierId: string,
): VaultCert {
  const renewed = latest(
    evidence.filter(
      (e) =>
        e.supplierId === supplierId &&
        e.kind === 'renewal' &&
        e.vaultId === cert.id &&
        e.stage === 'approved',
    ),
  );
  if (!renewed) return cert;
  return {
    ...cert,
    issuer: renewed.issuer,
    reference: renewed.reference,
    issuedOn: renewed.issuedOn,
    expiresOn: renewed.expiresOn,
    daysLeft: renewed.daysLeft,
  };
}

/**
 * A supplier's new certificates, one entry per name: the latest approved
 * submission (the certificate on file, if any) and the latest submission of
 * any stage. `vaultRows` and `certsWithApproved` both read this, so the
 * dashboard and the register or profile always agree on what is held.
 */
function newCertificates(
  evidence: readonly EvidenceSubmission[],
  supplierId: string,
): { onFile?: EvidenceSubmission; newest: EvidenceSubmission }[] {
  const byName = new Map<string, EvidenceSubmission[]>();
  for (const e of evidence) {
    if (e.supplierId !== supplierId || e.kind !== 'new') continue;
    const key = certKey(e.certLabel);
    byName.set(key, [...(byName.get(key) ?? []), e]);
  }
  return [...byName.values()].map((subs) => {
    const onFile = latest(subs.filter((s) => s.stage === 'approved'));
    return { ...(onFile ? { onFile } : {}), newest: latest(subs)! };
  });
}

/**
 * One new certificate's row. `update` marks a later submission of a
 * certificate already on file, which shows as its own row beside it.
 */
function newCertRow(e: EvidenceSubmission, update: boolean): VaultRow {
  const base = {
    id: e.id,
    name: e.certLabel,
    issuer: e.issuer,
    reference: e.reference,
    expiresOn: e.expiresOn,
    submissionId: e.id,
  };
  const status = evidenceStatus(e.stage);
  switch (e.stage) {
    case 'approved': {
      const state = stateFromDays(e.daysLeft);
      return { ...base, daysLeft: e.daysLeft, state, ...approvedStatus(state) };
    }
    case 'info-requested':
      return {
        ...base,
        daysLeft: null,
        state: 'info',
        statusLabel: status.label,
        statusTone: 'warn',
        note: e.note,
      };
    case 'rejected':
      return {
        ...base,
        daysLeft: null,
        state: 'rejected',
        statusLabel: update ? 'Update rejected' : status.label,
        statusTone: 'danger',
        note: e.note,
      };
    default:
      return {
        ...base,
        daysLeft: e.daysLeft,
        state: 'pending',
        statusLabel: update ? 'Update awaiting SVS review' : status.label,
        statusTone: 'info',
      };
  }
}

/**
 * The supplier's certificate rows.
 *
 * Vault certificates: the dates are the certificate in force (`certInForce` —
 * the latest approved renewal, else the vault's own), and the latest renewal
 * sets the status on top of them: awaiting review, more information needed or
 * rejected beside the dates in force, or verified once approved. A later
 * renewal never takes an approved one's dates away.
 *
 * New certificates, one group per name, latest first. The latest approval is
 * the certificate on file; a later submission of the same name shows as its
 * own row under it ("Update awaiting SVS review", "More information needed",
 * "Update rejected"), so sending one again never hides what is held. With
 * nothing approved, the latest submission stands alone — a re-upload replaces
 * the one the SVS team sent back.
 */
export function vaultRows(
  vault: readonly VaultCert[],
  evidence: readonly EvidenceSubmission[],
  supplierId: string,
): VaultRow[] {
  const mine = evidence.filter((e) => e.supplierId === supplierId);

  const held = vault.map((cert): VaultRow => {
    const renewals = mine.filter((e) => e.kind === 'renewal' && e.vaultId === cert.id);
    const inForce = certInForce(cert, renewals, supplierId);
    const base = {
      id: cert.id,
      name: cert.name,
      vaultId: cert.id,
      issuer: inForce.issuer,
      reference: inForce.reference,
      expiresOn: inForce.expiresOn,
      daysLeft: inForce.daysLeft,
    };
    const state = stateFromDays(inForce.daysLeft);
    const renewal = latest(renewals);
    if (!renewal) return { ...base, state, ...inForceStatus(state) };

    const tracked = { submissionId: renewal.id };
    switch (renewal.stage) {
      case 'approved':
        // The latest renewal is approved, so it is the certificate in force.
        return { ...base, ...tracked, state, ...approvedStatus(state) };
      case 'info-requested':
        return {
          ...base,
          ...tracked,
          state,
          statusLabel: 'More information needed',
          statusTone: 'warn',
          note: renewal.note,
        };
      case 'rejected':
        return {
          ...base,
          ...tracked,
          state,
          statusLabel: 'Renewal rejected',
          statusTone: 'danger',
          note: renewal.note,
        };
      default:
        return {
          ...base,
          ...tracked,
          state,
          statusLabel: 'Renewal awaiting SVS review',
          statusTone: 'info',
          pendingRenewal: true,
        };
    }
  });

  const added = newCertificates(mine, supplierId)
    .sort((a, b) => refNumber(b.newest.id) - refNumber(a.newest.id))
    .flatMap(({ onFile, newest }): VaultRow[] => {
      if (!onFile) return [newCertRow(newest, false)];
      if (newest === onFile) return [newCertRow(onFile, false)];
      return [newCertRow(onFile, false), newCertRow(newest, true)];
    });

  return [...held, ...added];
}

/**
 * A supplier's certificates as the gate reads them, plus each new certificate
 * on file (its latest approval, as `vaultRows` shows it) as `{ name, state:
 * 'ok' }`. Existing entries pass through untouched, so `deriveStatus`, the
 * bell, the marketplace and "3 alerts" never move on an approval — the rule
 * the SVS register, the profile and the supplier dashboard all share.
 */
export function certsWithApproved(
  supplierId: string,
  certs: readonly Cert[],
  evidence: readonly EvidenceSubmission[],
): Cert[] {
  const out: Cert[] = [...certs];
  const names = new Set(certs.map((c) => certKey(c.name)));
  const onFile = newCertificates(evidence, supplierId)
    .flatMap(({ onFile: e }) => (e ? [e] : []))
    .sort((a, b) => refNumber(a.id) - refNumber(b.id));
  for (const e of onFile) {
    const key = certKey(e.certLabel);
    if (names.has(key)) continue;
    names.add(key);
    out.push({ name: e.certLabel, state: 'ok' });
  }
  return out;
}

/**
 * The Welding listing's recommended set against what the supplier holds:
 * on file (in force), pending (with the SVS team), missing (anything else).
 */
export function recommendedStatus(rows: readonly VaultRow[]): {
  onFile: number;
  total: number;
  missing: string[];
  pending: string[];
} {
  const missing: string[] = [];
  const pending: string[] = [];
  let onFile = 0;
  for (const name of RECOMMENDED_FOR_WELDING) {
    const matches = rows.filter((r) => certKey(r.name) === certKey(name));
    if (matches.some((r) => r.state === 'ok' || r.state === 'due')) onFile += 1;
    else if (matches.some((r) => r.state === 'pending')) pending.push(name);
    else missing.push(name);
  }
  return { onFile, total: RECOMMENDED_FOR_WELDING.length, missing, pending };
}
