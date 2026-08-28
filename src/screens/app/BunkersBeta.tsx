import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { BetaPill, Pill } from '../../components/ui/Pill';
import { StageTrack } from '../../components/ui/StageTrack';
import { BRAND_NAME } from '../../config/brand';
import {
  BUNKER_INTRO,
  BUNKER_NOTICE,
  BUNKER_PORTS,
  DEMO_ENQUIRY,
  EMPTY_ENQUIRY,
  LAST_STEM,
  PREFILL_NOTE,
  VALIDITY_NOTE,
} from '../../data/bunkers';
import { VESSELS } from '../../data/vessels';
import {
  BUNKER_GRADES,
  BUNKER_STAGES,
  GRADE_NOTES,
  bestQuote,
  bunkerAction,
  bunkerStageTone,
  isDelivered,
  openEnquiries,
  soonestQuote,
  spreadUsd,
  totalUsd,
  usd,
  validateEnquiry,
} from '../../lib/bunkers';
import type { BunkerEnquiry, BunkerEnquiryForm, BunkerGrade } from '../../lib/bunkers';
import { useApp } from '../../store/app';
import { useBunkers } from '../../store/bunkers';

/**
 * Bunkers — a beta preview with a working enquiry behind it. The scope banner
 * comes first, because fuel is a direction the architecture supports rather
 * than a service GAC sells here; what follows shows how it would read.
 *
 * The comparison is the marketplace's, with the two things that make fuel
 * different put on the screen rather than left out: a price holds for hours,
 * and a supplier will not lift below its minimum stem. A supplier that cannot
 * take the stem says why, because "no reply" and "below our minimum" are
 * different answers and only one is worth chasing.
 *
 * Prices are indicative, quoted in USD per tonne as the trade does, generated
 * from the enquiry reference and stored with it — a quote is what a supplier
 * said at a moment, so the number holds still once it is given.
 */

const INPUT =
  'mt-1 block min-h-[40px] w-full rounded-lg border-[1.5px] border-line-strong bg-white px-2.5 py-2 text-[13.5px] font-semibold text-ink';
const LABEL = 'text-[12.5px] font-semibold text-ink-soft';

const VESSEL_NAME: Record<string, string> = Object.fromEntries(VESSELS.map((v) => [v.id, v.name]));

/* ---------------------------------------------------------- Enquiry form */

