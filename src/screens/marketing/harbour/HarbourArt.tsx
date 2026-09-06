import type { ServiceId } from './services';

/**
 * Original flat illustration in GAC colours. Redrawn to the 5 Sep design
 * handoff ("GAC Connect presenter v2"): the night harbour is now the same
 * picture the deck follows — a lit platform supply vessel alongside the far
 * quay, the crane beside her, the rig off to the left — so the presenter's
 * dissolve lands on the landing page's own hero. Transcribed from the
 * handoff's HTML fragment; all artwork is original to this project
 * (07_GUARDRAILS: no third-party art).
 *
 * The scene assembles itself once on mount: stars, then the sea rises, then
 * the vessels and plant that work the quay, then the lorry. It is a sequence
 * of CSS animations with delays rather than a script, so the
 * `prefers-reduced-motion` rule in `tokens.css` — which zeroes durations
 * *and* delays — collapses the whole thing to a finished scene without a
 * second code path here.
 *
 * Everything transformed inside the SVG carries `transform-box: fill-box` and
 * an explicit origin (the `.svg-anim*` classes), or the transform resolves
 * against the viewBox and the part leaves the picture.
 */

/** One easing per kind of movement, named so the timings below stay readable. */
const EASE_RISE = 'cubic-bezier(.2,.8,.2,1)';
const EASE_SAIL = 'cubic-bezier(.25,.6,.2,1)';
const EASE_DRIVE = 'cubic-bezier(.2,.7,.2,1)';

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

/** The label chips land once the thing they name has arrived — no later.
 *  (v2: 2.2–3.3s, not the 4.1–4.6s they used to wait.) */
export const HOTSPOT_CHIP_DELAY: Record<ServiceId, string> = {
  assets: '2.2s',
  agency: '2.6s',
  marketplace: '2.4s',
  procurement: '2.5s',
  customs: '2.7s',
  logistics: '3.3s',
};

/** The booth and the warehouse stand just under the vessel's berth, so their
 *  labels sit below them, on the road, rather than over her hull. */
export const HOTSPOT_CHIP_BELOW: ReadonlySet<ServiceId> = new Set<ServiceId>([
  'customs',
  'procurement',
]);

