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

/**
 * GAC Gold Band — the audit tier above standard verification, open to Premium
 * suppliers and earned through an enhanced annual audit (documentation,
 * insurance, performance history, site practice). 'held' means the audit is
 * current; 'scheduled' means the supplier is eligible and booked in but has
 * not yet earned the marque. Advertising cannot confer it, and lapsed
 * compliance removes it — the same rule as every other trust mark.
 */
export type GoldBandState = 'held' | 'scheduled';

export function goldBandActive(
  goldBand: GoldBandState | undefined,
  certs: readonly Cert[],
): boolean {
  return goldBand === 'held' && deriveStatus(certs) !== 'blocked';
}

/** Alert tiers: 90 / 30 / 7 days (03 §3.3). */
export const ALERT_TIERS = [90, 30, 7] as const;

export function alertTier(daysToExpiry: number): number | null {
  const ascending = [...ALERT_TIERS].sort((a, b) => a - b);
  const tier = ascending.find((t) => daysToExpiry <= t);
  return tier ?? null;
}

/**
 * The compliance watch — every supplier whose status is not Verified, with
 * the certificate that put them there. Derived, never hand-counted: the SVS
 * banner, the dashboard feed and the top-bar bell all read this one list, so
 * a cert change in the data moves every surface at once. Blocked suppliers
 * first, then soonest expiry.
 */
export interface WatchEntry {
  name: string;
  status: Exclude<SupplierStatus, 'verified'>;
  certName: string;
  daysToExpiry?: number;
}

export function complianceWatch(
  suppliers: readonly { name: string; certs: readonly Cert[] }[],
): WatchEntry[] {
  const entries: WatchEntry[] = [];
  for (const s of suppliers) {
    const status = deriveStatus(s.certs);
    if (status === 'verified') continue;
    const cert =
      status === 'blocked'
        ? s.certs.find((c) => c.state === 'lapsed')!
        : s.certs
            .filter((c) => c.state === 'due')
            .sort((a, b) => (a.daysToExpiry ?? 0) - (b.daysToExpiry ?? 0))[0]!;
    entries.push({ name: s.name, status, certName: cert.name, daysToExpiry: cert.daysToExpiry });
  }
  return entries.sort((a, b) => {
    if ((a.status === 'blocked') !== (b.status === 'blocked')) {
      return a.status === 'blocked' ? -1 : 1;
    }
    return (a.daysToExpiry ?? 0) - (b.daysToExpiry ?? 0);
  });
}

/** "GWO" stays upper-case; "Insurance" reads as "insurance" mid-sentence. */
export function certDisplayName(certName: string): string {
  return /^[A-Z0-9]{2,}$/.test(certName)
    ? certName
    : certName.charAt(0).toLowerCase() + certName.slice(1);
}

/** One-line description of a watch entry, shared by banner and feed. */
export function watchLine(entry: WatchEntry): string {
  const cert = certDisplayName(entry.certName);
  if (entry.status === 'blocked') return `${entry.name} — ${cert} lapsed`;
  const verb = entry.certName.endsWith('s') ? 'expire' : 'expires';
  return `${entry.name} — ${cert} ${verb} in ${entry.daysToExpiry} days`;
}
