import {
  CLIENT_ACTIVITY,
  LINE_LABELS,
  LINE_ORDER,
  PORT_CALL_STAGES,
  SPEND_BY_LINE,
  SPEND_MONTHS,
  type ActivityItem,
  type LineId,
  type PortCallStage,
} from '../data/clientDesk';
import { tierPct, type TierSelection } from './tier';

/**
 * Client dashboard rules (live dashboards, 23 Sep; spec §2).
 *
 * The spend chart and the activity feed follow the lines held in the tier
 * card: switch a pillar there and both move with it, because both read these
 * functions over the same `useApp` tier. In the chart, Procurement is included
 * at any tier, so it is always held; the other three follow their switch. The
 * feed hides only the Logistics and Customs rows while those pillars are off:
 * Agency rows stay whatever the switch says, because the port calls on the
 * screen are still GAC's. The arithmetic of the discount itself stays in
 * `lib/tier`.
 */

/** The lines the client holds, in ladder order. Procurement always. */
export function heldLines(tier: TierSelection): LineId[] {
  return LINE_ORDER.filter((id) => id === 'procurement' || tier[id]);
}

/**
 * The spend chart's stacks, bottom to top. A line's entry is the same whatever
 * else is held — its id and values never shift — so a chart keyed on the id
 * keeps every surviving line's colour when a pillar is switched.
 */
export function spendSeries(
  tier: TierSelection,
): { id: LineId; label: string; values: number[] }[] {
  return heldLines(tier).map((id) => ({
    id,
    label: LINE_LABELS[id],
    values: [...SPEND_BY_LINE[id]],
  }));
}

/** What the tier discount saved each month: the held lines' total × the tier, to the pound. */
export function monthlySaving(tier: TierSelection): number[] {
  const pct = tierPct(tier);
  const series = spendSeries(tier);
  return SPEND_MONTHS.map((_, i) => {
    const total = series.reduce((acc, s) => acc + (s.values[i] ?? 0), 0);
    return Math.round((total * pct) / 100);
  });
}

/** "Latest from GAC" without the Logistics and Customs rows the client does not hold. */
export function visibleActivity(tier: TierSelection): ActivityItem[] {
  return CLIENT_ACTIVITY.filter((item) => {
    if (item.line === 'logistics') return tier.logistics;
    if (item.line === 'customs') return tier.customs;
    return true;
  });
}

/** Position of a port call on its milestone rail, counted from one. */
export function portCallStep(stage: PortCallStage): number {
  return PORT_CALL_STAGES.indexOf(stage) + 1;
}
