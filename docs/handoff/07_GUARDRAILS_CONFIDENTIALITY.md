# 07 · GUARDRAILS & CONFIDENTIALITY — overrides every other document

This repository is **public**. Treat every file, commit message, branch name, and issue as readable by anyone: competitors, colleagues, suppliers, journalists.

## Never commit, in any form (code, copy, comments, commits, screenshots, test fixtures)

1. **Internal financials.** No capex figures, no P&L lines, no revenue projections, no cash-facility amounts, no salary bands, no internal approval-form references. The public site describes *how the commercial model works* (tiers, plans, the £35k client-saving example — that's client-facing maths); it never describes *what the business case costs or earns*.
2. **Real client or operator names.** Mock data uses the fictional set in 03 §3.4 only. If a real company name is ever found in the tree, replacing it is an emergency fix.
3. **Internal people.** No employee names, no reviewer/stakeholder names, no org-chart references.
4. **Internal systems detail.** "GAC Agent (GA)" may be *named* as the integration story (it already is, publicly, in the proof of concept) — but no schemas, endpoints, credentials, or real data derived from it. All "GA history" is invented.
5. **Secrets of any kind.** No tokens, keys, or `.env` files; add a pre-commit ignore pattern and never disable it.

## Brand exposure

Default branding is "GAC Connect" (matching the existing public proof of concept). **However**: `BRAND_NAME` in `src/config/brand.ts` must be the *only* place the name is written, so the entire site can rebrand to a neutral codename (e.g. "Pathway") with a one-line change if the owner decides the employer's mark shouldn't sit on a personal repository. Do not hard-code the brand string anywhere else — enforce with a lint-time grep in CI if convenient.

## Truthfulness constraints (public claims)

- The site is a **proof of concept** and must say so (ribbon + footer). It must not claim live operations, real supplier counts, or real transactions.
- **Certification is not a GAC service.** The beta screen's "strategic idea under consideration" framing is mandatory and may not be softened.
- No invented certifications of the *platform itself* (no "ISO-certified", no "SOC 2" badges).
- ESG scores, ratings, analytics: clearly illustrative (the ribbon covers this globally; don't add fake methodology pages).

## Licence & third-party

- Fonts: only self-hosted files with licences permitting it (Space Grotesk is OFL — include the licence file in `/public/fonts`).
- No copied proprietary imagery, no scraped logos, no real vessel photography with unknown rights. SVG illustration only.
- Repo licence: none by default (all rights reserved) unless the owner adds one — do not add an open-source licence on your own initiative.

## If a conflict arises

Guardrails beat backlog speed, spec completeness, and aesthetic preference — in that order and always. When a spec instruction would breach a guardrail, follow the guardrail, log it in `DECISIONS.md`, and continue.
