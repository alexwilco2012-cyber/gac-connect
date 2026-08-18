import { describe, expect, it } from 'vitest';
import {
  bookedWindowFrom,
  DEFAULT_BOOKED_WINDOW,
  HIRE_WINDOW_HOURS,
  QUOTE_REQUEST,
} from '../src/data/quotes';
import {
  isOverrunCategory,
  OVERRUN_CATEGORIES,
  OVERRUN_TERMS,
  OVERRUN_TERMS_SHORT,
  serviceTermsFor,
} from '../src/data/serviceTerms';
import { SUPPLIERS } from '../src/data/suppliers';

describe('Hire terms — FLT and crane work is priced for the booked window (17 Aug review)', () => {
  it('cranes and FLT are overrun categories; hotels and launches are not', () => {
    expect(isOverrunCategory('Cranes')).toBe(true);
    expect(isOverrunCategory('FLT')).toBe(true);
    expect(isOverrunCategory('Hotels')).toBe(false);
    expect(isOverrunCategory('Launches')).toBe(false);
    expect(isOverrunCategory('')).toBe(false);
    expect(OVERRUN_CATEGORIES).toEqual(['Cranes', 'FLT']);
  });

  it('serviceTermsFor returns the clause for overrun categories and undefined otherwise', () => {
    expect(serviceTermsFor('Cranes')).toBe(OVERRUN_TERMS);
    expect(serviceTermsFor('FLT')).toBe(OVERRUN_TERMS);
    expect(serviceTermsFor('Hotels')).toBeUndefined();
    expect(serviceTermsFor('Launches')).toBeUndefined();
    expect(serviceTermsFor('Medical')).toBeUndefined();
  });

  it('the clause covers all three points: overrun not included, subject to change, T&Cs included', () => {
    expect(OVERRUN_TERMS).toContain('not included');
    expect(OVERRUN_TERMS).toContain('subject to change');
    expect(OVERRUN_TERMS).toContain('terms and conditions');
    expect(OVERRUN_TERMS).toContain('booked window');
    // Short form carries the same three points for tight spaces.
    expect(OVERRUN_TERMS_SHORT).toMatch(/overrun not included/i);
    expect(OVERRUN_TERMS_SHORT).toMatch(/subject to change/i);
    expect(OVERRUN_TERMS_SHORT).toMatch(/T&Cs included/);
  });

  it('product copy carries no exclamation marks', () => {
    expect(OVERRUN_TERMS).not.toContain('!');
    expect(OVERRUN_TERMS_SHORT).not.toContain('!');
  });

  it('the crane-hire quote scenario is an overrun category and carries its booked window', () => {
    expect(isOverrunCategory(QUOTE_REQUEST.category)).toBe(true);
    expect(serviceTermsFor(QUOTE_REQUEST.category)).toBe(OVERRUN_TERMS);
    expect(QUOTE_REQUEST.bookedWindow).toBe('Fri 06:00–18:00');
    expect(QUOTE_REQUEST.bookedWindow).toBe(DEFAULT_BOOKED_WINDOW);
    // The window the prices cover starts when the crane is needed.
    expect(QUOTE_REQUEST.bookedWindow.startsWith(QUOTE_REQUEST.neededBy)).toBe(true);
  });

  it('a request’s booked window follows its needed-by time — one demo day shift', () => {
    expect(HIRE_WINDOW_HOURS).toBe(12);
    // The scenario and a fresh request agree on the default.
    expect(bookedWindowFrom(QUOTE_REQUEST.neededBy)).toBe(QUOTE_REQUEST.bookedWindow);
    expect(bookedWindowFrom('Fri 06:00')).toBe('Fri 06:00–18:00');
    expect(bookedWindowFrom('Sat 09:30')).toBe('Sat 09:30–21:30');
    expect(bookedWindowFrom(' Mon 14:00 ')).toBe('Mon 14:00–02:00');
    expect(bookedWindowFrom('18:00')).toBe('18:00–06:00');
    // Free text without a time keeps the demo default rather than inventing one.
    expect(bookedWindowFrom('Friday morning')).toBe(DEFAULT_BOOKED_WINDOW);
    expect(bookedWindowFrom('')).toBe(DEFAULT_BOOKED_WINDOW);
    expect(bookedWindowFrom('Fri 26:00')).toBe(DEFAULT_BOOKED_WINDOW);
  });

  it('every crane and FLT supplier in the mock data picks up the clause', () => {
    const covered = SUPPLIERS.filter((s) => isOverrunCategory(s.category));
    expect(covered.length).toBeGreaterThanOrEqual(4); // three crane firms + the FLT firm
    for (const s of covered) {
      expect(serviceTermsFor(s.category), s.id).toBe(OVERRUN_TERMS);
    }
  });
});
