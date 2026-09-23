import { Card } from './Card';
import { Icon, type IconName } from './Icon';
import { Sparkline } from './Sparkline';

/**
 * Stat card (02 §components, restyled 25 Aug; live dashboards 23 Sep):
 * label and number lead, the delta reads as a tinted chip against a named
 * period, and an optional icon medallion and 36px sparkline (end dot on a
 * white ring) make the number feel tracked rather than stated. `barPct` is
 * still accepted for older callers, but a bar labelled "per cent of scale"
 * says nothing — new screens use a sparkline or a benchmark instead.
 */
const DELTA_TONE = {
  success: 'bg-success-soft text-success',
  info: 'bg-sea-soft text-sea',
} as const;

export function StatCard({
  label,
  value,
  delta,
  deltaTone = 'success',
  barPct,
  icon,
  series,
}: {
  label: string;
  value: string;
  delta?: string;
  /** Growth reads success (default); a plain annotation reads info. */
  deltaTone?: keyof typeof DELTA_TONE;
  barPct?: number;
  icon?: IconName;
  series?: readonly number[];
}) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] text-ink-soft">{label}</p>
          <p className="mt-0.5 font-display text-[26px] leading-tight font-bold">{value}</p>
          {delta ? (
            <p className="mt-1.5">
              <span
                className={`inline-block max-w-full rounded-[10px] px-2 py-0.5 text-[11.5px] leading-snug font-bold ${DELTA_TONE[deltaTone]}`}
              >
                {delta}
              </span>
            </p>
          ) : null}
        </div>
        {icon ? (
          <span
            aria-hidden="true"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sea-soft text-sea"
          >
            <Icon name={icon} size={18} />
          </span>
        ) : null}
      </div>
      {series && series.length > 1 ? (
        <Sparkline points={series} height={36} className="mt-auto pt-3" />
      ) : null}
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
