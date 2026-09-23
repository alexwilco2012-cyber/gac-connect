import { VIZ } from '../charts/palette';

/**
 * Inline SVG sparkline — no dependency (the repo rule: hand-roll small
 * visuals rather than take a chart library). Spec §6 marks: a 2px line over
 * a flat 10% wash of the same colour (no gradient), and an r=4 end dot on a
 * 2px white ring. The dot is HTML over the stretched SVG so it stays round
 * at any width. Decorative: the number beside it carries the meaning, so
 * the whole thing is aria-hidden.
 */
export function Sparkline({
  points,
  className = '',
  stroke = VIZ.sea,
  height = 28,
  endDot = true,
}: {
  points: readonly number[];
  className?: string;
  stroke?: string;
  /** Pixel height of the plot (StatCard uses 36). */
  height?: number;
  endDot?: boolean;
}) {
  const W = 100;
  const H = height;
  const PAD_Y = endDot ? 6 : 2;
  const n = points.length;
  if (n === 0) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const coords = points.map((p, i) => {
    const x = n === 1 ? W : (i / (n - 1)) * W;
    const y = PAD_Y + (1 - (p - min) / span) * (H - PAD_Y * 2);
    return [Number(x.toFixed(2)), Number(y.toFixed(2))] as const;
  });
  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
  const area = `${line} L${coords[n - 1]![0]} ${H} L${coords[0]![0]} ${H} Z`;
  const [ex, ey] = coords[n - 1]!;

  return (
    <div className={`w-full ${className}`} aria-hidden="true">
      <div className={`relative ${endDot ? 'mr-[6px]' : ''}`} style={{ height: H }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 block h-full w-full overflow-visible"
        >
          <path d={area} fill={stroke} fillOpacity={0.1} />
          <path
            d={line}
            fill="none"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {endDot ? (
          <span
            className="absolute block h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${ex}%`,
              top: `${(ey / H) * 100}%`,
              background: stroke,
              boxShadow: `0 0 0 2px ${VIZ.surface}`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
