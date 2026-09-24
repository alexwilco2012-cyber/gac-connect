/* Deck chart kit (live dashboards, 23 Sep 2026, task T3).

   The presenter's plain-JS port of the site's hand-rolled charts in
   src/components/charts (spec section 6 of
   docs/superpowers/specs/2026-09-23-live-dashboards-design.md). Same props,
   same geometry, same labels, same tooltip and keyboard behaviour, so a chart
   reads identically on both surfaces. No chart library: SVG and HTML made
   with React.createElement, inline styles and hex colours only (the deck has
   no CSS variables and its stylesheet is not extended for this).

   How it plugs into the deck. Every VZ.* call returns a React element, and
   the dc-runtime renders an element raw when a binding interpolates it in
   text position, e.g. {{ anViewsChart }}. Build the element in a feature
   module's vals(). The components are function components with hooks,
   defined once here so React keeps their identity (and their hover state)
   across the full-app re-render that every setState causes. Hover, focus and
   tooltip state is local to each chart, so pointing at a chart never
   re-renders the deck. Verified on dev.html#/kitchen-sink.

   API (the site kit's props, as plain objects):
     VZ.figure({ title, subtitle, takeaway, legend, headline, action, table,
                 footnote, testId, as: 'h2' | 'h3', variant: 'card' | 'plain',
                 children })
     VZ.timeSeries({ labels, ariaLabel, panels: [{ id, label,
                     kind: 'area' | 'columns', values, format, axisFormat,
                     binLabels, benchmark: { label, values } }] })
       a panel with fewer values than labels is binned from the end
       (13 weekly columns under a 90-day axis)
     VZ.stacked({ categories, series: [{ id, label, color, values }], format,
                  axisFormat, lower: { label, color, values, format },
                  directLabelLast, ariaLabel })
     VZ.hbars({ rows: [{ id, label, value, valueLabel, tag, color }], max,
                format, ariaLabel })
     VZ.funnel({ steps: [{ label, value }], format, rateLabels, ariaLabel })
     VZ.benchmark({ value, benchmark, max, format, lowerIsBetter, valueLabel,
                    benchmarkLabel, ariaLabel })
     VZ.heatmap({ rows, cols, values, bins, cellLabel, ariaLabel })
     VZ.expiry({ daysLeft, state, max, label, scale })
       label is what a screen reader hears; the visible text is the days
     VZ.sparkline(values, { height, stroke, endDot })
     VZ.legend(items)             items: [{ label, color, shape: 'rect' | 'line' }]
   and helpers: VZ.kpi (the site's StatCard), VZ.stat (a headline figure),
   VZ.segmented (the deck's pressed-button switch), VZ.chip, VZ.table,
   VZ.niceTicks, VZ.fitTicks, VZ.num, VZ.gbp, VZ.compactGbp, VZ.C (the
   palette, the site's VIZ) and VZ.LINE_COLOURS.

   Rules kept here (spec section 6): colour follows the entity, never its
   rank; gold never appears; text never wears a series colour; every chart
   sits in a figure with a "Show the numbers" table; each plot is one tab
   stop (arrows, Page Up/Down, Home/End, Escape) with an aria-live line
   repeating the tooltip; tap pins, drag scrubs, a tap elsewhere dismisses;
   one entrance on mount, skipped under reduced motion, and the resting state
   is each element's own style, so nothing is ever left hidden.

   Script-scope rules: the deck is one script, so every top-level name here
   starts with VZ. Never put a less-than character inside a string literal.
   The kitchen sink (partials/53-kitchen-sink.html) shows every chart through
   the vzGallery* bindings registered at the foot of this file. */

const VZ_h = React.createElement;

/* ---------- palette (src/components/charts/palette.ts) ---------- */

const VZ_C = {
  sea: '#0E5E8A',
  sky: '#3F95C6',
  rose: '#C86892',
  seafoam: '#5DCAB7',
  cornflower: '#5C77DF',
  other: '#8595A8',
  context: '#8595A8',
  deduction: '#9AA9BA',
  derived: '#33475F',
  grid: '#E5EAF1',
  axis: '#CBD6E2',
  tick: '#5B6B7F',
  ref: '#0A2540',
  track: '#E8F1F7',
  hover: '#F1F4F8',
  surface: '#FFFFFF',
  ink: '#0A2540',
  inkSoft: '#33475F',
  seq: ['#E0EFFA', '#A8CFE9', '#6FABD2', '#3B83B1', '#0E5E8A'],
  ord: ['#73B0D7', '#4F94BF', '#2F79A5', '#0E5E8A', '#0A4A6E'],
  status: { ok: '#047857', due: '#A84D08', lapsed: '#B91C1C' },
  promoted: '#5B3FA8',
  line: '#E5EAF1',
};
/* Fixed to the entity in every chart and every state: toggling a pillar
   never repaints the lines that remain. */
const VZ_LINE_COLOURS = {
  agency: '#0E5E8A',
  logistics: '#3F95C6',
  customs: '#C86892',
  procurement: '#5DCAB7',
};
const VZ_FONT = "'Inter','Segoe UI','Helvetica Neue',Arial,sans-serif";
const VZ_DISPLAY = "'Space Grotesk','Segoe UI',sans-serif";
const VZ_SR = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
};
const VZ_CARD = {
  background: '#FFFFFF',
  border: '1px solid #E5EAF1',
  borderRadius: '14px',
  boxShadow: '0 1px 3px rgba(10,37,64,.07)',
  padding: '22px',
  boxSizing: 'border-box',
};
const VZ_TONES = {
  success: ['#E7F4EF', '#047857'],
  info: ['#E8F1F7', '#0E5E8A'],
  warn: ['#FBF0E1', '#A84D08'],
  danger: ['#FBEAEA', '#B91C1C'],
  neutral: ['#EEF2F6', '#33475F'],
};
const VZ_TOUCH = '(max-width: 639px)';
const VZ_NAV_HINT =
  'Use the arrow keys to move between points, Home and End to jump to the ends, and Escape to hide the details.';
const VZ_GRID_HINT =
  'Use the arrow keys to move between cells, Home and End to jump along a row, and Escape to hide the details.';
/* A 3px surface-coloured halo so a direct label reads over lines and grid. */
const VZ_HALO = {
  stroke: '#FFFFFF',
  strokeWidth: 3,
  strokeLinejoin: 'round',
  paintOrder: 'stroke',
};

/* ---------- formatting ---------- */

function VZ_num(n) {
  return Number(n).toLocaleString('en-GB');
}
function VZ_gbp(n) {
  return '£' + Math.round(n).toLocaleString('en-GB');
}
function VZ_compactGbp(n) {
  if (n >= 1000000) return '£' + (n / 1000000).toFixed(1) + 'm';
  if (n >= 1000) return '£' + Math.round(n / 1000) + 'k';
  return VZ_gbp(n);
}
/* Round to 0.1px: crisp enough, and keeps path data short. */
function VZ_px(n) {
  return Math.round(n * 10) / 10;
}
function VZ_clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function VZ_max(list) {
  let m = 0;
  (list || []).forEach((v) => {
    if (typeof v === 'number' && v > m) m = v;
  });
  return m;
}
/* Rough rendered width of a label, used only to size gutters and to skip a
   label that would collide, never to clip one. */
function VZ_textWidth(s, size, bold) {
  return String(s).length * (size || 11) * (bold ? 0.62 : 0.58);
}
/* Space between a y-axis tick label's right edge and the plot. */
const VZ_TICK_GAP = 8;
/* Left gutter for right-anchored y-axis ticks drawn at plotLeft - TICK_GAP
   (svg.ts tickGutter). Inter draws '£' and tabular figures nearer 0.64em
   than textWidth's 0.58, so the widest tick gets 4px of slack; without it
   '£500' starts 1.6px left of the chart and loses the stroke of its '£'. */
function VZ_tickGutter(ticks, min) {
  return Math.max.apply(null, [min].concat(ticks.map((t) => VZ_textWidth(t) + VZ_TICK_GAP + 4)));
}
function VZ_liveLine(header, rows) {
  return header + ': ' + rows.map((r) => (r.value + ' ' + r.label).trim()).join(', ');
}

/* ---------- geometry (src/components/charts/scale.ts) ---------- */

/* Clean ticks from zero: steps of 1, 2 or 5 x 10^n; `integer` forbids
   fractional steps for counts of things. 38 gives 0-40 in tens. */
function VZ_niceTicks(max, count, opts) {
  const c = count || 5;
  if (!(max > 0) || !isFinite(max)) return [0];
  const rough = max / Math.max(1, c);
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  let step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  if (opts && opts.integer) step = Math.max(1, Math.round(step));
  const top = Math.ceil(max / step - 1e-9) * step;
  const out = [];
  for (let k = 0; k * step <= top + step * 1e-9; k++) out.push(Number((k * step).toFixed(10)));
  return out;
}
/* The tightest clean axis for `max` whose tick count sits inside
   [minTicks, maxTicks] (default 4 to 6), so £42k tops out at £50k rather
   than £60k. Ties go to fewer ticks; falls back to niceTicks(max, 4). */
function VZ_fitTicks(max, opts) {
  const o = opts || {};
  const minTicks = o.minTicks === undefined ? 4 : o.minTicks;
  const maxTicks = o.maxTicks === undefined ? 6 : o.maxTicks;
  let best = null;
  [2, 3, 4, 5].forEach((count) => {
    const t = VZ_niceTicks(max, count, { integer: o.integer });
    if (t.length < minTicks || t.length > maxTicks) return;
    const top = t[t.length - 1];
    const bestTop = best ? best[best.length - 1] : Infinity;
    if (top < bestTop || (top === bestTop && t.length < best.length)) best = t;
  });
  return best || VZ_niceTicks(max, 4, { integer: o.integer });
}
/* Band scale: bars at most 24px, 60% of the band, and at least a 2px gap. */
function VZ_bandLayout(n, width, start) {
  const band = n > 0 ? width / n : width;
  const bar = Math.max(0.5, Math.min(24, band * 0.6, band - 2));
  const s = start || 0;
  return {
    band: band,
    bar: bar,
    left: (i) => s + i * band + (band - bar) / 2,
    centre: (i) => s + (i + 0.5) * band,
  };
}
/* Stack non-zero values upwards; the 2px gap is geometric (taken off the
   bottom of every segment above the first), never a stroke, and only the
   top segment gets the rounded data end. */
function VZ_stackSegments(values, toPx, baseline) {
  let last = -1;
  values.forEach((v, i) => {
    if (v > 0) last = i;
  });
  const out = [];
  let cum = 0;
  values.forEach((v, i) => {
    if (!(v > 0)) return;
    const bottomPx = baseline - toPx(cum);
    const topPx = baseline - toPx(cum + v);
    cum += v;
    const bottom = out.length === 0 ? bottomPx : bottomPx - 2;
    const height = Math.max(1, bottom - topPx);
    const top = i === last;
    out.push({
      index: i,
      y: Math.min(topPx, bottom - height),
      height: height,
      radius: top ? Math.min(4, height) : 0,
      top: top,
    });
  });
  return out;
}
/* A column with its two top corners rounded and a square baseline. */
function VZ_columnPath(x, y, w, h, radius) {
  const r = Math.max(0, Math.min(radius === undefined ? 4 : radius, w / 2, h));
  const b = VZ_px(y + h);
  const L = VZ_px(x);
  const R = VZ_px(x + w);
  const T = VZ_px(y);
  if (r === 0)
    return 'M' + L + ' ' + b + 'L' + L + ' ' + T + 'L' + R + ' ' + T + 'L' + R + ' ' + b + 'Z';
  return (
    'M' +
    L +
    ' ' +
    b +
    'L' +
    L +
    ' ' +
    VZ_px(y + r) +
    'Q' +
    L +
    ' ' +
    T +
    ' ' +
    VZ_px(x + r) +
    ' ' +
    T +
    'L' +
    VZ_px(x + w - r) +
    ' ' +
    T +
    'Q' +
    R +
    ' ' +
    T +
    ' ' +
    R +
    ' ' +
    VZ_px(y + r) +
    'L' +
    R +
    ' ' +
    b +
    'Z'
  );
}
/* Heatmap bin for a value: the last bin whose lower bound it reaches. */
function VZ_quantize(v, bins) {
  let idx = 0;
  bins.forEach((lo, i) => {
    if (v >= lo) idx = i;
  });
  return idx;
}
/* Range labels for the scale legend: 0, 1-2, 3-5, 6-9, 10+ */
function VZ_binLabels(bins) {
  return bins.map((lo, i) => {
    const next = bins[i + 1];
    if (next === undefined) return lo + '+';
    return next - 1 <= lo ? String(lo) : lo + '–' + (next - 1);
  });
}
/* Which of the five sequential steps bin i of len uses (ends kept). */
function VZ_seqIndex(i, len) {
  if (len <= 1) return 4;
  return Math.round((i * 4) / (len - 1));
}
function VZ_nearestIndex(pos, start, band, n) {
  if (n <= 0 || !(band > 0)) return 0;
  return Math.max(0, Math.min(n - 1, Math.floor((pos - start) / band)));
}
/* First maximum, and whether it is the only one (the single peak). */
function VZ_peakIndex(values) {
  if (!values.length) return { index: -1, single: false };
  const max = Math.max.apply(null, values);
  if (!(max > 0)) return { index: -1, single: false };
  return { index: values.indexOf(max), single: values.filter((v) => v === max).length === 1 };
}
/* Evenly spaced x-axis labels that keep the first and the last. */
function VZ_xTickIndices(n, width, minSpacing) {
  if (n <= 1) return [0];
  const count = Math.min(n, Math.max(2, Math.floor(width / minSpacing)));
  const out = [];
  for (let k = 0; k < count; k++) {
    const i = Math.round((k * (n - 1)) / (count - 1));
    if (out[out.length - 1] !== i) out.push(i);
  }
  return out;
}
/* n labels into m bins that end on the last label (weekly sums ending
   yesterday): each bin is ceil(n/m) long, the first takes the remainder. */
function VZ_binRanges(n, m) {
  if (m <= 0) return [];
  const size = Math.ceil(n / m);
  const out = [];
  for (let k = m - 1; k >= 0; k--) {
    const end = Math.max(0, n - 1 - k * size);
    out.push([Math.max(0, end - size + 1), end]);
  }
  return out;
}
/* Push label positions apart to at least minGap inside [min, max], keeping
   their order; the result matches the input order. */
