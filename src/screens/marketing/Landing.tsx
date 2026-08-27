import { PillarsRoof } from '../../components/motif/PillarsRoof';
import { TourInvite } from '../../tour/Tour';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Icon, type IconName } from '../../components/ui/Icon';
import { OPERATORS } from '../../data/vessels';
import { InteractiveHarbour } from './harbour/InteractiveHarbour';
import { LandingHero } from './LandingHero';
import { PlatformPreview } from './PlatformPreview';

/**
 * The landing page (refreshed 27 Aug, to catch up with the 25–26 Aug platform
 * restyle).
 *
 * The order is marketing anatomy, not a feature list: the offer, then the
 * product itself, then why it needs to exist, then how it works, then the
 * commercial reason to consolidate. The harbour keeps its job — but as the
 * second way in rather than the first, because a visitor who has just seen the
 * marketplace running is readier to play with an illustration than one who has
 * seen nothing yet. `InteractiveHarbour` is dropped in whole and unchanged.
 *
 * Two things stay where they are on purpose: `TourInvite` is the first thing
 * under the header (the presenter's closing QR lands here, and the offer has
 * to be visible without scrolling), and every counter on the page is derived,
 * never typed.
 */

const PROBLEMS: { title: string; icon: IconName; body: string }[] = [
  {
    title: 'Slow',
    icon: 'timer',
    body: 'Sourcing a crane or a medic for a port call means phone calls and email chains measured in hours, against a vessel arriving on a clock.',
  },
  {
    title: 'Opaque',
    icon: 'message-square-quote',
    body: 'Quotes arrive in different formats at different times. Comparing them honestly is manual work, so it rarely happens.',
  },
  {
    title: 'No data',
    icon: 'layout-dashboard',
    body: 'Every port call re-learns what the last one already knew. Procurement history sits in inboxes, not in a system.',
  },
  {
    title: 'Manual compliance',
    icon: 'file-check',
    body: 'Certificates expire quietly. Checking a supplier’s insurance and training records is a spreadsheet job that competes with the day job.',
  },
];

const SOLUTION: { title: string; icon: IconName; body: string }[] = [
  {
    title: 'A vetted marketplace',
    icon: 'store',
    body: 'Suppliers list services; clients find, compare, and book them. Every listing passes the Supplier Vetting System before it reaches a client.',
  },
  {
    title: 'GAC in-house services',
    icon: 'anchor',
    body: 'Agency, Logistics, Customs, Assets, and Procurement surface first where relevant — with a tier discount that rewards consolidating spend.',
  },
  {
    title: 'Compliance built in',
    icon: 'shield-check',
    body: 'The SVS is a gate at the front and an early-warning system behind it. Lapsed suppliers cannot be booked, anywhere, by anyone.',
  },
];

const FULL_PILLARS = [
  { label: 'Agency', on: true },
  { label: 'Logistics', on: true },
  { label: 'Customs', on: true },
  { label: 'Procurement', on: true },
];

/** The ladder as the rule actually works: you take the best rung you reach,
 *  you do not add them up (03 §3.1 — non-cumulative max(2,4,7)). */
const TIER_LADDER = [
  { label: 'Agency', pct: '2%' },
  { label: '+ Logistics', pct: '4%' },
  { label: '+ Customs', pct: '7%' },
];

