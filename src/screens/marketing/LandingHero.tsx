import { useCallback, useEffect, useState } from 'react';
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
 */
export function LandingHero() {
  const navigate = useNavigate();
  const startTour = useApp((s) => s.startTour);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<ServiceId | null>(null);
  const stats = landingStats();

  const clearSel = useCallback(() => setSel(null), []);

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
    <section className="bg-gradient-to-br from-ink to-[#06132B] pt-11 pb-[150px] text-white">
      <div className="mx-auto max-w-[1280px] px-6">
        {/* The copy leads in the DOM as well as on the page: on a narrow screen
            it stacks first, and a keyboard reaches the headline and the search
            before the six hotspots. */}
        <div className="flex flex-wrap items-stretch gap-8">
          <aside
            aria-live="polite"
            className="flex min-w-[300px] flex-[1_1_380px] animate-[fade-up_0.8s_0.5s_cubic-bezier(0.4,0,0.2,1)_both] flex-col justify-center gap-3.5"
          >
            {sel ? (
              <ServiceDetail id={sel} onClear={clearSel} />
            ) : (
              <>
                <Eyebrow dark>Offshore energy services marketplace</Eyebrow>
                <h1 className="mt-2.5 max-w-[560px] font-display text-[clamp(32px,4.2vw,52px)] leading-[1.06] font-bold tracking-[-0.02em] text-balance">
                  {SITE_TAGLINE}
                </h1>
                <p className="mt-4 max-w-[520px] text-[15.5px] leading-[1.6] text-[#C6D4E2] text-pretty">
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

                <ul className="mt-8 flex flex-wrap gap-x-10 gap-y-3.5 text-[13px] text-[#C6D4E2]">
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

          <div className="min-w-0 flex-[1.5_1_520px]">
            <HarbourScene sel={sel} onSelect={setSel} onClear={clearSel} />
            <p className="mx-0.5 mt-2.5 text-[12px] text-[#8FA3B8]">
              Proof of concept · illustrative data · original illustration in GAC colours. Click the
              lorry, the ship, the crane: each is a service line.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
