import type { HTMLAttributes } from 'react';

export type CardVariant = 'default' | 'inhouse' | 'promoted' | 'dark';

const VARIANTS: Record<CardVariant, string> = {
  default: 'bg-white border border-line',
  // Gold border marks in-house identity only (02: gold is reserved).
  inhouse: 'border-[1.5px] border-gold bg-gradient-to-b from-[#FFFDF4] to-white',
  promoted: 'border-[1.5px] border-[#C9BCF0] bg-gradient-to-b from-[#FBFAFF] to-white',
  dark: 'bg-ink text-white border border-white/10',
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

export function Card({ variant = 'default', className = '', ...rest }: CardProps) {
  return (
    <div className={`rounded-brand p-5 shadow-card ${VARIANTS[variant]} ${className}`} {...rest} />
  );
}
