import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { CertChip } from '../../../components/ui/CertChip';
import { Chip } from '../../../components/ui/Chip';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { GoldBandPill, StatusPill } from '../../../components/ui/Pill';
import { Rating } from '../../../components/ui/Rating';
import { GOLD_BAND } from '../../../data/goldBand';
import { ESG_PLANNED_NOTE } from '../../../data/related';
import { SUPPLIERS } from '../../../data/suppliers';
import { deriveStatus, goldBandActive, type SupplierStatus } from '../../../lib/svs';
import { certsWithApproved } from '../../../lib/svsDesk';
import { useSvsDesk } from '../../../store/svsDesk';

export type SvsFilter = 'all' | SupplierStatus | 'gold-band';

const FILTERS: { key: SvsFilter; label: string }[] = [
  { key: 'all', label: 'All statuses' },
  { key: 'verified', label: 'Verified' },
  { key: 'renewal-due', label: 'Renewal due' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'gold-band', label: 'Gold Band' },
];

/**
 * The register — the SVS screen's front tab, moved here unchanged from
 * `Svs.tsx` (live dashboards, 23 Sep). One difference: each row's
 * certificates come through `certsWithApproved`, so a new certificate the SVS
 * team verifies in the evidence queue shows on the supplier's row. Status is
 * still derived from the certificates the gate reads, so no approval moves it.
 * The filter is held by the screen, so it survives a trip to another tab.
 */
export function Register({
  filter,
  onFilter,
}: {
  filter: SvsFilter;
  onFilter: (next: SvsFilter) => void;
}) {
  const navigate = useNavigate();
  const evidence = useSvsDesk((s) => s.evidence);

  const rows = useMemo(() => {
    const withStatus = SUPPLIERS.map((s) => ({
      ...s,
      shownCerts: certsWithApproved(s.id, s.certs, evidence),
      status: deriveStatus(s.certs),
      goldBandHeld: goldBandActive(s.goldBand, s.certs),
    }));
    if (filter === 'all') return withStatus;
    if (filter === 'gold-band') return withStatus.filter((s) => s.goldBandHeld);
    return withStatus.filter((s) => s.status === filter);
  }, [filter, evidence]);

  return (
    <>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filter by status or audit tier"
      >
        {FILTERS.map((f) => (
          <Chip key={f.key} pressed={filter === f.key} onClick={() => onFilter(f.key)}>
            {f.label}
          </Chip>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse overflow-hidden rounded-brand border border-line bg-white text-[13.5px]">
          <thead>
            <tr>
              {['Supplier', 'Category', 'Certifications', 'ESG (planned)', 'Rating', 'Status'].map(
                (h) => (
                  <th
                    key={h}
                    className="bg-ink px-3.5 py-2.5 text-left text-[12px] tracking-[0.05em] text-white uppercase"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr
                key={s.id}
                className="cursor-pointer border-b border-line last:border-b-0 hover:bg-sea-soft/40"
                onClick={() => navigate(`/app/marketplace/${s.id}`)}
              >
                <td className="px-3.5 py-3">
                  <button
                    type="button"
                    className="cursor-pointer border-none bg-transparent p-0 text-left font-bold text-ink hover:text-sea hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/app/marketplace/${s.id}`);
                    }}
                  >
                    {s.name}
                  </button>
                </td>
                <td className="px-3.5 py-3">{s.category}</td>
                <td className="px-3.5 py-3">
                  {s.shownCerts.map((c) => (
                    <CertChip key={c.name} cert={c} />
                  ))}
                </td>
                <td
                  className={`px-3.5 py-3 font-bold ${
                    s.esg === 'A' ? 'text-success' : s.esg === 'B' ? 'text-[#3E7C2F]' : 'text-warn'
                  }`}
                >
                  {s.esg}
                </td>
                <td className="px-3.5 py-3 whitespace-nowrap">
                  <Rating rating={s.rating} count={s.ratingCount} size="sm" />
                </td>
                <td className="px-3.5 py-3">
                  <div className="flex flex-col items-start gap-1.5">
                    <StatusPill status={s.status} />
                    {s.goldBandHeld ? <GoldBandPill /> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card className="mt-5">
        <Eyebrow>What the proprietary SVS adds</Eyebrow>
        <p className="mt-2 text-[14px]">
          Keyword search across 40+ service categories · supplier self-service portal · automated
          expiry alerts · live performance ratings fed from completed platform transactions, each
          shown with the number of ratings submitted · the GAC Verified badge as a visible mark of
          quality · GAC Gold Band as the paid annual audit tier above it. Owned by GAC — built for
          us by a third-party developer, now moving to full Group IT maintenance. The platform is
          what turns it commercial.
        </p>
        <p className="mt-2 text-[13px] text-ink-soft">{ESG_PLANNED_NOTE}</p>
      </Card>

      <Card className="mt-4">
        <Eyebrow>{GOLD_BAND.name}</Eyebrow>
        <p className="mt-2 text-[14px]">{GOLD_BAND.summary}</p>
        <p className="mt-2 text-[12.5px] text-ink-soft">{GOLD_BAND.rule}</p>
      </Card>
    </>
  );
}
