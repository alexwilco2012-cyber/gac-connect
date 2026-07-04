# DECISIONS.md — judgement-call log

One line per decision: date · epic · what · why. Newest first.

| Date | Epic | Decision | Why |
|---|---|---|---|
| 2026-06-14 | E2 | Drawer renders only while open (slide-in keyframe) instead of parking off-canvas | Off-canvas fixed element extended document scrollWidth (horizontal scrollbar) and left hidden focusables in the tab order |
| 2026-06-14 | E2 | Loader letters/links generated from BRAND_MARK, not hard-coded G-A-C | One-line rebrand guarantee extends to the loader choreography |
| 2026-06-14 | E2 | Loader replay button lives on /kitchen-sink | Gives design review a way to re-run the once-per-session entrance without clearing storage by hand |
| 2026-06-14 | E1 | Fonts live in `src/assets/fonts` (Vite-fingerprinted), OFL licence in `public/fonts/OFL.txt` | Root-relative `url()` in CSS is not base-path rewritten reliably on Pages; bundler-resolved imports are. Spec intent (self-hosted, no CDN) fully honoured |
| 2026-06-14 | E1 | Deploy target is the existing `gac-connect` repo, replacing the interim landing page at the same URL | The printed QR already points there; README handoff says the QR must always point at the best live version |
| 2026-06-14 | E1 | Reference demo NOT committed verbatim; a sanitised copy replaces the internal demo's real operator names with the canonical fictional set and genericises the persona | 07_GUARDRAILS §2: no real company names anywhere in a public tree |
| 2026-06-14 | E1 | Ship as BrowserRouter + 404-shim (spa-github-pages); hash routing kept as logged fallback | 04_ARCHITECTURE prefers real URLs; shim is proven on project pages |
| 2026-06-14 | E1 | Build plan: E1 scaffold+logic core → E2 components/loader → E3 marketing → E4–E8 app screens → E9–E10 growth+beta → E11 tour/a11y → multi-agent audit → E12 deploy to existing repo. Tier/SVS logic authored first with the mandatory test tables; every epic gated on green tests; guardrail scan before any push | Required entry #1 (00_MASTER_PROMPT §sequence) |
