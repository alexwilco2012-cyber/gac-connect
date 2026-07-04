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
