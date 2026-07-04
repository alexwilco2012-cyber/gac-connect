import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PillarsRoof } from '../../components/motif/PillarsRoof';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Drawer } from '../../components/ui/Drawer';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Pill } from '../../components/ui/Pill';
import { StatCard } from '../../components/ui/StatCard';
import { gbp } from '../../lib/format';
import { annualSaving, isFullStack, tierPct } from '../../lib/tier';
import { DASHBOARD_KPIS, PREDICTED_NEEDS, VESSELS } from '../../data/vessels';
import { useApp } from '../../store/app';

const PILL_TONE = { info: 'info', warn: 'warn', success: 'verified' } as const;

export default function Dashboard() {
  const navigate = useNavigate();
  const pushToast = useApp((s) => s.pushToast);
  const tier = useApp((s) => s.tier);
  const spend = useApp((s) => s.spend);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const pct = tierPct(tier);
  const fullStack = isFullStack(tier);
  const saving = annualSaving(spend, tier);

  function sendQuoteRequests() {
    pushToast(
      '9 quote requests sent for MV Caledonian Star. Replies will populate the comparison view automatically.',
    );
    navigate('/app/quotes');
  }

  return (
    <div className="screen-enter">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow>Thursday · Aberdeen</Eyebrow>
          <h1 className="mt-1 font-display text-2xl font-bold">Morning, agent</h1>
          <p className="mt-1 text-[14px] text-ink-soft">
            2 vessels arriving in the next 24 hours. 1 procurement list ready to send.
          </p>
        </div>
        <Button variant="ghost" onClick={() => setDrawerOpen(true)}>
          Open Outlook add-in preview
        </Button>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-tour="kpis">
        {DASHBOARD_KPIS.map((k) => (
          <StatCard key={k.label} label={k.label} value={k.value} delta={k.delta} />
        ))}
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          {/* Predictive procurement */}
          <Card
            className="border-[#CFE2EE] bg-gradient-to-b from-sea-soft to-white"
            data-tour="predictive"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Eyebrow>Predictive procurement · from GA history</Eyebrow>
                <h2 className="mt-1 font-display text-[18px] font-bold">
                  MV Caledonian Star — Aberdeen, ETA 08:00 tomorrow
                </h2>
              </div>
              <Pill tone="info">GA vessel profile loaded</Pill>
            </div>
            <p className="mt-2 text-[13.5px] text-ink-soft">
              This vessel typically requires the following on a call to Aberdeen. SVS-verified
              suppliers are pre-selected for each.
            </p>
            <ul className="my-3">
              {PREDICTED_NEEDS.map((n) => (
                <li
                  key={n.service}
                  className="flex items-center justify-between gap-3 border-b border-dashed border-line-strong py-2 text-[14px] last:border-b-0"
                >
                  <span>
                    <strong>{n.service}</strong> · {n.matched} suppliers matched
                  </span>
                  <Pill tone="verified">✓ GAC Verified</Pill>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={sendQuoteRequests}>Send quote requests</Button>
              <span className="text-[12.5px] text-ink-soft">
                9 emails · replies will populate the comparison view automatically
              </span>
            </div>
          </Card>

          {/* Arrivals & departures */}
          <Card>
            <Eyebrow>Arrivals &amp; departures</Eyebrow>
            <div className="mt-3 space-y-4">
              {VESSELS.map((v) => (
                <div
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-sea pl-3.5"
                >
                  <div>
                    <p className="text-[14.5px]">
                      <strong>{v.name}</strong> · {v.operatorLine}
                    </p>
                    <p className="text-[12.5px] text-ink-soft">{v.scheduleLine}</p>
                  </div>
                  <Pill tone={PILL_TONE[v.statusPill.tone]}>{v.statusPill.label}</Pill>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          {/* Consolidation widget — live tier state */}
          <Card data-tour="consolidation">
            <Eyebrow>Client consolidation · Northmoor Energy</Eyebrow>
            <PillarsRoof
              pillars={[
                { label: 'Agency', on: tier.agency },
                { label: 'Logistics', on: tier.logistics },
                { label: 'Customs', on: tier.customs },
                { label: 'Procure', on: true },
              ]}
              fullStack={fullStack}
              className="mx-auto mt-2 w-[240px]"
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

          {/* Compliance watch */}
          <Card data-tour="compliance">
            <Eyebrow>Compliance watch · SVS</Eyebrow>
            <p className="mt-2.5 text-[14px]">
              <strong>Granite NDT Ltd</strong> — GWO expires in 21 days. Renewal reminder sent
              automatically.
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-[14px]">
              <span>
                <strong>Peterhead Diving Services</strong> — insurance certificate lapsed.
              </span>
              <Pill tone="danger">✗ Blocked from booking</Pill>
            </p>
            <div className="mt-3">
              <Button variant="ghost" onClick={() => navigate('/app/svs')}>
                Open SVS
              </Button>
            </div>
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
