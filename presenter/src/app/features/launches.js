/* Launches — presenter mirror of the site's Launches screen (17 Aug review).
   Feature module: registers state / bindings / Escape handling with the core
   Component via Component._features (see component.js "feature-module
   extension points"). Data it needs lives here too, so app/data.js stays the
   v12 baseline. Scaffold — the full module replaces this. */
(Component._features = Component._features || []).push({
  state() { return {}; },
  vals(st) { return { lrqOpen: false }; },
  escape() { return false; }
});
