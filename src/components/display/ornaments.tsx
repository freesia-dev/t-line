// Siluet petugas Teller & Customer Service untuk layout "Papan Telihan".

const BUST = 'M104,330 C104,246 146,206 200,206 C254,206 296,246 296,330 Z';

export const TellerSilhouette = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 400 400" fill="currentColor" className={className} aria-hidden>
    <circle cx="200" cy="140" r="50" />
    <path d="M150,128 C150,92 174,80 200,80 C232,80 252,98 252,128 C238,112 214,104 186,108 C170,110 158,118 150,128 Z" />
    <path d={BUST} />
    <rect x="28" y="318" width="344" height="22" rx="6" />
    <rect x="48" y="346" width="304" height="54" />
    <g transform="translate(34 272) rotate(-6)">
      <rect width="66" height="34" rx="5" />
    </g>
    <g transform="translate(40 252) rotate(4)">
      <rect width="62" height="12" rx="4" />
    </g>
    <ellipse cx="336" cy="308" rx="24" ry="8" />
    <rect x="312" y="290" width="48" height="18" />
    <ellipse cx="336" cy="290" rx="24" ry="8" />
    <rect x="316" y="272" width="40" height="18" />
    <ellipse cx="336" cy="272" rx="20" ry="7" />
    <rect x="20" y="20" width="12" height="300" rx="6" />
    <rect x="368" y="20" width="12" height="300" rx="6" />
    <path d="M20,26 Q200,-10 380,26 L380,38 Q200,4 20,38 Z" />
  </svg>
);

export const CSSilhouette = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 400 400" fill="currentColor" className={className} aria-hidden>
    <circle cx="180" cy="150" r="50" />
    <path d="M128,150 C128,104 152,86 182,86 C214,86 234,104 234,140 C220,122 196,116 168,120 C150,124 138,134 128,150 Z" />
    <path d="M118,150 A62,62 0 0 1 242,150" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
    <rect x="104" y="138" width="24" height="44" rx="10" />
    <rect x="232" y="138" width="24" height="44" rx="10" />
    <path d="M114,180 C114,214 140,226 176,222" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
    <circle cx="182" cy="221" r="9" />
    <path d="M84,346 C84,268 126,232 180,232 C234,232 276,268 276,346 Z" />
    <rect x="20" y="342" width="360" height="20" rx="6" />
    <rect x="40" y="366" width="320" height="34" />
    <path d="M262,40 h102 a22,22 0 0 1 22,22 v52 a22,22 0 0 1 -22,22 h-56 l-30,26 v-26 h-16 a22,22 0 0 1 -22,-22 v-52 a22,22 0 0 1 22,-22 Z" />
  </svg>
);
