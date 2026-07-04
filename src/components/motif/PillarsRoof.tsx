import { BRAND_NAME } from '../../config/brand';

export interface PillarDef {
  label: string;
  on: boolean;
}

/**
 * The brand motif: a gold roof resting squarely on four sea-blue columns.
 * Parametric geometry with EQUAL overhang both sides — the roof is never
 * wider than the pillar span plus a small symmetric overhang (02 §motif:
 * this was a corrected defect; keep it parametric).
 */
export function PillarsRoof({
  pillars,
  fullStack,
  showLabels = true,
  showWordmark = true,
  monochrome = false,
  dark = false,
  className,
}: {
  pillars: PillarDef[];
  fullStack: boolean;
  showLabels?: boolean;
  showWordmark?: boolean;
  monochrome?: boolean;
  /** Render labels legibly on dark surfaces. */
  dark?: boolean;
  className?: string;
}) {
  const PILLAR_W = 38;
  const GAP = 14;
  const OVERHANG = 10; // symmetric, both sides
  const PILLAR_H = 62;
  const PILLAR_Y = 62;
  const ROOF_APEX_Y = 8;
  const ROOF_BASE_Y = 52;
  const LABEL_Y = PILLAR_Y + PILLAR_H + 14;

  const n = Math.max(pillars.length, 1);
  const span = n * PILLAR_W + (n - 1) * GAP;
  const margin = 12;
  const width = span + 2 * (margin + OVERHANG);
  const height = showLabels ? LABEL_Y + 4 : PILLAR_Y + PILLAR_H + 4;
  const spanStart = margin + OVERHANG;
  const cx = width / 2;

  const roofOn = fullStack && !monochrome;
  const labelFill = monochrome ? 'currentColor' : dark ? '#9FB4C8' : 'var(--ink-soft)';
  const pillarFill = (on: boolean) =>
    monochrome
      ? 'currentColor'
      : on
        ? dark
          ? 'var(--sea-bright, #1B7FB5)'
          : 'var(--sea)'
        : dark
          ? '#2C4159'
          : '#D7DFE8';

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={
        fullStack
          ? `${pillars.filter((p) => p.on).length} of ${n} pillars active under one roof — Full Stack`
          : `${pillars.filter((p) => p.on).length} of ${n} pillars active under one roof`
      }
    >
      <polygon
        points={`${cx},${ROOF_APEX_Y} ${spanStart - OVERHANG},${ROOF_BASE_Y} ${spanStart + span + OVERHANG},${ROOF_BASE_Y}`}
        fill={monochrome ? 'currentColor' : roofOn ? 'var(--gold)' : '#E9EDF2'}
        stroke={monochrome ? 'none' : roofOn ? 'var(--gold-deep)' : '#CBD6E2'}
        strokeWidth="1"
        style={{ transition: 'fill 0.4s, stroke 0.4s' }}
        opacity={monochrome ? 0.85 : 1}
      />
      {showWordmark ? (
        <text
          x={cx}
          y={ROOF_BASE_Y - 10}
          textAnchor="middle"
          style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em' }}
          fill={monochrome ? 'var(--paper)' : 'var(--ink)'}
        >
          {BRAND_NAME.toUpperCase()}
        </text>
      ) : null}
      {pillars.map((p, i) => {
        const x = spanStart + i * (PILLAR_W + GAP);
        return (
          <g key={p.label}>
            <rect
              x={x}
              y={PILLAR_Y}
              width={PILLAR_W}
              height={PILLAR_H}
              rx="3"
              fill={pillarFill(p.on)}
              style={{ transition: 'fill 0.35s' }}
              opacity={monochrome && !p.on ? 0.4 : 1}
            />
            {showLabels ? (
              <text
                x={x + PILLAR_W / 2}
                y={LABEL_Y}
                textAnchor="middle"
                style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.04em' }}
                fill={labelFill}
              >
                {p.label.toUpperCase()}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
