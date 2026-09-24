# Live dashboards — design (23 Sep 2026)

Owner request: the client and supplier dashboards should be more engaging and read like a real product;
the supplier side needs somewhere to add certificates; the SVS team needs somewhere to manage new
suppliers; supplier analytics needs a much better visual. Approved by the owner on 23 Sep 2026
("build it as designed", preview branch first). Branch: `change/live-dashboards`.

Everything below applies to **both surfaces**: the site (`src/`, React + Vite) and the deck
(`presenter/`, partials + dc-runtime). Same screens, same copy, same figures. Where the two
differ in mechanics, the spec says so.

---

## 0. Rules that bind every part of this (from CLAUDE.md, the handoff specs and the survey)

1. **Commission never reaches the client view.** No band, %, £ figure or the word "commission"
   (including `aria-label`s, sr-only text, hidden panels and tables) anywhere on `/app/dashboard`
   while the Client view is showing. e2e counts `getByText(/commission/i)` = 0 on the page.
   Commission lives in the supplier view and the analytics screen only.
2. **Fictional only.** Fictional companies (check any new company name against a web search;
   if a real UK firm has that exact name, pick another). **No person names anywhere**, including
   audit trails, reviews and reviewers — use roles: "SVS team", "Applicant", "GAC agent".
   No real certificate numbers, insurers, certification bodies, commodity codes, EORI numbers.
   References must look obviously illustrative (`CW-26-0418`, `EVD-2041`).
3. **Simulated steps say so.** Uploads never leave the browser (store metadata only: name, size);
   the upload panel says "Nothing leaves this browser — the upload is simulated." Approvals that
   would publish a listing say the listing step is simulated. One "Figures are illustrative"
   note per screen.
4. **ESG is planned only.** Never chart or score ESG. Any grade shown keeps "(planned)" and
   `ESG_PLANNED_NOTE`.
5. **Gold is reserved** (in-house identity, Full Stack, BETA, loader, and the Gold Band marque).
   Never a chart colour, highlight, "busiest day" dot or plan pill. The analytics "Available on
   Professional and Premium" pill moves from `tone="inhouse"` (gold) to `tone="info"`.
   Status colours (success/warn/danger) are for status only, always with icon/text.
6. **Ratings always carry their count** ("4.4 ★ · 72 ratings"); an applicant with none reads
   "No ratings yet".
7. **One lead number on the client dashboard.** The consolidation card's tier stays at 44px and is
   the only figure above 22px in the client view. Supplier view figures ≤ 26px.
8. **British English, no exclamation marks**, "GAC Agent" not "GA", "purchase order" not "PO" in
   prose. The brand string only through `BRAND_NAME` (`src/config/brand.ts`) on the site — the CI
   grep bans the literal product name anywhere else under `src/`.
9. **Benchmarking is Premium only** (Professional gets views, requests, win rate). Fix the two
   places that say otherwise: `Dashboard.tsx` "Where the work comes from" and presenter
   `41-dashboard.html:252`.
10. **Nothing new in `SUPPLIERS`.** Applicants, evidence and vault details live in new data files
    and stores. `complianceWatch(SUPPLIERS)` must keep returning exactly Peterhead Diving (blocked),
    Granite NDT (GWO 21 days), Mearns Heavy Transport (24 days) — "3 alerts:".
    Approving evidence never changes any supplier's `deriveStatus` (see §4.4 overlay rule).
