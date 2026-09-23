# Live dashboards Implementation Plan

> **For agentic workers:** executed by an orchestrated workflow — one subagent per task below,
> each owning a disjoint set of files. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the client and supplier dashboards read like a real product, add certificate upload
(supplier) and supplier onboarding + evidence review (SVS team), and rebuild supplier analytics
with proper charts — on the site and the deck, with identical figures.

**Architecture:** Shared seed data + pure rules in `src/data` / `src/lib` (unit-tested), two new
zustand slice stores (`svsDesk`, `supplierDesk`) wired into Reset demo, a hand-rolled chart kit in
`src/components/charts/`, and the screens split into focused files. The deck mirrors all of it in
feature modules (`presenter/src/app/features/*.js`) with a plain-JS chart kit (`viz.js`).

**Tech Stack:** React 19, react-router 7, zustand 5, Tailwind 4 (tokens in `src/styles/tokens.css`),
TypeScript 6 strict + `noUncheckedIndexedAccess`, Vitest, Playwright; deck: dc-runtime partials +
Python `build.py`.

**Spec:** `docs/superpowers/specs/2026-09-23-live-dashboards-design.md` (read it in full — every
figure, label and rule referenced below is defined there).

## Global Constraints

• Spec §0 rules 1–15 apply to every task (commission never in the client view; fictional companies,
  no person names; simulated steps labelled; ESG planned only; gold reserved; ratings with count;
  one 44px lead number; British English, no exclamation marks; Premium-only benchmarking; nothing
  new in `SUPPLIERS`; SVS items never in `useNeedsYou`; no chart library; accessibility; persistence
  and reset; the listed tests/testids/accessible names keep passing).
• Repo: `C:\Users\wilco\.claude\projects\GAC Connect\gac-connect`, branch `change/live-dashboards`.
• **Only edit the files your task owns.** If you need a change in a file you do not own, say so in
  your final report instead of editing it.
• **Never commit, never push, never switch branches** in the main working tree (the orchestrator
  commits). Worktree tasks (T9–T11) commit in their own worktree branch only.
• **Never kill processes by image name** (`taskkill /IM node.exe`, `Stop-Process -Name node` …).
  Stop only a process you started, by its PID. A shared dev server runs on :5173 — leave it alone.
• Do not run `npm run build`, `npm run build:presenter`, `npm run dev` or `npm run e2e` (whole
  suite) in the main tree. Allowed: `npx tsc --noEmit -p .` (ignore errors in files you don't own —
  other tasks are mid-edit), `npx vitest run`, `npx eslint <your files>`,
  `npx prettier --write <your files>`, `npx playwright test <your spec> e2e/<related spec>`
  (reuses the :5173 server), and Playwright screenshot scripts against http://localhost:5173.
• Line endings: the checkout uses `core.autocrlf=true`; check formatting with
  `npx prettier --check --end-of-line auto <files>`.
• Commit messages (worktree tasks): conventional commits, ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File ownership map