/** Night-harbour backdrop: sky, dawn wash, sea, the far quay with its lamps
 *  and mooring lines, the near quay and the road. Stretches with container. */
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
        <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#040C1D"></stop>
          <stop offset=".7" stopColor="#071A35"></stop>
          <stop offset="1" stopColor="#0D2C50"></stop>
        </linearGradient>
        <linearGradient id="hero-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0A2444"></stop>
          <stop offset="1" stopColor="#051226"></stop>
        </linearGradient>
        <linearGradient id="hero-refl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFC72C" stopOpacity=".42"></stop>
          <stop offset="1" stopColor="#FFC72C" stopOpacity="0"></stop>
        </linearGradient>
        <radialGradient id="hero-halo">
          <stop offset="0" stopColor="#FFC72C" stopOpacity=".32"></stop>
          <stop offset="1" stopColor="#FFC72C" stopOpacity="0"></stop>
        </radialGradient>
        <linearGradient id="hero-dawn" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFC72C" stopOpacity="0"></stop>
          <stop offset=".55" stopColor="#FFC72C" stopOpacity=".07"></stop>
          <stop offset="1" stopColor="#FFC72C" stopOpacity="0"></stop>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="1600" height="900" fill="url(#hero-sky)"></rect>
      <rect x="0" y="470" width="1600" height="130" fill="url(#hero-dawn)"></rect>
      <g style={{ opacity: 0, animation: 'stars-in 1.6s .3s ease forwards' }}>
        <circle cx="120" cy="80" r="1.6" fill="#FFFFFF" opacity=".38"></circle>
        <circle cx="330" cy="52" r="1.3" fill="#FFFFFF" opacity=".3"></circle>
        <circle cx="540" cy="110" r="1.6" fill="#FFFFFF" opacity=".32"></circle>
        <circle cx="700" cy="60" r="1.2" fill="#FFFFFF" opacity=".3"></circle>
        <circle cx="905" cy="120" r="1.5" fill="#FFFFFF" opacity=".32"></circle>
        <circle cx="1060" cy="55" r="1.3" fill="#FFFFFF" opacity=".3"></circle>
        <circle cx="1390" cy="90" r="1.6" fill="#FFFFFF" opacity=".38"></circle>
        <circle cx="1520" cy="150" r="1.2" fill="#FFFFFF" opacity=".3"></circle>
        <circle cx="820" cy="180" r="1.3" fill="#FFFFFF" opacity=".25"></circle>
        <circle cx="240" cy="210" r="1.2" fill="#FFFFFF" opacity=".22"></circle>
      </g>
      <g style={{ animation: 'sea-rise 1.3s .25s cubic-bezier(.2,.8,.2,1) both' }}>
        <rect x="0" y="600" width="1600" height="140" fill="url(#hero-sea)"></rect>
        <line
          x1="0"
          y1="600"
          x2="1600"
          y2="600"
          stroke="rgba(143,166,188,.3)"
          strokeWidth="1"
        ></line>
        <g style={{ animation: 'sea-drift 14s linear infinite' }}>
          <path
            d="M-140 640 Q -70 634 0 640 T 140 640 T 280 640 T 420 640 T 560 640 T 700 640 T 840 640 T 980 640 T 1120 640 T 1260 640 T 1400 640 T 1540 640 T 1680 640 T 1820 640"
            fill="none"
            stroke="#FFFFFF"
            opacity=".08"
            strokeWidth="1.5"
          ></path>
        </g>
        <g style={{ animation: 'sea-drift 20s linear infinite reverse' }}>
          <path
            d="M-140 690 Q -70 684 0 690 T 140 690 T 280 690 T 420 690 T 560 690 T 700 690 T 840 690 T 980 690 T 1120 690 T 1260 690 T 1400 690 T 1540 690 T 1680 690 T 1820 690"
            fill="none"
            stroke="#FFFFFF"
            opacity=".055"
            strokeWidth="1.5"
          ></path>
        </g>
        {/* the pier, the shed and the lamps: the same quay the deck arrives at */}
        <rect
          x="1470"
          y="536"
          width="110"
          height="50"
          fill="#0C2246"
          stroke="rgba(234,242,248,.22)"
          strokeWidth="1.2"
        ></rect>
        <path
          d="M 1470 536 L 1525 518 L 1580 536"
          fill="#10305A"
          stroke="rgba(234,242,248,.22)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        ></path>
        <rect x="1490" y="552" width="14" height="10" fill="#FFC72C" opacity=".85"></rect>
        <rect x="1540" y="552" width="14" height="10" fill="#FFC72C" opacity=".55"></rect>
        <rect x="760" y="586" width="840" height="16" fill="#0B1D36"></rect>
        <line
          x1="760"
          y1="586"
          x2="1600"
          y2="586"
          stroke="rgba(234,242,248,.28)"
          strokeWidth="1.2"
        ></line>
        <rect x="760" y="602" width="840" height="12" fill="#07142A"></rect>
        <g fill="#0B1D36">
          <rect x="790" y="614" width="4" height="26"></rect>
          <rect x="900" y="614" width="4" height="26"></rect>
          <rect x="1010" y="614" width="4" height="26"></rect>
          <rect x="1120" y="614" width="4" height="26"></rect>
          <rect x="1340" y="614" width="4" height="26"></rect>
          <rect x="1450" y="614" width="4" height="26"></rect>
          <rect x="1560" y="614" width="4" height="26"></rect>
        </g>
        <g fill="#152F55">
          <rect x="926" y="578" width="12" height="8" rx="3"></rect>
          <rect x="1232" y="578" width="12" height="8" rx="3"></rect>
          <rect x="1456" y="578" width="12" height="8" rx="3"></rect>
        </g>
        <rect x="898" y="546" width="4" height="40" fill="#152F55"></rect>
        <rect x="898" y="543" width="26" height="4" fill="#152F55"></rect>
        <circle cx="924" cy="546" r="22" fill="url(#hero-halo)"></circle>
        <circle cx="924" cy="546" r="3" fill="#FFC72C" className="hb-lamp"></circle>
        <rect x="922.5" y="602" width="3" height="42" fill="url(#hero-refl)"></rect>
        <rect x="1236" y="546" width="4" height="40" fill="#152F55"></rect>
        <rect x="1236" y="543" width="26" height="4" fill="#152F55"></rect>
        <circle cx="1262" cy="546" r="22" fill="url(#hero-halo)"></circle>
        <circle cx="1262" cy="546" r="3" fill="#FFC72C" className="hb-lamp"></circle>
        <rect x="1260.5" y="602" width="3" height="42" fill="url(#hero-refl)"></rect>
        <rect x="1440" y="546" width="4" height="40" fill="#152F55"></rect>
        <rect x="1440" y="543" width="26" height="4" fill="#152F55"></rect>
        <circle cx="1466" cy="546" r="22" fill="url(#hero-halo)"></circle>
        <circle cx="1466" cy="546" r="3" fill="#FFC72C" className="hb-lamp"></circle>
        <rect x="1464.5" y="602" width="3" height="42" fill="url(#hero-refl)"></rect>
        {/* mooring lines: she is alongside here */}
        <g
          fill="none"
          stroke="rgba(234,242,248,.45)"
          strokeWidth="1.2"
          strokeLinecap="round"
          style={{ opacity: 0, animation: 'fade-in .8s 3.9s ease forwards' }}
        >
          <path d="M 1338 566 Q 1390 576 1458 582"></path>
          <path d="M 988 566 Q 960 576 934 582"></path>
        </g>
        {/* the near quay and the road */}
        <rect x="0" y="740" width="1600" height="160" fill="#0B1D36"></rect>
        <line
          x1="0"
          y1="740"
          x2="1600"
          y2="740"
          stroke="rgba(234,242,248,.3)"
          strokeWidth="1.4"
        ></line>
        <rect x="0" y="752" width="1600" height="6" fill="#07142A"></rect>
        <g fill="#FFC72C" opacity=".7">
          <rect x="256" y="726" width="14" height="16" rx="4"></rect>
          <rect x="516" y="726" width="14" height="16" rx="4"></rect>
          <rect x="1036" y="726" width="14" height="16" rx="4"></rect>
          <rect x="1466" y="726" width="14" height="16" rx="4"></rect>
        </g>
        <rect x="0" y="800" width="1600" height="84" fill="#07142A"></rect>
        <line
          x1="0"
          y1="800"
          x2="1600"
          y2="800"
          stroke="rgba(234,242,248,.12)"
          strokeWidth="1"
        ></line>
        <g fill="#FFC72C" opacity=".75">
          <rect x="30" y="838" width="42" height="5" rx="2.5"></rect>
          <rect x="150" y="838" width="42" height="5" rx="2.5"></rect>
          <rect x="270" y="838" width="42" height="5" rx="2.5"></rect>
          <rect x="390" y="838" width="42" height="5" rx="2.5"></rect>
          <rect x="510" y="838" width="42" height="5" rx="2.5"></rect>
          <rect x="630" y="838" width="42" height="5" rx="2.5"></rect>
          <rect x="750" y="838" width="42" height="5" rx="2.5"></rect>
          <rect x="870" y="838" width="42" height="5" rx="2.5"></rect>
          <rect x="990" y="838" width="42" height="5" rx="2.5"></rect>
          <rect x="1110" y="838" width="42" height="5" rx="2.5"></rect>
          <rect x="1230" y="838" width="42" height="5" rx="2.5"></rect>
          <rect x="1350" y="838" width="42" height="5" rx="2.5"></rect>
          <rect x="1470" y="838" width="42" height="5" rx="2.5"></rect>
        </g>
        <rect x="0" y="884" width="1600" height="16" fill="#0B1D36"></rect>
      </g>
    </svg>
  );
}

