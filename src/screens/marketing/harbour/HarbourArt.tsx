import type { ServiceId } from './services';

/**
 * Original flat illustration in GAC colours, transcribed 1:1 from the
 * "GAC Services Landing" design handoff. All artwork is original to this
 * project (07_GUARDRAILS: no third-party art).
 *
 * The scene assembles itself once on mount (landing refresh, 2 Sep): the sea,
 * quay and road rise together, then the vessels and plant that work them, then
 * the route and the pin that say where the call is. It is a sequence of CSS
 * animations with delays rather than a script, so the `prefers-reduced-motion`
 * rule in `tokens.css` — which zeroes durations *and* delays — collapses the
 * whole thing to a finished scene without a second code path here.
 *
 * Everything transformed inside the SVG carries `transform-box: fill-box` and
 * an explicit origin (the `.svg-anim` class), or the transform resolves against
 * the 1600×900 viewBox and the part leaves the picture.
 */

/** One easing per kind of movement, named so the timings below stay readable. */
const EASE_RISE = 'cubic-bezier(.2,.8,.2,1)';
const EASE_SAIL = 'cubic-bezier(.25,.6,.2,1)';
const EASE_DRIVE = 'cubic-bezier(.2,.7,.2,1)';
const EASE_SETTLE = 'cubic-bezier(.34,1.3,.64,1)';

/** Entrance animation for each hotspot's inner wrapper. The lift on hover
 *  lives on the `<button>` itself, so the two transforms never fight. */
export const HOTSPOT_ENTRANCE: Record<ServiceId, string> = {
  assets: `rise-in 1s 1.3s ${EASE_RISE} both`,
  agency: `sail-in 2.6s 1.1s ${EASE_SAIL} both`,
  marketplace: `rig-in 1.2s 1.5s ${EASE_RISE} both`,
  procurement: `rise-in .9s 1.7s ${EASE_RISE} both`,
  customs: `rise-in .9s 1.9s ${EASE_RISE} both`,
  logistics: `drive-in 1.5s 2.7s ${EASE_DRIVE} both`,
};

/** The label chips land last, once everything they name has arrived. */
export const HOTSPOT_CHIP_DELAY: Record<ServiceId, string> = {
  assets: '4.1s',
  agency: '4.2s',
  marketplace: '4.3s',
  procurement: '4.4s',
  customs: '4.5s',
  logistics: '4.6s',
};

