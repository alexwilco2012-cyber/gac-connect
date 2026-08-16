import type { Plan } from '../data/suppliers';

/**
 * Supplier commission — 03_COMMERCIAL_RULES §3.2 (v12 model).
 * A commission on third-party work won through the platform, banded by
 * subscription tier so a supplier who commits more keeps more of each job.
 * It is deducted at invoice matching in GA; nothing is charged to clients and
 * there is no booking fee.
 */

export const COMMISSION_BANDS: Record<Plan, number> = {
  free: 20,
  professional: 15,
  premium: 10,
};

/** Founder Programme: first 50 suppliers, first year free, and a 5-point
 *  commission-band reduction for the first 24 months. */
export const FOUNDER_REDUCTION_POINTS = 5;
export const FOUNDER_REDUCTION_MONTHS = 24;
export const FOUNDER_COHORT = 50;

export function commissionPct(plan: Plan, founder = false): number {
  const band = COMMISSION_BANDS[plan];
  return founder ? Math.max(0, band - FOUNDER_REDUCTION_POINTS) : band;
}

/** Commission due on a platform-won job, in whole pounds. */
export function commissionDue(jobValueGBP: number, plan: Plan, founder = false): number {
  return Math.round((jobValueGBP * commissionPct(plan, founder)) / 100);
}

/** What the supplier keeps of a platform-won job after commission. */
export function supplierKeeps(jobValueGBP: number, plan: Plan, founder = false): number {
  return jobValueGBP - commissionDue(jobValueGBP, plan, founder);
}

export const PLAN_ORDER: Plan[] = ['free', 'professional', 'premium'];
