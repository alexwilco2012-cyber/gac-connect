/**
 * Quote-request mechanics: the client sets the reply-by deadline, and the
 * platform is honest about what a given window is likely to draw. A taxi can
 * be quoted in ten minutes; a crane cannot. More time given, better quote
 * expected.
 */

export interface ReplyWindow {
  id: string;
  label: string;
  hours: number;
}

export const REPLY_WINDOWS: readonly ReplyWindow[] = [
  { id: '10m', label: '10 minutes', hours: 1 / 6 },
  { id: '30m', label: '30 minutes', hours: 0.5 },
  { id: '2h', label: '2 hours', hours: 2 },
  { id: '4h', label: '4 hours', hours: 4 },
  { id: 'today', label: 'End of today', hours: 8 },
  { id: '24h', label: '24 hours', hours: 24 },
] as const;

export const DEFAULT_REPLY_WINDOW = '4h';

export type DeadlineTone = 'warn' | 'info' | 'ok';

export interface DeadlineAdvice {
  tone: DeadlineTone;
  text: string;
}

/** Advice shown beside the deadline control, keyed off the window length. */
export function deadlineAdvice(hours: number): DeadlineAdvice {
  if (hours < 1) {
    return {
      tone: 'warn',
      text: 'Very short windows rarely draw a full set of replies. A taxi can be quoted in ten minutes; a crane, a medic, or a scaffold crew cannot. Give more time and expect a better quote.',
    };
  }
  if (hours < 4) {
    return {
      tone: 'info',
      text: 'Workable for most services. Suppliers with the job in front of them reply fastest; expect fewer replies on specialist lines.',
    };
  }
  return {
    tone: 'ok',
    text: 'A full window. Suppliers can check availability properly, so expect more replies and sharper prices.',
  };
}

export function replyWindowById(id: string): ReplyWindow {
  return REPLY_WINDOWS.find((w) => w.id === id) ?? REPLY_WINDOWS[3]!;
}

/* ------------------------------------------------------------------ */
/* Meal allowance — the sliding scale offered when a hotel is booked.  */
/* Illustrative bands; a production platform reads these from client   */
/* policy. Longer stays step down per day.                             */
/* ------------------------------------------------------------------ */

export interface MealBand {
  /** Inclusive upper bound in nights for this band. */
  upToNights: number;
  perDayGBP: number;
}

export const MEAL_ALLOWANCE_SCALE: readonly MealBand[] = [
  { upToNights: 1, perDayGBP: 30 },
  { upToNights: 3, perDayGBP: 25 },
  { upToNights: Number.POSITIVE_INFINITY, perDayGBP: 20 },
] as const;

export function mealAllowancePerDay(nights: number): number {
  const n = Math.max(1, Math.floor(nights));
  const band = MEAL_ALLOWANCE_SCALE.find((b) => n <= b.upToNights);
  return (band ?? MEAL_ALLOWANCE_SCALE[MEAL_ALLOWANCE_SCALE.length - 1]!).perDayGBP;
}

export function mealAllowanceTotal(nights: number, crew = 1): number {
  const n = Math.max(1, Math.floor(nights));
  return mealAllowancePerDay(n) * n * Math.max(1, Math.floor(crew));
}