/** Night-harbour backdrop: sky, sea, quay, road. Stretches with container. */
export function SceneBackground({ onClear }: { onClear: () => void }) {
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="none"
      onClick={onClear}
      className="absolute inset-0 block h-full w-full cursor-default"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="harbour-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#04101F" />
          <stop offset="1" stopColor="#0C2C4E" />
        </linearGradient>
      </defs>
      {/* Full height, not down to the waterline: the sea rises over this, and
          a 560px sky would leave a hole underneath it on the way up. */}
      <rect x="0" y="0" width="1600" height="900" fill="url(#harbour-sky)" />

      <g style={{ opacity: 0, animation: 'stars-in 1.6s .3s ease forwards' }}>
        <circle cx="120" cy="80" r="1.6" fill="#FFFFFF" opacity=".4" />
        <circle cx="330" cy="52" r="1.4" fill="#FFFFFF" opacity=".3" />
        <circle cx="540" cy="110" r="1.7" fill="#FFFFFF" opacity=".35" />
        <circle cx="700" cy="60" r="1.3" fill="#FFFFFF" opacity=".3" />
        <circle cx="905" cy="120" r="1.6" fill="#FFFFFF" opacity=".35" />
        <circle cx="1060" cy="55" r="1.4" fill="#FFFFFF" opacity=".3" />
        <circle cx="1390" cy="90" r="1.7" fill="#FFFFFF" opacity=".4" />
        <circle cx="1520" cy="150" r="1.3" fill="#FFFFFF" opacity=".3" />
        <circle cx="820" cy="180" r="1.4" fill="#FFFFFF" opacity=".25" />
        <rect x="150" y="96" width="180" height="16" rx="8" fill="#FFFFFF" opacity=".07" />
        <rect x="240" y="122" width="110" height="13" rx="6.5" fill="#FFFFFF" opacity=".06" />
        <rect x="960" y="72" width="150" height="15" rx="7.5" fill="#FFFFFF" opacity=".07" />
        <rect x="1400" y="190" width="120" height="13" rx="6.5" fill="#FFFFFF" opacity=".06" />
      </g>

      {/* Sea, quay and road rise together — they are one ground, and the
          vessels that arrive next need something to arrive at. */}
      <g style={{ animation: `sea-rise 1.3s .25s ${EASE_RISE} both` }}>
        <rect x="0" y="560" width="1600" height="180" fill="#0E5E8A" />
        <line x1="0" y1="560" x2="1600" y2="560" stroke="#FFFFFF" opacity=".22" strokeWidth="2" />
        {/* Each wave runs a viewBox-width past both edges so a -140 drift
            loops without the ends walking into view. */}
        {WAVES.map((w) => (
          <g key={w.y} style={{ animation: `sea-drift ${w.dur} linear infinite ${w.dir}` }}>
            <path
              d={wavePath(w.y, w.dip)}
              fill="none"
              stroke="#FFFFFF"
              opacity={w.opacity}
              strokeWidth="2"
            />
          </g>
        ))}
        <g
          className="svg-anim"
          style={{
            animation: 'harbour-bob 3.2s ease-in-out infinite',
            transformOrigin: 'center',
          }}
        >
          <path d="M 806 700 l 11 -20 l 11 20 Z" fill="#FFC72C" />
          <line x1="817" y1="680" x2="817" y2="670" stroke="#FFC72C" strokeWidth="2.5" />
          <circle
            cx="817"
            cy="667"
            r="3"
            fill="#FFFFFF"
            className="svg-anim"
            style={{
              animation: 'harbour-flick 1.2s ease-in-out infinite',
              transformOrigin: 'center',
            }}
          />
        </g>
        <rect x="0" y="740" width="1600" height="160" fill="#E8F1F7" />
        <rect x="0" y="740" width="1600" height="12" fill="#CBD6E2" />
        <rect x="256" y="724" width="15" height="18" rx="4" fill="#FFC72C" />
        <rect x="516" y="724" width="15" height="18" rx="4" fill="#FFC72C" />
        <rect x="1036" y="724" width="15" height="18" rx="4" fill="#FFC72C" />
        <rect x="1466" y="724" width="15" height="18" rx="4" fill="#FFC72C" />
        {[200, 400, 600, 800, 1000, 1200, 1400].map((x) => (
          <line key={x} x1={x} y1="756" x2={x} y2="796" stroke="#D5DEE8" strokeWidth="2" />
        ))}
        <rect x="0" y="800" width="1600" height="84" fill="#16324F" />
        {[30, 150, 270, 390, 510, 630, 750, 870, 990, 1110, 1230, 1350, 1470].map((x) => (
          <rect key={x} x={x} y="838" width="42" height="5" rx="2.5" fill="#FFC72C" opacity=".85" />
        ))}
      </g>

      {/* The route draws itself out to the pin, which then drops onto it. */}
      <path
        d="M 580 590 Q 900 370 1285 465"
        stroke="#FFC72C"
        strokeWidth="2.5"
        strokeDasharray="900"
        fill="none"
        style={{ opacity: 0, animation: 'route-draw 1.6s 2.5s ease-out forwards' }}
      />
      <g style={{ animation: `pin-drop .7s 3.6s ${EASE_SETTLE} both` }}>
        <path
          d="M1285 432 c -11 0 -18 9 -18 18 c 0 13 18 27 18 27 c 0 0 18 -14 18 -27 c 0 -9 -7 -18 -18 -18 Z"
          fill="#FFC72C"
          stroke="#0A2540"
          strokeWidth="2.5"
        />
        <circle cx="1285" cy="451" r="5.5" fill="#0A2540" />
      </g>

      <g style={{ opacity: 0, animation: 'fade-in .6s 3.9s ease forwards' }}>
        <circle cx="1235" cy="128" r="5" fill="#FFC72C" />
        {SONAR.map((r) => (
          <circle
            key={r.r}
            cx="1235"
            cy="128"
            r={r.r}
            fill="none"
            stroke="#FFC72C"
            strokeWidth={r.w}
            strokeDasharray={r.dash}
            className="svg-anim"
            style={{
              animation: `ring-pulse 3s ${r.delay} ease-out infinite`,
              transformOrigin: 'center',
            }}
          />
        ))}
      </g>
    </svg>
  );
}

