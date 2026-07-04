# 03 · COMMERCIAL RULES & DATA

This file is the source of truth for business logic and mock data. If any other document appears to disagree with it, this file wins (except `07_GUARDRAILS`, which wins over everything).

## 3.1 Tier discount — exact algorithm

```ts
const TIERS = { agency: 2, logistics: 4, customs: 7 } as const;

function tierPct(active: { agency: boolean; logistics: boolean; customs: boolean }): number {
  const on = (Object.keys(TIERS) as (keyof typeof TIERS)[]).filter(k => active[k]);
  return on.length ? Math.max(...on.map(k => TIERS[k])) : 0;   // NON-CUMULATIVE
}
const isFullStack = (a: typeof active) => a.agency && a.logistics && a.customs; // 7%, badge
const annualSaving = (spendGBP: number, a) => Math.round(spendGBP * tierPct(a) / 100);
```

- Discount base: **the client's GAC in-house service charges booked through the platform** — never the disbursement fee, never third-party spend.
- Canonical example (must appear in copy and hold arithmetically): £500,000 Full Stack → **£35,000 saved**.
- GAC Assets and GAC Procurement: included at any tier as added value; they confer no tier of their own.
- Tier-note copy states *which* tier applies and what the next service adds (port these strings from the reference demo verbatim).

**Required unit tests**: none-selected → 0; agency-only → 2; logistics-only → 4; customs-only → 7; agency+logistics → 4; agency+customs → 7; all → 7 and FullStack true; £500k all → 35000; £100k agency → 2000.

## 3.2 Copy facts that must never be contradicted

- There is **no platform commission and no booking fee**. Never invent one.
- The **5% disbursement fee** on third-party services is GAC's *existing* commercial mechanism; the platform's contribution is volume through it. (Mention sparingly; never present as new.)
- Supplier plans: **Free · Professional £900/yr · Premium £1,800/yr**.
- **Founder Programme**: first 50 suppliers free for 12 months, then a **25% permanent discount**.
- Promotion products: featured category placement · homepage spotlight · category sponsorship (one sponsor per category per month).
- **"Promotion changes position, not credentials."** Always labelled; never overrides SVS status.
- Beta banner (both beta screens, verbatim skeleton): *"Beta preview · not in current scope. [Certification only:] Offshore certification as a service line is a strategic idea under consideration, not an established offering."*

## 3.3 SVS rules

- Mandatory vetting fields: BOSIET, HUET, GWO, LOLER, insurance, medical certificates (plus category-specific inspection records).
- Cert states: `ok` · `due` (≤90 days; alert tiers 90/30/7) · `lapsed`.
- Supplier status derives: any `lapsed` ⇒ **Blocked** (unbookable everywhere, "Unavailable" action, visible for transparency); any `due` ⇒ **Renewal due** (bookable, warned); else **Verified**.
- Blocking beats promotion, plan level, and rating — enforce in the booking action itself, not just display.

## 3.4 Canonical mock data (fictional — do not substitute real companies)

**Operators/clients** (memory-anchored fictional set): Northmoor Energy · Solway Marine · Brinmore Subsea · Fairhaven Drilling. Billing-split scenario: *MV Caledonian Star — Northmoor Energy / Solway Marine 60/40*.

**Vessels**: MV Caledonian Star (Aberdeen, the predictive-procurement scenario: crane hire, medical cover, scaffolding) · MV Boreal (Peterhead) · MV Granite Coast (Aberdeen, T1 customs in progress).

**Suppliers** (id, category, rating, ESG, flags):
| Name | Category | Rating | ESG | Flags |
|---|---|---|---|---|
| Caledonia Lifting Ltd | Cranes | 4.9 | A | verified |
| North Sea Crane Co. | Cranes | 4.7 | B | verified |
| Granite Cranes | Cranes | 4.5 | B | verified |
| Aberdeen Offshore Medical | Medical | 4.8 | A | verified |
| Caledonia Scaffolding | Scaffolding | 4.5 | B | verified |
| Granite NDT Ltd | NDT | 4.6 | B | renewal-due (GWO 21 days) |
| Peterhead Diving Services | Diving | 4.2 | C | **blocked** (insurance lapsed) |
| Silver City Welding | Welding | 4.4 | B | verified, **promoted** (Premium) |
| Quayside Catering Co. | Catering | 4.7 | B | verified |

**GAC in-house lines** (always pinned above third-party where relevant): GAC Agency (2% tier) · GAC Logistics (4%) · GAC Customs (7%) · GAC Assets (any tier) · GAC Procurement (any tier). Descriptions: port from reference demo.

**Quote scenario** (crane hire, MV Caledonian Star): North Sea Crane Co. £4,850 / Fri 06:00 / 120t / platform-reply 09:42 · **Caledonia Lifting £4,400 / Fri 06:00 / 130t / parsed-from-Outlook 10:15 / best match** · Granite Cranes £5,100 / Fri 09:00 / 110t / platform-reply 11:03. Acceptance toast: "PO 48211 generated in GAC Agent — billing split 60/40 Northmoor Energy / Solway Marine applied automatically."

**Analytics example** (supplier dashboard): 412 profile views (30d) · 38 quote requests · 34% win rate · 2.1h avg response.

**Dashboard KPIs**: 14 active jobs · 6 open quote requests · 52 SVS-verified suppliers · 31 hrs admin saved/month.

All mock data lives in `src/data/*.ts` behind typed interfaces (see 04). A single `src/config/brand.ts` exports `BRAND_NAME` (default "GAC Connect") consumed everywhere the brand renders.