| Task | Owns (create/modify) |
|---|---|
| T1 site foundation | `src/data/desk.ts`, `src/data/clientDesk.ts`, `src/data/supplierDesk.ts`, `src/data/svsDesk.ts`, `src/data/analytics.ts`, `src/data/plans.ts` (SPARKLINE_30D only), `src/lib/clientDesk.ts`, `src/lib/svsDesk.ts`, `src/store/svsDesk.ts`, `src/store/supplierDesk.ts`, `src/lib/resetDemo.ts`, `src/components/layout/AppLayout.tsx` (reset copy + SVS badge), `src/components/ui/Icon.tsx`, `src/components/ui/Modal.tsx` (optional `size` prop only), `src/styles/tokens.css` (viz tokens + chart keyframes), `src/screens/app/Dashboard.tsx` (split into shell), `src/screens/app/dashboard/ClientView.tsx` + `SupplierView.tsx` (verbatim move only), `tests/svsDesk.test.ts`, `tests/clientDesk.test.ts`, `tests/analyticsData.test.ts`, `tests/resetDemo.test.ts` |
| T2 site chart kit | `src/components/charts/**`, `src/components/ui/StatCard.tsx`, `src/components/ui/Sparkline.tsx`, `src/screens/KitchenSink.tsx` (charts section), `tests/charts.test.ts` |
| T3 deck chart kit | `presenter/src/app/features/viz.js`, `presenter/src/partials/53-kitchen-sink.html`, include line for viz.js in `presenter/src/index.html` |
| T4 deck foundation | `presenter/src/app/features/desk-data.js`, `presenter/src/app/features/desk-state.js`, stub modules `features/client-desk.js`, `features/supplier-desk.js`, `features/svs-screen.js`, `features/analytics.js`, stub partials `75-cert-modal.html`, `76-quote-modal.html`, `77-applicant-modal.html`, `78-invite-modal.html`, all new include lines in `presenter/src/index.html`, `presenter/src/app/component.js` (all core edits), `presenter/src/partials/30-chrome.html` (SVS badge), `presenter/src/app/data.js` (only if strictly needed) |
| T5 site client view | `src/screens/app/dashboard/ClientView.tsx`, `src/screens/app/dashboard/client/**`, `e2e/client-dashboard.spec.ts` |
| T6 site supplier view | `src/screens/app/dashboard/SupplierView.tsx`, `src/screens/app/dashboard/supplier/**`, `src/screens/app/SupplierProfile.tsx` (certsWithApproved only), `e2e/supplier-desk.spec.ts` |
| T7 site SVS | `src/screens/app/Svs.tsx`, `src/screens/app/svs/**`, `src/screens/app/Internal.tsx` (SVS KPI only), `e2e/svs-desk.spec.ts` |
| T8 site analytics | `src/screens/app/Analytics.tsx`, `src/screens/app/analytics/**`, `e2e/analytics.spec.ts` |
| T9 deck dashboard (worktree) | `presenter/src/partials/41-dashboard.html`, `75-cert-modal.html`, `76-quote-modal.html`, `features/client-desk.js`, `features/supplier-desk.js`, `presenter/src/styles/base.css` (only `gac-cd-*`/`gac-sd-*` rules, appended in a marked block) |
| T10 deck SVS (worktree) | `presenter/src/partials/49-svs.html`, `77-applicant-modal.html`, `78-invite-modal.html`, `features/svs-screen.js`, `base.css` (only `gac-sv-*` rules, marked block) |
| T11 deck analytics (worktree) | `presenter/src/partials/50-analytics.html`, `features/analytics.js`, `base.css` (only `gac-an-*` rules, marked block) |
| T12 integration (orchestrator) | merges, dead-code removal in `component.js`, DECISIONS.md, README counts, full build/lint/test/e2e |

## Stage order

1. T1 ∥ T2 ∥ T3
2. T4 (after T1, T3) ∥ T5, T6, T7, T8 (after T1, T2) — orchestrator runs `npm run dev` on :5173 first
3. Orchestrator gate: full `tsc`, `vitest`, `lint`, the e2e suite; commit.
4. T9 ∥ T10 ∥ T11 in git worktrees off the stage-3 commit (after T4 and their site counterparts)
5. T12 merge + gate; then an adversarial review workflow; fixes; screenshots at 1280/375; push.

---

### Task T1: Site foundation — data, rules, stores, reset wiring, tokens, dashboard split

**Interfaces — Produces (exact names; later tasks import these):**