const WAVES = [
  { y: 612, dip: 8, opacity: '.13', dur: '14s', dir: 'normal' },
  { y: 658, dip: 7, opacity: '.09', dur: '20s', dir: 'reverse' },
  { y: 702, dip: 6, opacity: '.07', dur: '17s', dir: 'normal' },
] as const;

/** A run of smooth quadratics at one waterline, extended a wavelength past
 *  each edge so the drift has somewhere to come from and go to. */
function wavePath(y: number, dip: number): string {
  // The opening Q already lands on 0, so the reflections start a wavelength
  // after it and run to 1820 — one past the 1600 edge, plus the 140 of drift.
  const tail = Array.from({ length: 13 }, (_, i) => `T ${(i + 1) * 140} ${y}`).join(' ');
  return `M-140 ${y} Q -70 ${y - dip} 0 ${y} ${tail}`;
}

const SONAR = [
  { r: 30, w: '1.6', dash: '5 7', delay: '4s' },
  { r: 55, w: '1.4', dash: '5 9', delay: '4.6s' },
  { r: 80, w: '1.2', dash: '5 11', delay: '5.2s' },
] as const;

function CraneArt() {
  return (
    <>
      <rect x="58" y="386" width="120" height="18" rx="4" fill="#0A2540" />
      <rect x="94" y="60" width="16" height="330" fill="#FFC72C" />
      <rect x="126" y="60" width="16" height="330" fill="#FFC72C" />
      {[100, 170, 240, 310].map((y) => (
        <g key={y}>
          <line x1="96" y1={y} x2="140" y2={y + 30} stroke="#C9A227" strokeWidth="5" />
          <line x1="140" y1={y} x2="96" y2={y + 30} stroke="#C9A227" strokeWidth="5" />
        </g>
      ))}
      <rect x="80" y="40" width="230" height="18" fill="#FFC72C" />
      <rect x="20" y="40" width="60" height="18" fill="#C9A227" />
      <rect x="10" y="56" width="34" height="26" fill="#0A2540" />
      <path d="M118 8 L308 40 M118 8 L30 40 M118 8 L118 40" stroke="#0A2540" strokeWidth="4" />
      <circle cx="118" cy="8" r="5" fill="#FFC72C" />
      <rect x="102" y="66" width="46" height="34" fill="#FFFFFF" stroke="#0A2540" strokeWidth="3" />
      <rect x="108" y="73" width="20" height="12" fill="#0E5E8A" />
      <rect x="272" y="52" width="20" height="12" fill="#0A2540" />
      {/* The hook pays out after the jib is up, from the top of the rope. */}
      <g
        className="svg-anim"
        style={{
          animation: `rise-in 1.1s 2.3s ${EASE_RISE} both`,
          transformOrigin: 'top',
        }}
      >
        <line x1="282" y1="64" x2="282" y2="128" stroke="#0A2540" strokeWidth="3.5" />
        <rect x="252" y="128" width="60" height="9" fill="#0A2540" />
        <rect x="252" y="137" width="60" height="34" fill="#0E5E8A" />
        <rect x="252" y="137" width="60" height="9" fill="#FFC72C" />
        <line x1="282" y1="146" x2="282" y2="171" stroke="#FFFFFF" strokeWidth="3" opacity=".4" />
      </g>
    </>
  );
}

