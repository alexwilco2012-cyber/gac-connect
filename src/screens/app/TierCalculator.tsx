import { Card } from '../../components/ui/Card';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Pill } from '../../components/ui/Pill';
import { Toggle } from '../../components/ui/Toggle';
import { compactGbp, gbp } from '../../lib/format';
import { annualSaving, isFullStack, TIERS, tierNote, tierPct } from '../../lib/tier';
import type { TierService } from '../../lib/tier';
import { useApp } from '../../store/app';

const SERVICES: { key: TierService; name: string; blurb: string }[] = [
  {
    key: 'agency',
    name: 'GAC Agency',
    blurb: `Port calls, vessel support, crew coordination · ${TIERS.agency}% tier`,
  },
  {
    key: 'logistics',
    name: 'GAC Logistics',
    blurb: `Freight forwarding, warehousing, project cargo · ${TIERS.logistics}% tier`,
  },
  {
    key: 'customs',
    name: 'GAC Customs',
    blurb: `T1 transit, import/export clearance, documentation · ${TIERS.customs}% tier`,
  },
];

export default function TierCalculator() {
  const tier = useApp((s) => s.tier);
  const spend = useApp((s) => s.spend);
  const toggleTierService = useApp((s) => s.toggleTierService);
  const setSpend = useApp((s) => s.setSpend);

  const pct = tierPct(tier);
  const fullStack = isFullStack(tier);
  const saving = annualSaving(spend, tier);

  return (
    <div className="screen-enter">
      <Eyebrow>Commercial mechanics</Eyebrow>
      <h1 className="mt-1 font-display text-2xl font-bold">Tier discount calculator</h1>
      <p className="mt-1 max-w-[680px] text-[14px] text-ink-soft">
        The discount applies to a client’s GAC in-house service charges booked through the platform.
        It is non-cumulative — the highest single tier the client qualifies for applies.
      </p>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.1fr_1fr]" data-tour="calculator">
        <div>
          {SERVICES.map((svc) => (
            <div
              key={svc.key}
              className={`mb-3 flex items-center justify-between gap-4 rounded-[13px] border-[1.5px] bg-white px-5 py-4 transition-shadow ${
                tier[svc.key]
                  ? 'border-sea shadow-[0_0_0_3px_var(--sea-soft)]'
                  : 'border-line-strong'
              }`}
            >
              <div>
                <p className="text-[15px] font-bold">{svc.name}</p>
                <p className="mt-0.5 text-[12.5px] text-ink-soft">{svc.blurb}</p>
              </div>
              <Toggle
                pressed={tier[svc.key]}
                onToggle={() => toggleTierService(svc.key)}
                label={`Toggle ${svc.name}`}
              />
            </div>
          ))}
          <p className="mx-0.5 text-[13px] text-ink-soft">
            GAC Assets and GAC Procurement are included at any tier as added value.
          </p>

          <Card className="mt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Eyebrow>Annual GAC service spend via platform</Eyebrow>
              <p className="font-display text-[20px] font-bold">{gbp(spend)}</p>
            </div>
            <input
              type="range"
              min={50_000}
              max={2_000_000}
              step={25_000}
              value={spend}
              onChange={(e) => setSpend(Number(e.target.value))}
              aria-label="Annual GAC service spend"
              className="mt-3 h-7 w-full accent-sea"
            />
            <div className="flex justify-between text-[12.5px] text-ink-soft">
              <span>{compactGbp(50_000)}</span>
              <span>{compactGbp(2_000_000)}</span>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card variant="dark" className="p-8 text-center">
            <p className="font-display text-[11.5px] font-semibold tracking-[0.22em] text-[#9FB4C8] uppercase">
              Discount tier held
            </p>
            <p
              className="mt-2 font-display text-[56px] leading-none font-bold tracking-tight text-gold-bright"
              data-testid="tier-pct"
            >
              {pct}%
            </p>
            {fullStack ? (
              <div className="mt-3 flex justify-center">
                <Pill tone="inhouse">★ Full Stack — all three pillars</Pill>
              </div>
            ) : null}
            <p className="mt-4 font-display text-[20px] font-bold" data-testid="tier-saving">
              {pct > 0 ? `${gbp(saving)} saved / year` : 'Select a service to qualify'}
            </p>
            <p className="mx-auto mt-2.5 max-w-[330px] text-[12.5px] leading-relaxed text-[#9FB4C8]">
              {tierNote(tier)}
            </p>
          </Card>

          <Card>
            <Eyebrow>Why this works for GAC</Eyebrow>
            <p className="mt-2 text-[13.5px]">
              The discount is a cost; the consolidated service revenue it attracts is the prize.
              Clients who bring agency, logistics, and customs under one roof stay, spend more, and
              route it all through the platform where every booking is auditable.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