function VZ_spreadLabels(ys, minGap, min, max) {
  const order = ys.map((y, i) => ({ y: y, i: i })).sort((a, b) => a.y - b.y);
  const pos = order.map((o) => o.y);
  for (let k = 1; k < pos.length; k++) pos[k] = Math.max(pos[k], pos[k - 1] + minGap);
  if (pos.length && pos[pos.length - 1] > max) {
    pos[pos.length - 1] = max;
    for (let k = pos.length - 2; k >= 0; k--) pos[k] = Math.min(pos[k], pos[k + 1] - minGap);
  }
  if (pos.length && pos[0] < min) {
    pos[0] = min;
    for (let k = 1; k < pos.length; k++) pos[k] = Math.max(pos[k], pos[k - 1] + minGap);
  }
  const out = new Array(ys.length);
  order.forEach((o, k) => {
    out[o.i] = pos[k];
  });
  return out;
}
function VZ_edgeAnchor(pct) {
  if (pct < 12) return 'start';
  if (pct > 88) return 'end';
  return 'middle';
}
/* Tooltip position inside its chart box, 12px off the anchor: 'side' sits
   beside a crosshair or column (right, flipping left), vertically centred
   and clamped; 'above' sits over a mark (flipping below it: `below` is the
   mark's bottom edge), centred and clamped. It never covers the anchor
   unless the box is too narrow to avoid it. */
function VZ_placeTooltip(p) {
  const off = p.offset === undefined ? 12 : p.offset;
  if (p.placement === 'side') {
    const right = p.x + off;
    const leftSide = p.x - off - p.width;
    let left;
    if (right + p.width <= p.boxWidth) left = right;
    else if (leftSide >= 0) left = leftSide;
    /* neither side fits: take the roomier side and clamp inside the box */
    else left = p.boxWidth - p.x > p.x ? right : leftSide;
    left = VZ_clamp(left, 0, Math.max(0, p.boxWidth - p.width));
    const top = VZ_clamp(p.y - p.height / 2, 0, Math.max(0, p.boxHeight - p.height));
    return { left: Math.round(left), top: Math.round(top) };
  }
  const left = VZ_clamp(p.x - p.width / 2, 0, Math.max(0, p.boxWidth - p.width));
  let top = p.y - off - p.height;
  if (top < 0) top = (p.below === undefined ? p.y : p.below) + off;
  return { left: Math.round(left), top: Math.round(top) };
}

/* ---------- hooks (src/components/charts/useChart.ts) ---------- */

/* The element's width in CSS pixels, kept current by a ResizeObserver and
   measured before the first paint, so SVG charts draw at real size (crisp
   11px text at 375px as at 1280px). */
function VZ_useWidth() {
  const ref = React.useRef(null);
  const [w, setW] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const next = Math.floor(el.getBoundingClientRect().width);
      if (next) setW((prev) => (prev === next ? prev : next));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/* True while a media query matches, kept current. */
function VZ_useMedia(query) {
  const get = () => {
    try {
      return window.matchMedia(query).matches;
    } catch (e) {
      return false;
    }
  };
  const [on, setOn] = React.useState(get);
  React.useEffect(() => {
    let mq = null;
    try {
      mq = window.matchMedia(query);
    } catch (e) {
      return undefined;
    }
    const sync = () => setOn(mq.matches);
    sync();
    if (mq.addEventListener) mq.addEventListener('change', sync);
    else if (mq.addListener) mq.addListener(sync);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', sync);
      else if (mq.removeListener) mq.removeListener(sync);
    };
  }, [query]);
  return on;
}

function VZ_reducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {
    return true;
  }
}

/* The one entrance, on first draw (the site's viz-grow / viz-grow-x /
   viz-draw keyframes): columns rise from the baseline and bars grow from the
   left over 350ms, staggered by their data-vz-delay (240ms across the set
   at most); lines draw over 500ms. Web Animations rather than classes, as
   the deck's stylesheet is not extended here. A filter change or a toggled
   series never replays it, nothing runs under reduced motion, and the
   resting state is each element's own style. */
function VZ_useEntrance(ref, ready) {
  const done = React.useRef(false);
  React.useLayoutEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    const root = ref.current;
    if (!root || VZ_reducedMotion()) return;
    root.querySelectorAll('[data-vz-grow]').forEach((el) => {
      if (!el.animate) return;
      const from = el.getAttribute('data-vz-grow') === 'x' ? 'scaleX(0)' : 'scaleY(0)';
      el.animate([{ transform: from }, { transform: 'none' }], {
        duration: 350,
        delay: Number(el.getAttribute('data-vz-delay')) || 0,
        easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
        fill: 'backwards',
      });
    });
    root.querySelectorAll('[data-vz-draw]').forEach((el) => {
      if (!el.animate) return;
      el.animate(
        [
          { strokeDasharray: '1', strokeDashoffset: 1 },
          { strokeDasharray: '1', strokeDashoffset: 0 },
        ],
        { duration: 500, easing: 'ease-out' },
      );
    });
  }, [ready]);
}
function VZ_stagger(i, last) {
  return Math.round((i / Math.max(1, last)) * 240);
}

/* One plot's interaction: a single tab stop; arrows (and Home/End, Page
   keys) move the active mark; Escape hides it; a mouse hover shows it; a
   tap pins it and a drag scrubs; a tap elsewhere or losing focus dismisses
   it. Handled keys stay with the chart, so the page does not scroll and the
   deck's own Escape handling (tour, modals) does not see them. */
function VZ_usePlotNav(ref, o) {
  const [state, setState] = React.useState({ active: null, source: null });
  const [pinned, setPinned] = React.useState(false);
  const [ring, setRing] = React.useState(false);
  const opts = React.useRef(o);
  opts.current = o;
  const show = (next, from) => setState({ active: next, source: next === null ? null : from });
  React.useEffect(() => {
    if (!pinned) return undefined;
    const onDown = (e) => {
      const el = ref.current;
      if (el && e.target && el.contains(e.target)) return;
      setPinned(false);
      setState({ active: null, source: null });
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [pinned, ref]);
  const active = state.active;
  const bind = {
    ref: ref,
    tabIndex: 0,
    onKeyDown: (e) => {
      if (e.key === 'Escape') {
        if (active === null) return;
        e.preventDefault();
        e.stopPropagation();
        setPinned(false);
        show(null, null);
        return;
      }
      const next = opts.current.keyMove(e.key, active);
      if (next === undefined) return;
      e.preventDefault();
      e.stopPropagation();
      show(next, 'key');
    },
    onFocus: (e) => {
      if (e.target !== e.currentTarget) return;
      let visible = true;
      try {
        visible = e.currentTarget.matches(':focus-visible');
      } catch (err) {
        visible = true;
      }
      setRing(visible);
      if (active === null) show(opts.current.initial(), 'key');
    },
    onBlur: (e) => {
      if (e.target !== e.currentTarget) return;
      setRing(false);
      if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return;
      setPinned(false);
      show(null, null);
    },
    onPointerMove: (e) => {
      if (e.pointerType === 'mouse') show(opts.current.pointAt(e), 'pointer');
      else if (e.buttons !== 0) show(opts.current.pointAt(e), 'touch');
    },
    onPointerDown: (e) => {
      if (e.pointerType === 'mouse') return;
      setPinned(true);
      show(opts.current.pointAt(e), 'touch');
    },
    onPointerLeave: (e) => {
      if (e.pointerType === 'mouse' && !pinned) show(null, null);
    },
  };
  const focusStyle = ring
    ? { outline: '3px solid #0E5E8A', outlineOffset: '2px', borderRadius: '4px' }
    : { outline: 'none' };
  return { active: active, source: state.source, bind: bind, focusStyle: focusStyle };
}

/* Keys for a one-dimensional plot of count marks. Across a time axis only
   left/right move (up/down keep scrolling the page); a list of rows
   (vertical) also takes up/down. */
function VZ_linearKeys(count, vertical) {
  return (key, current) => {
    const last = count - 1;
    if (last < 0) return undefined;
    const fwd = key === 'ArrowRight' || (vertical && key === 'ArrowDown');
    const back = key === 'ArrowLeft' || (vertical && key === 'ArrowUp');
    if (fwd) return current === null ? 0 : Math.min(last, current + 1);
    if (back) return current === null ? last : Math.max(0, current - 1);
    if (key === 'PageDown') return current === null ? 0 : Math.min(last, current + 7);
    if (key === 'PageUp') return current === null ? last : Math.max(0, current - 7);
    if (key === 'Home') return 0;
    if (key === 'End') return last;
    return undefined;
  };
}

/* ---------- shared pieces ---------- */

/* The chart tooltip (ChartTooltip.tsx): white, 1px grid border, radius 8,
   soft shadow; a header line and one row per series, value first. It
   positions itself after layout (so it can measure its own size), flips at
   the chart box's edges and never takes the pointer. Screen readers get the
   same text through the chart's aria-live line. */
function VZ_Tooltip(p) {
  const ref = React.useRef(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    const box = p.boxRef.current;
    if (!el || !box) return;
    const a = p.anchor(box);
    if (!a) {
      el.style.visibility = 'hidden';
      return;
    }
    const pos = VZ_placeTooltip({
      x: a.x,
      y: a.y,
      below: a.below,
      width: el.offsetWidth,
      height: el.offsetHeight,
      boxWidth: box.clientWidth,
      boxHeight: box.clientHeight,
      placement: p.placement,
      offset: p.offset,
    });
    el.style.left = pos.left + 'px';
    el.style.top = pos.top + 'px';
    el.style.visibility = 'visible';
  });
  const rows = p.rows || [];
  const key = (r) => {
    const shape = r.shape || (r.color ? 'line' : 'none');
    if (shape === 'none' || !r.color) return VZ_h('span', { key: r.key + 'k' });
    if (shape === 'tick') {
      return VZ_h(
        'span',
        { key: r.key + 'k', style: { display: 'flex', justifyContent: 'center' } },
        VZ_h('span', {
          style: { display: 'block', height: '10px', width: '2px', background: r.color },
        }),
      );
    }
    return VZ_h('span', {
      key: r.key + 'k',
      style: {
        display: 'block',
        height: '2px',
        width: '12px',
        borderRadius: '999px',
        background: r.color,
      },
    });
  };
  return VZ_h(
    'div',
    {
      ref: ref,
      'aria-hidden': 'true',
      'data-chart-tooltip': '',
      style: {
        position: 'absolute',
        left: 0,
        top: 0,
        zIndex: 20,
        visibility: 'hidden',
        pointerEvents: 'none',
        width: 'max-content',
        maxWidth: '240px',
        borderRadius: '8px',
        border: '1px solid #E5EAF1',
        background: '#FFFFFF',
        padding: '8px 10px',
        textAlign: 'left',
        boxShadow: '0 4px 14px rgba(10,37,64,0.12)',
        fontFamily: VZ_FONT,
      },
    },
    VZ_h(
      'p',
      {
        style: {
          margin: 0,
          fontSize: '11.5px',
          lineHeight: 1.375,
          fontWeight: 600,
          color: VZ_C.inkSoft,
        },
      },
      p.header,
    ),
    rows.length
      ? VZ_h(
          'div',
          {
            style: {
              marginTop: '4px',
              display: 'grid',
              gridTemplateColumns: '12px auto minmax(0,1fr)',
              alignItems: 'center',
              columnGap: '8px',
              rowGap: '4px',
            },
          },
          rows.map((r) => [
            key(r),
            VZ_h(
              'span',
              {
                key: r.key + 'v',
                style: {
                  textAlign: 'right',
                  fontSize: '13px',
                  lineHeight: 1.25,
                  fontWeight: 700,
                  color: VZ_C.ink,
                  fontVariantNumeric: 'tabular-nums',
                },
              },
              r.value,
            ),
            VZ_h(
              'span',
              {
                key: r.key + 'l',
                style: { fontSize: '12px', lineHeight: 1.25, color: VZ_C.inkSoft },
              },
              r.label,
            ),
          ]),
        )
      : null,
  );
}

function VZ_srP(props, text) {
  return VZ_h('p', Object.assign({ style: VZ_SR }, props), text || '');
}

/* Marker: r=4 in the series colour on a 2px surface ring. */
function VZ_dot(key, x, y, color) {
  return VZ_h(
    'g',
    { key: key },
    VZ_h('circle', { cx: VZ_px(x), cy: VZ_px(y), r: 6, fill: VZ_C.surface }),
    VZ_h('circle', { cx: VZ_px(x), cy: VZ_px(y), r: 4, fill: color }),
  );
}

/* One row above the plot, swatch mirroring the mark, slot or stack order. */
function VZ_legendEl(items) {
  return VZ_h(
    'ul',
    {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        columnGap: '16px',
        rowGap: '6px',
        listStyle: 'none',
        margin: 0,
        padding: 0,
        fontSize: '12px',
        color: VZ_C.inkSoft,
      },
    },
    (items || []).map((it) =>
      VZ_h(
        'li',
        { key: it.label, style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } },
        it.shape === 'line'
          ? VZ_h('span', {
              'aria-hidden': 'true',
              style: {
                display: 'block',
                height: '2px',
                width: '14px',
                borderRadius: '999px',
                background: it.color,
              },
            })
          : VZ_h('span', {
              'aria-hidden': 'true',
              style: {
                display: 'block',
                height: '10px',
                width: '10px',
                borderRadius: '2px',
                background: it.color,
              },
            }),
        it.label,
      ),
    ),
  );
}

/* The numbers behind a chart: caption, scope headers, right-aligned
   tabular figures, an ink header row. A wide table scrolls on its own and
   takes focus so a keyboard can scroll it. */
function VZ_tableEl(table) {
  const t = table || { caption: '', columns: [], rows: [] };
  const wide = t.columns.length > 4;
  const th = (c, i) =>
    VZ_h(
      'th',
      {
        key: i,
        scope: 'col',
        style: {
          background: VZ_C.ink,
          padding: '8px 12px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap',
          color: '#FFFFFF',
          textTransform: 'uppercase',
          textAlign: i === 0 ? 'left' : 'right',
        },
      },
      c,
    );
  return VZ_h(
    'div',
    Object.assign(
      {
        style: {
          marginTop: '4px',
          overflowX: 'auto',
          borderRadius: '8px',
          border: '1px solid #E5EAF1',
        },
      },
      wide ? { tabIndex: 0, role: 'region', 'aria-label': t.caption } : {},
    ),
    VZ_h(
      'table',
      {
        style: {
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '12.5px',
          fontFamily: VZ_FONT,
        },
      },
      VZ_h('caption', { style: VZ_SR }, t.caption),
      VZ_h('thead', null, VZ_h('tr', null, t.columns.map(th))),
      VZ_h(
        'tbody',
        null,
        t.rows.map((row, r) =>
          VZ_h(
            'tr',
            { key: r, style: { borderTop: r === 0 ? 'none' : '1px solid #E5EAF1' } },
            row.map((cell, i) =>
              i === 0
                ? VZ_h(
                    'th',
                    {
                      key: i,
                      scope: 'row',
                      style: {
                        padding: '6px 12px',
                        textAlign: 'left',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        color: VZ_C.ink,
                      },
                    },
                    cell,
                  )
                : VZ_h(
                    'td',
                    {
                      key: i,
                      style: {
                        padding: '6px 12px',
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                        color: VZ_C.ink,
                        fontVariantNumeric: 'tabular-nums',
                      },
                    },
                    cell,
                  ),
            ),
          ),
        ),
      ),
    ),
  );
}

/* Every chart's frame (ChartFigure.tsx): figure + figcaption (title,
   subtitle, a screen-reader takeaway) + the plot + details "Show the
   numbers" with a real table. variant 'card' (default) draws the white
   card; 'plain' sits inside a card that already exists. Never on a gold or
   dark card. */
