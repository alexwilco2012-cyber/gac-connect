import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PillarsRoof } from '../../components/motif/PillarsRoof';
import { VesselAtQuay } from '../../components/motif/VesselAtQuay';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { CardHeader } from '../../components/ui/CardHeader';
import { Drawer } from '../../components/ui/Drawer';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Icon } from '../../components/ui/Icon';
import { Pill } from '../../components/ui/Pill';
import { PortCallTimeline } from '../../components/ui/PortCallTimeline';
import { gbp } from '../../lib/format';
import { useNeedsYou, type NeedsYouItem } from '../../lib/needsYou';
import {
  DEFAULT_REPLY_WINDOW,
  deadlineAdvice,
  REPLY_WINDOWS,
  replyWindowById,
} from '../../lib/requests';
import { annualSaving, isFullStack, tierPct } from '../../lib/tier';
import { CATEGORY_SERVICE, relatedServicesFor } from '../../data/related';
import { DASHBOARD_KPIS, PREDICTED_NEEDS, VESSELS } from '../../data/vessels';
import { useApp } from '../../store/app';

/**
 * Internal — the GAC agent desk (26 Aug; rebuilt to the 5 Sep design handoff).
 *
 * This screen was the platform's front door until the owner's call that GAC
 * Connect is a marketplace first and a workflow second: a client or a supplier
 * opening the platform wants to find and be found, not read someone else's
 * work queue. So the marketplace took `/app`, the Dashboard became the client
 * and supplier view, and this — the predictive procurement run, the 48-hour
 * strip, the Outlook add-in, the consolidation widget — moved to its own tab at
 * the foot of the sidebar, where the people it was actually written for work.
 *
 * What the agent sees at 08:00: what is arriving, what needs them, and the one
 * action the demo turns on — issuing MV Elan's predicted procurement list. The
 * vessel hero is the screen's centre of gravity, and the vessel in it is the
 * same lit drawing the deck follows in.
 *
 * The `dashboard-*` testids stay as they are: e2e and shared deep links still
 * expect them, and renaming them would prove nothing.
 */

/** Cross-sell hint for a predicted need — the medical example: transfer and hotel. */
function relatedHint(service: string): string | null {
  const category = Object.keys(CATEGORY_SERVICE).find((c) => CATEGORY_SERVICE[c] === service);
  const related = category ? relatedServicesFor(category) : [];
  if (related.length === 0) return null;
  return `+ ${related.map((r) => r.label.toLowerCase()).join(' · ')} suggested`;
}

/** The three status cards this feed replaced carried these testids; e2e and
 *  deep links still expect them on the rows. */
const ROW_TESTID: Partial<Record<NeedsYouItem['id'], string>> = {
  invoices: 'dashboard-invoices',
  letters: 'dashboard-crew',
};

/** The icon tile takes the row's tone: red once a supplier is blocked, amber
 *  for a closing window, sea for everything that is simply waiting. */
function tileTone(item: NeedsYouItem, clear: boolean): string {
  if (clear) return 'bg-success-soft text-success';
  if (item.chip?.tone === 'danger') return 'bg-danger-soft text-danger';
  if (item.chip?.tone === 'warn') return 'bg-warn-soft text-warn';
  return 'bg-sea-soft text-sea';
}

