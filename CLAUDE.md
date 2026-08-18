# CLAUDE.md — operating rules for this repository

This repo builds **GAC Connect**, a standalone offshore-services marketplace front-end deployed to GitHub Pages. The authoritative build package lives in `docs/handoff/` (or repo root if you're reading this pre-scaffold): start with `00_MASTER_PROMPT.md`, then specs 01–05. `07_GUARDRAILS_CONFIDENTIALITY.md` **overrides everything** — this is a public repo; no internal financials, no real client names, no employee names, ever, anywhere (including commits).

## Quick rules

- **Business logic is law**: tier discount is non-cumulative max(2,4,7); Full Stack = 7%; £500k → £35,000; clients pay nothing to use the platform (no booking fee); supplier commission on platform-won third-party work is banded 20/15/10 (Basic/Professional/Premium) and deducted at invoice matching — **and the client persona never sees it** (no band, % or £ on Invoices/Dashboard/Quotes/request screens; supplier-facing pages only); the client has a 7-day invoice-review window; FLT and crane prices cover the booked window only (overrun not included, subject to change, supplier T&Cs included — `src/data/serviceTerms.ts`); Gold Band is earned (Premium + annual audit) and lost on lapse; ratings always show the count submitted; blocked suppliers are unbookable regardless of promotion or Gold Band; beta screens carry the scope banner. Tests for these are mandatory (`03_COMMERCIAL_RULES_AND_DATA.md` §3.1–3.2).
- **17 Aug review tabs**: Procurement via Compass (`/app/procurement`, email to Compass → Compass supplies or sources through its network and pays the chandler → invoiced via Compass under GAC; **no mark-up is ever shown or mentioned to the client** — invoice = Compass's prices + one total), Crew change (`/app/crew-change`, hotels + **Transfers** (taxis, launches with capacity + freight-included per launch, flight-timed transport planner with a simulated flight-status feed) + immigration + LOI/repat templates → GAC endorses / UKBF endorses → returned; `?section=` deep links, `/app/launches` redirects there). Compass replies, endorsements and flight status are simulated and say so on screen. Never real passport data, controlled-document codes, or employee names.
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
- **Presenter** — `presenter/` (modular source: `src/partials/` one per screen, `src/app/{data,component}.js`, `src/styles/`; `build.py` assembles it). Its site output (`public/presenter.html` + `public/presenter/`) is **generated and gitignored** — never edit or commit it; edit `presenter/src/` and rebuild. The single-file bundle `presenter/dist/presenter.html` is the offline/download copy only. Read `presenter/README.md` before touching it. The published URL `…/gac-connect/presenter.html` must never move (printed QR).

## Branch workflow (owner-facing rules — see `docs/WORKFLOW.md`)

- `main` **is the live site**. Every push to any branch triggers CI and a Pages deploy that publishes `main` at the root and **every other branch as a preview** at `/preview/<branch-with-slashes-as-dashes>/`. Non-main pushes reach the deploy through `branch-push.yml` → `workflow_run` because the `github-pages` environment only allows `main` to deploy (a repo setting; leave both the setting and this indirection alone).
- **Default: work on a branch.** Name it `change/<slug>`; push; hand the owner the preview URL (`https://alexwilco2012-cyber.github.io/gac-connect/preview/change-<slug>/`, presenter at `…/presenter.html` under it) and one line on what to look at. Merge to `main` only when the owner says so ("make it live"); delete the branch when they say "bin it". Go straight to `main` only when the owner explicitly asks ("straight to live") or for a hotfix they've asked for.
- Merges into `main` are fast-forward or plain merges with a conventional-commit message; never force-push `main`; never rewrite history. Rollbacks are `git revert` (new commit), so every live version stays recoverable.
- The deploy builds previews with `vite build --base=/gac-connect/preview/<slug>/`; anything that assumes the base path is `/gac-connect/` must use `import.meta.env.BASE_URL` (router does) or relative URLs (presenter does).

## Workflow

Work `05_BACKLOG.md` in order (E1→E12). Each epic: build → tests green → screenshots at 1280/375 → one-line entries in `DECISIONS.md` for every judgement call → commit (conventional commits). Don't stop to ask unless a guardrail is at stake; decide, log, continue.

## Definition of done (global)

Build, tests, lint all clean · Playwright smokes pass · keyboard-complete · reduced-motion honoured (loader bypasses) · Lighthouse on deploy: Perf ≥ 90, A11y ≥ 95 · no console errors · README current.
