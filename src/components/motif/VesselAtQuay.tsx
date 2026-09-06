/**
 * The vessel the whole demo follows, alongside at night — the agent desk's
 * hero art (5 Sep handoff). The same drawing as the deck's and the landing
 * hero's, in a 520×300 frame with its own quay lamp; the gradient id is
 * namespaced `desk-*` because the landing hero can share a page with it.
 * The svg keeps its own aspect ratio and sits on the panel floor, so a tall
 * left column cannot scale the ship up into the caption (owner, 6 Sep).
 * Original artwork in GAC colours (07_GUARDRAILS: no third-party art).
 */
export function VesselAtQuay({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="relative min-h-[220px] overflow-hidden bg-[linear-gradient(180deg,#071633_0%,#0A2540_60%,#0D2C50_100%)] max-lg:min-h-[180px]">
      <svg
        viewBox="0 0 520 300"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 block aspect-[520/300] max-h-full w-full"
      >
        <defs>
          <linearGradient id="desk-refl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFC72C" stopOpacity=".42"></stop>
            <stop offset="1" stopColor="#FFC72C" stopOpacity="0"></stop>
          </linearGradient>
        </defs>
        <g fill="#FFFFFF">
          <circle cx="60" cy="40" r="1.4" opacity=".35"></circle>
          <circle cx="180" cy="26" r="1.2" opacity=".3"></circle>
          <circle cx="300" cy="52" r="1.4" opacity=".32"></circle>
          <circle cx="440" cy="34" r="1.3" opacity=".3"></circle>
          <circle cx="380" cy="90" r="1.1" opacity=".22"></circle>
        </g>
        <rect x="0" y="200" width="520" height="100" fill="#061428"></rect>
        <line
          x1="0"
          y1="200"
          x2="520"
          y2="200"
          stroke="rgba(143,166,188,.3)"
          strokeWidth="1"
        ></line>
        <path
          d="M-60 222 Q -30 216 0 222 T 60 222 T 120 222 T 180 222 T 240 222 T 300 222 T 360 222 T 420 222 T 480 222 T 540 222"
          fill="none"
          stroke="#FFFFFF"
          opacity=".08"
          strokeWidth="1.5"
        ></path>
        <path
          d="M-60 258 Q -30 252 0 258 T 60 258 T 120 258 T 180 258 T 240 258 T 300 258 T 360 258 T 420 258 T 480 258 T 540 258"
          fill="none"
          stroke="#FFFFFF"
          opacity=".05"
          strokeWidth="1.5"
        ></path>
        <rect x="400" y="186" width="120" height="14" fill="#0B1D36"></rect>
        <line
          x1="400"
          y1="186"
          x2="520"
          y2="186"
          stroke="rgba(234,242,248,.28)"
          strokeWidth="1.2"
        ></line>
        <rect x="466" y="150" width="3" height="36" fill="#152F55"></rect>
        <rect x="466" y="148" width="20" height="3" fill="#152F55"></rect>
        <circle
          cx="486"
          cy="150"
          r="3"
          fill="#FFC72C"
          style={{ animation: 'lamp-flick 2.4s ease-in-out infinite' }}
        ></circle>
        <rect
          x="484.5"
          y="200"
          width="3"
          height="34"
          fill="url(#desk-refl)"
          style={{ animation: 'shimmer 2.4s ease-in-out infinite alternate' }}
        ></rect>
        <g
          transform="translate(56 77) scale(.82)"
          style={{ animation: 'ship-bob 5.2s ease-in-out infinite alternate' }}
        >
          <g style={{ animation: 'shimmer 2.2s ease-in-out infinite alternate' }}>
            <rect x="262" y="153" width="2.5" height="26" fill="url(#desk-refl)"></rect>
            <rect x="290" y="153" width="2.5" height="30" fill="url(#desk-refl)"></rect>
            <rect x="318" y="153" width="2.5" height="28" fill="url(#desk-refl)"></rect>
            <rect x="118" y="153" width="2.5" height="16" fill="url(#desk-refl)"></rect>
            <rect x="186" y="153" width="2.5" height="16" fill="url(#desk-refl)"></rect>
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
          <line
            x1="34"
            y1="103"
            x2="246"
            y2="103"
            stroke="rgba(234,242,248,.3)"
            strokeWidth="1.2"
          ></line>
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
          <g fill="#FFC72C" opacity=".95">
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
          <circle
            cx="300"
            cy="10"
            r="2.6"
            fill="#FFFFFF"
            style={{ animation: 'lamp-flick 2.4s ease-in-out infinite' }}
          ></circle>
          <circle cx="255" cy="47" r="2.2" fill="#FF453A"></circle>
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
      </svg>
      <div className="absolute top-4 left-4 flex flex-col gap-0.5">
        <span className="text-[10.5px] font-extrabold tracking-[0.16em] text-gold-bright uppercase">
          {eyebrow}
        </span>
        <span className="font-display text-[15px] font-bold text-white">{title}</span>
        <span className="text-[12px] text-[#B9C8D6]">{detail}</span>
      </div>
    </div>
  );
}
