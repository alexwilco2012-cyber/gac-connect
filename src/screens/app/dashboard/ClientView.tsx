import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PillarsRoof } from '../../../components/motif/PillarsRoof';
import { ButtonLink } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { CardHeader } from '../../../components/ui/CardHeader';
import { Icon, type IconName } from '../../../components/ui/Icon';
import { Pill } from '../../../components/ui/Pill';
import { isCleared } from '../../../lib/customs';
import { gbp } from '../../../lib/format';
import { daysLeft, invoiceState, windowLabel } from '../../../lib/invoices';
import { isConsignmentDelivered } from '../../../lib/logistics';
import { useNeedsYou, type NeedsYouItem } from '../../../lib/needsYou';
import { annualSaving, isFullStack, tierPct } from '../../../lib/tier';
import { DEMO_CLIENT } from '../../../data/desk';
import { INVOICES } from '../../../data/invoices';
import { QUOTES } from '../../../data/quotes';
import { VESSELS } from '../../../data/vessels';
import { useApp } from '../../../store/app';
import { useCustoms } from '../../../store/customs';
import { useLogistics } from '../../../store/logistics';
import { LatestFromGac } from './client/LatestFromGac';
import { PortCalls } from './client/PortCalls';
import { QuickActions } from './client/QuickActions';
import { SpendChart } from './client/SpendChart';

/**
 * The dashboard's client view — what the demo client sees (26 Aug; moved out
 * of Dashboard.tsx unchanged on 23 Sep so the client and supplier views can
 * grow apart without one file carrying both).
 *
 * A client arrives asking "where is my work, and what is waiting on me". The
 * consolidation card leads with the one number that matters; everything else
 * supports it. Commission is a supplier mechanism, so nothing on this view
 * may mention it (03 §3.2 — swept by e2e, hidden panels included).
 *
 * Counts come from the live stores, not from prose: book a consignment and the
 * Logistics row moves while you watch.
 *
 * Live dashboards (23 Sep; spec §2): under the lead row, "Start something",
 * then the work on the left (port calls milestone by milestone, six months of
 * GAC spend, the lines) and the client's side on the right (what waits on
 * them, what has moved since yesterday). The spend chart and the feed follow
 * the pillars in the consolidation card. The new widgets live in `./client/`;
 * the consolidation card, the side stats and the two row types stay here,
 * unchanged, because the tour and the tests stand on them.
 */

/** One column split for every row, so card edges line up down the page. */
const COLUMNS = 'grid items-start gap-5 lg:grid-cols-[1.6fr_minmax(280px,1fr)]';

/**
 * A supporting number: label, figure, and one pill saying what it is about.
 *
 * Deliberately smaller than `StatCard` — 22px against the consolidation card's
 * 44px. The screen has one number that matters, and a row of equal-weight tiles
 * beside it is how it stopped having one.
 */
function SideStat({
  label,
  value,
  chip,
  tone = 'info',
}: {
  label: string;
  value: string;
  chip: string;
  tone?: 'info' | 'warn';
}) {
  return (
    <Card className="px-[22px] py-[18px]">
      <p className="text-[12px] text-ink-soft">{label}</p>
      <div className="flex items-baseline justify-between gap-3">
        <p className="mt-0.5 font-display text-[22px] font-bold">{value}</p>
        <Pill tone={tone}>{chip}</Pill>
      </div>
    </Card>
  );
}

/** One row of the "waiting on you" feed — the same hook the bell reads. */
function FeedRow({ item }: { item: NeedsYouItem }) {
  const clear = item.count === 0 && !item.actionable;
  return (
    <li
      data-testid={`client-feed-${item.id}`}
      className="flex items-start gap-3 border-b border-dashed border-line-strong py-3 first:pt-0 last:border-b-0 last:pb-0"
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
          clear ? 'bg-success-soft text-success' : 'bg-sea-soft text-sea'
        }`}
      >
        <Icon name={clear ? 'circle-check' : item.icon} size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px]">
          <Link
            to={item.to}
            className="font-semibold text-ink no-underline transition-colors hover:text-sea"
            aria-label={`${item.headline} — ${item.cta}`}
          >
            {item.headline}
            <Icon name="chevron-right" size={14} className="mb-px ml-0.5 inline" />
          </Link>
        </p>
        <p className="mt-0.5 text-[12.5px] text-ink-soft">{item.detail}</p>
        {item.chip ? (
          <p className="mt-1.5">
            <Pill tone={item.chip.tone}>{item.chip.label}</Pill>
          </p>
        ) : null}
      </div>
    </li>
  );
}

/**
 * A service line with whatever the client currently has running on it.
 *
 * A line the client has not consolidated goes grey rather than disappearing:
 * the point of the row is that the line exists and is empty, and the detail
 * says what adding it is worth on the tier ladder.
 */
function LineRow({
  to,
  icon,
  name,
  count,
  detail,
  on = true,
}: {
  to: string;
  icon: IconName;
  name: string;
  count: number;
  detail: string;
  on?: boolean;
}) {
  return (
    <li className="border-b border-dashed border-line-strong last:border-b-0">
      <Link
        to={to}
        className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 no-underline transition-colors hover:bg-sea-soft"
      >
        <span
          aria-hidden="true"
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors duration-[350ms] ${
            on ? 'bg-sea-soft text-sea' : 'bg-[#F1F4F8] text-[#8FA3B8]'
          }`}
        >
          <Icon name={icon} size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-ink">{name}</span>
          <span className="block text-[12.5px] text-ink-soft">{detail}</span>
        </span>
        <span
          className={`grid h-7 min-w-7 place-items-center rounded-full px-2 text-[12.5px] font-bold ${
            count > 0 ? 'bg-ink text-white' : 'bg-paper text-ink-soft'
          }`}
        >
          {count}
        </span>
      </Link>
    </li>
  );
}

