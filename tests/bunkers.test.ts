import { describe, expect, it } from 'vitest';
import {
  BUNKER_PORTS,
  BUNKER_SUPPLIERS,
  DEMO_ENQUIRY,
  LAST_STEM,
  SEED_ENQUIRIES,
} from '../src/data/bunkers';
import { SUPPLIERS } from '../src/data/suppliers';
import { VESSELS } from '../src/data/vessels';
import {
  BASE_PRICE_USD,
  bestQuote,
  bunkerAction,
  collectQuotes,
  deliveryRank,
  isBunkerEnquiry,
  isDelivered,
  nextBunkerRef,
  openEnquiries,
  priceFor,
  soonestQuote,
  spreadUsd,
  totalUsd,
  usd,
  validateEnquiry,
} from '../src/lib/bunkers';
import type { BunkerEnquiryForm } from '../src/lib/bunkers';

/**
 * The bunkers preview is a comparison screen, so the rules that matter are the
 * ones that decide what a client sees: who can quote, what a stem actually
 * costs, and whether the same enquiry reads the same way twice.
 */

const form = (over: Partial<BunkerEnquiryForm> = {}): BunkerEnquiryForm => ({
  vesselId: 'caledonian-star',
  port: 'Aberdeen',
  grade: 'LSMGO',
  quantityMt: '180',
  deliveryWindow: 'Fri 06:00–12:00',
  ...over,
});

describe('pricing', () => {
  it('gives the same enquiry the same prices every time it is shown', () => {
    const a = collectQuotes(BUNKER_SUPPLIERS, form(), 'BNK-3042');
    const b = collectQuotes(BUNKER_SUPPLIERS, form(), 'BNK-3042');
    expect(a.quotes).toEqual(b.quotes);
  });

  it('moves the prices when the enquiry is a different one', () => {
    const a = collectQuotes(BUNKER_SUPPLIERS, form(), 'BNK-3042');
    const b = collectQuotes(BUNKER_SUPPLIERS, form(), 'BNK-3043');
    expect(a.quotes.map((q) => q.pricePerMt)).not.toEqual(b.quotes.map((q) => q.pricePerMt));
  });

  it('stays within a few dollars of the grade’s base price', () => {
    for (const supplier of BUNKER_SUPPLIERS) {
      const price = priceFor(supplier, 'VLSFO', 'BNK-3042');
      expect(Math.abs(price - BASE_PRICE_USD.VLSFO)).toBeLessThan(30);
      expect(price).toBeGreaterThan(0);
    }
  });

  it('charges the fuel and the barge, not just the fuel', () => {
    const { quotes } = collectQuotes(BUNKER_SUPPLIERS, form(), 'BNK-3042');
    const quote = quotes[0]!;
    expect(totalUsd(quote, 180)).toBe(quote.pricePerMt * 180 + quote.deliveryFeeUsd);
  });

  it('formats a price the way the trade writes it', () => {
    expect(usd(1234.5, 2)).toBe('$1,234.50');
    expect(usd(61440)).toBe('$61,440');
  });
});

describe('who can quote', () => {
  it('leaves out a supplier that does not lift at the port', () => {
    const { quotes } = collectQuotes(BUNKER_SUPPLIERS, form({ port: 'Montrose' }), 'BNK-3042');
    const names = quotes.map((q) => q.supplierId);
    expect(names).not.toContain('granite-bunkering');
  });

  it('says why a supplier will not take a small stem, rather than staying silent', () => {
    const { quotes, noOffers } = collectQuotes(
      BUNKER_SUPPLIERS,
      form({ quantityMt: '25' }),
      'BNK-3042',
    );
    expect(noOffers.length).toBeGreaterThan(0);
    expect(noOffers[0]!.reason).toMatch(/minimum stem/);
    expect(quotes.every((q) => q.supplierId !== noOffers[0]!.supplierId)).toBe(true);
  });

  it('returns nothing at all rather than a price nobody would honour', () => {
    const { quotes } = collectQuotes(BUNKER_SUPPLIERS, form({ quantityMt: '5' }), 'BNK-3042');
    expect(quotes).toEqual([]);
  });
});

