import { useEffect, useRef, useState } from 'react';
import { PillarsRoof } from '../../components/motif/PillarsRoof';

/**
 * The consolidation story, built rather than stated.
 *
 * The motif used to arrive finished, with the tier ladder printed underneath —
 * which asks the reader to work out that the pillars and the rungs are the same
 * claim. Here they are one animation: each pillar rises, its rung lights with
 * it, and when the fourth is standing the roof drops on and turns gold. The
 * ladder cannot say something the motif does not, because one `lit` count
 * drives both.
 *
 * It runs when the section enters the viewport (once), not on mount, or it
 * would play out of sight and be finished before anyone scrolls to it.
 */

/** Pillar, then its label a third of a second later. State starts each one, so
 *  there is no long chain of CSS delays to keep in step with the ladder. */
const RISE = 'pillar-rise .8s cubic-bezier(.34,1.56,.64,1) both';
const LABEL = 'label-in .5s .35s ease both';

/** 0.2s, then one every 0.55s; the roof follows the fourth pillar. */
const FIRST_MS = 200;
const STEP_MS = 550;

const PILLARS = [
  { label: 'Agency', on: true },
  { label: 'Logistics', on: true },
  { label: 'Customs', on: true },
  { label: 'Procurement', on: true },
];

/** The ladder as the rule actually works: you take the best rung you reach,
 *  you do not add them up (03 §3.1 — non-cumulative max(2,4,7)). */
const LADDER = [
  { label: 'Agency', pct: '2%' },
  { label: '+ Logistics', pct: '4%' },
  { label: '+ Customs', pct: '7%' },
];

export function ConsolidationMotif() {
  const ref = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(0);
  const [roof, setRoof] = useState(false);

  useEffect(() => {
    const el = ref.current;
    // Straight to the finished motif when there is no observer to wait on
    // (jsdom, older Safari) or when motion is not wanted: an empty frame that
    // fills in over two seconds is worse than the picture, and the section has
    // to read as the whole claim either way.
    const still =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!el || still || !('IntersectionObserver' in window)) {
      setLit(PILLARS.length);
      setRoof(true);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        PILLARS.forEach((_, i) =>
          timers.push(setTimeout(() => setLit(i + 1), FIRST_MS + i * STEP_MS)),
        );
        timers.push(setTimeout(() => setRoof(true), FIRST_MS + PILLARS.length * STEP_MS));
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  const step = (i: number, anim: string) => (lit >= i ? anim : 'none');

  return (
    <div ref={ref}>
      <PillarsRoof
        pillars={PILLARS}
        fullStack={roof}
        className="mx-auto mt-8 w-[min(420px,88vw)] overflow-visible"
        reveal={{
          pillar: (i) => step(i + 1, RISE),
          label: (i) => step(i + 1, LABEL),
          roof: roof
            ? 'roof-drop .7s cubic-bezier(.34,1.3,.64,1) both, roof-gold .6s .55s ease both'
            : 'none',
          wordmark: roof ? 'fade-in .5s .8s ease forwards' : 'none',
        }}
        glint={roof ? 'glint .7s .6s ease-out both' : 'none'}
      />

      <ul className="mt-7 flex list-none flex-wrap items-center justify-center gap-2.5">
        {LADDER.map((t, i) => {
          const on = lit >= i + 1;
          // The last rung is the Full Stack rung: it goes gold with the roof.
          const gold = roof && i === LADDER.length - 1;
          return (
            <li key={t.label} className="flex items-center gap-2.5">
              {i > 0 ? (
                <span aria-hidden="true" className="text-[16px] text-line-strong">
                  →
                </span>
              ) : null}
              <span
                className={`inline-flex items-center gap-2.5 rounded-brand border-[1.5px] px-4 py-2.5 shadow-card transition-[border-color,background-color,opacity] duration-[400ms] ${
                  gold
                    ? 'border-gold bg-gold-soft opacity-100'
                    : on
                      ? 'border-sea bg-[#F4F8FB] opacity-100'
                      : 'border-line bg-white opacity-45'
                }`}
              >
                <span className="text-[13.5px] font-semibold text-ink-soft">{t.label}</span>
                <strong
                  className={`font-display text-[20px] font-bold ${
                    gold ? 'text-gold-deep' : 'text-sea'
                  }`}
                >
                  {t.pct}
                </strong>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
