import type { Vessel } from '../../data/vessels';
import { TIMELINE_TICKS, TIMELINE_WINDOW_HOURS } from '../../data/vessels';
import { Pill } from './Pill';

const BAR_TONE: Record<Vessel['statusPill']['tone'], string> = {
  info: 'bg-sea text-white',
  warn: 'bg-warn-soft text-warn',
  success: 'bg-success-soft text-success',
};

const PILL_TONE = { info: 'info', warn: 'warn', success: 'verified' } as const;

/**
 * The 48-hour strip: one row per vessel, a bar for the time she is alongside
 * inside the window, gridlines every twelve hours and a "now" line at the
 * left edge. Hand-rolled CSS, no chart dependency. Everything variable-width
 * (name, schedule, status pill) lives in the label column so every track is
 * identical and lines up with the axis. The strip is decorative — the label
 * column carries the same facts as text, and the track never renders on a
 * phone.
 *
 * Bars, not pins (5 Sep handoff): an arrival runs from its ETA to the end of
 * the window, a sailing from now to its ETD, so the strip reads as who is
 * on the quay when, rather than as three moments.
 */
export function PortCallTimeline({ vessels }: { vessels: readonly Vessel[] }) {
  const pct = (h: number) => `${(h / TIMELINE_WINDOW_HOURS) * 100}%`;
  /** The bar's edges in percent of the window; arrivals stop 2% short of
   *  the strip's end so the rounded corner reads as "and on". */
  const span = (v: Vessel) =>
    v.timeline.kind === 'ETA'
      ? { left: pct(v.timeline.offsetHours), right: '2%' }
      : { left: '0%', right: pct(TIMELINE_WINDOW_HOURS - v.timeline.offsetHours) };
  const label = (v: Vessel) =>
    v.timeline.kind === 'ETA' ? `${v.timeline.label} →` : `Alongside · sails ${v.timeline.label}`;

  return (
    <div>
      {/* Axis — labels centred on their gridlines, ends flush. Part of the
          drawing, so hidden from assistive tech like the tracks below; the
          twelve-hour labels only fit once the grid column is wide enough. */}
      <div aria-hidden="true" className="ml-[204px] hidden md:block">
        <div className="relative h-4 text-[10.5px] font-semibold tracking-[0.04em] text-ink-soft uppercase">
          {TIMELINE_TICKS.map((t, i) => {
            const first = i === 0;
            const last = i === TIMELINE_TICKS.length - 1;
            const minor = t.offsetHours % 24 !== 0;
            return (
              <span
                key={t.offsetHours}
                className={`absolute whitespace-nowrap ${first || last ? '' : '-translate-x-1/2'} ${
                  minor ? 'hidden xl:block' : ''
                }`}
                style={first ? { left: 0 } : last ? { right: 0 } : { left: pct(t.offsetHours) }}
              >
                {t.label}
              </span>
            );
          })}
        </div>
      </div>

      <div className="mt-1.5 space-y-3">
        {vessels.map((v) => (
          <div key={v.id} className="flex items-center gap-3">
            {/* Vessel label — the readable version of the whole row */}
            <div className="min-w-0 flex-1 md:w-[192px] md:flex-none">
              <p className="text-[13.5px] leading-tight font-semibold">{v.name}</p>
              <p className="mt-0.5 text-[11.5px] leading-tight text-ink-soft">{v.scheduleLine}</p>
              <p className="mt-1">
                <Pill tone={PILL_TONE[v.statusPill.tone]}>{v.statusPill.label}</Pill>
              </p>
            </div>

            {/* Track */}
            <div
              aria-hidden="true"
              className="relative hidden h-9 min-w-0 flex-1 self-center overflow-hidden rounded-lg bg-paper md:block"
            >
              {/* gridlines every 12h */}
              {TIMELINE_TICKS.slice(1, -1).map((t) => (
                <span
                  key={t.offsetHours}
                  className="absolute inset-y-0 w-px bg-line"
                  style={{ left: pct(t.offsetHours) }}
                />
              ))}
              {/* the now line — ink, not gold: gold is reserved */}
              <span className="absolute inset-y-0 left-0 w-[3px] rounded-full bg-ink" />
              {/* the bar: text clipped, never wrapped, and transparent once the
                  track is too narrow to carry it (the label column already does) */}
              <span
                className={`absolute inset-y-1.5 box-border flex items-center overflow-hidden rounded-md px-2 text-[11px] font-bold text-ellipsis whitespace-nowrap max-[999px]:text-transparent ${
                  BAR_TONE[v.statusPill.tone]
                } ${v.timeline.kind === 'ETD' ? 'pl-3' : ''}`}
                style={span(v)}
              >
                {label(v)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-2.5 hidden text-[11.5px] text-ink-soft md:block">
        <span
          aria-hidden="true"
          className="mr-1.5 inline-block h-2.5 w-[3px] translate-y-[1px] rounded-full bg-ink"
        />
        Now · Thursday 08:00 — the strip covers the next 48 hours.
      </p>
    </div>
  );
}
