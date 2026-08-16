import { ratingsCount } from '../../lib/format';

/**
 * Rating readout — the score never travels without the number of ratings
 * actually submitted behind it. "4.9 ★ · 127 ratings".
 */
export function Rating({
  rating,
  count,
  size = 'md',
}: {
  rating: number;
  count: number;
  size?: 'sm' | 'md';
}) {
  return (
    <span className={`inline-flex items-baseline gap-1 ${size === 'sm' ? 'text-[12.5px]' : ''}`}>
      <span className="font-bold text-gold-deep">{rating.toFixed(1)} ★</span>
      <span className="text-ink-soft">· {ratingsCount(count)}</span>
    </span>
  );
}
