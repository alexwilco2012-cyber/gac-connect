/**
 * Tier discount — exact algorithm from 03_COMMERCIAL_RULES §3.1.
 * NON-CUMULATIVE: a client holds the highest single tier they qualify for.
 */

export const TIERS = { agency: 2, logistics: 4, customs: 7 } as const;

export type TierService = keyof typeof TIERS;

export interface TierSelection {
  agency: boolean;
  logistics: boolean;
  customs: boolean;
}

export const TIER_SERVICE_NAMES: Record<TierService, string> = {
  agency: 'GAC Agency',
  logistics: 'GAC Logistics',
  customs: 'GAC Customs',
};

export function tierPct(active: TierSelection): number {
  const on = (Object.keys(TIERS) as TierService[]).filter((k) => active[k]);
  return on.length ? Math.max(...on.map((k) => TIERS[k])) : 0;
}

export function isFullStack(active: TierSelection): boolean {
  return active.agency && active.logistics && active.customs;
}

export function annualSaving(spendGBP: number, active: TierSelection): number {
  return Math.round((spendGBP * tierPct(active)) / 100);
}

/**
 * The explanatory readout: states which tier applies and what adding the next
 * service does. Copy pattern ported from the reference demo (load-bearing).
 */
export function tierNote(active: TierSelection): string {
  const on = (Object.keys(TIERS) as TierService[]).filter((k) => active[k]);
  if (on.length === 0) {
    return 'No GAC in-house services selected. Toggle a service to see the tier you would hold.';
  }
  if (isFullStack(active)) {
    return 'Full Stack: all three pillars consolidated. The 7% Customs tier applies across your platform-booked GAC charges.';
  }
  const pct = tierPct(active);
  const top = on.reduce((a, b) => (TIERS[a] >= TIERS[b] ? a : b));
  const better = (Object.keys(TIERS) as TierService[])
    .filter((k) => !active[k] && TIERS[k] > pct)
    .sort((a, b) => TIERS[a] - TIERS[b])
    .map((k) => `${TIER_SERVICE_NAMES[k]} lifts the client to ${TIERS[k]}%`);
  const base = `Qualifying tier: ${TIER_SERVICE_NAMES[top]} (${pct}%).`;
  return better.length ? `${base} Adding ${better.join('; adding ')}.` : base;
}
