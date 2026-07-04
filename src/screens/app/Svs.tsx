import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { CertChip } from '../../components/ui/CertChip';
import { Chip } from '../../components/ui/Chip';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { StatusPill } from '../../components/ui/Pill';
import { deriveStatus } from '../../lib/svs';
import type { SupplierStatus } from '../../lib/svs';
import { SUPPLIERS } from '../../data/suppliers';

type StatusFilter = 'all' | SupplierStatus;

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All statuses' },
  { key: 'verified', label: 'Verified' },
  { key: 'renewal-due', label: 'Renewal due' },
  { key: 'blocked', label: 'Blocked' },
];

export default function Svs() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<StatusFilter>('all');

  const rows = useMemo(() => {
    const withStatus = SUPPLIERS.map((s) => ({ ...s, status: deriveStatus(s.certs) }));
    return filter === 'all' ? withStatus : withStatus.filter((s) => s.status === filter);
  }, [filter]);

  return (
    <div className="screen-enter">
      <Eyebrow>Supplier Vetting System · proprietary</Eyebrow>
      <h1 className="mt-1 font-display text-2xl font-bold">Compliance at a glance</h1>
      <p className="mt-1 max-w-[680px] text-[14px] text-ink-soft">
        Certification is a mandatory vetting field. Expiries trigger automatic alerts at 90, 30, and
        7 days; lapsed suppliers cannot be booked.
      </p>

      <div className="mt-4 rounded-lg border-l-4 border-warn bg-warn-soft px-4 py-3 text-[13.5px]">
        <strong>2 alerts:</strong> Granite NDT Ltd — GWO expires in 21 days (renewal reminder sent).
        Peterhead Diving Services — insurance lapsed (booking blocked until evidence uploaded).
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <Chip key={f.key} pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </Chip>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse overflow-hidden rounded-brand border border-line bg-white text-[13.5px]">
          <thead>
            <tr>
              {['Supplier', 'Category', 'Certifications', 'ESG', 'Rating', 'Status'].map((h) => (
                <th
                  key={h}
                  className="bg-ink px-3.5 py-2.5 text-left text-[12px] tracking-[0.05em] text-white uppercase"
                >
                  {h}
                </th>
              ))}
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
                  {s.certs.map((c) => (
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
                <td className="px-3.5 py-3">{s.rating.toFixed(1)} ★</td>
                <td className="px-3.5 py-3">
                  <StatusPill status={s.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card className="mt-5">
        <Eyebrow>What the proprietary SVS adds</Eyebrow>
        <p className="mt-2 text-[14px]">
          Keyword taxonomy across 40+ service categories · supplier self-service portal · automated
          expiry alerts · live performance ratings fed from completed platform transactions ·
          built-in ESG scoring · the GAC Verified badge as a visible mark of quality. Owned by GAC,
          on GAC infrastructure — replacing the third-party licence.
        </p>
      </Card>
    </div>
  );
}