function VZ_Figure(p) {
  const id = React.useId();
  const titleId = id + '-title';
  const takeawayId = id + '-takeaway';
  const [open, setOpen] = React.useState(false);
  const touch = VZ_useMedia(VZ_TOUCH);
  const Heading = p.as === 'h3' ? 'h3' : 'h2';
  const card = p.variant === 'plain' ? {} : VZ_CARD;
  const legend = p.legend && p.legend.length > 1 ? p.legend : null;
  return VZ_h(
    'figure',
    {
      'data-testid': p.testId,
      'aria-labelledby': titleId,
      'aria-describedby': takeawayId,
      style: Object.assign({ margin: 0, minWidth: 0, fontFamily: 'inherit' }, card, p.style || {}),
    },
    VZ_h(
      'figcaption',
      {
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          columnGap: '12px',
          rowGap: '8px',
        },
      },
      VZ_h(
        'div',
        { style: { minWidth: 0 } },
        VZ_h(
          Heading,
          {
            id: titleId,
            style: {
              margin: 0,
              fontFamily: VZ_DISPLAY,
              fontSize: '15.5px',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: VZ_C.ink,
            },
          },
          p.title,
        ),
        p.subtitle
          ? VZ_h(
              'p',
              { style: { margin: '2px 0 0', fontSize: '12.5px', color: VZ_C.inkSoft } },
              p.subtitle,
            )
          : null,
        VZ_h('span', { id: takeawayId, style: VZ_SR }, p.takeaway || ''),
      ),
      p.action
        ? VZ_h(
            'div',
            {
              style: {
                display: 'flex',
                flexShrink: 0,
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '8px',
              },
            },
            p.action,
          )
        : null,
    ),
    p.headline
      ? VZ_h(
          'div',
          {
            style: {
              marginTop: '12px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'baseline',
              columnGap: '20px',
              rowGap: '4px',
            },
          },
          p.headline,
        )
      : null,
    legend ? VZ_h('div', { style: { marginTop: '12px' } }, VZ_legendEl(legend)) : null,
    VZ_h('div', { style: { marginTop: '12px', minWidth: 0 } }, p.children),
    p.footnote
      ? VZ_h(
          'p',
          {
            style: { margin: '12px 0 0', fontSize: '12px', lineHeight: 1.375, color: VZ_C.inkSoft },
          },
          p.footnote,
        )
      : null,
    p.table
      ? VZ_h(
          'details',
          { style: { marginTop: '8px' }, onToggle: (e) => setOpen(e.currentTarget.open) },
          VZ_h(
            'summary',
            {
              style: {
                display: 'inline-flex',
                minHeight: touch ? '44px' : '32px',
                cursor: 'pointer',
                listStyle: 'none',
                alignItems: 'center',
                gap: '4px',
                borderRadius: '4px',
                fontSize: '12.5px',
                fontWeight: 700,
                color: VZ_C.sea,
              },
            },
            VZ_h(
              'svg',
              {
                width: 15,
                height: 15,
                viewBox: '0 0 24 24',
                'aria-hidden': 'true',
                style: {
                  transform: open ? 'rotate(90deg)' : 'none',
                  transition: 'transform 150ms ease',
                  flexShrink: 0,
                },
              },
              VZ_h('path', {
                d: 'm9 18 6-6-6-6',
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: 2,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              }),
            ),
            'Show the numbers',
          ),
          VZ_tableEl(p.table),
        )
      : null,
  );
}

/* ---------- time series (TimeSeriesPanels.tsx) ---------- */

const VZ_TS_MAIN = 170;
const VZ_TS_SUB = 88;
/* Panel title row + headroom, so a value label above a peak at the top tick
   clears the title's descenders. */
const VZ_TS_TITLE = 36;
const VZ_TS_GAP = 22;
const VZ_TS_AXIS = 26;

/* Value labels above the last mark and the single peak, never colliding. */
function VZ_pointLabels(g, last, peak, offset, plotLeft, plotRight, avoidX) {
  const items = [];
  if (last >= 0 && (g.values[last] || 0) > 0) items.push({ k: last, text: g.axis(g.values[last]) });
  if (peak >= 0 && peak !== last) {
    const text = g.axis(g.values[peak]);
    const clash = (x) => Math.abs(g.xs[peak] - x) < VZ_textWidth(text, 11, true) + 8;
    const blocked = (last >= 0 && clash(g.xs[last])) || (avoidX !== undefined && clash(avoidX));
    if (!blocked) items.push({ k: peak, text: text });
  }
  return items.map((it) => {
    const half = VZ_textWidth(it.text, 11, true) / 2;
    const x = Math.min(plotRight - half, Math.max(plotLeft + half, g.xs[it.k]));
    return VZ_h(
      'text',
      Object.assign(
        {
          key: 'pl' + it.k,
          x: VZ_px(x),
          y: VZ_px(g.y(g.values[it.k]) - offset),
          fontSize: 11,
          fontWeight: 700,
          fill: VZ_C.ink,
          textAnchor: 'middle',
        },
        VZ_HALO,
      ),
      it.text,
    );
  });
}

function VZ_linePath(xs, values, y) {
  return values.map((v, k) => (k ? 'L' : 'M') + VZ_px(xs[k] || 0) + ' ' + VZ_px(y(v))).join('');
}

/* "Category average" to ["Category", "average"]: the split nearest the middle. */
function VZ_twoLines(label) {
  const words = String(label).split(' ');
  const longest = (lines) =>
    Math.max.apply(
      null,
      lines.map((l) => l.length),
    );
  let best = [String(label)];
  for (let k = 1; k < words.length; k++) {
    const pair = [words.slice(0, k).join(' '), words.slice(k).join(' ')];
    if (longest(pair) < longest(best)) best = pair;
  }
  return best;
}

/* The benchmark's name beside the end of its line, in the right gutter with
   the series' last value: past the end of both lines, so neither can run
   through it. Two short lines, centred on the line's end and nudged clear
   of the value label when the two ends meet; kept inside the panel. */
function VZ_benchmarkLabel(key, label, x, top, bottom, mainY, benchY) {
  const lines = VZ_twoLines(label);
  const LINE = 12;
  const lift = ((lines.length - 1) * LINE) / 2;
  /* centre to the block's ink (cap height up, descenders down) plus the
     value label's own half height and a 3px gap */
  const clear = lift + 7 + 4 + 3;
  const clamp = (c) => Math.max(top + lift + 5, Math.min(bottom - lift - 6, c));
  const away = (dir) =>
    clamp(dir > 0 ? Math.max(benchY, mainY + clear) : Math.min(benchY, mainY - clear));
  const dir = benchY >= mainY ? 1 : -1;
  let c = away(dir);
  if (Math.abs(c - mainY) < clear) c = away(dir > 0 ? -1 : 1);
  return lines.map((line, i) =>
    VZ_h(
      'text',
      Object.assign(
        {
          key: key + i,
          x: VZ_px(x),
          y: VZ_px(c - lift + i * LINE),
          dy: '0.32em',
          fontSize: 11,
          fontWeight: 600,
          fill: VZ_C.inkSoft,
        },
        VZ_HALO,
      ),
      line,
    ),
  );
}

/* Small multiples on one shared time axis with one synced crosshair: never
   a dual axis. Areas are a 2px line over a flat 10% wash; columns are at
   most 24px with a rounded data end. The last value and a single peak are
   labelled; everything else is in the tooltip and the table. */
function VZ_TimeSeries(p) {
  const labels = p.labels || [];
  const panels = p.panels || [];
  const [boxRef, width] = VZ_useWidth();
  const plotRef = React.useRef(null);
  const hintId = React.useId();
  const n = labels.length;

  const geo0 = panels.map((pn, idx) => {
    const axis = pn.axisFormat || VZ_num;
    const all = (pn.values || []).concat(
      pn.benchmark && pn.benchmark.values ? pn.benchmark.values : [],
    );
    const vmax = all.length ? Math.max.apply(null, all) : 0;
    const integer = (pn.values || []).every((v) => Number.isInteger(v)) && vmax >= 2;
    return {
      p: pn,
      axis: axis,
      ticks: VZ_fitTicks(
        vmax,
        idx === 0 ? { integer: integer } : { integer: integer, minTicks: 3, maxTicks: 3 },
      ),
    };
  });
  const gutterLeft = VZ_tickGutter(
    [].concat.apply(
      [],
      geo0.map((g) => g.ticks.map(g.axis)),
    ),
    22,
  );
  /* The right gutter carries each area's last value and, when it fits, the
     benchmark's name ("Category" / "average") beside its own line end: out
     past both lines, where no point can cross it. It fits unless it would
     squeeze the plot below 55% of the chart; the legend names it anyway. */
  const areas = geo0.filter((g) => g.p.kind === 'area' && (g.p.values || []).length);
  const endW = VZ_max(
    areas.map((g) => VZ_textWidth(g.axis(g.p.values[g.p.values.length - 1]), 11, true)),
  );
  const benchW = VZ_max(
    [].concat.apply(
      [],
      areas.map((g) =>
        g.p.benchmark ? VZ_twoLines(g.p.benchmark.label).map((l) => VZ_textWidth(l, 11, true)) : [],
      ),
    ),
  );
  const withBench = Math.max(endW, benchW) + 14;
  const showBench = benchW > 0 && width - gutterLeft - withBench >= Math.max(160, width * 0.55);
  const gutterRight = showBench ? withBench : areas.length ? endW + 14 : 6;
  const plotLeft = gutterLeft;
  const plotRight = Math.max(plotLeft + 10, width - gutterRight);
  const plotW = plotRight - plotLeft;
  const band = VZ_bandLayout(Math.max(1, n), plotW, plotLeft);

  const geo = geo0.map((g, idx) => {
    const h = idx === 0 ? VZ_TS_MAIN : VZ_TS_SUB;
    const start =
      idx === 0 ? 0 : idx * (VZ_TS_TITLE + VZ_TS_SUB + VZ_TS_GAP) + (VZ_TS_MAIN - VZ_TS_SUB);
    const top = start + VZ_TS_TITLE;
    const bottom = top + h;
    const topTick = g.ticks[g.ticks.length - 1] || 1;
    const values = g.p.values || [];
    const slots =
      values.length === n ? labels.map((_, i) => [i, i]) : VZ_binRanges(n, values.length);
    return {
      panel: g.p,
      values: values,
      titleY: start + 12,
      top: top,
      bottom: bottom,
      ticks: g.ticks,
      y: (v) => bottom - (v / topTick) * h,
      slots: slots,
      xs: slots.map((s) => (band.centre(s[0]) + band.centre(s[1])) / 2),
      slotW: slots.map((s) => (s[1] - s[0] + 1) * band.band),
      axis: g.axis,
    };
  });
  const lastBottom = geo.length ? geo[geo.length - 1].bottom : 0;
  const xSpacing = VZ_max(labels.map((l) => VZ_textWidth(l))) + 44;
  const height = lastBottom + VZ_TS_AXIS;
  const ready = width > 0 && n > 0;
  VZ_useEntrance(plotRef, ready);
  const slotOf = (g, i) => g.slots.findIndex((s) => i >= s[0] && i <= s[1]);

  const nav = VZ_usePlotNav(plotRef, {
    initial: () => (n ? n - 1 : null),
    keyMove: VZ_linearKeys(n, false),
    pointAt: (e) =>
      VZ_nearestIndex(
        e.clientX - e.currentTarget.getBoundingClientRect().left,
        plotLeft,
        band.band,
        n,
      ),
  });
  const active = nav.active !== null && nav.active < n ? nav.active : null;

  const tipRows = [];
  if (active !== null) {
    geo.forEach((g) => {
      const k = slotOf(g, active);
      const v = g.values[k];
      if (k < 0 || v === undefined) return;
      const s = g.slots[k];
      const binned =
        g.panel.binLabels && g.panel.binLabels[k]
          ? g.panel.binLabels[k]
          : labels[s[0]] + ' to ' + labels[s[1]];
      const fmt = g.panel.format || VZ_num;
      tipRows.push({
        key: g.panel.id,
        color: VZ_C.sea,
        value: fmt(v),
        label: g.panel.label + (s[0] === s[1] ? '' : ', ' + binned),
      });
      const b =
        g.panel.benchmark && g.panel.benchmark.values ? g.panel.benchmark.values[k] : undefined;
      if (b !== undefined)
        tipRows.push({
          key: g.panel.id + '-bench',
          color: VZ_C.context,
          value: fmt(b),
          label: g.panel.benchmark.label,
        });
    });
  }
  const header = active !== null ? labels[active] || '' : '';
  const live = active !== null && nav.source !== 'pointer' ? VZ_liveLine(header, tipRows) : '';
  const anchor = () => {
    if (active === null) return null;
    const tops = geo.map((g) => {
      const v = g.values[slotOf(g, active)];
      return v === undefined ? Infinity : g.y(v);
    });
    const firstArea = geo.findIndex((g) => g.panel.kind === 'area');
    const y = firstArea >= 0 ? tops[firstArea] : Math.min.apply(null, tops);
    return { x: band.centre(active), y: isFinite(y) ? y : geo.length ? geo[0].top : 0 };
  };

  const els = [];
  geo.forEach((g, gi) => {
    const k = 'p' + gi;
    const values = g.values;
    const last = values.length - 1;
    const peak = VZ_peakIndex(values);
    const activeSlot = active !== null ? slotOf(g, active) : -1;
    els.push(
      VZ_h(
        'text',
        { key: k + 'title', x: 0, y: g.titleY, fontSize: 12, fontWeight: 600, fill: VZ_C.inkSoft },
        g.panel.label,
      ),
    );
    g.ticks.forEach((t) => {
      const ty = Math.round(g.y(t)) + 0.5;
      els.push(
        VZ_h('line', {
          key: k + 'g' + t,
          x1: plotLeft,
          x2: plotRight,
          y1: ty,
          y2: ty,
          stroke: t === 0 ? VZ_C.axis : VZ_C.grid,
          strokeWidth: 1,
        }),
      );
      els.push(
        VZ_h(
          'text',
          {
            key: k + 't' + t,
            x: plotLeft - VZ_TICK_GAP,
            y: ty,
            dy: '0.32em',
            fontSize: 11,
            fill: VZ_C.tick,
            textAnchor: 'end',
          },
          g.axis(t),
        ),
      );
    });
    if (g.panel.kind === 'columns') {
      if (activeSlot >= 0) {
        els.push(
          VZ_h('rect', {
            key: k + 'band',
            x: VZ_px(g.xs[activeSlot] - g.slotW[activeSlot] / 2),
            y: g.top,
            width: VZ_px(g.slotW[activeSlot]),
            height: g.bottom - g.top,
            fill: VZ_C.hover,
          }),
        );
      }
      values.forEach((v, j) => {
        if (!(v > 0)) return;
        const w = g.slotW[j];
        const bw = Math.max(1, Math.min(24, w * 0.6, w - 2));
        const yt = g.y(v);
        els.push(
          VZ_h('path', {
            key: k + 'c' + j,
            d: VZ_columnPath(g.xs[j] - bw / 2, yt, bw, g.bottom - yt, 4),
            fill: VZ_C.sea,
            'data-vz-grow': 'y',
            'data-vz-delay': VZ_stagger(j, last),
            style: { transformBox: 'fill-box', transformOrigin: 'center bottom' },
          }),
        );
      });
      VZ_pointLabels(g, last, peak.single ? peak.index : -1, 6, plotLeft, plotRight).forEach((e) =>
        els.push(e),
      );
    } else if (values.length) {
      const line = VZ_linePath(g.xs, values, g.y);
      els.push(
        VZ_h('path', {
          key: k + 'area',
          d:
            line +
            'L' +
            VZ_px(g.xs[last]) +
            ' ' +
            g.bottom +
            'L' +
            VZ_px(g.xs[0]) +
            ' ' +
            g.bottom +
            'Z',
          fill: VZ_C.sea,
          fillOpacity: 0.1,
        }),
      );
      const bench = g.panel.benchmark && g.panel.benchmark.values ? g.panel.benchmark.values : null;
      if (bench) {
        els.push(
          VZ_h('path', {
            key: k + 'bench',
            d: VZ_linePath(g.xs, bench, g.y),
            fill: 'none',
            stroke: VZ_C.context,
            strokeWidth: 2,
            strokeLinejoin: 'round',
            strokeLinecap: 'round',
          }),
        );
      }
      els.push(
        VZ_h('path', {
          key: k + 'line',
          d: line,
          fill: 'none',
          stroke: VZ_C.sea,
          strokeWidth: 2,
          strokeLinejoin: 'round',
          strokeLinecap: 'round',
          pathLength: 1,
          'data-vz-draw': '',
        }),
      );
      if (peak.single && peak.index !== last)
        els.push(VZ_dot(k + 'pk', g.xs[peak.index], g.y(values[peak.index]), VZ_C.sea));
      els.push(VZ_dot(k + 'end', g.xs[last], g.y(values[last]), VZ_C.sea));
      els.push(
        VZ_h(
          'text',
          {
            key: k + 'endl',
            x: VZ_px(g.xs[last] + 9),
            y: VZ_px(g.y(values[last])),
            dy: '0.32em',
            fontSize: 11,
            fontWeight: 700,
            fill: VZ_C.ink,
          },
          g.axis(values[last]),
        ),
      );
      VZ_pointLabels(
        g,
        -1,
        peak.single && peak.index !== last ? peak.index : -1,
        10,
        plotLeft,
        plotRight,
        g.xs[last],
      ).forEach((e) => els.push(e));
      if (bench && showBench) {
        VZ_benchmarkLabel(
          k + 'blab',
          g.panel.benchmark.label,
          g.xs[last] + 9,
          g.top,
          g.bottom,
          g.y(values[last]),
          g.y(bench.length ? bench[bench.length - 1] : 0),
        ).forEach((e) => els.push(e));
      }
    }
  });
  /* the shared x-axis: first and last pinned to the plot's ends */
  VZ_xTickIndices(n, plotW, xSpacing).forEach((i, kk, arr) => {
    const pos = kk === 0 ? 'start' : kk === arr.length - 1 ? 'end' : 'middle';
    const x = pos === 'start' ? plotLeft : pos === 'end' ? plotRight : band.centre(i);
    els.push(
      VZ_h(
        'text',
        {
          key: 'x' + i,
          x: VZ_px(x),
          y: lastBottom + 17,
          fontSize: 11,
          fill: VZ_C.tick,
          textAnchor: pos,
        },
        labels[i],
      ),
    );
  });
  /* the synced crosshair and the hovered points */
  if (active !== null && geo.length) {
    els.push(
      VZ_h('line', {
        key: 'xh',
        x1: VZ_px(band.centre(active)),
        x2: VZ_px(band.centre(active)),
        y1: geo[0].top - 6,
        y2: lastBottom,
        stroke: VZ_C.context,
        strokeWidth: 1,
      }),
    );
    geo.forEach((g, gi) => {
      if (g.panel.kind !== 'area') return;
      const k = slotOf(g, active);
      const v = g.values[k];
      if (v === undefined) return;
      const b =
        g.panel.benchmark && g.panel.benchmark.values ? g.panel.benchmark.values[k] : undefined;
      if (b !== undefined) els.push(VZ_dot('hb' + gi, g.xs[k], g.y(b), VZ_C.context));
      els.push(VZ_dot('hv' + gi, g.xs[k], g.y(v), VZ_C.sea));
    });
  }

  return VZ_h(
    'div',
    {
      ref: boxRef,
      style: { position: 'relative', height: height + 'px', minWidth: 0, fontFamily: VZ_FONT },
    },
    ready
      ? VZ_h(
          'svg',
          Object.assign({}, nav.bind, {
            role: 'group',
            'aria-label': p.ariaLabel,
            'aria-describedby': hintId,
            width: width,
            height: height,
            style: Object.assign(
              {
                display: 'block',
                touchAction: 'pan-y',
                userSelect: 'none',
                fontVariantNumeric: 'tabular-nums',
                overflow: 'visible',
                WebkitTapHighlightColor: 'transparent',
              },
              nav.focusStyle,
            ),
          }),
          VZ_h('g', { 'aria-hidden': 'true' }, els),
        )
      : null,
    active !== null
      ? VZ_h(VZ_Tooltip, {
          boxRef: boxRef,
          anchor: anchor,
          placement: 'side',
          header: header,
          rows: tipRows,
        })
      : null,
    VZ_srP({ id: hintId }, VZ_NAV_HINT),
    VZ_srP({ 'aria-live': 'polite' }, live),
  );
}

