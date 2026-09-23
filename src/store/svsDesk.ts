import { create } from 'zustand';
import {
  CHECKS,
  ONBOARDING_STAGES,
  SEED_APPLICATIONS,
  SEED_EVIDENCE,
  type Actor,
  type Application,
  type CheckId,
  type CheckState,
  type EvidenceStage,
  type EvidenceSubmission,
  type TrailEntry,
} from '../data/svsDesk';
import { isStageOf } from '../lib/pipeline';
import { persistent } from '../lib/storage';
import {
  canApprove,
  checkLabel,
  daysBetween,
  deskStamp,
  nextApplicationRef,
  nextEvidenceRef,
  nextOnboardingStage,
  todayISO,
  type CertForm,
} from '../lib/svsDesk';

/**
 * The SVS desk (live dashboards, 23 Sep): certificate evidence sent in by
 * suppliers and the onboarding queue, with every decision the SVS team makes.
 * Persisted through the storage adapter under 'svsDesk.*' (never directly),
 * seeded on first open like the other pipelines, and cleared by Reset demo —
 * `reset()` removes the keys rather than writing the seed back.
 *
 * Every action appends to the item's audit trail, by role, stamped "Today
 * HH:MM" (`deskStamp`) like the seeded entries it sits beside. Nothing here
 * feeds `useNeedsYou`: the SVS team's queue is not the client's "Waiting on you".
 */

const KEY_EVIDENCE = 'svsDesk.evidence';
const KEY_APPLICATIONS = 'svsDesk.applications';

const EVIDENCE_STAGES: readonly EvidenceStage[] = [
  'submitted',
  'approved',
  'info-requested',
  'rejected',
];
const CHECK_STATES: readonly CheckState[] = ['pending', 'passed', 'failed', 'na'];
const ACTORS: readonly Actor[] = ['SVS team', 'Applicant', 'Supplier', 'System'];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isOptionalString(v: unknown): boolean {
  return v === undefined || typeof v === 'string';
}

function isTrail(v: unknown): v is TrailEntry[] {
  return (
    Array.isArray(v) &&
    v.every(
      (t) =>
        isRecord(t) &&
        typeof t.at === 'string' &&
        typeof t.text === 'string' &&
        (ACTORS as readonly unknown[]).includes(t.by),
    )
  );
}

/** Shape guard for a stored submission — malformed entries are dropped. */
export function isEvidence(v: unknown): v is EvidenceSubmission {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === 'string' &&
    typeof v.supplierId === 'string' &&
    typeof v.supplierName === 'string' &&
    (v.kind === 'new' || v.kind === 'renewal') &&
    typeof v.certType === 'string' &&
    typeof v.certLabel === 'string' &&
    isOptionalString(v.vaultId) &&
    typeof v.issuer === 'string' &&
    typeof v.reference === 'string' &&
    typeof v.issuedOn === 'string' &&
    typeof v.expiresOn === 'string' &&
    typeof v.daysLeft === 'number' &&
    typeof v.fileName === 'string' &&
    typeof v.fileSize === 'number' &&
    typeof v.submittedAt === 'string' &&
    isStageOf(EVIDENCE_STAGES, v.stage) &&
    isOptionalString(v.note) &&
    isTrail(v.trail)
  );
}

/** Shape guard for a stored application — malformed entries are dropped. */
export function isApplication(v: unknown): v is Application {
  if (!isRecord(v)) return false;
  const checks = v.checks;
  return (
    typeof v.id === 'string' &&
    typeof v.company === 'string' &&
    typeof v.category === 'string' &&
    typeof v.port === 'string' &&
    typeof v.appliedLabel === 'string' &&
    typeof v.daysInReview === 'number' &&
    isStageOf(ONBOARDING_STAGES, v.stage) &&
    (v.outcome === 'open' || v.outcome === 'approved' || v.outcome === 'declined') &&
    (v.risk === 'Low' || v.risk === 'Medium' || v.risk === 'High') &&
    typeof v.categoryCheckLabel === 'string' &&
    isRecord(checks) &&
    CHECKS.every((c) => (CHECK_STATES as readonly unknown[]).includes(checks[c.id])) &&
    isOptionalString(v.infoRequest) &&
    isOptionalString(v.decisionNote) &&
    isTrail(v.trail)
  );
}

