import { PillarsRoof } from '../../components/motif/PillarsRoof';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { BRAND_NAME } from '../../config/brand';
import { OPERATORS } from '../../data/vessels';

const PROBLEMS = [
  {
    title: 'Slow',
    body: 'Sourcing a crane or a medic for a port call means phone calls and email chains measured in hours, against a vessel arriving on a clock.',
  },
  {
    title: 'Opaque',
    body: 'Quotes arrive in different formats at different times. Comparing them honestly is manual work, so it rarely happens.',
  },
  {
    title: 'No data',
    body: 'Every port call re-learns what the last one already knew. Procurement history sits in inboxes, not in a system.',
  },
  {
    title: 'Manual compliance',
    body: 'Certificates expire quietly. Checking a supplier’s insurance and training records is a spreadsheet job that competes with the day job.',
  },
];

const SOLUTION = [
  {
    title: 'A vetted marketplace',
    body: 'Suppliers list services; clients find, compare, and book them. Every listing passes the Supplier Vetting System before it reaches a client.',
  },
  {
    title: 'GAC in-house services',
    body: 'Agency, Logistics, Customs, Assets, and Procurement surface first where relevant — with a tier discount that rewards consolidating spend.',
  },
  {
    title: 'Compliance built in',
    body: 'The SVS is a gate at the front and an early-warning system behind it. Lapsed suppliers cannot be booked, anywhere, by anyone.',
  },
];

const FULL_PILLARS = [
  { label: 'Agency', on: true },
  { label: 'Logistics', on: true },
  { label: 'Customs', on: true },
  { label: 'Procure', on: true },
];

export default function Landing() {
  return (
    <main className="screen-enter">
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,199,44,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,199,44,.05) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 70% 65% at 50% 30%, #000 0%, transparent 80%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 70% 65% at 50% 30%, #000 0%, transparent 80%)',
          }}
        />
        <div className="relative mx-auto grid max-w-[1180px] gap-12 px-6 py-16 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-24">
          <div>
            <Eyebrow dark>Offshore services · connected</Eyebrow>
            <h1 className="mt-4 font-display text-[clamp(34px,5vw,56px)] leading-[1.08] font-bold tracking-tight">
              Offshore services.
              <br />
              Found, vetted, <span className="text-gold-bright">booked.</span>
            </h1>
            <p className="mt-5 max-w-[520px] text-[16px] leading-relaxed text-[#B9C8D6]">
              {BRAND_NAME} is a B2B marketplace for offshore energy operations: vetted suppliers,
              GAC’s own service lines, and predictive procurement from vessel history — one workflow
              that starts before the vessel reaches the berth.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/app" variant="gold">
                Explore the platform →
              </ButtonLink>
              <ButtonLink to="/for-suppliers" variant="dark-outline">
                List your services
              </ButtonLink>
            </div>
          </div>
          <div className="hidden justify-center md:flex">
            <div className="w-full max-w-[380px] rounded-[14px] border border-white/10 bg-white/5 p-8">
              <PillarsRoof pillars={FULL_PILLARS} fullStack dark className="w-full" />
              <p className="mt-4 text-center text-[12.5px] text-[#9FB4C8]">
                Four pillars, one roof: consolidate services and the roof turns gold.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-[1180px] px-6 py-16 md:py-20">
        <Eyebrow>The problem</Eyebrow>
        <h2 className="mt-2 max-w-[640px] font-display text-[clamp(24px,3.4vw,36px)] leading-tight font-bold">
          Offshore procurement still runs on phone calls
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROBLEMS.map((p) => (
            <Card key={p.title}>
              <h3 className="font-display text-[17px] font-bold">{p.title}</h3>
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
                <h3 className="font-display text-[17px] font-bold">{s.title}</h3>
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
        <p className="mx-auto mt-6 max-w-[480px] text-[14px] text-ink-soft">
          Consolidating GAC Agency, Logistics, and Customs holds the highest single tier you qualify
          for — up to 7% off platform-booked GAC charges.
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
            Illustrative operators — all names on this site are fictional.
          </p>
        </div>
      </section>
    </main>
  );
}
