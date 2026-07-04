import { Card } from '../../components/ui/Card';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { BetaPill } from '../../components/ui/Pill';

const CARDS = [
  {
    title: 'Vessel-level credential register',
    body: 'Crew certifications held against the vessel profile in GA, visible to the operator and the agent in one place.',
  },
  {
    title: 'Expiry horizon alerts',
    body: 'The same SVS alert engine that watches supplier compliance, pointed at crew credentials: 90, 30, and 7-day warnings.',
  },
  {
    title: 'Renewal routing',
    body: 'Lapsing certificates generate quote requests to vetted training providers on the marketplace automatically.',
  },
];

export default function CertificationBeta() {
  return (
    <div className="screen-enter">
      <Eyebrow>Future service preview</Eyebrow>
      <h1 className="mt-1 font-display text-2xl font-bold">
        Crew Certification Tracking
        <BetaPill />
      </h1>

      {/* Mandatory scope banner — verbatim skeleton from 03 §3.2 */}
      <div className="mt-4 flex items-start gap-3.5 rounded-xl border border-gold-bright/30 bg-gradient-to-r from-gold-bright/12 to-gold-bright/4 px-4.5 py-3.5">
        <span aria-hidden="true" className="text-[18px] text-gold-deep">
          ⓘ
        </span>
        <p className="text-[13px] text-ink-soft">
          <strong className="text-ink">Beta preview · not in current scope.</strong> Offshore
          certification as a service line is a strategic idea under consideration, not an
          established offering. This preview shows the tracking layer the platform could host once
          live — it would require its own business case.
        </p>
      </div>

      <div className="mt-5 rounded-[14px] bg-gradient-to-b from-[#04101F] via-[#0B2138] to-ink p-8 text-white">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-bright/35 bg-gold-bright/14 px-3 py-1 text-[11.5px] font-bold tracking-[0.06em] text-gold-bright uppercase">
          ⏲ BETA · future service preview
        </span>
        <h2 className="mt-3.5 font-display text-[24px] font-bold">
          Every credential, every crew member, one expiry view
        </h2>
        <p className="mt-2 max-w-[640px] text-[14px] text-[#B9C8D6]">
          BOSIET, HUET, GWO, ENG1, passports, and sea service records tracked at vessel level — with
          renewals routed to vetted training providers on the marketplace before anything lapses.
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {CARDS.map((c) => (
          <Card key={c.title}>
            <h3 className="font-display text-[15px] font-bold">{c.title}</h3>
            <p className="mt-1.5 text-[13px] text-ink-soft">{c.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
