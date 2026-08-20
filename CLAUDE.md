# CLAUDE.md — operating rules for this repository

This repo builds **GAC Connect**, a standalone offshore-services marketplace front-end deployed to GitHub Pages. The authoritative build package lives in `docs/handoff/` (or repo root if you're reading this pre-scaffold): start with `00_MASTER_PROMPT.md`, then specs 01–05. `07_GUARDRAILS_CONFIDENTIALITY.md` **overrides everything** — this is a public repo; no internal financials, no real client names, no employee names, ever, anywhere (including commits).

## Quick rules

- **Business logic is law**: tier discount is non-cumulative max(2,4,7); Full Stack = 7%; £500k → £35,000; clients pay nothing to use the platform (no booking fee); supplier commission on platform-won third-party work is banded 20/15/10 (Basic/Professional/Premium) and deducted at invoice matching — **and the client persona never sees it** (no band, % or £ on Invoices/Dashboard/Quotes/request screens; supplier-facing pages only); the client has a 7-day invoice-review window; FLT and crane prices cover the booked window only (overrun not included, subject to change, supplier T&Cs included — `src/data/serviceTerms.ts`); Gold Band is earned (Premium + annual audit) and lost on lapse; ratings always show the count submitted; blocked suppliers are unbookable regardless of promotion or Gold Band; beta screens carry the scope banner. Tests for these are mandatory (`03_COMMERCIAL_RULES_AND_DATA.md` §3.1–3.2).
- **Service lines are the navigation** (20 Aug): `Dashboard · Agency · Logistics · Customs · Procurement · Marketplace · Quotes · Invoices · SVS · Tiers`. The four lines mirror how GAC sells and invoices, and **Customs keeps its own tab so the 2 / 4 / 7 tier reads straight off the nav** (owner's call). Rules that are tested, not optional: every hub service is marked **★ GAC service** or **◇ GAC network** (`Provision` in `src/data/serviceLines.ts`) because the tier discount applies to GAC in-house charges only; a hub lands on live work, never a menu; the hub is not a second directory (`?category=` hands off to `/app/marketplace`); every marketplace category belongs to exactly one line. Every pre-restructure address still resolves and carries its query string via `RouteRedirect` — `/app/crew-change`, `/app/certification`, `/app/bunkers`, `/app/launches` — so never break a shared link when a tab moves.
- **17 Aug review tabs** (now inside the lines): Procurement via Compass (`/app/procurement`, email to Compass → **Compass sources and supplies every line itself** and confirms the list back → invoiced via Compass under GAC; **no third party is ever named or implied to the client, and no mark-up is ever shown or mentioned** — invoice = Compass's prices + one total; both guarded by tests), Crew change (**`/app/agency/crew-change`**, six sections: hotels · **taxis** (flight-timed transport planner, simulated flight-status feed, every crew-change port) · **launches** (capacity + freight-included per launch, port by port) · immigration · LOI/repat templates → GAC endorses / UKBF endorses → returned; `?section=` deep links with retired ids resolved, `/app/launches` redirects to the launches section). Compass steps, endorsements and flight status are simulated and say so on screen. Never real passport data, controlled-document codes, or employee names.
- **Logistics and Customs** (20 Aug): consignments (`/app/logistics`, Booked → Collected → In transit → At GAC warehouse → Delivered to quay) and declarations (`/app/customs`, Documents received → Declaration prepared → Submitted to HMRC → Cleared), both seeded, both simulated and labelled as such. A movement from outside the UK cross-links to Customs and fills a declaration in from the logistics record. **Customs will not take a declaration until the document set is confirmed complete**, states **"GAC informs, it does not advise"** on screen, and names no broker or third party (tested). Never real commodity codes, EORI numbers or entry references.
- **ESG is a stated intention, not a capability** (owner, 20 Aug): the SVS does **not** score suppliers for ESG, and nothing on either surface may say it does. Grades stay visible to show how the feature would read, every control and column that shows one is labelled `(planned)`, and the screens that show them carry `ESG_PLANNED_NOTE` (`src/data/related.ts`). The intention is ratings "once ESG reporting is established within GAC" — that is the wording proposal v14 uses, so keep the two in step.
- **The guided tour is the demo path** (20 Aug), and the **landing page carries the invitation above the harbour** (`TourInvite`) because that is where the QR lands — it is never dismissed and never shrinks, unlike the in-app `TourPrompt`. Twelve stops in the order the presenter walks a room through — dashboard (×2) · marketplace · crew change · logistics · customs · procurement · quotes · invoices · tiers · SVS · beta preview. It is offered on **any** platform screen, not the dashboard alone, because the closing slide's QR drops people straight in; once declined it shrinks to a "Take the guided tour" button rather than disappearing. Copy is kept **word for word in step** between `src/tour/steps.ts` and the presenter's `DC_DATA.TOUR` — both surfaces tell the panel the same story. Never hard-code the step count (the presenter had `if (i >= 4)` buried in its next handler); derive it from the list.
- **Gold is reserved** for in-house identity / Full Stack / BETA / loader. Never decorative.
- **Brand string** only in `src/config/brand.ts`.
- Mock data only from 03 §3.4 (fictional operators — owner-renamed 2026-07-05: Browne Energy, Grizzell Marine, Stronach Subsea, Wilkinson Drilling).
- British English. No exclamation marks in product copy.
- Reference implementation: `reference/GAC_Connect_demo_v4.html` — port its copy verbatim where specs say so; match its interaction patterns; improve everything structural.

## Commands

```bash
npm run dev              # local (builds the presenter into public/ first via predev)
npm test                 # vitest
npm run e2e              # playwright smokes
npm run lint             # eslint + prettier check
npm run build            # presenter + tsc + vite production build (Pages base path aware)
npm run build:presenter  # presenter only → public/presenter.html + public/presenter/ (needs Python 3)
```

## Two surfaces, one repo

- **Platform** — `src/` (Vite + React). Screens are lazy chunks; `prefetchRoutes()` warms them on idle.
- **Presenter** — `presenter/` (modular source: `src/partials/` one per screen, `src/app/{data,component}.js`, `src/styles/`; `build.py` assembles it). Its site output (`public/presenter.html` + `public/presenter/`) is **generated and gitignored** — never edit or commit it; edit `presenter/src/` and rebuild. The single-file bundle `presenter/dist/presenter.html` is the offline/download copy only. Read `presenter/README.md` before touching it. The published URL `…/gac-connect/presenter.html` must never move (existing printed materials point at it) and the deck carries `noindex, nofollow` — **unlisted, not private**: Pages has no access control, so anyone with the link still opens it. The **QR points at the landing page**, `…/gac-connect/` (owner, 20 Aug — it opened `/app` before, but a dashboard is where you land when you already know what the thing is). It appears on the closing slide as inline SVG and as a printable PNG; regenerate it against the landing page, never the deck, and decode the result before shipping it.

## Branch workflow (owner-facing rules — see `docs/WORKFLOW.md`)

- `main` **is the live site**. Every push to any branch triggers CI and a Pages deploy that publishes `main` at the root and **every other branch as a preview** at `/preview/<branch-with-slashes-as-dashes>/`. Non-main pushes reach the deploy through `branch-push.yml` → `workflow_run` because the `github-pages` environment only allows `main` to deploy (a repo setting; leave both the setting and this indirection alone).
- **Default: work on a branch.** Name it `change/<slug>`; push; hand the owner the preview URL (`https://alexwilco2012-cyber.github.io/gac-connect/preview/change-<slug>/`, presenter at `…/presenter.html` under it) and one line on what to look at. Merge to `main` only when the owner says so ("make it live"); delete the branch when they say "bin it". Go straight to `main` only when the owner explicitly asks ("straight to live") or for a hotfix they've asked for.
- Merges into `main` are fast-forward or plain merges with a conventional-commit message; never force-push `main`; never rewrite history. Rollbacks are `git revert` (new commit), so every live version stays recoverable.
- The deploy builds previews with `vite build --base=/gac-connect/preview/<slug>/`; anything that assumes the base path is `/gac-connect/` must use `import.meta.env.BASE_URL` (router does) or relative URLs (presenter does).

## Workflow

Work `05_BACKLOG.md` in order (E1→E12). Each epic: build → tests green → screenshots at 1280/375 → one-line entries in `DECISIONS.md` for every judgement call → commit (conventional commits). Don't stop to ask unless a guardrail is at stake; decide, log, continue.

## Definition of done (global)

Build, tests, lint all clean · Playwright smokes pass · keyboard-complete · reduced-motion honoured (loader bypasses) · Lighthouse on deploy: Perf ≥ 90, A11y ≥ 95 · no console errors · README current.