/** Quay crane — GAC Assets. */
function CraneArt() {
  return (
    <>
      <rect
        x="58"
        y="386"
        width="120"
        height="18"
        rx="3"
        fill="#0C2446"
        stroke="rgba(234,242,248,.3)"
        strokeWidth="1.5"
      ></rect>
      <rect
        x="94"
        y="60"
        width="16"
        height="330"
        fill="#10305A"
        stroke="rgba(234,242,248,.3)"
        strokeWidth="1.5"
      ></rect>
      <rect
        x="126"
        y="60"
        width="16"
        height="330"
        fill="#10305A"
        stroke="rgba(234,242,248,.3)"
        strokeWidth="1.5"
      ></rect>
      <g stroke="rgba(234,242,248,.28)" strokeWidth="3">
        <line x1="96" y1="100" x2="140" y2="130"></line>
        <line x1="140" y1="100" x2="96" y2="130"></line>
        <line x1="96" y1="170" x2="140" y2="200"></line>
        <line x1="140" y1="170" x2="96" y2="200"></line>
        <line x1="96" y1="240" x2="140" y2="270"></line>
        <line x1="140" y1="240" x2="96" y2="270"></line>
        <line x1="96" y1="310" x2="140" y2="340"></line>
        <line x1="140" y1="310" x2="96" y2="340"></line>
      </g>
      <rect
        x="80"
        y="40"
        width="230"
        height="18"
        fill="#10305A"
        stroke="rgba(234,242,248,.32)"
        strokeWidth="1.5"
      ></rect>
      <rect
        x="20"
        y="40"
        width="60"
        height="18"
        fill="#0C2446"
        stroke="rgba(234,242,248,.32)"
        strokeWidth="1.5"
      ></rect>
      <rect
        x="10"
        y="56"
        width="34"
        height="26"
        fill="#0C2446"
        stroke="rgba(234,242,248,.3)"
        strokeWidth="1.5"
      ></rect>
      <path
        d="M118 8 L308 40 M118 8 L30 40 M118 8 L118 40"
        stroke="rgba(234,242,248,.4)"
        strokeWidth="2.5"
        fill="none"
      ></path>
      <circle cx="118" cy="8" r="4" fill="#FF453A"></circle>
      <circle cx="118" cy="8" r="10" fill="rgba(255,69,58,.18)"></circle>
      <rect
        x="102"
        y="66"
        width="46"
        height="34"
        fill="#0C2446"
        stroke="rgba(234,242,248,.35)"
        strokeWidth="2"
      ></rect>
      <rect x="108" y="73" width="22" height="13" fill="#FFC72C" opacity=".9"></rect>
      <rect
        x="272"
        y="52"
        width="20"
        height="12"
        fill="#0C2446"
        stroke="rgba(234,242,248,.3)"
        strokeWidth="1.5"
      ></rect>
      <circle cx="304" cy="49" r="3" fill="#FFC72C" className="hb-lamp"></circle>
      <circle cx="304" cy="49" r="12" fill="rgba(255,199,44,.16)"></circle>
      <g className="svg-anim-top">
        <line
          x1="282"
          y1="64"
          x2="282"
          y2="128"
          stroke="rgba(234,242,248,.5)"
          strokeWidth="2.5"
        ></line>
        <rect
          x="252"
          y="128"
          width="60"
          height="9"
          fill="#0C2446"
          stroke="rgba(234,242,248,.3)"
          strokeWidth="1.5"
        ></rect>
        <rect
          x="252"
          y="137"
          width="60"
          height="34"
          fill="#10305A"
          stroke="rgba(234,242,248,.3)"
          strokeWidth="1.5"
        ></rect>
        <rect x="252" y="137" width="60" height="8" fill="#FFC72C" opacity=".85"></rect>
      </g>
    </>
  );
}

