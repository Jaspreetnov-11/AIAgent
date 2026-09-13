/** The Lighthouse mascot and the yellow mark, copied from the Limelight workspace app so both apps look like one. */

export function Mascot() {
  return (
    <svg viewBox="0 0 70 74" aria-hidden>
      <ellipse cx="35" cy="14" rx="20" ry="8" fill="#FFE38A" opacity=".35" />
      <path d="M35 14 L4 6 L4 22 Z" fill="#FFE38A" opacity=".5" /><path d="M35 14 L66 6 L66 22 Z" fill="#FFE38A" opacity=".5" />
      <rect x="27" y="8" width="16" height="10" rx="3" fill="#FFD84D" stroke="#0A0A0B" strokeWidth="2" />
      <path d="M25 8 L35 2 L45 8 Z" fill="#1F1F23" stroke="#0A0A0B" strokeWidth="2" strokeLinejoin="round" />
      <path d="M27 18 H43 L47 64 H23 Z" fill="#FFFFFF" stroke="#0A0A0B" strokeWidth="2" strokeLinejoin="round" />
      <path d="M26.2 27 H43.8 L44.4 34 H25.6 Z" fill="#FFD21F" /><path d="M24.6 48 H45.4 L46 55 H24 Z" fill="#FFD21F" />
      <circle cx="31.5" cy="40" r="2.6" fill="#0A0A0B" /><circle cx="38.5" cy="40" r="2.6" fill="#0A0A0B" />
      <circle cx="32.4" cy="39.1" r=".9" fill="#fff" /><circle cx="39.4" cy="39.1" r=".9" fill="#fff" />
      <path d="M32 44.5 Q35 47.5 38 44.5" stroke="#0A0A0B" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <ellipse cx="28.5" cy="44" rx="2" ry="1.2" fill="#FF9DB8" /><ellipse cx="41.5" cy="44" rx="2" ry="1.2" fill="#FF9DB8" />
      <path d="M45 40 Q52 36 54 28" stroke="#0A0A0B" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <circle cx="54.5" cy="27" r="2.8" fill="#FFFFFF" stroke="#0A0A0B" strokeWidth="2" />
      <path d="M17 64 H53 Q56 64 55 68 H15 Q14 64 17 64 Z" fill="#1F1F23" stroke="#0A0A0B" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 71 Q13 67 18 71 T28 71 T38 71 T48 71 T58 71 T66 71" stroke="#FFD21F" strokeWidth="2" strokeLinecap="round" opacity=".7" fill="none" />
    </svg>
  );
}

export function Mark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden>
      <path d="M6 14 C3 11 5 6 10 6.5 L41 3 C45 2.6 47.5 6.5 45.5 10 L31 43 C29 47 24 46.5 22.5 43 Z" fill="#FFD21F" stroke="#FFD21F" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}