/* ---------- stacked columns (StackedColumns.tsx) ---------- */

const VZ_SC_TOP = 18;
const VZ_SC_PLOT = 190;
const VZ_SC_LOWER = 56;

/* Series stack bottom to top in the order given, 2px geometric gaps, the
   rounded data end on the top segment only. `lower` adds an aligned panel
   on the same x-axis and tooltip; `directLabelLast` names the latest
   column's segments in a right-hand gutter and sets its total, named as one
   ("Sep total £12,600"), above the column. A series of zeros draws
   nothing, and the survivors keep their colours. */
function VZ_Stacked(p) {
  const categories = p.categories || [];
  const series = p.series || [];
  const format = p.format || VZ_num;
  const axis = p.axisFormat || format;
  const lower = p.lower && p.lower.values ? p.lower : null;
  const [boxRef, width] = VZ_useWidth();
  const plotRef = React.useRef(null);
  const hintId = React.useId();
  const n = categories.length;
  const last = n - 1;

  const totals = categories.map((_, i) =>
    series.reduce((a, s) => a + ((s.values || [])[i] || 0), 0),
  );
  const ticks = VZ_fitTicks(VZ_max(totals));
  const lowerTicks = lower ? VZ_fitTicks(VZ_max(lower.values), { minTicks: 3, maxTicks: 3 }) : [];
  const gutterLeft = VZ_tickGutter(ticks.concat(lowerTicks).map(axis), 24);
  /* The gutter holds the series names (and the lower panel's figure); the
     total sits above its column instead, so it never needs the room. */
  const labelled = series.filter((s) => ((s.values || [])[last] || 0) > 0);
  const labelW = p.directLabelLast
    ? VZ_max(
        labelled
          .map((s) => VZ_textWidth(s.label))
          .concat([lower ? VZ_textWidth(lower.format(lower.values[last] || 0), 11, true) : 0]),
      )
    : 0;
  /* Direct labels only if they fit: never at the cost of squeezing the plot
     below 55% of the chart (the legend and the table still name every series). */
  const labelsFit = width - gutterLeft - (labelW + 16) >= Math.max(160, width * 0.55);
  const showDirect = !!p.directLabelLast && labelsFit;
  const gutterRight = showDirect ? labelW + 16 : 4;
  const plotLeft = gutterLeft;
  const plotRight = Math.max(plotLeft + 10, width - gutterRight);
  const plotW = plotRight - plotLeft;
  const band = VZ_bandLayout(Math.max(1, n), plotW, plotLeft);
  const baseline = VZ_SC_TOP + VZ_SC_PLOT;
  const topTick = ticks[ticks.length - 1] || 1;
  const toPx = (v) => (v / topTick) * VZ_SC_PLOT;
  const y = (v) => baseline - toPx(v);
  const lowerTitleY = baseline + 42;
  const lowerTop = baseline + 54;
  const lowerBottom = lowerTop + VZ_SC_LOWER;
  const lowerTopTick = lowerTicks[lowerTicks.length - 1] || 1;
  const ly = (v) => lowerBottom - (v / lowerTopTick) * VZ_SC_LOWER;
  const height = lower ? lowerBottom + 6 : baseline + 26;
  const ready = width > 0 && n > 0;
  VZ_useEntrance(plotRef, ready);

  const columns = categories.map((_, i) =>
    VZ_stackSegments(
      series.map((s) => (s.values || [])[i] || 0),
      toPx,
      baseline,
    ),
  );

  const nav = VZ_usePlotNav(plotRef, {
    initial: () => (n ? last : null),
    keyMove: VZ_linearKeys(n, false),
    pointAt: (e) =>
      VZ_nearestIndex(
        e.clientX - e.currentTarget.getBoundingClientRect().left,
        plotLeft,
        band.band,
        n,
      ),
  });
  const active = nav.active !== null && nav.active < n ? nav.active : null;

  const tipRows = [];
  if (active !== null) {
    series
      .slice()
      .reverse()
      .forEach((s) =>
        tipRows.push({
          key: s.id,
          color: s.color,
          value: format((s.values || [])[active] || 0),
          label: s.label,
        }),
      );
    if (series.length > 1)
      tipRows.push({ key: 'total', value: format(totals[active] || 0), label: 'Total' });
    if (lower)
      tipRows.push({
        key: 'lower',
        color: lower.color,
        value: lower.format(lower.values[active] || 0),
        label: lower.label,
      });
  }
  const header = active !== null ? categories[active] || '' : '';
  const live = active !== null && nav.source !== 'pointer' ? VZ_liveLine(header, tipRows) : '';
  const anchor = () => {
    if (active === null) return null;
    const segs = columns[active] || [];
    return { x: band.centre(active), y: segs.length ? segs[segs.length - 1].y : baseline - 10 };
  };

  const els = [];
  if (active !== null) {
    els.push(
      VZ_h('rect', {
        key: 'band',
        x: VZ_px(band.centre(active) - band.band / 2 + 1),
        y: VZ_SC_TOP - 8,
        width: VZ_px(Math.max(0, band.band - 2)),
        height: (lower ? lowerBottom : baseline) - VZ_SC_TOP + 8,
        rx: 4,
        fill: VZ_C.hover,
      }),
    );
  }
  ticks.forEach((t) => {
    const ty = Math.round(y(t)) + 0.5;
    els.push(
      VZ_h('line', {
        key: 'g' + t,
        x1: plotLeft,
        x2: plotRight,
        y1: ty,
        y2: ty,
        stroke: t === 0 ? VZ_C.axis : VZ_C.grid,
      }),
    );
    els.push(
      VZ_h(
        'text',
        {
          key: 't' + t,
          x: plotLeft - VZ_TICK_GAP,
          y: ty,
          dy: '0.32em',
          fontSize: 11,
          fill: VZ_C.tick,
          textAnchor: 'end',
        },
        axis(t),
      ),
    );
  });
  columns.forEach((segs, i) => {
    els.push(
      VZ_h(
        'g',
        {
          key: 'col' + i,
          'data-vz-grow': 'y',
          'data-vz-delay': VZ_stagger(i, last),
          style: { transformBox: 'fill-box', transformOrigin: 'center bottom' },
        },
        segs.map((sg) =>
          VZ_h('path', {
            key: series[sg.index].id,
            d: VZ_columnPath(band.left(i), sg.y, band.bar, sg.height, sg.radius),
            fill: series[sg.index].color,
          }),
        ),
      ),
    );
  });
  /* Every category label that fits its band; otherwise every k-th, counted
     back from the latest so it always carries a label. */
  const every = Math.max(
    1,
    Math.ceil((VZ_max(categories.map((c) => VZ_textWidth(c))) + 4) / Math.max(1, band.band)),
  );
  const xLabels = categories.map((_, i) => i).filter((i) => (last - i) % every === 0);
  xLabels.forEach((i) => {
    els.push(
      VZ_h(
        'text',
        {
          key: 'x' + i,
          x: VZ_px(band.centre(i)),
          y: baseline + 17,
          fontSize: 11,
          fill: VZ_C.tick,
          textAnchor: 'middle',
          fontWeight: i === active ? 700 : 400,
        },
        categories[i],
      ),
    );
  });
  if (lower) {
    els.push(
      VZ_h(
        'text',
        { key: 'ltitle', x: 0, y: lowerTitleY, fontSize: 12, fontWeight: 600, fill: VZ_C.inkSoft },
        lower.label,
      ),
    );
    lowerTicks.forEach((t) => {
      const ty = Math.round(ly(t)) + 0.5;
      els.push(
        VZ_h('line', {
          key: 'lg' + t,
          x1: plotLeft,
          x2: plotRight,
          y1: ty,
          y2: ty,
          stroke: t === 0 ? VZ_C.axis : VZ_C.grid,
        }),
      );
      els.push(
        VZ_h(
          'text',
          {
            key: 'lt' + t,
            x: plotLeft - VZ_TICK_GAP,
            y: ty,
            dy: '0.32em',
            fontSize: 11,
            fill: VZ_C.tick,
            textAnchor: 'end',
          },
          axis(t),
        ),
      );
    });
    lower.values.forEach((v, i) => {
      if (!(v > 0)) return;
      els.push(
        VZ_h('path', {
          key: 'lc' + i,
          d: VZ_columnPath(band.left(i), ly(v), band.bar, lowerBottom - ly(v), 4),
          fill: lower.color,
          'data-vz-grow': 'y',
          'data-vz-delay': VZ_stagger(i, last),
          style: { transformBox: 'fill-box', transformOrigin: 'center bottom' },
        }),
      );
    });
  }
  /* Direct labels on the latest column. The total is its own label, named
     ("Sep total £12,600") and set above the column; the series names sit
     beside their segments a clear line below it. A bare figure stacked over
     a name reads as that segment's value. */
  if (showDirect && ready && (columns[last] || []).length) {
    const segs = columns[last];
    const totalLead = (categories[last] || '') + ' total ';
    const totalFigure = format(totals[last] || 0);
    const half = (VZ_textWidth(totalLead) + VZ_textWidth(totalFigure, 11, true)) / 2;
    const tx = Math.min(band.centre(last), width - 2 - half);
    /* Above every column the label spans, not just the latest one; and if a
       gridline would run through the words, lifted just clear above it. */
    const under = [];
    columns.forEach((c, i) => {
      if (band.left(i) < tx + half && band.left(i) + band.bar > tx - half && c.length) {
        under.push(c[c.length - 1].y);
      }
    });
    let ty = Math.min.apply(null, [baseline].concat(under)) - 7;
    const grid = ticks.map((t) => Math.round(y(t)) + 0.5).find((g) => g > ty - 10 && g < ty + 4);
    if (grid !== undefined) ty = grid - 4;
    ty = Math.max(11, ty);
    els.push(
      VZ_h(
        'text',
        {
          key: 'dltotal',
          x: VZ_px(tx),
          y: VZ_px(ty),
          fontSize: 11,
          fontWeight: 500,
          fill: VZ_C.inkSoft,
          textAnchor: 'middle',
        },
        totalLead,
        VZ_h('tspan', { fontWeight: 700, fill: VZ_C.ink }, totalFigure),
      ),
    );
    const items = segs.map((sg) => ({
      key: series[sg.index].id,
      text: series[sg.index].label,
      at: sg.y + sg.height / 2,
    }));
    const ys = VZ_spreadLabels(
      items.map((it) => it.at),
      13,
      Math.max(VZ_SC_TOP - 4, ty + 13),
      baseline - 4,
    );
    const x0 = band.left(last) + band.bar;
    const lx = x0 + 12;
    items.forEach((it, kk) => {
      const yy = ys[kk];
      els.push(
        VZ_h('path', {
          key: 'dll' + it.key,
          d:
            'M' +
            VZ_px(x0 + 2) +
            ' ' +
            VZ_px(it.at) +
            'L' +
            VZ_px(x0 + 5) +
            ' ' +
            VZ_px(it.at) +
            'L' +
            VZ_px(lx - 3) +
            ' ' +
            VZ_px(yy),
          fill: 'none',
          stroke: VZ_C.axis,
          strokeWidth: 1,
        }),
      );
      els.push(
        VZ_h(
          'text',
          {
            key: 'dl' + it.key,
            x: VZ_px(lx),
            y: VZ_px(yy),
            dy: '0.32em',
            fontSize: 11,
            fontWeight: 500,
            fill: VZ_C.inkSoft,
          },
          it.text,
        ),
      );
    });
    if (lower && (lower.values[last] || 0) > 0) {
      const lv = lower.values[last];
      els.push(
        VZ_h(
          'text',
          {
            key: 'dllow',
            x: VZ_px(lx),
            y: VZ_px(ly(lv) + Math.min(10, (lowerBottom - ly(lv)) / 2)),
            dy: '0.32em',
            fontSize: 11,
            fontWeight: 700,
            fill: VZ_C.ink,
          },
          lower.format(lv),
        ),
      );
    }
  }

  return VZ_h(
    'div',
    {
      ref: boxRef,
      style: { position: 'relative', height: height + 'px', minWidth: 0, fontFamily: VZ_FONT },
    },
    ready
      ? VZ_h(
          'svg',
          Object.assign({}, nav.bind, {
            role: 'group',
            'aria-label': p.ariaLabel,
            'aria-describedby': hintId,
            width: width,
            height: height,
            style: Object.assign(
              {
                display: 'block',
                touchAction: 'pan-y',
                userSelect: 'none',
                fontVariantNumeric: 'tabular-nums',
                overflow: 'visible',
                WebkitTapHighlightColor: 'transparent',
              },
              nav.focusStyle,
            ),
          }),
          VZ_h('g', { 'aria-hidden': 'true' }, els),
        )
      : null,
    active !== null
      ? VZ_h(VZ_Tooltip, {
          boxRef: boxRef,
          anchor: anchor,
          placement: 'side',
          offset: 12 + band.bar / 2,
          header: header,
          rows: tipRows,
        })
      : null,
    VZ_srP({ id: hintId }, VZ_NAV_HINT),
    VZ_srP({ 'aria-live': 'polite' }, live),
  );
}