/**
 * The consolidation card — the screen's one big number, and the only control
 * on it.
 *
 * It was a read-only summary in the right-hand column, which made the tier
 * something the client is told rather than something they can see the shape of.
 * The three pillars are switches now: hold Customs and the roof turns gold and
 * the number goes to 7; drop Logistics and it falls to 2 rather than 6, because
 * the ladder is non-cumulative and the motif ought to be able to demonstrate
 * that rather than assert it (03 §3.1).
 *
 * The arithmetic stays in `lib/tier`. This is the same illustrative selection
 * the Tier Calculator writes, so a demonstrator who changes it here finds the
 * calculator agreeing when they open it.
 */
function ConsolidationCard() {
  const tier = useApp((s) => s.tier);
  const spend = useApp((s) => s.spend);
  const toggleTierService = useApp((s) => s.toggleTierService);

  const pct = tierPct(tier);
  const fullStack = isFullStack(tier);
  const saving = annualSaving(spend, tier);

  // One spark at the apex the moment Full Stack is reached — not on every
  // render that happens to find it already there.
  const [glints, setGlints] = useState(0);
  const wasFull = useRef(fullStack);
  useEffect(() => {
    if (fullStack && !wasFull.current) setGlints((n) => n + 1);
    wasFull.current = fullStack;
  }, [fullStack]);

  const hint = fullStack
    ? 'All three lines held: Full Stack.'
    : tier.customs && !tier.logistics
      ? 'Customs alone does not reach 7%: the ladder runs Agency, then Logistics, then Customs.'
      : 'Reach Customs and the roof turns gold.';

  return (
    <Card
      data-tour="consolidation"
      variant={fullStack ? 'inhouse' : 'default'}
      className="transition-colors duration-[400ms]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        {/* Both halves are allowed to shrink, so the motif sits beside the
            number at full width and drops under it only when it must. */}
        <div className="min-w-0 flex-[1_1_240px]">
          <p className="text-[12px] text-ink-soft">Tier discount held · {DEMO_CLIENT} · live</p>
          <p
            key={pct}
            data-testid="dashboard-tier-pct"
            className={`mt-0.5 animate-[pop_0.35s_ease] font-display text-[44px] leading-none font-bold tracking-[-0.02em] transition-colors duration-[400ms] ${
              fullStack ? 'text-gold-deep' : 'text-ink'
            }`}
          >
            {pct}%
          </p>
          <p className="mt-2 text-[12.5px] text-ink-soft">
            est. <strong className="text-ink">{gbp(saving)}</strong> saved this year on {gbp(spend)}{' '}
            GAC service spend
          </p>
          {fullStack ? (
            <p className="mt-2.5">
              <Pill tone="inhouse">★ Full Stack client</Pill>
            </p>
          ) : null}
        </div>

        <div className="max-w-[320px] flex-[1_1_260px]">
          <PillarsRoof
            pillars={[
              { label: 'Agency', on: tier.agency, onToggle: () => toggleTierService('agency') },
              {
                label: 'Logistics',
                on: tier.logistics,
                onToggle: () => toggleTierService('logistics'),
              },
              { label: 'Customs', on: tier.customs, onToggle: () => toggleTierService('customs') },
              // Included at any tier, so never a switch.
              { label: 'Procurement', on: true },
            ]}
            fullStack={fullStack}
            glint={glints > 0 && fullStack ? 'glint .7s ease-out both' : undefined}
            className="w-full overflow-visible"
          />
          <p className="mt-1.5 text-center text-[12px] text-ink-soft">
            Tap a pillar to add or remove a line. {hint}
          </p>
        </div>
      </div>

      <div className="my-3.5 h-px bg-line" />
      <p className="text-[12.5px] text-ink-soft">
        The tier is non-cumulative: you hold the highest single tier you qualify for. Procurement
        and Assets are included at any tier.{' '}
        <Link to="/app/tiers" className="font-semibold text-sea">
          Open the tier calculator
        </Link>
        .
      </p>
    </Card>
  );
}

