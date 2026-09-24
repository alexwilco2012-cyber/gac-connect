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

/** "1,264" — a count, grouped the British way. */
export function count(n: number): string {
  return n.toLocaleString('en-GB');
}

/** "1 rating" / "1,264 profile views" — a count with its noun, singular at one. */
export function plural(n: number, one: string, many: string): string {
  return `${count(n)} ${n === 1 ? one : many}`;
}

/** "127 ratings" / "1 rating" — the count of ratings actually submitted. */
export function ratingsCount(n: number): string {
  return plural(n, 'rating', 'ratings');
}

/** "4.9 ★ · 127 ratings" — score plus the number behind it, always together. */
export function ratingLine(rating: number, ratingCount: number): string {
  return `${rating.toFixed(1)} ★ · ${ratingsCount(ratingCount)}`;
}