/** The lit platform supply vessel, alongside — the same drawing the deck follows in. */
function ShipArt() {
  return (
    <>
      <defs>
        <linearGradient id="hero-ship-refl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFC72C" stopOpacity=".42"></stop>
          <stop offset="1" stopColor="#FFC72C" stopOpacity="0"></stop>
        </linearGradient>
      </defs>
      <g className="hb-ship">
        <g className="hb-refl">
          <rect x="262" y="153" width="2.5" height="26" fill="url(#hero-ship-refl)"></rect>
          <rect x="276" y="153" width="2.5" height="20" fill="url(#hero-ship-refl)"></rect>
          <rect x="290" y="153" width="2.5" height="30" fill="url(#hero-ship-refl)"></rect>
          <rect x="304" y="153" width="2.5" height="22" fill="url(#hero-ship-refl)"></rect>
          <rect x="318" y="153" width="2.5" height="28" fill="url(#hero-ship-refl)"></rect>
          <rect x="332" y="153" width="2.5" height="20" fill="url(#hero-ship-refl)"></rect>
          <rect x="118" y="153" width="2.5" height="16" fill="url(#hero-ship-refl)"></rect>
          <rect x="186" y="153" width="2.5" height="16" fill="url(#hero-ship-refl)"></rect>
        </g>
        <g className="hb-wake">
          <path
            d="M 22 151 L -46 153 M 26 155 L -84 158"
            fill="none"
            stroke="rgba(234,242,248,.22)"
            strokeWidth="1.4"
            strokeLinecap="round"
          ></path>
          <path
            d="M 384 150 q 12 -3 22 3"
            fill="none"
            stroke="rgba(234,242,248,.4)"
            strokeWidth="1.4"
            strokeLinecap="round"
          ></path>
        </g>
        <path d="M 22 150 L 30 112 L 340 112 L 372 100 L 384 150 Z" fill="#12315B"></path>
        <path d="M 28 122 L 30 112 L 340 112 L 372 100 L 376 118 Z" fill="#1A3C68"></path>
        <path
          d="M 30 112 L 340 112 L 372 100"
          fill="none"
          stroke="rgba(234,242,248,.5)"
          strokeWidth="1.4"
          strokeLinejoin="round"
        ></path>
        <path
          d="M 24 142 L 382 142"
          fill="none"
          stroke="rgba(234,242,248,.16)"
          strokeWidth="1"
        ></path>
        <line
          x1="34"
          y1="103"
          x2="246"
          y2="103"
          stroke="rgba(234,242,248,.3)"
          strokeWidth="1.2"
        ></line>
        <g stroke="rgba(234,242,248,.3)" strokeWidth="1.2">
          <line x1="42" y1="103" x2="42" y2="112"></line>
          <line x1="72" y1="103" x2="72" y2="112"></line>
          <line x1="102" y1="103" x2="102" y2="112"></line>
          <line x1="132" y1="103" x2="132" y2="112"></line>
          <line x1="162" y1="103" x2="162" y2="112"></line>
          <line x1="192" y1="103" x2="192" y2="112"></line>
          <line x1="222" y1="103" x2="222" y2="112"></line>
        </g>
        <rect
          x="66"
          y="96"
          width="44"
          height="16"
          fill="#0C2246"
          stroke="rgba(234,242,248,.2)"
          strokeWidth="1"
        ></rect>
        <rect
          x="124"
          y="92"
          width="58"
          height="20"
          fill="#0C2246"
          stroke="rgba(234,242,248,.2)"
          strokeWidth="1"
        ></rect>
        <rect
          x="196"
          y="98"
          width="32"
          height="14"
          fill="#0C2246"
          stroke="rgba(234,242,248,.2)"
          strokeWidth="1"
        ></rect>
        <path d="M 252 74 L 176 112 L 252 112 Z" fill="rgba(255,199,44,.1)"></path>
        <rect
          x="240"
          y="80"
          width="10"
          height="32"
          fill="#163560"
          stroke="rgba(234,242,248,.25)"
          strokeWidth="1"
        ></rect>
        <rect
          x="250"
          y="64"
          width="92"
          height="48"
          fill="#1B3D6B"
          stroke="rgba(234,242,248,.4)"
          strokeWidth="1.2"
        ></rect>
        <rect
          x="256"
          y="44"
          width="84"
          height="20"
          rx="2"
          fill="#22497C"
          stroke="rgba(234,242,248,.45)"
          strokeWidth="1.2"
        ></rect>
        <g fill="#FFC72C" opacity=".95" className="hb-glow">
          <rect x="262" y="49" width="9" height="6"></rect>
          <rect x="275" y="49" width="9" height="6"></rect>
          <rect x="288" y="49" width="9" height="6"></rect>
          <rect x="301" y="49" width="9" height="6"></rect>
          <rect x="314" y="49" width="9" height="6"></rect>
          <rect x="327" y="49" width="9" height="6"></rect>
        </g>
        <g fill="#FFC72C" opacity=".72">
          <rect x="260" y="72" width="6" height="5"></rect>
          <rect x="272" y="72" width="6" height="5"></rect>
          <rect x="284" y="72" width="6" height="5"></rect>
          <rect x="296" y="72" width="6" height="5"></rect>
          <rect x="308" y="72" width="6" height="5"></rect>
          <rect x="320" y="72" width="6" height="5"></rect>
          <rect x="332" y="72" width="6" height="5"></rect>
          <rect x="260" y="90" width="6" height="5"></rect>
          <rect x="284" y="90" width="6" height="5"></rect>
          <rect x="296" y="90" width="6" height="5"></rect>
          <rect x="320" y="90" width="6" height="5"></rect>
          <rect x="332" y="90" width="6" height="5"></rect>
        </g>
        <circle cx="252" cy="70" r="2.4" fill="#FFC72C"></circle>
        <circle cx="252" cy="70" r="7" fill="rgba(255,199,44,.18)"></circle>
        <line
          x1="300"
          y1="44"
          x2="300"
          y2="12"
          stroke="#CBD6E2"
          strokeWidth="2"
          opacity=".75"
        ></line>
        <line
          x1="286"
          y1="24"
          x2="314"
          y2="24"
          stroke="#CBD6E2"
          strokeWidth="1.6"
          opacity=".75"
        ></line>
        <rect x="292" y="30" width="16" height="3" rx="1.5" fill="#CBD6E2" opacity=".6"></rect>
        <circle cx="300" cy="10" r="2.6" fill="#FFFFFF" className="hb-lamp"></circle>
        <circle cx="300" cy="10" r="7" fill="rgba(255,255,255,.14)"></circle>
        <circle cx="255" cy="47" r="2.2" fill="#FF453A"></circle>
        <circle cx="255" cy="47" r="6" fill="rgba(255,69,58,.2)"></circle>
        <circle cx="28" cy="107" r="1.8" fill="#FFFFFF" opacity=".85"></circle>
        <text
          x="354"
          y="123"
          textAnchor="middle"
          fontFamily="Inter, ui-sans-serif, sans-serif"
          fontSize="7.5"
          fontWeight="600"
          letterSpacing="2"
          fill="rgba(234,242,248,.6)"
        >
          ELAN
        </text>
      </g>
    </>
  );
}

