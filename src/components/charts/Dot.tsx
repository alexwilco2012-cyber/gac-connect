import { VIZ } from './palette';
import { px } from './svg';

/** Marker: r=4 in the series colour on a 2px surface ring (spec §6). */
export function Dot({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <circle cx={px(x)} cy={px(y)} r={6} fill={VIZ.surface} />
      <circle cx={px(x)} cy={px(y)} r={4} fill={color} />
    </g>
  );
}
