import { Card } from './Card';

/** Stat card: label / big number / trend bar (02 §components). */
export function StatCard({
  label,
  value,
  delta,
  barPct,
}: {
  label: string;
  value: string;
  delta?: string;
  barPct?: number;
}) {
  return (
    <Card>
      <p className="text-[12px] text-ink-soft">{label}</p>
      <p className="mt-0.5 font-display text-[26px] font-bold">{value}</p>
      {delta ? <p className="text-[12px] font-bold text-success">{delta}</p> : null}
      {barPct !== undefined ? (
        <div
          className="mt-2.5 h-1.5 overflow-hidden rounded bg-sea-soft"
          role="img"
          aria-label={`${label}: ${barPct} per cent of scale`}
        >
          <span className="block h-full rounded bg-sea" style={{ width: `${barPct}%` }} />
        </div>
      ) : null}
    </Card>
  );
}
