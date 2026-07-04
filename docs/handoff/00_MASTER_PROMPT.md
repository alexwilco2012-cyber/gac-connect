# GAC CONNECT — MASTER BUILD PROMPT

You are building **GAC Connect**: a standalone, production-quality front-end platform for an offshore energy services marketplace, hosted on GitHub Pages from this repository. A working single-file proof of concept exists at `reference/GAC_Connect_demo_v4.html` — it proves the concept and defines the interaction patterns. Your job is to rebuild it as a real product: componentised, typed, tested, responsive, accessible, and deployed.

Read this document fully, then read the four specs it governs, in order:

1. `01_PRODUCT_SPEC.md` — what the platform is, every screen, every flow
2. `02_DESIGN_SYSTEM.md` — tokens, type, components, motion, the brand motif
3. `03_COMMERCIAL_RULES_AND_DATA.md` — the business logic that must be implemented exactly, and the mock data
4. `04_ARCHITECTURE.md` — stack, repo layout, quality gates, deployment

Then execute `05_BACKLOG.md` epic by epic. `07_GUARDRAILS_CONFIDENTIALITY.md` overrides everything else in this package if they ever conflict.

---

## The product in one paragraph

Offshore energy operators source hundreds of services — cranes, medics, scaffolding, diving, logistics — through phone calls and email chains. GAC Connect is a B2B digital marketplace that fixes this: vetted suppliers list services, clients find/compare/book them, and GAC's own five in-house service lines (Agency, Logistics, Customs, Assets, Procurement) are surfaced first with a tier discount that rewards clients for consolidating spend. Underneath sits a proprietary Supplier Vetting System (SVS): compliance gate at the front, expiry early-warning behind it. The platform demonstrates integrations with GAC Agent (the internal PO system, source of vessel-level procurement history) and Microsoft Outlook (where offshore procurement actually happens).

## What "better than the demo" means

The reference demo is your floor, not your ceiling. Preserve everything it gets right — the loader, the tier calculator's explanatory readout, the pillars-and-roof motif, the beta-tab scope discipline, the promoted-listing rules — and improve on its known limits:

- **Componentised**, not one 2,000-line file. Every repeated pattern becomes a typed component.
- **Routable**: every screen has a URL that survives refresh and can be shared/bookmarked (GitHub Pages constraint: use hash routing or a 404-redirect SPA fallback).
- **Stateful**: demo interactions persist across reloads via a storage adapter (localStorage behind an interface, so a real backend can replace it without touching UI code).
- **Responsive**: genuinely usable at 375px, not merely unbroken.
- **Accessible**: WCAG 2.2 AA. Keyboard-complete. Reduced-motion honoured everywhere, including the loader.
- **Fast**: Lighthouse performance ≥ 90 and accessibility ≥ 95 on the deployed site.
- **Deeper**: supplier profile pages, marketplace filtering/sorting, a supplier analytics view, and a guided "tour mode" that walks a first-time visitor through the five core flows.

## Non-negotiable business rules (full detail in 03)

These are the rules a reviewer will test first. Implement them exactly; unit-test them explicitly.

1. **Tier discount is non-cumulative.** Agency = 2%, Logistics = 4%, Customs = 7%. A client holds the *highest single tier they qualify for* — never a sum. All three = "Full Stack", which is 7%, not 13%. The discount applies to GAC in-house service charges booked through the platform. The canonical worked example: £500,000 of GAC service spend on Full Stack saves £35,000.
2. **No new commission exists.** The platform's copy must never invent a "platform commission" or "booking fee". The 5% disbursement fee on third-party services is GAC's *existing* mechanism; the platform drives volume through it. GAC Assets and GAC Procurement are included at any tier.
3. **Promotion buys visibility, never trust.** Promoted listings sort first among third-party results and are *always* labelled. No promotion overrides SVS status: a supplier with lapsed compliance is unbookable even on the Premium plan.
4. **The SVS is a gate plus an early warning.** Mandatory vetting fields (BOSIET, HUET, GWO, LOLER, insurance, medicals). Expiry alerts at 90/30/7 days. Statuses: Verified / Renewal due / Blocked. Blocked = no booking, anywhere, ever.
5. **Beta means out of scope.** Certification and Bunkers are "future service previews", visibly banner-labelled as outside the current scope. Certification copy must describe it as a strategic idea under consideration — never as an existing GAC service.
6. **Supplier plans:** Free / Professional £900 per year / Premium £1,800 per year. Founder Programme: first 50 suppliers free for 12 months, then a 25% permanent discount.

## Operating rules for you, the builder

- **Work the backlog in order.** Each epic ends with its acceptance criteria demonstrably met (tests green, screens screenshot-verified at 1280px and 375px) before the next begins.
- **Log every judgement call** in `DECISIONS.md` (template in `templates/`): one line per decision, date, what, why. Anything ambiguous in the specs → make a sensible call, log it, keep moving. Do not stop to ask unless a guardrail is at stake.
- **Never contradict the copy rules.** Marketing text may be rewritten for polish, but the commercial facts in rule set above are load-bearing. When in doubt, reuse the demo's exact sentences — they were lawyered by iteration.
- **Commits**: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`), one epic = one PR-sized unit even if you're pushing to main.
- **The brand string is a constant.** `BRAND_NAME` lives in one config file. Everything renders from it. (See guardrails: the project may need to ship under a neutral codename; a one-line change must rebrand the entire site.)
- **Fictional data only.** Client, operator, and vessel names come from `03_COMMERCIAL_RULES_AND_DATA.md`'s mock data. Never introduce real energy companies. Never include internal figures (see guardrails).
- **Definition of done, globally**: `npm run build` clean; `npm test` green; `npm run lint` clean; Lighthouse budgets met on the Pages deployment; keyboard walkthrough of all five core flows completed; reduced-motion verified; no console errors.

## Sequence

1. Read all package docs. Write `DECISIONS.md` entry #1: your build plan summary (10 lines max).
2. Epic E1 (foundation) through E12 (deploy + docs), per `05_BACKLOG.md`.
3. Finish with a `README.md` for the repo itself: what it is, how to run, how to deploy, a screenshot, and the architecture-in-five-lines.

Begin.
