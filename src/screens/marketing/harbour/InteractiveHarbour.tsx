import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HOTSPOT_ART, SceneBackground } from './HarbourArt';
import { HARBOUR_SERVICES, HOTSPOTS, menuTag, ORDER } from './services';
import type { ServiceId } from './services';

/**
 * Interactive services landing hero (design handoff "GAC Services Landing"):
 * a night-harbour scene where every element is a service-line hotspot, with
 * a side panel that swaps between the menu and a service detail card.
 */
export function InteractiveHarbour({ alwaysShowLabels = true }: { alwaysShowLabels?: boolean }) {
  const [sel, setSel] = useState<ServiceId | null>(null);
  const [hover, setHover] = useState<ServiceId | null>(null);

  const clearSel = useCallback(() => setSel(null), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSel(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const svc = sel ? HARBOUR_SERVICES[sel] : null;

  return (
    <div className="mx-auto max-w-[1280px] px-6 pt-[22px] pb-10">
      <div className="flex flex-wrap items-stretch gap-[18px]">
        {/* Scene column */}
        <div className="min-w-0 flex-[2.6_1_520px]">
          <div className="relative h-[clamp(430px,54vw,760px)] w-full overflow-hidden rounded-2xl bg-ink shadow-[0_1px_3px_rgba(10,37,64,0.12),0_10px_30px_rgba(10,37,64,0.14)]">
            <SceneBackground onClear={clearSel} />

            {/* Title block — must never overlap the crane chip */}
            <div className="pointer-events-none absolute top-[6%] left-[3.5%] z-[3] max-w-[28%] min-w-[200px]">
              <p className="text-[11px] font-extrabold tracking-[0.14em] text-gold-bright uppercase">
                Offshore energy services marketplace
              </p>
              <h1 className="mt-2 font-display text-[clamp(21px,2.4vw,36px)] leading-[1.1] font-bold tracking-[-0.01em] text-white">
                Every service on this quay. One platform.
              </h1>
              <p className="mt-2 text-[clamp(12px,1.05vw,14px)] text-[#B9C8D6]">
                Click the lorry, the ship, the crane — each is a service line.
              </p>
            </div>

            {HOTSPOTS.map((h) => {
              const service = HARBOUR_SERVICES[h.id];
              const { viewBox, art: Art } = HOTSPOT_ART[h.id];
              const selected = sel === h.id;
              const lit = alwaysShowLabels || selected || hover === h.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  className="harbour-hotspot absolute z-[2] flex cursor-pointer items-end border-none bg-transparent p-0 transition-transform duration-200"
                  style={
                    {
                      left: h.left,
                      top: h.top,
                      width: h.width,
                      height: h.height,
                      '--lift': `-${h.hoverLift}px`,
                    } as React.CSSProperties
                  }
                  onClick={() => setSel(selected ? null : h.id)}
                  onMouseEnter={() => setHover(h.id)}
                  onMouseLeave={() => setHover((v) => (v === h.id ? null : v))}
                  onFocus={() => setHover(h.id)}
                  onBlur={() => setHover((v) => (v === h.id ? null : v))}
                  aria-pressed={selected}
                  aria-label={h.ariaLabel}
                  title={h.titleAttr}
                >
                  <span className="relative block w-full">
                    <span
                      className={`pointer-events-none absolute -top-4 left-1/2 z-[3] -translate-x-1/2 rounded-full px-2 py-0.5 text-[10.5px] font-bold whitespace-nowrap shadow-[0_2px_10px_rgba(4,16,31,0.4)] transition-[opacity,background-color] duration-200 sm:px-3 sm:py-1 sm:text-[12.5px] ${
                        selected ? 'bg-gold-bright text-ink' : 'bg-white text-ink'
                      } ${selected ? 'opacity-100' : 'opacity-0'} ${
                        lit ? 'sm:opacity-100' : 'sm:opacity-0'
                      }`}
                    >
                      {service.chipLabel}
                    </span>
                    <svg
                      viewBox={viewBox}
                      preserveAspectRatio="xMidYMax meet"
                      className="block h-auto w-full transition-[filter] duration-[250ms]"
                      style={{
                        filter: selected
                          ? 'drop-shadow(0 0 3px rgba(255,199,44,.95)) drop-shadow(0 8px 22px rgba(255,199,44,.45))'
                          : 'drop-shadow(0 8px 14px rgba(4,16,31,.4))',
                      }}
                      aria-hidden="true"
                    >
                      <Art />
                    </svg>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mx-0.5 mt-2.5 text-[12px] text-ink-soft">
            Proof of concept · illustrative data · original illustration in GAC colours
          </p>
        </div>

        {/* Panel column */}
        <aside className="flex min-w-[280px] flex-[1_1_300px] flex-col gap-3.5" aria-live="polite">
          {!svc ? (
            <>
              <div className="rounded-xl border border-line bg-white p-5 shadow-card">
                <p className="text-[11px] font-extrabold tracking-[0.14em] text-sea uppercase">
                  Six ways in
                </p>
                <h2 className="mt-1.5 text-[17px] font-bold">Tap any part of the harbour</h2>
                <p className="mt-1.5 mb-3 text-[13px] text-ink-soft">
                  Or pick a service line here.
                </p>
                <div className="flex flex-col gap-1.5">
                  {ORDER.map((id) => {
                    const s = HARBOUR_SERVICES[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSel(sel === id ? null : id)}
                        className={`flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] border-[1.5px] bg-white px-3 py-2.5 text-[13.5px] text-ink transition-colors hover:border-sea hover:bg-[#F4F8FB] ${
                          sel === id ? 'border-sea' : 'border-line'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className="h-[9px] w-[9px] shrink-0 rounded-full"
                          style={{ background: s.dot }}
                        />
                        <span className="flex-1 text-left font-bold">{s.label}</span>
                        <span className="text-[11.5px] whitespace-nowrap text-ink-soft">
                          {menuTag(id)}
                        </span>
                        <span aria-hidden="true" className="font-extrabold text-sea">
                          ›
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-xl bg-ink px-5 py-[18px] text-white shadow-card">
                <p className="text-[11px] font-extrabold tracking-[0.14em] text-gold-bright uppercase">
                  Consolidation pays
                </p>
                <p className="mt-2 text-[13px] text-[#B9C8D6]">
                  Agency 2% · Logistics 4% · Customs 7%. All three together is{' '}
                  <strong className="text-white">Full Stack — £35,000 a year back on £500k</strong>{' '}
                  of GAC spend.
                </p>
                <Link
                  to="/app/tiers"
                  className="mt-3 inline-block rounded-lg border-[1.5px] border-white/40 px-3.5 py-2 text-[12.5px] font-bold text-white no-underline transition-colors hover:border-white"
                >
                  Try the tier calculator
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="harbour-panel-fade rounded-xl border-[1.5px] border-sea bg-white p-5 shadow-[0_1px_3px_rgba(10,37,64,0.08),0_6px_20px_rgba(10,37,64,0.12)]">
                <div className="flex items-center justify-between gap-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11.5px] font-bold ${
                      svc.id === 'marketplace'
                        ? 'bg-[#E8F1F7] text-sea'
                        : 'border border-[#E5D89A] bg-gold-soft text-gold-deep'
                    }`}
                  >
                    {svc.tag}
                  </span>
                  <button
                    type="button"
                    onClick={clearSel}
                    aria-label="Close service details"
                    className="cursor-pointer border-none bg-transparent px-1.5 py-0.5 text-[20px] leading-none text-ink-soft"
                  >
                    ×
                  </button>
                </div>
                <h2 className="mt-2.5 font-display text-[21px] font-bold">{svc.title}</h2>
                <p className="mt-2 text-[13.5px] text-ink-soft">{svc.desc}</p>
                <div className="mt-3">
                  {svc.bullets.map((b) => (
                    <div
                      key={b}
                      className="flex gap-2 border-b border-dashed border-line py-[7px] text-[13.5px] last:border-b-0"
                    >
                      <span aria-hidden="true" className="font-extrabold text-success">
                        ✓
                      </span>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <Link
                    to={svc.to}
                    className="rounded-lg bg-sea px-4 py-2.5 text-[13.5px] font-bold text-white no-underline transition-colors hover:bg-[#0B4C70]"
                  >
                    {svc.cta} →
                  </Link>
                  <button
                    type="button"
                    onClick={clearSel}
                    className="cursor-pointer rounded-lg border-[1.5px] border-line-strong bg-white px-4 py-2.5 text-[13.5px] font-bold text-sea transition-colors hover:border-sea"
                  >
                    All services
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-line bg-white px-5 py-4 shadow-card">
                <p className="text-[12.5px] text-ink-soft">{svc.fact}</p>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
