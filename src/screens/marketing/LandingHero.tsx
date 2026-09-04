import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SITE_TAGLINE } from '../../config/brand';
import { Button } from '../../components/ui/Button';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Icon } from '../../components/ui/Icon';
import { landingStats } from '../../lib/landingStats';
import { useApp } from '../../store/app';
import { TOUR_STEPS } from '../../tour/steps';
import { HarbourScene, ServiceDetail } from './harbour/HarbourScene';
import type { ServiceId } from './harbour/services';

/**
 * The landing hero (refresh, 2 Sep): the copy on the left, the working quay on
 * the right, in one ink band.
 *
 * The page used to open on a tour bar, then a headline, then — much further
 * down — an illustration nobody had a reason to reach. Putting the scene beside
 * the headline makes the first screen both halves of the offer at once: what
 * the platform is, and something to touch. The harbour assembles itself on
 * arrival for the same reason, and then holds still.
 *
 * The copy column doubles as the harbour's panel. Selecting a hotspot swaps the
 * headline, search and counters for that service's detail card; closing it — ×,
 * "All services", Escape, or a click on the water — puts them back. One column
 * rather than a third one nobody looks at, and `aria-live` announces the swap.
 *
 * That only holds while the two columns sit side by side. Once the page stacks
 * (below `lg`), the copy is a screen or more above the harbour, so swapping it
 * is a tap that visibly does nothing. Stacked, the headline stays put and the
 * detail card opens directly under the scene, scrolled into view.
 */

/** Matches Tailwind's `lg`: the point at which the hero goes side by side. */
const SIDE_BY_SIDE = '(min-width: 1024px)';

function useStacked() {
  const [stacked, setStacked] = useState(
    () => typeof window !== 'undefined' && !window.matchMedia(SIDE_BY_SIDE).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(SIDE_BY_SIDE);
    const on = () => setStacked(!mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return stacked;
}

export function LandingHero() {
  const navigate = useNavigate();
  const startTour = useApp((s) => s.startTour);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<ServiceId | null>(null);
  const stats = landingStats();
  const stacked = useStacked();
  const detailRef = useRef<HTMLDivElement>(null);

  const clearSel = useCallback(() => setSel(null), []);

  // Stacked, the card lands under a scene the reader is already looking at,
  // so it opens below the fold. Snap the page so the card sits just under the
  // sticky header. The offset is computed rather than left to scrollIntoView,
  // which on a phone was landing the card anywhere from half-hidden to past.
  useEffect(() => {
    if (!sel || !stacked) return;
    const frame = requestAnimationFrame(() => {
      const card = detailRef.current;
      if (!card) return;
      const header = document.querySelector('header');
      const headerH = header ? header.getBoundingClientRect().height : 0;
      const top = card.getBoundingClientRect().top + window.scrollY - headerH - 12;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, [sel, stacked]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSel(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/app/marketplace?q=${encodeURIComponent(term)}` : '/app/marketplace');
  }

  return (
    // The 150px foot carries the platform preview, which pulls up into it.
    <section className="bg-gradient-to-br from-ink to-[#06132B] pt-8 pb-[150px] text-white lg:pt-11">
      <div className="mx-auto max-w-[1280px] px-6">
        {/* The copy leads in the DOM as well as on the page: on a narrow screen
            it stacks first, and a keyboard reaches the headline and the search
            before the six hotspots. The stacking point is explicit (`lg`) so
            the layout and `useStacked` cannot disagree about where it is. */}
        <div className="flex flex-col items-stretch gap-8 lg:flex-row">
          <aside
            aria-live="polite"
            className="flex min-w-0 animate-[fade-up_0.8s_0.5s_cubic-bezier(0.4,0,0.2,1)_both] flex-col justify-center gap-3.5 lg:flex-[1_1_380px]"
          >
            {sel && !stacked ? (
              <ServiceDetail id={sel} onClear={clearSel} />
            ) : (
              <>
                <Eyebrow dark>Offshore energy services marketplace</Eyebrow>
                <h1 className="mt-2.5 max-w-[560px] font-display text-[clamp(32px,4.2vw,52px)] leading-[1.06] font-bold tracking-[-0.02em] text-balance">
                  {SITE_TAGLINE}
                </h1>
                <p className="mt-3 max-w-[520px] text-[15px] leading-[1.6] text-[#C6D4E2] text-pretty lg:mt-4 lg:text-[15.5px]">
                  Cranes, medics, launches, haulage, customs clearance, compared and booked against
                  the vessel’s clock. GAC’s own lines carry the tier discount; every other supplier
                  has cleared the Supplier Vetting System before you see the listing.
                </p>

                <form
                  role="search"
                  onSubmit={onSubmit}
                  className="mt-6 flex flex-wrap items-center gap-3"
                >
                  <label htmlFor="landing-search" className="sr-only">
                    Search services, suppliers, or categories
                  </label>
                  <div className="relative max-w-[520px] flex-[1_1_300px]">
                    <Icon
                      name="search"
                      size={18}
                      className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-soft"
                    />
                    <input
                      id="landing-search"
                      type="search"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search services, suppliers, or categories… e.g. crane hire Aberdeen"
                      className="min-h-[52px] w-full rounded-brand border-none bg-white px-4 py-3 pl-11 text-[15px] text-ink shadow-[0_10px_30px_rgba(0,0,0,0.22)] placeholder:text-ink-soft"
                    />
                  </div>
                  <Button type="submit" variant="gold" className="min-h-[52px]">
                    Explore the platform
                    <Icon name="arrow-right" size={16} />
                  </Button>
                </form>

                {/* The tour invitation the bar above the hero used to carry.
                    Still above the fold, which is the rule that mattered. */}
                <p className="mt-3.5 text-[13px] text-[#C6D4E2]">
                  First time here?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      startTour();
                      navigate(TOUR_STEPS[0]!.route);
                    }}
                    className="cursor-pointer border-none bg-transparent p-0 font-bold text-white underline underline-offset-[3px] hover:text-gold-bright"
                  >
                    Take the {TOUR_STEPS.length}-stop guided tour
                  </button>
                  , a port call from the vessel arriving to the invoice being matched.
                </p>

                <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-[13px] text-[#C6D4E2] lg:mt-8 lg:gap-x-10 lg:gap-y-3.5">
                  {stats.map((s) => (
                    <li key={s.label}>
                      <strong
                        className={`block font-display text-[22px] font-bold ${
                          s.inHouse ? 'text-gold-bright' : 'text-white'
                        }`}
                      >
                        {s.value}
                      </strong>
                      {s.label}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </aside>

          <div className="min-w-0 lg:flex-[1.5_1_520px]">
            <HarbourScene sel={sel} onSelect={setSel} onClear={clearSel} />
            {/* Stacked, the detail card belongs here, under the thing that was
                tapped; the headline above stays where it was. */}
            <div ref={detailRef} aria-live="polite" className="lg:hidden">
              {sel && stacked ? (
                <div className="mt-4 flex flex-col gap-3.5">
                  <ServiceDetail id={sel} onClear={clearSel} />
                </div>
              ) : null}
            </div>
            <p className="mx-0.5 mt-2.5 text-[12px] text-[#8FA3B8]">
              Proof of concept · illustrative data · original illustration in GAC colours.{' '}
              <span className="lg:hidden">Tap</span>
              <span className="hidden lg:inline">Click</span> the lorry, the ship, the crane: each
              is a service line.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