function ShipArt() {
  return (
    <>
      <g className="harbour-bob">
        <path
          d="M12 118 L38 160 L332 160 L382 118 L382 100 L12 100 Z"
          fill="#FFFFFF"
          stroke="#0A2540"
          strokeWidth="3"
        />
        <rect x="12" y="108" width="370" height="10" fill="#FFC72C" />
        {[58, 94, 130, 166].map((cx) => (
          <circle key={cx} cx={cx} cy="132" r="3.5" fill="#0A2540" />
        ))}
        <rect x="56" y="66" width="52" height="34" fill="#0E5E8A" />
        <rect x="112" y="66" width="52" height="34" fill="#FFC72C" />
        <rect
          x="168"
          y="66"
          width="52"
          height="34"
          fill="#FFFFFF"
          stroke="#0A2540"
          strokeWidth="2.5"
        />
        <line x1="112" y1="66" x2="112" y2="100" stroke="#0A2540" strokeWidth="2" />
        <path
          d="M248 100 L248 34 L322 34 L346 56 L346 100 Z"
          fill="#FFFFFF"
          stroke="#0A2540"
          strokeWidth="3"
        />
        <rect x="256" y="44" width="74" height="11" fill="#0A2540" />
        {[259, 275, 291, 307].map((x) => (
          <rect key={x} x={x} y="46" width="10" height="7" fill="#FFC72C" />
        ))}
        <rect x="256" y="66" width="58" height="9" fill="#CBD6E2" />
        <line x1="298" y1="34" x2="298" y2="8" stroke="#FFFFFF" strokeWidth="3" />
        <line x1="298" y1="14" x2="318" y2="14" stroke="#FFFFFF" strokeWidth="2.5" />
        <circle cx="298" cy="6" r="3.5" fill="#FFC72C" className="harbour-flick" />
        <rect x="228" y="52" width="8" height="48" fill="#FFC72C" />
        <line x1="232" y1="52" x2="186" y2="20" stroke="#FFC72C" strokeWidth="5" />
        <line x1="186" y1="20" x2="186" y2="42" stroke="#0A2540" strokeWidth="3" />
      </g>
      {/* Wake either side of the hull, the second half a cycle behind. */}
      <path
        d="M376 162 Q 390 158 398 164 Q 388 172 372 170 Z"
        fill="#FFFFFF"
        style={{ animation: 'wake 2.2s ease-in-out infinite' }}
      />
      <path
        d="M6 164 Q 18 158 30 164 Q 18 170 6 164 Z"
        fill="#FFFFFF"
        style={{ animation: 'wake 2.2s 1.1s ease-in-out infinite' }}
      />
    </>
  );
}

function RigArt() {
  return (
    <>
      <line x1="96" y1="180" x2="86" y2="308" stroke="#E8F1F7" strokeWidth="12" />
      <line x1="196" y1="180" x2="202" y2="308" stroke="#E8F1F7" strokeWidth="12" />
      <line x1="272" y1="180" x2="280" y2="308" stroke="#E8F1F7" strokeWidth="10" />
      <line x1="92" y1="236" x2="200" y2="212" stroke="#CBD6E2" strokeWidth="5" />
      <line x1="92" y1="212" x2="200" y2="240" stroke="#CBD6E2" strokeWidth="5" />
      <line x1="200" y1="236" x2="276" y2="216" stroke="#CBD6E2" strokeWidth="4.5" />
      <line x1="200" y1="214" x2="276" y2="240" stroke="#CBD6E2" strokeWidth="4.5" />
      <rect
        x="52"
        y="150"
        width="256"
        height="24"
        fill="#FFFFFF"
        stroke="#0A2540"
        strokeWidth="2.5"
      />
      <rect x="52" y="168" width="256" height="8" fill="#FFC72C" />
      <rect x="74" y="118" width="58" height="32" fill="#FFFFFF" stroke="#0A2540" strokeWidth="3" />
      <rect x="82" y="126" width="14" height="9" fill="#0E5E8A" />
      <rect x="104" y="126" width="14" height="9" fill="#0E5E8A" />
      <rect
        x="140"
        y="106"
        width="44"
        height="44"
        fill="#3B82F6"
        stroke="#0A2540"
        strokeWidth="2.5"
      />
      <path d="M206 150 L228 58 L250 150 Z" fill="none" stroke="#FFC72C" strokeWidth="5" />
      <line x1="214" y1="118" x2="242" y2="118" stroke="#FFC72C" strokeWidth="4" />
      <line x1="219" y1="92" x2="237" y2="92" stroke="#FFC72C" strokeWidth="4" />
      <circle cx="228" cy="54" r="5" fill="#FFC72C" />
      <line x1="258" y1="150" x2="322" y2="86" stroke="#CBD6E2" strokeWidth="6" />
      {/* The flare lights only once the rig is standing. */}
      <g style={{ opacity: 0, animation: 'fade-in .5s 2.9s ease forwards' }}>
        <circle cx="330" cy="74" r="9" fill="#FFC72C" className="harbour-flick" />
        <circle cx="338" cy="60" r="5" fill="#FFC72C" opacity=".7" className="harbour-flick-late" />
      </g>
      <circle cx="40" cy="134" r="26" fill="#FFFFFF" stroke="#0A2540" strokeWidth="3" />
      <line x1="30" y1="122" x2="30" y2="146" stroke="#0A2540" strokeWidth="4.5" />
      <line x1="50" y1="122" x2="50" y2="146" stroke="#0A2540" strokeWidth="4.5" />
      <line x1="30" y1="134" x2="50" y2="134" stroke="#0A2540" strokeWidth="4.5" />
      <line x1="40" y1="160" x2="40" y2="150" stroke="#CBD6E2" strokeWidth="4" />
      <path d="M70 306 Q 86 298 102 306 Q 86 314 70 306 Z" fill="#FFFFFF" opacity=".5" />
      <path d="M186 306 Q 202 298 218 306 Q 202 314 186 306 Z" fill="#FFFFFF" opacity=".45" />
      <path d="M264 306 Q 280 298 296 306 Q 280 314 264 306 Z" fill="#FFFFFF" opacity=".4" />
    </>
  );
}