function Medallion({ icon, tone }: { icon: IconName; tone: 'sea' | 'warn' | 'gold' }) {
  const tones = {
    sea: 'bg-sea-soft text-sea',
    warn: 'bg-warn-soft text-warn',
    gold: 'bg-gold-soft text-gold-deep',
  } as const;
  return (
    <span
      aria-hidden="true"
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tones[tone]}`}
    >
      <Icon name={icon} size={18} />
    </span>
  );
}

export default function Landing() {
  return (
    <main className="screen-enter">
      {/* Above everything, not below it: this is where the closing slide's QR
          lands, and the offer has to be visible without scrolling. */}
      <TourInvite />

      <LandingHero />

      {/* The product itself, pulled up into the hero band. */}
      <div className="mx-auto max-w-[1180px] px-6">
        <div className="-mt-[110px]">
          <PlatformPreview />
        </div>
        <p className="mt-3.5 text-center text-[12.5px] text-ink-soft">
          The marketplace as it stands today. Every screen behind it is open — no sign-up, no sales
          call.
        </p>
      </div>

      {/* Problem */}
      <section className="mx-auto max-w-[1180px] px-6 py-16 md:py-20">
        <Eyebrow>The problem</Eyebrow>
        <h2 className="mt-2 max-w-[640px] font-display text-[clamp(24px,3.4vw,36px)] leading-tight font-bold">
          Offshore procurement still runs on phone calls
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROBLEMS.map((p) => (
            <Card key={p.title}>
              <Medallion icon={p.icon} tone="warn" />
              <h3 className="mt-3.5 font-display text-[17px] font-bold">{p.title}</h3>
              <p className="mt-2 text-[13.5px] text-ink-soft">{p.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Solution */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-[1180px] px-6 py-16 md:py-20">
          <Eyebrow>The answer</Eyebrow>
          <h2 className="mt-2 max-w-[640px] font-display text-[clamp(24px,3.4vw,36px)] leading-tight font-bold">
            One platform, three parts
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {SOLUTION.map((s, i) => (
              <Card key={s.title} variant={i === 1 ? 'inhouse' : 'default'}>
                <Medallion icon={s.icon} tone={i === 1 ? 'gold' : 'sea'} />
                <h3 className="mt-3.5 font-display text-[17px] font-bold">{s.title}</h3>
                <p className="mt-2 text-[13.5px] text-ink-soft">{s.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Motif, large */}
      <section className="mx-auto max-w-[1180px] px-6 py-16 text-center md:py-20">
        <div className="flex justify-center">
          <Eyebrow>The consolidation story</Eyebrow>
        </div>
        <h2 className="mx-auto mt-2 max-w-[560px] font-display text-[clamp(24px,3.4vw,36px)] leading-tight font-bold">
          The more you bring under one roof, the less you pay
        </h2>
        <PillarsRoof
          pillars={FULL_PILLARS}
          fullStack
          className="mx-auto mt-8 w-[min(420px,88vw)]"
        />
        <ul className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
          {TIER_LADDER.map((t, i) => (
            <li key={t.label} className="flex items-center gap-2.5">
              {i > 0 ? (
                <Icon
                  name="arrow-right"
                  size={16}
                  className="text-line-strong"
                  aria-hidden="true"
                />
              ) : null}
              <span className="inline-flex items-center gap-2.5 rounded-brand border border-line bg-white px-4 py-2.5 shadow-card">
                <span className="text-[13.5px] font-semibold text-ink-soft">{t.label}</span>
                <strong
                  className={`font-display text-[20px] font-bold ${
                    i === TIER_LADDER.length - 1 ? 'text-gold-deep' : 'text-sea'
                  }`}
                >
                  {t.pct}
                </strong>
              </span>
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-6 max-w-[520px] text-[14px] text-ink-soft">
          Consolidating GAC Agency, Logistics, and Customs holds the highest single tier you qualify
          for — up to 7% off platform-booked GAC charges. The tiers do not stack; you take the best
          one you reach.
        </p>
        <div className="mt-6">
          <ButtonLink to="/for-clients" variant="ghost">
            How the tier discount works
          </ButtonLink>
        </div>
      </section>

      {/* The harbour — the second way in. The scene, its hotspots and its side
          panel are unchanged; only its place on the page has moved. */}
      <section className="border-t border-line bg-white">
        <div className="mx-auto max-w-[1180px] px-6 pt-16 md:pt-20">
          <Eyebrow>Another way in</Eyebrow>
          <h2 className="mt-2 max-w-[560px] font-display text-[clamp(24px,3.4vw,36px)] leading-tight font-bold">
            Or start from the quay
          </h2>
          <p className="mt-3 max-w-[620px] text-[14px] text-ink-soft">
            Every part of the harbour is a service line. Click the lorry, the ship, the crane — each
            one opens what GAC does there, and what consolidating it is worth.
          </p>
        </div>
        <InteractiveHarbour />
      </section>

      {/* Social proof — fictional operators */}
      <section className="border-t border-line bg-white">
        <div className="mx-auto max-w-[1180px] px-6 py-10">
          <p className="text-center text-[11px] font-extrabold tracking-[0.18em] text-ink-soft uppercase">
            Built for the operators who keep the North Sea moving
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {OPERATORS.map((o) => (
              <span
                key={o}
                className="font-display text-[15px] font-bold tracking-[0.06em] text-ink-soft/70"
              >
                {o}
              </span>
            ))}
          </div>
          <p className="mt-4 text-center text-[11.5px] text-ink-soft/70">
            Illustrative operators — all names on this site are fictional.
          </p>
        </div>
      </section>

      {/* Closing call — the page's one action, repeated */}
      <section className="bg-gradient-to-br from-ink to-[#06132B] text-white">
        <div className="mx-auto max-w-[1180px] px-6 py-16">
          <Eyebrow dark>See it working</Eyebrow>
          <h2 className="mt-2 max-w-[640px] font-display text-[clamp(24px,3.4vw,36px)] leading-tight font-bold">
            Nothing here is behind a login
          </h2>
          <p className="mt-3 max-w-[620px] text-[14.5px] text-[#C6D4E2]">
            Twelve stops walk a full port call — vessel arriving, services booked, certificates
            checked, invoice matched. Or ignore the tour and click anything you like.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink to="/app" variant="gold">
              Explore the platform
              <Icon name="arrow-right" size={16} />
            </ButtonLink>
          </div>
        </div>
      </section>
    </main>
  );
}