```ts
// src/data/desk.ts
export const DEMO_CLIENT = 'Browne Energy';
export const DEMO_SUPPLIER_ID = 'silver-city-welding';
export const EXAMPLE_JOB_GBP = 4400;

// src/data/clientDesk.ts
export type LineId = 'agency' | 'logistics' | 'customs' | 'procurement';
export const LINE_ORDER: readonly LineId[]; // agency, logistics, customs, procurement
export const LINE_LABELS: Record<LineId, string>;
export const PORT_CALL_STAGES: readonly ['Pre-arrival','Pilot booked','Berth confirmed','Alongside','Sailed'];
export type PortCallStage = (typeof PORT_CALL_STAGES)[number];
export interface PortCallChip { label: string; to?: string; tone: 'info' | 'warn' | 'success' }
export interface PortCall { vesselId: string; stage: PortCallStage; when: string; countdown: string; berth: string; chips: PortCallChip[] }
export const PORT_CALLS: PortCall[];
export interface ActivityItem { id: string; when: string; line: LineId | 'quotes' | 'invoices' | 'svs'; icon: IconName; text: string; to: string }
export const CLIENT_ACTIVITY: ActivityItem[];
export const SPEND_MONTHS: readonly string[]; // ['Apr','May','Jun','Jul','Aug','Sep']
export const SPEND_BY_LINE: Record<LineId, readonly number[]>;
export interface QuickAction { label: string; icon: IconName; to: string }
export const QUICK_ACTIONS: QuickAction[];

// src/lib/clientDesk.ts
export function heldLines(tier: TierSelection): LineId[];            // procurement always
export function spendSeries(tier: TierSelection): { id: LineId; label: string; values: number[] }[];
export function monthlySaving(tier: TierSelection): number[];        // month total × tierPct, rounded
export function visibleActivity(tier: TierSelection): ActivityItem[]; // drops logistics/customs rows not held
export function portCallStep(stage: PortCallStage): number;          // 1-based

// src/data/supplierDesk.ts
export interface InboxRequest { id: string; service: string; vessel: string; detail: string; replyBy: string; tone: 'warn' | 'info' }
export const SUPPLIER_INBOX: InboxRequest[];
export interface AwaitingQuote { id: string; service: string; vessel: string; amountGbp: number; sentLabel: string }
export const AWAITING_QUOTES: AwaitingQuote[];
export const WON_THIS_MONTH = 4;
export const LEAD_TIMES: readonly string[]; export const VALIDITY: readonly string[];
export interface VaultCert { id: string; name: string; svsName: string; issuer: string; reference: string; issuedOn: string; expiresOn: string; daysLeft: number }
export const SILVER_CITY_VAULT: VaultCert[];
export const RECOMMENDED_FOR_WELDING: readonly string[];
export const EARNINGS_MONTHS: readonly string[]; export const EARNINGS_WON: readonly number[];
export interface Review { id: string; stars: number; by: string; job: string; text: string; when: string }
export const RECENT_REVIEWS: Review[];
export interface SupplierKpi { id: 'views'|'requests'|'win'|'response'; label: string; value: string; delta: string; series?: readonly number[] }
export const SUPPLIER_KPIS: SupplierKpi[];

// src/data/svsDesk.ts
export const CERT_TYPES: readonly string[];
export const ONBOARDING_STAGES: readonly ['Applied','Documents','Checks','Decision'];
export type OnboardingStage = (typeof ONBOARDING_STAGES)[number];
export type CheckId = 'company'|'insurance'|'hse'|'sanctions'|'bank'|'references'|'category'|'policies';
export type CheckState = 'pending' | 'passed' | 'failed' | 'na';
export const CHECKS: readonly { id: CheckId; label: string }[];
export type Actor = 'SVS team' | 'Applicant' | 'Supplier' | 'System';
export interface TrailEntry { at: string; by: Actor; text: string }
export type Risk = 'Low' | 'Medium' | 'High';
export interface Application { id: string; company: string; category: string; port: string; appliedLabel: string; daysInReview: number; stage: OnboardingStage; outcome: 'open'|'approved'|'declined'; risk: Risk; categoryCheckLabel: string; checks: Record<CheckId, CheckState>; infoRequest?: string; decisionNote?: string; trail: TrailEntry[] }
export const SEED_APPLICATIONS: Application[];
export type EvidenceStage = 'submitted' | 'approved' | 'info-requested' | 'rejected';
export interface EvidenceSubmission { id: string; supplierId: string; supplierName: string; kind: 'new'|'renewal'; certType: string; certLabel: string; vaultId?: string; issuer: string; reference: string; issuedOn: string; expiresOn: string; daysLeft: number; fileName: string; fileSize: number; submittedAt: string; stage: EvidenceStage; note?: string; trail: TrailEntry[] }
export const SEED_EVIDENCE: EvidenceSubmission[];
export const MEDIAN_VERIFY_LABEL = '3.5 days';
export const SLA_DAYS = 5;

// src/lib/svsDesk.ts
export interface CertForm { certType: string; otherLabel: string; issuer: string; reference: string; issuedOn: string; expiresOn: string; fileName: string; fileSize: number; declared: boolean }
export const EMPTY_CERT_FORM: CertForm; export const EXAMPLE_CERT_FORM: CertForm;
export const MAX_FILE_BYTES = 10 * 1024 * 1024; export const ACCEPTED_EXTENSIONS: readonly string[];
export function validateCertForm(form: CertForm, todayISO: string): string[];
export function fileSizeLabel(bytes: number): string;
export function formatDateGB(iso: string): string;
export function daysBetween(fromISO: string, toISO: string): number;
export function todayISO(): string; // call only inside handlers/store actions
export function evidenceStatus(stage: EvidenceStage): { label: string; tone: 'info'|'verified'|'warn'|'danger' };
export function nextEvidenceRef(existing: readonly { id: string }[]): string;
export function nextApplicationRef(existing: readonly { id: string }[]): string;
export function checklistProgress(app: Application): { done: number; total: number };
export function canApprove(app: Application): boolean;
export function approveBlocker(app: Application): string | null; // human reason, null when approvable
export function nextOnboardingStage(stage: OnboardingStage): OnboardingStage;
export function slaState(app: Application): { state: 'ok'|'due'|'over'; label: string };
export function onboardingOpenCount(apps: readonly Application[]): number;
export function approvedCount(apps: readonly Application[]): number;
export function evidenceOpenCount(ev: readonly EvidenceSubmission[]): number;
export interface VaultRow { id: string; name: string; issuer: string; reference: string; expiresOn: string; daysLeft: number | null; state: 'ok'|'due'|'lapsed'|'pending'|'info'|'rejected'; statusLabel: string; statusTone: 'verified'|'warn'|'danger'|'info'; note?: string; vaultId?: string; submissionId?: string; pendingRenewal?: boolean }
export function vaultRows(vault: readonly VaultCert[], evidence: readonly EvidenceSubmission[], supplierId: string): VaultRow[];
export function certsWithApproved(supplierId: string, certs: readonly Cert[], evidence: readonly EvidenceSubmission[]): Cert[];
export function recommendedStatus(rows: readonly VaultRow[]): { onFile: number; total: number; missing: string[]; pending: string[] };

// src/store/svsDesk.ts
export const useSvsDesk: UseBoundStore<…{
  evidence: EvidenceSubmission[]; applications: Application[];
  submitEvidence(input: { supplierId: string; supplierName: string; kind: 'new'|'renewal'; vaultId?: string; form: CertForm }): string;
  decideEvidence(id: string, decision: 'approved'|'info-requested'|'rejected', note?: string): void;
  setCheck(appId: string, check: CheckId, state: CheckState): void;
  advanceApplication(appId: string): void;
  requestInfo(appId: string, note: string): void;
  clearInfoRequest(appId: string): void;
  approveApplication(appId: string): void;
  declineApplication(appId: string, reason: string): void;
  inviteSupplier(input: { company: string; category: string; port: string }): string;
  reset(): void;
}>;
// src/store/supplierDesk.ts
export interface SentQuote { amountGbp: number; leadTime: string; validity: string; note: string; sentAt: string }
export const useSupplierDesk: … { quotes: Record<string, SentQuote>; sendQuote(requestId: string, q: Omit<SentQuote,'sentAt'>): void; reset(): void };

// src/data/analytics.ts
export type Period = 30 | 90;
export const DAY_LABELS_90: readonly string[];    // 'Fri 26 Jun' … 'Wed 23 Sep'
export const VIEWS_90: readonly number[]; export const REQUESTS_90: readonly number[]; export const CATEGORY_VIEWS_90: readonly number[];
export interface PeriodSummary { views: number; viewsPrev: number; requests: number; requestsPrev: number; winRate: number; winRatePrev: number; won: number; quoted: number; responseHrs: number; responseHrsPrev: number; categoryWinRate: number; categoryResponseHrs: number; funnel: { label: string; value: number }[]; sources: { label: string; value: number; promoted?: boolean; other?: boolean }[]; searches: { term: string; count: number }[]; heatmap: number[][] }
export const PERIOD_SUMMARY: Record<Period, PeriodSummary>;
export const RATINGS_DISTRIBUTION: readonly { stars: 5|4|3|2|1; count: number }[];
export const WEEKDAYS: readonly string[]; export const HOUR_BLOCKS: readonly string[]; // '00–02' …
export function seriesFor(period: Period): { labels: string[]; views: number[]; requests: number[]; category: number[] }; // 90 → weekly bins for requests
```

