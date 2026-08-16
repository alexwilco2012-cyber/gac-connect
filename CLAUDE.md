# CLAUDE.md — operating rules for this repository

This repo builds **GAC Connect**, a standalone offshore-services marketplace front-end deployed to GitHub Pages. The authoritative build package lives in `docs/handoff/` (or repo root if you're reading this pre-scaffold): start with `00_MASTER_PROMPT.md`, then specs 01–05. `07_GUARDRAILS_CONFIDENTIALITY.md` **overrides everything** — this is a public repo; no internal financials, no real client names, no employee names, ever, anywhere (including commits).

## Quick rules

- **Business logic is law**: tier discount is non-cumulative max(2,4,7); Full Stack = 7%; £500k → £35,000; clients pay nothing to use the platform (no booking fee); supplier commission on platform-won third-party work is banded 20/15/10 (Basic/Professional/Premium) and deducted at invoice matching; the client has a 7-day invoice-review window; Gold Band is earned (Premium + annual audit) and lost on lapse; ratings always show the count submitted; blocked suppliers are unbookable regardless of promotion or Gold Band; beta screens carry the scope banner. Tests for these are mandatory (`03_COMMERCIAL_RULES_AND_DATA.md` §3.1–3.2).
- **Gold is reserved** for in-house identity / Full Stack / BETA / loader. Never decorative.
- **Brand string** only in `src/config/brand.ts`.
- Mock data only from 03 §3.4 (fictional operators — owner-renamed 2026-07-05: Browne Energy, Grizzell Marine, Stronach Subsea, Wilkinson Drilling).
- British English. No exclamation marks in product copy.
- Reference implementation: `reference/GAC_Connect_demo_v4.html` — port its copy verbatim where specs say so; match its interaction patterns; improve everything structural.

## Commands

```bash
npm run dev        # local
npm test           # vitest
npm run e2e        # playwright smokes
npm run lint       # eslint + prettier check
npm run build      # production build (Pages base path aware)
```

## Workflow

Work `05_BACKLOG.md` in order (E1→E12). Each epic: build → tests green → screenshots at 1280/375 → one-line entries in `DECISIONS.md` for every judgement call → commit (conventional commits). Don't stop to ask unless a guardrail is at stake; decide, log, continue.

## Definition of done (global)

Build, tests, lint all clean · Playwright smokes pass · keyboard-complete · reduced-motion honoured (loader bypasses) · Lighthouse on deploy: Perf ≥ 90, A11y ≥ 95 · no console errors · README current.
