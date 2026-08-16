# GAC Connect · v12 Build Notes

Operating brief for the Claude Code repo-update session. Everything in this drop is verified against the v12 canon below. Sources are authoritative; outputs are compiled. Edit sources, rebuild, never patch outputs.

## Files in this drop

• GAC_Connect_Proposal_v12.docx (compiled output, 18 pp)
• GAC_Connect_Study_Guide_v13.docx (compiled output, 13 pp; guide numbering runs one ahead of the proposal because v12 was the live guide)
• presenter_6.html (patched presenter; deploy AS presenter.html, see Deploy)
• proposal_v12_content.md (canonical source, successor to B1)
• study_guide_v13_content.md (canonical source, successor to B2)
• build_docs.js (shared renderer for both docx outputs)
• BUILD_NOTES.md (this file)

## What changed in v12

Two drivers. First, the SVS story now matches what Laura confirmed: the SVS is GAC-owned, built for GAC by a third-party developer, with Group currently moving maintenance and development to Group IT. Every trace of the old third-party-licence framing is gone, including the SVS-02 capex line, the Option C alternative, milestones and Month 1 actions. Second, the supplier commission model introduced in v11 is now carried consistently through all three deliverables; the study guide and presenter previously still described the old rebate-era model and figures.

## Canonical fact block (v12, locked)

• Revenue Y1/Y2/Y3: £625,000 / £2,750,000 / £6,550,000
• Incremental Disbursement Revenue: £100k / £400k / £1.0m, at client-agreed rates, existing mechanism. Never describe it as a flat "5%".
• Supplier Commission: £200k / £1.2m / £3.0m. Bands 20% Basic, 15% Professional, 10% Premium, on third-party work won through the platform, deducted at invoice matching. Blended 10% Year 1, 15% thereafter.
• Supplier Subscriptions: £75k / £300k / £600k. Plans Free / £900 / £1,800 p.a.
• Premium Advertising: £25k / £100k / £200k. Compliance & Vetting (SVS): £50k / £100k / £250k.
• GAC In-House Service Uplift: £175k / £650k / £1.5m (30% of active clients use one GAC service in Y1, scaling to 45% by Y3).
• Cost of Sales: £85k / £165k / £275k, including Tier Discount Pass-Through £15k / £50k / £100k.
• Gross Profit: £540k / £2,585k / £6,275k. Operating Costs: £735k / £815k / £895k.
• Operating Result: (£195k) planned / £1.77m / £5.38m. Cumulative three-year result ~£6.96m.
• Cash: £565k Year 1 exposure (£370k capex plus ~£195k operating loss). Internal facility of up to £750,000, roughly £185k headroom. Revenue from Month 8, break-even during Year 2, cumulative profit by end of Year 2, positive monthly cash by Month 18.
• Capex £370,000: PLT-01 £175k, SVS-02 £55k "SVS Integration & Enhancement" (Months 2-7, builds on the GAC-owned SVS, scope agreed with Group IT), INT-03 £70k, UXD-04 £35k, SEC-05 £20k, CLD-06 £15k.
• Tier discount: non-cumulative max(2% / 4% / 7%), applies only to GAC in-house service charges booked through the platform. Never third-party spend, never the existing disbursement arrangement.
• Founder Programme: first 50 suppliers, first year free, plus a 5-point commission-band reduction for 24 months. The old "free for 12 months then 25% permanent discount" is retired everywhere.
• SVS: GAC-owned. Built by a third-party developer, maintenance and development transitioning to Group IT. GAC Connect's contribution is making an owned compliance asset commercially productive, not bringing it in-house. Gold Band is an earned annual-audit tier for Premium suppliers. Month 1 action: written IP-assignment confirmation, transition timetable, Group IT scoping.
• Never say: platform booking fee, "no commission", rebates as a live mechanism (two v11-inherited footnotes noting that commission replaces rebates are deliberate and stay), 5% disbursement fee, third-party SVS licence, highest-margin customs, decade of GA data.

## Deploy: presenter

• Copy presenter_6.html into the repo as presenter.html. The published URL and the QR baked into printed materials must remain exactly https://alexwilco2012-cyber.github.io/gac-connect/presenter.html. Do not rename the path.
• The patch changed ten strings inside the double-JSON bundler payload: three static stat cards, the count-up values array [370, 195, 1770, 5380], the count-up formatter (cards 3 and 4 now both use the millions format), the SVS ownership line, the disbursement wording, two Founder-card strings and the Founder toast. The payload was decode-tested after patching: both JSON layers parse and the counter block compiles.

## Repo sweep before committing

Run a case-insensitive grep across the whole repo, React platform included, for stale model language and figures:

475|1,800,000|4,150,000|345|820|2\.98|715|2980|rebate|no commission|free for 12|25% (off|discount)|5% disbursement|third.party licence

Review hits rather than blind-replacing. Expected legitimate hits: £1,800 as the Professional plan price (only 1,800,000 is stale), numeric noise inside base64 blobs and SVG coordinates (a circle cx="820" exists in presenter assets and is not a figure), and unrelated arithmetic in TierCalculator.tsx. Anything describing rebates, "no commission", the old Founder terms, a 5% disbursement fee or a third-party SVS licence is stale and goes.

## Platform (React) follow-ups

• The supplier plan screens do not currently state the commission bands anywhere. Whether the plan cards should show 20 / 15 / 10 is a product-copy decision: flag to Alex before editing, do not add it unprompted.
• TierCalculator.tsx already carries the Browne Energy worked example; confirm its copy contains no rebate-era language while sweeping.
• Fictional operator names only in anything public-facing: Browne Energy, Grizzell Marine, Stronach Subsea, Wilkinson Drilling.

## Post-deploy manual checks

• Open the published presenter and a local file:// copy in Safari: loader unpacks, count-up renders £370k, (£195k), £1.77m, £5.38m. Cards 3 and 4 animating through millions values (for example £0.42m rising) is expected behaviour, matching how the Year 3 card already behaved.
• Esc fallback and the morph transition into the live demo still work offline in Safari.
• QR from the printed materials resolves to /presenter.html.
• The study guide setup-ritual section is unchanged in v13; the opening-sequence redesign remains a separate Claude Design workstream and nothing in this drop touches it.

## Rebuilding the docx outputs

• Requires Node with the docx package (built against docx 9.6.1) and assets/gac_logo.png alongside build_docs.js.
• node build_docs.js proposal_v12_content.md GAC_Connect_Proposal_v12.docx
• node build_docs.js study_guide_v13_content.md GAC_Connect_Study_Guide_v13.docx
• House style: proposal carries no em dashes and no exclamation marks; the guide keeps its own em-dash style. British English throughout. Document metadata is set to Alex Wilkinson and both outputs carry standard OOXML parts only, with no provenance metadata.
