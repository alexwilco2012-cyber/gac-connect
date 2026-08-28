import { create } from 'zustand';
import { providerFor, SEED_RENEWALS } from '../data/certification';
import type { CertEntry, Renewal } from '../lib/certification';
import { isRenewal, isRouted, nextRenewalRef, nextRenewalStage } from '../lib/certification';
import { stampLabel } from '../lib/crewChange';
import { persistent } from '../lib/storage';

/**
 * Renewals raised from the certification register, each with the stage it has
 * reached. Persisted through the storage adapter under 'certification.*'
 * (never directly) and seeded on first open, like logistics and customs — a
 * pipeline screen with nothing on it says nothing about the pipeline.
 *
 * The register itself is static demo data: this preview tracks what the
 * operator does about an expiry, not the credentials themselves.
 */

const KEY_RENEWALS = 'certification.renewals';

function cloneSeed(): Renewal[] {
  return SEED_RENEWALS.map((r) => ({ ...r }));
}

/** Persisted renewals, shape-checked one by one; a missing key means an untouched demo. */
export function readRenewals(): Renewal[] {
  const raw = persistent.get<unknown>(KEY_RENEWALS, null);
  if (raw === null) return cloneSeed();
  return Array.isArray(raw) ? raw.filter(isRenewal) : cloneSeed();
}

function renewalFrom(entry: CertEntry, id: string, automatic: boolean): Renewal {
  return {
    id,
    crewId: entry.member.id,
    crewRef: entry.member.ref,
    rank: entry.member.rank,
    vesselId: entry.member.vesselId,
    certName: entry.cert.name,
    daysToExpiry: entry.cert.daysToExpiry,
    provider: providerFor(entry.cert.name),
    stage: 'Renewal raised',
    createdAt: stampLabel(),
    automatic,
  };
}

interface CertificationState {
  renewals: Renewal[];
  /** Routes one credential to the provider that runs it; returns its reference,
   *  or null when that credential is already routed. */
  route(entry: CertEntry): string | null;
  /** Routes a list in one go — the automatic sweep. Returns how many were raised. */
  sweep(entries: readonly CertEntry[]): number;
  advance(id: string, steps?: number): void;
  reset(): void;
}

export const useCertification = create<CertificationState>((set, get) => ({
  renewals: readRenewals(),

  route(entry) {
    const existing = get().renewals;
    if (isRouted(existing, entry.member.id, entry.cert.name)) return null;
    const id = nextRenewalRef(existing);
    const renewals = [renewalFrom(entry, id, false), ...existing];
    persistent.set(KEY_RENEWALS, renewals);
    set({ renewals });
    return id;
  },

  sweep(entries) {
    let renewals = get().renewals;
    let raised = 0;
    for (const entry of entries) {
      if (isRouted(renewals, entry.member.id, entry.cert.name)) continue;
      renewals = [renewalFrom(entry, nextRenewalRef(renewals), true), ...renewals];
      raised += 1;
    }
    if (raised === 0) return 0;
    persistent.set(KEY_RENEWALS, renewals);
    set({ renewals });
    return raised;
  },

  advance(id, steps = 1) {
    const renewals = get().renewals.map((r) => {
      if (r.id !== id) return r;
      let stage: string = r.stage;
      for (let i = 0; i < Math.max(1, steps); i += 1) stage = nextRenewalStage(stage);
      return { ...r, stage: stage as Renewal['stage'] };
    });
    persistent.set(KEY_RENEWALS, renewals);
    set({ renewals });
  },

  reset() {
    persistent.remove(KEY_RENEWALS);
    set({ renewals: cloneSeed() });
  },
}));
