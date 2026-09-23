import { beforeEach, describe, expect, it } from 'vitest';
import { SEED_CONSIGNMENTS } from '../src/data/logistics';
import { SEED_DECLARATIONS } from '../src/data/customs';
import { resetDemo } from '../src/lib/resetDemo';
import { useApp } from '../src/store/app';
import { useBunkers } from '../src/store/bunkers';
import { useCertification } from '../src/store/certification';
import { useCrewChange } from '../src/store/crewChange';
import { useCustoms } from '../src/store/customs';
import { useLogistics } from '../src/store/logistics';
import { useProcurement } from '../src/store/procurement';
import { useSupplierDesk } from '../src/store/supplierDesk';
import { useSvsDesk } from '../src/store/svsDesk';
import { LOI_DEMO_FORM } from '../src/data/crewChange';
import { SEED_APPLICATIONS, SEED_EVIDENCE } from '../src/data/svsDesk';
import { EXAMPLE_CERT_FORM } from '../src/lib/svsDesk';

/**
 * The top bar's Reset demo puts every screen back to its seeded state — the
 * same reset each screen's own button performs, all at once. A key left behind
 * in storage would resurrect old work on the next reload, so the test checks
 * storage as well as state.
 */
describe('Reset demo — the top bar control', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetDemo();
  });

  it('puts the app store back to its defaults and clears its keys', () => {
    const app = useApp.getState();
    app.toggleTierService('logistics');
    app.setSpend(750_000);
    app.acceptQuote('Q-1');
    app.rateJob('job-1', 4);
    app.setDashboardView('supplier');
    app.dismissTour();
    expect(window.localStorage.getItem('gac-connect:tier')).not.toBeNull();

    resetDemo();

    const after = useApp.getState();
    expect(after.tier).toEqual({ agency: true, logistics: false, customs: false });
    expect(after.spend).toBe(500_000);
    expect(after.acceptedQuoteId).toBeNull();
    expect(after.jobRatings).toEqual({});
    expect(after.invoiceDecisions).toEqual({});
    expect(after.dashboardView).toBe('client');
    expect(after.tourDismissed).toBe(false);
    expect(after.tourStep).toBeNull();
    for (const key of [
      'tier',
      'spend',
      'acceptedQuote',
      'jobRatings',
      'invoiceDecisions',
      'dashboardView',
      'tourDismissed',
    ]) {
      expect(window.localStorage.getItem(`gac-connect:${key}`)).toBeNull();
    }
  });

  it('re-seeds every slice store', () => {
    useCrewChange.getState().addRequest('loi', LOI_DEMO_FORM);
    useProcurement.getState().send();
    useLogistics.getState().reset();
    const consignmentsBefore = useLogistics.getState().consignments.length;
    useLogistics.getState().advance(SEED_CONSIGNMENTS[0]!.id);
    useCustoms.getState().advance(SEED_DECLARATIONS[0]!.id);
    const renewalsBefore = useCertification.getState().renewals.length;
    const enquiriesBefore = useBunkers.getState().enquiries.length;
    // The SVS desk and the supplier's quotes (live dashboards, 23 Sep).
    const svs = useSvsDesk.getState();
    const evd = svs.submitEvidence({
      supplierId: 'silver-city-welding',
      supplierName: 'Silver City Welding',
      kind: 'new',
      form: EXAMPLE_CERT_FORM,
    });
    useSvsDesk.getState().decideEvidence(evd, 'approved');
    useSvsDesk.getState().setCheck('APP-3107', 'insurance', 'passed');
    useSvsDesk.getState().approveApplication('APP-3098');
    useSvsDesk
      .getState()
      .inviteSupplier({ company: 'Nigg Bay Coatings', category: 'Coatings', port: 'Aberdeen' });
    useSupplierDesk.getState().sendQuote('req-4471', {
      amountGbp: 2450,
      leadTime: 'Next day',
      validity: '14 days',
      note: '',
    });
    expect(window.localStorage.getItem('gac-connect:svsDesk.evidence')).not.toBeNull();
    expect(window.localStorage.getItem('gac-connect:svsDesk.applications')).not.toBeNull();
    expect(window.localStorage.getItem('gac-connect:supplierDesk.quotes')).not.toBeNull();

    resetDemo();

    expect(useCrewChange.getState().requests).toEqual([]);
    expect(useProcurement.getState().stage).toBe('draft');
    expect(useLogistics.getState().consignments).toHaveLength(consignmentsBefore);
    expect(useLogistics.getState().consignments[0]!.stage).toBe(SEED_CONSIGNMENTS[0]!.stage);
    expect(useCustoms.getState().declarations[0]!.stage).toBe(SEED_DECLARATIONS[0]!.stage);
    expect(useCertification.getState().renewals).toHaveLength(renewalsBefore);
    expect(useBunkers.getState().enquiries).toHaveLength(enquiriesBefore);
    expect(useSvsDesk.getState().evidence).toEqual(SEED_EVIDENCE);
    expect(useSvsDesk.getState().applications).toEqual(SEED_APPLICATIONS);
    expect(useSupplierDesk.getState().quotes).toEqual({});
    const leftover = Object.keys(window.localStorage).filter(
      (k) => k.startsWith('gac-connect:') && k !== 'gac-connect:sidebarCollapsed',
    );
    expect(leftover).toEqual([]);
  });

  it('leaves the collapsed-sidebar preference alone', () => {
    window.localStorage.setItem('gac-connect:sidebarCollapsed', 'true');
    resetDemo();
    expect(window.localStorage.getItem('gac-connect:sidebarCollapsed')).toBe('true');
  });
});