/* ---------- horizontal bar rows (BarRows.tsx, HBarList.tsx, FunnelBars.tsx) ---------- */

/* HTML rows (crisp text that wraps like prose): labels in a left column
   when the chart has room and above the bar when it does not, 18px bars
   with a 4px rounded tip and 10px between rows, the value at every tip.
   One tab stop; up/down or left/right move row by row with a tooltip above
   the bar and a full-row hover band. */
function VZ_BarRows(p) {
  const rows = p.rows || [];
  const n = rows.length;
  const [boxRef, width] = VZ_useWidth();
  const plotRef = React.useRef(null);
  const hintId = React.useId();
  /* The label column fits its longest label (a tag may wrap under it). */
  const labelW = Math.round(
    Math.min(
      168,
      Math.max.apply(null, [40].concat(rows.map((r) => VZ_textWidth(r.label, 12.5, true) + 6))),
    ),
  );
  /* 24rem, the site's @sm container step: the step rates indent from here. */
  const wide = width >= 384;
  /* Short labels ("5 ★") stay beside their bars even on a phone; longer
     ones move above the bar when the chart is narrower than 24rem. */
  const besideBars = labelW <= 64 || wide;
  VZ_useEntrance(plotRef, width > 0);
  const nav = VZ_usePlotNav(plotRef, {
    initial: () => (n ? 0 : null),
    keyMove: VZ_linearKeys(n, true),
    pointAt: (e) => {
      const els = Array.prototype.slice.call(e.currentTarget.querySelectorAll('[data-row]'));
      let best = -1;
      let dist = Infinity;
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        const d =
          e.clientY < r.top ? r.top - e.clientY : e.clientY > r.bottom ? e.clientY - r.bottom : 0;
        if (d < dist) {
          dist = d;
          best = Number(el.getAttribute('data-row'));
        }
      });
      return best >= 0 ? best : null;
    },
  });
  const active = nav.active !== null && nav.active < n ? nav.active : null;
  const tip = active !== null ? p.tooltip(active) : null;
  const live = tip && nav.source !== 'pointer' ? VZ_liveLine(tip.header, tip.rows) : '';
  const anchor = (box) => {
    if (active === null) return null;
    const row = box.querySelector('[data-row="' + active + '"]');
    const bar = row ? row.querySelector('[data-bar]') : null;
    if (!row || !bar) return null;
    const b = box.getBoundingClientRect();
    const rr = row.getBoundingClientRect();
    const br = bar.getBoundingClientRect();
    return { x: br.right - b.left, y: rr.top - b.top + 4, below: rr.bottom - b.top };
  };
  const kids = [];
  rows.forEach((r, i) => {
    const pct = p.max > 0 ? Math.max(0, Math.min(1, r.value / p.max)) : 0;
    kids.push(
      VZ_h(
        'div',
        {
          key: r.id,
          'data-row': i,
          style: {
            display: 'grid',
            gridTemplateColumns: besideBars ? labelW + 'px minmax(0,1fr)' : 'minmax(0,1fr)',
            alignItems: 'center',
            columnGap: '16px',
            rowGap: '4px',
            borderRadius: '6px',
            padding: '5px 8px',
            background: active === i ? VZ_C.hover : 'transparent',
          },
        },
        VZ_h(
          'p',
          {
            style: {
              margin: 0,
              minWidth: 0,
              fontSize: '12.5px',
              lineHeight: 1.25,
              fontWeight: 600,
              color: VZ_C.ink,
            },
          },
          r.label,
          /* after a space, so a tag that wraps lines up under the label */
          r.tag ? ' ' : null,
          r.tag
            ? VZ_h(
                'span',
                {
                  style: {
                    fontSize: '11px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    color: VZ_C.promoted,
                  },
                },
                r.tag,
              )
            : null,
        ),
        VZ_h(
          'div',
          { style: { display: 'flex', minWidth: 0, alignItems: 'center', gap: '8px' } },
          VZ_h('span', {
            'data-bar': '',
            'data-vz-grow': 'x',
            'data-vz-delay': VZ_stagger(i, n - 1),
            style: {
              display: 'block',
              height: '18px',
              flexShrink: 0,
              borderRadius: '0 4px 4px 0',
              width: 'calc((100% - 5.5rem) * ' + pct.toFixed(4) + ')',
              minWidth: '2px',
              background: r.color,
              transformOrigin: 'left center',
            },
          }),
          VZ_h(
            'span',
            {
              style: {
                fontSize: '12px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                color: VZ_C.ink,
                fontVariantNumeric: 'tabular-nums',
              },
            },
            r.valueText,
          ),
        ),
      ),
    );
    if (p.between && i < n - 1) {
      const b = p.between(i, wide, labelW);
      if (b) kids.push(VZ_h(React.Fragment, { key: r.id + '-between' }, b));
    }
  });
  return VZ_h(
    'div',
    { ref: boxRef, style: { position: 'relative', minWidth: 0, fontFamily: VZ_FONT } },
    VZ_h(
      'div',
      Object.assign({}, nav.bind, {
        role: 'group',
        'aria-label': p.ariaLabel,
        'aria-describedby': hintId,
        style: Object.assign(
          {
            touchAction: 'pan-y',
            borderRadius: '8px',
            userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
          },
          nav.focusStyle,
        ),
      }),
      width > 0 ? kids : null,
    ),
    tip
      ? VZ_h(VZ_Tooltip, {
          boxRef: boxRef,
          anchor: anchor,
          placement: 'above',
          header: tip.header,
          rows: tip.rows,
        })
      : null,
    VZ_srP({ id: hintId }, VZ_NAV_HINT),
    VZ_srP({ 'aria-live': 'polite' }, live),
  );
}

/* Ranked horizontal bars on one hue: a value at every tip, "Other" last in
   #8595A8, tags in text rather than colour. */
function VZ_HBars(p) {
  const rows = p.rows || [];
  const format = p.format || VZ_num;
  const top = p.max !== undefined ? p.max : VZ_max(rows.map((r) => r.value));
  return VZ_h(VZ_BarRows, {
    ariaLabel: p.ariaLabel,
    max: top,
    rows: rows.map((r) => ({
      id: r.id,
      label: r.label,
      tag: r.tag,
      value: r.value,
      valueText: r.valueLabel !== undefined ? r.valueLabel : format(r.value),
      color: r.color || VZ_C.sea,
    })),
    tooltip: (i) => {
      const r = rows[i];
      return {
        header: r.tag ? r.label + ' · ' + r.tag : r.label,
        rows: [
          {
            key: r.id,
            color: r.color || VZ_C.sea,
            value: r.valueLabel !== undefined ? r.valueLabel : format(r.value),
            label: '',
          },
        ],
      };
    },
  });
}

/* Ordinal ramp for n steps: all five for five, else spread over the first four. */
function VZ_funnelColour(i, n) {
  if (n >= 5) return VZ_C.ord[Math.min(i, 4)];
  if (n <= 1) return VZ_C.ord[3];
  return VZ_C.ord[Math.round((i * 3) / (n - 1))];
}

/* From search to signed job: horizontal bars on a linear scale (no
   trapezoids, no log scale), light to dark on the ordinal ramp, the value
   at each tip and the step rate between rows. */
function VZ_Funnel(p) {
  const steps = p.steps || [];
  const format = p.format || VZ_num;
  const rates = p.rateLabels || [];
  const n = steps.length;
  return VZ_h(VZ_BarRows, {
    ariaLabel: p.ariaLabel,
    max: VZ_max(steps.map((s) => s.value)),
    rows: steps.map((s, i) => ({
      id: i + '-' + s.label,
      label: s.label,
      value: s.value,
      valueText: format(s.value),
      color: VZ_funnelColour(i, n),
    })),
    /* the step rate lines up under the bars: the label column plus the
       row's 8px padding and 16px gap */
    between: (i, wide, labelW) =>
      rates[i]
        ? VZ_h(
            'p',
            {
              style: {
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: wide ? '2px 8px 2px calc(' + labelW + 'px + 24px)' : '2px 8px',
                fontSize: '12px',
                lineHeight: 1.25,
                color: VZ_C.inkSoft,
              },
            },
            VZ_h('span', { 'aria-hidden': 'true', style: { fontSize: '11px' } }, '↓'),
            rates[i],
          )
        : null,
    tooltip: (i) => {
      const rate = i > 0 ? rates[i - 1] : undefined;
      const rows = [
        { key: 'v', color: VZ_funnelColour(i, n), value: format(steps[i].value), label: '' },
      ];
      if (rate) rows.push({ key: 'rate', value: '', label: rate });
      return { header: steps[i].label, rows: rows };
    },
  });
}

/* ---------- benchmark (BenchmarkBar.tsx) ---------- */

/* Higher is better: a bullet, sea fill to the value on the sea-soft track.
   Lower is better: a dot strip with no fill ("Faster" at the left). The
   category average is an ink tick on a 6px white ring, both values are
   labelled in words, so the visual is static: role img with the takeaway. */
function VZ_Benchmark(p) {
  const format = p.format || VZ_num;
  const max = p.max || Math.max(p.value, p.benchmark) * 1.25 || 1;
  const pct = (v) => (max > 0 ? Math.max(0, Math.min(100, (v / max) * 100)) : 0);
  const at = (q) => {
    const a = VZ_edgeAnchor(q);
    return {
      left: q + '%',
      transform:
        a === 'start' ? 'translateX(-2px)' : a === 'end' ? 'translateX(-100%)' : 'translateX(-50%)',
    };
  };
  const vp = pct(p.value);
  const bp = pct(p.benchmark);
  const abs = { position: 'absolute' };
  return VZ_h(
    'div',
    {
      role: 'img',
      'aria-label': p.ariaLabel,
      style: { userSelect: 'none', fontFamily: VZ_FONT, fontVariantNumeric: 'tabular-nums' },
    },
    VZ_h(
      'div',
      { style: { position: 'relative', height: '20px' } },
      VZ_h(
        'span',
        {
          style: Object.assign({}, abs, at(vp), {
            bottom: '4px',
            fontSize: '12.5px',
            lineHeight: 1,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            color: VZ_C.ink,
          }),
        },
        p.valueLabel !== undefined ? p.valueLabel : 'You · ' + format(p.value),
      ),
    ),
    VZ_h(
      'div',
      { style: { position: 'relative', height: '16px' } },
      VZ_h('span', {
        style: Object.assign({}, abs, {
          left: 0,
          right: 0,
          top: '4px',
          display: 'block',
          height: '8px',
          borderRadius: '999px',
          background: VZ_C.track,
        }),
      }),
      p.lowerIsBetter
        ? null
        : VZ_h('span', {
            style: Object.assign({}, abs, {
              top: '4px',
              left: 0,
              display: 'block',
              height: '8px',
              borderRadius: '999px',
              width: vp + '%',
              minWidth: '4px',
              background: VZ_C.sea,
            }),
          }),
      VZ_h(
        'span',
        {
          style: Object.assign({}, abs, {
            top: 0,
            left: bp + '%',
            display: 'flex',
            height: '16px',
            width: '6px',
            transform: 'translateX(-50%)',
            justifyContent: 'center',
            background: '#FFFFFF',
          }),
        },
        VZ_h('span', {
          style: { display: 'block', height: '100%', width: '2px', background: VZ_C.ref },
        }),
      ),
      p.lowerIsBetter
        ? VZ_h('span', {
            style: Object.assign({}, abs, {
              top: '50%',
              left: vp + '%',
              display: 'block',
              height: '12px',
              width: '12px',
              transform: 'translate(-50%,-50%)',
              borderRadius: '999px',
              background: VZ_C.sea,
              boxShadow: '0 0 0 2px #FFFFFF',
            }),
          })
        : null,
    ),
    VZ_h(
      'div',
      { style: { position: 'relative', height: '20px' } },
      VZ_h(
        'span',
        {
          style: Object.assign({}, abs, at(bp), {
            top: '4px',
            fontSize: '11.5px',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            color: VZ_C.inkSoft,
          }),
        },
        p.benchmarkLabel !== undefined
          ? p.benchmarkLabel
          : 'Category average ' + format(p.benchmark),
      ),
    ),
    VZ_h(
      'div',
      {
        style: {
          marginTop: '6px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: VZ_C.tick,
        },
      },
      VZ_h('span', null, p.lowerIsBetter ? '← Faster · ' + format(0) : format(0)),
      VZ_h('span', null, format(max)),
    ),
  );
}

