import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type ButtonVariant = 'primary' | 'ghost' | 'gold' | 'dark-outline';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-sea text-white hover:bg-[#0B4C70]',
  ghost: 'bg-white text-sea border-[1.5px] border-line-strong hover:border-sea',
  // Gold is reserved: use only for in-house actions and Full Stack moments.
  gold: 'bg-gold text-ink hover:bg-[#B89018]',
  'dark-outline':
    'bg-white/5 text-white border-[1.5px] border-white/30 hover:border-white/60 hover:bg-white/10',
};

const BASE =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 py-2 text-[13.5px] font-bold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'primary', className = '', ...rest }: ButtonProps) {
  return <button className={`${BASE} ${VARIANTS[variant]} ${className}`} {...rest} />;
}

export function ButtonLink({
  to,
  variant = 'primary',
  className = '',
  children,
}: {
  to: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={`${BASE} ${VARIANTS[variant]} ${className}`}>
      {children}
    </Link>
  );
}
