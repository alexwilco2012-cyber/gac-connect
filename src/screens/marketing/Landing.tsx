import { useSearchParams } from 'react-router-dom';
import { TourInvite } from '../../tour/Tour';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Icon, type IconName } from '../../components/ui/Icon';
import { OPERATORS } from '../../data/vessels';
import { ConsolidationMotif } from './ConsolidationMotif';
import { LandingHero } from './LandingHero';
import { PlatformPreview } from './PlatformPreview';

/**
 * The landing page (refreshed 2 Sep).
 *
 * The order is marketing anatomy, not a feature list: the offer and the quay
 * together, then the product itself, then why it needs to exist, then how it
 * works, then the commercial reason to consolidate. The harbour is no longer a
 * section of its own — it is the hero's right-hand half, which is the only
 * place on the page it was ever going to be touched.
 *
 * Two things stay true: every counter is derived rather than typed, and the
 * tour is offered above the fold, where the presenter's closing QR lands. That
 * offer is now a line in the hero rather than a bar above it; the bar itself
 * survives for `?tour` arrivals, who have asked for it explicitly.
 */

const PROBLEMS: { title: string; body: string }[] = [
  {
    title: 'Slow',
    body: 'A crane or a medic for a port call takes hours of calls and email chains, against a vessel arriving on a clock.',
  },
  {
    title: 'Opaque',
    body: 'Quotes land in different formats at different times. Comparing them properly is manual work, so it rarely happens.',
  },
  {
    title: 'No data',
    body: 'Every port call re-learns what the last one knew. Procurement history lives in inboxes, not in a system.',
  },
  {
    title: 'Manual compliance',
    body: 'Certificates expire quietly. Checking a supplier’s insurance and training is a spreadsheet job that competes with the day job.',
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

/** The page's only medallions, now that the problem columns have dropped
 *  theirs — so they read as the vocabulary of the answer, not decoration. */
function Medallion({ icon, tone }: { icon: IconName; tone: 'sea' | 'gold' }) {
  const tones = {
    sea: 'bg-sea-soft text-sea',
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
  const [params] = useSearchParams();

  return (
    <main className="screen-enter">
      {/* Arriving with ?tour is asking for the walkthrough, so the bar stands
          up and says so. Everyone else is offered it inside the hero. */}
      {params.has('tour') ? <TourInvite /> : null}

      <LandingHero />

      {/* The product itself, pulled up into the hero band. */}
      <div className="mx-auto max-w-[1180px] px-6">
        <div className="-mt-[110px] animate-[fade-up_0.9s_1.1s_cubic-bezier(0.4,0,0.2,1)_both]">
          <PlatformPreview />
        </div>
        <p className="mt-3.5 text-center text-[12.5px] text-ink-soft">
          The marketplace as it stands today. Every screen behind it is open. No sign-up, no sales
          call.
        </p>
      </div>

      {/* Problem — numbered columns, because four rules of a broken process
          are a list, not four features asking to be compared. */}
      <section className="mx-auto max-w-[1180px] px-6 py-16 md:py-20">
        <Eyebrow>The problem</Eyebrow>
        <h2 className="mt-2 max-w-[640px] font-display text-[clamp(24px,3.4vw,36px)] leading-tight font-bold text-balance">
          Offshore procurement still runs on phone calls
        </h2>
        <div className="mt-9 grid gap-x-6 gap-y-8 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          {PROBLEMS.map((p, i) => (
            <div key={p.title} className="border-t-2 border-ink pt-4">
              <p className="font-display text-[13px] font-bold tracking-[0.08em] text-sea">
                {String(i + 1).padStart(2, '0')}
              </p>
              <h3 className="mt-2.5 font-display text-[19px] font-bold">{p.title}</h3>
              <p className="mt-2 text-[13.5px] text-ink-soft text-pretty">{p.body}</p>
            </div>
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

      {/* Motif, large — and built as you reach it. */}
      <section className="mx-auto max-w-[1180px] px-6 py-16 text-center md:py-20">
        <div className="flex justify-center">
          <Eyebrow>The consolidation story</Eyebrow>
        </div>
        <h2 className="mx-auto mt-2 max-w-[560px] font-display text-[clamp(24px,3.4vw,36px)] leading-tight font-bold">
          The more you bring under one roof, the less you pay
        </h2>
        <ConsolidationMotif />
        <p className="mx-auto mt-5 max-w-[520px] text-[14px] text-ink-soft text-pretty">
          Consolidating GAC Agency, Logistics and Customs holds the highest single tier you qualify
          for, up to 7% off platform-booked GAC charges. The tiers do not stack; you take the best
          one you reach.
        </p>
        <div className="mt-6">
          <ButtonLink to="/for-clients" variant="ghost">
            How the tier discount works
          </ButtonLink>
        </div>
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
            Illustrative operators. All names on this site are fictional.
          </p>
        </div>
      </section>

      {/* Closing call — paper, not a second ink band. The hero owns the dark;
          repeating it here makes the page bookended rather than finished. */}
      <section className="border-t border-line bg-paper">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-6 px-6 py-16">
          <div className="max-w-[620px]">
            <Eyebrow>See it working</Eyebrow>
            <h2 className="mt-2 font-display text-[clamp(24px,3.4vw,36px)] leading-tight font-bold">
              Nothing here is behind a login
            </h2>
            <p className="mt-3 text-[14.5px] text-ink-soft text-pretty">
              Twelve stops walk a full port call: vessel arriving, services booked, certificates
              checked, invoice matched. Or ignore the tour and click anything you like.
            </p>
          </div>
          <ButtonLink to="/app" variant="gold" className="min-h-12 px-5 text-[14px]">
            Explore the platform
            <Icon name="arrow-right" size={16} />
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
