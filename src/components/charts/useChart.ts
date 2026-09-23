import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react';

/**
 * Width of an element, tracked with a ResizeObserver so SVG charts draw at
 * their real pixel size (crisp 11px text at 375px as at 1280px). Where there
 * is no ResizeObserver (jsdom) a fixed 600px stands in.
 */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(() => (typeof ResizeObserver === 'undefined' ? 600 : 0));
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.floor(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * True for the one entrance window after the chart first draws, then false
 * for good — so a filter change or a toggled series never replays it, and
 * marks added later simply appear. Reduced motion needs nothing here: the
 * global rule in tokens.css zeroes the animation and its delay, and every
 * mark's own style is its final state.
 */
export function useEntrance(ready: boolean, ms = 800): boolean {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!ready || done) return;
    const t = window.setTimeout(() => setDone(true), ms);
    return () => window.clearTimeout(t);
  }, [ready, done, ms]);
  return ready && !done;
}

export type NavSource = 'pointer' | 'key' | 'touch';

/**
 * Shared interaction for one plot: a single tab stop; arrows (and Home/End,
 * Page keys where the chart maps them) move the active mark; Escape hides
 * it; a mouse hover shows it; a tap pins it and a drag scrubs; a tap
 * elsewhere (or losing focus) dismisses it. The chart supplies how keys move
 * and which mark sits under a pointer; this hook owns the state.
 */
export function usePlotNav<T>(opts: {
  /** The focusable plot element (owned by the chart; read only in effects). */
  ref: RefObject<Element | null>;
  /** The mark to show when the plot takes keyboard focus. */
  initial: () => T | null;
  /** Next mark for a key, or `undefined` when the key is not the chart's. */
  keyMove: (key: string, current: T | null) => T | null | undefined;
  /** The mark under a pointer event, or null. */
  pointAt: (e: PointerEvent<Element>) => T | null;
}) {
  const { ref, initial, keyMove, pointAt } = opts;
  const [active, setActive] = useState<T | null>(null);
  const [source, setSource] = useState<NavSource | null>(null);
  const [pinned, setPinned] = useState(false);

  const show = useCallback((next: T | null, from: NavSource | null) => {
    setActive(next);
    setSource(next === null ? null : from);
  }, []);

  // A pinned tooltip goes when the reader taps anywhere else.
  useEffect(() => {
    if (!pinned) return;
    const onDown = (e: globalThis.PointerEvent) => {
      const el = ref.current;
      if (el && e.target instanceof Node && el.contains(e.target)) return;
      setPinned(false);
      setActive(null);
      setSource(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [pinned, ref]);

  const bind = {
    tabIndex: 0,
    onKeyDown: (e: KeyboardEvent<Element>) => {
      if (e.key === 'Escape') {
        if (active === null) return;
        e.preventDefault();
        e.stopPropagation();
        setPinned(false);
        show(null, null);
        return;
      }
      const next = keyMove(e.key, active);
      if (next === undefined) return;
      // Handled keys stay with the chart: no page scroll, and the guided
      // tour's document-level arrow keys do not step the tour.
      e.preventDefault();
      e.stopPropagation();
      show(next, 'key');
    },
    onFocus: () => {
      if (active === null) show(initial(), 'key');
    },
    onBlur: (e: FocusEvent<Element>) => {
      if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return;
      setPinned(false);
      show(null, null);
    },
    onPointerMove: (e: PointerEvent<Element>) => {
      if (e.pointerType === 'mouse') show(pointAt(e), 'pointer');
      else if (e.buttons !== 0) show(pointAt(e), 'touch');
    },
    onPointerDown: (e: PointerEvent<Element>) => {
      if (e.pointerType === 'mouse') return;
      setPinned(true);
      show(pointAt(e), 'touch');
    },
    onPointerLeave: (e: PointerEvent<Element>) => {
      if (e.pointerType === 'mouse' && !pinned) show(null, null);
    },
  };

  return { active, source, bind, show };
}

/**
 * Keys for a one-dimensional plot of `count` marks. Across a time axis only
 * ←/→ move (↑/↓ keep scrolling the page); a list of rows (`vertical`) also
 * takes ↑/↓.
 */
export function linearKeys(count: number, opts: { page?: number; vertical?: boolean } = {}) {
  const { page = 7, vertical = false } = opts;
  return (key: string, current: number | null): number | null | undefined => {
    const last = count - 1;
    if (last < 0) return undefined;
    const fwd = key === 'ArrowRight' || (vertical && key === 'ArrowDown');
    const back = key === 'ArrowLeft' || (vertical && key === 'ArrowUp');
    if (fwd) return current === null ? 0 : Math.min(last, current + 1);
    if (back) return current === null ? last : Math.max(0, current - 1);
    switch (key) {
      case 'PageDown':
        return current === null ? 0 : Math.min(last, current + page);
      case 'PageUp':
        return current === null ? last : Math.max(0, current - page);
      case 'Home':
        return 0;
      case 'End':
        return last;
      default:
        return undefined;
    }
  };
}

/** Text a screen reader hears for the active mark (mirrors the tooltip). */
export function liveLine(header: string, rows: readonly { value: string; label: string }[]) {
  return `${header}: ${rows.map((r) => `${r.value} ${r.label}`.trim()).join(', ')}`;
}