/** Offshore platform — the Marketplace. */
function RigArt() {
  return (
    <>
      <defs>
        <radialGradient id="hero-flare">
          <stop offset="0" stopColor="#FFC72C" stopOpacity=".5"></stop>
          <stop offset="1" stopColor="#FFC72C" stopOpacity="0"></stop>
        </radialGradient>
      </defs>
      <line x1="96" y1="180" x2="86" y2="308" stroke="#10305A" strokeWidth="12"></line>
      <line
        x1="96"
        y1="180"
        x2="86"
        y2="308"
        stroke="rgba(234,242,248,.3)"
        strokeWidth="1.5"
      ></line>
      <line x1="196" y1="180" x2="202" y2="308" stroke="#10305A" strokeWidth="12"></line>
      <line x1="272" y1="180" x2="280" y2="308" stroke="#10305A" strokeWidth="10"></line>
      <line x1="92" y1="236" x2="200" y2="212" stroke="rgba(234,242,248,.3)" strokeWidth="3"></line>
      <line x1="92" y1="212" x2="200" y2="240" stroke="rgba(234,242,248,.3)" strokeWidth="3"></line>
      <line
        x1="200"
        y1="236"
        x2="276"
        y2="216"
        stroke="rgba(234,242,248,.3)"
        strokeWidth="3"
      ></line>
      <line
        x1="200"
        y1="214"
        x2="276"
        y2="240"
        stroke="rgba(234,242,248,.3)"
        strokeWidth="3"
      ></line>
      <rect
        x="52"
        y="150"
        width="256"
        height="24"
        fill="#10305A"
        stroke="rgba(234,242,248,.35)"
        strokeWidth="1.5"
      ></rect>
      <rect x="52" y="168" width="256" height="7" fill="#FFC72C" opacity=".75"></rect>
      <rect
        x="74"
        y="118"
        width="58"
        height="32"
        fill="#0C2446"
        stroke="rgba(234,242,248,.35)"
        strokeWidth="1.5"
      ></rect>
      <rect x="82" y="126" width="14" height="9" fill="#FFC72C" opacity=".9"></rect>
      <rect x="104" y="126" width="14" height="9" fill="#FFC72C" opacity=".9"></rect>
      <rect
        x="140"
        y="106"
        width="44"
        height="44"
        fill="#10305A"
        stroke="rgba(234,242,248,.35)"
        strokeWidth="1.5"
      ></rect>
      <rect x="150" y="116" width="8" height="6" fill="#FFC72C" opacity=".8"></rect>
      <rect x="166" y="116" width="8" height="6" fill="#FFC72C" opacity=".8"></rect>
      <rect x="150" y="132" width="8" height="6" fill="#FFC72C" opacity=".6"></rect>
      <path
        d="M206 150 L228 58 L250 150 Z"
        fill="none"
        stroke="rgba(255,199,44,.8)"
        strokeWidth="4"
        strokeLinejoin="round"
      ></path>
      <line x1="214" y1="118" x2="242" y2="118" stroke="rgba(255,199,44,.8)" strokeWidth="3"></line>
      <line x1="219" y1="92" x2="237" y2="92" stroke="rgba(255,199,44,.8)" strokeWidth="3"></line>
      <circle cx="228" cy="54" r="4" fill="#FF453A"></circle>
      <line x1="258" y1="150" x2="322" y2="86" stroke="rgba(234,242,248,.4)" strokeWidth="5"></line>
      <g style={{ opacity: 0, animation: 'fade-in .5s 2.9s ease forwards' }}>
        <circle cx="330" cy="70" r="30" fill="url(#hero-flare)"></circle>
        <circle cx="330" cy="74" r="9" fill="#FFC72C" className="harbour-flick"></circle>
        <circle
          cx="338"
          cy="60"
          r="5"
          fill="#FFC72C"
          opacity=".7"
          className="harbour-flick-late"
        ></circle>
      </g>
      <circle
        cx="40"
        cy="134"
        r="26"
        fill="#0C2446"
        stroke="rgba(234,242,248,.35)"
        strokeWidth="2"
      ></circle>
      <line x1="30" y1="122" x2="30" y2="146" stroke="#FFC72C" strokeWidth="4" opacity=".85"></line>
      <line x1="50" y1="122" x2="50" y2="146" stroke="#FFC72C" strokeWidth="4" opacity=".85"></line>
      <line x1="30" y1="134" x2="50" y2="134" stroke="#FFC72C" strokeWidth="4" opacity=".85"></line>
      <line x1="40" y1="160" x2="40" y2="150" stroke="rgba(234,242,248,.4)" strokeWidth="4"></line>
      <rect
        x="328"
        y="96"
        width="3"
        height="40"
        fill="url(#hero-refl)"
        opacity=".5"
        transform="translate(0 210)"
      ></rect>
    </>
  );
}

