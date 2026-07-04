import { Card } from '../../components/ui/Card';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { BetaPill } from '../../components/ui/Pill';
import { BRAND_NAME } from '../../config/brand';

const CARDS = [
  {
    title: 'Vessel-matched enquiries',
    body: 'GA knows the vessel, the port call, and the consumption history — the enquiry pre-fills itself.',
  },
  {
    title: 'Price window comparison',
    body: 'Indicative quotes side by side with validity windows, the same comparison pattern as the marketplace.',
  },
  {
    title: 'Audit-grade confirmation',
    body: 'E-signed agreements and delivery confirmation, identical to the platform’s standard accountability model.',
  },
];

export default function BunkersBeta() {
  return (
    <div className="screen-enter">
      <Eyebrow>Future service preview</Eyebrow>
      <h1 className="mt-1 font-display text-2xl font-bold">
        Bunkers
        <BetaPill />
      </h1>

      {/* Mandatory scope banner — verbatim skeleton from 03 §3.2 */}
      <div className="mt-4 flex items-start gap-3.5 rounded-xl border border-gold-bright/30 bg-gradient-to-r from-gold-bright/12 to-gold-bright/4 px-4.5 py-3.5">
        <span aria-hidden="true" className="text-[18px] text-gold-deep">
          ⓘ
        </span>
        <p className="text-[13px] text-ink-soft">
          <strong className="text-ink">Beta preview · not in current scope.</strong> Bunker
          coordination is shown here as a direction the platform architecture supports —
          demonstrating that {BRAND_NAME} is a chassis for future service lines, not a
          single-purpose tool.
        </p>
      </div>

      <div className="mt-5 rounded-[14px] bg-gradient-to-b from-[#04101F] via-[#0B2138] to-ink p-8 text-white">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-bright/35 bg-gold-bright/14 px-3 py-1 text-[11.5px] font-bold tracking-[0.06em] text-gold-bright uppercase">
          ⏲ BETA · future service preview
        </span>
        <h2 className="mt-3.5 font-display text-[24px] font-bold">
          Fuel sourcing inside the same workflow
        </h2>
        <p className="mt-2 max-w-[640px] text-[14px] text-[#B9C8D6]">
          VLSFO, LSMGO, and MGO enquiries raised against the vessel profile, with port availability,
          indicative pricing windows, and the same agreement and audit layer as every other booking.
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
