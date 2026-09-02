import { useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { RequestQuoteModal } from '../../components/RequestQuoteModal';
import type { RequestTarget } from '../../components/RequestQuoteModal';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Icon, type IconName } from '../../components/ui/Icon';
import { GoldBandPill, Pill, StatusPill } from '../../components/ui/Pill';
import { Rating } from '../../components/ui/Rating';
import { categoryCounts, orderThirdParty } from '../../lib/marketplace';
import type { SortKey } from '../../lib/marketplace';
import { deriveStatus, goldBandActive, isBookable } from '../../lib/svs';
import { ESG_PLANNED_NOTE } from '../../data/related';
import { CATEGORIES, IN_HOUSE_LINES, SUPPLIERS } from '../../data/suppliers';
import type { Supplier } from '../../data/suppliers';
import { useApp } from '../../store/app';

type EsgFilter = 'all' | 'a' | 'ab';

/**
 * The marketplace — the platform's front door since 26 Aug.
 *
 * `/app` opens here, so this screen is now the first thing a client, a supplier
 * or a panel member sees: it has to say what the platform is before it says what
 * it can filter. Hence the hero band, the trust counters read off the data, and
 * the category tiles — a directory should look like a place you browse, not a
 * report you were handed.
 *
 * The rules underneath are unchanged and still the point: in-house lines pin
 * first with the gold marque, promoted placement is always labelled, and a
 * supplier with lapsed paperwork stays visible but unbookable. The tiles and
 * the filter chips both set `?category=`, so the category is still one
 * shareable address rather than two views of the same state.
 */

/**
 * In-house lines that now have a hub of their own. The directory entry opens
 * the line rather than firing a request into the void — GAC Assets is the one
 * line with no hub, so it keeps the "engage service" action.
 */
const IN_HOUSE_ROUTE: Record<string, { to: string; label: string } | undefined> = {
  'gac-agency': { to: '/app/agency', label: 'Open Agency' },
  'gac-logistics': { to: '/app/logistics', label: 'Open Logistics' },
  'gac-customs': { to: '/app/customs', label: 'Open Customs' },
  'gac-procurement': { to: '/app/procurement', label: 'Send a list to Compass' },
};

/** Line icons, matching the sidebar so a line looks the same wherever it appears. */
const IN_HOUSE_ICON: Record<string, IconName> = {
  'gac-agency': 'anchor',
  'gac-logistics': 'truck',
  'gac-customs': 'stamp',
  'gac-procurement': 'clipboard-list',
};

/**
 * Two initials, for a supplier or a category tile.
 *
 * The tiles used to carry icons, which meant one lorry glyph standing for
 * Haulage, Taxis and Waste at once — three different things wearing the same
 * badge. A monogram says "category" and lets the word do the naming.
 */
function monogram(name: string): string {
  const words = name
    .replace(/[^A-Za-z ]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length > 1) return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase();
  return name.slice(0, 2).toUpperCase() || '·';
}

/**
 * One supplier, cut to what a client scans for: who, whether they can be
 * booked, how they rate, and the button.
 *
 * Fact chips, booking notes, hire terms and the ESG grade moved to the profile
 * (2 Sep). Nine rows each carrying five sub-lists is a directory you read
 * rather than scan, and the detail was competing with the one decision the row
 * exists to support — open the profile, or ask for a price.
 */
