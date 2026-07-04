# 05 · BACKLOG — execute in order

Each epic: build → test → screenshot at 1280px and 375px → log decisions → next.

**E1 · Foundation.** Vite+React+TS scaffold; Tailwind wired to tokens; router with Pages-safe deep links; storage adapter with tests; `brand.ts`; CI workflow green on a hello-world screen. *Accepts:* fresh clone → `npm i && npm run dev` works; CI passes; a token change visibly restyles.

**E2 · Design system.** All pills/badges, buttons, cards (incl. inhouse + promoted variants), toggle, slider, chips, table, toast, drawer, modal, stat card; `PillarsRoof` (parametric, symmetric overhang, per-pillar on/off, roof-gold-at-fullstack); `Loader` (full choreography, skip, session-once, reduced-motion bypass). A hidden `/kitchen-sink` route rendering everything. *Accepts:* kitchen-sink screenshot review; loader verified in all three modes (full, skipped, reduced-motion).

**E3 · Marketing shell.** Landing, For Clients, For Suppliers, About per spec; footer disclosure; nav between shell and app. *Accepts:* copy facts audit against 03 §3.2 passes; responsive pass.

**E4 · App shell + Dashboard.** Ribbon, app nav (with BETA pills), Dashboard complete: KPIs, predictive card (send → toast → route to Quotes), arrivals, consolidation widget bound to tier state, compliance watch, Outlook drawer. *Accepts:* Playwright smoke #1; widget reflects calculator state changes live.

**E5 · Marketplace + Supplier profiles.** Search, chips, sort, ESG filter; grouped results with pinning/promotion/blocked rules; profile pages with compliance tables; invite-a-supplier empty state. *Accepts:* smoke #2; rule tests — promoted sorts first *within* third-party only; blocked unbookable from list *and* profile.

**E6 · Quotes flow.** Comparison cards, request-queue sidebar, agreement modal, confirmation toast with billing split. *Accepts:* smoke #3; Escape/focus-trap behaviour verified.

**E7 · Tier calculator.** Toggles, slider, result card, Full Stack flag, explanatory notes ported verbatim; state persisted; drives dashboard widget. *Accepts:* smoke #4 (£500k Full Stack shows £35,000); full unit-test table from 03 §3.1 green.

**E8 · SVS.** Alert bar, matrix with status filter, row → profile click-through, "what the SVS adds" card. *Accepts:* smoke #5; derivation unit tests (lapsed⇒Blocked, due⇒Renewal-due) green.

**E9 · Supplier growth + Analytics.** Plans, Founder banner, promotion products, promoted-listing example, analytics screen with plan-gated framing. *Accepts:* plan figures match 03 exactly; analytics reachable from both entry points.

**E10 · Beta previews.** Certification + Bunkers with mandatory banners, dark heroes, concept cards, no booking actions. *Accepts:* banner copy audit; code-split chunks confirmed.

**E11 · Tour + polish.** Five-stop tour (skippable, keyboard-operable, persist-dismissed); a11y sweep (landmarks, labels, contrast checks from 02); error boundary; empty/loading states; content proofread in British English. *Accepts:* keyboard-only full walkthrough recorded in DECISIONS; Lighthouse a11y ≥ 95 locally.

**E12 · Deploy + docs.** Pages deployment live; Lighthouse on the deployed URL meets budgets; repo README (what/run/deploy/screenshot/architecture-in-five-lines); final DECISIONS entry summarising deviations from spec. *Accepts:* public URL loads cold in a private window with zero console errors; all CI green.
