import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { BRAND_MARK, BRAND_PRODUCT } from '../../config/brand';
import { useApp } from '../../store/app';
import './loader.css';

const TOTAL_MS = 4800;
const HIDE_TRANSITION_MS = 800;

/* Choreography beats (seconds). The snap beat lives in loader.css as --snap:
   scene in → sonar pings → letters rise wide → chain forges link by link in a
   slack catenary → snaps taut, pulling the letters together → product name
   tracks in → tagline → auto-dismiss. */
const LETTER_IN = 0.35;
const LETTER_STAGGER = 0.14;
const FORGE_START = 1.05;
const FORGE_GAP_STAGGER = 0.15;
const FORGE_RANK_STAGGER = 0.12;

const WIDTH = 560;
const CHAIN_Y = 100;
const BASELINE_Y = 140;
/* How far beyond final tracking the letters start (pulled in at the snap). */
const SPREAD_PX = 16;
/* One chain run per gap: face-on ring / edge-on bar / ring / bar / ring. */
const LINK_OFFSETS = [-38, -19, 0, 19, 38] as const;
const RUN_SPAN = 102;
const HALF_GAP = 50;
const MAX_DROOP = 13;

/** Catenary sag for a link at `offset` from the gap centre (0 at the anchors). */
function droopAt(offset: number): number {
  const t = offset / HALF_GAP;
  return Math.round(MAX_DROOP * (1 - t * t) * 10) / 10;
}

/** Outermost links forge first; the centre link completes the connection. */
function forgeRank(offset: number): number {
  return Math.round((38 - Math.abs(offset)) / 19);
}

