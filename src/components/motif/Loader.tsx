import { useCallback, useEffect, useMemo, useState } from 'react';
import { BRAND_MARK, BRAND_PRODUCT } from '../../config/brand';
import { useApp } from '../../store/app';
import './loader.css';

const TOTAL_MS = 4800;
const HIDE_TRANSITION_MS = 800;

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * The signature entrance (01 §B1): letters fly in, chain links pop, the
 * product name letter-spaces into place, a vessel crosses the waves.
 * Click or Escape skips. Shows once per session. Reduced-motion users
 * skip it entirely.
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
  const width = 560;
  const slot = width / n;
  const directions = ['from-left', 'from-top', 'from-right'];

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
        <svg className="loader-svg" viewBox={`0 0 ${width} 200`}>
          {letters.map((ch, i) => (
            <text
              key={`l-${i}`}
              className={`loader-letter ${directions[i % directions.length]}`}
              x={slot * i + slot / 2}
              y={140}
              textAnchor="middle"
              style={{ animationDelay: `${0.3 + i * 0.25}s` }}
            >
              {ch}
            </text>
          ))}
          {letters.slice(0, -1).map((_, i) => {
            const x = slot * (i + 1);
            const baseDelay = 1.1 + i * 0.18;
            return (
              <g key={`links-${i}`}>
                <ellipse
                  className="chain-link"
                  cx={x - 24}
                  cy={105}
                  rx={10}
                  ry={6}
                  style={{ animationDelay: `${baseDelay}s` }}
                />
                <ellipse
                  className="chain-link"
                  cx={x}
                  cy={105}
                  rx={6}
                  ry={10}
                  style={{ animationDelay: `${baseDelay + 0.1}s` }}
                />
                <ellipse
                  className="chain-link"
                  cx={x + 24}
                  cy={105}
                  rx={10}
                  ry={6}
                  style={{ animationDelay: `${baseDelay + 0.2}s` }}
                />
              </g>
            );
          })}
        </svg>
        <div className="loader-sub">{BRAND_PRODUCT.toUpperCase()}</div>
        <div className="loader-tag">Offshore Services · Connected</div>
      </div>

      <div className="loader-sea">
        <div className="loader-sea-bg" />
        <svg className="loader-sea-waves" viewBox="0 0 1200 130" preserveAspectRatio="none">
          <path
            d="M0 70 Q60 60 120 70 T240 70 T360 70 T480 70 T600 70 T720 70 T840 70 T960 70 T1080 70 T1200 70 V130 H0 Z"
            fill="#0A2540"
          />
          <path
            d="M0 90 Q60 82 120 90 T240 90 T360 90 T480 90 T600 90 T720 90 T840 90 T960 90 T1080 90 T1200 90"
            fill="none"
            stroke="rgba(255,255,255,.12)"
            strokeWidth="1.2"
          />
          <path
            d="M0 110 Q60 104 120 110 T240 110 T360 110 T480 110 T600 110 T720 110 T840 110 T960 110 T1080 110 T1200 110"
            fill="none"
            stroke="rgba(255,255,255,.06)"
            strokeWidth="1"
          />
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