/** Warehouse — GAC Procurement. */
function WarehouseArt() {
  return (
    <>
      <path
        d="M20 80 L150 28 L280 80 Z"
        fill="#10305A"
        stroke="rgba(234,242,248,.35)"
        strokeWidth="2"
        strokeLinejoin="round"
      ></path>
      <rect
        x="20"
        y="80"
        width="260"
        height="130"
        fill="#0C2446"
        stroke="rgba(234,242,248,.35)"
        strokeWidth="2"
      ></rect>
      <rect x="20" y="80" width="260" height="10" fill="#FFC72C" opacity=".8"></rect>
      <rect
        x="60"
        y="112"
        width="120"
        height="98"
        fill="#0F2A4E"
        stroke="rgba(234,242,248,.3)"
        strokeWidth="2"
      ></rect>
      <g stroke="rgba(234,242,248,.14)" strokeWidth="2">
        <line x1="60" y1="130" x2="180" y2="130"></line>
        <line x1="60" y1="148" x2="180" y2="148"></line>
        <line x1="60" y1="166" x2="180" y2="166"></line>
        <line x1="60" y1="184" x2="180" y2="184"></line>
      </g>
      <circle cx="120" cy="100" r="16" fill="rgba(255,199,44,.16)"></circle>
      <rect x="112" y="97" width="16" height="4" rx="2" fill="#FFC72C"></rect>
      <path d="M 112 101 L 84 210 L 156 210 L 128 101 Z" fill="rgba(255,199,44,.07)"></path>
      <rect
        x="206"
        y="130"
        width="48"
        height="80"
        fill="#0F2A4E"
        stroke="rgba(234,242,248,.3)"
        strokeWidth="2"
      ></rect>
      <rect x="214" y="140" width="32" height="22" fill="#FFC72C" opacity=".8"></rect>
      <rect
        x="130"
        y="46"
        width="40"
        height="26"
        fill="#0C2446"
        stroke="rgba(234,242,248,.35)"
        strokeWidth="2"
      ></rect>
      <rect x="140" y="53" width="20" height="12" fill="#FFC72C" opacity=".85"></rect>
      <g
        className="svg-anim-bottom"
        style={{ animation: 'rise-in .7s 2.6s cubic-bezier(.34,1.3,.64,1) both' }}
      >
        <rect
          x="296"
          y="150"
          width="36"
          height="30"
          fill="#10305A"
          stroke="rgba(234,242,248,.35)"
          strokeWidth="2"
        ></rect>
        <rect
          x="334"
          y="150"
          width="36"
          height="30"
          fill="#0C2446"
          stroke="rgba(234,242,248,.35)"
          strokeWidth="2"
        ></rect>
        <rect
          x="316"
          y="180"
          width="36"
          height="30"
          fill="#FFC72C"
          opacity=".85"
          stroke="rgba(234,242,248,.35)"
          strokeWidth="2"
        ></rect>
        <rect
          x="280"
          y="180"
          width="34"
          height="30"
          fill="#0C2446"
          stroke="rgba(234,242,248,.35)"
          strokeWidth="2"
        ></rect>
        <line x1="316" y1="195" x2="352" y2="195" stroke="#0A2540" strokeWidth="2"></line>
      </g>
      <g
        className="svg-anim-bottom"
        style={{ animation: 'rise-in .7s 3s cubic-bezier(.34,1.3,.64,1) both' }}
      >
        <rect
          x="296"
          y="118"
          width="36"
          height="30"
          fill="#10305A"
          stroke="rgba(234,242,248,.35)"
          strokeWidth="2"
        ></rect>
        <line
          x1="296"
          y1="133"
          x2="332"
          y2="133"
          stroke="rgba(234,242,248,.25)"
          strokeWidth="2"
        ></line>
      </g>
    </>
  );
}

