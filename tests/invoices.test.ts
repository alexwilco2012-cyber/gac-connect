import { describe, expect, it } from 'vitest';
import { INVOICE_RULES, INVOICES } from '../src/data/invoices';
import type { AllocatedInvoice, SplitInvoice } from '../src/data/invoices';
import { supplierById } from '../src/data/suppliers';
import {
  changeCarriesAdminFee,
  commissionAtMatching,
  daysLeft,
  defaultLineParties,
  invoiceState,
  isSplitDecision,
  movedOffCharterTerms,
  REVIEW_WINDOW_DAYS,
  splitTotals,
  windowLabel,
} from '../src/lib/invoices';

const ALLOCATED = INVOICES.filter((i): i is AllocatedInvoice => i.kind === 'allocated');
const SPLIT = INVOICES.filter((i): i is SplitInvoice => i.kind === 'split');

describe('Invoice review — the seven-day client window (v12 §5)', () => {
  it('window is seven days', () => {
    expect(REVIEW_WINDOW_DAYS).toBe(7);
  });

  it('days left counts down and never goes negative', () => {
    expect(daysLeft(0)).toBe(7);
    expect(daysLeft(2)).toBe(5);
    expect(daysLeft(7)).toBe(0);
    expect(daysLeft(12)).toBe(0);
  });

  it('awaiting while the window is open and no decision has been made', () => {
    expect(invoiceState(2, undefined)).toBe('awaiting');
  });

  it('a client decision matches the invoice', () => {
    expect(invoiceState(2, { allocationId: 'split-60-40' })).toBe('matched');
  });

  it('with the window passed and no action, it matches to GA as it stands', () => {
    expect(invoiceState(7, undefined)).toBe('auto-matched');
    expect(invoiceState(30, undefined)).toBe('auto-matched');
  });

  it('a decision still counts as matched even after the window', () => {
    expect(invoiceState(9, { allocationId: 'browne-100' })).toBe('matched');
  });

  it('changes after matching carry the admin fee; before, they do not', () => {
    expect(changeCarriesAdminFee('awaiting')).toBe(false);
    expect(changeCarriesAdminFee('matched')).toBe(true);
    expect(changeCarriesAdminFee('auto-matched')).toBe(true);
  });

  it('commission is deducted at matching on the supplier’s band', () => {
    expect(commissionAtMatching(4400, 'premium')).toBe(440);
    expect(commissionAtMatching(1850, 'professional')).toBe(278);
    expect(commissionAtMatching(2900, 'free')).toBe(580);
  });

  it('commission at matching stays a supplier-side calculation — the maths still holds', () => {
    // 17 Aug review: the client never sees commission in the app. The lib rule
    // is unchanged (supplier surfaces still rely on it); only the client
    // screens stopped rendering it.
    expect(commissionAtMatching(4400, 'premium', true)).toBe(220);
    expect(commissionAtMatching(0, 'free')).toBe(0);
    for (const inv of ALLOCATED) {
      expect(commissionAtMatching(inv.amountGBP, inv.plan)).toBeGreaterThan(0);
    }
  });

  it('the client-facing rules strip never mentions commission', () => {
    for (const rule of INVOICE_RULES) {
      expect(`${rule.title} ${rule.body}`).not.toMatch(/commission/i);
    }
    expect(INVOICE_RULES).toHaveLength(3);
    expect(INVOICE_RULES[2].title).toBe('Rate the job when it closes');
  });

  it('countdown labels', () => {
    expect(windowLabel(2)).toBe('5 days left');
    expect(windowLabel(6)).toBe('1 day left');
    expect(windowLabel(7)).toBe('Window closed');
  });

  it('scenario data is coherent with the supplier records', () => {
    for (const inv of ALLOCATED) {
      const s = supplierById(inv.supplierId);
      expect(s, inv.supplierId).toBeDefined();
      expect(inv.supplierName).toBe(s!.name);
      expect(inv.plan).toBe(s!.plan);
      expect(inv.allocations.some((a) => a.id === inv.defaultAllocationId)).toBe(true);
    }
    // One awaiting with time, one nearly out, one already auto-matched, and the
    // disbursement fresh in with the whole window ahead of it.
    const states = INVOICES.map((i) => invoiceState(i.receivedDaysAgo, undefined));
    expect(states).toEqual(['awaiting', 'awaiting', 'auto-matched', 'awaiting']);
  });
});

