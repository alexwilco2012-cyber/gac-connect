import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PillarsRoof } from '../../components/motif/PillarsRoof';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { CardHeader } from '../../components/ui/CardHeader';
import { CertChip } from '../../components/ui/CertChip';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Icon, type IconName } from '../../components/ui/Icon';
import { GoldBandPill, Pill, StatusPill } from '../../components/ui/Pill';
import { Rating } from '../../components/ui/Rating';
import { StatCard } from '../../components/ui/StatCard';
import { commissionPct, supplierKeeps } from '../../lib/commission';
import { isTerminalStage } from '../../lib/crewChange';
import { isCleared } from '../../lib/customs';
import { gbp } from '../../lib/format';
import { daysLeft, invoiceState, windowLabel } from '../../lib/invoices';
import { isConsignmentDelivered } from '../../lib/logistics';
import { useNeedsYou, type NeedsYouItem } from '../../lib/needsYou';
import { deriveStatus, goldBandActive } from '../../lib/svs';
import { annualSaving, isFullStack, tierPct } from '../../lib/tier';
import { INVOICES } from '../../data/invoices';
import { ANALYTICS_EXAMPLE, planById, SPARKLINE_30D } from '../../data/plans';
import { QUOTES } from '../../data/quotes';
import { supplierById } from '../../data/suppliers';
import { VESSELS } from '../../data/vessels';
import { useApp, type DashboardView } from '../../store/app';
import { useCrewChange } from '../../store/crewChange';
import { useCustoms } from '../../store/customs';
import { useLogistics } from '../../store/logistics';

/**
 * Dashboard — the client's and the supplier's view of the platform (26 Aug).
 *
 * The platform is a marketplace first and a workflow second, so `/app` opens on
 * the marketplace and this screen answers the question the two paying sides
 * actually arrive with: a client asks "where is my work, and what is waiting on
 * me"; a supplier asks "am I being found, and does my paperwork still hold".
 * The agent's working desk — predictive procurement, the 48-hour strip, the
 * Outlook add-in — moved to Internal, where the people it was written for work.
 *
 * One screen, two views, because the platform runs on a single demo persona and
 * a switch shows a panel both sides without inventing a login. The commercial
 * guardrail rides along with the split: commission is a supplier mechanism, so
 * the plan card exists only in the supplier view and the client view never
 * mentions it (03 §3.2 — tested, as it is on Invoices and Quotes).
 *
 * Counts come from the live stores, not from prose: book a consignment and the
 * Logistics row moves while you watch.
 */

/** The demo supplier whose side of the platform the supplier view shows. */
const DEMO_SUPPLIER_ID = 'silver-city-welding';

/** The demo client. Fictional operator, like everything else here (03 §3.4). */
const DEMO_CLIENT = 'Browne Energy';

/** The job value the supplier's keep-more example is worked on — the crane
 *  quote the rest of the demo settles on, so the two figures agree. */
const EXAMPLE_JOB_GBP = 4400;

/** Quote requests sitting in the demo supplier's inbox. Illustrative, like
 *  everything else on the platform. */
const SUPPLIER_INBOX = [
  {
    id: 'req-4471',
    service: 'Onboard pipework repair',
    vessel: 'MV Granite Coast',
    detail: 'Coded welder, two days alongside Regent Quay',
    replyBy: 'Reply by 16:00 today',
    tone: 'warn' as const,
  },
  {
    id: 'req-4478',
    service: 'Fabrication — skid frames',
    vessel: 'Wilkinson Drilling mobilisation',
    detail: 'Three frames to drawing, delivered to the GAC warehouse',
    replyBy: 'Reply by Friday 12:00',
    tone: 'info' as const,
  },
];