- [ ] **Step 1:** Write failing unit tests `tests/svsDesk.test.ts` (validateCertForm each rule incl. already-expired, file type/size, Other description; fileSizeLabel "248 KB"/"1.2 MB"; formatDateGB; nextEvidenceRef/nextApplicationRef; checklistProgress with n/a; canApprove/approveBlocker; slaState thresholds; vaultRows for a pending renewal, an approved renewal (new dates) and a new submission; certsWithApproved never changes existing states and `deriveStatus` is unchanged for every supplier; SEED_APPLICATIONS has exactly 4 open; no person-like names — trail `by` values are only the Actor union), `tests/clientDesk.test.ts` (heldLines always includes procurement; spendSeries order and colours-by-entity independence; monthlySaving at Full Stack sums to £17,500 and to half `annualSaving(500000, full)`; visibleActivity hides logistics/customs rows when not held), `tests/analyticsData.test.ts` (lengths 90; last-30 sums 412/38; previous-30 349/34; 90-day 1,079/101; single peak in the last-30 requests; heatmaps sum to 38 and 101 with a single max at Tue 08–10; sources sum to views; ratings sum 72 and mean rounds to 4.4; funnel monotone; SPARKLINE_30D equals the last-30 requests).
- [ ] **Step 2:** `npx vitest run tests/svsDesk.test.ts tests/clientDesk.test.ts tests/analyticsData.test.ts` → FAIL (modules missing).
- [ ] **Step 3:** Generate the analytics series with a throwaway deterministic script in the scratchpad (seeded PRNG, weekday weighting, gentle upward trend, exact totals by construction), paste the literal arrays into `src/data/analytics.ts`; write the other data files and libs; web-check the four applicant company names (§4.1).
- [ ] **Step 4:** Stores following `src/store/certification.ts` (shape guards on read, write-through, `reset()` removes keys). Register both in `src/lib/resetDemo.ts`; extend `tests/resetDemo.test.ts` "re-seeds every slice store". Update the AppLayout reset confirmation copy; add the SVS nav badge (`'svs'` in the badge union / `useNavCounts`, count = `evidenceOpenCount`, info tone).
- [ ] **Step 5:** Tokens: `--viz-*` in `tokens.css` `:root` + `@theme inline` (spec §6), plus keyframes `viz-grow` (scaleY from 0 at the baseline) and `viz-draw` (dashoffset) — covered by the existing reduced-motion block. Icons: vendor Lucide paths for `upload`, `file-plus`, `user-plus`, `eye`, `trending-up`, `bar-chart-3`, `calendar`, `clock`, `star`, `inbox`, `list-checks`, `zap`, `external-link` into `Icon.tsx` (keep the ISC notice). Optional `size?: 'md' | 'lg'` on `Modal` (lg = 720px).
- [ ] **Step 6:** Split `Dashboard.tsx`: move `ClientView` (+ its helpers) verbatim to `src/screens/app/dashboard/ClientView.tsx` and `SupplierView` (+ helpers) to `SupplierView.tsx`; constants from `src/data/desk.ts`; `Dashboard.tsx` keeps the header + `ViewSwitch`. Replace `SPARKLINE_30D` values with the last-30 requests. No behaviour change.
- [ ] **Step 7:** `npx vitest run` (all green), `npx tsc --noEmit -p .`, eslint + prettier on owned files; `npx playwright test e2e/service-lines.spec.ts e2e/terms.spec.ts e2e/reset-demo.spec.ts` against :5173 if the orchestrator has it running (otherwise report "not run").

