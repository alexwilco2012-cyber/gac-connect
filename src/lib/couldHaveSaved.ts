import { LINE_LABELS, SPEND_MONTHS } from '../data/clientDesk';
import { monthlySaving, spendSeries } from './clientDesk';
import { gbp } from './format';
import { TIERS, annualSaving, tierPct, type TierSelection, type TierService } from './tier';

/**
 * "How much more you could have saved" (owner's FF06 proposal: the client
 * dashboard advises "how much they could have saved if they utilised more GAC
 * services"). The spend card's last line: the same six months of spend on the
 * lines held, priced at the next tier up and at the Full Stack rate.
 *
 * "The same spend" is deliberate: the spend on the lines the client already
 * holds, so the figure isolates the discount and invents no new work. Tiers
 * are non-cumulative, so the switch that reaches 7% is Customs on its own.
 * Procurement is included at any tier and is never a step. At 7% there is no
 * higher rate, so there is nothing to say — and no celebration either.
 *
 * Rounding matches the spend card: each month to the pound, then summed.
 */

export interface SavingStep {
  /** The pillar to switch on. */
  service: TierService;
  /** The tier it would put the client on. */
  pct: number;
  /** What the same six months would have saved at that tier. */
  saved: number;
  /** `saved` less what the tier held today saved. */
  more: number;
}

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

/** What the held lines' spend would have saved with `extra` held as well. */
function savedWith(tier: TierSelection, extra: TierService): number {
  const hypothetical: TierSelection = { ...tier, [extra]: true };
  const series = spendSeries(tier);
  // annualSaving is the tier's arithmetic on any sum; here, one month's.
  return sum(
    SPEND_MONTHS.map((_, i) =>
      annualSaving(
        series.reduce((acc, s) => acc + (s.values[i] ?? 0), 0),
        hypothetical,
      ),
    ),
  );
}

/**
 * The next tier up and the Full Stack rate, lowest first; one step when the
 * next tier up is already 7%, none at 7%.
 */
export function couldHaveSaved(tier: TierSelection): SavingStep[] {
  const pct = tierPct(tier);
  const higher = (Object.keys(TIERS) as TierService[])
    .filter((k) => !tier[k] && TIERS[k] > pct)
    .sort((a, b) => TIERS[a] - TIERS[b]);
  if (higher.length === 0) return [];

  const next = higher[0]!;
  const top = higher[higher.length - 1]!;
  const current = sum(monthlySaving(tier));
  return (next === top ? [next] : [next, top]).map((service) => {
    const saved = savedWith(tier, service);
    return { service, pct: TIERS[service], saved, more: saved - current };
  });
}

/**
 * The sentence under the spend chart, or null at 7%. With no tier held the
 * "more" would only repeat the saving, so it is left off.
 */
export function couldHaveSavedLine(tier: TierSelection): string | null {
  const steps = couldHaveSaved(tier);
  if (steps.length === 0) return null;
  const held = tierPct(tier) > 0;
  return steps
    .map(
      (s, i) =>
        `Add ${LINE_LABELS[s.service]} and ${i === 0 ? 'the same spend' : 'it'} would have saved ${gbp(
          s.saved,
        )} at ${s.pct}%${held ? ` — ${gbp(s.more)} more` : ''}.`,
    )
    .join(' ');
}