/* ---------- heatmap (Heatmap.tsx) ---------- */

const VZ_HM_ROW = 38;
const VZ_HM_GAP = 2;

/* Rows x columns of square cells (at least 16px, 3px radius, 2px gaps) on
   the sequential sea ramp, quantised to the given bin floors, with a
   labelled "Fewer ... More" scale. Only the single peak cell carries its
   number (ink on the light steps, white on the darkest, none on step 4).
   Keyboard moves in two dimensions; touch scrubs to the nearest cell. */
function VZ_Heatmap(p) {
  const rows = p.rows || [];
  const cols = p.cols || [];
  const values = p.values || [];
  const bins = p.bins || [0, 1, 3, 6, 10];
  const cellLabel = p.cellLabel || ((r, c, v) => r + ' ' + c + ' · ' + v);
  const [boxRef, width] = VZ_useWidth();
  const plotRef = React.useRef(null);
  const hintId = React.useId();
  const nr = rows.length;
  const nc = cols.length;
  const fit = Math.floor((width - VZ_HM_ROW - (nc - 1) * VZ_HM_GAP) / Math.max(1, nc));
  const cell = Math.max(16, Math.min(34, fit));
  const step = cell + VZ_HM_GAP;
  const gridW = nc * step - VZ_HM_GAP;
  const gridH = nr * step - VZ_HM_GAP;
  const svgW = VZ_HM_ROW + gridW;
  const height = gridH + 24;
  const ready = width > 0 && nr > 0 && nc > 0;
  const v = (r, c) => (values[r] && values[r][c] !== undefined ? values[r][c] : 0);
  const tone = (x) => VZ_seqIndex(VZ_quantize(x, bins), bins.length);
  /* the one cell holding the maximum, or none when it is shared or zero */
  let peak = null;
  let peakMax = 0;
  let peakCount = 0;
  values.forEach((row, r) =>
    (row || []).forEach((x, c) => {
      if (x > peakMax) {
        peakMax = x;
        peak = { r: r, c: c };
        peakCount = 1;
      } else if (x === peakMax && x > 0) peakCount += 1;
    }),
  );
  const single = peakCount === 1 ? peak : null;
  const labelEvery = Math.max(1, Math.ceil((VZ_max(cols.map((c) => VZ_textWidth(c))) + 8) / step));

  const nav = VZ_usePlotNav(plotRef, {
    initial: () => single || (nr && nc ? { r: 0, c: 0 } : null),
    keyMove: (key, cur) => {
      const a = cur || { r: 0, c: 0 };
      const cr = (r) => Math.max(0, Math.min(nr - 1, r));
      const cc = (c) => Math.max(0, Math.min(nc - 1, c));
      if (key === 'ArrowRight') return { r: a.r, c: cur ? cc(a.c + 1) : 0 };
      if (key === 'ArrowLeft') return { r: a.r, c: cur ? cc(a.c - 1) : nc - 1 };
      if (key === 'ArrowDown') return { r: cur ? cr(a.r + 1) : 0, c: a.c };
      if (key === 'ArrowUp') return { r: cur ? cr(a.r - 1) : nr - 1, c: a.c };
      if (key === 'Home') return { r: a.r, c: 0 };
      if (key === 'End') return { r: a.r, c: nc - 1 };
      return undefined;
    },
    pointAt: (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left - VZ_HM_ROW;
      const y = e.clientY - rect.top;
      return {
        r: Math.max(0, Math.min(nr - 1, Math.floor(y / step))),
        c: Math.max(0, Math.min(nc - 1, Math.floor(x / step))),
      };
    },
  });
  const active = nav.active && nav.active.r < nr && nav.active.c < nc ? nav.active : null;

  let header = '';
  const tipRows = [];
  if (active) {
    const text = cellLabel(rows[active.r], cols[active.c], v(active.r, active.c));
    const cut = text.lastIndexOf(' · ');
    header = cut > 0 ? text.slice(0, cut) : text;
    if (cut > 0)
      tipRows.push({
        key: 'v',
        color: VZ_C.seq[tone(v(active.r, active.c))],
        value: text.slice(cut + 3),
        label: '',
      });
  }
  const live =
    active && nav.source !== 'pointer'
      ? cellLabel(rows[active.r], cols[active.c], v(active.r, active.c))
      : '';
  const anchor = () =>
    active
      ? {
          x: VZ_HM_ROW + active.c * step + cell / 2,
          y: active.r * step,
          below: active.r * step + cell,
        }
      : null;

  const els = [];
  rows.forEach((row, r) => {
    els.push(
      VZ_h(
        'text',
        {
          key: 'r' + r,
          x: 0,
          y: VZ_px(r * step + cell / 2),
          dy: '0.32em',
          fontSize: 11,
          fill: VZ_C.tick,
          fontWeight: active && active.r === r ? 700 : 400,
        },
        row,
      ),
    );
  });
  values.forEach((row, r) =>
    (row || []).forEach((x, c) => {
      els.push(
        VZ_h('rect', {
          key: r + '-' + c,
          x: VZ_HM_ROW + c * step,
          y: r * step,
          width: cell,
          height: cell,
          rx: 3,
          fill: VZ_C.seq[tone(x)],
        }),
      );
    }),
  );
  if (single && tone(v(single.r, single.c)) !== 3) {
    els.push(
      VZ_h(
        'text',
        {
          key: 'peak',
          x: VZ_px(VZ_HM_ROW + single.c * step + cell / 2),
          y: VZ_px(single.r * step + cell / 2),
          dy: '0.34em',
          fontSize: 11,
          fontWeight: 700,
          textAnchor: 'middle',
          fill: tone(v(single.r, single.c)) === 4 ? VZ_C.surface : VZ_C.ink,
        },
        String(v(single.r, single.c)),
      ),
    );
  }
  cols.forEach((col, c) => {
    if (c % labelEvery !== 0) return;
    els.push(
      VZ_h(
        'text',
        {
          key: 'c' + c,
          x: VZ_px(VZ_HM_ROW + c * step + (labelEvery > 1 ? 0 : cell / 2)),
          y: gridH + 16,
          fontSize: 11,
          fill: VZ_C.tick,
          textAnchor: labelEvery > 1 ? 'start' : 'middle',
          fontWeight: active && active.c === c ? 700 : 400,
        },
        col,
      ),
    );
  });
  if (active) {
    els.push(
      VZ_h('rect', {
        key: 'ring',
        x: VZ_HM_ROW + active.c * step - 1.5,
        y: active.r * step - 1.5,
        width: cell + 3,
        height: cell + 3,
        rx: 4,
        fill: 'none',
        stroke: VZ_C.ink,
        strokeWidth: 2,
      }),
    );
  }
  const legend = VZ_binLabels(bins);
  return VZ_h(
    'div',
    { style: { minWidth: 0, fontFamily: VZ_FONT } },
    VZ_h(
      'div',
      { ref: boxRef, style: { position: 'relative', overflowX: 'auto', height: height + 'px' } },
      ready
        ? VZ_h(
            'svg',
            Object.assign({}, nav.bind, {
              role: 'group',
              'aria-label': p.ariaLabel,
              'aria-describedby': hintId,
              width: svgW,
              height: height,
              style: Object.assign(
                {
                  display: 'block',
                  touchAction: 'pan-y',
                  userSelect: 'none',
                  fontVariantNumeric: 'tabular-nums',
                  WebkitTapHighlightColor: 'transparent',
                },
                nav.focusStyle,
              ),
            }),
            VZ_h('g', { 'aria-hidden': 'true' }, els),
          )
        : null,
      active
        ? VZ_h(VZ_Tooltip, {
            boxRef: boxRef,
            anchor: anchor,
            placement: 'above',
            offset: 8,
            header: header,
            rows: tipRows,
          })
        : null,
      VZ_srP({ id: hintId }, VZ_GRID_HINT),
      VZ_srP({ 'aria-live': 'polite' }, live),
    ),
    VZ_h(
      'div',
      {
        'aria-hidden': 'true',
        style: {
          marginTop: '12px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          fontSize: '11px',
          color: VZ_C.inkSoft,
        },
      },
      VZ_h('span', { style: { paddingTop: '1px' } }, 'Fewer'),
      VZ_h(
        'div',
        { style: { display: 'flex', gap: '2px' } },
        legend.map((l, i) =>
          VZ_h(
            'div',
            {
              key: l,
              style: {
                display: 'flex',
                width: '32px',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              },
            },
            VZ_h('span', {
              style: {
                display: 'block',
                height: '12px',
                width: '100%',
                borderRadius: '3px',
                background: VZ_C.seq[VZ_seqIndex(i, bins.length)],
              },
            }),
            VZ_h('span', { style: { fontVariantNumeric: 'tabular-nums', color: VZ_C.tick } }, l),
          ),
        ),
      ),
      VZ_h('span', { style: { paddingTop: '1px' } }, 'More'),
    ),
  );
}

/* ---------- certificate expiry (ExpiryBar.tsx) ---------- */

const VZ_EXPIRY_COLOUR = {
  ok: '#047857',
  due: '#A84D08',
  lapsed: '#B91C1C',
  pending: '#8595A8',
  info: '#8595A8',
  rejected: '#8595A8',
};
/* Status never rides on colour alone: each settled state has a glyph. */
const VZ_EXPIRY_GLYPH = { ok: '✓', due: '⚠', lapsed: '✗', pending: '', info: '', rejected: '' };
/* The alert tiers (90 / 30 / 7), nearest first: the supplier rule's own list. */
const VZ_EXPIRY_RULES = DC_DATA.ALERT_TIERS.slice().sort((a, b) => a - b);

/* Days left on a certificate: a 0-180 day bar whose colour comes from the
   certificate's state (DK_vaultRows, which reads DK_alertTier), with 1px
   rules at each of DC_DATA.ALERT_TIERS, so neither the colour nor the rules
   can drift from the supplier rule. Longer terms clamp with a pointed end
   and keep their real number; a submission awaiting the SVS team is neutral
   grey. Static: role img, `label` is what a screen reader hears ("Expires
   in 171 days, 13 Mar 2027"). */
function VZ_Expiry(p) {
  const max = p.max || 180;
  const state = VZ_EXPIRY_COLOUR[p.state] ? p.state : 'pending';
  const days = typeof p.daysLeft === 'number' ? p.daysLeft : null;
  const lapsed = state === 'lapsed' || (days !== null && days <= 0);
  const over = days !== null && days > max;
  const pc = days === null || lapsed ? 0 : Math.min(1, days / max) * 100;
  const colour = lapsed ? VZ_C.status.lapsed : VZ_EXPIRY_COLOUR[state];
  const glyph = lapsed ? VZ_EXPIRY_GLYPH.lapsed : VZ_EXPIRY_GLYPH[state];
  const text = lapsed
    ? 'Lapsed'
    : days === null
      ? '—'
      : days.toLocaleString('en-GB') + (days === 1 ? ' day' : ' days');
  const scale = p.scale || p.showScale;
  const abs = { position: 'absolute', display: 'block' };
  return VZ_h(
    'div',
    { role: 'img', 'aria-label': p.label, style: { userSelect: 'none', fontFamily: VZ_FONT } },
    VZ_h(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
      VZ_h(
        'div',
        { style: { position: 'relative', height: '14px', minWidth: 0, flex: '1 1 0%' } },
        VZ_h('span', {
          style: Object.assign({}, abs, {
            left: 0,
            right: 0,
            top: '3px',
            height: '8px',
            borderRadius: '999px',
            background: VZ_C.hover,
          }),
        }),
        pc > 0
          ? VZ_h('span', {
              style: Object.assign(
                {},
                abs,
                {
                  top: '3px',
                  left: 0,
                  height: '8px',
                  borderRadius: '999px',
                  width: pc + '%',
                  minWidth: '4px',
                  background: colour,
                },
                over
                  ? {
                      borderRadius: '9999px 0 0 9999px',
                      clipPath:
                        'polygon(0 0, calc(100% - 5px) 0, 100% 50%, calc(100% - 5px) 100%, 0 100%)',
                    }
                  : {},
              ),
            })
          : null,
        VZ_EXPIRY_RULES.map((d) =>
          VZ_h('span', {
            key: d,
            style: Object.assign({}, abs, {
              top: 0,
              height: '14px',
              width: '1px',
              left: (d / max) * 100 + '%',
              background: VZ_C.context,
            }),
          }),
        ),
        lapsed
          ? VZ_h('span', {
              style: Object.assign({}, abs, {
                top: '1px',
                left: 0,
                height: '12px',
                width: '12px',
                borderRadius: '999px',
                background: VZ_C.status.lapsed,
                boxShadow: '0 0 0 2px #FFFFFF',
              }),
            })
          : null,
      ),
      VZ_h(
        'span',
        {
          style: {
            width: '72px',
            flexShrink: 0,
            textAlign: 'right',
            fontSize: '12px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            color: VZ_C.ink,
            fontVariantNumeric: 'tabular-nums',
          },
        },
        glyph
          ? VZ_h(
              'span',
              { 'aria-hidden': 'true', style: { marginRight: '4px', color: colour } },
              glyph,
            )
          : null,
        text,
      ),
    ),
    scale
      ? VZ_h(
          'div',
          {
            style: {
              position: 'relative',
              marginTop: '2px',
              marginRight: '82px',
              height: '14px',
              fontSize: '10.5px',
              lineHeight: 1,
              color: VZ_C.inkSoft,
            },
          },
          VZ_EXPIRY_RULES.map((d, i) =>
            VZ_h(
              'span',
              {
                key: d,
                style: {
                  position: 'absolute',
                  top: '2px',
                  left: (d / max) * 100 + '%',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                },
              },
              i === VZ_EXPIRY_RULES.length - 1 ? d + ' days' : String(d),
            ),
          ),
        )
      : null,
  );
}

/* ---------- sparkline and stat card (ui/Sparkline.tsx, ui/StatCard.tsx) ---------- */

/* A 2px line over a flat 10% wash (no gradient) and an r=4 end dot on a 2px
   white ring. The dot is HTML over the stretched SVG so it stays round at
   any width. Decorative: the number beside it carries the meaning. */
