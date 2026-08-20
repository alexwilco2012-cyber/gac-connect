import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../store/app';
import { TOUR_STEPS } from './steps';

/** Below this width the coach-mark stops chasing anchors and becomes a sheet. */
const NARROW = 640;

function useIsNarrow() {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < NARROW,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${NARROW - 1}px)`);
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

/**
 * Coach-mark tour engine: the full demo walkthrough, skippable and
 * keyboard-operable, never auto-repeating after dismissal.
 *
 * On a phone the card docks to the bottom of the viewport instead of floating
 * beside its anchor — a 320px card positioned next to an element on a 375px
 * screen covers the thing it is pointing at. The anchor is still scrolled into
 * view, so the step reads the same; only the card moves out of the way.
 */
export function Tour() {
  const tourStep = useApp((s) => s.tourStep);
  const nextTourStep = useApp((s) => s.nextTourStep);
  const prevTourStep = useApp((s) => s.prevTourStep);
  const dismissTour = useApp((s) => s.dismissTour);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const narrow = useIsNarrow();

  const step = tourStep === null ? null : TOUR_STEPS[tourStep];
  const isLast = tourStep !== null && tourStep === TOUR_STEPS.length - 1;

  // Keep the route in sync with the active step.
  useEffect(() => {
    if (step && pathname !== step.route) navigate(step.route);
  }, [step, pathname, navigate]);

  // Position the coach-mark near its anchor once the route has rendered.
  useLayoutEffect(() => {
    if (!step) return;
    const place = () => {
      const anchor = step.anchor
        ? document.querySelector<HTMLElement>(`[data-tour="${step.anchor}"]`)
        : null;
      if (anchor) anchor.scrollIntoView({ block: 'center', behavior: 'auto' });
      else window.scrollTo({ top: 0, behavior: 'auto' });
      if (!anchor || narrow) {
        setPos(null);
        return;
      }
      const r = anchor.getBoundingClientRect();
      setPos({ top: r.bottom + 10, left: Math.max(16, r.left) });
    };
    // Give lazy routes a beat to render their anchors.
    const t = window.setTimeout(place, 350);
    return () => window.clearTimeout(t);
  }, [step, pathname, narrow]);

  // Focus the card on each step; Escape dismisses, arrows step.
  useEffect(() => {
    if (!step) return;
    const t = window.setTimeout(() => cardRef.current?.focus(), 450);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissTour();
      else if (e.key === 'ArrowRight') isLast ? dismissTour() : nextTourStep();
      else if (e.key === 'ArrowLeft') prevTourStep();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [step, dismissTour, nextTourStep, prevTourStep, isLast]);

  if (!step || tourStep === null) return null;

  const docked = narrow || !pos;
  const style = docked
    ? undefined
    : {
        top: Math.min(pos.top, window.innerHeight - 210),
        left: Math.min(pos.left, window.innerWidth - 340),
      };

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label={`Tour step ${tourStep + 1} of ${TOUR_STEPS.length}: ${step.title}`}
      tabIndex={-1}
      className={`fixed z-[95] rounded-xl bg-ink p-4.5 text-white shadow-[0_18px_50px_rgba(4,10,24,0.5)] ${
        docked
          ? 'inset-x-3 bottom-3 mx-auto w-auto max-w-[420px] sm:inset-x-0 sm:mx-auto'
          : 'w-[320px] max-w-[calc(100vw-32px)]'
      }`}
      style={style}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-[11px] font-bold tracking-[0.14em] text-gold-bright uppercase">
          Tour · {tourStep + 1} of {TOUR_STEPS.length}
        </p>
        <div aria-hidden="true" className="flex gap-1">
          {TOUR_STEPS.map((s, i) => (
            <span
              key={s.route + s.title}
              className={`h-1.5 w-1.5 rounded-full ${i === tourStep ? 'bg-gold-bright' : 'bg-white/25'}`}
            />
          ))}
        </div>
      </div>
      <h2 className="mt-1.5 font-display text-[16px] font-bold">{step.title}</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-[#B9C8D6]">{step.body}</p>
      <div className="mt-3.5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={dismissTour}
          className="min-h-[44px] cursor-pointer border-none bg-transparent px-1 text-[12.5px] font-semibold text-[#9FB4C8] hover:text-white"
        >
          Skip tour
        </button>
        <div className="flex items-center gap-2">
          {tourStep > 0 ? (
            <button
              type="button"
              onClick={prevTourStep}
              className="min-h-[44px] cursor-pointer rounded-lg border-[1.5px] border-white/30 bg-transparent px-3 py-2 text-[13px] font-bold text-white hover:border-white"
            >
              Back
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => (isLast ? dismissTour() : nextTourStep())}
            className="min-h-[44px] cursor-pointer rounded-lg border-none bg-gold-bright px-3.5 py-2 text-[13px] font-bold text-ink hover:bg-[#FFD45C]"
          >
            {isLast ? 'Finish' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The way in. Shown on whatever screen you arrive at rather than only on the
 * dashboard, because the QR on the closing slide drops people straight into the
 * platform and they should not have to find the tour to be offered it. Once
 * dismissed it shrinks to a single button rather than disappearing — a panel
 * member who says "no thanks" first and changes their mind five screens later
 * should not have to clear storage to get it back.
 */
export function TourPrompt() {
  const tourDismissed = useApp((s) => s.tourDismissed);
  const tourStep = useApp((s) => s.tourStep);
  const startTour = useApp((s) => s.startTour);
  const dismissTour = useApp((s) => s.dismissTour);

  if (tourStep !== null) return null;

  if (tourDismissed) {
    return (
      <div className="mb-5 flex justify-end">
        <button
          type="button"
          onClick={startTour}
          className="min-h-[44px] cursor-pointer rounded-lg border-[1.5px] border-line-strong bg-white px-3.5 py-2 text-[13px] font-bold text-ink-soft hover:border-sea hover:text-sea"
        >
          Take the guided tour
        </button>
      </div>
    );
  }

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sea-soft bg-sea-soft/60 px-4.5 py-3.5">
      <p className="max-w-[560px] text-[13.5px]">
        <strong>First time here?</strong> A {TOUR_STEPS.length}-stop guided tour walks the whole
        platform in the order it works — a port call from the vessel arriving to the invoice being
        matched.
      </p>
      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={startTour}
          className="min-h-[44px] cursor-pointer rounded-lg border-none bg-sea px-3.5 py-2 text-[13px] font-bold text-white hover:bg-[#0B4C70]"
        >
          Start the tour
        </button>
        <button
          type="button"
          onClick={dismissTour}
          className="min-h-[44px] cursor-pointer rounded-lg border-[1.5px] border-line-strong bg-white px-3.5 py-2 text-[13px] font-bold text-ink-soft hover:border-sea"
        >
          No thanks
        </button>
      </div>
    </div>
  );
}
