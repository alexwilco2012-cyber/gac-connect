import { useState } from 'react';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { GoldBandPill, Pill } from '../../components/ui/Pill';
import { Rating } from '../../components/ui/Rating';
import { StatCard } from '../../components/ui/StatCard';
import { Toggle } from '../../components/ui/Toggle';
import { GOLD_BAND } from '../../data/goldBand';
import {
  ANALYTICS_EXAMPLE,
  COMMISSION_RULE,
  FOUNDER_BODY,
  FOUNDER_LEAD,
  PLANS,
  PROMOTION_PRODUCTS,
  PROMOTION_RULE,
} from '../../data/plans';
import type { Plan } from '../../data/suppliers';
import {
  commissionDue,
  commissionPct,
  FOUNDER_REDUCTION_MONTHS,
  FOUNDER_REDUCTION_POINTS,
  supplierKeeps,
} from '../../lib/commission';
import { compactGbp, gbp } from '../../lib/format';
import { useApp } from '../../store/app';

const JOB_MIN = 500;
const JOB_MAX = 25_000;
const JOB_DEFAULT = 4_400;

const PLAN_TOAST: Record<Plan, string> = {
  free: 'Basic listing selected — free. Verification is the only gate; 20% commission applies only to work won through the platform.',
  professional:
    'Professional plan selected — £900 per year, 15% commission band. Founder suppliers receive the first year free.',
  premium:
    'Premium plan selected — £1,800 per year, 10% commission band, and eligibility for the GAC Gold Band audit. Promoted placements are always labelled and never override SVS compliance status.',
};

