# 02 · DESIGN SYSTEM

Direction in three words: **engineered North-Sea calm**. Institutional maritime confidence — deep ink, disciplined white, gold used sparingly and only where it means something. No startup gradients, no glassmorphism, no purple. The reference demo's look is the baseline; refine it, don't replace it.

## Tokens (CSS custom properties; mirror as Tailwind theme values)

```css
--ink:        #0A2540;   /* primary text, dark surfaces */
--ink-soft:   #33475F;   /* secondary text */
--paper:      #FAFBFD;   /* app background */
--white:      #FFFFFF;
--line:       #E5EAF1;   /* hairlines */
--line-strong:#CBD6E2;
--sea:        #0E5E8A;   /* interactive: links, buttons, focus */
--sea-soft:   #E8F1F7;
--gold:       #C9A227;   /* in-house identity (light surfaces) */
--gold-bright:#FFC72C;   /* in-house identity (dark surfaces), BETA pill, loader */
--gold-deep:  #9A7B14;
--gold-soft:  #FBF6E3;
--success:    #047857;  --success-soft: #E7F4EF;
--warn:       #B45309;  --warn-soft:    #FBF0E1;
--danger:     #B91C1C;  --danger-soft:  #FBEAEA;
--promoted:   #5B3FA8;  --promoted-soft:#EFE9FB;  --promoted-line:#D9CCF5;
--radius: 10px;
--shadow: 0 1px 3px rgba(10,37,64,.08), 0 4px 14px rgba(10,37,64,.06);
```

**Gold is reserved.** It marks GAC in-house identity, the Full Stack state, the BETA pill, and the loader. It never decorates generic UI. This reservation is the design system's most important rule.

## Typography

- **Display**: Space Grotesk (self-hosted woff2 in `/public/fonts` — no CDN fonts; the site must render correctly offline-cached and behind corporate proxies). Weights 500/700. Used for: wordmark, loader, hero headings, stat numbers.
- **Body/UI**: system stack — `"Segoe UI", "Avenir Next", "Helvetica Neue", Arial, sans-serif`. 15px base, 1.5 line-height.
- **Eyebrows**: 11px, 800, letter-spacing .14em, uppercase, `--sea` (gold-bright on dark).
- British English throughout all copy.

## The motif: four pillars and a roof

The brand mark. A gold isosceles-triangle roof resting squarely on four sea-blue columns with **equal overhang both sides** (the roof must never be wider than the pillar span plus a small symmetric overhang — this was a corrected defect; keep the geometry parametric). Uses: small in footers/nav contexts (monochrome acceptable), large on the landing hero and the dashboard consolidation widget (where pillars light up per active service and the roof turns gold at Full Stack).

## Components (build these first; everything composes from them)

Pills/badges: `GAC In-House` (gold-soft), `GAC Verified ✓` (success-soft), `Promoted ▲` (promoted-soft), `Renewal due ⚠` (warn-soft), `Blocked ✗` (danger-soft), `BETA` (gold-bright bg, ink text, 9px caps), info pill (sea-soft). Buttons: primary (sea), ghost (white/sea border), gold (in-house actions only). Card (white, hairline, radius, shadow; variants: inhouse gold-bordered w/ warm gradient, promoted violet-bordered w/ cool gradient). Form: toggle switch (46×26, sea when on), range slider (sea accent), search input, category chip (pressed = ink). Table (ink header row, hairline rows, status chips inline). Toast (ink, bottom-centre, gold tag slot, auto-dismiss ~5s, `role="status"`). Drawer (right, 400px, Outlook-blue header for the add-in preview). Modal (centered, focus-trapped, Escape closes). Stat card (label / big number / trend bar). Coach-mark (tour): ink bubble, gold step counter, next/skip.

## Motion

- Loader: the full choreography from the reference demo (letters → chain links → CONNECT → vessel crossing → bar). Duration ~4.8s, click/Esc skips, `prefers-reduced-motion` bypasses entirely.
- Screens: 250ms fade-up on route enter. Nothing else moves gratuitously. Hover states are colour/border only.
- Every animation respects `prefers-reduced-motion: reduce` — globally, not per-component.

## Accessibility baked into the system

Focus-visible: 3px `--sea` outline, 2px offset, everywhere. Contrast: all text pairs ≥ 4.5:1 (verify gold-deep on gold-soft and 9FB4C8-on-ink usages; adjust shade, not the palette, if any fail). All status meaning carried by icon+text, never colour alone. Touch targets ≥ 44px on mobile.

## Voice

Confident, plain, first-person plural where GAC speaks. Short sentences. No exclamation marks. The demo's copy is the register reference — e.g. "Promotion changes position, not credentials." Write like that.
