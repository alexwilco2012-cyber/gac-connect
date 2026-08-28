import { isStageOf, nextStageIn, stageToneIn } from './pipeline';
import { alertTier, deriveStatus } from './svs';
import type { Cert, SupplierStatus } from './svs';

/**
 * Crew certification tracking — a beta preview, and deliberately built on the
 * SVS engine rather than beside it. A crew credential and a supplier
 * certificate are the same problem seen from two ends: something expires, the
 * alert fires at 90 / 30 / 7 days, and a lapse stops the work. So the horizon
 * and the status here come from `lib/svs`, not from a second copy of the rule
 * — the claim on the screen ("the same alert engine, pointed at crew") is
 * true in the code as well as in the copy.
 *
 * Two things are deliberate and stated on the screen:
 *
 *  - **Crew are held by reference and rank, never by name.** A register of
 *    named seafarers is personal data, and a proof of concept has no business
 *    holding it. The preview shows what the tracking looks like without it.
 *  - **A lapse does not block a sailing here.** The platform is not the
 *    authority on who may sail; it shows the operator what has gone and who
 *    holds it, in time to do something about it.
 */

/** The demo's fixed "today" — Thursday of the demo week, same as every other screen. */
export const REFERENCE_DATE = '2026-08-20';

/** A credential held by one crew member, as days from the demo's today. */
export interface CrewCert {
  name: string;
  /** Days until expiry from `REFERENCE_DATE`; negative once it has lapsed. */
  daysToExpiry: number;
}

export interface CrewMember {
  id: string;
  /** How the crew member appears on screen — 'Crew 041'. Never a name. */
  ref: string;
  rank: string;
  /** The vessel they are assigned to, keyed to `data/vessels`. */
  vesselId: string;
  certs: CrewCert[];
}

/**
 * A crew credential as an SVS certificate, so the chip, the status and the
 * alert tiers are the shared ones. Anything inside the widest alert tier
 * reads 'due'; past its date it reads 'lapsed'.
 */
export function toCert(cert: CrewCert): Cert {
  if (cert.daysToExpiry < 0) return { name: cert.name, state: 'lapsed' };
  if (alertTier(cert.daysToExpiry) !== null) {
    return { name: cert.name, state: 'due', daysToExpiry: cert.daysToExpiry };
  }
  return { name: cert.name, state: 'ok' };
}

export function certsOf(member: CrewMember): Cert[] {
  return member.certs.map(toCert);
}

/** Verified / renewal due / blocked, by the SVS rule — any lapse wins. */
export function crewStatus(member: CrewMember): SupplierStatus {
  return deriveStatus(certsOf(member));
}

/** The alert tier a credential falls in — 7, 30, 90, or null while it is clear. */
export function horizonOf(cert: CrewCert): number | null {
  return cert.daysToExpiry < 0 ? null : alertTier(cert.daysToExpiry);
}

/** Anything that wants attention: lapsed, or inside the 90-day horizon. */
export function needsAttention(cert: CrewCert): boolean {
  return cert.daysToExpiry < 0 || alertTier(cert.daysToExpiry) !== null;
}

/** The date a credential runs out, from the demo's fixed today — '12 Sep 2026'. */
export function expiryLabel(daysToExpiry: number, from: string = REFERENCE_DATE): string {
  const base = new Date(`${from}T00:00:00Z`);
  const date = new Date(base.getTime() + daysToExpiry * 86_400_000);
  const label = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  // en-GB abbreviates September to 'Sept'; every other month is three letters,
  // and a column of dates should not have one odd one in it.
  return label.replace('Sept', 'Sep');
}