function NeedsYouRow({ item }: { item: NeedsYouItem }) {
  const clear = item.count === 0 && !item.actionable;
  return (
    <li
      data-testid={ROW_TESTID[item.id]}
      data-tour={item.id === 'compliance' ? 'compliance' : undefined}
      className="flex items-start gap-3 border-b border-dashed border-line-strong py-3 first:pt-0 last:border-b-0 last:pb-0"
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tileTone(item, clear)}`}
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
        {item.id === 'letters' ? (
          <p className="mt-1.5 flex flex-wrap gap-x-3.5 gap-y-1 text-[12.5px]">
            <Link
              to="/app/agency/crew-change?section=taxis"
              data-testid="dashboard-taxis"
              className="font-semibold text-sea"
            >
              Plan taxis
            </Link>
            <Link
              to="/app/agency/crew-change?section=launches"
              data-testid="dashboard-launches"
              className="font-semibold text-sea"
            >
              Book a launch
            </Link>
          </p>
        ) : null}
        {item.chip ? (
          <p className="mt-1.5">
            <Pill tone={item.chip.tone}>
              {item.chip.tone === 'danger' ? '✗ ' : ''}
              {item.chip.label}
            </Pill>
          </p>
        ) : item.id === 'letters' ? (
          <p className="mt-1.5">
            <Pill tone="info">Letters · LOI, never OKTB</Pill>
          </p>
        ) : null}
      </div>
    </li>
  );
}

export default function Internal() {
  const navigate = useNavigate();
  const pushToast = useApp((s) => s.pushToast);
  const tier = useApp((s) => s.tier);
  const spend = useApp((s) => s.spend);
  const needsYou = useNeedsYou();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [replyWindowId, setReplyWindowId] = useState(DEFAULT_REPLY_WINDOW);

  const pct = tierPct(tier);
  const fullStack = isFullStack(tier);
  const saving = annualSaving(spend, tier);

  function sendQuoteRequests() {
    const window_ = replyWindowById(replyWindowId);
    const short = deadlineAdvice(window_.hours).tone === 'warn';
    pushToast(
      `9 quote requests issued for MV Elan · reply-by window ${window_.label}. Replies will populate the comparison view automatically.${
        short ? ' Short windows rarely draw a full set of replies.' : ''
      }`,
    );
    navigate('/app/quotes');
  }

  return (
    <div className="screen-enter">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Internal · Thursday · Aberdeen</Eyebrow>
          <h1 className="mt-0.5 font-display text-[28px] font-bold tracking-[-0.015em]">
            Morning, agent
          </h1>
          <p className="mt-1 text-[14.5px] text-ink-soft">
            2 vessels arriving tomorrow.{' '}
            <Link
              to="/app/procurement"
              className="font-semibold text-sea"
              data-testid="dashboard-procurement-link"
            >
              1 procurement list ready to send
            </Link>
            .
          </p>
          <p className="mt-1.5 text-[12.5px] text-ink-soft">
            The GAC desk view — the working queue behind the client’s marketplace. Clients and
            suppliers see their own{' '}
            <Link to="/app/dashboard" className="font-semibold text-sea">
              dashboard
            </Link>
            , not this one.
          </p>
        </div>
        <Button variant="ghost" onClick={() => setDrawerOpen(true)}>
          Open Outlook add-in preview
        </Button>
      </div>

      {/* Stat row — one bordered card, four cells. The inset shadows draw the
          cell rules, and the -1px margin keeps a wrapped 2×2 clean. */}
      <div
        className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] overflow-hidden rounded-brand border border-line bg-white shadow-card"
        data-tour="kpis"
      >
        {DASHBOARD_KPIS.map((k) => (
          <div
            key={k.label}
            className="-mb-px px-[22px] py-[18px] shadow-[inset_-1px_0_0_#E5EAF1,inset_0_-1px_0_#E5EAF1]"
          >
            <p className="text-[12px] text-ink-soft">{k.label}</p>
            <p className="mt-1 font-display text-[32px] leading-[1.1] font-bold tracking-[-0.02em]">
              {k.value}
            </p>
            <p className="mt-1.5">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-[11.5px] font-bold whitespace-nowrap ${
                  k.deltaTone === 'info' ? 'bg-sea-soft text-sea' : 'bg-success-soft text-success'
                }`}
              >
                {k.delta}
              </span>
            </p>
          </div>
        ))}
      </div>

      {/* Vessel hero — the predicted list on the left, the vessel herself on
          the night quay to the right. Collapses to one column below lg. */}
      <div
        className="mt-[18px] grid overflow-hidden rounded-brand border border-[#CFE2EE] bg-gradient-to-b from-sea-soft to-white to-[62%] shadow-card lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.62fr)]"
        data-tour="predictive"
      >
        <div className="min-w-0 px-6 py-[22px]">
          <div className="flex flex-wrap items-center gap-2.5">
            <Eyebrow>Predictive procurement · from GAC Agent history</Eyebrow>
            <span className="inline-flex items-center rounded-full border border-[#CFE2EE] bg-white px-2.5 py-[3px] text-[11.5px] font-bold text-sea">
              GAC Agent vessel profile loaded
            </span>
          </div>
          <h2 className="mt-2 font-display text-[24px] font-bold tracking-[-0.015em]">
            MV Elan — Aberdeen, ETA 08:00 tomorrow
          </h2>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            Regent Quay · Browne Energy / Grizzell Marine, 60/40 · what she typically needs on an
            Aberdeen call, with SVS-verified suppliers pre-selected for each.
          </p>
          <ul role="list" className="mt-3.5">
            {PREDICTED_NEEDS.map((n) => {
              const hint = relatedHint(n.service);
              return (
                <li
                  key={n.service}
                  className="flex items-center justify-between gap-3 border-b border-dashed border-line-strong py-2.5 text-[15px] last:border-b-0"
                >
                  <span>
                    <strong>{n.service}</strong> · {n.matched} suppliers matched
                    {hint ? (
                      <span
                        className="ml-2 text-[12px] font-semibold text-sea"
                        data-testid="related-hint"
                      >
                        {hint}
                      </span>
                    ) : null}
                  </span>
                  <Pill tone="verified">✓ GAC Verified</Pill>
                </li>
              );
            })}
          </ul>
          <div className="mt-3.5 flex flex-wrap items-center gap-3.5">
            <Button onClick={sendQuoteRequests}>Send 9 quote requests</Button>
            <label className="flex items-center gap-2 text-[13px] font-semibold text-ink-soft">
              Reply-by
              <select
                value={replyWindowId}
                onChange={(e) => setReplyWindowId(e.target.value)}
                aria-label="Reply-by window"
                className="min-h-[44px] rounded-lg border-[1.5px] border-line-strong bg-white px-2.5 py-2 text-[13.5px] font-semibold text-ink"
              >
                {REPLY_WINDOWS.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label}
                  </option>
                ))}
              </select>
            </label>
            <span className="text-[12.5px] text-ink-soft">
              3 suppliers for each of 3 services · replies land side by side in Quotes
            </span>
          </div>
        </div>
        <VesselAtQuay
          eyebrow="Vessel profile"
          title="Platform supply vessel · 12 crew"
          detail="Last Aberdeen call: crane, medical, scaffolding · 14 orders on record"
        />
      </div>

      <div className="mt-[18px] grid items-start gap-[18px] lg:grid-cols-2">
        {/* Arrivals & departures — the 48-hour strip */}
        <Card>
          <CardHeader
            title="Arrivals & departures"
            subtitle="The next 48 hours across Aberdeen and Peterhead"
          />
          <div className="mt-3.5">
            <PortCallTimeline vessels={VESSELS} />
          </div>
        </Card>

        <div className="space-y-[18px]">
          {/* Needs you — invoices in their window, the compliance watch, and
              letters in flight. Same hook as the top-bar bell. */}
          <Card>
            <CardHeader
              title="Needs you"
              subtitle="Ordered by urgency · the bell reads the same list"
            />
            {/* role="list" restores list semantics VoiceOver strips from
                style-less lists (Tailwind preflight removes the markers). */}
            <ul role="list" className="mt-3 list-none">
              {needsYou.map((item) => (
                <NeedsYouRow key={item.id} item={item} />
              ))}
            </ul>
          </Card>

          {/* Consolidation widget — the motif beside the number, live tier state */}
          <Card data-tour="consolidation">
            <CardHeader title="Client consolidation" subtitle="Browne Energy · live tier state" />
            <div className="mt-3 flex flex-wrap items-center gap-[18px]">
              <PillarsRoof
                pillars={[
                  { label: 'Agency', on: tier.agency },
                  { label: 'Logistics', on: tier.logistics },
                  { label: 'Customs', on: tier.customs },
                  { label: 'Procurement', on: true },
                ]}
                fullStack={fullStack}
                className="w-[200px] max-w-full shrink-0"
              />
              <div className="min-w-[140px] flex-1">
                {fullStack ? <Pill tone="inhouse">★ Full Stack client</Pill> : null}
                <p
                  className={`mt-2 font-display text-[40px] leading-none font-bold tracking-[-0.02em] ${
                    fullStack ? 'text-gold-deep' : ''
                  }`}
                >
                  {pct}%
                </p>
                <p className="mt-1 text-[12.5px] text-ink-soft">
                  tier discount held · est. {gbp(saving)} saved this year on {gbp(spend)} GAC
                  service spend
                </p>
              </div>
            </div>
            <div className="my-3.5 h-px bg-line" />
            <p className="text-[12.5px] text-ink-soft">
              The tier is non-cumulative: clients hold the highest single tier they qualify for. Try
              the mechanics in the{' '}
              <Link to="/app/tiers" className="font-semibold text-sea">
                Tier Calculator
              </Link>
              .
            </p>
          </Card>
        </div>
      </div>

      {/* Outlook add-in drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Outlook — add-in preview"
        outlookHeader
      >
        <p className="mb-3 text-[12.5px] text-ink-soft">
          The add-in surfaces the relevant platform job alongside the email the agent is reading.
        </p>
        <div className="mb-2.5 rounded-lg border border-line p-3">
          <p className="text-[13px] font-bold">Caledonia Lifting Ltd</p>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">
            RE: Quote request — crane hire, MV Elan, Aberdeen
          </p>
          <p className="mt-1.5 text-[12px]">
            Morning, we can do Friday 06:00 with the 130t mobile. £4,400 all-in as discussed…
          </p>
          <div className="mt-2 rounded-lg border border-dashed border-sea bg-sea-soft p-2.5 text-[12.5px]">
            <strong className="text-sea">Add-in:</strong> Reply matched to job{' '}
            <strong>#CS-2207</strong>. Quote £4,400 added to the comparison view automatically.{' '}
            <button
              type="button"
              className="cursor-pointer border-none bg-transparent p-0 font-semibold text-sea underline"
              onClick={() => {
                setDrawerOpen(false);
                navigate('/app/quotes');
              }}
            >
              Open comparison →
            </button>
          </div>
        </div>
        <div className="rounded-lg border border-line p-3">
          <p className="text-[13px] font-bold">Aberdeen Harbour VTS</p>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">
            MV Elan — berth confirmation Regent Quay
          </p>
          <p className="mt-1.5 text-[12px]">
            Confirming berth allocation for Friday 08:00 arrival…
          </p>
          <div className="mt-2 rounded-lg border border-dashed border-sea bg-sea-soft p-2.5 text-[12.5px]">
            <strong className="text-sea">Add-in:</strong> Berth confirmed. Calendar entry updated
            for agent and client.
          </div>
        </div>
        <p className="mt-3.5 text-[12.5px] text-ink-soft">
          Phase 1 delivers the sidebar and calendar sync. Automated email parsing is the Phase 2
          enhancement.
        </p>
      </Drawer>
    </div>
  );
}