function WarehouseArt() {
  return (
    <>
      <path d="M20 80 L150 28 L280 80 Z" fill="#0E5E8A" stroke="#0A2540" strokeWidth="3" />
      <rect
        x="20"
        y="80"
        width="260"
        height="130"
        fill="#FFFFFF"
        stroke="#0A2540"
        strokeWidth="3"
      />
      <rect x="20" y="80" width="260" height="12" fill="#FFC72C" />
      <rect
        x="60"
        y="112"
        width="120"
        height="98"
        fill="#FFC72C"
        stroke="#0A2540"
        strokeWidth="3"
      />
      {[130, 148, 166, 184].map((y) => (
        <line key={y} x1="60" y1={y} x2="180" y2={y} stroke="#C9A227" strokeWidth="3" />
      ))}
      <rect
        x="206"
        y="130"
        width="48"
        height="80"
        fill="#0E5E8A"
        stroke="#0A2540"
        strokeWidth="3"
      />
      <circle cx="246" cy="172" r="3" fill="#FFFFFF" />
      <rect
        x="130"
        y="46"
        width="40"
        height="26"
        fill="#FFFFFF"
        stroke="#0A2540"
        strokeWidth="2.5"
      />
      {/* The stack is loaded after the shed: bottom row, then the box on top. */}
      <g
        className="svg-anim"
        style={{
          animation: `rise-in .7s 2.6s ${EASE_SETTLE} both`,
          transformOrigin: 'bottom',
        }}
      >
        <rect
          x="296"
          y="150"
          width="36"
          height="30"
          fill="#0E5E8A"
          stroke="#0A2540"
          strokeWidth="3"
        />
        <rect
          x="334"
          y="150"
          width="36"
          height="30"
          fill="#FFFFFF"
          stroke="#0A2540"
          strokeWidth="3"
        />
        <rect
          x="316"
          y="180"
          width="36"
          height="30"
          fill="#FFC72C"
          stroke="#0A2540"
          strokeWidth="3"
        />
        <rect
          x="280"
          y="180"
          width="34"
          height="30"
          fill="#FFFFFF"
          stroke="#0A2540"
          strokeWidth="3"
        />
        <line x1="316" y1="195" x2="352" y2="195" stroke="#0A2540" strokeWidth="2" />
      </g>
      <g
        className="svg-anim"
        style={{
          animation: `rise-in .7s 3s ${EASE_SETTLE} both`,
          transformOrigin: 'bottom',
        }}
      >
        <rect
          x="296"
          y="118"
          width="36"
          height="30"
          fill="#FFC72C"
          stroke="#0A2540"
          strokeWidth="3"
        />
        <line x1="296" y1="133" x2="332" y2="133" stroke="#0A2540" strokeWidth="2" />
      </g>
    </>
  );
}

