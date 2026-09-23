import type { Period } from '../../../data/analytics';
import { PERIODS } from './model';

/** "30 days | 90 days" — a segmented control of `aria-pressed` buttons. */
export function PeriodSwitch({
  period,
  onChange,
}: {
  period: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Period"
      className="inline-flex rounded-lg border-[1.5px] border-line-strong bg-white p-1"
    >
      {PERIODS.map((p) => {
        const on = p === period;
        return (
          <button
            key={p}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(p)}
            className={`min-h-[44px] min-w-[88px] cursor-pointer rounded-md border-none px-3.5 text-[13px] font-bold tabular-nums transition-colors sm:min-h-[34px] ${
              on ? 'bg-ink text-white' : 'bg-transparent text-ink-soft hover:text-ink'
            }`}
          >
            {p} days
          </button>
        );
      })}
    </div>
  );
}