function VZ_Spark(p) {
  const points = p.points || p.values || [];
  const W = 100;
  const H = p.height || 28;
  const stroke = p.stroke || p.color || VZ_C.sea;
  const endDot = p.endDot !== false;
  const padY = endDot ? 6 : 2;
  const n = points.length;
  if (n === 0) return null;
  const min = Math.min.apply(null, points);
  const max = Math.max.apply(null, points);
  const span = max - min || 1;
  const coords = points.map((q, i) => {
    const x = n === 1 ? W : (i / (n - 1)) * W;
    const y = padY + (1 - (q - min) / span) * (H - padY * 2);
    return [Number(x.toFixed(2)), Number(y.toFixed(2))];
  });
  const line = coords.map((c, i) => (i === 0 ? 'M' : 'L') + c[0] + ' ' + c[1]).join(' ');
  const area = line + ' L' + coords[n - 1][0] + ' ' + H + ' L' + coords[0][0] + ' ' + H + ' Z';
  const end = coords[n - 1];
  return VZ_h(
    'div',
    { 'aria-hidden': 'true', style: Object.assign({ width: '100%' }, p.style || {}) },
    VZ_h(
      'div',
      { style: { position: 'relative', height: H + 'px', marginRight: endDot ? '6px' : 0 } },
      VZ_h(
        'svg',
        {
          viewBox: '0 0 ' + W + ' ' + H,
          preserveAspectRatio: 'none',
          style: {
            position: 'absolute',
            inset: 0,
            display: 'block',
            height: '100%',
            width: '100%',
            overflow: 'visible',
          },
        },
        VZ_h('path', { d: area, fill: stroke, fillOpacity: 0.1 }),
        VZ_h('path', {
          d: line,
          fill: 'none',
          stroke: stroke,
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          vectorEffect: 'non-scaling-stroke',
        }),
      ),
      endDot
        ? VZ_h('span', {
            style: {
              position: 'absolute',
              display: 'block',
              height: '8px',
              width: '8px',
              left: end[0] + '%',
              top: (end[1] / H) * 100 + '%',
              transform: 'translate(-50%,-50%)',
              borderRadius: '999px',
              background: stroke,
              boxShadow: '0 0 0 2px #FFFFFF',
            },
          })
        : null,
    ),
  );
}

/* Label and number lead, the delta reads as a tinted chip against a named
   period, and an optional 36px sparkline makes the number feel tracked. */
function VZ_Kpi(p) {
  const tone = VZ_TONES[p.deltaTone || 'success'] || VZ_TONES.success;
  return VZ_h(
    'div',
    {
      'data-testid': p.testId,
      style: Object.assign({}, VZ_CARD, { display: 'flex', flexDirection: 'column', minWidth: 0 }),
    },
    VZ_h('p', { style: { margin: 0, fontSize: '12px', color: VZ_C.inkSoft } }, p.label),
    VZ_h(
      'p',
      {
        style: {
          margin: '2px 0 0',
          fontFamily: VZ_DISPLAY,
          fontSize: '26px',
          lineHeight: 1.25,
          fontWeight: 700,
          color: VZ_C.ink,
        },
      },
      p.value,
    ),
    p.delta
      ? VZ_h(
          'p',
          { style: { margin: '6px 0 0' } },
          VZ_h(
            'span',
            {
              style: {
                display: 'inline-block',
                maxWidth: '100%',
                borderRadius: '10px',
                padding: '2px 8px',
                fontSize: '11.5px',
                lineHeight: 1.375,
                fontWeight: 700,
                background: tone[0],
                color: tone[1],
              },
            },
            p.delta,
          ),
        )
      : null,
    p.series && p.series.length > 1
      ? VZ_h(VZ_Spark, {
          points: p.series,
          height: 36,
          style: { marginTop: 'auto', paddingTop: '12px' },
        })
      : null,
  );
}

/* A headline figure for a figure's header row: at most 22px (the one 44px
   lead number lives on the consolidation card alone). */
function VZ_stat(p) {
  return VZ_h(
    'span',
    {
      key: p.key,
      style: { display: 'inline-flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' },
    },
    VZ_h(
      'span',
      {
        style: {
          fontFamily: VZ_DISPLAY,
          fontSize: p.size || '22px',
          fontWeight: 700,
          color: VZ_C.ink,
          lineHeight: 1.2,
        },
      },
      p.value,
    ),
    p.label ? VZ_h('span', { style: { fontSize: '12.5px', color: VZ_C.inkSoft } }, p.label) : null,
  );
}

function VZ_chip(text, tone) {
  const t = VZ_TONES[tone] || VZ_TONES.neutral;
  return VZ_h(
    'span',
    {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: '999px',
        padding: '3px 10px',
        fontSize: '11.5px',
        fontWeight: 700,
        background: t[0],
        color: t[1],
      },
    },
    text,
  );
}

/* The deck's pressed-button switch (the Client / Supplier view switch, and
   the analytics period), as an element: aria-pressed buttons in one
   bordered group, 44px tall on a phone. */
function VZ_Segmented(p) {
  const touch = VZ_useMedia(VZ_TOUCH);
  return VZ_h(
    'div',
    {
      role: 'group',
      'aria-label': p.label,
      style: {
        display: 'inline-flex',
        border: '1.5px solid #CBD6E2',
        borderRadius: '8px',
        background: '#FFFFFF',
        padding: '3px',
        gap: '2px',
      },
    },
    (p.options || []).map((o) =>
      VZ_h(
        'button',
        {
          key: o.label,
          type: 'button',
          'aria-pressed': o.pressed ? 'true' : 'false',
          onClick: o.onClick,
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            border: 'none',
            borderRadius: '6px',
            padding: '0 12px',
            minHeight: touch ? '44px' : '32px',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            background: o.pressed ? '#0A2540' : 'transparent',
            color: o.pressed ? '#FFFFFF' : '#33475F',
          },
        },
        o.label,
      ),
    ),
  );
}

/* ---------- the public kit ---------- */

const VZ = {
  C: VZ_C,
  LINE_COLOURS: VZ_LINE_COLOURS,
  num: VZ_num,
  gbp: VZ_gbp,
  compactGbp: VZ_compactGbp,
  niceTicks: VZ_niceTicks,
  fitTicks: VZ_fitTicks,
  figure: (p) => VZ_h(VZ_Figure, p),
  timeSeries: (p) => VZ_h(VZ_TimeSeries, p),
  stacked: (p) => VZ_h(VZ_Stacked, p),
  hbars: (p) => VZ_h(VZ_HBars, p),
  funnel: (p) => VZ_h(VZ_Funnel, p),
  benchmark: (p) => VZ_h(VZ_Benchmark, p),
  heatmap: (p) => VZ_h(VZ_Heatmap, p),
  expiry: (p) => VZ_h(VZ_Expiry, p),
  sparkline: (values, opts) => VZ_h(VZ_Spark, Object.assign({}, opts || {}, { points: values })),
  legend: (items) => VZ_legendEl(items),
  table: (spec) => VZ_tableEl(spec),
  kpi: (p) => VZ_h(VZ_Kpi, p),
  stat: (p) => VZ_stat(p),
  chip: (text, tone) => VZ_chip(text, tone),
  segmented: (p) => VZ_h(VZ_Segmented, p),
};

/* ---------- kitchen-sink gallery (sample data, illustrative only) ---------- */

const VZ_WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const VZ_MONTH = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/* A deterministic series with an exact total: weekday-heavy, a gentle rise. */
function VZ_sample(days, total, seed, trend) {
  let s = seed >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const w = days.map((d, i) => {
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    return (weekend ? 0.4 : 1) * (1 + (trend * i) / days.length) * (0.7 + 0.6 * rnd());
  });
  const sum = w.reduce((a, b) => a + b, 0);
  const raw = w.map((x) => (x / sum) * total);
  const out = raw.map(Math.floor);
  let rem = total - out.reduce((a, b) => a + b, 0);
  raw
    .map((x, i) => [x - Math.floor(x), i])
    .sort((a, b) => b[0] - a[0])
    .forEach((pair) => {
      if (rem > 0) {
        out[pair[1]] += 1;
        rem -= 1;
      }
    });
  return out;
}

let VZ_GALLERY_DATA = null;
function VZ_galleryData() {
  if (VZ_GALLERY_DATA) return VZ_GALLERY_DATA;
  const days = [];
  for (let i = 89; i >= 0; i--) days.push(new Date(2026, 8, 23 - i));
  const labels = days.map(
    (d) => VZ_WEEKDAY[d.getDay()] + ' ' + d.getDate() + ' ' + VZ_MONTH[d.getMonth()],
  );
  const views = VZ_sample(days.slice(0, 30), 318, 7, 0.2)
    .concat(VZ_sample(days.slice(30, 60), 349, 11, 0.2))
    .concat(VZ_sample(days.slice(60), 412, 23, 0.25));
  const requests = VZ_sample(days.slice(0, 30), 29, 5, 0.1)
    .concat(VZ_sample(days.slice(30, 60), 34, 9, 0.1))
    .concat(VZ_sample(days.slice(60), 38, 31, 0.1));
  /* one clear peak in the latest 30 days (a Tuesday), total unchanged */
  const tail = requests.slice(60);
  const peakAt = 60 + tail.findIndex((v, i) => days[60 + i].getDay() === 2 && i > 5 && i < 25);
  if (peakAt >= 60) {
    requests[peakAt] = VZ_max(tail) + 1;
    let extra = requests.slice(60).reduce((a, b) => a + b, 0) - 38;
    for (let i = 60; i < 89 && extra > 0; i++) {
      if (i !== peakAt && requests[i] > 0) {
        requests[i] -= 1;
        extra -= 1;
      }
    }
  }
  const category = days.map((d, i) => {
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    return Math.round((9.1 + (weekend ? -3.2 : 1.3) + 0.6 * Math.sin(i / 5)) * 10) / 10;
  });
  VZ_GALLERY_DATA = { labels: labels, views: views, requests: requests, category: category };
  return VZ_GALLERY_DATA;
}

function VZ_GalleryTraffic() {
  const [period, setPeriod] = React.useState(30);
  const d = VZ_galleryData();
  const from = d.labels.length - period;
  const labels = d.labels.slice(from);
  const views = d.views.slice(from);
  const category = d.category.slice(from);
  let requests = d.requests.slice(from);
  if (period === 90) {
    requests = VZ_binRanges(90, 13).map((r) =>
      requests.slice(r[0], r[1] + 1).reduce((a, b) => a + b, 0),
    );
  }
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  return VZ.figure({
    title: 'Views and quote requests',
    subtitle:
      period === 30
        ? 'Per day, last 30 days · sample data'
        : 'Views per day, requests per week, last 90 days · sample data',
    takeaway:
      'Views and requests both rose across the period; views ran above the category average on weekdays.',
    headline: [
      VZ.stat({ key: 'v', value: VZ_num(sum(views)), label: 'profile views' }),
      VZ.stat({ key: 'r', value: VZ_num(sum(requests)), label: 'quote requests' }),
    ],
    action: VZ.segmented({
      label: 'Period',
      options: [
        { label: '30 days', pressed: period === 30, onClick: () => setPeriod(30) },
        { label: '90 days', pressed: period === 90, onClick: () => setPeriod(90) },
      ],
    }),
    table: {
      caption: 'Profile views per day, with the category average',
      columns: ['Day', 'Profile views', 'Category average'],
      rows: labels.map((l, i) => [l, VZ_num(views[i]), category[i].toFixed(1)]),
    },
    children: VZ.timeSeries({
      labels: labels,
      ariaLabel: 'Profile views per day and quote requests, with the category average',
      panels: [
        {
          id: 'views',
          label: 'Profile views per day',
          kind: 'area',
          values: views,
          format: VZ_num,
          benchmark: { label: 'Category average', values: category },
        },
        {
          id: 'requests',
          label: period === 30 ? 'Quote requests' : 'Quote requests per week',
          kind: 'columns',
          values: requests,
          format: VZ_num,
        },
      ],
    }),
  });
}

const VZ_SPEND = {
  months: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
  agency: [23000, 24000, 21000, 26000, 25000, 27000],
  logistics: [8000, 9000, 7000, 10000, 9000, 11000],
  customs: [4000, 4000, 3000, 5000, 4000, 5000],
  procurement: [4000, 4000, 5000, 4000, 4000, 4000],
};

function VZ_GallerySpend() {
  const [held, setHeld] = React.useState({ logistics: true, customs: true });
  const touch = VZ_useMedia(VZ_TOUCH);
  const lines = ['agency', 'logistics', 'customs', 'procurement'].filter(
    (id) => id === 'agency' || id === 'procurement' || held[id],
  );
  const names = {
    agency: 'Agency',
    logistics: 'Logistics',
    customs: 'Customs',
    procurement: 'Procurement',
  };
  const pct = held.customs ? 7 : held.logistics ? 4 : 2;
  const series = lines.map((id) => ({
    id: id,
    label: names[id],
    color: VZ_LINE_COLOURS[id],
    values: VZ_SPEND[id],
  }));
  const totals = VZ_SPEND.months.map((_, i) => series.reduce((s, se) => s + se.values[i], 0));
  const saving = totals.map((t) => Math.round((t * pct) / 100));
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const toggle = (id) => setHeld(Object.assign({}, held, { [id]: !held[id] }));
  return VZ.figure({
    title: 'GAC spend, last six months',
    subtitle: 'By service line, with what the tier discount saved underneath · sample data',
    takeaway:
      'Agency is the largest line every month; the tier discount saved ' +
      VZ_gbp(sum(saving)) +
      ' over six months.',
    headline: [
      VZ.stat({ key: 't', value: VZ_gbp(sum(totals)), label: 'over six months' }),
      VZ.stat({ key: 's', value: VZ_gbp(sum(saving)), label: 'saved at ' + pct + '%' }),
    ],
    action: VZ_h(
      'div',
      {
        role: 'group',
        'aria-label': 'Lines held',
        style: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
      },
      ['logistics', 'customs'].map((id) => {
        const on = !!held[id];
        return VZ_h(
          'button',
          {
            key: id,
            type: 'button',
            'aria-pressed': on ? 'true' : 'false',
            onClick: () => toggle(id),
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '999px',
              padding: '0 12px',
              minHeight: touch ? '44px' : '32px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              border: '1.5px solid ' + (on ? '#0A2540' : '#CBD6E2'),
              background: on ? '#0A2540' : '#FFFFFF',
              color: on ? '#FFFFFF' : '#33475F',
            },
          },
          VZ_h('span', { 'aria-hidden': 'true' }, on ? '✓' : '+'),
          names[id],
        );
      }),
    ),
    legend: series.map((se) => ({ label: se.label, color: se.color })),
    footnote:
      'Illustrative figures. Colour follows the line: switching one off never repaints the others.',
    table: {
      caption: 'GAC spend by service line and month, with the tier saving',
      columns: ['Month'].concat(
        series.map((se) => se.label),
        ['Total', 'Saved'],
      ),
      rows: VZ_SPEND.months.map((m, i) =>
        [m].concat(
          series.map((se) => VZ_gbp(se.values[i])),
          [VZ_gbp(totals[i]), VZ_gbp(saving[i])],
        ),
      ),
    },
    children: VZ.stacked({
      categories: VZ_SPEND.months,
      series: series,
      format: VZ_gbp,
      axisFormat: VZ_compactGbp,
      directLabelLast: true,
      lower: {
        label: 'Saved by your tier discount',
        color: VZ_C.derived,
        values: saving,
        format: VZ_gbp,
      },
      ariaLabel:
        'GAC spend by service line for each month from April to September, with the monthly tier saving below',
    }),
  });
}

