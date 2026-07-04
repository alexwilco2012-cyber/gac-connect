import type { ReactNode } from 'react';

/** 11px, 800, .14em caps — sea on light, gold-bright on dark (02 §typography). */
export function Eyebrow({ dark, children }: { dark?: boolean; children: ReactNode }) {
  return (
    <p
      className={`text-[11px] font-extrabold tracking-[0.14em] uppercase ${
        dark ? 'text-gold-bright' : 'text-sea'
      }`}
    >
      {children}
    </p>
  );
}
