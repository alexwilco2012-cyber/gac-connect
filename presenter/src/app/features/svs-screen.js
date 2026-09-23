/* SVS screen (live dashboards, 23 Sep 2026). Stub from task T4; the screen
   is task T10's (spec §4.5), ported from the site's src/screens/app/Svs.tsx
   and svs/*.

   Owner: T10 · binding prefix sv* · partials 49-svs.html,
   77-applicant-modal.html and 78-invite-modal.html.
   Tabs: '#/svs/register|onboarding|evidence' arrives as st.routeSection
   (component.js _parseHash); resolve it only while st.route === 'svs'. The
   register keeps the core svsRows / svsChips bindings (their certificates
   already go through this._dkCertsFor). Shared state lives in desk-state.js
   (st.dkEvidence, st.dkApplications and the _dk* actions), which also
   defines svNavBadge / svNavBadgeShow for the sidebar: do not redefine them. */

(Component._features = Component._features || []).push({
  vals() {
    return {};
  },
});
