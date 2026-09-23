/* Client desk (live dashboards, 23 Sep 2026). Stub from task T4; the screen
   is task T9's (the deck dashboard, spec §2), ported from the site's
   src/screens/app/dashboard/ClientView.tsx and dashboard/client/*.

   Owner: T9 · binding prefix cd* · partial 41-dashboard.html (client view).
   Reads DK / DK_* (desk-data.js) and st.calc; no state of its own is
   persisted. Keep the existing core bindings the client view already uses
   (the dashTitle header, the view switch, the consolidation card with
   data-tour="consolidation" and dashboard-tier-pct) and add new ones as cd*. */

(Component._features = Component._features || []).push({
  vals() {
    return {};
  },
});
