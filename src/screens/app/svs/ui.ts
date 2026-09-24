import type { PillTone } from '../../../components/ui/Pill';
import type { CheckState, Risk } from '../../../data/svsDesk';

/**
 * Small shared pieces for the SVS desk screens (live dashboards, 23 Sep):
 * form classes that match the rest of the platform, and the tone every
 * status takes. Status colour always travels with words — "Low risk",
 * "Overdue · day 6 of 5", "✓ Passed" — never colour alone.
 */

export const INPUT =
  'mt-1 block min-h-[44px] w-full rounded-lg border-[1.5px] border-line-strong bg-white px-2.5 py-2 text-[13.5px] font-semibold text-ink sm:min-h-[40px]';
export const LABEL = 'block text-[12.5px] font-semibold text-ink-soft';

export const RISK_TONE: Record<Risk, PillTone> = {
  Low: 'neutral',
  Medium: 'warn',
  High: 'danger',
};

export const SLA_TONE: Record<'ok' | 'due' | 'over', PillTone> = {
  ok: 'neutral',
  due: 'warn',
  over: 'danger',
};

export const CHECK_STATUS: Record<CheckState, { label: string; tone: PillTone }> = {
  pending: { label: 'Pending', tone: 'neutral' },
  passed: { label: '✓ Passed', tone: 'verified' },
  failed: { label: '✗ Failed', tone: 'danger' },
  na: { label: 'N/A', tone: 'neutral' },
};

/** Two initials for an applicant or supplier tile ("Cove Bay Scaffolding" → "CB"). */
export function initials(name: string): string {
  const words = name
    .replace(/[^A-Za-z ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length > 1) return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase();
  return name.slice(0, 2).toUpperCase() || '·';
}

/** Newest-first ordering uses the desk's own rule, so the screens and lib/svsDesk agree. */
export { refNumber } from '../../../lib/svsDesk';

/**
 * A relative label as it reads mid-sentence: "Yesterday 15:40" → "yesterday
 * 15:40", "Last Fri" → "last Fri". Weekday and date labels are left alone.
 */
export function midSentence(label: string): string {
  return /^(Today|Yesterday|Last)\b/.test(label)
    ? label.charAt(0).toLowerCase() + label.slice(1)
    : label;
}

/** Moves focus once the next render has committed — for controls that unmount on use. */
export function focusSoon(get: () => HTMLElement | null | undefined) {
  requestAnimationFrame(() => get()?.focus());
}