/** 'lapsed 6 days ago' / 'expires in 12 days' — the line under a credential. */
export function expiryPhrase(cert: CrewCert): string {
  if (cert.daysToExpiry < 0) {
    const days = Math.abs(cert.daysToExpiry);
    return `lapsed ${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
  if (cert.daysToExpiry === 0) return 'expires today';
  return `expires in ${cert.daysToExpiry} ${cert.daysToExpiry === 1 ? 'day' : 'days'}`;
}

/* --------------------------------------------------------------- Filtering */

export type CertFilter = 'all' | 'attention' | 'lapsed';

export const CERT_FILTERS: readonly { id: CertFilter; label: string }[] = [
  { id: 'all', label: 'Everyone' },
  { id: 'attention', label: 'Needs attention' },
  { id: 'lapsed', label: 'Lapsed' },
];

export function matchesFilter(member: CrewMember, filter: CertFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'lapsed') return member.certs.some((c) => c.daysToExpiry < 0);
  return member.certs.some(needsAttention);
}

/** Soonest problem first: lapsed before expiring, then by days remaining. */
export function byUrgency(a: CrewMember, b: CrewMember): number {
  const soonest = (m: CrewMember) =>
    m.certs.reduce((min, c) => Math.min(min, c.daysToExpiry), Number.POSITIVE_INFINITY);
  return soonest(a) - soonest(b);
}

/**
 * The register as the screen shows it: vessel filter, horizon filter, urgency
 * order. Pure, so the counts on the tiles and the rows in the table can never
 * disagree — both read this.
 */
export function register(
  crew: readonly CrewMember[],
  vesselId: string | 'all',
  filter: CertFilter,
): CrewMember[] {
  return crew
    .filter((m) => (vesselId === 'all' ? true : m.vesselId === vesselId))
    .filter((m) => matchesFilter(m, filter))
    .sort(byUrgency);
}

/** One line per credential wanting attention, soonest first — drives the tiles and the routing. */
export interface CertEntry {
  member: CrewMember;
  cert: CrewCert;
}

export function attentionList(crew: readonly CrewMember[]): CertEntry[] {
  const entries: CertEntry[] = [];
  for (const member of crew) {
    for (const cert of member.certs) {
      if (needsAttention(cert)) entries.push({ member, cert });
    }
  }
  return entries.sort((a, b) => a.cert.daysToExpiry - b.cert.daysToExpiry);
}

export interface RegisterCounts {
  crew: number;
  certificates: number;
  expiring: number;
  lapsed: number;
}

export function counts(crew: readonly CrewMember[]): RegisterCounts {
  const all = crew.flatMap((m) => m.certs);
  return {
    crew: crew.length,
    certificates: all.length,
    expiring: all.filter((c) => c.daysToExpiry >= 0 && alertTier(c.daysToExpiry) !== null).length,
    lapsed: all.filter((c) => c.daysToExpiry < 0).length,
  };
}

/* ---------------------------------------------------------------- Renewals */

export const RENEWAL_STAGES = [
  'Renewal raised',
  'Provider quoted',
  'Course booked',
  'Certificate updated',
] as const;
export type RenewalStage = (typeof RENEWAL_STAGES)[number];

export interface Renewal {
  id: string;
  crewId: string;
  crewRef: string;
  rank: string;
  vesselId: string;
  certName: string;
  /** Days to expiry when the renewal was raised — the reason it was raised. */
  daysToExpiry: number;
  provider: string;
  stage: RenewalStage;
  createdAt: string;
  /** True when the platform raised it in a sweep rather than a person clicking a row. */
  automatic: boolean;
}

export function nextRenewalStage(stage: string): RenewalStage {
  return nextStageIn(RENEWAL_STAGES, stage);
}

export function renewalStageTone(stage: string): 'info' | 'verified' {
  return stageToneIn(RENEWAL_STAGES, stage);
}

/** The simulate button at each stage; null once the credential is back in date. */
export function renewalAction(stage: string): { label: string; steps: number } | null {
  switch (stage as RenewalStage) {
    case 'Renewal raised':
      return { label: 'Simulate: the provider quotes', steps: 1 };
    case 'Provider quoted':
      return { label: 'Simulate: the course is booked', steps: 1 };
    case 'Course booked':
      return { label: 'Simulate: the certificate comes back', steps: 1 };
    default:
      return null;
  }
}

/** 'CRT-2051' — sequential from the highest reference already held. */
export function nextRenewalRef(existing: readonly Renewal[]): string {
  const numbers = existing
    .map((r) => Number(/^CRT-(\d+)$/.exec(r.id)?.[1] ?? NaN))
    .filter((n) => Number.isFinite(n));
  const top = numbers.length ? Math.max(...numbers) : 2050;
  return `CRT-${top + 1}`;
}

/** One renewal per credential per crew member — a sweep never doubles up. */
export function isRouted(renewals: readonly Renewal[], crewId: string, certName: string): boolean {
  return renewals.some((r) => r.crewId === crewId && r.certName === certName);
}

/**
 * What an automatic sweep would raise: everything lapsed or inside the 30-day
 * tier that has not been routed already. 90 days is a warning; 30 is when the
 * course has to be booked to land in time, so that is where the sweep bites.
 */
export const SWEEP_TIER = 30;

export function sweepCandidates(
  crew: readonly CrewMember[],
  renewals: readonly Renewal[],
): CertEntry[] {
  return attentionList(crew).filter(
    ({ member, cert }) =>
      cert.daysToExpiry <= SWEEP_TIER && !isRouted(renewals, member.id, cert.name),
  );
}

export function openRenewals(renewals: readonly Renewal[]): Renewal[] {
  return renewals.filter((r) => r.stage !== 'Certificate updated');
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Shape guard for a stored renewal — malformed entries are dropped. */
export function isRenewal(v: unknown): v is Renewal {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === 'string' &&
    typeof v.crewId === 'string' &&
    typeof v.crewRef === 'string' &&
    typeof v.rank === 'string' &&
    typeof v.vesselId === 'string' &&
    typeof v.certName === 'string' &&
    typeof v.daysToExpiry === 'number' &&
    typeof v.provider === 'string' &&
    typeof v.createdAt === 'string' &&
    typeof v.automatic === 'boolean' &&
    isStageOf(RENEWAL_STAGES, v.stage)
  );
}
