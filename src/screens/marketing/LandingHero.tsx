import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SITE_TAGLINE } from '../../config/brand';
import { Button } from '../../components/ui/Button';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Icon } from '../../components/ui/Icon';
import { landingStats } from '../../lib/landingStats';

/**
 * The landing hero (refresh, 27 Aug).
 *
 * Deliberately the same band the marketplace opens on — dark gradient, gold
 * eyebrow, one white search field, four counters read off the data — so that
 * arriving on the site and arriving in the platform read as one surface rather
 * than a brochure and a product that happen to share a logo.
 *
 * The search box is not a picture: it hands off to the marketplace exactly as
 * the platform's own top bar does, so the first thing anyone types on the site
 * lands them inside it.
 */
export function LandingHero() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const stats = landingStats();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/app/marketplace?q=${encodeURIComponent(term)}` : '/app/marketplace');
  }

  return (
    // The bottom padding carries the platform preview, which pulls up into it.
    <section className="bg-gradient-to-br from-ink to-[#06132B] pt-14 pb-[150px] text-white">
      <div className="mx-auto max-w-[1180px] px-6">
        <Eyebrow dark>Offshore energy services marketplace</Eyebrow>
        <h1 className="mt-2.5 max-w-[760px] font-display text-[clamp(32px,4.4vw,52px)] leading-[1.08] font-bold tracking-[-0.02em]">
          {SITE_TAGLINE}
        </h1>
        <p className="mt-4 max-w-[620px] text-[15.5px] leading-[1.6] text-[#C6D4E2] text-pretty">
          Cranes, medics, launches, haulage, customs clearance — compared and booked against the
          vessel’s clock. GAC’s own lines carry the tier discount; every other supplier has cleared
          the Supplier Vetting System before you see the listing.
        </p>

        <form
          role="search"
          onSubmit={onSubmit}
          className="mt-7 flex flex-wrap items-center gap-3.5"
        >
          <label htmlFor="landing-search" className="sr-only">
            Search services, suppliers, or categories
          </label>
          <div className="relative max-w-[560px] flex-[1_1_420px]">
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
          <Button type="submit" variant="gold">
            Explore the platform
            <Icon name="arrow-right" size={16} />
          </Button>
        </form>

        <ul className="mt-8 flex flex-wrap gap-x-11 gap-y-3.5 text-[13px] text-[#C6D4E2]">
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
      </div>
    </section>
  );
}
