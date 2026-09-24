import { ALERT_TIERS } from '../../lib/svs';
import { VIZ } from './palette';

export type ExpiryState = 'ok' | 'due' | 'lapsed' | 'pending' | 'info' | 'rejected';

const COLOUR: Record<ExpiryState, string> = {
  ok: VIZ.status.ok,
  due: VIZ.status.due,
  lapsed: VIZ.status.lapsed,
  pending: VIZ.other,
  info: VIZ.other,
  rejected: VIZ.other,
};

/** Status never rides on colour alone: each certificate state has a glyph. */
const GLYPH: Record<ExpiryState, string> = {
  ok: '✓',
  due: '⚠',
  lapsed: '✗',
  pending: '',
  info: '',
  rejected: '',
};

/** The alert tiers (90 / 30 / 7), nearest first — the supplier rule's own list. */
const RULES = [...ALERT_TIERS].sort((a, b) => a - b);

/**
 * Days left on a certificate (spec §3 Certificates): a 0–180 day bar whose
 * colour comes from the certificate's state (`lib/svsDesk`, which reads
 * `alertTier`), with 1px rules at each of `lib/svs`'s `ALERT_TIERS` — so
 * neither the colour nor the rules can drift from the supplier rule. Longer
 * terms clamp with a pointed end and keep their real number; a submission
 * awaiting the SVS team is neutral grey. Static: `role="img"`.
 */
export function ExpiryBar({
  daysLeft,
  state,
  max = 180,
  label,
  scale = false,
}: {
  daysLeft: number | null;
  state: ExpiryState;
  max?: number;
  /** What a screen reader hears: "Expires in 171 days, 13 Mar 2027". */
  label: string;
  /** Show the rules' day counts ("7 · 30 · 90 days") under them, once, on the first row. */
  scale?: boolean;
}) {
  const lapsed = state === 'lapsed' || (daysLeft !== null && daysLeft <= 0);
  const over = daysLeft !== null && daysLeft > max;
  const p = daysLeft === null || lapsed ? 0 : Math.min(1, daysLeft / max) * 100;
  const colour = lapsed ? VIZ.status.lapsed : COLOUR[state];
  const glyph = lapsed ? GLYPH.lapsed : GLYPH[state];
  const text = lapsed
    ? 'Lapsed'
    : daysLeft === null
      ? '—'
      : `${daysLeft.toLocaleString('en-GB')} ${daysLeft === 1 ? 'day' : 'days'}`;

  return (
    <div role="img" aria-label={label} className="select-none">
      <div className="flex items-center gap-2.5">
        <div className="relative h-3.5 min-w-0 flex-1">
          <span
            className="absolute inset-x-0 top-[3px] block h-2 rounded-full"
            style={{ background: VIZ.hover }}
          />
          {p > 0 ? (
            <span
              className="absolute top-[3px] left-0 block h-2 rounded-full"
              style={{
                width: `${p}%`,
                minWidth: 4,
                background: colour,
                ...(over
                  ? {
                      borderRadius: '9999px 0 0 9999px',
                      clipPath:
                        'polygon(0 0, calc(100% - 5px) 0, 100% 50%, calc(100% - 5px) 100%, 0 100%)',
                    }
                  : {}),
              }}
            />
          ) : null}
          {RULES.map((d) => (
            <span
              key={d}
              className="absolute top-0 block h-3.5 w-px"
              style={{ left: `${(d / max) * 100}%`, background: VIZ.context }}
            />
          ))}
          {lapsed ? (
            <span
              className="absolute top-[1px] left-0 block h-3 w-3 rounded-full"
              style={{ background: VIZ.status.lapsed, boxShadow: `0 0 0 2px ${VIZ.surface}` }}
            />
          ) : null}
        </div>
        <span className="w-[72px] shrink-0 text-right text-[12px] font-semibold whitespace-nowrap text-ink tabular-nums">
          {glyph ? (
            <span aria-hidden="true" className="mr-1" style={{ color: colour }}>
              {glyph}
            </span>
          ) : null}
          {text}
        </span>
      </div>
      {scale ? (
        <div className="relative mt-0.5 mr-[82px] h-3.5 text-[10.5px] leading-none text-ink-soft">
          {RULES.map((d, i) => (
            <span
              key={d}
              className="absolute top-0.5 -translate-x-1/2 whitespace-nowrap tabular-nums"
              style={{ left: `${(d / max) * 100}%` }}
            >
              {i === RULES.length - 1 ? `${d} days` : d}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
