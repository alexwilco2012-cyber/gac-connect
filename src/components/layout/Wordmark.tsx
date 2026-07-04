import { Link } from 'react-router-dom';
import { BRAND_MARK, BRAND_PRODUCT } from '../../config/brand';

export function Wordmark({ to = '/', dark = true }: { to?: string; dark?: boolean }) {
  return (
    <Link to={to} className="flex items-baseline gap-2 whitespace-nowrap no-underline">
      <span
        className={`font-display text-[19px] font-bold tracking-[0.12em] ${dark ? 'text-white' : 'text-ink'}`}
      >
        {BRAND_MARK.toUpperCase()}
      </span>
      <span
        className={`text-[12px] font-light tracking-[0.28em] uppercase ${
          dark ? 'text-gold-bright' : 'text-sea'
        }`}
      >
        {BRAND_PRODUCT}
      </span>
    </Link>
  );
}
