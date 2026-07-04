import { describe, expect, it } from 'vitest';
import { annualSaving, isFullStack, tierNote, tierPct } from '../src/lib/tier';

/** Mandatory unit-test table from 03_COMMERCIAL_RULES §3.1. */
describe('tier discount — non-cumulative highest tier', () => {
  const sel = (agency: boolean, logistics: boolean, customs: boolean) => ({
    agency,
    logistics,
    customs,
  });

  it('none selected → 0', () => {
    expect(tierPct(sel(false, false, false))).toBe(0);
  });

  it('agency only → 2', () => {
    expect(tierPct(sel(true, false, false))).toBe(2);
  });

  it('logistics only → 4', () => {
    expect(tierPct(sel(false, true, false))).toBe(4);
  });

  it('customs only → 7', () => {
    expect(tierPct(sel(false, false, true))).toBe(7);
  });

  it('agency + logistics → 4 (never 6)', () => {
    expect(tierPct(sel(true, true, false))).toBe(4);
  });

  it('agency + customs → 7 (never 9)', () => {
    expect(tierPct(sel(true, false, true))).toBe(7);
  });

  it('all three → 7 (never 13) and Full Stack true', () => {
    expect(tierPct(sel(true, true, true))).toBe(7);
    expect(isFullStack(sel(true, true, true))).toBe(true);
  });

  it('partial selections are not Full Stack', () => {
    expect(isFullStack(sel(true, true, false))).toBe(false);
    expect(isFullStack(sel(false, false, true))).toBe(false);
  });

  it('canonical example: £500k Full Stack → £35,000', () => {
    expect(annualSaving(500_000, sel(true, true, true))).toBe(35_000);
  });

  it('£100k agency → £2,000', () => {
    expect(annualSaving(100_000, sel(true, false, false))).toBe(2_000);
  });

  it('tier note names the qualifying tier and the upgrades', () => {
    const note = tierNote(sel(true, false, false));
    expect(note).toContain('GAC Agency (2%)');
    expect(note).toContain('GAC Logistics lifts the client to 4%');
    expect(note).toContain('GAC Customs lifts the client to 7%');
  });

  it('tier note flags Full Stack at all three', () => {
    expect(tierNote(sel(true, true, true))).toContain('Full Stack');
    expect(tierNote(sel(true, true, true))).toContain('7%');
  });
});