/** Customs booth — GAC Customs. */
function CustomsArt() {
  return (
    <>
      <line x1="36" y1="190" x2="36" y2="60" stroke="rgba(234,242,248,.5)" strokeWidth="4"></line>
      <path
        d="M36 60 L36 32 L82 46 L36 60 Z"
        fill="#1B3D6B"
        stroke="rgba(234,242,248,.35)"
        strokeWidth="2"
      ></path>
      <rect
        x="96"
        y="96"
        width="104"
        height="94"
        fill="#0C2446"
        stroke="rgba(234,242,248,.35)"
        strokeWidth="2"
      ></rect>
      <rect
        x="88"
        y="82"
        width="120"
        height="16"
        rx="4"
        fill="#10305A"
        stroke="rgba(234,242,248,.35)"
        strokeWidth="2"
      ></rect>
      <rect x="110" y="112" width="42" height="30" fill="#FFC72C" opacity=".85"></rect>
      <path d="M 124 142 C 124 130 138 130 138 142 Z" fill="#0A2540"></path>
      <circle cx="131" cy="124" r="5" fill="#0A2540"></circle>
      <circle cx="176" cy="127" r="14" fill="#0C2446" stroke="#FFC72C" strokeWidth="2.5"></circle>
      <path
        d="M176 119 l 3.2 6 l 6.8 .8 l -5 4.6 l 1.4 6.6 l -6.4 -3.4 l -6.4 3.4 l 1.4 -6.6 l -5 -4.6 l 6.8 -.8 Z"
        fill="#FFC72C"
      ></path>
      <rect
        x="110"
        y="156"
        width="30"
        height="34"
        fill="#07142A"
        stroke="rgba(234,242,248,.25)"
        strokeWidth="1.5"
      ></rect>
      <rect
        x="216"
        y="150"
        width="14"
        height="40"
        fill="#10305A"
        stroke="rgba(234,242,248,.3)"
        strokeWidth="1.5"
      ></rect>
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
          strokeWidth="2"
        ></rect>
        <rect x="248" y="148" width="22" height="11" fill="#0A2540"></rect>
        <rect x="292" y="148" width="22" height="11" fill="#0A2540"></rect>
      </g>
      <circle
        cx="223"
        cy="154"
        r="7"
        fill="#10305A"
        stroke="rgba(234,242,248,.4)"
        strokeWidth="1.5"
      ></circle>
    </>
  );
}