### Task T2: Site chart kit

**Interfaces — Produces** (`src/components/charts/index.ts` re-exports all):
```ts
export const VIZ: { sea; sky; rose; seafoam; cornflower; other; context; deduction; derived; grid; axis; tick; ref; track; hover; seq: string[]; ord: string[] };
export const LINE_COLOURS: Record<'agency'|'logistics'|'customs'|'procurement', string>;
export interface TableSpec { caption: string; columns: string[]; rows: string[][] }
export interface LegendItem { label: string; color: string; shape?: 'rect' | 'line' }
export function ChartFigure(p: { title: string; subtitle?: string; takeaway: string; legend?: LegendItem[]; headline?: ReactNode; action?: ReactNode; table: TableSpec; footnote?: ReactNode; testId?: string; children: ReactNode }): JSX.Element;
export function TimeSeriesPanels(p: { labels: string[]; panels: { id: string; label: string; kind: 'area'|'columns'; values: number[]; format: (n: number) => string; benchmark?: { label: string; values: number[] } }[]; ariaLabel: string }): JSX.Element;
export function StackedColumns(p: { categories: string[]; series: { id: string; label: string; color: string; values: number[] }[]; format: (n: number) => string; axisFormat?: (n: number) => string; lower?: { label: string; color: string; values: number[]; format: (n: number) => string }; directLabelLast?: boolean; ariaLabel: string }): JSX.Element;
export function HBarList(p: { rows: { id: string; label: string; value: number; valueLabel?: string; tag?: string; color?: string }[]; max?: number; format: (n: number) => string; ariaLabel: string }): JSX.Element;
export function FunnelBars(p: { steps: { label: string; value: number }[]; format: (n: number) => string; rateLabels: string[]; ariaLabel: string }): JSX.Element;
export function BenchmarkBar(p: { value: number; benchmark: number; max: number; format: (n: number) => string; lowerIsBetter?: boolean; valueLabel?: string; benchmarkLabel?: string; ariaLabel: string }): JSX.Element;
export function Heatmap(p: { rows: string[]; cols: string[]; values: number[][]; bins: number[]; cellLabel: (row: string, col: string, v: number) => string; ariaLabel: string }): JSX.Element;
export function ExpiryBar(p: { daysLeft: number | null; state: 'ok'|'due'|'lapsed'|'pending'|'info'|'rejected'; max?: number; label: string }): JSX.Element;
export function niceTicks(max: number, count?: number): number[];
```
`StatCard` gains `delta` tones `'success'|'info'|'warn'` and a sparkline that is taller (`h-9`) with an end dot; `barPct` stays supported but the new screens stop using it. `Sparkline` flat 10% wash (no gradient), 2px line, end dot with white ring.

