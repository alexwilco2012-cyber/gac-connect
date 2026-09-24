/**
 * Chart colours (live dashboards spec §6) — the one TypeScript source for
 * every colour a chart paints. Values are the validated set (dataviz
 * validator, light mode, on #FFFFFF and #FAFBFD) and mirror the `--viz-*`
 * tokens in `tokens.css`; `tests/charts.test.ts` checks the two agree.
 *
 * Rules that ride with the values:
 * • Categorical colour is fixed to the entity: Agency sea, Logistics sky,
 *   Customs rose, Procurement seafoam — in every chart and every state.
 *   Toggling a pillar never repaints the survivors.
 * • Seafoam is below 3:1 on white: a chart using it is direct-labelled or
 *   has its table view (every chart has one anyway).
 * • Cornflower (slot 5) sits only between slots 3 and 4; otherwise a fifth
 *   category folds into "Other".
 * • Gold is reserved and never appears here. Status colours are for status
 *   only (the certificate expiry bar), always with a glyph or text.
 * • Text never wears a series colour: labels use ink / ink-soft / `tick`.
 */
export interface VizPalette {
  sea: string;
  sky: string;
  rose: string;
  seafoam: string;
  cornflower: string;
  other: string;
  context: string;
  deduction: string;
  derived: string;
  grid: string;
  axis: string;
  tick: string;
  ref: string;
  track: string;
  hover: string;
  surface: string;
  ink: string;
  inkSoft: string;
  /** Heatmap ramp, light → dark. Text: ink on 0–2, none on 3, white on 4. */
  seq: readonly string[];
  /** Funnel ramp, light → dark (five steps validated as an ordinal ramp). */
  ord: readonly string[];
  /** Certificate states — status meaning only, never a series. */
  status: { ok: string; due: string; lapsed: string };
}

export const VIZ: VizPalette = {
  sea: '#0E5E8A',
  sky: '#3F95C6',
  rose: '#C86892',
  seafoam: '#5DCAB7',
  cornflower: '#5C77DF',
  other: '#8595A8',
  context: '#8595A8',
  deduction: '#9AA9BA',
  derived: '#33475F',
  grid: '#E5EAF1',
  axis: '#CBD6E2',
  tick: '#5B6B7F',
  ref: '#0A2540',
  track: '#E8F1F7',
  hover: '#F1F4F8',
  surface: '#FFFFFF',
  ink: '#0A2540',
  inkSoft: '#33475F',
  seq: ['#E0EFFA', '#A8CFE9', '#6FABD2', '#3B83B1', '#0E5E8A'],
  ord: ['#73B0D7', '#4F94BF', '#2F79A5', '#0E5E8A', '#0A4A6E'],
  status: { ok: '#047857', due: '#A84D08', lapsed: '#B91C1C' },
};

export type ServiceLineId = 'agency' | 'logistics' | 'customs' | 'procurement';

/** Service-line colours, fixed to the line (ladder order bottom → top). */
export const LINE_COLOURS: Record<ServiceLineId, string> = {
  agency: VIZ.sea,
  logistics: VIZ.sky,
  customs: VIZ.rose,
  procurement: VIZ.seafoam,
};
