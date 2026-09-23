/* Supplier desk (live dashboards, 23 Sep 2026). Stub from task T4; the
   screen is task T9's (the deck dashboard, spec §3 and §4.4), ported from the
   site's src/screens/app/dashboard/SupplierView.tsx and dashboard/supplier/*.

   Owner: T9 · binding prefix sd* · partials 41-dashboard.html (supplier
   view), 75-cert-modal.html and 76-quote-modal.html.
   Shared state lives in desk-state.js: st.dkEvidence and st.dkQuotes, changed
   only through this._dkSubmitEvidence(…) and this._dkSendQuote(…); the rows
   come from DK_vaultRows(DK.SILVER_CITY_VAULT, st.dkEvidence,
   DK.DEMO_SUPPLIER_ID). Modal drafts are this module's own, unpersisted state. */

(Component._features = Component._features || []).push({
  vals() {
    return {};
  },
});
