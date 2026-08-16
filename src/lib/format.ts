/** Formatting helpers — British English, GBP. */

export function gbp(n: number): string {
  return '£' + Math.round(n).toLocaleString('en-GB');
}

export function compactGbp(n: number): string {
  if (n >= 1_000_000) {
    return `£${(n / 1_000_000).toFixed(1)}m`;
  }
  if (n >= 1_000) return `£${Math.round(n / 1_000)}k`;
  return gbp(n);
}

/** "127 ratings" / "1 rating" — the count of ratings actually submitted. */
export function ratingsCount(count: number): string {
  return `${count.toLocaleString('en-GB')} ${count === 1 ? 'rating' : 'ratings'}`;
}

/** "4.9 ★ · 127 ratings" — score plus the number behind it, always together. */
export function ratingLine(rating: number, count: number): string {
  return `${rating.toFixed(1)} ★ · ${ratingsCount(count)}`;
}