- [ ] **Step 1:** Failing tests in `tests/charts.test.ts` for `niceTicks` (0→[0], 38→[0,10,20,30,40], 412 → 0/100/…/500), band/stack geometry helpers you export from `scale.ts` (gaps of 2px, radius only on the top segment), heatmap binning.
- [ ] **Step 2:** Implement the helpers; then the components per spec §6 (tooltips, keyboard, `aria-live`, `<details>` tables, legends, direct labels, one CSS entrance using `viz-grow`/`viz-draw`, reduced motion shows final state).
- [ ] **Step 3:** A "Charts" section in `KitchenSink.tsx` rendering every component with sample data; screenshot `/kitchen-sink` at 1280 and 375 (Playwright script against :5173 once the orchestrator starts it — if not running, `npx vite --port 5174 --strictPort` and stop it by PID afterwards) and fix what looks wrong.
- [ ] **Step 4:** vitest, tsc, eslint, prettier on owned files.

### Task T3: Deck chart kit

**Produces** in `presenter/src/app/features/viz.js` (top-level prefix `VZ_`; the whole deck is one script scope): `const VZ = { figure(p), timeSeries(p), stacked(p), hbars(p), funnel(p), benchmark(p), heatmap(p), expiry(p), sparkline(values, opts), legend(items) }` — same props as T2 (plain objects), each returning a React element (function components with hooks, created once at module scope). Include line `@@INCLUDE:app/features/viz.js@@` right after `component.js` in `presenter/src/index.html`.

- [ ] **Step 1:** Prove the mechanism: a tiny hook component rendered through a binding in `53-kitchen-sink.html` (hover toggles state without a full-app `setState`); build with `python presenter/build.py --no-site` and open `presenter/dev.html#/kitchen-sink` via `python -m http.server <port>` from `presenter/` (stop it by PID) in a Playwright script; confirm hooks work (fallback: class components).
- [ ] **Step 2:** Implement all components to spec §6 (inline styles only; hex values; no `<` characters inside string literals — write `\u003c`; no `</script` or `<!--` anywhere, comments included).
- [ ] **Step 3:** Gallery in `53-kitchen-sink.html`; screenshots at 1280/375; `node --check` passes via build.py.

### Task T4: Deck foundation — data mirror, shared state, core wiring, scaffolding

