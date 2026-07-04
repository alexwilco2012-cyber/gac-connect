import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../store/app';
import { TOUR_STEPS } from './steps';

/**
 * Coach-mark tour engine (01 §C): five stops across the core flows.
 * Skippable, keyboard-operable, never auto-repeats after dismissal.
 */
export function Tour() {
  const tourStep = useApp((s) => s.tourStep);
  const nextTourStep = useApp((s) => s.nextTourStep);
  const dismissTour = useApp((s) => s.dismissTour);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const step = tourStep === null ? null : TOUR_STEPS[tourStep];
  const isLast = tourStep !== null && tourStep === TOUR_STEPS.length - 1;

  // Keep the route in sync with the active step.
  useEffect(() => {
    if (step && pathname !== step.route) navigate(step.route);
  }, [step, pathname, navigate]);

  // Position the coach-mark near its anchor once the route has rendered.
  useLayoutEffect(() => {
    if (!step) return;
    let raf = 0;
    const place = () => {
      const anchor = step.anchor
        ? document.querySelector<HTMLElement>(`[data-tour="${step.anchor}"]`)
        : null;
      if (anchor) {
        const r = anchor.getBoundingClientRect();
        anchor.scrollIntoView({ block: 'center', behavior: 'auto' });
        const r2 = anchor.getBoundingClientRect();
        setPos({ top: r2.bottom + 10, left: Math.max(16, r.left) });
      } else {
        setPos(null); // centred fallback
      }
    };
    // Give lazy routes a beat to render their anchors.
    raf = window.setTimeout(place, 350) as unknown as number;
    return () => window.clearTimeout(raf);
  }, [step, pathname]);

  // Focus the card on each step; Escape dismisses.
  useEffect(() => {
    if (!step) return;
    const t = window.setTimeout(() => cardRef.current?.focus(), 450);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissTour();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [step, dismissTour]);

  if (!step || tourStep === null) return null;

  const style = pos
    ? {
        top: Math.min(pos.top, window.innerHeight - 190),
        left: Math.min(pos.left, window.innerWidth - 340),
      }
    : { top: '40%', left: '50%', transform: 'translateX(-50%)' as const };

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label={`Tour step ${tourStep + 1} of ${TOUR_STEPS.length}: ${step.title}`}
      tabIndex={-1}
      className="fixed z-[95] w-[320px] max-w-[calc(100vw-32px)] rounded-xl bg-ink p-4.5 text-white shadow-[0_18px_50px_rgba(4,10,24,0.5)]"
      style={style}
    >
      <p className="font-display text-[11px] font-bold tracking-[0.14em] text-gold-bright uppercase">
        Tour · {tourStep + 1} of {TOUR_STEPS.length}
      </p>
      <h2 className="mt-1.5 font-display text-[16px] font-bold">{step.title}</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-[#B9C8D6]">{step.body}</p>
      <div className="mt-3.5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={dismissTour}
          className="cursor-pointer border-none bg-transparent p-1 text-[12.5px] font-semibold text-[#9FB4C8] hover:text-white"
        >
          Skip tour
        </button>
        <button
          type="button"
          onClick={() => (isLast ? dismissTour() : nextTourStep())}
          className="cursor-pointer rounded-lg border-none bg-gold-bright px-3.5 py-2 text-[13px] font-bold text-ink hover:bg-[#FFD45C]"
        >
          {isLast ? 'Finish' : 'Next →'}
        </button>
      </div>
    </div>
  );
}

/** Dismissible dashboard affordance that starts the tour (01 §C). */
export function TourPrompt() {
  const tourDismissed = useApp((s) => s.tourDismissed);
  const tourStep = useApp((s) => s.tourStep);
  const startTour = useApp((s) => s.startTour);
  const dismissTour = useApp((s) => s.dismissTour);

  if (tourDismissed || tourStep !== null) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sea-soft bg-sea-soft/60 px-4.5 py-3">
      <p className="text-[13.5px]">
        <strong>First time here?</strong> A five-stop tour walks the core flows in under a minute.
      </p>
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={startTour}
          className="cursor-pointer rounded-lg border-none bg-sea px-3.5 py-2 text-[13px] font-bold text-white hover:bg-[#0B4C70]"
        >
          Start the tour
        </button>
        <button
          type="button"
          onClick={dismissTour}
          className="cursor-pointer rounded-lg border-[1.5px] border-line-strong bg-white px-3.5 py-2 text-[13px] font-bold text-ink-soft hover:border-sea"
        >
          No thanks
        </button>
      </div>
    </div>
  );
}
