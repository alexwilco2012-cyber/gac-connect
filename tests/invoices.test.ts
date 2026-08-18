import { describe, expect, it } from 'vitest';
import { INVOICE_RULES, INVOICES } from '../src/data/invoices';
import { supplierById } from '../src/data/suppliers';
import {
  changeCarriesAdminFee,
  commissionAtMatching,
  daysLeft,
  invoiceState,
  REVIEW_WINDOW_DAYS,
  windowLabel,
} from '../src/lib/invoices';

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
    for (const inv of INVOICES) {
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
    for (const inv of INVOICES) {
      const s = supplierById(inv.supplierId);
      expect(s, inv.supplierId).toBeDefined();
      expect(inv.supplierName).toBe(s!.name);
      expect(inv.plan).toBe(s!.plan);
      expect(inv.allocations.some((a) => a.id === inv.defaultAllocationId)).toBe(true);
    }
    // One invoice awaiting with time, one nearly out, one already auto-matched.
    const states = INVOICES.map((i) => invoiceState(i.receivedDaysAgo, undefined));
    expect(states).toEqual(['awaiting', 'awaiting', 'auto-matched']);
  });
});
