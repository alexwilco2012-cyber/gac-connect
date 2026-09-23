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
