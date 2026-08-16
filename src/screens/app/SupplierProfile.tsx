import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { RequestQuoteModal } from '../../components/RequestQuoteModal';
import type { RequestTarget } from '../../components/RequestQuoteModal';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { CertChip } from '../../components/ui/CertChip';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { GoldBandPill, Pill, StatusPill } from '../../components/ui/Pill';
import { Rating } from '../../components/ui/Rating';
import { deriveStatus, goldBandActive, isBookable } from '../../lib/svs';
import { GOLD_BAND } from '../../data/goldBand';
import { supplierById } from '../../data/suppliers';

export default function SupplierProfile() {
  const { supplierId } = useParams();
  const [target, setTarget] = useState<RequestTarget | null>(null);
  const supplier = supplierId ? supplierById(supplierId) : undefined;

  if (!supplier) {
    return (
      <div className="screen-enter">
        <h1 className="font-display text-2xl font-bold">Supplier not found</h1>
        <p className="mt-2 text-[14px] text-ink-soft">
          That profile does not exist in this proof of concept.
        </p>
        <div className="mt-4">
          <ButtonLink to="/app/marketplace" variant="ghost">
            Back to the marketplace
          </ButtonLink>
        </div>
      </div>
    );
  }

  const status = deriveStatus(supplier.certs);
  const bookable = isBookable(supplier.certs);
  const goldBand = goldBandActive(supplier.goldBand, supplier.certs);

  return (
    <div className="screen-enter">
      <Link to="/app/marketplace" className="text-[13px] font-semibold text-sea">
        ← Marketplace
      </Link>

      {/* Header */}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold">{supplier.name}</h1>
            {supplier.promoted ? <Pill tone="promoted">▲ Promoted</Pill> : null}
            {goldBand ? <GoldBandPill /> : null}
            <StatusPill status={status} />
          </div>
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-3.5 text-[14px] text-ink-soft">
            <Rating rating={supplier.rating} count={supplier.ratingCount} />
            <span>
              ESG grade <strong>{supplier.esg}</strong>
            </span>
            <span>{supplier.category}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {bookable ? (
            <Button
              onClick={() =>
                setTarget({ supplierName: supplier.name, category: supplier.category })
              }
            >
              Request quote
            </Button>
          ) : (
            <>
              <Button disabled>Unavailable</Button>
              <p className="max-w-[280px] text-right text-[12px] text-danger">
                Blocked by the SVS: booking reopens when compliance evidence is uploaded and
                verified.
              </p>
            </>
          )}
        </div>
      </div>

      {goldBand ? (
        <Card className="mt-4">
          <Eyebrow>{GOLD_BAND.eyebrow}</Eyebrow>
          <p className="mt-1 font-display text-[16px] font-bold">
            {GOLD_BAND.name} held{supplier.goldBandDate ? ` · ${supplier.goldBandDate}` : ''}
          </p>
          <p className="mt-1.5 max-w-[720px] text-[13.5px] text-ink-soft">{GOLD_BAND.summary}</p>
          <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {GOLD_BAND.scope.map((item) => (
              <li key={item.title} className="text-[13px]">
                <strong>{item.title}</strong> — {item.body}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-ink-soft">{GOLD_BAND.rule}</p>
          <p className="mt-1.5 text-[12.5px] text-ink-soft">
            Premium partner — enhanced profile and analytics.{' '}
            <Link to="/app/analytics" className="font-semibold text-sea">
              See the analytics view
            </Link>
          </p>
        </Card>
      ) : supplier.goldBand === 'scheduled' ? (
        <div className="mt-3 max-w-[720px] rounded-lg border border-[#E5D89A] bg-gold-soft px-3 py-2 text-[12.5px]">
          <p className="font-semibold text-gold-deep">
            Premium partner — enhanced profile and analytics.{' '}
            <Link to="/app/analytics" className="font-bold text-gold-deep underline">
              See the analytics view
            </Link>
          </p>
          <p className="mt-1 text-ink-soft">
            {GOLD_BAND.scheduledNote}
            {supplier.goldBandDate ? ` ${supplier.goldBandDate}.` : ''}
          </p>
        </div>
      ) : supplier.plan === 'premium' ? (
        <p className="mt-3 inline-block rounded-lg border border-[#E5D89A] bg-gold-soft px-3 py-1.5 text-[12.5px] font-semibold text-gold-deep">
          Premium partner — enhanced profile and analytics.{' '}
          <Link to="/app/analytics" className="font-bold text-gold-deep underline">
            See the analytics view
          </Link>
        </p>
      ) : null}

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Card>
            <Eyebrow>Capability</Eyebrow>
            <p className="mt-2 text-[14.5px]">{supplier.description}</p>
            {supplier.plan !== 'free' ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {['Case studies', 'Capability statement', 'Photo gallery'].map((m) => (
                  <div
                    key={m}
                    className="grid h-20 place-items-center rounded-lg border border-dashed border-line-strong bg-paper text-center text-[12px] text-ink-soft"
                  >
                    {m}
                    <span className="text-[10.5px]">(enhanced profile media)</span>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>

          <Card>
            <Eyebrow>Compliance — live from the SVS</Eyebrow>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr>
                    <th className="bg-ink px-3.5 py-2.5 text-left text-[12px] tracking-[0.05em] text-white uppercase">
                      Certificate
                    </th>
                    <th className="bg-ink px-3.5 py-2.5 text-left text-[12px] tracking-[0.05em] text-white uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {supplier.certs.map((c) => (
                    <tr key={c.name} className="border-b border-line last:border-b-0">
                      <td className="px-3.5 py-2.5 font-semibold">{c.name}</td>
                      <td className="px-3.5 py-2.5">
                        <CertChip cert={c} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[12.5px] text-ink-soft">
              Certification is a mandatory vetting field. Expiries alert at 90, 30, and 7 days; a
              lapsed certificate blocks booking until evidence is re-verified.
            </p>
          </Card>
        </div>

        <Card>
          <Eyebrow>Recent activity</Eyebrow>
          <div className="mt-2 border-b border-line pb-3">
            <p className="text-[12px] text-ink-soft">Ratings</p>
            <p className="mt-0.5 text-[22px]">
              <Rating rating={supplier.rating} count={supplier.ratingCount} />
            </p>
            <p className="mt-1.5 text-[12px] text-ink-soft">
              Agents and clients rate the supplier when a job closes; the score never travels
              without the number behind it. All activity shown is illustrative.
            </p>
          </div>
          <p className="mt-3 text-[12px] text-ink-soft">Completed jobs</p>
          <ul>
            {supplier.recentJobs.map((job) => (
              <li
                key={job}
                className="border-b border-dashed border-line py-2.5 text-[13.5px] last:border-b-0"
              >
                {job}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <RequestQuoteModal target={target} onClose={() => setTarget(null)} />
    </div>
  );
}
