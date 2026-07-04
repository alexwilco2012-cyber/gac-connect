import { Card } from '../../components/ui/Card';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { BRAND_NAME } from '../../config/brand';

export default function About() {
  return (
    <main className="screen-enter mx-auto max-w-[820px] px-6 py-14 md:py-20">
      <Eyebrow>About</Eyebrow>
      <h1 className="mt-2 font-display text-[clamp(28px,4vw,44px)] leading-tight font-bold">
        What {BRAND_NAME} is
      </h1>

      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-ink-soft">
        <p>
          {BRAND_NAME} is a digital marketplace for offshore energy services: vetted suppliers on
          one side, operators and their vessels on the other, and GAC’s own service lines — Agency,
          Logistics, Customs, Assets, and Procurement — woven through the middle. It turns the
          phone-and-email procurement cycle around a port call into a single workflow with
          comparison, e-signature, and audit built in.
        </p>
        <p>
          This site is a <strong className="text-ink">proof of concept</strong>. Every supplier,
          vessel, operator, price, rating, and figure shown is illustrative. Nothing here is a live
          service, a real transaction, or a claim about current operations.
        </p>
      </div>

      <Card className="mt-8">
        <h2 className="font-display text-[18px] font-bold">The SVS philosophy</h2>
        <p className="mt-2 text-[14px] text-ink-soft">
          Nothing reaches the client unchecked. The Supplier Vetting System makes certification a
          mandatory field rather than a checkbox: BOSIET, HUET, GWO, LOLER, insurance, and medical
          certificates are tracked with expiry alerts at 90, 30, and 7 days. A supplier with a
          lapsed certificate is blocked from booking — visibly, everywhere — until evidence is
          uploaded. Promotion, plan level, and rating never override compliance.
        </p>
      </Card>

      <Card className="mt-4">
        <h2 className="font-display text-[18px] font-bold">Contact</h2>
        <p className="mt-2 text-[14px] text-ink-soft">
          This proof of concept is an internal demonstration. A contact route for the production
          platform would live here.
        </p>
      </Card>
    </main>
  );
}