describe('Port disbursement split at the hire boundary', () => {
  const disbursement = SPLIT[0]!;

  it('there is one, and it is the Granite Coast redelivery call', () => {
    expect(SPLIT).toHaveLength(1);
    expect(disbursement.id).toBe('INV-4483');
    expect(disbursement.vessel).toBe('MV Granite Coast');
  });

  it('the headline figure is the sum of the lines', () => {
    const summed = disbursement.lines.reduce((t, l) => t + l.amountGBP, 0);
    expect(disbursement.amountGBP).toBe(summed);
    expect(summed).toBe(7300);
  });

  it('the charter terms put the inbound on the charterer and the rest on owners', () => {
    const parties = defaultLineParties(disbursement.lines);
    // Everything up to and including the dues to the off-hire moment.
    expect(parties['pilot-in']).toBe('charterer');
    expect(parties['tow-in']).toBe('charterer');
    expect(parties['lines-in']).toBe('charterer');
    expect(parties['dues-on']).toBe('charterer');
    // The maintenance shift and everything after the vessel changed hands.
    expect(parties['shift-maint']).toBe('owner');
    expect(parties['dues-off']).toBe('owner');
    expect(parties['lines-out']).toBe('owner');
    expect(parties['pilot-out']).toBe('owner');
  });

  it('the two sides add up to the invoice on the charter terms', () => {
    const totals = splitTotals(disbursement.lines, defaultLineParties(disbursement.lines));
    expect(totals.charterer).toBe(3410);
    expect(totals.owner).toBe(3890);
    expect(totals.total).toBe(disbursement.amountGBP);
    expect(totals.charterer + totals.owner).toBe(totals.total);
  });

  it('moving a line moves the money and never changes the total', () => {
    const moved = { ...defaultLineParties(disbursement.lines), 'lines-in': 'owner' as const };
    const totals = splitTotals(disbursement.lines, moved);
    expect(totals.charterer).toBe(3100);
    expect(totals.owner).toBe(4200);
    expect(totals.total).toBe(disbursement.amountGBP);
  });

  it('the two halves always reconcile, whatever the split', () => {
    // Every possible allocation of the eight lines.
    const lines = disbursement.lines;
    for (let mask = 0; mask < 1 << lines.length; mask++) {
      const parties = Object.fromEntries(
        lines.map((l, i) => [l.id, mask & (1 << i) ? 'owner' : 'charterer'] as const),
      );
      const totals = splitTotals(lines, parties);
      expect(totals.charterer + totals.owner).toBe(disbursement.amountGBP);
    }
  });

  it('a line with no party recorded falls to the charterer rather than vanishing', () => {
    const totals = splitTotals(disbursement.lines, {});
    expect(totals.charterer).toBe(disbursement.amountGBP);
    expect(totals.owner).toBe(0);
    expect(totals.total).toBe(disbursement.amountGBP);
  });

  it('only a line off its charter default is flagged as moved', () => {
    const parties = defaultLineParties(disbursement.lines);
    const linesIn = disbursement.lines.find((l) => l.id === 'lines-in')!;
    expect(movedOffCharterTerms(linesIn, parties)).toBe(false);
    expect(movedOffCharterTerms(linesIn, { ...parties, 'lines-in': 'owner' })).toBe(true);
  });

  it('decisions are told apart by shape', () => {
    expect(isSplitDecision(undefined)).toBe(false);
    expect(isSplitDecision({ allocationId: 'split-60-40' })).toBe(false);
    expect(isSplitDecision({ lineParties: { 'pilot-in': 'owner' } })).toBe(true);
  });

  it('a split decision matches the invoice like any other', () => {
    expect(invoiceState(1, { lineParties: defaultLineParties(disbursement.lines) })).toBe(
      'matched',
    );
  });

  it('the disbursement names no supplier plan and nothing to rate', () => {
    // A harbour is not a marketplace supplier: no profile, no band, no stars.
    expect('supplierId' in disbursement).toBe(false);
    expect('plan' in disbursement).toBe(false);
  });

  it('the client view of the split never mentions the supplier-side deduction', () => {
    const copy = [
      disbursement.hire.headline,
      disbursement.hire.note,
      disbursement.hire.chartererLabel,
      disbursement.hire.ownerLabel,
      ...disbursement.lines.map((l) => `${l.description} ${l.when}`),
    ].join(' ');
    expect(copy).not.toMatch(/commission|mark-?up|margin/i);
  });
});
