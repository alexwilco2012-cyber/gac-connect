import { BRAND_NAME, POC_RIBBON } from '../../config/brand';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Wordmark } from '../../components/layout/Wordmark';
import { landingStats } from '../../lib/landingStats';
import { categoryCounts } from '../../lib/marketplace';
import { CATEGORIES, SUPPLIERS } from '../../data/suppliers';

/**
 * A picture of the running platform, for the landing page.
 *
 * The site used to describe the product and then ask you to take its word for
 * it. This renders the real thing — the ink sidebar, the light top bar, the
 * marketplace band and the browse tiles — at true size, so the first screen
 * shows what you get. It is a *render*, not the app: nothing here is wired,
 * and the whole block is one `role="img"` so a screen reader is offered one
 * description instead of a second, dead copy of the platform's navigation.
 *
 * It stays honest by construction: the counters come from `landingStats()` and
 * the tiles from `categoryCounts()`, the same functions the marketplace hero
 * calls. Nothing on it is typed out by hand.
 */

const NAV_GROUPS: { heading?: string; items: { label: string; icon: IconName }[] }[] = [
  {
    items: [
      { label: 'Marketplace', icon: 'store' },
      { label: 'Dashboard', icon: 'layout-dashboard' },
    ],
  },
  {
    heading: 'Service lines',
    items: [
      { label: 'Agency', icon: 'anchor' },
      { label: 'Logistics', icon: 'truck' },
      { label: 'Customs', icon: 'stamp' },
      { label: 'Procurement', icon: 'clipboard-list' },
    ],
  },
  {
    heading: 'Work',
    items: [
      { label: 'Quotes', icon: 'message-square-quote' },
      { label: 'Invoices', icon: 'receipt' },
    ],
  },
  {
    heading: 'Commercial',
    items: [
      { label: 'SVS', icon: 'shield-check' },
      { label: 'Tiers', icon: 'layers' },
    ],
  },
];

/** Tile icons, matching the marketplace's own map so a category looks the
 *  same wherever it appears. */
const CATEGORY_ICON: Record<string, IconName> = {
  Cranes: 'layers',
  FLT: 'truck',
  Launches: 'ship',
  Taxis: 'truck',
  Haulage: 'truck',
  Medical: 'shield-check',
  Scaffolding: 'layers',
  Diving: 'anchor',
  NDT: 'file-check',
  Welding: 'briefcase',
  Catering: 'store',
  Hotels: 'briefcase',
  Waste: 'truck',
  Bunkers: 'ship',
};