**Consumes:** T1's data (copy values exactly), T3's include line. **Produces:**
• `desk-data.js`: `const DK = { …every constant in T1's data files, same names in camel/upper case… }` and pure helpers `DK_validateCertForm`, `DK_fileSizeLabel`, `DK_formatDateGB`, `DK_daysBetween`, `DK_todayISO`, `DK_evidenceStatus`, `DK_nextEvidenceRef`, `DK_nextApplicationRef`, `DK_checklistProgress`, `DK_canApprove`, `DK_approveBlocker`, `DK_nextStage`, `DK_slaState`, `DK_openCount`, `DK_approvedCount`, `DK_evidenceOpenCount`, `DK_vaultRows`, `DK_certsWithApproved`, `DK_recommendedStatus`, `DK_heldLines`, `DK_spendSeries`, `DK_monthlySaving`, `DK_visibleActivity`, `DK_seriesFor` — behaviour identical to T1's lib.
• `desk-state.js`: a feature registration with `state()` → `{ dkEvidence, dkApplications, dkQuotes }` read defensively from `pres.desk.evidence|applications|quotes` (seed when absent) and prototype methods `_dkSubmitEvidence(input)`, `_dkDecideEvidence(id, decision, note)`, `_dkSetCheck(appId, check, state)`, `_dkAdvance(appId)`, `_dkRequestInfo(appId, note)`, `_dkClearInfo(appId)`, `_dkApprove(appId)`, `_dkDecline(appId, reason)`, `_dkInvite(input)`, `_dkSendQuote(requestId, q)`, `_dkCertsFor(supplier)` (overlay for core cert readers) — each writes through `_set` + `setState`, reading `this.state` (never a stale snapshot).
• Stub feature modules (`client-desk.js`, `supplier-desk.js`, `svs-screen.js`, `analytics.js`) each registering an empty `vals()` with a header comment naming its owner task and binding prefix; stub modal partials `75`–`78` (an empty `<sc-if value="{{ false }}">…</sc-if>`); include lines for all new modules (order: viz, desk-data, desk-state, client-desk, supplier-desk, svs-screen, analytics) and partials (75–78 after `74-launch-request.html`).
• `component.js` core edits: `_parseHash` accepts `svs/<section>` (register|onboarding|evidence) into `routeSection`; `goSupProfile` fixed to open `supplier/silver-city-welding`; Internal KPI tile "SVS-verified suppliers" reads `52 + DK_approvedCount` and `${DK_openCount} onboarding`; `svsRows` and the profile certificate readers use `this._dkCertsFor(s)`; `svsFilter` reset in `resetDemo`.
• `30-chrome.html`: SVS sidebar badge (info tone) bound to `svNavBadge`/`svNavBadgeShow` computed in `desk-state.js` (evidence awaiting review).
- [ ] Build (`python presenter/build.py --no-site`), open `dev.html` routes `#/dashboard`, `#/svs`, `#/svs/onboarding`, `#/analytics`, `#/internal` — no console errors, "03 §3.1 rule tests: PASS (10/10)" logged, Reset demo clears `pres.desk.*`.

### Task T5: Site client view — spec §2
**Consumes:** T1 data/lib (`PORT_CALLS`, `CLIENT_ACTIVITY`, `QUICK_ACTIONS`, `spendSeries`, `monthlySaving`, `visibleActivity`, `portCallStep`), T2 (`ChartFigure`, `StackedColumns`, `LINE_COLOURS`). Keep `ConsolidationCard`, `SideStat`, `FeedRow`, `LineRow` behaviour and every testid. Put new widgets in `src/screens/app/dashboard/client/*.tsx`.
- [ ] Write `e2e/client-dashboard.spec.ts` first: quick actions navigate; each vessel shows its milestone ("Berth confirmed" for MV Choice); toggling the Logistics pillar adds "Logistics" to the spend chart legend and a Logistics row to "Latest from GAC", and the saving figure changes; "Show the numbers" opens a table; `/commission/i` count 0 with every panel expanded. Run it (fails), build the widgets, run it + `e2e/service-lines.spec.ts e2e/terms.spec.ts e2e/tour.spec.ts` (pass). Screenshots 1280/375 reviewed.

### Task T6: Site supplier view — spec §3 and §4.4
**Consumes:** T1 (`SUPPLIER_INBOX`, `AWAITING_QUOTES`, `WON_THIS_MONTH`, `LEAD_TIMES`, `VALIDITY`, `SILVER_CITY_VAULT`, `RECOMMENDED_FOR_WELDING`, `EARNINGS_*`, `RECENT_REVIEWS`, `SUPPLIER_KPIS`, `CERT_TYPES`, `validateCertForm`, `EMPTY_CERT_FORM`, `EXAMPLE_CERT_FORM`, `vaultRows`, `recommendedStatus`, `certsWithApproved`, `useSvsDesk`, `useSupplierDesk`), T2 (`StatCard`, `ChartFigure`, `StackedColumns`, `ExpiryBar`, `FunnelBars`). New files under `src/screens/app/dashboard/supplier/` (`QuoteModal.tsx`, `CertificateModal.tsx`, `Certificates.tsx`, `Earnings.tsx`, …).
- [ ] Write `e2e/supplier-desk.spec.ts` first: send a quote (validation, then success → "Quoted £2,450"), New/Quoted counters move; add a certificate with `setInputFiles` (a Buffer PDF) → row "Awaiting SVS review"; an over-10 MB or .exe file is refused; "Fill with an example" works; Upload renewal locks the type; Escape closes the modals; a reload keeps the submission; Reset demo clears it. Run (fail) → build → run it + `e2e/service-lines.spec.ts e2e/terms.spec.ts` (pass). Add `certsWithApproved` to `SupplierProfile.tsx`'s certificate list only. Screenshots 1280/375.