11. **SVS-team items never enter `useNeedsYou`** (it feeds the client's "Waiting on you" and the bell).
12. **No chart library.** Hand-rolled SVG/HTML, following §6.
13. **Accessibility:** keyboard-complete; forms in a `Modal` (the tour's document-level arrow keys
    only yield to `aria-modal`); visible focus; 44px touch targets at 375px; reduced motion renders
    the final state with no delays; no information by colour alone; text contrast ≥ 4.5:1.
14. **Persistence:** site keys through `persistent` (auto-prefixed `gac-connect:`), namespaced
    `svsDesk.*` / `supplierDesk.*`, each store with a `reset()` that **removes** its keys and is
    called from `src/lib/resetDemo.ts`; no new key may survive Reset demo. Deck keys under
    `pres.desk.*` (swept by `_clearDemoKeys` on reset and on a fresh visit — nothing else to wire).
15. **Tests that must keep passing unchanged** (Playwright names are case-insensitive substring
    matches — avoid new accessible names that contain these):
    • `getByRole('heading', { name: 'Browne Energy' })` — only one heading containing "Browne Energy"
      in the client view. • `getByRole('heading', { name: 'Silver City Welding', level: 1 })`.
    • `getByRole('button', { name: 'Supplier view' })` — no other button containing "supplier view".
    • testids `dashboard-view-switch`, `dashboard-tier-pct`, `client-lines` (contains "Logistics"),
      `client-feed-invoices` (contains "Left alone, an invoice matches as it stands."),
      `supplier-inbox` (contains "Onboard pipework repair"), `supplier-plan` (contains
      "10% commission"), `supplier-keeps` (text exactly "£3,960").
    • default dashboard view is Client; the view survives a reload.
    • SVS: "3 alerts:" visible and unique on arrival; chip button `{ name: 'Blocked', exact: true }`
      unique; button `{ name: 'Peterhead Diving Services' }` unique and leads to its profile.
    • Supplier profile: exactly one "Request quote" button, one `service-terms`.
    • Tour: stop 11 `/app/svs` anchored `data-tour="svs"` (the alerts banner); stop 14
      `/app/dashboard` anchored `data-tour="consolidation"`. 11 nav links, unchanged order.
    • `tests/freshVisit.test.ts` pins `VISIT_KEPT_KEYS`; `tests/resetDemo.test.ts` requires every
      store key removed after reset.

---

## 1. Shared constants

`src/data/desk.ts` (new) — moved out of `Dashboard.tsx`:
`DEMO_CLIENT = 'Browne Energy'`, `DEMO_SUPPLIER_ID = 'silver-city-welding'`, `EXAMPLE_JOB_GBP = 4400`.

Demo clock: the demo "now" is **Thursday 08:00** (already used by the 48-hour strip,
`src/data/vessels.ts`). All relative labels ("Today 07:42", "Yesterday 16:20", "Mon 09:10") are
written from that morning. Analytics calendars end **Wed 23 Sep 2026** ("yesterday").

---

## 2. Client view — Browne Energy

Order on screen (desktop grid; single column at < 1024px):

**Row 1 — lead (unchanged behaviour):** `ConsolidationCard` (44px tier, pillar switches,
`data-tour="consolidation"`, `dashboard-tier-pct`) + the three side stats (port calls in the window,
quotes to compare, invoices in your window). Unchanged copy.

**Row 2 — Quick actions** (a single row of five ghost buttons with icons, wraps on mobile):
Request a quote → `/app/marketplace` · Book a movement → `/app/logistics` · Start a crew change →
`/app/agency/crew-change` · Raise a customs entry → `/app/customs` · Send a Compass list →
`/app/procurement`. Card title "Start something"; no subtitle.

**Row 3, left (1.6fr):**

*Port calls* — replaces "Your vessels". Title "Your port calls", subtitle "Where each call stands,
milestone by milestone". One row per vessel (VESSELS order), each:
• vessel name (bold) + operator line (ink-soft) + a "when" chip ("ETA Fri 08:00 · in 24 hrs");
• a five-step milestone rail `Pre-arrival → Pilot booked → Berth confirmed → Alongside → Sailed`
  (done ✓ / current ● / pending ○ — reuse the visual language of `StageTrack`, compact; on mobile
  show only "Step 3 of 5 · Berth confirmed" plus a thin progress bar);
• a row of service chips (links): see data. The existing status pill becomes one of the chips
  (tone kept: warn chip "2 certs expiring on booked supplier" links to `/app/svs`).
Data (`PORT_CALLS`):
| vessel | stage | when | countdown | berth | chips |
|---|---|---|---|---|---|
| MV Choice | Berth confirmed | ETA Fri 08:00 | in 24 hrs | Regent Quay, Aberdeen | Crane hire · 3 quotes → /app/quotes (info); Compass list ready → /app/procurement (info); Crew change → /app/agency/crew-change (info) |
| MV Boreal | Pilot booked | ETA Fri 14:30 | in 30 hrs | Smith Quay, Peterhead | 2 certs expiring on booked supplier → /app/svs (warn); Diving support booked → /app/marketplace (info) |
| MV Granite Coast | Alongside | ETD Sat 06:00 | sails in 46 hrs | Regent Quay, Aberdeen | Customs: T1 in progress → /app/customs (info); All documents complete (success, no link) |
Footer line kept: "Crew joining or leaving on any of these? Open crew change — hotels, taxis timed
off the flight, launches, and the letters." (+ " N in progress." from the crew store).

*GAC spend* — title "GAC spend, last six months", subtitle "By service line, with what your tier
discount saved underneath". Stacked columns Apr–Sep 2026 of the **lines currently held** (Procurement
always; Agency, Logistics and Customs only when their pillar is on — revised 23 Sep: Agency is a
switch in the tier card, and a chart that kept it would contradict the "Not consolidated" Agency
row on the same screen), ladder order bottom→top
Agency, Logistics, Customs, Procurement; below it an aligned lower panel "Saved by your tier
discount" (ink-soft columns) = month total × current tier % (rounded to £). Header figures (≤22px):
"£{6-month total}" and "£{6-month saving} saved at {pct}%". Toggling a pillar updates the chart,
the legend and the saving live; colours never repaint (colour follows the line).
Annotation when Full Stack: none (no celebration in charts). Footnote: "Illustrative figures. The
chart follows the lines held in the tier card above." Per-line monthly spend (GBP):
Agency `[23000, 24000, 21000, 26000, 25000, 27000]` · Logistics `[8000, 9000, 7000, 10000, 9000, 11000]`
· Customs `[4000, 4000, 3000, 5000, 4000, 5000]` · Procurement `[4000, 4000, 5000, 4000, 4000, 4000]`
(Full Stack six-month total £250,000 → £17,500 saved at 7% = half of `annualSaving(500000, full)`).

*Your work, line by line* — keep as is (`client-lines`, `LineRow`), moved below the spend chart.

**Row 3, right (1fr):**

*Waiting on you* — unchanged (`useNeedsYou`, `client-feed-*`).

