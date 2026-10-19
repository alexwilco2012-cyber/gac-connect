/**
 * The one Node built-in the tests reach for. The platform is browser-only and
 * the repo carries no @types/node, so `tests/xlsx.test.ts` declares the single
 * signature it uses to deflate zip entries by hand (node:zlib is present at
 * run time under vitest; only the types are missing).
 */
declare module 'node:zlib' {
  export function deflateRawSync(buf: Uint8Array): Uint8Array;
}
