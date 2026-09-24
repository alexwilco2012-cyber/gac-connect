import { Icon, type IconName } from '../../../components/ui/Icon';

export interface SvsKpi {
  id: 'onboarding' | 'evidence' | 'alerts' | 'verify';
  label: string;
  value: string;
  note: string;
  icon: IconName;
  /** Alerts are a status, so their tile takes the warn tone; the rest stay sea. */
  tone?: 'sea' | 'warn';
}

/**
 * The SVS team's four numbers (spec §4.5): small tiles, 22px figures, live
 * from the store and the compliance watch — so approving an applicant or a
 * certificate moves them at once. One bordered strip, the way the agent
 * desk's KPIs read, so the figures scan as a row rather than four cards.
 */
export function SvsKpis({ kpis }: { kpis: readonly SvsKpi[] }) {
  return (
    <dl
      data-testid="svs-kpis"
      className="mt-4 grid grid-cols-2 overflow-hidden rounded-brand border border-line bg-white shadow-card lg:grid-cols-4"
    >
      {kpis.map((k) => (
        <div
          key={k.id}
          data-testid={`svs-kpi-${k.id}`}
          className="-mb-px flex min-w-0 items-start gap-3 px-4 py-3.5 shadow-[inset_-1px_0_0_#E5EAF1,inset_0_-1px_0_#E5EAF1] sm:px-5 sm:py-4"
        >
          <span
            aria-hidden="true"
            className={`mt-0.5 hidden h-8 w-8 shrink-0 place-items-center rounded-lg sm:grid ${
              k.tone === 'warn' ? 'bg-warn-soft text-warn' : 'bg-sea-soft text-sea'
            }`}
          >
            <Icon name={k.icon} size={16} />
          </span>
          <div className="min-w-0">
            <dt className="text-[12px] leading-snug text-ink-soft">{k.label}</dt>
            <dd
              data-kpi-value=""
              className="mt-0.5 font-display text-[22px] leading-tight font-bold tabular-nums"
            >
              {k.value}
            </dd>
            <dd className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">{k.note}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
