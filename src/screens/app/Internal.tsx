import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PillarsRoof } from '../../components/motif/PillarsRoof';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { CardHeader } from '../../components/ui/CardHeader';
import { Drawer } from '../../components/ui/Drawer';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Icon } from '../../components/ui/Icon';
import { Pill } from '../../components/ui/Pill';
import { PortCallTimeline } from '../../components/ui/PortCallTimeline';
import { StatCard } from '../../components/ui/StatCard';
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
 * Internal — the GAC agent desk (26 Aug).
 *
 * This screen was the platform's front door until the owner's call that GAC
 * Connect is a marketplace first and a workflow second: a client or a supplier
 * opening the platform wants to find and be found, not read someone else's
 * work queue. So the marketplace took `/app`, the Dashboard became the client
 * and supplier view, and this — the predictive procurement run, the 48-hour
 * strip, the Outlook add-in, the consolidation widget — moved to its own tab at
 * the foot of the sidebar, where the people it was actually written for work.
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
            <Pill tone={item.chip.tone}>{item.chip.label}</Pill>
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
      `9 quote requests sent for MV Caledonian Star. Reply-by window ${window_.label}. Replies will populate the comparison view automatically.${
        short ? ' Short windows rarely draw a full set of replies.' : ''
      }`,
    );
    navigate('/app/quotes');
  }

  return (
    <div className="screen-enter">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow>Internal · Thursday · Aberdeen</Eyebrow>
          <h1 className="mt-1 font-display text-2xl font-bold">Morning, agent</h1>
          <p className="mt-1 text-[14px] text-ink-soft">
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

      {/* KPIs */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-tour="kpis">
        {DASHBOARD_KPIS.map((k) => (
          <StatCard
            key={k.label}
            label={k.label}
            value={k.value}
            delta={k.delta}
            deltaTone={k.deltaTone}
            icon={k.icon}
            series={k.series}
          />
        ))}
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          {/* Predictive procurement */}
          <Card
            className="border-[#CFE2EE] bg-gradient-to-b from-sea-soft to-white"
            data-tour="predictive"
          >
            <CardHeader
              title="MV Caledonian Star — Aberdeen, ETA 08:00 tomorrow"
              subtitle="Predictive procurement · what this vessel typically needs on an Aberdeen call, from GA history. SVS-verified suppliers are pre-selected for each."
              action={<Pill tone="info">GA vessel profile loaded</Pill>}
            />
            <ul role="list" className="my-3">
              {PREDICTED_NEEDS.map((n) => {
                const hint = relatedHint(n.service);
                return (
                  <li
                    key={n.service}
                    className="flex items-center justify-between gap-3 border-b border-dashed border-line-strong py-2 text-[14px] last:border-b-0"
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
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={sendQuoteRequests}>Send quote requests</Button>
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
                9 emails · replies will populate the comparison view automatically
              </span>
            </div>
          </Card>

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
        </div>

        <div className="space-y-5">
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

          {/* Consolidation widget — live tier state */}
          <Card data-tour="consolidation">
            <CardHeader title="Client consolidation" subtitle="Browne Energy · live tier state" />
            <PillarsRoof
              pillars={[
                { label: 'Agency', on: tier.agency },
                { label: 'Logistics', on: tier.logistics },
                { label: 'Customs', on: tier.customs },
                { label: 'Procurement', on: true },
              ]}
              fullStack={fullStack}
              // The pillar labels are 7.5 user units, so a fixed 240px box paints
              // them at 7.5px on a phone. Letting the motif use the card's width
              // scales the whole diagram, labels included.
              className="mx-auto mt-2 w-full max-w-[300px] sm:w-[240px]"
            />
            <div className="mt-2 text-center">
              {fullStack ? <Pill tone="inhouse">★ Full Stack client</Pill> : null}
              <p
                className={`font-display text-[34px] font-bold tracking-tight ${
                  fullStack ? 'text-gold-deep' : ''
                }`}
              >
                {pct}%
              </p>
              <p className="text-[12.5px] text-ink-soft">
                tier discount held · est. {gbp(saving)} saved this year on {gbp(spend)} GAC service
                spend
              </p>
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
            RE: Quote request — crane hire, MV Caledonian Star, Aberdeen
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
            MV Caledonian Star — berth confirmation Regent Quay
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
