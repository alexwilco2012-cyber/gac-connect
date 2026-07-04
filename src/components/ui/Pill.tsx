import type { ReactNode } from 'react';
import type { SupplierStatus } from '../../lib/svs';

export type PillTone =
  'inhouse' | 'verified' | 'promoted' | 'warn' | 'danger' | 'info' | 'beta' | 'neutral';

const TONES: Record<PillTone, string> = {
  inhouse: 'bg-gold-soft text-gold-deep border border-[#E5D89A]',
  verified: 'bg-success-soft text-success',
  promoted: 'bg-promoted-soft text-promoted border border-promoted-line',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-sea-soft text-sea',
  beta: 'bg-gold-bright text-ink font-display',
  neutral: 'bg-paper text-ink-soft border border-line-strong',
};

export function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-bold tracking-[0.02em] whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/** The BETA pill — gold-bright, ink text, 9px caps (02 §components). */
export function BetaPill() {
  return (
    <span className="ml-1.5 inline-block rounded-[3px] bg-gold-bright px-1.5 py-0.5 align-middle font-display text-[9px] font-bold tracking-[0.08em] text-ink uppercase">
      BETA
    </span>
  );
}

/** Status pill mapped from an SVS-derived supplier status. */
export function StatusPill({ status }: { status: SupplierStatus }) {
  if (status === 'blocked') return <Pill tone="danger">✗ Booking blocked</Pill>;
  if (status === 'renewal-due') return <Pill tone="warn">⚠ Renewal due</Pill>;
  return <Pill tone="verified">✓ GAC Verified</Pill>;
}