export function ClientView() {
  const tier = useApp((s) => s.tier);
  const invoiceDecisions = useApp((s) => s.invoiceDecisions);
  const consignments = useLogistics((s) => s.consignments);
  const declarations = useCustoms((s) => s.declarations);
  const feed = useNeedsYou();

  const awaiting = INVOICES.filter(
    (inv) => invoiceState(inv.receivedDaysAgo, invoiceDecisions[inv.id]) === 'awaiting',
  );
  const tightest = awaiting.reduce<number | null>(
    (acc, inv) =>
      acc === null || daysLeft(inv.receivedDaysAgo) < daysLeft(acc) ? inv.receivedDaysAgo : acc,
    null,
  );
  const moving = consignments.filter((c) => !isConsignmentDelivered(c.stage)).length;
  const clearing = declarations.filter((d) => !isCleared(d.stage)).length;

  return (
    <>
      {/* One number leads and the consolidation is the thing you can touch;
          everything else on the row supports it. */}
      <div className={`mt-6 ${COLUMNS}`}>
        <ConsolidationCard />
        <div className="grid gap-3">
          <SideStat
            label="Port calls in the window"
            value={String(VESSELS.length)}
            chip="Aberdeen and Peterhead"
          />
          <SideStat
            label="Quotes to compare"
            value={String(QUOTES.length)}
            chip="Crane hire · MV Choice"
          />
          <SideStat
            label="Invoices in your window"
            value={String(awaiting.length)}
            chip={tightest === null ? 'All matched' : windowLabel(tightest)}
            tone={tightest !== null && daysLeft(tightest) <= 2 ? 'warn' : 'info'}
          />
        </div>
      </div>

      <div className="mt-5">
        <QuickActions />
      </div>

      {/* Left: the work itself — calls, spend, lines. Right: what needs the
          client, then what has moved. Same column split as the lead row, so
          the edges line up all the way down. Flex gap, not space-y: the
          spend chart's figure carries m-0, which would cancel the margin. */}
      <div className={`mt-5 ${COLUMNS}`}>
        <div className="flex min-w-0 flex-col gap-5">
          <PortCalls />
          <SpendChart />

          <Card>
            <CardHeader
              title="Your work, line by line"
              subtitle="What GAC has running for you right now — open a line to see it in full"
              action={
                <ButtonLink to="/app/marketplace" variant="ghost">
                  Find a service
                </ButtonLink>
              }
            />
            <ul role="list" className="mt-2 list-none" data-testid="client-lines">
              <LineRow
                to="/app/agency"
                icon="anchor"
                name="Agency"
                on={tier.agency}
                count={tier.agency ? VESSELS.length : 0}
                detail={
                  tier.agency
                    ? 'Port calls, berths and crew change'
                    : 'Not consolidated. Add Agency to reach the 2% tier'
                }
              />
              <LineRow
                to="/app/logistics"
                icon="truck"
                name="Logistics"
                on={tier.logistics}
                count={tier.logistics ? moving : 0}
                detail={
                  !tier.logistics
                    ? 'Not consolidated. Add Logistics to reach the 4% tier'
                    : moving === 0
                      ? 'Nothing in transit — book a movement'
                      : 'Consignments on their way to the quay'
                }
              />
              <LineRow
                to="/app/customs"
                icon="stamp"
                name="Customs"
                on={tier.customs}
                count={tier.customs ? clearing : 0}
                detail={
                  !tier.customs
                    ? 'Not consolidated. Customs is the 7% pillar'
                    : clearing === 0
                      ? 'No declarations open'
                      : 'Declarations working through to clearance'
                }
              />
              <LineRow
                to="/app/procurement"
                icon="clipboard-list"
                name="Procurement"
                count={1}
                detail="One list ready to send to Compass"
              />
            </ul>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader
              title="Waiting on you"
              subtitle="Ordered by deadline · the bell reads the same list"
            />
            <ul role="list" className="mt-3 list-none">
              {feed.map((item) => (
                <FeedRow key={item.id} item={item} />
              ))}
            </ul>
          </Card>

          <LatestFromGac />

          {/* What was a card of its own is a footnote now: true, and worth
              saying, but not worth a card's weight beside live work. */}
          <p
            data-testid="client-costs-nothing"
            className="flex gap-2.5 px-1 text-[12.5px] leading-relaxed text-ink-soft"
          >
            <Icon name="shield-check" size={16} className="mt-0.5 shrink-0 text-sea" />
            <span>
              The platform costs you nothing: no booking fee, no subscription, nothing per quote.
              Every supplier you can see has passed the{' '}
              <Link to="/app/svs" className="font-semibold text-sea">
                Supplier Vetting System
              </Link>
              .
            </span>
          </p>
        </div>
      </div>
    </>
  );
}
