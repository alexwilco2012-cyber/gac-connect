# 04 · ARCHITECTURE

## Stack

- **Vite + React 18 + TypeScript (strict)** — fast, boring, right.
- **Tailwind CSS** themed from the design-system tokens (tokens also exposed as CSS custom properties so raw CSS/SVG can use them).
- **React Router** with `basename` set from Vite's `BASE_URL`; ship a `404.html` SPA-redirect shim so deep links survive GitHub Pages. (If the shim proves brittle, fall back to hash routing — log the decision.)
- **Zustand** for app state (tier selections, tour, toasts), persisted through a **storage adapter** (`src/lib/storage.ts`) wrapping localStorage/sessionStorage behind an interface — the seam where a real backend later replaces persistence without UI changes.
- **Vitest + React Testing Library** for units (tier logic, SVS derivation, storage adapter, marketplace sort). **Playwright** for five smoke journeys (one per core flow).
- **ESLint + Prettier**, CI-enforced.
- **No runtime dependencies beyond these.** No analytics, no trackers, no external font/CDN requests — fonts self-hosted, icons as local SVG components.

## Repo layout

```
gac-connect/
├── .github/workflows/ci.yml          # lint + test + build on PR/push
├── .github/workflows/deploy.yml      # build → GitHub Pages on main
├── public/fonts/                     # Space Grotesk woff2, licence file
├── src/
│   ├── config/brand.ts               # BRAND_NAME and site constants
│   ├── styles/tokens.css             # the custom properties, single source
│   ├── lib/                          # storage.ts, tier.ts, svs.ts, format.ts
│   ├── data/                         # suppliers.ts, vessels.ts, quotes.ts, plans.ts (typed)
│   ├── components/                   # ui/ (pills, cards, buttons…), motif/ (PillarsRoof, Loader)
│   ├── screens/
│   │   ├── marketing/                # Landing, ForClients, ForSuppliers, About
│   │   └── app/                      # Dashboard, Marketplace, SupplierProfile,
│   │                                 # Quotes, TierCalculator, SVS, Analytics,
│   │                                 # CertificationBeta, BunkersBeta
│   ├── tour/                         # coach-mark engine + steps
│   ├── App.tsx  main.tsx  routes.tsx
├── tests/  e2e/
├── DECISIONS.md  CLAUDE.md  README.md
```

## Quality gates (CI-enforced where possible)

1. `tsc --noEmit`, ESLint, Prettier-check — zero errors.
2. Vitest: tier-logic table tests from 03 mandatory; overall meaningful coverage of `src/lib`.
3. Playwright smokes: loader-skip → dashboard renders; marketplace search+filter; quote accept → agreement → toast; tier calculator full-stack math shows £35,000 at £500k; SVS blocked supplier unbookable from its profile.
4. Build size sanity: initial JS ≤ 250KB gzipped (code-split the beta screens and tour if needed).
5. Lighthouse on the deployed URL: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95. Record scores in README.
6. Manual keyboard pass of all five core flows; reduced-motion pass (loader must bypass).

## Deployment

GitHub Actions → GitHub Pages (`deploy.yml`: build with correct `base`, upload artifact, deploy). Repo settings note in README: Pages → GitHub Actions source. Custom-domain-ready (CNAME file support documented but not committed). The published URL goes in the README header; note for the owner: **regenerate the printed QR code if the live URL changes** from the current proof-of-concept address.

## Performance & robustness details

- Loader assets are inline SVG/CSS — zero image requests before first paint of the stage.
- Images (if any beyond SVG) lazy-loaded with explicit dimensions.
- `prefers-color-scheme` untouched in v1 (light only) — dark mode is a logged non-goal.
- Error boundary at the router level with a branded fallback ("Something broke — refresh, or head back to the dashboard").
- All state reads defensive: corrupted localStorage never crashes the app (adapter try/catch → defaults).