/** Lorry — GAC Logistics. */
function LorryArt() {
  return (
    <>
      <ellipse cx="180" cy="118" rx="160" ry="7" fill="#020712" opacity=".5"></ellipse>
      <path d="M 322 68 L 360 56 L 360 100 L 322 88 Z" fill="rgba(255,199,44,.12)"></path>
      <rect
        x="16"
        y="18"
        width="212"
        height="76"
        rx="4"
        fill="#10305A"
        stroke="rgba(234,242,248,.35)"
        strokeWidth="2"
      ></rect>
      <g stroke="rgba(234,242,248,.14)" strokeWidth="2">
        <line x1="52" y1="18" x2="52" y2="94"></line>
        <line x1="88" y1="18" x2="88" y2="94"></line>
        <line x1="124" y1="18" x2="124" y2="94"></line>
        <line x1="160" y1="18" x2="160" y2="94"></line>
        <line x1="196" y1="18" x2="196" y2="94"></line>
      </g>
      <rect x="16" y="82" width="212" height="6" fill="#FFC72C" opacity=".8"></rect>
      <rect x="228" y="94" width="106" height="10" fill="#07142A"></rect>
      <rect x="16" y="94" width="212" height="10" fill="#07142A"></rect>
      <path
        d="M238 94 L238 38 L292 38 L318 62 L318 94 Z"
        fill="#0C2446"
        stroke="rgba(234,242,248,.35)"
        strokeWidth="2"
        strokeLinejoin="round"
      ></path>
      <path d="M248 48 L286 48 L302 64 L248 64 Z" fill="#FFC72C" opacity=".8"></path>
      <rect x="238" y="76" width="80" height="6" fill="#FFC72C" opacity=".7"></rect>
      <circle
        cx="62"
        cy="106"
        r="14"
        fill="#04101F"
        stroke="rgba(234,242,248,.3)"
        strokeWidth="1.5"
      ></circle>
      <circle cx="62" cy="106" r="5" fill="#CBD6E2" opacity=".55"></circle>
      <circle
        cx="108"
        cy="106"
        r="14"
        fill="#04101F"
        stroke="rgba(234,242,248,.3)"
        strokeWidth="1.5"
      ></circle>
      <circle cx="108" cy="106" r="5" fill="#CBD6E2" opacity=".55"></circle>
      <circle
        cx="196"
        cy="106"
        r="14"
        fill="#04101F"
        stroke="rgba(234,242,248,.3)"
        strokeWidth="1.5"
      ></circle>
      <circle cx="196" cy="106" r="5" fill="#CBD6E2" opacity=".55"></circle>
      <circle
        cx="288"
        cy="106"
        r="14"
        fill="#04101F"
        stroke="rgba(234,242,248,.3)"
        strokeWidth="1.5"
      ></circle>
      <circle cx="288" cy="106" r="5" fill="#CBD6E2" opacity=".55"></circle>
      <circle cx="320" cy="78" r="3.5" fill="#FFF3C9"></circle>
      <circle cx="320" cy="78" r="9" fill="rgba(255,243,201,.22)"></circle>
      <rect
        x="318"
        y="86"
        width="6"
        height="8"
        rx="1.5"
        fill="#FF453A"
        className="svg-anim"
        style={{ animation: 'harbour-flick 1s ease-in-out infinite' }}
      ></rect>
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
