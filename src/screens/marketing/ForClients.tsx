import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Pill } from '../../components/ui/Pill';
import { BRAND_NAME } from '../../config/brand';

const STEPS = [
  {
    title: 'The arrival is flagged',
    body: 'An ETA lands and the vessel profile loads from GA history. The platform already knows what this vessel needed on its last call to this port.',
  },
  {
    title: 'The list pre-fills itself',
    body: 'Crane hire, medical cover, scaffolding — drafted automatically, with SVS-verified suppliers pre-matched to every line.',
  },
  {
    title: 'Quotes arrive in one view',
    body: 'One click sends the quote requests. Replies populate a side-by-side comparison — even quotes sent as plain Outlook emails are parsed and matched to the job.',
  },
  {
    title: 'The booking becomes the PO',
    body: 'Accept a quote, both parties e-sign, and the purchase order generates in GAC Agent with the client billing split applied from the vessel profile. No re-keying.',
  },
];

export default function ForClients() {
  return (
    <main className="screen-enter">
      <section className="mx-auto max-w-[1180px] px-6 py-14 md:py-20">
        <Eyebrow>For clients</Eyebrow>
        <h1 className="mt-2 max-w-[680px] font-display text-[clamp(28px,4vw,44px)] leading-tight font-bold">
          From two hours of phone calls to fifteen minutes of decisions
        </h1>
        <p className="mt-4 max-w-[620px] text-[15.5px] text-ink-soft">
          {BRAND_NAME} compresses the port-call procurement cycle because the platform starts the
          work before you do. Here is the whole workflow.
        </p>

        <ol className="mt-10 grid gap-4 md:grid-cols-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className="list-none">
              <Card className="h-full">
                <span className="inline-grid h-10 w-10 place-items-center rounded-[10px] border border-[#E5D89A] bg-gold-soft font-display text-[14px] font-bold text-gold-deep">
                  0{i + 1}
                </span>
                <h2 className="mt-3 font-display text-[18px] font-bold">{s.title}</h2>
                <p className="mt-2 text-[14px] text-ink-soft">{s.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-6 py-14 md:grid-cols-2 md:items-center md:py-20">
          <div>
            <Eyebrow>The tier discount</Eyebrow>
            <h2 className="mt-2 font-display text-[clamp(24px,3.2vw,34px)] leading-tight font-bold">
              Consolidation pays, and the maths is public
            </h2>
            <p className="mt-4 text-[14.5px] text-ink-soft">
              GAC Agency holds a 2% tier, Logistics 4%, Customs 7%. The discount applies to your GAC
              in-house service charges booked through the platform, and it is non-cumulative — you
              hold the highest single tier you qualify for. Consolidate all three and you are a Full
              Stack client at 7%.
            </p>
            <p className="mt-3 text-[14.5px] text-ink-soft">
              On £500,000 of GAC service spend, Full Stack saves £35,000 a year. GAC Assets and GAC
              Procurement are included at any tier as added value.
            </p>
            <div className="mt-6">
              <ButtonLink to="/app/tiers" variant="primary">
                Try the interactive calculator
              </ButtonLink>
            </div>
          </div>
          <Card variant="dark" className="p-8 text-center">
            <p className="font-display text-[12px] font-bold tracking-[0.2em] text-[#9FB4C8] uppercase">
              Full Stack example
            </p>
            <p className="mt-3 font-display text-[64px] leading-none font-bold text-gold-bright">
              7%
            </p>
            <div className="mt-3 flex justify-center">
              <Pill tone="inhouse">★ Full Stack — all three pillars</Pill>
            </div>
            <p className="mt-4 font-display text-[20px] font-bold">£35,000 saved / year</p>
            <p className="mt-2 text-[12.5px] text-[#9FB4C8]">
              on £500,000 of platform-booked GAC service spend
            </p>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-6 py-14 md:py-20">
        <Eyebrow>The ESG angle</Eyebrow>
        <h2 className="mt-2 max-w-[640px] font-display text-[clamp(24px,3.2vw,34px)] leading-tight font-bold">
          Supplier scoring that supports your decarbonisation reporting
        </h2>
        <p className="mt-4 max-w-[640px] text-[14.5px] text-ink-soft">
          Every supplier on the marketplace carries an ESG grade alongside rating and compliance
          status, visible at the moment you choose between quotes. Choosing the greener crane is a
          decision the comparison view lets you make deliberately — and evidence for the report you
          have to write later.
        </p>
        <div className="mt-6">
          <ButtonLink to="/app/marketplace" variant="ghost">
            Browse the marketplace
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