function VZ_galleryVals() {
  const won = [7200, 9850, 6400, 11300, 8750, 12600];
  const keep = won.map((w) => Math.round(w * 0.9));
  const band = won.map((w, i) => w - keep[i]);
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const d = VZ_galleryData();
  const last30Views = d.views.slice(60);
  const last30Req = d.requests.slice(60);
  const sources = [
    { id: 'search', label: 'Marketplace search', value: 168 },
    { id: 'category', label: 'Welding category page', value: 104 },
    { id: 'promoted', label: 'Promoted placement', value: 71, tag: '▲ Promoted' },
    { id: 'hub', label: 'Service-line hub', value: 38 },
    { id: 'other', label: 'Direct link and other', value: 31, color: VZ_C.other },
  ].map((r) =>
    Object.assign(r, { valueLabel: r.value + ' · ' + Math.round((r.value / 412) * 100) + '%' }),
  );
  const ratings = [5, 4, 3, 2, 1].map((s, i) => ({
    id: 'r' + s,
    label: s + ' ★',
    value: [42, 21, 6, 2, 1][i],
  }));
  const funnel = [
    { label: 'Appeared in search', value: 2960 },
    { label: 'Opened your profile', value: 412 },
    { label: 'Asked for a quote', value: 38 },
    { label: 'Quoted', value: 35 },
    { label: 'Won', value: 12 },
  ];
  const rates = ['13.9% opened your profile', '9.2% asked for a quote', '92% quoted', '34% won'];
  const heat = [
    [0, 0, 0, 1, 2, 2, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 5, 2, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 2, 1, 2, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 2, 1, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  ];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayNames = {
    Mon: 'Monday',
    Tue: 'Tuesday',
    Wed: 'Wednesday',
    Thu: 'Thursday',
    Fri: 'Friday',
    Sat: 'Saturday',
    Sun: 'Sunday',
  };
  const blocks = [];
  for (let i = 0; i < 12; i++)
    blocks.push(String(i * 2).padStart(2, '0') + '–' + String(i * 2 + 2).padStart(2, '0'));
  const blockTime = (b) => b.split('–')[0] + ':00–' + b.split('–')[1] + ':00';
  const certs = [
    {
      name: 'Coded welder qualifications',
      daysLeft: 171,
      state: 'ok',
      label: 'Expires in 171 days, 13 Mar 2027',
    },
    {
      name: 'Employers’ and public liability insurance',
      daysLeft: 130,
      state: 'ok',
      label: 'Expires in 130 days, 31 Jan 2027',
    },
    {
      name: 'GWO Basic Safety Training',
      daysLeft: 21,
      state: 'due',
      label: 'Renewal due: expires in 21 days',
    },
    { name: 'Offshore medical', daysLeft: 0, state: 'lapsed', label: 'Lapsed' },
    {
      name: 'ISO 9001 quality management (awaiting review)',
      daysLeft: 1076,
      state: 'pending',
      label: 'Awaiting SVS review: expires in 1,076 days',
    },
  ];
  const para = (text, extra) =>
    VZ_h(
      'p',
      { style: Object.assign({ margin: 0, fontSize: '12.5px', color: VZ_C.inkSoft }, extra || {}) },
      text,
    );
  return {
    vzGalleryPalette: VZ_h(
      'div',
      { style: Object.assign({}, VZ_CARD, { padding: '18px 22px' }) },
      VZ_h(
        'p',
        {
          style: {
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            color: VZ_C.sea,
            margin: '0 0 12px',
          },
        },
        'Chart palette',
      ),
      VZ_h(
        'div',
        {
          style: { display: 'flex', flexWrap: 'wrap', gap: '14px 28px', alignItems: 'flex-start' },
        },
        [
          [
            'Service lines, fixed to the line',
            [
              ['Agency', VZ_C.sea],
              ['Logistics', VZ_C.sky],
              ['Customs', VZ_C.rose],
              ['Procurement', VZ_C.seafoam],
              ['Other', VZ_C.other],
            ],
          ],
          ['Sequential (heatmap)', VZ_C.seq.map((c, i) => [String(i + 1), c])],
          ['Ordinal (funnel)', VZ_C.ord.map((c, i) => [String(i + 1), c])],
          [
            'Context',
            [
              ['Benchmark', VZ_C.context],
              ['Band', VZ_C.deduction],
              ['Saving', VZ_C.derived],
              ['Track', VZ_C.track],
            ],
          ],
        ].map((grp, gi) =>
          VZ_h(
            'div',
            { key: gi, style: { minWidth: 0 } },
            VZ_h(
              'p',
              { style: { fontSize: '12px', fontWeight: 700, color: VZ_C.ink, margin: '0 0 6px' } },
              grp[0],
            ),
            VZ_h(
              'div',
              { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
              grp[1].map((sw, si) =>
                VZ_h(
                  'span',
                  {
                    key: si,
                    style: {
                      display: 'inline-flex',
                      flexDirection: 'column',
                      gap: '3px',
                      fontSize: '11px',
                      color: VZ_C.inkSoft,
                      width: gi === 0 || gi === 3 ? '70px' : '30px',
                    },
                  },
                  VZ_h('span', {
                    style: {
                      height: '22px',
                      borderRadius: '4px',
                      background: sw[1],
                      border: sw[1] === VZ_C.track ? '1px solid #E5EAF1' : 'none',
                    },
                  }),
                  sw[0],
                ),
              ),
            ),
          ),
        ),
      ),
      para(
        'Validated for colour-blind separation on white. Procurement sits below 3:1, so it is always direct-labelled or in the table. Gold never appears in a chart, and status colours only ever mean status.',
        { fontSize: '12px', margin: '12px 0 0' },
      ),
    ),
    vzGalleryKpis: VZ_h(
      'div',
      {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(min(220px,100%),1fr))',
          gap: '14px',
        },
      },
      VZ.kpi({
        key: 'k1',
        label: 'Profile views (30 days)',
        value: VZ_num(sum(last30Views)),
        delta: '+18% on the previous 30 days',
        series: last30Views,
      }),
      VZ.kpi({
        key: 'k2',
        label: 'Quote requests (30 days)',
        value: VZ_num(sum(last30Req)),
        delta: '+12% on the previous 30 days',
        series: last30Req,
      }),
      VZ.kpi({ key: 'k3', label: 'Win rate', value: '34%', delta: '+4 pts · 12 won of 35 quoted' }),
      VZ.kpi({ key: 'k4', label: 'Avg. response time', value: '2.1 hrs', delta: '0.5 hrs faster' }),
    ),
    vzGalleryTraffic: VZ_h(VZ_GalleryTraffic),
    vzGallerySpend: VZ_h(VZ_GallerySpend),
    vzGalleryEarnings: VZ.figure({
      title: 'Earnings through the platform',
      subtitle: 'Work won, and what you keep after your band · sample data',
      takeaway:
        'September was the strongest month: ' +
        VZ_gbp(keep[5]) +
        ' kept of ' +
        VZ_gbp(won[5]) +
        ' won.',
      headline: [
        VZ.stat({ key: 'k', value: VZ_gbp(sum(keep)), label: 'kept' }),
        VZ.stat({ key: 'w', value: VZ_gbp(sum(won)), label: 'won', size: '15px' }),
      ],
      legend: [
        { label: 'You keep', color: VZ_C.sea },
        { label: '10% Premium band', color: VZ_C.deduction },
      ],
      table: {
        caption: 'Work won through the platform by month',
        columns: ['Month', 'Won', 'Band', 'You keep'],
        rows: VZ_SPEND.months.map((m, i) => [m, VZ_gbp(won[i]), VZ_gbp(band[i]), VZ_gbp(keep[i])]),
      },
      children: VZ.stacked({
        categories: VZ_SPEND.months,
        series: [
          { id: 'keep', label: 'You keep', color: VZ_C.sea, values: keep },
          { id: 'band', label: '10% Premium band', color: VZ_C.deduction, values: band },
        ],
        format: VZ_gbp,
        axisFormat: VZ_compactGbp,
        directLabelLast: true,
        ariaLabel:
          'Work won each month from April to September, split into what you keep and the 10% band',
      }),
    }),
    vzGalleryFunnel: VZ.figure({
      title: 'From search to signed job',
      subtitle: 'Last 30 days · sample data',
      takeaway: '2,960 search appearances became 12 won jobs; 92% of requests were quoted.',
      table: {
        caption: 'Funnel steps, last 30 days',
        columns: ['Step', 'Count', 'Rate from the step before'],
        rows: funnel.map((s, i) => [
          s.label,
          VZ_num(s.value),
          i ? rates[i - 1].split(' ')[0] : '—',
        ]),
      },
      children: VZ.funnel({
        steps: funnel,
        format: VZ_num,
        rateLabels: rates,
        ariaLabel: 'Funnel from search appearances to won jobs',
      }),
    }),
    vzGalleryBenchmark: VZ.figure({
      title: 'Against your category',
      subtitle: 'Premium · market benchmarking · sample data',
      takeaway: 'Win rate 7 points above the category average; response 3.3 hours faster.',
      footnote: 'Category average across verified Welding suppliers on the platform, anonymised.',
      table: {
        caption: 'You against the category average',
        columns: ['Measure', 'You', 'Category average'],
        rows: [
          ['Win rate', '34%', '27%'],
          ['Avg. response time', '2.1 hrs', '5.4 hrs'],
        ],
      },
      children: VZ_h(
        'div',
        {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(min(220px,100%),1fr))',
            gap: '22px 28px',
          },
        },
        VZ_h(
          'div',
          { key: 'win', style: { minWidth: 0 } },
          VZ_h(
            'p',
            { style: { fontSize: '12.5px', fontWeight: 700, color: VZ_C.ink, margin: '0 0 8px' } },
            'Win rate',
          ),
          VZ.benchmark({
            value: 34,
            benchmark: 27,
            max: 50,
            format: (n) => n + '%',
            ariaLabel: 'Win rate 34%, 7 points above the category average of 27%.',
          }),
          para('7 points above the category average', { margin: '8px 0 0' }),
        ),
        VZ_h(
          'div',
          { key: 'resp', style: { minWidth: 0 } },
          VZ_h(
            'p',
            { style: { fontSize: '12.5px', fontWeight: 700, color: VZ_C.ink, margin: '0 0 8px' } },
            'Avg. response time',
          ),
          VZ.benchmark({
            value: 2.1,
            benchmark: 5.4,
            max: 8,
            lowerIsBetter: true,
            format: (n) => n + ' hrs',
            ariaLabel:
              'Average response 2.1 hours, 3.3 hours faster than the category average of 5.4 hours.',
          }),
          para('3.3 hrs faster than the category average', { margin: '8px 0 0' }),
        ),
      ),
    }),
    vzGallerySources: VZ.figure({
      title: 'Where clients found you',
      subtitle: 'Profile views by source, last 30 days · sample data',
      takeaway: 'Marketplace search brought 41% of profile views.',
      table: {
        caption: 'Profile views by source, last 30 days',
        columns: ['Source', 'Views', 'Share'],
        rows: sources.map((r) => [
          r.label,
          VZ_num(r.value),
          Math.round((r.value / 412) * 100) + '%',
        ]),
      },
      children: VZ.hbars({ rows: sources, format: VZ_num, ariaLabel: 'Profile views by source' }),
    }),
    vzGalleryRatings: VZ.figure({
      title: 'Ratings',
      subtitle: 'All time · sample data',
      takeaway: '4.4 stars from 72 ratings; 42 of them five stars.',
      headline: VZ.stat({ value: '4.4 ★', label: '· 72 ratings' }),
      table: {
        caption: 'Ratings by stars, all time',
        columns: ['Stars', 'Ratings'],
        rows: ratings.map((r) => [r.label, VZ_num(r.value)]),
      },
      children: VZ.hbars({
        rows: ratings,
        format: VZ_num,
        ariaLabel: 'Ratings by number of stars',
      }),
    }),
    vzGalleryHeatmap: VZ.figure({
      title: 'When requests arrive',
      subtitle: 'Quote requests by weekday and time, last 30 days · sample data',
      takeaway: 'Tuesday 08:00–10:00 is the busiest block, with 5 requests.',
      table: {
        caption: 'Quote requests by weekday and two-hour block',
        columns: ['Day'].concat(blocks),
        rows: days.map((w, r) => [dayNames[w]].concat(heat[r].map(String))),
      },
      children: VZ.heatmap({
        rows: days,
        cols: blocks,
        values: heat,
        bins: [0, 1, 2, 3, 5],
        cellLabel: (rw, cl, v) =>
          dayNames[rw] + ' ' + blockTime(cl) + ' · ' + v + (v === 1 ? ' request' : ' requests'),
        ariaLabel: 'Quote requests by weekday and two-hour block',
      }),
    }),
    vzGalleryExpiry: VZ.figure({
      title: 'Certificate expiry',
      subtitle: 'Days left on a 180-day scale, rules at 90, 30 and 7 days · sample data',
      takeaway: 'One certificate is due for renewal and one has lapsed.',
      table: {
        caption: 'Certificates and days left',
        columns: ['Certificate', 'Days left', 'State'],
        rows: certs.map((c) => [
          c.name,
          c.state === 'lapsed' ? 'Lapsed' : VZ_num(c.daysLeft),
          c.label.split(':')[0],
        ]),
      },
      children: VZ_h(
        'div',
        { style: { display: 'grid', gap: '14px' } },
        certs.map((c, i) =>
          VZ_h(
            'div',
            { key: i, style: { minWidth: 0 } },
            VZ_h(
              'p',
              {
                style: { fontSize: '12.5px', fontWeight: 700, color: VZ_C.ink, margin: '0 0 4px' },
              },
              c.name,
            ),
            VZ.expiry({ daysLeft: c.daysLeft, state: c.state, label: c.label, scale: i === 0 }),
          ),
        ),
      ),
    }),
  };
}

(Component._features = Component._features || []).push({
  vals(st) {
    if (st.route !== 'kitchen-sink') {
      return {
        vzGalleryPalette: null,
        vzGalleryKpis: null,
        vzGalleryTraffic: null,
        vzGallerySpend: null,
        vzGalleryEarnings: null,
        vzGalleryFunnel: null,
        vzGalleryBenchmark: null,
        vzGallerySources: null,
        vzGalleryRatings: null,
        vzGalleryHeatmap: null,
        vzGalleryExpiry: null,
      };
    }
    return VZ_galleryVals();
  },
});
