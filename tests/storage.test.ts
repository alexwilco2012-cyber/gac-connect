import { beforeEach, describe, expect, it } from 'vitest';
import { makeMemoryAdapter, persistent } from '../src/lib/storage';

describe('storage adapter', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('round-trips typed values', () => {
    persistent.set('n', 42);
    persistent.set('o', { a: [1, 2, 3] });
    expect(persistent.get('n', 0)).toBe(42);
    expect(persistent.get('o', {})).toEqual({ a: [1, 2, 3] });
  });

  it('returns the fallback when the key is missing', () => {
    expect(persistent.get('missing', 'fallback')).toBe('fallback');
  });

  it('never throws on corrupted storage — returns the fallback', () => {
    window.localStorage.setItem('gac-connect:corrupt', '{not json![');
    expect(persistent.get('corrupt', { safe: true })).toEqual({ safe: true });
  });

  it('remove deletes the key', () => {
    persistent.set('gone', 1);
    persistent.remove('gone');
    expect(persistent.get('gone', 'default')).toBe('default');
  });

  it('memory adapter honours the same contract', () => {
    const mem = makeMemoryAdapter();
    expect(mem.get('x', 7)).toBe(7);
    mem.set('x', 9);
    expect(mem.get('x', 7)).toBe(9);
    mem.remove('x');
    expect(mem.get('x', 7)).toBe(7);
  });
});
