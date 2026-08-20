import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RequestQuoteModal } from '../../components/RequestQuoteModal';
import type { RequestTarget } from '../../components/RequestQuoteModal';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { GoldBandPill, Pill, StatusPill } from '../../components/ui/Pill';
import { Rating } from '../../components/ui/Rating';
import { listingFacts, orderThirdParty } from '../../lib/marketplace';
import type { SortKey } from '../../lib/marketplace';
import { deriveStatus, goldBandActive, isBookable } from '../../lib/svs';
import { serviceTermsFor } from '../../data/serviceTerms';
import { CATEGORIES, IN_HOUSE_LINES, SUPPLIERS } from '../../data/suppliers';
import type { Supplier } from '../../data/suppliers';
import { useApp } from '../../store/app';

type EsgFilter = 'all' | 'a' | 'ab';

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
  const facts = listingFacts(supplier);
  const terms = serviceTermsFor(supplier.category);

  return (
    <Card
      variant={supplier.promoted ? 'promoted' : 'default'}
      className="mb-3 flex flex-col justify-between gap-4 sm:flex-row"
    >
      <div>
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
        <p className="mt-1.5 text-[13.5px] text-ink-soft">{supplier.description}</p>
        {facts.length > 0 ? (
          <ul className="mt-1.5 flex flex-wrap gap-1.5" data-testid="listing-facts">
            {facts.map((f) => (
              <li
                key={f.label}
                className="rounded-md border border-line bg-paper px-2 py-0.5 text-[12px] text-ink-soft"
              >
                {f.label} <strong className="text-ink">{f.value}</strong>
              </li>
            ))}
          </ul>
        ) : null}
        {supplier.bookingNote ? (
          <p className="mt-1 text-[12px] text-ink-soft" data-testid="booking-note">
            {supplier.bookingNote}
          </p>
        ) : null}
        {terms ? (
          <p className="mt-1 text-[12px] text-ink-soft" data-testid="service-terms">
            {terms}
          </p>
        ) : null}
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-3.5 text-[13px] text-ink-soft">
          <Rating rating={supplier.rating} count={supplier.ratingCount} size="sm" />
          <span>
            ESG <strong>{supplier.esg}</strong>
          </span>
          <span>{supplier.category}</span>
        </p>
      </div>
      <div className="flex flex-col items-start gap-2 sm:items-end">
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
        <Link
          to={`/app/marketplace/${supplier.id}`}
          className="text-[12.5px] font-semibold text-sea"
        >
          View profile →
        </Link>
      </div>
    </Card>
  );
}

export default function Marketplace() {
  const pushToast = useApp((s) => s.pushToast);
  const [query, setQuery] = useState('');
  // The category lives in the URL (?category=Haulage) so a service line can
  // hand off to the directory already filtered, and the filtered view is a
  // shareable address. An unknown category falls back to All.
  const [params, setParams] = useSearchParams();
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

  const hasPromoted = third.some((s) => s.promoted);
  const hasGoldBand = third.some((s) => goldBandActive(s.goldBand, s.certs));
  const empty = inHouse.length === 0 && third.length === 0;

  return (
    <div className="screen-enter">
      <Eyebrow>Marketplace</Eyebrow>
      <h1 className="mt-1 font-display text-2xl font-bold">Find a service</h1>
      <p className="mt-1 max-w-[680px] text-[14px] text-ink-soft">
        Every listing is vetted through the Supplier Vetting System. GAC’s own service lines appear
        first where relevant; promoted suppliers are always labelled.
      </p>

      {/* Search + controls */}
      <div className="mt-5 flex flex-wrap gap-2.5" data-tour="search">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search services, suppliers, or categories… e.g. crane hire Aberdeen"
          aria-label="Search marketplace"
          className="min-w-[min(420px,100%)] flex-1 rounded-lg border-[1.5px] border-line-strong bg-white px-3.5 py-2.5 text-[14.5px]"
        />
        <label className="flex items-center gap-2 text-[13px] font-semibold text-ink-soft">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="min-h-[44px] rounded-lg border-[1.5px] border-line-strong bg-white px-2.5 py-2 text-[13.5px] font-semibold text-ink"
          >
            <option value="rating">Rating</option>
            <option value="esg">ESG grade</option>
            <option value="name">Name</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-[13px] font-semibold text-ink-soft">
          ESG
          <select
            value={esg}
            onChange={(e) => setEsg(e.target.value as EsgFilter)}
            className="min-h-[44px] rounded-lg border-[1.5px] border-line-strong bg-white px-2.5 py-2 text-[13.5px] font-semibold text-ink"
          >
            <option value="all">All grades</option>
            <option value="ab">A–B only</option>
            <option value="a">A only</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Service categories">
        {CATEGORIES.map((c) => (
          <Chip key={c} pressed={category === c} onClick={() => setCategory(c)}>
            {c}
          </Chip>
        ))}
      </div>

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
            {inHouse.map((line) => (
              <Card
                key={line.id}
                variant="inhouse"
                className="mb-3 flex flex-col justify-between gap-4 sm:flex-row"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-[16px] font-bold">{line.name}</h3>
                    <Pill tone="inhouse">★ GAC In-House</Pill>
                  </div>
                  <p className="mt-1.5 text-[13.5px] text-ink-soft">{line.description}</p>
                  <p className="mt-1.5 text-[13px] font-bold text-gold-deep">{line.tierLabel}</p>
                </div>
                <div className="flex items-start">
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

      <RequestQuoteModal target={target} onClose={() => setTarget(null)} />
    </div>
  );
}