/** A tiling wave path with a 240-unit period, wide enough to drift seamlessly. */
function wavePath(y: number, amp: number, close: boolean): string {
  let d = `M-240 ${y} Q-180 ${y - amp} -120 ${y}`;
  for (let x = 0; x <= 1440; x += 120) d += ` T${x} ${y}`;
  return close ? `${d} V130 H-240 Z` : d;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * The signature entrance (01 §B1, bespoke rework): sonar pings ripple out,
 * the letters rise from the deep tracked wide apart, a gold chain forges
 * itself link by link between them — sagging in a catenary — then snaps
 * taut and pulls the letters together. The product name letter-spaces into
 * place and a vessel crosses the drifting waves. Click or Escape skips.
 * Shows once per session. Reduced-motion users skip it entirely.
 */
export function Loader() {
  const loaderSeen = useApp((s) => s.loaderSeen);
  const markLoaderSeen = useApp((s) => s.markLoaderSeen);
  const skip = useMemo(() => loaderSeen || prefersReducedMotion(), [loaderSeen]);
  const [hiding, setHiding] = useState(false);
  const [gone, setGone] = useState(skip);

  const dismiss = useCallback(() => {
    setHiding(true);
    markLoaderSeen();
    window.setTimeout(() => setGone(true), HIDE_TRANSITION_MS);
  }, [markLoaderSeen]);

  useEffect(() => {
    if (skip) {
      markLoaderSeen();
      return;
    }
    const auto = window.setTimeout(dismiss, TOTAL_MS);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(auto);
      document.removeEventListener('keydown', onKey);
    };
  }, [skip, dismiss, markLoaderSeen]);

  if (gone) return null;

  const letters = BRAND_MARK.toUpperCase().split('');
  const n = letters.length;
  const slot = WIDTH / n;
  const centre = (n - 1) / 2;
  const spreadFor = (i: number) => (centre === 0 ? 0 : ((i - centre) / centre) * SPREAD_PX);

  const gaps = Array.from({ length: Math.max(n - 1, 0) }, (_, g) => {
    const spreadLeft = spreadFor(g);
    const spreadRight = spreadFor(g + 1);
    return {
      cx: slot * (g + 1),
      shift: (spreadLeft + spreadRight) / 2,
      scale: 1 + (spreadRight - spreadLeft) / RUN_SPAN,
    };
  });

  return (
    <div
      className={`loader ${hiding ? 'hide' : ''}`}
      onClick={dismiss}
      role="presentation"
      aria-hidden="true"
      data-testid="loader"
    >
      <button type="button" className="loader-skip" onClick={dismiss} tabIndex={-1}>
        Click to skip
      </button>
      <div className="loader-grid" />
      <div className="loader-glow" />

      <div className="loader-stage">
        <svg className="loader-svg" viewBox={`0 0 ${WIDTH} 200`}>
          <defs>
            <linearGradient id="ldr-letter" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#c7d6e8" />
            </linearGradient>
            <linearGradient id="ldr-gold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffdf8e" />
              <stop offset="0.55" stopColor="#ffc72c" />
              <stop offset="1" stopColor="#d4a92a" />
            </linearGradient>
          </defs>

          {[0.15, 0.9].map((delay, i) => (
            <circle
              key={`ping-${i}`}
              className="loader-ping"
              cx={WIDTH / 2}
              cy={CHAIN_Y}
              r={5}
              style={{ animationDelay: `${delay}s` }}
            />
          ))}

          {letters.map((ch, i) => (
            <text
              key={`l-${i}`}
              className="loader-letter"
              x={slot * i + slot / 2}
              y={BASELINE_Y}
              textAnchor="middle"
              style={
                {
                  '--spread': `${spreadFor(i)}px`,
                  '--tilt': i % 2 ? '2.5deg' : '-3.5deg',
                  animationDelay: `${LETTER_IN + i * LETTER_STAGGER}s, var(--snap)`,
                } as CSSProperties
              }
            >
              {ch}
            </text>
          ))}

          {gaps.map((gap, g) => (
            <g key={`run-${g}`}>
              <g
                className="chain-run"
                style={
                  {
                    '--cshift': `${gap.shift}px`,
                    '--cscale': gap.scale,
                    transformOrigin: `${gap.cx}px ${CHAIN_Y}px`,
                  } as CSSProperties
                }
              >
                {LINK_OFFSETS.map((off, k) => {
                  const forgeDelay =
                    FORGE_START + g * FORGE_GAP_STAGGER + forgeRank(off) * FORGE_RANK_STAGGER;
                  const style = {
                    '--droop': `${droopAt(off)}px`,
                    animationDelay: `${forgeDelay}s, var(--snap)`,
                  } as CSSProperties;
                  return k % 2 === 0 ? (
                    <ellipse
                      key={`link-${g}-${k}`}
                      className="chain-ring"
                      cx={gap.cx + off}
                      cy={CHAIN_Y}
                      rx={11}
                      ry={7.5}
                      style={style}
                    />
                  ) : (
                    <rect
                      key={`link-${g}-${k}`}
                      className="chain-bar"
                      x={gap.cx + off - 8.5}
                      y={CHAIN_Y - 2.25}
                      width={17}
                      height={4.5}
                      rx={2.25}
                      style={style}
                    />
                  );
                })}
              </g>
              <g transform={`translate(${gap.cx}, ${CHAIN_Y})`}>
                <path className="glint-star" d="M0 -9 L2 -2 L9 0 L2 2 L0 9 L-2 2 L-9 0 L-2 -2 Z" />
                <circle className="glint-ripple" cx={0} cy={0} r={3} />
              </g>
            </g>
          ))}
        </svg>
        <div className="loader-sub">{BRAND_PRODUCT.toUpperCase()}</div>
        <div className="loader-tag">Offshore Services · Connected</div>
      </div>

      <div className="loader-sea">
        <div className="loader-sea-bg" />
        <svg className="loader-sea-waves" viewBox="0 0 1200 130" preserveAspectRatio="none">
          <g className="wave wave-a">
            <path d={wavePath(70, 10, true)} fill="#0A2540" />
          </g>
          <g className="wave wave-b">
            <path
              d={wavePath(90, 8, false)}
              fill="none"
              stroke="rgba(255,255,255,.12)"
              strokeWidth="1.2"
            />
          </g>
          <g className="wave wave-c">
            <path
              d={wavePath(110, 6, false)}
              fill="none"
              stroke="rgba(255,255,255,.06)"
              strokeWidth="1"
            />
          </g>
        </svg>
        <svg className="loader-vessel" viewBox="0 0 200 90">
          <g className="loader-vessel-bob">
            <path d="M6 56 L22 72 L160 72 L182 56 L182 48 L6 48 Z" fill="#FFFFFF" />
            <rect x="6" y="52" width="176" height="4" fill="#FFC72C" />
            <rect x="38" y="34" width="22" height="14" fill="#3B82F6" />
            <rect x="64" y="34" width="22" height="14" fill="#FFC72C" />
            <rect
              x="90"
              y="34"
              width="22"
              height="14"
              fill="#FFFFFF"
              stroke="#0A2540"
              strokeWidth=".8"
            />
            <path d="M120 48 L120 18 L160 18 L172 28 L172 48 Z" fill="#FFFFFF" />
            <rect x="124" y="22" width="44" height="5" fill="#0A2540" />
            <line x1="146" y1="18" x2="146" y2="2" stroke="#FFFFFF" strokeWidth="1.2" />
            <circle className="loader-mast-halo" cx="146" cy="2" r="5" fill="#FFC72C" />
            <circle cx="146" cy="2" r="2" fill="#FFC72C" />
            <rect x="108" y="22" width="4" height="26" fill="#FFC72C" />
            <line x1="110" y1="22" x2="78" y2="2" stroke="#FFC72C" strokeWidth="2.6" />
          </g>
        </svg>
      </div>
      <div className="loader-bar" />
    </div>
  );
}