function EnquiryFormCard() {
  const raise = useBunkers((s) => s.raise);
  const pushToast = useApp((s) => s.pushToast);
  const [form, setForm] = useState<BunkerEnquiryForm>(EMPTY_ENQUIRY);
  const [problems, setProblems] = useState<string[]>([]);

  const set = <K extends keyof BunkerEnquiryForm>(key: K, value: BunkerEnquiryForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Picking a vessel fills the enquiry in from the call and the last stem,
  // which is the whole point of raising it inside the platform.
  function pickVessel(id: string) {
    const vessel = VESSELS.find((v) => v.id === id);
    if (!vessel) {
      set('vesselId', '');
      return;
    }
    const last = LAST_STEM[vessel.id];
    setForm((f) => ({
      ...f,
      vesselId: vessel.id,
      port: (BUNKER_PORTS as readonly string[]).includes(vessel.port) ? vessel.port : f.port,
      grade: last ? last.grade : f.grade,
      quantityMt: last ? String(last.quantityMt) : f.quantityMt,
    }));
  }

  function submit() {
    const found = validateEnquiry(form);
    setProblems(found);
    if (found.length > 0) return;
    const id = raise(form);
    setForm(EMPTY_ENQUIRY);
    pushToast(`${id} raised — ${form.grade}, ${form.quantityMt} mt at ${form.port}. Illustrative.`);
  }

  const last = form.vesselId ? LAST_STEM[form.vesselId] : undefined;

  return (
    <Card data-testid="bunker-enquiry-form">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Eyebrow>Raise an enquiry</Eyebrow>
          <h3 className="mt-1 font-display text-[17px] font-bold">
            Priced against the vessel and the call
          </h3>
        </div>
        <Pill tone="neutral">Illustrative</Pill>
      </div>
      <p className="mt-1.5 max-w-[720px] text-[13px] text-ink-soft">{PREFILL_NOTE}</p>

      <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
        <label className={LABEL}>
          Vessel
          <select
            className={INPUT}
            value={form.vesselId}
            onChange={(e) => pickVessel(e.target.value)}
            data-testid="bunker-vessel"
          >
            <option value="">No vessel — standalone enquiry</option>
            {VESSELS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          Port
          <select className={INPUT} value={form.port} onChange={(e) => set('port', e.target.value)}>
            {BUNKER_PORTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          Grade
          <select
            className={INPUT}
            value={form.grade}
            onChange={(e) => set('grade', e.target.value as BunkerGrade)}
            data-testid="bunker-grade"
          >
            {BUNKER_GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[12px] font-normal text-ink-soft">
            {GRADE_NOTES[form.grade]}
          </span>
        </label>
        <label className={LABEL}>
          Quantity (mt)
          <input
            className={INPUT}
            inputMode="numeric"
            value={form.quantityMt}
            onChange={(e) => set('quantityMt', e.target.value)}
            placeholder="180"
          />
          {last ? (
            <span className="mt-1 block text-[12px] font-normal text-ink-soft">
              Last stem: {last.quantityMt} mt {last.grade} · {last.when}
            </span>
          ) : null}
        </label>
        <label className={`${LABEL} sm:col-span-2`}>
          Delivery window
          <input
            className={INPUT}
            value={form.deliveryWindow}
            onChange={(e) => set('deliveryWindow', e.target.value)}
            placeholder="Fri 06:00–12:00, alongside Regent Quay"
          />
        </label>
      </div>

      {problems.length > 0 ? (
        <p
          className="mt-3 rounded-lg border border-warn bg-warn-soft px-3 py-2 text-[12.5px] text-warn"
          role="alert"
          data-testid="bunker-problems"
        >
          Still needed: {problems.join(' · ')}
        </p>
      ) : null}

      <div className="mt-3.5 flex flex-wrap gap-2.5">
        <Button onClick={submit} data-testid="bunker-raise">
          Raise the enquiry
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setForm(DEMO_ENQUIRY);
            setProblems([]);
          }}
        >
          Fill with an example
        </Button>
      </div>
      <p className="mt-3 text-[12.5px] text-ink-soft">{BUNKER_NOTICE}</p>
    </Card>
  );
}

/* ------------------------------------------------------------ Comparison */

function Comparison({ enquiry }: { enquiry: BunkerEnquiry }) {
  const accept = useBunkers((s) => s.accept);
  const pushToast = useApp((s) => s.pushToast);
  const quantity = Number(enquiry.form.quantityMt);
  const best = bestQuote(enquiry.quotes, quantity);
  const soonest = soonestQuote(enquiry.quotes);
  const spread = spreadUsd(enquiry.quotes, quantity);
  const decided = enquiry.stage !== 'Prices returned';

  if (enquiry.quotes.length === 0) {
    return (
      <p className="mt-3 rounded-lg border border-line bg-paper px-3 py-2 text-[12.5px] text-ink-soft">
        No supplier at {enquiry.form.port} will lift a stem this size. Raise it against a larger
        quantity, or ask your agent to work it by road tanker.
      </p>
    );
  }

  return (
    <div className="mt-3.5">
      <div className="grid gap-3 lg:grid-cols-3" data-testid="bunker-quotes">
        {enquiry.quotes.map((q) => {
          const taken = enquiry.acceptedSupplierId === q.supplierId;
          const cheapest = best?.supplierId === q.supplierId;
          return (
            <Card
              key={q.supplierId}
              variant="default"
              className={`min-w-0 ${taken ? 'border-[1.5px] border-sea' : ''}`}
              data-testid={`bunker-quote-${q.supplierId}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h4 className="font-display text-[14.5px] font-bold">{q.supplierName}</h4>
                {taken ? <Pill tone="verified">✓ Stem taken</Pill> : null}
                {!taken && cheapest ? <Pill tone="info">Cheapest all in</Pill> : null}
              </div>
              <p className="mt-2 font-display text-[22px] font-bold">
                {usd(q.pricePerMt, 2)}
                <span className="ml-1 text-[12.5px] font-normal text-ink-soft">{' per tonne'}</span>
              </p>
              <dl className="mt-2 space-y-1 text-[12.5px] text-ink-soft">
                <div className="flex justify-between gap-3">
                  <dt>Fuel, {quantity} mt</dt>
                  <dd className="font-semibold text-ink">{usd(q.pricePerMt * quantity)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Barging and pump-over</dt>
                  <dd className="font-semibold text-ink">{usd(q.deliveryFeeUsd)}</dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-line pt-1">
                  <dt className="font-semibold text-ink">All in</dt>
                  <dd className="font-display font-bold text-ink">{usd(totalUsd(q, quantity))}</dd>
                </div>
              </dl>
              <p className="mt-2 text-[12.5px] text-ink-soft">
                Earliest {q.earliestDelivery} · price holds {q.validHours} hours
              </p>
              <p className="mt-1 text-[12.5px] text-ink-soft">{q.note}</p>
              {!decided ? (
                <Button
                  className="mt-3 w-full"
                  variant={cheapest ? 'primary' : 'ghost'}
                  onClick={() => {
                    accept(enquiry.id, q.supplierId);
                    pushToast(
                      `Stem confirmed with ${q.supplierName} — ${usd(totalUsd(q, quantity))} all in. Illustrative: nothing is ordered.`,
                    );
                  }}
                  data-testid="bunker-accept"
                >
                  Take this price
                </Button>
              ) : null}
            </Card>
          );
        })}
      </div>

      {enquiry.noOffers.length > 0 ? (
        <ul className="mt-3 space-y-1.5" data-testid="bunker-no-offers">
          {enquiry.noOffers.map((n) => (
            <li
              key={n.supplierId}
              className="rounded-lg border border-line bg-paper px-3 py-2 text-[12.5px] text-ink-soft"
            >
              <strong className="text-ink">{n.supplierName}</strong> — no offer. {n.reason}.
            </li>
          ))}
        </ul>
      ) : null}

      {best && soonest && best.supplierId !== soonest.supplierId ? (
        <p className="mt-3 text-[12.5px] text-ink-soft" data-testid="bunker-tradeoff">
          The cheapest stem is not the soonest: {best.supplierName} is{' '}
          {usd(totalUsd(soonest, quantity) - totalUsd(best, quantity))} cheaper but cannot lift
          until {best.earliestDelivery}, against {soonest.earliestDelivery} from{' '}
          {soonest.supplierName}.
        </p>
      ) : null}
      {spread > 0 ? (
        <p className="mt-1 text-[12.5px] text-ink-soft" data-testid="bunker-spread">
          Spread across the replies: {usd(spread)} on {quantity} mt.
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------- Enquiries */

function EnquiryCard({ enquiry }: { enquiry: BunkerEnquiry }) {
  const advance = useBunkers((s) => s.advance);
  const pushToast = useApp((s) => s.pushToast);
  const action = bunkerAction(enquiry.stage);
  const delivered = isDelivered(enquiry.stage);
  const { form } = enquiry;

  return (
    <Card className="min-w-0" data-testid={`bunker-${enquiry.id}`} data-stage={enquiry.stage}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="neutral">{form.grade}</Pill>
            <span className="text-[12px] font-semibold tracking-[0.02em] text-ink-soft">
              {enquiry.id} · {enquiry.createdAt}
            </span>
          </div>
          <h3 className="mt-1 font-display text-[16.5px] font-bold">
            {form.quantityMt} mt {form.grade} · {form.port}
          </h3>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            {form.vesselId ? `${VESSEL_NAME[form.vesselId]} · ` : ''}
            {form.deliveryWindow}
          </p>
        </div>
        <div className="max-w-full [&>span]:whitespace-normal">
          <Pill tone={bunkerStageTone(enquiry.stage)}>
            {delivered ? '✓ ' : ''}
            {enquiry.stage}
          </Pill>
        </div>
      </div>

      <StageTrack stages={BUNKER_STAGES} current={enquiry.stage} />

      {enquiry.stage === 'Enquiry raised' ? (
        <p className="mt-3 text-[12.5px] text-ink-soft">
          Out to the suppliers that lift at {form.port}. Prices come back against the window you
          set.
        </p>
      ) : (
        <Comparison enquiry={enquiry} />
      )}

      <div className="mt-3.5 flex flex-wrap items-center gap-3">
        {action ? (
          <Button
            variant="ghost"
            onClick={() => advance(enquiry.id, action.steps)}
            data-testid="bunker-advance"
          >
            {action.label}
          </Button>
        ) : null}
        {delivered ? (
          <Button
            onClick={() =>
              pushToast('Illustrative — the bunker delivery note would download here as a PDF.')
            }
          >
            Bunker delivery note
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

/* ----------------------------------------------------------------- Screen */

export default function BunkersBeta() {
  const enquiries = useBunkers((s) => s.enquiries);
  const reset = useBunkers((s) => s.reset);
  const open = openEnquiries(enquiries);

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
          VLSFO, LSMGO and MGO enquiries raised against the vessel profile, with port availability,
          indicative pricing windows, and the same agreement and audit layer as every other booking.
          The enquiry below works: raise one, compare what comes back, take a price.
        </p>
      </div>

      <section className="mt-6 space-y-4" aria-label="Bunker enquiries">
        <p className="max-w-[760px] text-[13.5px] text-ink-soft">{BUNKER_INTRO}</p>
        <p className="max-w-[760px] rounded-brand border border-line bg-paper px-4 py-3 text-[13px] text-ink-soft">
          {VALIDITY_NOTE}
        </p>

        <EnquiryFormCard />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Eyebrow>Enquiries · {enquiries.length}</Eyebrow>
            <h3 className="mt-0.5 font-display text-[17px] font-bold">Priced and running</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[12.5px] text-ink-soft" data-testid="bunkers-summary">
              {enquiries.length === 0
                ? 'No enquiries raised'
                : `${open.length} open · ${enquiries.length - open.length} delivered`}
            </span>
            <Button variant="ghost" onClick={reset}>
              Reset enquiries
            </Button>
          </div>
        </div>

        <div className="space-y-4" data-testid="bunker-enquiries">
          {enquiries.map((e) => (
            <EnquiryCard key={e.id} enquiry={e} />
          ))}
        </div>
        {enquiries.length === 0 ? (
          <p className="rounded-brand border border-line bg-paper px-4 py-3 text-[13px] text-ink-soft">
            No enquiries yet — raise one above, or fill the form with an example.
          </p>
        ) : null}
      </section>
    </div>
  );
}