*Latest from GAC* — activity feed, newest first, each row: icon tile, text (link), time label
(ink-soft, tabular). Rows whose `line` is Logistics or Customs show only while that pillar is held.
Title "Latest from GAC", subtitle "What has moved since yesterday". `CLIENT_ACTIVITY`:
1. Today 07:42 · agency · anchor · "Pilot booked for MV Choice — Regent Quay, 08:00 tomorrow" → /app/agency
2. Today 07:15 · quotes · message-square-quote · "Third crane-hire quote in for MV Choice — ready to compare" → /app/quotes
3. Yesterday 16:20 · logistics · truck · "Consignment collected in Glasgow, due at the GAC warehouse on Friday" → /app/logistics
4. Yesterday 14:05 · invoices · receipt · "Invoice INV-4471 received — in your seven-day review window" → /app/invoices
5. Yesterday 11:30 · customs · stamp · "T1 transit declaration submitted to HMRC for MV Granite Coast" → /app/customs
6. Mon 09:10 · procurement · clipboard-list · "Stores list for MV Choice drafted — ready to send to Compass" → /app/procurement
7. Mon 08:30 · agency · anchor · "Berth confirmed at Smith Quay, Peterhead for MV Boreal" → /app/agency
8. Sun 17:45 · svs · shield-check · "SVS alert: a supplier booked for MV Boreal has two certificates due for renewal" → /app/svs

*The platform costs you nothing* — becomes a one-line footnote under the right column:
"The platform costs you nothing: no booking fee, no subscription, nothing per quote. Every supplier
you can see has passed the Supplier Vetting System." (link on "Supplier Vetting System").

---

## 3. Supplier view — Silver City Welding

Header (existing h1 "Silver City Welding", eyebrow "Supplier dashboard") gains a status row of
pills: `StatusPill` (GAC Verified) · "Premium plan" (neutral) · "▲ Promoted" (promoted) ·
"Gold Band audit booked" (neutral — never gold until held).

**Row 1 — KPI tiles** (4, 22–26px figures, each with a delta chip against the previous 30 days and
a 30-point sparkline in sea; no `barPct` meters):
| id | label | value | delta chip | series |
|---|---|---|---|---|
| views | Profile views (30 days) | 412 | +18% on the previous 30 days | daily views, last 30 |
| requests | Quote requests (30 days) | 38 | +12% on the previous 30 days | daily requests, last 30 |
| win | Win rate | 34% | +4 pts · 12 won of 35 quoted | weekly win rate (optional; else none) |
| response | Avg. response time | 2.1 hrs | 0.5 hrs faster | none |

**Row 2, left (1.6fr):**

*Quote requests* — `data-testid="supplier-inbox"`. Title "Quote requests", subtitle "Answer inside
the window and the client compares you side by side". Above the list a pipeline strip of three
counters: **New** (inbox rows not yet quoted) · **Quoted** (awaiting the client: 3 seeded + any sent
here) · **Won this month** (4). Each inbox row: service, vessel · detail, reply-by pill; button
"Send a quote" opens the **quote modal**; once sent the row shows a pill "Quoted £2,450 · awaiting
client" and the button becomes "Quote sent" (disabled) — the New/Quoted counters move.
Seeded awaiting quotes (listed under the inbox as "Awaiting the client", compact):
REQ-4462 Handrail repair — MV Boreal · £1,850 · sent Tue · REQ-4455 Coded welder call-out — Regent
Quay laydown · £2,400 · sent Mon · REQ-4449 Pipe spool fabrication — Stronach Subsea · £6,300 · sent
last week. Inbox requests keep the existing two (req-4471 Onboard pipework repair — MV Granite
Coast, warn "Reply by 16:00 today"; req-4478 Fabrication — skid frames — Wilkinson Drilling
mobilisation, info "Reply by Friday 12:00").
Footnote kept: "Replies sent as ordinary Outlook emails are parsed into the same comparison — you do
not have to work inside the platform to win work through it."

**Quote modal** (Modal, labelled by its h2 "Quote: {service}"): Price (£, required, whole pounds,
> 0) · Lead time (select: Same day / Next day / 2–3 days / Within a week) · Valid for (select:
7 days / 14 days / 30 days) · Note to the client (optional, textarea, 280 chars). Buttons "Send
quote" (primary) and "Cancel". Validation line "Still needed: price". On send: store it, close,
toast "Quote sent for {service} — {vessel}. It lands in the client's comparison view beside every
other reply (simulated)."

*Earnings through the platform* (supplier-only) — title "Earnings through the platform",
subtitle "Work won through GAC Connect, and what you keep after your band" (site: build the string
with `BRAND_NAME`). Stacked columns Apr–Sep: bottom "You keep" (sea) = `supplierKeeps(won,
'premium')`, top "10% Premium band" (`#9AA9BA`). Won per month (GBP): `[7200, 9850, 6400, 11300,
8750, 12600]` → won £56,100, kept £50,490. Header figures: "£50,490 kept" · "of £56,100 won".
Direct label on September only. Table view lists Month · Won · Band · You keep.

*How your listing reads* — kept, compact (`View profile` goes to the supplier profile — the deck's
current link to `#/supplier` is broken; fix it).

**Row 2, right (1fr):**

