import { Link } from 'react-router-dom';
import {
  HOTSPOT_ART,
  HOTSPOT_CHIP_BELOW,
  HOTSPOT_CHIP_DELAY,
  HOTSPOT_ENTRANCE,
  SceneBackground,
} from './HarbourArt';
import { HARBOUR_SERVICES, HOTSPOTS } from './services';
import type { ServiceId } from './services';

/**
 * The night-harbour scene, where every element is a service-line hotspot.
 *
 * Selection is owned by whoever renders it (the landing hero), because the
 * hero's copy column *is* the panel: picking a hotspot swaps the headline and
 * search for the service detail below, and closing it puts the copy back. Two
 * components sharing one piece of state have to agree on where it lives, and
 * the column that changes is not this one.
 */
export function HarbourScene({
  sel,
  onSelect,
  onClear,
}: {
  sel: ServiceId | null;
  onSelect: (id: ServiceId) => void;
  onClear: () => void;
}) {
  // On a phone the scene runs edge to edge and sits nearer square: inset in a
  // 430px-tall card it was mostly empty sky, with the whole quay crammed into
  // the bottom third at thumbnail size. The art is width-limited, so a
  // shorter box costs it nothing and the bleed gains it a sixth.
  return (
    <div className="relative -mx-6 h-[clamp(360px,54vw,760px)] animate-[scene-in_0.9s_ease_both] overflow-hidden bg-[#040C1D] shadow-[0_1px_3px_rgba(10,37,64,0.12),0_10px_30px_rgba(10,37,64,0.14)] sm:mx-0 sm:w-full sm:rounded-2xl">
      <SceneBackground onClear={onClear} />

      {HOTSPOTS.map((h) => {
        const service = HARBOUR_SERVICES[h.id];
        const { viewBox, art: Art } = HOTSPOT_ART[h.id];
        const selected = sel === h.id;
        return (
          <button
            key={h.id}
            type="button"
            // The before: pseudo pads the tap target 8px past the art below sm;
            // the customs booth is a 40px-wide button on a phone without it.
            className="harbour-hotspot absolute z-[2] flex cursor-pointer items-end border-none bg-transparent p-0 transition-transform duration-200 before:absolute before:-inset-2 before:content-[''] sm:before:inset-0"
            style={
              {
                left: h.left,
                top: h.top,
                width: h.width,
                height: h.height,
                '--lift': `-${h.hoverLift}px`,
              } as React.CSSProperties
            }
            onClick={() => (selected ? onClear() : onSelect(h.id))}
            aria-pressed={selected}
            aria-label={h.ariaLabel}
            title={h.titleAttr}
          >
            {/* The entrance goes on the inner span so it never fights the
                hover lift, which lives on the button itself. */}
            <span className="relative block w-full" style={{ animation: HOTSPOT_ENTRANCE[h.id] }}>
              {/* Below sm the chips would cover the scene they label, so only
                  the selected one shows; from sm up they all do. The booth and
                  the warehouse stand under the vessel's berth, so their chips
                  sit below them on the road rather than over her hull. */}
              <span
                className={`pointer-events-none absolute left-1/2 z-[3] -translate-x-1/2 rounded-full px-2 py-0.5 text-[10.5px] font-bold whitespace-nowrap text-ink opacity-0 shadow-[0_2px_10px_rgba(4,16,31,0.4)] transition-[background-color] duration-200 sm:px-3 sm:py-1 sm:text-[12.5px] ${
                  HOTSPOT_CHIP_BELOW.has(h.id) ? '-bottom-3.5' : '-top-4'
                } ${selected ? 'block bg-gold-bright' : 'hidden bg-white sm:block'}`}
                style={{ animation: `fade-in .5s ${HOTSPOT_CHIP_DELAY[h.id]} ease forwards` }}
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
  );
}

/**
 * What a selected hotspot puts in the copy column: the service, what it covers,
 * where it opens, and one fact underneath.
 *
 * Both cards set `text-ink` explicitly. They sit on the hero's ink band, which
 * paints its children white — without it the card is white text on white paper.
 */
export function ServiceDetail({ id, onClear }: { id: ServiceId; onClear: () => void }) {
  const svc = HARBOUR_SERVICES[id];

  return (
    <>
      <div className="harbour-panel-fade rounded-xl border-[1.5px] border-sea bg-white p-5 text-ink shadow-[0_1px_3px_rgba(10,37,64,0.08),0_6px_20px_rgba(10,37,64,0.12)]">
        <div className="flex items-center justify-between gap-2.5">
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11.5px] font-bold whitespace-nowrap ${
              svc.id === 'marketplace'
                ? 'bg-sea-soft text-sea'
                : 'border border-[#E5D89A] bg-gold-soft text-gold-deep'
            }`}
          >
            {svc.tag}
          </span>
          <button
            type="button"
            onClick={onClear}
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
            onClick={onClear}
            className="cursor-pointer rounded-lg border-[1.5px] border-line-strong bg-white px-4 py-2.5 text-[13.5px] font-bold text-sea transition-colors hover:border-sea"
          >
            All services
          </button>
        </div>
      </div>
      <div className="rounded-xl border border-line bg-white px-5 py-4 text-ink shadow-card">
        <p className="text-[12.5px] text-ink-soft">{svc.fact}</p>
      </div>
    </>
  );
}