describe('the comparison', () => {
  const { quotes } = collectQuotes(BUNKER_SUPPLIERS, form(), 'BNK-3042');

  it('picks the cheapest all in, not the cheapest per tonne', () => {
    const best = bestQuote(quotes, 180)!;
    const totals = quotes.map((q) => totalUsd(q, 180));
    expect(totalUsd(best, 180)).toBe(Math.min(...totals));
  });

  it('picks the soonest barge by the day the port means, not alphabetically', () => {
    expect(deliveryRank('Thu 18:00')).toBeLessThan(deliveryRank('Fri 06:00'));
    expect(deliveryRank('Fri 06:00')).toBeLessThan(deliveryRank('Sat 08:00'));
    expect(deliveryRank('nonsense')).toBe(Number.POSITIVE_INFINITY);
    const soonest = soonestQuote(quotes)!;
    expect(
      quotes.every(
        (q) => deliveryRank(q.earliestDelivery) >= deliveryRank(soonest.earliestDelivery),
      ),
    ).toBe(true);
  });

  it('reports the spread, and nothing to compare when there is one reply', () => {
    expect(spreadUsd(quotes, 180)).toBeGreaterThan(0);
    expect(spreadUsd(quotes.slice(0, 1), 180)).toBe(0);
    expect(spreadUsd([], 180)).toBe(0);
    expect(bestQuote([], 180)).toBeNull();
    expect(soonestQuote([])).toBeNull();
  });
});

describe('the enquiry', () => {
  it('will not go out without a quantity, a port and a window', () => {
    expect(validateEnquiry(form())).toEqual([]);
    expect(validateEnquiry(form({ quantityMt: '' }))).toContain('Quantity (mt)');
    expect(validateEnquiry(form({ quantityMt: '0' }))).toContain(
      'Quantity must be a number above zero',
    );
    expect(validateEnquiry(form({ quantityMt: 'lots' }))).toContain(
      'Quantity must be a number above zero',
    );
    expect(validateEnquiry(form({ deliveryWindow: '  ' }))).toContain('Delivery window');
    expect(validateEnquiry(form({ port: '' }))).toContain('Port');
  });

  it('walks enquiry → prices → stem → delivered, and stops there', () => {
    expect(bunkerAction('Enquiry raised')?.steps).toBe(1);
    // Taking a price is a decision, not a simulation — no button at this stage.
    expect(bunkerAction('Prices returned')).toBeNull();
    expect(bunkerAction('Stem confirmed')).not.toBeNull();
    expect(bunkerAction('Delivered — BDN received')).toBeNull();
    expect(isDelivered('Delivered — BDN received')).toBe(true);
    expect(isDelivered('Stem confirmed')).toBe(false);
  });

  it('numbers enquiries sequentially from the highest already held', () => {
    expect(nextBunkerRef([])).toBe('BNK-3042');
    expect(nextBunkerRef(SEED_ENQUIRIES)).toBe('BNK-3042');
  });

  it('counts what is open', () => {
    expect(openEnquiries(SEED_ENQUIRIES)).toHaveLength(1);
    expect(
      openEnquiries([{ ...SEED_ENQUIRIES[0]!, stage: 'Delivered — BDN received' }]),
    ).toHaveLength(0);
  });

  it('drops a malformed stored enquiry rather than rendering it', () => {
    expect(isBunkerEnquiry(SEED_ENQUIRIES[0])).toBe(true);
    expect(isBunkerEnquiry({ ...SEED_ENQUIRIES[0], stage: 'Something else' })).toBe(false);
    expect(isBunkerEnquiry({ ...SEED_ENQUIRIES[0], quotes: 'none' })).toBe(false);
    expect(isBunkerEnquiry({ ...SEED_ENQUIRIES[0], form: {} })).toBe(false);
    expect(isBunkerEnquiry(undefined)).toBe(false);
  });
});

describe('the demo data', () => {
  it('prices the seeded enquiry, so the comparison is on screen at once', () => {
    const seed = SEED_ENQUIRIES[0]!;
    expect(seed.stage).toBe('Prices returned');
    expect(seed.quotes.length).toBeGreaterThan(1);
    expect(seed.acceptedSupplierId).toBeUndefined();
  });

  it('knows the last stem for every vessel the picker offers', () => {
    for (const vessel of VESSELS) expect(LAST_STEM[vessel.id]).toBeDefined();
  });

  it('keeps every supplier in a port the enquiry can be raised against', () => {
    for (const supplier of BUNKER_SUPPLIERS) {
      expect(supplier.ports.length).toBeGreaterThan(0);
      expect(supplier.ports.every((p) => (BUNKER_PORTS as readonly string[]).includes(p))).toBe(
        true,
      );
    }
  });

  it('keeps the bunker suppliers out of the vetted directory', () => {
    // Bunker supply is not a marketplace category today; a name in SUPPLIERS
    // would imply an SVS-vetted roster behind a service GAC does not sell.
    const vetted = SUPPLIERS.map((s) => s.name);
    for (const supplier of BUNKER_SUPPLIERS) expect(vetted).not.toContain(supplier.name);
    expect(SUPPLIERS.some((s) => s.category === 'Bunkers')).toBe(false);
  });

  it('fills the example with a stem somebody will actually lift', () => {
    expect(validateEnquiry(DEMO_ENQUIRY)).toEqual([]);
    const { quotes } = collectQuotes(BUNKER_SUPPLIERS, DEMO_ENQUIRY, 'BNK-3042');
    expect(quotes.length).toBeGreaterThan(1);
  });
});