function SupplierRow({
  supplier,
  onRequest,
}: {
  supplier: Supplier;
  onRequest: (target: RequestTarget) => void;
}) {
  const status = deriveStatus(supplier.certs);
  const bookable = isBookable(supplier.certs);
  const goldBand = goldBandActive(supplier.goldBand, supplier.certs);

  return (
    <Card
      variant={supplier.promoted ? 'promoted' : 'default'}
      className={`mb-2.5 flex flex-wrap items-center gap-3.5 px-5 py-4 transition-shadow hover:shadow-[0_8px_28px_rgba(10,37,64,0.09)] ${
        bookable ? '' : 'opacity-75'
      }`}
    >
      <span
        aria-hidden="true"
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-brand font-display text-[15px] font-bold ${
          supplier.promoted ? 'bg-promoted-soft text-promoted' : 'bg-sea-soft text-sea'
        }`}
      >
        {monogram(supplier.name)}
      </span>

      <div className="min-w-0 flex-[1_1_260px]">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-[16px] font-bold">
            <Link
              to={`/app/marketplace/${supplier.id}`}
              className="text-ink no-underline hover:text-sea hover:underline"
            >
              {supplier.name}
            </Link>
          </h3>
          {supplier.promoted ? <Pill tone="promoted">▲ Promoted</Pill> : null}
          {goldBand ? <GoldBandPill /> : null}
          <StatusPill status={status} />
        </div>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-3.5 text-[13px] text-ink-soft">
          <Rating rating={supplier.rating} count={supplier.ratingCount} size="sm" />
          <span>{supplier.category}</span>
          <span>{supplier.description}</span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link
          to={`/app/marketplace/${supplier.id}`}
          className="text-[12.5px] font-semibold text-sea"
        >
          Profile
        </Link>
        {bookable ? (
          <Button
            variant="ghost"
            onClick={() => onRequest({ supplierName: supplier.name, category: supplier.category })}
          >
            Request quote
          </Button>
        ) : (
          <Button variant="ghost" disabled title="Blocked by SVS — compliance evidence required">
            Unavailable
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function Marketplace() {
  const pushToast = useApp((s) => s.pushToast);
  // The category lives in the URL (?category=Haulage) so a service line can
  // hand off to the directory already filtered, and the filtered view is a
  // shareable address. An unknown category falls back to All.
  const [params, setParams] = useSearchParams();
  // The top-bar search hands off through ?q=. One-way: the param seeds the
  // box, typing stays local — the box never writes the URL back. Keyed on
  // location.key, not the param value, so re-submitting the same term from
  // the top bar still reseeds (every navigation mints a new key). Adjusted
  // during render (the React "state from props" pattern), not in an effect.
  const location = useLocation();
  const qParam = params.get('q');
  const [query, setQuery] = useState(qParam ?? '');
  const [prevKey, setPrevKey] = useState(location.key);
  if (location.key !== prevKey) {
    setPrevKey(location.key);
    if (qParam !== null) setQuery(qParam);
  }
  const requested = params.get('category');
  const category: string = (CATEGORIES as readonly string[]).includes(requested ?? '')
    ? requested!
    : 'All';
  const setCategory = (c: string) => {
    const next = new URLSearchParams(params);
    if (c === 'All') next.delete('category');
    else next.set('category', c);
    setParams(next, { replace: true });
  };
  /** Drop whatever is narrowing the list — category, typed term, or both —
   *  and put the browse tiles back. */
  const clearFilter = () => {
    setQuery('');
    setCategory('All');
  };
  const [sort, setSort] = useState<SortKey>('rating');
  const [esg, setEsg] = useState<EsgFilter>('all');
  const [target, setTarget] = useState<RequestTarget | null>(null);

  const q = query.trim().toLowerCase();

  const inHouse = useMemo(() => {
    // In-house lines sit outside the ESG-graded marketplace and pin to 'All'.
    if (esg !== 'all' || category !== 'All') return [];
    return IN_HOUSE_LINES.filter(
      (l) => !q || `${l.name} ${l.description}`.toLowerCase().includes(q),
    );
  }, [q, category, esg]);

  const third = useMemo(() => {
    const matchesEsg = (s: Supplier) =>
      esg === 'all' ? true : esg === 'a' ? s.esg === 'A' : s.esg !== 'C';
    const filtered = SUPPLIERS.filter((s) => {
      const inCat = category === 'All' || s.category === category;
      const inQ = !q || `${s.name} ${s.description} ${s.category}`.toLowerCase().includes(q);
      return inCat && inQ && matchesEsg(s);
    });
    return orderThirdParty(filtered, sort);
  }, [q, category, sort, esg]);

  const counts = useMemo(() => categoryCounts(SUPPLIERS, CATEGORIES), []);

  const hasPromoted = third.some((s) => s.promoted);
  const hasGoldBand = third.some((s) => goldBandActive(s.goldBand, s.certs));
  const empty = inHouse.length === 0 && third.length === 0;
  // The tiles are the browse path, not a second filter bar: once the visitor
  // has picked a category or typed a search they are past browsing, and the
  // chips above the results carry the state from there.
  const browsing = category === 'All' && q === '';

  return (
    <div className="screen-enter">
      {/* The band, not a hero (2 Sep). A visitor who has reached this screen
          has already been sold to on the landing page or has arrived from the
          QR; what they want here is the search box, so it sits on the same
          line as the name of the place rather than under a paragraph and four
          counters repeating what the front page just said. */}
      <section className="-mx-4 -mt-7 mb-6 bg-gradient-to-br from-ink to-[#06132B] px-4 py-6 text-white sm:-mx-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
          <div>
            <Eyebrow dark>The Offshore Marketplace</Eyebrow>
            <h1 className="mt-1 font-display text-[22px] leading-[1.15] font-bold">
              Every service on the quay, vetted before you see it
            </h1>
          </div>

          <div className="max-w-[520px] flex-[1_1_320px]" data-tour="search">
            <label htmlFor="marketplace-search" className="sr-only">
              Search marketplace
            </label>
            <div className="relative">
              <Icon
                name="search"
                size={18}
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-soft"
              />
              <input
                id="marketplace-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search services, suppliers, or categories… e.g. crane hire Aberdeen"
                aria-label="Search marketplace"
                className="min-h-12 w-full rounded-xl border-none bg-white px-4 py-3 pl-11 text-[14.5px] text-ink shadow-[0_10px_30px_rgba(0,0,0,0.22)] placeholder:text-ink-soft"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Browse by category — the tiles are a way in, so they only stand in
          front of the default view. */}
      {browsing ? (
        <section className="mb-7">
          <h2 className="font-display text-[15.5px] font-bold">Browse by category</h2>
          <ul
            className="mt-3 grid list-none grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4"
            data-testid="category-tiles"
          >
            {counts.map((c) => (
              <li key={c.category}>
                <button
                  type="button"
                  aria-label={`Browse ${c.category}`}
                  onClick={() => setCategory(c.category)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-brand border border-line bg-white p-3.5 text-left transition-colors hover:border-sea hover:bg-sea-soft"
                >
                  <span
                    aria-hidden="true"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sea-soft font-display text-[13px] font-bold text-sea"
                  >
                    {monogram(c.category)}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-bold text-ink">{c.category}</span>
                    <span className="block text-[12px] text-ink-soft">
                      {c.count} {c.count === 1 ? 'supplier' : 'suppliers'}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Filters — the state the results are actually showing. The filter is
          one chip beside the controls rather than a row of every category:
          the tiles above are the browse path, and once you are past them what
          matters is what you picked and how to drop it. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
        <h2 className="font-display text-[15.5px] font-bold">
          {browsing ? 'All services' : category === 'All' ? 'Search results' : category}
        </h2>
        <div className="flex flex-wrap items-center gap-2.5">
          {browsing ? null : (
            <button
              type="button"
              onClick={clearFilter}
              aria-label={`Clear the ${category === 'All' ? query.trim() : category} filter`}
              className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-ink px-3 py-1 text-[12.5px] font-bold text-white"
            >
              <span aria-hidden="true">
                {category === 'All' ? `“${query.trim()}”` : category} ×
              </span>
            </button>
          )}
          <label className="flex items-center gap-2 text-[13px] font-semibold text-ink-soft">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="min-h-10 rounded-lg border-[1.5px] border-line-strong bg-white px-2.5 py-1.5 text-[13.5px] font-semibold text-ink"
            >
              <option value="rating">Rating</option>
              <option value="esg">ESG grade (planned)</option>
              <option value="name">Name</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-[13px] font-semibold text-ink-soft">
            ESG (planned)
            <select
              value={esg}
              onChange={(e) => setEsg(e.target.value as EsgFilter)}
              className="min-h-10 rounded-lg border-[1.5px] border-line-strong bg-white px-2.5 py-1.5 text-[13.5px] font-semibold text-ink"
            >
              <option value="all">All grades</option>
              <option value="ab">A–B only</option>
              <option value="a">A only</option>
            </select>
          </label>
        </div>
      </div>

      <p className="mt-2 text-[12px] text-ink-soft">{ESG_PLANNED_NOTE}</p>

      {hasGoldBand ? (
        <p className="mt-3 text-[12px] text-ink-soft">
          ◆ Gold Band = GAC’s enhanced annual audit, earned by Premium suppliers — advertising
          cannot confer it.
        </p>
      ) : null}

      {/* Results */}
      <div className="mt-6">
        {inHouse.length > 0 ? (
          <>
            <p className="mb-2.5 text-[11px] font-extrabold tracking-[0.14em] text-gold-deep uppercase">
              GAC in-house — premium listings
            </p>
            <div className="mb-3 grid gap-3 lg:grid-cols-2">
              {inHouse.map((line) => (
                <Card key={line.id} variant="inhouse" className="flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold-soft text-gold-deep"
                      >
                        <Icon name={IN_HOUSE_ICON[line.id] ?? 'layers'} size={17} />
                      </span>
                      <h3 className="font-display text-[16px] font-bold">{line.name}</h3>
                      <Pill tone="inhouse">★ GAC In-House</Pill>
                    </div>
                    <p className="mt-2 text-[13.5px] text-ink-soft">{line.description}</p>
                    <p className="mt-1.5 text-[13px] font-bold text-gold-deep">{line.tierLabel}</p>
                  </div>
                  <div className="mt-3.5 flex items-start">
                    {IN_HOUSE_ROUTE[line.id] ? (
                      // The line has a hub of its own — open it rather than
                      // raising a request the client cannot see afterwards.
                      <ButtonLink to={IN_HOUSE_ROUTE[line.id]!.to} variant="gold">
                        {IN_HOUSE_ROUTE[line.id]!.label}
                      </ButtonLink>
                    ) : (
                      <Button
                        variant="gold"
                        onClick={() =>
                          pushToast(
                            'Request sent to your GAC agent — surfaced inside the existing relationship, not a new queue.',
                          )
                        }
                      >
                        Engage service
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </>
        ) : null}

        {third.length > 0 ? (
          <>
            <p
              className={`mb-2.5 text-[11px] font-extrabold tracking-[0.14em] text-sea uppercase ${
                inHouse.length ? 'mt-6' : ''
              }`}
            >
              Vetted marketplace suppliers
              {hasPromoted ? (
                <span className="ml-2 text-[10.5px] font-bold tracking-[0.06em] text-[#6C6191]">
                  includes promoted placement
                </span>
              ) : null}
            </p>
            {third.map((s) => (
              <SupplierRow key={s.id} supplier={s} onRequest={setTarget} />
            ))}
          </>
        ) : null}

        {empty ? (
          <Card className="mt-4 text-center">
            <h2 className="font-display text-[18px] font-bold">No suppliers match that search</h2>
            <p className="mx-auto mt-2 max-w-[460px] text-[14px] text-ink-soft">
              The marketplace grows supplier by supplier. If you work with a company that should be
              listed, invite them — verification is free and the SVS checklist takes one afternoon.
            </p>
            <div className="mt-4 flex justify-center">
              <ButtonLink to="/for-suppliers" variant="primary">
                Invite a supplier
              </ButtonLink>
            </div>
          </Card>
        ) : null}
      </div>

      {/* Closing band — the other side of a marketplace is supply. */}
      {empty ? null : (
        <Card className="mt-7 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-[15.5px] font-bold">Missing a supplier you use?</h2>
            <p className="mt-1 max-w-[560px] text-[13px] text-ink-soft">
              Verification is free and the SVS checklist takes an afternoon. A marketplace is only
              as good as the companies in it.
            </p>
          </div>
          <ButtonLink to="/for-suppliers" variant="ghost">
            Invite a supplier
          </ButtonLink>
        </Card>
      )}

      <RequestQuoteModal target={target} onClose={() => setTarget(null)} />
    </div>
  );
}
