import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Pill } from '../../components/ui/Pill';
import { StatCard } from '../../components/ui/StatCard';
import {
  ANALYTICS_EXAMPLE,
  FOUNDER_PROGRAMME,
  PLANS,
  PROMOTION_PRODUCTS,
  PROMOTION_RULE,
} from '../../data/plans';
import { useApp } from '../../store/app';

export default function ForSuppliers() {
  const pushToast = useApp((s) => s.pushToast);

  return (
    <main className="screen-enter mx-auto max-w-[1180px] px-6 py-14 md:py-20">
      <Eyebrow>For suppliers</Eyebrow>
      <h1 className="mt-2 max-w-[680px] font-display text-[clamp(28px,4vw,44px)] leading-tight font-bold">
        Grow your business on the platform
      </h1>
      <p className="mt-4 max-w-[640px] text-[15.5px] text-ink-soft">
        A verified profile puts you in front of every offshore operator GAC serves. Subscriptions
        and promotion tools control how visible you are — never how trusted you are.
      </p>

      {/* Founder programme */}
      <div className="mt-10 flex flex-col items-start gap-5 rounded-[14px] bg-ink p-7 text-white md:flex-row md:items-center">
        <span className="rounded-lg bg-gold-bright px-3.5 py-2.5 font-display text-[13px] font-bold whitespace-nowrap text-ink">
          FOUNDER PROGRAMME
        </span>
        <p className="flex-1 text-[14px] text-[#D8E2EC]">
          <strong className="text-white">The first 50 suppliers join free for 12 months</strong>
          {' — '}
          {FOUNDER_PROGRAMME.split('— ').slice(1).join('— ')}
        </p>
        <Button
          variant="gold"
          onClick={() =>
            pushToast(
              'Founder Programme interest registered. The onboarding team will be in touch with your verification checklist.',
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
              onClick={() =>
                pushToast(
                  plan.id === 'free'
                    ? 'Free listing selected. Verification is the only gate — the SVS checklist will be sent to you.'
                    : plan.id === 'professional'
                      ? 'Professional plan selected — £900 per year. Founder suppliers receive this tier free for 12 months.'
                      : 'Premium plan selected — £1,800 per year. Promoted placements are always labelled and never override SVS compliance status.',
                )
              }
            >
              {plan.cta}
            </Button>
          </Card>
        ))}
      </div>

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
              <span className="font-bold text-gold-deep">4.4 ★</span> · ESG B · Welding
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
          always the supplier’s own.
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