export default function ForSuppliers() {
  const pushToast = useApp((s) => s.pushToast);
  const [jobValue, setJobValue] = useState(JOB_DEFAULT);
  const [founder, setFounder] = useState(false);

  return (
    <main className="screen-enter mx-auto max-w-[1180px] px-6 py-14 md:py-20">
      <Eyebrow>For suppliers</Eyebrow>
      <h1 className="mt-2 max-w-[680px] font-display text-[clamp(28px,4vw,44px)] leading-tight font-bold">
        Grow your business on the platform
      </h1>
      <p className="mt-4 max-w-[640px] text-[15.5px] text-ink-soft">
        A verified profile puts you in front of every offshore operator GAC serves. Subscriptions
        and promotion tools control how visible you are — never how trusted you are — and the more
        you commit, the more of each job you keep.
      </p>

      {/* Founder programme */}
      <div className="mt-10 flex flex-col items-start gap-5 rounded-[14px] bg-ink p-7 text-white md:flex-row md:items-center">
        <span className="rounded-lg bg-gold-bright px-3.5 py-2.5 font-display text-[13px] font-bold whitespace-nowrap text-ink">
          FOUNDER PROGRAMME
        </span>
        <p className="flex-1 text-[14px] text-[#D8E2EC]">
          <strong className="text-white">{FOUNDER_LEAD}</strong>
          {' — '}
          {FOUNDER_BODY}
        </p>
        <Button
          variant="gold"
          onClick={() =>
            pushToast(
              `Founder Programme interest registered — first year free, plus a ${FOUNDER_REDUCTION_POINTS}-point commission-band reduction for ${FOUNDER_REDUCTION_MONTHS} months. The onboarding team will be in touch with your verification checklist.`,
            )
          }
        >
          Register interest
        </Button>
      </div>

      {/* Plans */}
      <h2 className="mt-12 mb-5 font-display text-[22px] font-bold">Listing plans</h2>
      <div className="grid items-stretch gap-5 md:grid-cols-3">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={`relative flex flex-col ${plan.popular ? 'border-[1.5px] border-gold' : ''}`}
          >
            {plan.popular ? (
              <span className="absolute -top-3 right-4 rounded-full bg-gold px-2.5 py-1 text-[10px] font-extrabold tracking-[0.08em] text-ink uppercase">
                Most popular
              </span>
            ) : null}
            <h3 className="font-display text-[17px] font-bold">{plan.name}</h3>
            <p className="mt-2 font-display text-[30px] font-bold">{plan.priceLine}</p>
            <p className="text-[12px] text-ink-soft">{plan.perLine}</p>
            <div className="mt-3 rounded-lg bg-ink px-3.5 py-2.5 text-white">
              <p className="font-display text-[15px] font-bold">{plan.commissionPct}% commission</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-[#9FB4C8]">
                on work won through the platform, deducted at invoice matching
              </p>
            </div>
            <ul className="my-4 flex-1">
              {plan.features.map((f) => (
                <li
                  key={f.text}
                  className={`flex gap-2 border-b border-dashed border-line py-2 text-[13.5px] last:border-b-0 ${
                    f.included ? '' : 'text-[#5F7085]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`font-extrabold ${f.included ? 'text-success' : 'text-line-strong'}`}
                  >
                    {f.included ? '✓' : '–'}
                  </span>
                  <span>
                    {f.text}
                    <span className="sr-only">
                      {f.included ? ' — included' : ' — not included'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <Button
              variant={plan.popular ? 'primary' : 'ghost'}
              onClick={() => pushToast(PLAN_TOAST[plan.id])}
            >
              {plan.cta}
            </Button>
          </Card>
        ))}
      </div>

      {/* Commission worked example */}
      <h2 className="mt-14 mb-2 font-display text-[22px] font-bold">Keep more of each job</h2>
      <p className="max-w-[680px] text-[14px] text-ink-soft">{COMMISSION_RULE}</p>
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_1.5fr]">
        <Card>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Eyebrow>Job value</Eyebrow>
            <p className="font-display text-[20px] font-bold">{gbp(jobValue)}</p>
          </div>
          <input
            type="range"
            min={JOB_MIN}
            max={JOB_MAX}
            step={100}
            value={jobValue}
            onChange={(e) => setJobValue(Number(e.target.value))}
            aria-label="Job value"
            aria-valuetext={gbp(jobValue)}
            className="mt-3 h-7 w-full accent-sea"
          />
          <div className="flex justify-between text-[12.5px] text-ink-soft">
            <span>{compactGbp(JOB_MIN)}</span>
            <span>{compactGbp(JOB_MAX)}</span>
          </div>

          <div
            className={`mt-4 flex items-center justify-between gap-4 rounded-[13px] border-[1.5px] px-4 py-3 transition-shadow ${
              founder ? 'border-sea shadow-[0_0_0_3px_var(--sea-soft)]' : 'border-line-strong'
            }`}
          >
            <div>
              <p className="text-[14px] font-bold">
                Founder Programme rate (first {FOUNDER_REDUCTION_MONTHS} months)
              </p>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">
                {FOUNDER_REDUCTION_POINTS} points off every commission band
              </p>
            </div>
            <Toggle
              pressed={founder}
              onToggle={() => setFounder((v) => !v)}
              label={`Founder Programme rate (first ${FOUNDER_REDUCTION_MONTHS} months)`}
            />
          </div>

          <p className="mt-4 text-[12.5px] text-ink-soft">
            Commission is deducted when your invoice matches in GAC Agent — no separate collection.
          </p>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          {PLANS.map((plan) => {
            const pct = commissionPct(plan.id, founder);
            const due = commissionDue(jobValue, plan.id, founder);
            const keeps = supplierKeeps(jobValue, plan.id, founder);
            return (
              <Card key={plan.id} className="flex flex-col">
                <p className="font-display text-[15px] font-bold">{plan.name}</p>
                <div className="mt-1.5">
                  <Pill tone="info">{pct}% commission</Pill>
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-2 border-b border-dashed border-line pb-2 text-[13px]">
                  <span className="text-ink-soft">Commission due</span>
                  <span className="font-bold">{gbp(due)}</span>
                </div>
                <p className="mt-4 text-[11px] font-extrabold tracking-[0.14em] text-ink-soft uppercase">
                  You keep
                </p>
                <p
                  className="mt-1 font-display text-[30px] leading-none font-bold"
                  data-testid={plan.id === 'premium' ? 'keeps-premium' : undefined}
                >
                  {gbp(keeps)}
                </p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* GAC Gold Band */}
      <section className="mt-14">
        <Eyebrow>{GOLD_BAND.eyebrow}</Eyebrow>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="font-display text-[22px] font-bold">Earned, not bought</h2>
          <GoldBandPill />
        </div>
        <p className="mt-3 max-w-[680px] text-[14px] text-ink-soft">{GOLD_BAND.summary}</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GOLD_BAND.scope.map((s) => (
            <Card key={s.title}>
              <h3 className="font-display text-[15.5px] font-bold">{s.title}</h3>
              <p className="mt-2 text-[13px] text-ink-soft">{s.body}</p>
            </Card>
          ))}
        </div>
        <p className="mt-4 max-w-[680px] text-[13px] text-ink-soft">{GOLD_BAND.rule}</p>
      </section>

      {/* Promotion products */}
      <h2 className="mt-14 mb-2 font-display text-[22px] font-bold">Promotion tools</h2>
      <p className="max-w-[680px] text-[14px] text-ink-soft">{PROMOTION_RULE}</p>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {PROMOTION_PRODUCTS.map((p) => (
          <Card key={p.title}>
            <h3 className="font-display text-[15.5px] font-bold">{p.title}</h3>
            <p className="mt-2 text-[13px] text-ink-soft">{p.body}</p>
          </Card>
        ))}
      </div>

      {/* Promoted listing example */}
      <h2 className="mt-14 mb-4 font-display text-[22px] font-bold">
        How a promoted listing appears
      </h2>
      <div className="rounded-xl border-[1.5px] border-dashed border-line-strong bg-[#FCFDFE] p-5">
        <p className="mb-3 text-[10.5px] font-bold tracking-[0.06em] text-[#6C6191] uppercase">
          Promoted · featured placement
        </p>
        <Card variant="promoted" className="flex flex-col justify-between gap-4 sm:flex-row">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-[16px] font-bold">Silver City Welding</h3>
              <Pill tone="promoted">▲ Promoted</Pill>
              <Pill tone="verified">✓ GAC Verified</Pill>
            </div>
            <p className="mt-2 text-[13.5px] text-ink-soft">
              Coded welders, onboard fabrication and repair, 24/7 call-out. Premium subscriber —
              featured in Welding this month.
            </p>
            <p className="mt-2 text-[13px] text-ink-soft">
              <Rating rating={4.4} count={72} size="sm" /> · ESG B · Welding
            </p>
          </div>
          <div className="flex items-start">
            <ButtonLink to="/app/marketplace/silver-city-welding" variant="ghost">
              View profile
            </ButtonLink>
          </div>
        </Card>
        <p className="mt-3 text-[12.5px] text-ink-soft">
          Promotion changes position, not credentials. Rating, ESG score, and compliance status are
          always the supplier’s own. Promotion does not confer Gold Band either — Silver City’s
          audit is booked, not yet passed. Premium makes a supplier eligible; only the audit confers
          the marque.
        </p>
      </div>

      {/* Analytics example */}
      <h2 className="mt-14 mb-2 font-display text-[22px] font-bold">Your performance, measured</h2>
      <p className="max-w-[680px] text-[14px] text-ink-soft">
        Professional and Premium suppliers see exactly what their presence earns — example
        dashboard:
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ANALYTICS_EXAMPLE.map((a) => (
          <StatCard key={a.label} label={a.label} value={a.value} barPct={a.barPct} />
        ))}
      </div>
      <div className="mt-6">
        <ButtonLink to="/app/analytics" variant="ghost">
          See the example analytics dashboard
        </ButtonLink>
      </div>
    </main>
  );
}