function cloneEvidence(): EvidenceSubmission[] {
  return structuredClone(SEED_EVIDENCE);
}

function cloneApplications(): Application[] {
  return structuredClone(SEED_APPLICATIONS);
}

/** Persisted submissions, shape-checked one by one; a missing key means an untouched demo. */
export function readEvidence(): EvidenceSubmission[] {
  const raw = persistent.get<unknown>(KEY_EVIDENCE, null);
  if (raw === null) return cloneEvidence();
  return Array.isArray(raw) ? raw.filter(isEvidence) : cloneEvidence();
}

export function readApplications(): Application[] {
  const raw = persistent.get<unknown>(KEY_APPLICATIONS, null);
  if (raw === null) return cloneApplications();
  return Array.isArray(raw) ? raw.filter(isApplication) : cloneApplications();
}

function entry(by: Actor, text: string): TrailEntry {
  return { at: deskStamp(), by, text };
}

const CHECK_WORDS: Record<CheckState, string> = {
  pending: 'reopened',
  passed: 'passed',
  failed: 'failed',
  na: 'not applicable',
};

export const APPROVED_NOTE =
  'Approved — listing goes live at the next marketplace publish (simulated)';

interface SvsDeskState {
  evidence: EvidenceSubmission[];
  applications: Application[];
  /** A supplier sends a certificate in. Returns its reference. Metadata only. */
  submitEvidence(input: {
    supplierId: string;
    supplierName: string;
    kind: 'new' | 'renewal';
    vaultId?: string;
    form: CertForm;
  }): string;
  /** The SVS team decides. Asking for more or rejecting needs a note. */
  decideEvidence(
    id: string,
    decision: 'approved' | 'info-requested' | 'rejected',
    note?: string,
  ): void;
  setCheck(appId: string, check: CheckId, state: CheckState): void;
  /** One stage on; never past Decision (approve or decline from there). */
  advanceApplication(appId: string): void;
  requestInfo(appId: string, note: string): void;
  /** Simulates the applicant answering the open request. */
  clearInfoRequest(appId: string): void;
  approveApplication(appId: string): void;
  declineApplication(appId: string, reason: string): void;
  /** A new applicant at Applied. Returns its reference ('' when the name is blank). */
  inviteSupplier(input: { company: string; category: string; port: string }): string;
  reset(): void;
}

