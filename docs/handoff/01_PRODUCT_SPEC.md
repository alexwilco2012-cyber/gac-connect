# 01 · PRODUCT SPEC

Two zones share one design system: a **public marketing shell** (what a visitor sees) and the **platform demo** (what a client or supplier uses). Navigation between them is seamless; the platform demo runs entirely on mock data with persisted local state.

## A. Marketing shell

### A1. Landing
Hero: brand wordmark, one-line promise ("Offshore services. Found, vetted, booked."), primary CTA "Explore the platform" → dashboard, secondary "List your services" → For Suppliers. Below: the problem (slow / opaque / no data / manual compliance) as four cards; the three-part solution (marketplace + in-house services + SVS); the four-pillars-and-roof motif rendered large; social-proof strip using fictional operators; footer with proof-of-concept disclosure.

### A2. For Clients
How it works in four steps (mirrors the demo's 2-hours-to-15-minutes workflow story: arrival flagged → list pre-filled → quotes in one click → booking becomes the PO). Tier discount explainer with a link into the interactive calculator. ESG angle: supplier scoring supports client decarbonisation reporting.

### A3. For Suppliers
The growth page (ported and improved from demo v4): Founder Programme banner; three plan cards (Free / Professional / Premium) with the feature ladder; three promotion products (featured category placement, homepage spotlight, category sponsorship); a live rendered example of a promoted listing with the "promotion changes position, not credentials" rule stated; example analytics dashboard (views, quote requests, win rate, response time).

### A4. About
Short: what the platform is, the proof-of-concept status, the SVS philosophy (nothing reaches the client unchecked), contact placeholder.

## B. Platform demo

### B1. Loader (first visit per session)
The signature entrance from the reference demo, ported as a component: dark radial stage, GAC letters flying in, chain links popping, CONNECT letter-spacing reveal, vessel crossing animated waves, progress bar. Click/Escape to skip. `prefers-reduced-motion`: skip entirely. Shows once per session (sessionStorage), not on every route change.

### B2. Dashboard (agent's morning)
Greeting + date; KPI tiles (active jobs, open quote requests, SVS-verified suppliers, admin time saved); **predictive procurement card** — vessel arriving, list pre-filled "from GA history", SVS-verified suppliers pre-matched, one button sends quote requests (toast → routes to Quotes); arrivals/departures list with status pills; **client consolidation widget** — the pillars-and-roof SVG with the client's live tier readout; compliance watch (two live SVS alerts, links to SVS screen); "Open Outlook add-in preview" → slide-over drawer showing the inbox sidebar concept (Phase 1 vs Phase 2 honestly labelled).

### B3. Marketplace
Search box + category chips (All, Cranes, Medical, Scaffolding, Diving, NDT, Welding, Catering, Waste, Bunkers). Results in two labelled groups: **GAC in-house premium listings** (gold treatment, pinned, "Engage service" action) then **vetted marketplace suppliers** (Promoted first with label + disclosure line, then the rest; Blocked suppliers visible but unbookable). New over demo: sort control (rating / ESG / name), ESG filter, empty-state with "invite a supplier" copy, and each card links to a supplier profile.

### B4. Supplier profile (new)
Header with name, badges (Verified/Promoted/Blocked as applicable), rating, ESG grade; capability description; compliance table (per-cert status chips with expiry dates); recent activity (fictional completed jobs); "Request quote" CTA respecting blocked state; if Premium: subtle "Premium partner" note and richer media area.

### B5. Quotes (comparison)
The crane-hire scenario: three quote cards (price, availability, capacity, rating, ESG; source line — one "parsed from Outlook reply"), best-match highlight. Accept → per-transaction agreement modal (scope, price, e-signature line) → confirm → toast: PO generated in GA with the multi-client billing split. New over demo: a request list sidebar (this job + two other open requests) so the screen reads as a working queue, not a single tableau.

### B6. Tier calculator
Three service toggles with per-tier labels; annual GAC-spend slider (£50k–£2.0m); result card: tier %, Full Stack flag when all three, £ saved/year, and the **explanatory readout that states *why* the shown tier applies and what adding the next service does** (port the demo's copy verbatim — it's load-bearing). Side card: "why this works for GAC" (discount is a cost; consolidated revenue is the prize).

### B7. SVS
Alert bar (current expiries/blocks); compliance matrix table (supplier / category / cert chips ok-due-lapsed / ESG / rating / status); "what the proprietary SVS adds" summary. New: click-through from any row to the supplier profile; filter by status.

### B8. Supplier analytics (new, reachable from For Suppliers "see example dashboard" and from a Premium supplier profile)
Four stat cards with trend bars; a simple 30-day quote-requests sparkline; plan-gated framing ("available on Professional and Premium").

### B9. Beta previews: Certification and Bunkers
Nav items carry the gold BETA pill. Each screen: scope-discipline banner (verbatim rules in 03), dark hero, three concept cards. Certification = crew credential tracking concept; Bunkers = fuel enquiry concept. No booking actions on either.

## C. Cross-cutting

- **Tour mode**: a dismissible "First time here?" affordance on the dashboard starts a five-stop guided tour (dashboard → marketplace → quotes → tier calculator → SVS), each stop a positioned coach-mark with one sentence. Skippable, keyboard-operable, never auto-repeats after dismissal (persisted).
- **Proof-of-concept ribbon**: persistent, unobtrusive top ribbon on platform screens: "Proof of concept · illustrative data". Marketing shell carries the equivalent in the footer.
- **Toasts** for every mutation-like action; **drawer** for the Outlook preview; **modal** for agreements. All dismissible by Escape and close buttons; focus-trapped while open.
- **State that persists** (storage adapter): tier calculator selections, tour-dismissed, loader-seen-this-session, quote acceptance status, theme of any future preference.
