/** Small SVG helpers shared by the chart components. */

/** Round to 0.1px — crisp enough, and keeps path data short. */
export const px = (n: number): number => Math.round(n * 10) / 10;

/**
 * Rough rendered width of a label (Inter, tabular figures). Used only to
 * size gutters and to skip a label that would collide — never to clip one.
 */
export function textWidth(s: string, size = 11, bold = false): number {
  return s.length * size * (bold ? 0.62 : 0.58);
}

/** Space between a y-axis tick label's right edge and the plot. */
export const TICK_GAP = 8;

/**
 * Left gutter for right-anchored y-axis ticks drawn at `plotLeft - TICK_GAP`.
 * Inter draws '£' and tabular figures nearer 0.64em than `textWidth`'s 0.58,
 * so the widest tick gets 4px of slack — without it '£500' starts 1.6px left
 * of the SVG and loses the stroke of its '£'.
 */
export function tickGutter(ticks: readonly string[], min: number): number {
  return Math.max(min, ...ticks.map((t) => textWidth(t) + TICK_GAP + 4));
}

/** A 3px surface-coloured halo so a direct label reads over lines and grid. */
export const HALO = {
  stroke: '#FFFFFF',
  strokeWidth: 3,
  strokeLinejoin: 'round' as const,
  paintOrder: 'stroke',
};

/** Screen-reader instructions for a focusable plot. */
export const NAV_HINT =
  'Use the arrow keys to move between points, Home and End to jump to the ends, and Escape to hide the details.';