*Certificates* (replaces "Compliance vault") — title "Certificates", subtitle "The gate: a lapse
blocks booking everywhere, immediately", action `StatusPill`. Primary button **"Add a
certificate"** (opens the certificate modal, mode `new`). Then one row per vault certificate
(§4.1 `SILVER_CITY_VAULT` merged with this supplier's submissions, §4.4): name; issuer · reference;
"Expires 13 Mar 2027"; a days-left bar (0–180 days scale, clamps with a chevron beyond 180, tick
rules at 90/30/7, colour from state: ok success ✓ · due warn ⚠ · lapsed danger ✗ · awaiting review
neutral `#8595A8`); a status pill; and a text button "Upload renewal" (opens the modal, mode
`renewal`, type locked to that certificate). A certificate sent again after one was approved keeps the approved row and shows the newer submission as its own "Update awaiting SVS review" / "Update rejected" row; an approved renewal keeps its new dates while a later renewal is pending (added 23 Sep). Submissions of new documents appear as extra rows with
"Awaiting SVS review" (info) / "Verified by the SVS team" (verified) / "More information needed"
(warn, with the team's note and a "Re-upload" button) / "Rejected" (danger, with reason).
Below the rows: "Recommended for Welding: 3 of 4 on file — add ISO 9001 quality management to
complete your listing." (disappears once an ISO 9001 submission is approved; while pending it reads
"… ISO 9001 awaiting SVS review").
Footnote: "Alerts fire at 90, 30 and 7 days before expiry. No plan, promotion or rating overrides
the gate — the rule is set out in the Supplier Vetting System."

**Certificate modal** (Modal, h2 "Add a certificate" / "Upload a renewal: {name}"):
• Certificate type (select, `CERT_TYPES`; "Other" reveals a text field "Describe the certificate")
• Issuing body (text) • Reference or certificate number (text) • Issue date (date) • Expiry date (date)
• File: a drop zone "Drag a PDF, JPG or PNG here, or browse" with a real `<input type="file"
  accept=".pdf,.jpg,.jpeg,.png">` behind a visible "Browse files" button (keyboard reachable);
  shows "{name} · {size}" once chosen, with "Remove". Max 10 MB.
• Checkbox "I confirm this is a true copy of the current certificate."
• Notice (ink-soft, small): "Nothing leaves this browser — the upload is simulated. The SVS team
  typically reviews evidence within two working days (illustrative)."
• Buttons: "Send to the SVS team" (primary), "Fill with an example" (ghost — fills ISO 9001 quality
  management, issuer "Northgate Quality Assurance", ref "QA-9001-2618", issued 2 Sep 2026, expires
  1 Sep 2029, file "ISO9001-certificate.pdf" 248 KB, ticked), "Cancel".
• Validation (lib `validateCertForm`), shown as one `role="alert"` line "Still needed: …":
  type; description (if Other); issuing body; reference; issue date; expiry date; "expiry after
  issue"; "the issue date cannot be in the future" (added 23 Sep); "expiry in the future — this certificate has already expired"; file; "file must be a PDF,
  JPG or PNG"; "file must be under 10 MB"; the confirmation tick.
• On send: `submitEvidence(…)` → toast "Sent to the SVS team: {cert}. It shows as awaiting review
  until they decide." (tag `SVS` on the deck).

*Your plan* — keep `data-testid="supplier-plan"` with the "10% commission" pill and
`data-testid="supplier-keeps"` "£3,960" (the £4,400 worked example). Copy unchanged, compacted.

*Recent ratings* — title "Recent ratings", action `Rating` "4.4 ★ · 72 ratings". Three rows
(stars as text "5 ★", who, job, one line):
1. 5 ★ · Browne Energy · Onboard pipework repair, MV Boreal · "Coded welder on board inside two hours; job signed off first time." · 2 weeks ago
2. 4 ★ · GAC agent on close-out · Fabrication call-out, Regent Quay laydown · "Good work; paperwork arrived a day after the job." · 3 weeks ago
3. 5 ★ · Wilkinson Drilling · Skid frame modifications · "Frames to drawing and delivered to the GAC warehouse on the day promised." · 5 weeks ago

*Analytics teaser* — title "Where the work comes from", subtitle "Views, quote requests, win rate
and response time". A mini funnel (views 412 → requests 38 → won 12, three bars) + button "Open
analytics". Copy fix: "Views, quote requests and win rate come with Professional; Premium adds
market benchmarking."

---

## 4. SVS desk — data, rules and the SVS screen

### 4.1 Data (`src/data/svsDesk.ts`, `src/data/supplierDesk.ts`)

`CERT_TYPES` (order): Coded welder qualification (BS EN ISO 9606-1) · ISO 9001 quality management ·
ISO 3834 welding quality requirements · ISO 45001 occupational health and safety · ISO 14001
environmental management · Employers' liability insurance · Public liability insurance · GWO Basic
Safety Training · BOSIET offshore survival · LOLER thorough examination report · Offshore medical ·
Other.

`SILVER_CITY_VAULT` (fictional issuers; `svsName` = the matching name in `SUPPLIERS` on the site —
the deck's data.js uses 'Coding certs', 'Insurance', 'GWO'):
| id | name | svsName | issuer | reference | issued | expires | daysLeft |
|---|---|---|---|---|---|---|---|
| vc-coded | Coded welder qualifications (BS EN ISO 9606-1) | Coding certificates | Northgate Weld Certification | CW-26-0418 | 14 Mar 2026 | 13 Mar 2027 | 171 |
| vc-insurance | Employers' and public liability insurance | Insurance | Northsound Mutual Insurance | NSM-EL-7731 | 1 Feb 2026 | 31 Jan 2027 | 130 |
| vc-gwo | GWO Basic Safety Training | GWO | Quayside Safety Training | GWO-BST-2291 | 9 Jan 2025 | 8 Jan 2027 | 107 |
All three state `ok` (> 90 days) so the demo supplier stays Verified. If the site's `SUPPLIERS`
entry lacks 'GWO', leave `SUPPLIERS` alone and show the vault's three rows anyway (the vault is the
richer record). `RECOMMENDED_FOR_WELDING` = the three above + "ISO 9001 quality management".

`SEED_EVIDENCE` (two, from other **verified** suppliers so approving them changes no status):
| id | supplier | kind | type | issuer | ref | issued | expires | file | submitted |
|---|---|---|---|---|---|---|---|---|---|
| EVD-2038 | Caledonia Lifting | renewal | LOLER thorough examination report (label: "LOLER thorough examination — 60t crawler crane") | Northgate Lifting Inspection | LOL-26-5512 | 16 Sep 2026 | 15 Sep 2027 | LOLER-60t-crawler.pdf · 1.2 MB | Today 07:35 (moved before the demo's 08:00 "now", 24 Sep) |
| EVD-2036 | Aberdeen Offshore Medical | new | ISO 45001 occupational health and safety | Northgate Quality Assurance | OHS-45-0877 | 1 Sep 2026 | 31 Aug 2029 | ISO45001-certificate.pdf · 312 KB | Yesterday 15:40 |
(Use the exact `SUPPLIERS` ids `caledonia-lifting` / `aberdeen-offshore-medical`.)

`CHECKS` (8, in order): company "Company registration and VAT number" · insurance "Employers' and
public liability insurance" · hse "Health and safety policy, signed within 12 months" · sanctions
"Sanctions and adverse media screen" · bank "Bank details confirmed (Confirmation of Payee)" ·
references "Two trade references" · category (label per applicant) · policies "Anti-bribery and
modern slavery statements".

`SEED_APPLICATIONS` (exactly four open, matching Internal's "4 onboarding"; company names must be
web-checked as not real UK firms — replace any that are, keeping the pattern):
| id | company | category | port | applied | days in review | stage | risk | category check label | checks passed | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| APP-3107 | Torry Point Rope Access | Rope access | Aberdeen | Yesterday | 1 | Applied | Medium | Rope access technician certificates | company | trail: "Application received through the For Suppliers page" (Applicant) |
| APP-3104 | Girdle Ness Marine Electrical | Marine electrical | Aberdeen | Mon | 3 | Documents | Low | Marine electrical competence certificates | company, insurance | infoRequest: "The health and safety policy supplied is dated 2023 — please upload the current signed policy." (Awaiting applicant) |
| APP-3101 | Balnagask Hydraulics | Hydraulics | Peterhead | Last Fri | 4 | Checks | Low | Hydraulic hose assembly competence | company, insurance, hse, bank, category, policies (sanctions, references pending) | SLA day 4 of 5 |
| APP-3098 | Cove Bay Scaffolding | Scaffolding | Montrose | Last Wed | 6 | Decision | Low | Scaffolder competence cards | all eight passed | SLA overdue (6 of 5) — ready to approve |
Each has a 2–4 entry audit trail (role labels only, times like "Mon 10:12").

`SVS_TEAM_KPIS`: Median time to verify "3.5 days" (illustrative).

### 4.2 Rules (`src/lib/svsDesk.ts`, pure, unit-tested; mirrored in the deck)

• Onboarding stages `['Applied', 'Documents', 'Checks', 'Decision']`; `outcome: 'open' | 'approved' | 'declined'`.
• `checklistProgress(app)` → `{ done, total }`: `done` counts passed + n/a; `total` = 8.
• `canApprove(app)` ⇔ outcome open ∧ stage Decision ∧ every check passed or n/a ∧ no open info request.
• `nextOnboardingStage(stage)`; advancing from Decision is not allowed (approve/decline instead).
• `slaState(app)` → `'ok'` (days < 4) · `'due'` (4–5) · `'over'` (> 5); label "Day 4 of 5" / "Overdue · day 6 of 5".
• Evidence stages `'submitted' | 'approved' | 'info-requested' | 'rejected'`; labels/tones:
  submitted "Awaiting SVS review" info · approved "Verified by the SVS team" verified ·
  info-requested "More information needed" warn · rejected "Rejected" danger.
  Request info and Reject require a non-empty note.
• Refs: `nextEvidenceRef` (EVD-2039, 2040 … above the highest existing), `nextApplicationRef` (APP-3108 …).
• `validateCertForm(form, todayISO)` as §3; `fileSizeLabel(bytes)` ("248 KB", "1.2 MB");
  `formatDateGB(iso)` ("13 Mar 2027"); `daysBetween(fromISO, toISO)`.
• `onboardingOpenCount(apps)`, `approvedCount(apps)` — Internal's KPI becomes
  value `52 + approvedCount` and delta `${openCount} onboarding` (seed: "52", "4 onboarding").

### 4.3 Stores

Site `src/store/svsDesk.ts` → `useSvsDesk` with `evidence`, `applications` (keys `svsDesk.evidence`,
`svsDesk.applications`) and actions `submitEvidence`, `decideEvidence(id, decision, note?)`,
`setCheck(appId, checkId, state)`, `advanceApplication(appId)`, `requestInfo(appId, note)`,
`clearInfoRequest(appId)` (simulates the applicant replying), `approveApplication(appId)`,
`declineApplication(appId, reason)`, `inviteSupplier({ company, category, port })`, `reset()`.
Every action appends an audit-trail entry (role labels). Revised 23 Sep: desk stamps (trail
entries, `submittedAt`, `sentAt`) read **"Today HH:MM"** from the device's time of day, not a
calendar date — the seeds are written from the demo's Thursday morning, so an absolute date beside
"Today 07:35" reads as a different day and breaks "newest first". Every seed stamped "Today" sits before the demo's 08:00, so a new entry sorts correctly unless the demo runs before 07:35 local time (accepted).
Site `src/store/supplierDesk.ts` → `useSupplierDesk` with `quotes` (key `supplierDesk.quotes`),
`sendQuote(requestId, { amountGbp, leadTime, validity, note })`, `reset()`.
Deck: one feature module owns the same state under `pres.desk.evidence`, `pres.desk.applications`,
`pres.desk.quotes`.

### 4.4 Overlay rule (how an approval shows up)

`vaultRows(vault, evidence, supplierId)` builds the supplier's certificate rows: vault rows,
each carrying its latest renewal submission (pending renewal → the row shows "Renewal awaiting SVS
review" beside its current dates; approved renewal → the row takes the new dates, days-left from
the submission); plus one row per `new` submission. `certsWithApproved(supplierId, certs, evidence)`
appends `{ name, state: 'ok' }` for each **approved new** certificate — used on the SVS register row,
the supplier profile's certificate list and the supplier dashboard. It never changes an existing
certificate's state, so `deriveStatus`, the bell, the marketplace and "3 alerts" never move.

### 4.5 The SVS screen (`/app/svs`; deck `#/svs`)

Header unchanged ("Supplier Vetting System · proprietary" / "Compliance at a glance" / lede) plus,
right-aligned, a primary button **"Invite a supplier"** (opens the invite modal).
The alerts banner (`data-tour="svs"`, "3 alerts: …") stays directly under the header on every tab.
Then a row of four small KPI tiles (≤ 22px): "In onboarding 4" · "Evidence to review 2" ·
"Compliance alerts 3" · "Median time to verify 3.5 days" (live counts from the store/watch).
Then a tab strip (`role="group"`, `aria-pressed` chips, like the existing filters; state in
`?section=register|onboarding|evidence` on the site, `#/svs/onboarding` etc. on the deck; default
`register`): **Register** · **Onboarding (4)** · **Evidence queue (2)**.

*Register* — today's filter chips + table, unchanged, except each row's certificates use
`certsWithApproved`. The two explanatory cards stay under the register.

*Onboarding* — a board of four columns (Applied · Documents · Checks · Decision) with a count on
each header; horizontally scrollable on mobile (snap), no nested vertical scroll. Card: monogram
tile, company (button — opens the applicant panel), category · port, "Applied {label}", checklist
progress bar "5 of 8 checks", SLA pill ("Day 4 of 5" warn / "Overdue · day 6 of 5" danger / plain
"Day 1 of 5" neutral), risk pill (Low neutral / Medium warn / High danger — text always), and an
"Awaiting applicant" pill when an info request is open. Under the board, "Decided" — a compact list
of approved/declined applicants with outcome pill and a note: approved read "Approved — listing goes
live at the next marketplace publish (simulated)".
**Applicant panel** (a wide Modal or a Drawer with a proper close label — not "Close preview"):
header company + category · port + risk + SLA; checklist of eight rows, each with the label, a state
pill (Pending / Passed / Failed / N/A) and controls "Pass" / "Fail" / "N/A" (segmented buttons,
`aria-pressed`); the open info request (if any) with "Mark as answered"; the audit trail (newest
first); actions: "Move to {next stage}" (hidden at Decision), "Request more information" (note
required), "Decline" (reason required), "Approve and list" (primary, enabled only when
`canApprove`, with the reason it is disabled shown in text). Approving: outcome approved, toast
"Approved: {company}. The listing goes live at the next marketplace publish (simulated)."

*Evidence queue* — two panes on desktop (list 1fr · detail 1.4fr), stacked on mobile. List rows:
supplier, certificate, "Submitted {when}", kind (New / Renewal), status pill; open items first,
newest first. Detail: a **document preview** (an SVG/HTML mock certificate on a light grid: a
"SPECIMEN — illustrative" watermark, the certificate title, issuer, reference, "Issued … · Expires
…", a seal glyph drawn in sea — never gold) with the file line "{fileName} · {size}"; the fields as
a definition list; the trail; actions "Approve", "Request information" (note), "Reject" (reason).
The Silver City submission made on the dashboard appears at the top as "Awaiting SVS review".
Toasts: "Verified: {cert} for {supplier}." / "Sent back to {supplier} with your note." /
"Rejected: {cert} for {supplier}."
Keep the list buttons' accessible names free of "Peterhead Diving Services" and "Blocked" (they are
only rendered on their tab, but keep them distinct anyway).

**Invite modal**: Company name (required) · Category (select from the applicants' categories plus
the marketplace categories) · Base port (Aberdeen / Peterhead / Montrose) · "Send invitation" →
new applicant at Applied, outcome open, trail "Invitation sent by the SVS team (simulated)",
toast "Invitation sent to {company} (simulated). They appear under Applied."

Nav: the SVS sidebar item gains an info-tone count badge = evidence awaiting review (site
`AppLayout` `useNavCounts`; deck `30-chrome.html`). Nav link count stays 11. The top-bar Reset demo
confirmation copy mentions certificates, onboarding decisions and supplier quotes.

---

## 5. Supplier analytics (`/app/analytics`; deck `#/analytics`)

Header: eyebrow "Supplier analytics · example"; h1 "Silver City Welding — performance" on both
surfaces; pills "Premium plan" (neutral) and "Available on Professional and Premium" (info — not
gold); lede "An example of the dashboard a subscribed supplier sees. Views, quote requests, win rate
and response time are fed from platform activity — illustrative here." Right-aligned: a period
switch "30 days | 90 days" (segmented, `aria-pressed`), which drives every figure on the page.

Layout top→bottom (every chart a `<figure>` with a "Show the numbers" table):
1. **KPI tiles** (4): views, quote requests, win rate, avg. response — value, delta vs the previous
   period (words), sparkline (30: daily; 90: weekly sums, 13 points).
2. **Views and quote requests** — two small-multiple panels on one shared x-axis with one synced
   crosshair tooltip: top "Profile views per day" (sea area + line; Premium: 2px `#8595A8` line
   "Category average" with end label), bottom "Quote requests" (sea columns — daily at 30 days,
   weekly at 90 days). Direct label on the last value and the single peak. Never a dual axis.
3. **From search to signed job** (funnel) — five horizontal bars on a linear scale with the ordinal
   ramp, value at each tip, and the step rate between rows ("13.9% opened your profile", "9.2%
   asked for a quote", "92% quoted", "34% won").
4. **Against your category** (Premium · market benchmarking) — two benchmark visuals side by side:
   win rate bullet (fill to 34%, ink tick at the category average 27%) and response-time dot strip
   (0–8 hrs, "Faster" at the left, sea dot at 2.1, ink tick at 5.4). Caption "Category average
   across verified Welding suppliers on the platform, anonymised." One-line takeaway under each
   ("7 points above the category average", "3.3 hrs faster than the category average").
5. **Where clients found you** — ranked horizontal bars (sea; "Direct link and other" last in
   `#8595A8`), value and share at each tip; the Promoted row carries a "▲ Promoted" text tag (bar
   stays sea).
6. **When requests arrive** — heatmap 7 rows (Mon–Sun) × 12 two-hour columns (00–02 … 22–24),
   sequential sea ramp quantised to 5 bins with a labelled scale ("Fewer … More"), peak cell
   labelled, per-cell tooltip "Tuesday 08:00–10:00 · 5 requests".
7. **Ratings** — "4.4 ★ · 72 ratings" + 5★→1★ horizontal bars (sea) with the count at each tip.
   Distribution 5★ 42 · 4★ 21 · 3★ 6 · 2★ 2 · 1★ 1 (sum 72, mean 4.40). Not period-dependent
   (label "All time").
8. **Searches that found you** — top five terms with counts (hbars or a ranked list).
Footer: "Figures are illustrative. Analytics are included with Professional and Premium; Premium
adds market benchmarking. See plans →" (links to /for-suppliers, deck `goSuppliers`).

### 5.1 Analytics data (`src/data/analytics.ts`, mirrored exactly in the deck)

Calendar: 90 daily labels ending Wed 23 Sep 2026 ("Fri 26 Jun" … "Wed 23 Sep"). Series are fixed
literals generated once by a deterministic script (weekday-heavy, a gentle upward trend) and pasted
into both surfaces, with these hard totals:
| | last 30 days | previous 30 (days 31–60) | days 61–90 | 90-day total | "previous 90" (constant) |
|---|---|---|---|---|---|
| profile views | **412** | 349 | 318 | 1,079 | 951 |
| quote requests | **38** | 34 | 29 | 101 | 88 |
Category-average views per day (benchmark line): a smoother series averaging 9.1/day.
`SPARKLINE_30D` (it summed to 52) is retired; the supplier view's requests sparkline is `SUPPLIER_KPIS` requests, the last-30 requests series (sum 38, single peak).
`PERIOD_SUMMARY[30]`: win 34% (prev 30%), won 12 of 35 quoted, response 2.1 hrs (prev 2.6),
category win 27%, category response 5.4 hrs; funnel appearances 2,960 → views 412 → requests 38
→ quotes sent 35 → won 12; sources Marketplace search 168 · Welding category page 104 · Promoted
placement 71 · Service-line hub 38 · Direct link and other 31 (sum 412); searches "coded welder
aberdeen" 64 · "onboard welding repair" 41 · "pipework repair" 33 · "skid frame fabrication" 18 ·
"24/7 welding call-out" 15; heatmap 7×12 summing to 38 with a single peak at Tue 08:00–10:00.
`PERIOD_SUMMARY[90]`: win 32% (prev 29%), won 30 of 93 quoted, response 2.4 hrs (prev 2.9),
category win 26%, category response 5.6 hrs; funnel 8,140 → 1,079 → 101 → 93 → 30; sources 441 ·
272 · 186 · 99 · 81 (sum 1,079); searches 171 · 118 · 92 · 49 · 37 (same terms); heatmap summing to
101 with its single peak at Tue 08:00–10:00. `ANALYTICS_EXAMPLE` keeps its values (412 / 38 / 34% /
2.1 hrs).

---

## 6. Chart system (both surfaces)

Colours (validated with the dataviz validator on #FFFFFF and #FAFBFD; site tokens `--viz-*` in
`tokens.css` + `@theme inline`, deck inline hex):
• Categorical, fixed to entity: Agency `#0E5E8A` · Logistics `#3F95C6` · Customs `#C86892` ·
  Procurement `#5DCAB7` (below 3:1 — always direct-labelled or in the table). Slot 5 `#5C77DF`
  only between slots 3 and 4; otherwise fold into "Other" `#8595A8`.
• Single series: sea `#0E5E8A`. Sequential (heatmap): `#E0EFFA #A8CFE9 #6FABD2 #3B83B1 #0E5E8A`
  (text on steps 1–3 ink, step 5 white, step 4 no label). Ordinal (funnel): `#73B0D7 #4F94BF
  #2F79A5 #0E5E8A` (+ a fifth, darker `#0A4A6E`, for five steps — validate it).
• Context/benchmark line `#8595A8`; benchmark tick ink `#0A2540` over a 6px white ring; track
  `#E8F1F7`; deduction (commission) `#9AA9BA`; derived total (savings) `#33475F`; grid `#E5EAF1`;
  baseline `#CBD6E2`; tick text `#5B6B7F`; hover band `#F1F4F8`.
Marks: 2px lines (round joins), 10% flat area wash, markers only on end/hover/one extreme (r=4
with a 2px white ring); bars ≤ 24px thick with 4px radius on the data end, square at the baseline,
2px surface gaps (geometric, not strokes); horizontal bars 18px with 10px gaps; heatmap cells ≥ 16px
with 3px radius and 2px gaps. Axes: horizontal gridlines only (solid 1px), 3–5 nice ticks, no y-axis
line, 11px tabular tick text; money ticks `compactGbp`, tooltips/tables `gbp`; dates "Tue 16 Sep".
Tooltip: white, 1px `#E5EAF1`, radius 8, shadow `0 4px 14px rgba(10,37,64,.12)`, header line + one
row per series (key swatch, **value first**, label); line/area: crosshair snapping to nearest x over
the whole plot; bars/cells: per-mark with a full-band hover background; placement flips at edges;
`pointer-events: none`. Keyboard: each plot one tab stop, ←/→ (↑/↓ in the heatmap) move, Home/End,
Esc hides; an `aria-live="polite"` sr-only line repeats the tooltip text. SVG with focus handling is
`role="group"` + `aria-label`; static SVG `role="img"` with a takeaway label. Touch: tap pins, drag
scrubs, tap outside dismisses. Legend for ≥ 2 series (one row above the plot, swatch mirrors the
mark), direct labels on ≤ 4 series. Text never wears a series colour. Motion: at most one CSS
entrance (columns grow from the baseline 350ms, stagger ≤ 240ms total; lines draw via dashoffset
500ms), final state is the element's own style so reduced motion shows it immediately.
Every chart: `<figure>` + `<figcaption>` (title, subtitle, sr-only takeaway) + `<details><summary>
Show the numbers</summary><table>` (caption, `scope` headers, right-aligned tabular numbers).
Charts never sit on the `inhouse` (gold) or `dark` card variants.

---

## 7. Deck-specific notes

• Charts are plain-JS React function components (hooks) in `presenter/src/app/features/viz.js`,
  interpolated as elements (`{{ anViewsChart }}`) — React is in the script's scope and the runtime
  renders elements raw. Verify hooks work before building on them; if not, use class components.
  `{{ }}` inside SVG `<text>` does **not** render in partials — build any SVG with text in JS.
• New bindings use new prefixes and live in feature modules (feature vals lose to core keys defined
  after `component.js:900`): `cd*` client desk, `sd*` supplier desk, `sv*` SVS screen, `an*`
  analytics, `dk*`/`DK_` shared desk state, `VZ_`/`vz*` charts.
• Responsive rules need a `gac-*` class + `!important` rule in `presenter/src/styles/base.css`.
• `style-hover` cannot override an inline property; keep hover-changed properties out of inline style.
• Tables and selects inside templates use `sc-raw-*`. Textarea: bind `value`, empty body. File input:
  uncontrolled, no `value`, read `e.target.files[0]`, store name + size only.
• Deck figures must match the site's seeded figures exactly (§5.1, §2, §3).
