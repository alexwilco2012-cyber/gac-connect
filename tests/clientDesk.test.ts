import { describe, expect, it } from 'vitest';
import {
  CLIENT_ACTIVITY,
  LINE_LABELS,
  LINE_ORDER,
  PORT_CALL_STAGES,
  PORT_CALLS,
  QUICK_ACTIONS,
  SPEND_BY_LINE,
  SPEND_MONTHS,
} from '../src/data/clientDesk';
import { DEMO_CLIENT, DEMO_SUPPLIER_ID, EXAMPLE_JOB_GBP } from '../src/data/desk';
import { VESSELS } from '../src/data/vessels';
import {
  heldLines,
  monthlySaving,
  portCallStep,
  spendSeries,
  visibleActivity,
} from '../src/lib/clientDesk';
import { annualSaving, type TierSelection } from '../src/lib/tier';

/**
 * The client dashboard (live dashboards, spec §2): the spend chart and the
 * activity feed follow the lines the client holds in the tier card, so the
 * rules for "which lines" live in one pure module and are tested here.
 */

const NONE: TierSelection = { agency: false, logistics: false, customs: false };
const AGENCY: TierSelection = { agency: true, logistics: false, customs: false };
const FULL: TierSelection = { agency: true, logistics: true, customs: true };
const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

describe('shared desk constants', () => {
  it('keeps the demo personas and the worked example', () => {
    expect(DEMO_CLIENT).toBe('Browne Energy');
    expect(DEMO_SUPPLIER_ID).toBe('silver-city-welding');
    expect(EXAMPLE_JOB_GBP).toBe(4400);
  });
});

describe('heldLines', () => {
  it('always includes Procurement, which is part of any tier', () => {
    expect(heldLines(NONE)).toEqual(['procurement']);
    expect(heldLines(AGENCY)).toEqual(['agency', 'procurement']);
    expect(heldLines({ agency: false, logistics: false, customs: true })).toContain('procurement');
  });

  it('follows the tier card, in ladder order', () => {
    expect(heldLines(FULL)).toEqual(['agency', 'logistics', 'customs', 'procurement']);
    expect(heldLines({ agency: true, logistics: false, customs: true })).toEqual([
      'agency',
      'customs',
      'procurement',
    ]);
    expect(LINE_ORDER).toEqual(['agency', 'logistics', 'customs', 'procurement']);
  });
});

describe('spendSeries', () => {
  it('stacks the held lines bottom to top in ladder order, labelled', () => {
    const series = spendSeries(FULL);
    expect(series.map((s) => s.id)).toEqual([...LINE_ORDER]);
    expect(series.map((s) => s.label)).toEqual(LINE_ORDER.map((id) => LINE_LABELS[id]));
    for (const s of series) expect(s.values).toHaveLength(SPEND_MONTHS.length);
  });

  it('a line keeps its identity whatever else is held, so colour can follow the line', () => {
    const withLogistics = spendSeries({ agency: true, logistics: true, customs: true });
    const withoutLogistics = spendSeries({ agency: true, logistics: false, customs: true });
    const customsA = withLogistics.find((s) => s.id === 'customs');
    const customsB = withoutLogistics.find((s) => s.id === 'customs');
    expect(customsA).toEqual(customsB);
    expect(customsB?.values).toEqual([...SPEND_BY_LINE.customs]);
    expect(withoutLogistics.map((s) => s.id)).not.toContain('logistics');
  });

  it('adds up to £250,000 over six months at Full Stack', () => {
    expect(sum(spendSeries(FULL).flatMap((s) => s.values))).toBe(250_000);
  });
});

describe('monthlySaving', () => {
  it('is each month’s total at the tier rate — £17,500 at Full Stack, half the annual saving', () => {
    const saving = monthlySaving(FULL);
    expect(saving).toHaveLength(6);
    expect(sum(saving)).toBe(17_500);
    expect(sum(saving)).toBe(annualSaving(500_000, FULL) / 2);
  });

  it('only counts the lines held, at the tier held', () => {
    // Agency alone: Agency and Procurement at 2%.
    const expected = SPEND_MONTHS.map((_, i) =>
      Math.round(((SPEND_BY_LINE.agency[i]! + SPEND_BY_LINE.procurement[i]!) * 2) / 100),
    );
    expect(monthlySaving(AGENCY)).toEqual(expected);
    expect(monthlySaving(NONE)).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe('visibleActivity', () => {
  it('shows every row at Full Stack, newest first', () => {
    expect(visibleActivity(FULL)).toEqual(CLIENT_ACTIVITY);
    expect(CLIENT_ACTIVITY).toHaveLength(8);
    expect(CLIENT_ACTIVITY[0]!.when).toBe('Today 07:42');
  });

  it('hides Logistics and Customs rows while those pillars are not held', () => {
    const rows = visibleActivity(AGENCY);
    expect(rows.some((r) => r.line === 'logistics' || r.line === 'customs')).toBe(false);
    expect(rows).toHaveLength(6);
    const withLogistics = visibleActivity({ agency: true, logistics: true, customs: false });
    expect(withLogistics.some((r) => r.line === 'logistics')).toBe(true);
    expect(withLogistics.some((r) => r.line === 'customs')).toBe(false);
  });
});

describe('port calls', () => {
  it('one row per vessel, in the vessel order', () => {
    expect(PORT_CALLS.map((c) => c.vesselId)).toEqual(VESSELS.map((v) => v.id));
    expect(PORT_CALLS.find((c) => c.vesselId === 'choice')?.stage).toBe('Berth confirmed');
  });

  it('counts milestones from one', () => {
    expect(PORT_CALL_STAGES).toHaveLength(5);
    expect(portCallStep('Pre-arrival')).toBe(1);
    expect(portCallStep('Berth confirmed')).toBe(3);
    expect(portCallStep('Sailed')).toBe(5);
  });

  it('keeps the booked-supplier warning, linked to the SVS', () => {
    const boreal = PORT_CALLS.find((c) => c.vesselId === 'boreal')!;
    const warn = boreal.chips.find((c) => c.tone === 'warn');
    expect(warn?.label).toBe('2 certs expiring on booked supplier');
    expect(warn?.to).toBe('/app/svs');
  });
});

describe('client-facing copy', () => {
  const text = JSON.stringify({ PORT_CALLS, CLIENT_ACTIVITY, QUICK_ACTIONS, LINE_LABELS });

  it('never mentions commission — the client view is swept for the word', () => {
    expect(text).not.toMatch(/commission|mark-?up/i);
  });

  it('has no exclamation marks', () => {
    expect(text).not.toContain('!');
  });

  it('every quick action and activity row goes somewhere in the platform', () => {
    expect(QUICK_ACTIONS).toHaveLength(5);
    for (const a of [...QUICK_ACTIONS, ...CLIENT_ACTIVITY]) expect(a.to).toMatch(/^\/app\//);
  });
});
