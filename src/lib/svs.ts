/**
 * SVS rules from 03_COMMERCIAL_RULES §3.3.
 * Status derives from certificates: any lapsed ⇒ Blocked (unbookable
 * everywhere); any due ⇒ Renewal due (bookable, warned); else Verified.
 */

export type CertState = 'ok' | 'due' | 'lapsed';

export interface Cert {
  name: string;
  state: CertState;
  /** Days until expiry — present when state is 'due'. */
  daysToExpiry?: number;
}

export type SupplierStatus = 'verified' | 'renewal-due' | 'blocked';

export function deriveStatus(certs: readonly Cert[]): SupplierStatus {
  if (certs.some((c) => c.state === 'lapsed')) return 'blocked';
  if (certs.some((c) => c.state === 'due')) return 'renewal-due';
  return 'verified';
}

/**
 * The single booking gate. Blocking beats promotion, plan level, and rating —
 * enforced here, in the action, not just in display (03 §3.3).
 */
export function isBookable(certs: readonly Cert[]): boolean {
  return deriveStatus(certs) !== 'blocked';
}

/** Alert tiers: 90 / 30 / 7 days (03 §3.3). */
export const ALERT_TIERS = [90, 30, 7] as const;

export function alertTier(daysToExpiry: number): number | null {
  const ascending = [...ALERT_TIERS].sort((a, b) => a - b);
  const tier = ascending.find((t) => daysToExpiry <= t);
  return tier ?? null;
}