export const useSvsDesk = create<SvsDeskState>((set, get) => {
  function writeEvidence(evidence: EvidenceSubmission[]) {
    persistent.set(KEY_EVIDENCE, evidence);
    set({ evidence });
  }

  function writeApplications(applications: Application[]) {
    persistent.set(KEY_APPLICATIONS, applications);
    set({ applications });
  }

  /** Applies `change` to one open application; unknown or decided ones are left alone. */
  function updateOpen(appId: string, change: (app: Application) => Application | null) {
    let changed = false;
    const applications = get().applications.map((a) => {
      if (a.id !== appId || a.outcome !== 'open') return a;
      const next = change(a);
      if (!next) return a;
      changed = true;
      return next;
    });
    if (changed) writeApplications(applications);
  }

  return {
    evidence: readEvidence(),
    applications: readApplications(),

    submitEvidence({ supplierId, supplierName, kind, vaultId, form }) {
      const existing = get().evidence;
      const id = nextEvidenceRef(existing);
      const at = deskStamp();
      const certLabel = form.certType === 'Other' ? form.otherLabel.trim() : form.certType;
      const submission: EvidenceSubmission = {
        id,
        supplierId,
        supplierName,
        kind,
        certType: form.certType,
        certLabel,
        ...(kind === 'renewal' && vaultId ? { vaultId } : {}),
        issuer: form.issuer.trim(),
        reference: form.reference.trim(),
        issuedOn: form.issuedOn,
        expiresOn: form.expiresOn,
        daysLeft: daysBetween(todayISO(), form.expiresOn),
        fileName: form.fileName,
        fileSize: form.fileSize,
        submittedAt: at,
        stage: 'submitted',
        trail: [
          {
            at,
            by: 'Supplier',
            text: `${kind === 'renewal' ? 'Renewal' : 'Certificate'} uploaded: ${form.fileName}`,
          },
        ],
      };
      writeEvidence([submission, ...existing]);
      return id;
    },

    decideEvidence(id, decision, note) {
      const text = note?.trim() ?? '';
      if (decision !== 'approved' && !text) return;
      let changed = false;
      const evidence = get().evidence.map((e) => {
        if (e.id !== id || e.stage !== 'submitted') return e;
        changed = true;
        const line =
          decision === 'approved'
            ? 'Verified by the SVS team'
            : decision === 'info-requested'
              ? `Asked for more information: ${text}`
              : `Rejected: ${text}`;
        const next: EvidenceSubmission = {
          ...e,
          stage: decision,
          trail: [...e.trail, entry('SVS team', line)],
        };
        if (decision === 'approved') delete next.note;
        else next.note = text;
        return next;
      });
      if (changed) writeEvidence(evidence);
    },

    setCheck(appId, check, state) {
      updateOpen(appId, (a) =>
        a.checks[check] === state
          ? null
          : {
              ...a,
              checks: { ...a.checks, [check]: state },
              trail: [
                ...a.trail,
                entry('SVS team', `${checkLabel(a, check)} — ${CHECK_WORDS[state]}`),
              ],
            },
      );
    },

    advanceApplication(appId) {
      updateOpen(appId, (a) => {
        const stage = nextOnboardingStage(a.stage);
        if (stage === a.stage) return null;
        return { ...a, stage, trail: [...a.trail, entry('SVS team', `Moved to ${stage}`)] };
      });
    },

    requestInfo(appId, note) {
      const text = note.trim();
      if (!text) return;
      updateOpen(appId, (a) => ({
        ...a,
        infoRequest: text,
        trail: [...a.trail, entry('SVS team', `Asked for more information: ${text}`)],
      }));
    },

    clearInfoRequest(appId) {
      updateOpen(appId, (a) => {
        if (!a.infoRequest) return null;
        const next: Application = {
          ...a,
          trail: [...a.trail, entry('Applicant', 'Answered the information request (simulated)')],
        };
        delete next.infoRequest;
        return next;
      });
    },

    approveApplication(appId) {
      updateOpen(appId, (a) =>
        canApprove(a)
          ? {
              ...a,
              outcome: 'approved',
              decisionNote: APPROVED_NOTE,
              trail: [
                ...a.trail,
                entry(
                  'SVS team',
                  'Approved and listed — the listing goes live at the next marketplace publish (simulated)',
                ),
              ],
            }
          : null,
      );
    },

    declineApplication(appId, reason) {
      const text = reason.trim();
      if (!text) return;
      updateOpen(appId, (a) => ({
        ...a,
        outcome: 'declined',
        decisionNote: text,
        trail: [...a.trail, entry('SVS team', `Declined: ${text}`)],
      }));
    },

    inviteSupplier({ company, category, port }) {
      const name = company.trim();
      if (!name) return '';
      const existing = get().applications;
      const id = nextApplicationRef(existing);
      const invited: Application = {
        id,
        company: name,
        category,
        port,
        appliedLabel: 'Today',
        daysInReview: 0,
        stage: 'Applied',
        outcome: 'open',
        risk: 'Medium',
        categoryCheckLabel: `${category} competence evidence`,
        checks: {
          company: 'pending',
          insurance: 'pending',
          hse: 'pending',
          sanctions: 'pending',
          bank: 'pending',
          references: 'pending',
          category: 'pending',
          policies: 'pending',
        },
        trail: [entry('SVS team', 'Invitation sent by the SVS team (simulated)')],
      };
      writeApplications([invited, ...existing]);
      return id;
    },

    reset() {
      persistent.remove(KEY_EVIDENCE);
      persistent.remove(KEY_APPLICATIONS);
      set({ evidence: cloneEvidence(), applications: cloneApplications() });
    },
  };
});