function CustomsArt() {
  return (
    <>
      <line x1="36" y1="190" x2="36" y2="60" stroke="#0A2540" strokeWidth="5" />
      <path d="M36 60 L36 32 L82 46 L36 60 Z" fill="#0E5E8A" stroke="#0A2540" strokeWidth="2.5" />
      <rect x="96" y="96" width="104" height="94" fill="#FFFFFF" stroke="#0A2540" strokeWidth="3" />
      <rect
        x="88"
        y="82"
        width="120"
        height="16"
        rx="4"
        fill="#0E5E8A"
        stroke="#0A2540"
        strokeWidth="2.5"
      />
      <rect x="110" y="112" width="42" height="30" fill="#0E5E8A" />
      <line x1="110" y1="127" x2="152" y2="127" stroke="#FFFFFF" strokeWidth="2" opacity=".5" />
      <circle cx="176" cy="127" r="14" fill="#FFC72C" stroke="#0A2540" strokeWidth="2.5" />
      <path
        d="M176 119 l 3.2 6 l 6.8 .8 l -5 4.6 l 1.4 6.6 l -6.4 -3.4 l -6.4 3.4 l 1.4 -6.6 l -5 -4.6 l 6.8 -.8 Z"
        fill="#0A2540"
      />
      <rect x="110" y="156" width="30" height="34" fill="#0A2540" />
      <rect x="216" y="150" width="14" height="40" fill="#0A2540" />
      <g
        style={{
          transform: 'rotate(-24deg)',
          transformOrigin: '223px 154px',
          transformBox: 'view-box',
        }}
      >
        <rect
          x="223"
          y="148"
          width="130"
          height="11"
          rx="5.5"
          fill="#FFC72C"
          stroke="#0A2540"
          strokeWidth="2.5"
        />
        <rect x="248" y="148" width="22" height="11" fill="#0A2540" />
        <rect x="292" y="148" width="22" height="11" fill="#0A2540" />
      </g>
      <circle cx="223" cy="154" r="7" fill="#0A2540" />
    </>
  );
}

function LorryArt() {
  return (
    <>
      <ellipse cx="180" cy="118" rx="160" ry="7" fill="#04101F" opacity=".35" />
      <rect
        x="16"
        y="18"
        width="212"
        height="76"
        rx="4"
        fill="#FFC72C"
        stroke="#0A2540"
        strokeWidth="3"
      />
      {[52, 88, 124, 160, 196].map((x) => (
        <line key={x} x1={x} y1="18" x2={x} y2="94" stroke="#C9A227" strokeWidth="3" />
      ))}
      <rect x="16" y="76" width="212" height="18" fill="#FFFFFF" opacity=".35" />
      <rect x="228" y="94" width="106" height="10" fill="#0A2540" />
      <rect x="16" y="94" width="212" height="10" fill="#0A2540" />
      <path
        d="M238 94 L238 38 L292 38 L318 62 L318 94 Z"
        fill="#0E5E8A"
        stroke="#0A2540"
        strokeWidth="3"
      />
      <path d="M248 48 L286 48 L302 64 L248 64 Z" fill="#FFFFFF" />
      <rect x="238" y="76" width="80" height="8" fill="#FFC72C" />
      {[62, 108, 196, 288].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="106" r="14" fill="#0A2540" />
          <circle cx={cx} cy="106" r="5.5" fill="#FFFFFF" />
        </g>
      ))}
      <rect
        x="318"
        y="70"
        width="8"
        height="14"
        fill="#FFC72C"
        className="svg-anim"
        style={{
          animation: 'harbour-flick 1s ease-in-out infinite',
          transformOrigin: 'center',
        }}
      />
    </>
  );
}

export const HOTSPOT_ART: Record<ServiceId, { viewBox: string; art: () => React.ReactNode }> = {
  assets: { viewBox: '0 0 320 420', art: CraneArt },
  agency: { viewBox: '0 0 400 190', art: ShipArt },
  marketplace: { viewBox: '0 0 360 320', art: RigArt },
  procurement: { viewBox: '0 0 380 220', art: WarehouseArt },
  customs: { viewBox: '0 0 300 200', art: CustomsArt },
  logistics: { viewBox: '0 0 360 130', art: LorryArt },
};
