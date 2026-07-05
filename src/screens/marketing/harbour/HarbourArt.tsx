import type { ServiceId } from './services';

/**
 * Original flat illustration in GAC colours, transcribed 1:1 from the
 * "GAC Services Landing" design handoff. All artwork is original to this
 * project (07_GUARDRAILS: no third-party art).
 */

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
      <rect x="0" y="0" width="1600" height="560" fill="url(#harbour-sky)" />
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
      <circle cx="1235" cy="128" r="5" fill="#FFC72C" />
      <circle
        cx="1235"
        cy="128"
        r="30"
        fill="none"
        stroke="#FFC72C"
        strokeWidth="1.6"
        opacity=".5"
        strokeDasharray="5 7"
      />
      <circle
        cx="1235"
        cy="128"
        r="55"
        fill="none"
        stroke="#FFC72C"
        strokeWidth="1.4"
        opacity=".32"
        strokeDasharray="5 9"
      />
      <circle
        cx="1235"
        cy="128"
        r="80"
        fill="none"
        stroke="#FFC72C"
        strokeWidth="1.2"
        opacity=".18"
        strokeDasharray="5 11"
      />
      <path
        d="M 580 590 Q 900 370 1285 465"
        stroke="#FFC72C"
        strokeWidth="2.5"
        strokeDasharray="8 9"
        fill="none"
        opacity=".55"
      />
      <path
        d="M1285 432 c -11 0 -18 9 -18 18 c 0 13 18 27 18 27 c 0 0 18 -14 18 -27 c 0 -9 -7 -18 -18 -18 Z"
        fill="#FFC72C"
        stroke="#0A2540"
        strokeWidth="2.5"
      />
      <circle cx="1285" cy="451" r="5.5" fill="#0A2540" />
      <rect x="0" y="560" width="1600" height="180" fill="#0E5E8A" />
      <line x1="0" y1="560" x2="1600" y2="560" stroke="#FFFFFF" opacity=".22" strokeWidth="2" />
      <path
        d="M0 612 Q 70 604 140 612 T 280 612 T 420 612 T 560 612 T 700 612 T 840 612 T 980 612 T 1120 612 T 1260 612 T 1400 612 T 1540 612 T 1680 612"
        fill="none"
        stroke="#FFFFFF"
        opacity=".13"
        strokeWidth="2"
      />
      <path
        d="M0 658 Q 70 651 140 658 T 280 658 T 420 658 T 560 658 T 700 658 T 840 658 T 980 658 T 1120 658 T 1260 658 T 1400 658 T 1540 658 T 1680 658"
        fill="none"
        stroke="#FFFFFF"
        opacity=".09"
        strokeWidth="2"
      />
      <path
        d="M0 702 Q 70 696 140 702 T 280 702 T 420 702 T 560 702 T 700 702 T 840 702 T 980 702 T 1120 702 T 1260 702 T 1400 702 T 1540 702 T 1680 702"
        fill="none"
        stroke="#FFFFFF"
        opacity=".07"
        strokeWidth="2"
      />
      <path d="M 806 700 l 11 -20 l 11 20 Z" fill="#FFC72C" />
      <line x1="817" y1="680" x2="817" y2="670" stroke="#FFC72C" strokeWidth="2.5" />
      <circle cx="817" cy="667" r="3" fill="#FFFFFF" />
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
    </svg>
  );
}

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
      <line x1="282" y1="64" x2="282" y2="128" stroke="#0A2540" strokeWidth="3.5" />
      <rect x="252" y="128" width="60" height="9" fill="#0A2540" />
      <rect x="252" y="137" width="60" height="34" fill="#0E5E8A" />
      <rect x="252" y="137" width="60" height="9" fill="#FFC72C" />
      <line x1="282" y1="146" x2="282" y2="171" stroke="#FFFFFF" strokeWidth="3" opacity=".4" />
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
        <circle cx="298" cy="6" r="3.5" fill="#FFC72C" />
        <rect x="228" y="52" width="8" height="48" fill="#FFC72C" />
        <line x1="232" y1="52" x2="186" y2="20" stroke="#FFC72C" strokeWidth="5" />
        <line x1="186" y1="20" x2="186" y2="42" stroke="#0A2540" strokeWidth="3" />
      </g>
      <path d="M376 162 Q 390 158 398 164 Q 388 172 372 170 Z" fill="#FFFFFF" opacity=".6" />
      <path d="M6 164 Q 18 158 30 164 Q 18 170 6 164 Z" fill="#FFFFFF" opacity=".45" />
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
      <circle cx="330" cy="74" r="9" fill="#FFC72C" className="harbour-flick" />
      <circle cx="338" cy="60" r="5" fill="#FFC72C" opacity=".7" className="harbour-flick-late" />
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
        x="296"
        y="118"
        width="36"
        height="30"
        fill="#FFC72C"
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
      <line x1="296" y1="133" x2="332" y2="133" stroke="#0A2540" strokeWidth="2" />
      <line x1="316" y1="195" x2="352" y2="195" stroke="#0A2540" strokeWidth="2" />
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
      <rect x="318" y="70" width="8" height="14" fill="#FFC72C" />
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