function ViewSwitch({
  view,
  onChange,
}: {
  view: DashboardView;
  onChange: (v: DashboardView) => void;
}) {
  const options: { id: DashboardView; label: string; icon: IconName }[] = [
    { id: 'client', label: 'Client view', icon: 'ship' },
    { id: 'supplier', label: 'Supplier view', icon: 'store' },
  ];
  return (
    <div
      role="group"
      aria-label="Dashboard view"
      data-testid="dashboard-view-switch"
      className="inline-flex rounded-lg border-[1.5px] border-line-strong bg-white p-1"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={view === o.id}
          onClick={() => onChange(o.id)}
          className={`inline-flex min-h-[38px] cursor-pointer items-center gap-2 rounded-md border-none px-3.5 py-1.5 text-[13px] font-bold transition-colors ${
            view === o.id ? 'bg-ink text-white' : 'bg-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <Icon name={o.icon} size={15} />
          {o.label}
        </button>
      ))}
    </div>
  );
}

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

function ClientView() {
  const tier = useApp((s) => s.tier);
  const invoiceDecisions = useApp((s) => s.invoiceDecisions);
  const consignments = useLogistics((s) => s.consignments);
  const declarations = useCustoms((s) => s.declarations);
  const crewRequests = useCrewChange((s) => s.requests);
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
  const letters = crewRequests.filter((r) => !isTerminalStage(r.kind, r.stage)).length;

  return (
    <>
      {/* One number leads and the consolidation is the thing you can touch;
          everything else on the row supports it. */}
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[1.6fr_minmax(280px,1fr)]">
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
            chip="Crane hire · MV Caledonian Star"
          />
          <SideStat
            label="Invoices in your window"
            value={String(awaiting.length)}
            chip={tightest === null ? 'All matched' : windowLabel(tightest)}
            tone={tightest !== null && daysLeft(tightest) <= 2 ? 'warn' : 'info'}
          />
        </div>
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
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

          <Card>
            <CardHeader
              title="Your vessels"
              subtitle="Every call GAC is handling for you, and where each one stands"
            />
            <ul role="list" className="mt-2 list-none">
              {VESSELS.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-dashed border-line-strong py-3 last:border-b-0"
                >
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold">{v.name}</span>
                    <span className="block text-[12.5px] text-ink-soft">{v.scheduleLine}</span>
                  </span>
                  <Pill tone={v.statusPill.tone === 'success' ? 'verified' : v.statusPill.tone}>
                    {v.statusPill.label}
                  </Pill>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12.5px] text-ink-soft">
              Crew joining or leaving on any of these?{' '}
              <Link to="/app/agency/crew-change" className="font-semibold text-sea">
                Open crew change
              </Link>{' '}
              — hotels, taxis timed off the flight, launches, and the letters.
              {letters > 0 ? ` ${letters} in progress.` : ''}
            </p>
          </Card>
        </div>

        <div className="space-y-5">
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

          <Card>
            <CardHeader
              title="The platform costs you nothing"
              subtitle="No booking fee, no subscription, nothing per quote"
            />
            <p className="mt-2.5 text-[13px] text-ink-soft">
              Clients pay for the services they buy and nothing for the platform that finds them.
              Every supplier you can see has passed the{' '}
              <Link to="/app/svs" className="font-semibold text-sea">
                Supplier Vetting System
              </Link>
              , and one with lapsed paperwork cannot be booked at any price.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}

function SupplierView() {
  const pushToast = useApp((s) => s.pushToast);
  const supplier = supplierById(DEMO_SUPPLIER_ID)!;
  const plan = planById(supplier.plan);
  const status = deriveStatus(supplier.certs);
  const goldBand = goldBandActive(supplier.goldBand, supplier.certs);
  const band = commissionPct(supplier.plan);

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ANALYTICS_EXAMPLE.map((a, i) => (
          <StatCard
            key={a.label}
            label={a.label}
            value={a.value}
            barPct={a.barPct}
            series={i === 1 ? SPARKLINE_30D : undefined}
          />
        ))}
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Requests waiting on you"
              subtitle="Answer inside the window and the client compares you side by side"
              action={<Pill tone="info">{SUPPLIER_INBOX.length} open</Pill>}
            />
            <ul role="list" className="mt-2 list-none" data-testid="supplier-inbox">
              {SUPPLIER_INBOX.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5 border-b border-dashed border-line-strong py-3.5 last:border-b-0"
                >
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold">{r.service}</span>
                    <span className="block text-[12.5px] text-ink-soft">
                      {r.vessel} · {r.detail}
                    </span>
                    <span className="mt-1.5 block">
                      <Pill tone={r.tone}>{r.replyBy}</Pill>
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      pushToast(
                        `Quote sent for ${r.service} — ${r.vessel}. It lands in the client’s comparison view beside every other reply.`,
                      )
                    }
                  >
                    Send a quote
                  </Button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12.5px] text-ink-soft">
              Replies sent as ordinary Outlook emails are parsed into the same comparison — you do
              not have to work inside the platform to win work through it.
            </p>
          </Card>

          <Card>
            <CardHeader
              title="How your listing reads"
              subtitle="What a client sees when your category comes up"
              action={
                <ButtonLink to={`/app/marketplace/${supplier.id}`} variant="ghost">
                  View profile
                </ButtonLink>
              }
            />
            <div className="mt-3 rounded-brand border border-line bg-paper p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-[16px] font-bold">{supplier.name}</h3>
                {supplier.promoted ? <Pill tone="promoted">▲ Promoted</Pill> : null}
                {goldBand ? <GoldBandPill /> : null}
                <StatusPill status={status} />
              </div>
              <p className="mt-1.5 text-[13.5px] text-ink-soft">{supplier.description}</p>
              <p className="mt-1.5 flex flex-wrap items-baseline gap-x-3.5 text-[13px] text-ink-soft">
                <Rating rating={supplier.rating} count={supplier.ratingCount} size="sm" />
                <span>{supplier.category}</span>
              </p>
            </div>
            {supplier.goldBand === 'scheduled' ? (
              <p className="mt-3 text-[12.5px] text-ink-soft">
                {supplier.goldBandDate}. The Gold Band is earned at the audit and never bought — it
                appears here the day it is passed, and goes the day compliance lapses.
              </p>
            ) : null}
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Compliance vault"
              subtitle="The gate: a lapse blocks booking everywhere, immediately"
              action={<StatusPill status={status} />}
            />
            <div className="mt-3 -ml-0.5">
              {supplier.certs.map((c) => (
                <CertChip key={c.name} cert={c} />
              ))}
            </div>
            <p className="mt-3 text-[12.5px] text-ink-soft">
              Alerts fire at 90, 30 and 7 days before expiry. No plan, promotion or rating overrides
              it — the rule is set out in the{' '}
              <Link to="/app/svs" className="font-semibold text-sea">
                Supplier Vetting System
              </Link>
              .
            </p>
          </Card>

          <Card data-testid="supplier-plan">
            <CardHeader
              title="Your plan"
              subtitle={`${plan.name} · ${plan.priceLine} ${plan.perLine}`}
              action={<Pill tone="neutral">{band}% commission</Pill>}
            />
            <p className="mt-2.5 text-[13px] text-ink-soft">
              Commission applies only to third-party work won through the platform, and comes off
              when your invoice matches in GAC Agent. Nothing is collected separately, and nothing
              is charged to the client.
            </p>
            <div className="mt-3 rounded-lg border border-line bg-paper p-3.5">
              <p className="text-[12.5px] text-ink-soft">
                A {gbp(EXAMPLE_JOB_GBP)} job won through the platform
              </p>
              <p className="mt-0.5 font-display text-[26px] font-bold" data-testid="supplier-keeps">
                {gbp(supplierKeeps(EXAMPLE_JOB_GBP, supplier.plan))}
              </p>
              <p className="text-[12.5px] text-ink-soft">
                yours, after the {band}% {plan.name} band
              </p>
            </div>
            <p className="mt-3 text-[12.5px] text-ink-soft">
              Commit more and you keep more of each job: the bands are 20 / 15 / 10 across Basic,
              Professional and Premium.
            </p>
          </Card>

          <Card>
            <CardHeader
              title="Where the work comes from"
              subtitle="Views, requests, win rate and response time"
            />
            <p className="mt-2.5 text-[13px] text-ink-soft">
              Full analytics with market benchmarking come with Professional and Premium.
            </p>
            <div className="mt-3.5">
              <ButtonLink to="/app/analytics" variant="ghost">
                Open analytics
              </ButtonLink>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  const view = useApp((s) => s.dashboardView);
  const setView = useApp((s) => s.setDashboardView);
  const client = view === 'client';

  return (
    <div className="screen-enter">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow>{client ? 'Client dashboard' : 'Supplier dashboard'}</Eyebrow>
          <h1 className="mt-1 font-display text-2xl font-bold">
            {client ? DEMO_CLIENT : supplierById(DEMO_SUPPLIER_ID)!.name}
          </h1>
          <p className="mt-1 max-w-[620px] text-[14px] text-ink-soft">
            {client
              ? 'Everything GAC has running for you, and everything waiting on you. The platform itself costs you nothing.'
              : 'How you are being found, what is waiting for a quote, and whether your paperwork still holds.'}
          </p>
        </div>
        <ViewSwitch view={view} onChange={setView} />
      </div>

      {client ? <ClientView /> : <SupplierView />}
    </div>
  );
}
