import { useId } from 'react';

/**
 * Inline SVG sparkline — line plus soft area fill, no dependency (the repo
 * rule: hand-roll small visuals rather than take a chart library). Decorative:
 * the number beside it carries the meaning, so the SVG is aria-hidden.
 */
export function Sparkline({
  points,
  className = '',
  stroke = 'var(--sea)',
}: {
  points: readonly number[];
  className?: string;
  stroke?: string;
}) {
  const id = useId();
  const W = 100;
  const H = 28;
  const PAD = 2;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = (W - PAD * 2) / (points.length - 1 || 1);
  const coords = points.map((p, i) => {
    const x = PAD + i * step;
    const y = PAD + (1 - (p - min) / span) * (H - PAD * 2);
    return [Number(x.toFixed(2)), Number(y.toFixed(2))] as const;
  });
  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
  const area = `${line} L${coords[coords.length - 1]![0]} ${H} L${coords[0]![0]} ${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={`block h-7 w-full ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
