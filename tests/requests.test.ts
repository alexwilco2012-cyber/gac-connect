import { describe, expect, it } from 'vitest';
import { HOTEL_AVAILABILITY_CAVEAT, relatedServicesFor } from '../src/data/related';
import { CATEGORIES, SUPPLIERS } from '../src/data/suppliers';
import { isBookable } from '../src/lib/svs';
import {
  deadlineAdvice,
  mealAllowancePerDay,
  mealAllowanceTotal,
  REPLY_WINDOWS,
  replyWindowById,
  DEFAULT_REPLY_WINDOW,
} from '../src/lib/requests';

describe('Quote-request deadline — set by the client, advised by the platform', () => {
  it('a ten-minute window is warned as unlikely to draw a full set of replies', () => {
    expect(deadlineAdvice(replyWindowById('10m').hours).tone).toBe('warn');
    expect(deadlineAdvice(0.5).tone).toBe('warn');
  });

  it('more time given, better quote expected — tone improves with the window', () => {
    expect(deadlineAdvice(2).tone).toBe('info');
    expect(deadlineAdvice(4).tone).toBe('ok');
    expect(deadlineAdvice(24).tone).toBe('ok');
  });

  it('default window is a full one, and unknown ids fall back to it', () => {
    expect(replyWindowById(DEFAULT_REPLY_WINDOW).hours).toBeGreaterThanOrEqual(4);
    expect(replyWindowById('nope').id).toBe(DEFAULT_REPLY_WINDOW);
    expect(REPLY_WINDOWS.map((w) => w.hours)).toEqual(
      [...REPLY_WINDOWS.map((w) => w.hours)].sort((a, b) => a - b),
    );
  });
});

describe('Cross-selling — related services suggested with a request', () => {
  it('medical suggests transfer and a hotel; the hotel carries the availability caveat and meal allowance', () => {
    const related = relatedServicesFor('Medical');
    expect(related.map((r) => r.id)).toEqual(['crew-transfer', 'hotel']);
    const hotel = related.find((r) => r.id === 'hotel')!;
    expect(hotel.availabilityCaveat).toMatch(/subject to availability/);
    expect(hotel.availabilityCaveat).toMatch(/agent steps in/);
    expect(hotel.offersMealAllowance).toBe(true);
  });

  it('categories without a cross-sell map suggest nothing', () => {
    expect(relatedServicesFor('Cranes')).toEqual([]);
  });
});

describe('Meal allowance sliding scale', () => {
  it('steps down per day as the stay lengthens', () => {
    expect(mealAllowancePerDay(1)).toBe(30);
    expect(mealAllowancePerDay(2)).toBe(25);
    expect(mealAllowancePerDay(3)).toBe(25);
    expect(mealAllowancePerDay(4)).toBe(20);
    expect(mealAllowancePerDay(10)).toBe(20);
  });

  it('totals multiply by nights and crew, minimum one night', () => {
    expect(mealAllowanceTotal(1)).toBe(30);
    expect(mealAllowanceTotal(3)).toBe(75);
    expect(mealAllowanceTotal(5, 2)).toBe(200);
    expect(mealAllowanceTotal(0)).toBe(30);
  });
});

describe('Hotels are a standalone marketplace category, not only a medical add-on', () => {
  it('Hotels is a category with bookable suppliers carrying the availability caveat', () => {
    expect(CATEGORIES).toContain('Hotels');
    const hotels = SUPPLIERS.filter((s) => s.category === 'Hotels');
    expect(hotels.length).toBeGreaterThanOrEqual(2);
    for (const h of hotels) {
      expect(h.bookingNote).toBe(HOTEL_AVAILABILITY_CAVEAT);
      expect(isBookable(h.certs)).toBe(true);
    }
  });

  it('a hotel request suggests the crew transfer; the medical hotel add-on shares the same caveat', () => {
    expect(relatedServicesFor('Hotels').map((r) => r.id)).toEqual(['crew-transfer']);
    const medicalHotel = relatedServicesFor('Medical').find((r) => r.id === 'hotel')!;
    expect(medicalHotel.availabilityCaveat).toBe(HOTEL_AVAILABILITY_CAVEAT);
    expect(HOTEL_AVAILABILITY_CAVEAT).toMatch(/subject to availability/);
    expect(HOTEL_AVAILABILITY_CAVEAT).toMatch(/agent steps in/);
  });
});