### Task T7: Site SVS screen — spec §4.5
**Consumes:** T1 (`useSvsDesk`, `CHECKS`, `ONBOARDING_STAGES`, all svsDesk lib), T2 (`ExpiryBar` optional). New files under `src/screens/app/svs/` (`Register.tsx` = the current table moved verbatim, `Onboarding.tsx`, `ApplicantPanel.tsx`, `EvidenceQueue.tsx`, `DocumentPreview.tsx`, `InviteModal.tsx`, `SvsKpis.tsx`). `Internal.tsx`: the SVS KPI reads the store (`52 + approvedCount`, `${openCount} onboarding`).
- [ ] Write `e2e/svs-desk.spec.ts` first: tabs switch and survive a reload via `?section=`; "3 alerts:" visible on every tab; approve Cove Bay Scaffolding (Decision) → Decided list shows it, "In onboarding" drops to 3, Internal shows "3 onboarding" and "53"; "Approve and list" is disabled for Balnagask with the reason shown; request info requires a note; invite a supplier → appears under Applied; end-to-end: submit a certificate on the dashboard supplier view, approve it in the Evidence queue, back on the dashboard it reads "Verified by the SVS team" and the SVS register row for Silver City shows the new certificate; the bell count is unchanged throughout. Run (fail) → build → run it + `e2e/smokes.spec.ts e2e/tour.spec.ts` (pass). Screenshots 1280/375.

### Task T8: Site analytics — spec §5
**Consumes:** T1 (`PERIOD_SUMMARY`, `seriesFor`, `RATINGS_DISTRIBUTION`, `WEEKDAYS`, `HOUR_BLOCKS`), T2 (all charts, `StatCard`). Period state in `?period=30|90` (default 30). New files under `src/screens/app/analytics/`.
- [ ] Write `e2e/analytics.spec.ts` first: arrives with 412 / 38 / 34% / 2.1 hrs; switching to 90 days shows 1,079 and 101; each figure has a "Show the numbers" table; the ratings figure shows "72 ratings"; the page has no element coloured gold (`#C9A227`, `#FFC72C`, `#7A6210`, `#9A7B14` — computed styles of SVG fills/strokes and backgrounds); keyboard ←/→ on the time-series moves the tooltip. Run (fail) → build → pass. Entry points still work (For Suppliers "See the example analytics dashboard", the Premium profile, the supplier dashboard). Screenshots 1280/375.

### Tasks T9–T11: Deck ports (git worktrees)
Each ports its site counterpart(s) to the deck, reading the finished site files as the reference
for layout and copy (identical copy and figures), using T3's `VZ` charts and T4's `DK`/`_dk*`
state. Build in the worktree (`python presenter/build.py --no-site`), check `dev.html` at 1280/375
with Playwright (node_modules from the main tree via an absolute `require`), no console errors,
the rule-tests line PASS. Commit in the worktree branch.
• **T9 dashboard:** client view (§2) + supplier view (§3) in `41-dashboard.html` using the existing
  header bindings (`dashTitle`, the switch, `data-tour="consolidation"` card and its bindings),
  new `cd*`/`sd*` bindings; modals `75-cert-modal.html`, `76-quote-modal.html`.
• **T10 SVS:** §4.5 in `49-svs.html` + `77`/`78` modals; tabs via `#/svs/<section>` (guard on
  `st.route === 'svs'`); register keeps the core `svsRows`/`svsChips` bindings.
• **T11 analytics:** §5 in `50-analytics.html`; period switch state in the module (not persisted).

### Task T12: Integration (orchestrator)
Merge T9–T11 branches; remove dead dashboard bindings from `component.js` (`clientKpis` if unused,
`supReach`, `supInbox`, `supCerts`, …) only after grepping partials; `npm run build`, `npm run lint`
(or prettier `--end-of-line auto`), `npx vitest run`, `npm run e2e`; DECISIONS.md rows (one per
judgement call: spend chart follows the held lines; applicants/evidence outside `SUPPLIERS`;
approvals never change status; Premium-only benchmarking copy fix; analytics series unified;
chart palette); README test counts; screenshots of both surfaces at 1280/375.