export function PlatformPreview() {
  const stats = landingStats();
  // Eight is what fits two rows at this width — the marketplace shows all of
  // them, and the caption below the frame says so.
  const tiles = categoryCounts(SUPPLIERS, CATEGORIES).slice(0, 8);

  return (
    <div
      role="img"
      aria-label={`The ${BRAND_NAME} marketplace: a navigation sidebar of service lines, a search bar, and a directory of vetted suppliers to browse by category.`}
      className="overflow-hidden rounded-2xl border border-line-strong bg-white shadow-[0_24px_60px_rgba(10,37,64,0.22),0_2px_6px_rgba(10,37,64,0.08)]"
    >
      <div className="border-b border-[#EADFB4] bg-gold-soft px-3 py-1.5 text-center text-[12.5px] font-semibold tracking-[0.02em] text-gold-deep">
        {POC_RIBBON}
      </div>

      <div className="flex items-stretch">
        {/* Sidebar — hidden below lg, exactly as the real shell hides it */}
        <div className="hidden w-[232px] shrink-0 flex-col bg-gradient-to-b from-ink to-[#06132B] pb-4 text-white lg:flex">
          <div className="flex h-[58px] items-center px-4.5">
            <Wordmark />
          </div>
          <div className="px-2.5 pt-2">
            {NAV_GROUPS.map((group, gi) => (
              <div key={group.heading ?? 'pinned'}>
                {group.heading ? (
                  <p className="mt-5 mb-1.5 px-3 text-[10.5px] font-bold tracking-[0.14em] text-white/[0.62] uppercase">
                    {group.heading}
                  </p>
                ) : null}
                {group.items.map((item, ii) => (
                  <div
                    key={item.label}
                    className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold ${
                      gi === 0 && ii === 0
                        ? 'bg-white/10 text-white shadow-[inset_3px_0_0_var(--gold)]'
                        : 'text-[#B9C8D6]'
                    }`}
                  >
                    <Icon name={item.icon} size={18} className="shrink-0" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            ))}
            {/* The agent desk, pinned below a rule and out of the client's
                reading path — the shell's own arrangement. */}
            <div className="mt-6">
              <div className="mx-2 mb-2 h-px bg-white/10" />
              <p className="mb-1.5 px-3 text-[10.5px] font-bold tracking-[0.14em] text-white/[0.62] uppercase">
                GAC only
              </p>
              <div className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold text-[#B9C8D6]">
                <Icon name="briefcase" size={18} className="shrink-0" />
                <span>Internal</span>
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 bg-paper">
          <div className="flex h-[58px] items-center gap-2.5 border-b border-line bg-white px-4 sm:px-6">
            <span className="text-ink-soft lg:hidden">
              <Icon name="menu" size={20} />
            </span>
            <span className="lg:hidden">
              <Wordmark dark={false} />
            </span>
            <div className="relative hidden md:block">
              <Icon
                name="search"
                size={15}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft"
              />
              <div className="flex min-h-[44px] w-[min(320px,26vw)] items-center rounded-lg border-[1.5px] border-line-strong bg-paper pr-3 pl-9 text-[13px] text-ink-soft">
                Search suppliers and services
              </div>
            </div>
            <div className="flex-1" />
            <span className="relative text-ink-soft">
              <Icon name="bell" size={19} />
              <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-warn px-1 text-[10px] font-bold text-white">
                4
              </span>
            </span>
            <span className="hidden text-[13px] text-ink-soft xl:inline">
              A. Wilkinson · Aberdeen Agency
            </span>
            <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-sea-soft text-[12.5px] font-bold text-sea">
              AW
            </span>
          </div>

          <div className="bg-gradient-to-br from-ink to-[#06132B] px-4 py-9 text-white sm:px-8 sm:py-11">
            <p className="text-[11px] font-extrabold tracking-[0.14em] text-gold-bright uppercase">
              The Offshore Marketplace
            </p>
            <p className="mt-2 max-w-[640px] font-display text-[clamp(20px,2.6vw,34px)] leading-[1.15] font-bold">
              Every service on the quay, vetted before you see it
            </p>
            <p className="mt-2.5 max-w-[600px] text-[14.5px] text-[#C6D4E2]">
              Cranes, medics, launches, scaffolding, welding, catering — found, compared and booked
              in one place.
            </p>
            <div className="relative mt-6 max-w-[620px]">
              <Icon
                name="search"
                size={18}
                className="absolute top-1/2 left-4 -translate-y-1/2 text-ink-soft"
              />
              <div className="flex min-h-[52px] items-center rounded-brand bg-white px-4 py-3 pl-11 text-[15px] text-ink-soft shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
                Search services, suppliers, or categories…
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3.5 text-[13px] text-[#C6D4E2]">
              {stats.map((s) => (
                <div key={s.label}>
                  <span
                    className={`block font-display text-[22px] font-bold ${
                      s.inHouse ? 'text-gold-bright' : 'text-white'
                    }`}
                  >
                    {s.value}
                  </span>
                  {s.label}
                </div>
              ))}
            </div>
          </div>

          <div className="px-4 pt-7 pb-8 sm:px-6">
            <p className="font-display text-[15.5px] font-bold">Browse by category</p>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {tiles.map((c) => (
                <div
                  key={c.category}
                  className="flex items-center gap-3 rounded-brand border border-line bg-white p-3.5"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sea-soft text-sea">
                    <Icon name={CATEGORY_ICON[c.category] ?? 'store'} size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-bold text-ink">{c.category}</span>
                    <span className="block text-[12px] text-ink-soft">
                      {c.count} {c.count === 1 ? 'supplier' : 'suppliers'}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-6 mb-2.5 text-[11px] font-extrabold tracking-[0.14em] text-gold-deep uppercase">
              GAC in-house — premium listings
            </p>
            <div className="rounded-brand border-[1.5px] border-gold bg-gradient-to-b from-[#FFFDF4] to-white p-[22px] shadow-card">
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold-soft text-gold-deep">
                  <Icon name="anchor" size={17} />
                </span>
                <span className="font-display text-[16px] font-bold">GAC Agency</span>
                <span className="inline-flex items-center rounded-full border border-[#E5D89A] bg-gold-soft px-2.5 py-0.5 text-[11.5px] font-bold tracking-[0.02em] text-gold-deep">
                  ★ GAC In-House
                </span>
              </div>
              <p className="mt-2 text-[13.5px] text-ink-soft">
                Ship’s agent services, port calls, vessel support, crew coordination — your single
                point of contact.
              </p>
              <p className="mt-1.5 text-[13px] font-bold text-gold-deep">2% tier</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
