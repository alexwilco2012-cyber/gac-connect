/* Service lines — presenter mirror of the site's Agency, Logistics and Customs
   hubs (20 Aug 2026). Feature module: registers state / bindings / Escape
   handling with the core Component via Component._features (see component.js
   "feature-module extension points").

   Ports src/data/serviceLines.ts (the four lines, their services and the
   provision marking), src/lib/serviceLines.ts (supplier join, tier sentence),
   src/lib/logistics.ts + src/store/logistics.ts (consignments) and
   src/lib/customs.ts + src/store/customs.ts (declarations), so the demo
   behaves exactly like the site. Storage keys are prefixed 'pres.' so they
   never collide with the site's own stores on the same origin.

   Two rules from the site are load-bearing here and are printed on the screen,
   not buried in this comment:
     · every service says who performs it — GAC's own people and equipment
       (which is what the tier discount applies to) or an SVS-vetted supplier
       booked through GAC;
     · a hub is not a second copy of the marketplace: it says so, and hands off
       to the directory by category.

   Everything on these screens is illustrative. */

/* ── the lines (data/serviceLines.ts) ── */
const SL_PROVISION_LABEL = { gac: '★ GAC service', network: '◇ GAC network' };
const SL_PROVISION_KEY = 'GAC service — GAC’s own people and equipment, and the charges the tier discount applies to. GAC network — an SVS-vetted supplier, booked through GAC and accountable through GAC.';
const SL_DIRECTORY_POINTER = 'The marketplace lists who is vetted. This page lists what you can ask for.';
const SL_AGENT_ENGAGED = 'request sent to your GAC agent, surfaced inside the existing relationship, not a new queue.';

const SL_LINES = {
  agency: {
    id: 'agency',
    label: 'Agency',
    name: 'GAC Agency',
    headline: 'The port call, end to end',
    intro: 'Everything that happens between arrival and departure: the berth, the crew, the paperwork and the quayside services the call needs. GAC is the ship’s agent; the marketplace supplies the quay.',
    tierPct: 2,
    tierLabel: '2% tier',
    categories: ['Cranes', 'FLT', 'Launches', 'Taxis', 'Hotels', 'Medical', 'Scaffolding', 'Diving', 'NDT', 'Welding', 'Catering', 'Waste', 'Bunkers'],
    services: [
      { id: 'crew-change', label: 'Crew change', provision: 'gac', body: 'Hotels, taxis, launches, immigration guidance and the two letters — an Immigration Support Letter for each on-signer, a repatriation letter for each off-signer.', action: { kind: 'route', label: 'Open crew change', route: 'crew-change' } },
      { id: 'port-call', label: 'Port call and berth booking', provision: 'gac', body: 'Nomination, berth booking, pilotage and towage ordered against the call, port dues, and the call file the invoice is later checked against.', action: { kind: 'agent', label: 'Engage service' } },
      { id: 'husbandry', label: 'Husbandry and vessel support', provision: 'gac', body: 'Cash to master, mail and spares to the quay, provisions ordered against the call, and the run ashore that goes with each of them.', action: { kind: 'agent', label: 'Engage service' } },
      { id: 'fender-hire', label: 'Fender hire and site equipment', provision: 'gac', body: 'Fenders, portable cabins, security fencing and specialist equipment from GAC’s own pool, delivered to the berth.', action: { kind: 'agent', label: 'Engage service' } },
      { id: 'quayside', label: 'Quayside services', provision: 'network', body: 'Cranes, forklifts, scaffolding, waste, welding, diving and NDT from SVS-vetted suppliers — quoted against the deadline you set, booked through your agent.', action: { kind: 'category', label: 'Browse suppliers', category: 'Cranes' } },
      { id: 'certification', label: 'Crew certification tracking', provision: 'gac', beta: true, body: 'Credentials held at vessel level with the SVS expiry engine pointed at them. A direction the platform supports, not a live service.', action: { kind: 'route', label: 'Open preview', route: 'certification' } },
      { id: 'bunkers', label: 'Bunkers', provision: 'gac', beta: true, body: 'Vessel-matched enquiries, price windows compared side by side, delivery confirmed on the platform. A direction the platform supports, not a live service.', action: { kind: 'route', label: 'Open preview', route: 'bunkers' } }
    ],
    sections: []
  },
  logistics: {
    id: 'logistics',
    label: 'Logistics',
    name: 'GAC Logistics',
    headline: 'Cargo to the quay, tracked the whole way',
    intro: 'Freight forwarding, warehousing and project cargo run alongside the agency work, so a consignment arrives against a port call rather than against a hope. Book a movement and the platform shows every leg to the berth.',
    tierPct: 4,
    tierLabel: '4% tier',
    categories: ['Haulage'],
    services: [
      { id: 'consignments', label: 'Consignments', provision: 'gac', body: 'Book a movement — origin, delivery point, ready date, pieces and weight — and follow it from collection to the quay.', action: { kind: 'section', label: 'Book a consignment', section: 'consignments' } },
      { id: 'warehousing', label: 'Warehousing', provision: 'gac', body: 'GAC’s own Aberdeen warehouse: goods received against the vessel, held until the call, and released to the berth on the day.', action: { kind: 'section', label: 'What the warehouse does', section: 'warehousing' } },
      { id: 'project-cargo', label: 'Project cargo', provision: 'gac', body: 'Out-of-gauge and heavy-lift movements planned as one job — route survey, lift plan, and the crane booked against the same call.', action: { kind: 'section', label: 'How a project moves', section: 'project-cargo' } },
      { id: 'haulage', label: 'Haulage', provision: 'network', body: 'Vetted hauliers for the road legs — curtainsiders, low-loaders and escorted abnormal loads, booked through GAC.', action: { kind: 'category', label: 'Browse hauliers', category: 'Haulage' } }
    ],
    sections: [
      { id: 'consignments', label: 'Consignments', summary: 'Movements booked on the platform, each one from collection to the quay. Everything here is illustrative.' },
      { id: 'warehousing', label: 'Warehousing', summary: 'Goods received against the vessel and held until the call, so nothing sits on the quay waiting for a ship.' },
      { id: 'project-cargo', label: 'Project cargo', summary: 'Out-of-gauge and heavy-lift movements planned as one job across logistics, customs and the port call.' }
    ]
  },
  customs: {
    id: 'customs',
    label: 'Customs',
    name: 'GAC Customs',
    headline: 'Cleared before it reaches the gate',
    intro: 'T1 transit, import and export clearance and the documentation behind them, prepared and submitted in-house. Customs is the highest tier because it is the line where a delay costs the most and where GAC holds every step itself.',
    tierPct: 7,
    tierLabel: '7% tier',
    categories: [],
    noNetworkNote: 'Customs is GAC in-house end to end — GAC prepares and submits the declaration itself, so no third party sits between you and the entry. That is why it carries the 7% tier.',
    services: [
      { id: 'declarations', label: 'Declarations', provision: 'gac', body: 'Raise a T1 transit, an import clearance or an export clearance against a consignment and follow it through to cleared.', action: { kind: 'section', label: 'Raise a declaration', section: 'declarations' } },
      { id: 'documents', label: 'What GAC needs from you', provision: 'gac', body: 'The document set behind every entry, and what a missing line actually costs at the border.', action: { kind: 'section', label: 'Open the checklist', section: 'documents' } },
      { id: 'ship-spares', label: 'Ship’s spares in transit', provision: 'gac', body: 'Spares moving to a vessel under transit relief, cleared against the call and released to the quay with the rest of the delivery.', action: { kind: 'agent', label: 'Engage service' } }
    ],
    sections: [
      { id: 'declarations', label: 'Declarations', summary: 'Entries raised on the platform, each one from documents received to cleared. Everything here is illustrative.' },
      { id: 'documents', label: 'What GAC needs', summary: 'The document set behind every entry. GAC informs — the tariff classification and the customs position remain the importer’s.' }
    ]
  }
};

/* The line's discount sentence — deliberately says what the percentage applies
   to: GAC's own charges, not the network's (lib/serviceLines.ts tierSentence). */
function slTierSentence(line) {
  return 'Booking ' + line.name + ' qualifies the client for the ' + line.tierPct +
    '% tier, applied to GAC in-house charges on the platform. The tier is non-cumulative: the highest single tier held applies.';
}

/* ── logistics (lib/logistics.ts) ── */
const SL_CONSIGNMENT_STAGES = ['Booked', 'Collected', 'In transit', 'At GAC warehouse', 'Delivered to quay'];
const SL_CONSIGNMENT_MODES = ['Road', 'Air', 'Sea'];
const SL_CONSIGNMENT_ACTIONS = {
  'Booked': 'Simulate: haulier collects',
  'Collected': 'Simulate: cargo on the road',
  'In transit': 'Simulate: received into the GAC warehouse',
  'At GAC warehouse': 'Simulate: released to the berth'
};
const SL_DELIVERY_POINTS = ['Aberdeen — Regent Quay', 'Aberdeen — Torry Quay', 'Aberdeen — GAC warehouse', 'Peterhead — Smith Quay', 'Montrose — South Quay'];
const SL_LOGISTICS_INTRO = 'A movement booked here is booked against a port call, so the platform already knows the vessel, the berth and the day the cargo is actually needed. Stages below are simulated in this proof of concept.';
const SL_CONSIGNMENT_NOTICE = 'Illustrative — the movements on this screen are examples, and no carrier is contacted.';
const SL_CUSTOMS_POINTER = 'Arriving from outside the UK, so it needs a customs entry. Raise it under Customs and the declaration is tied to this movement.';
const SL_WAREHOUSING = [
  { title: 'Received against the vessel, not against a date', body: 'Goods are booked in under the vessel and the call, so a delivery that arrives three weeks early is held rather than turned away.' },
  { title: 'Held until the berth is ready', body: 'Nothing sits on the quay waiting for a ship. The warehouse releases to the berth on the day, in the order the vessel wants it.' },
  { title: 'One party accountable to the gate', body: 'The same GAC job number covers the haulier, the warehouse and the quayside delivery, so a query has one place to go.' }
];
const SL_PROJECT_CARGO = [
  { title: 'Route survey first', body: 'The road is surveyed before the load is booked — bridges, roundabouts, overhead lines — and the abnormal-load notifications go in against that survey.' },
  { title: 'The lift is booked with the move', body: 'The crane at the berth is booked against the same call, so the load and the lift are one job rather than two bookings that have to find each other.' },
  { title: 'Customs planned, not discovered', body: 'A project moving from outside the UK has its entry prepared while the load is still on the road, so nothing waits at the gate for paperwork.' }
];
const SL_SEED_CONSIGNMENTS = [
  { id: 'CN-2041', stage: 'In transit', createdAt: 'Mon 18 Aug · 08:15', form: { description: 'Deck spares and hose reels, 4 pallets', origin: 'Grangemouth', deliveryPoint: 'Aberdeen — GAC warehouse', vesselId: 'caledonian-star', mode: 'Road', readyDate: '18 Aug 2026', pieces: '4', weightKg: '1250', fromOutsideUk: false } },
  { id: 'CN-2042', stage: 'Booked', createdAt: 'Tue 19 Aug · 14:40', form: { description: 'Replacement thruster seal kit, 1 crate', origin: 'Rotterdam', deliveryPoint: 'Aberdeen — Regent Quay', vesselId: 'granite-coast', mode: 'Sea', readyDate: '21 Aug 2026', pieces: '1', weightKg: '380', fromOutsideUk: true } }
];
const SL_EMPTY_CONSIGNMENT = { description: '', origin: '', deliveryPoint: SL_DELIVERY_POINTS[0], vesselId: 'caledonian-star', mode: 'Road', readyDate: '', pieces: '', weightKg: '', fromOutsideUk: false };
const SL_DEMO_CONSIGNMENT = { description: 'Valve skid and fittings, 2 crates', origin: 'Stavanger', deliveryPoint: 'Aberdeen — Regent Quay', vesselId: 'caledonian-star', mode: 'Sea', readyDate: '26 Aug 2026', pieces: '2', weightKg: '860', fromOutsideUk: true };

/* ── customs (lib/customs.ts) ── */
const SL_DECLARATION_STAGES = ['Documents received', 'Declaration prepared', 'Submitted to HMRC', 'Cleared'];
const SL_DECLARATION_KINDS = ['T1 transit', 'Import clearance', 'Export clearance'];
/* One click covers what one party does in one go, so it can move two stages. */
const SL_DECLARATION_ACTIONS = {
  'Documents received': { label: 'Simulate: GAC prepares and submits the entry', steps: 2 },
  'Declaration prepared': { label: 'Simulate: GAC submits the entry', steps: 1 },
  'Submitted to HMRC': { label: 'Simulate: HMRC clears the entry', steps: 1 }
};
const SL_CUSTOMS_INTRO = 'GAC prepares and submits the entry itself — no broker sits between you and HMRC. Raise a declaration against a movement and the platform carries it through to cleared. Submission and the HMRC response are simulated in this proof of concept.';
const SL_INFORMS_NOT_ADVISES = 'GAC informs, it does not advise. The tariff classification, the customs valuation and the declared position remain yours as importer or exporter — GAC prepares and submits the entry against what you declare, and tells you when something is missing.';
const SL_DECLARATION_NOTICE = 'Illustrative — do not enter real commodity codes, EORI numbers or entry references in this proof of concept.';
const SL_DOCUMENT_CHECKLIST = [
  { title: 'Commercial invoice', body: 'Seller, buyer, terms of delivery, currency and a line-by-line value. A pro-forma is accepted for goods moving without a sale, and it has to say so.' },
  { title: 'Packing list', body: 'Packages, marks and numbers, net and gross weight. The weights on the packing list and the transport document should be the same figure.' },
  { title: 'Transport document', body: 'CMR, air waybill or bill of lading, matching the movement the entry is raised against.' },
  { title: 'Description that identifies the goods', body: '“Spares” is not a description. What the item is, what it is made of and what it does — enough for the classification to stand up.' },
  { title: 'Origin evidence, where preference is claimed', body: 'A statement on origin or a certificate. Without it, claim no preference rather than a preference you cannot support.' },
  { title: 'Licences and controls, where they apply', body: 'Dual-use, dangerous goods and controlled items each have their own paperwork. Tell your agent early — this is the item that holds a load at the gate.' }
];
const SL_DELAY_NOTE = 'An entry raised on an incomplete set is the commonest reason goods sit at the border. The platform will not take a declaration until the set is confirmed complete, which is a day saved at the gate rather than a form saved at the desk.';
const SL_SEED_DECLARATIONS = [
  { id: 'DEC-1187', stage: 'Submitted to HMRC', createdAt: 'Tue 19 Aug · 15:05', form: { kind: 'Import clearance', consignmentRef: 'CN-2042', goods: 'Thruster seal kit — rubber and steel seals for a marine propulsion unit', movedFrom: 'Rotterdam', movedTo: 'Aberdeen — Regent Quay', packages: '1', grossWeightKg: '380', documentsConfirmed: true } }
];
const SL_EMPTY_DECLARATION = { kind: 'Import clearance', consignmentRef: '', goods: '', movedFrom: '', movedTo: '', packages: '', grossWeightKg: '', documentsConfirmed: false };
const SL_DEMO_DECLARATION = { kind: 'T1 transit', consignmentRef: '', goods: 'Valve skid and fittings — carbon steel valve assembly on a transport frame', movedFrom: 'Stavanger', movedTo: 'Aberdeen — Regent Quay', packages: '2', grossWeightKg: '860', documentsConfirmed: false };

/* The three demo vessels (data/vessels.ts). Procurement carries the same table;
   both are fictional and both must stay in step with the site. */
const SL_VESSELS = [
  { id: 'caledonian-star', name: 'MV Caledonian Star', port: 'Aberdeen' },
  { id: 'boreal', name: 'MV Boreal', port: 'Peterhead' },
  { id: 'granite-coast', name: 'MV Granite Coast', port: 'Aberdeen' }
];

/* ── persistence keys (presenter-prefixed) ── */
const SL_KEY_CONSIGNMENTS = 'pres.logistics.consignments';
const SL_KEY_DECLARATIONS = 'pres.customs.declarations';

/* ── styles ── */
const SL_CARD = 'background:#FFFFFF;border:1px solid #E5EAF1;border-radius:10px;box-shadow:0 1px 3px rgba(10,37,64,.08),0 4px 14px rgba(10,37,64,.06);padding:20px;';
const SL_CARD_GOLD = 'background:linear-gradient(180deg,#FFFDF4,#FFFFFF 60%);border:1.5px solid #C9A227;border-radius:10px;box-shadow:0 1px 3px rgba(10,37,64,.08),0 4px 14px rgba(10,37,64,.06);padding:20px;';
const SL_PILL_BASE = 'display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:3px 10px;font-size:11.5px;font-weight:700;letter-spacing:.02em;white-space:nowrap;';
const SL_PILL_TONES = {
  inhouse: 'background:#FBF6E3;color:#9A7B14;border:1px solid #E5D89A;',
  info: 'background:#E8F1F7;color:#0E5E8A;',
  neutral: 'background:#FAFBFD;color:#33475F;border:1px solid #CBD6E2;',
  verified: 'background:#E7F4EF;color:#047857;',
  warn: 'background:#FDF3E3;color:#B45309;'
};
const SL_BTN_PRIMARY = 'display:inline-flex;align-items:center;justify-content:center;min-height:44px;background:#0E5E8A;color:#FFFFFF;border:none;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13.5px;cursor:pointer;font-family:inherit;white-space:nowrap;';
const SL_BTN_GHOST = 'display:inline-flex;align-items:center;justify-content:center;min-height:40px;background:#FFFFFF;color:#0E5E8A;border:1.5px solid #CBD6E2;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13.5px;cursor:pointer;font-family:inherit;white-space:nowrap;';
const SL_BTN_GOLD = 'display:inline-flex;align-items:center;justify-content:center;min-height:40px;background:#C9A227;color:#0A2540;border:none;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13.5px;cursor:pointer;font-family:inherit;white-space:nowrap;';
const SL_INPUT = 'display:block;margin-top:4px;min-height:40px;width:100%;box-sizing:border-box;border:1.5px solid #CBD6E2;border-radius:8px;padding:8px 10px;font-size:13.5px;font-weight:600;background:#FFFFFF;font-family:inherit;color:#0A2540;';
const SL_LABEL = 'display:block;font-size:12.5px;font-weight:600;color:#33475F;';
const SL_CHIP_BASE = 'min-height:36px;border-radius:999px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;';
const SL_CHIP_ON = 'background:#0A2540;border:1.5px solid #0A2540;color:#FFFFFF;';
const SL_CHIP_OFF = 'background:#FFFFFF;border:1.5px solid #CBD6E2;color:#33475F;';
const SL_TRACK_ON = 'position:relative;width:46px;height:26px;flex-shrink:0;border-radius:999px;border:none;cursor:pointer;background:#0E5E8A;';
const SL_TRACK_OFF = 'position:relative;width:46px;height:26px;flex-shrink:0;border-radius:999px;border:none;cursor:pointer;background:#CBD6E2;';
const SL_KNOB_ON = 'position:absolute;top:3px;left:23px;display:block;width:20px;height:20px;border-radius:50%;background:#FFFFFF;box-shadow:0 1px 3px rgba(10,37,64,.3);';
const SL_KNOB_OFF = 'position:absolute;top:3px;left:3px;display:block;width:20px;height:20px;border-radius:50%;background:#FFFFFF;box-shadow:0 1px 3px rgba(10,37,64,.3);';

function slPill(tone) { return SL_PILL_BASE + (SL_PILL_TONES[tone] || SL_PILL_TONES.neutral); }

/* ── pipeline helpers (lib/pipeline.ts) — a stage the pipeline does not know
   restarts at the first rather than sticking forever ── */
function slNextStage(stages, stage) {
  const i = stages.indexOf(stage);
  if (i === -1) return stages[0];
  return stages[Math.min(i + 1, stages.length - 1)];
}
function slIsFinal(stages, stage) { return stage === stages[stages.length - 1]; }
function slStageTone(stages, stage) { return slIsFinal(stages, stage) ? 'verified' : 'info'; }
/* The done / current / pending rail (components/ui/StageTrack.tsx). */
function slTrack(stages, current) {
  const at = stages.indexOf(current);
  return stages.map((s, i) => {
    const state = i < at ? 'done' : (i === at ? 'current' : 'pending');
    return {
      label: s, state: state,
      glyph: state === 'done' ? '✓' : (state === 'current' ? '●' : '○'),
      srLabel: state === 'done' ? ' (done)' : (state === 'current' ? ' (current)' : ' (pending)'),
      style: 'flex:1;min-width:150px;border-radius:6px;padding:6px 8px;font-size:11.5px;line-height:1.25;list-style:none;margin:0;' +
        (state === 'current' ? 'border:1px solid #0E5E8A;background:#E8F1F7;color:#0E5E8A;font-weight:700;'
          : (state === 'done' ? 'border:1px solid #E7F4EF;background:#E7F4EF;color:#047857;'
            : 'border:1px solid #E5EAF1;background:#FFFFFF;color:#33475F;'))
    };
  });
}

/* ── validation (lib/logistics.ts, lib/customs.ts) ── */
function slBlank(v) { return typeof v !== 'string' || v.trim() === ''; }
function slPositive(v) { const n = Number(String(v).trim()); return isFinite(n) && n > 0; }
const SL_CONSIGNMENT_REQUIRED = [
  ['description', 'What is moving'], ['origin', 'Collection from'], ['deliveryPoint', 'Delivery point'],
  ['vesselId', 'Vessel'], ['readyDate', 'Ready for collection'], ['pieces', 'Pieces'], ['weightKg', 'Gross weight (kg)']
];
function slValidateConsignment(form) {
  const problems = [];
  SL_CONSIGNMENT_REQUIRED.forEach((pair) => { if (slBlank(form[pair[0]])) problems.push(pair[1]); });
  if (!slBlank(form.pieces) && !slPositive(form.pieces)) problems.push('Pieces must be a number above zero');
  if (!slBlank(form.weightKg) && !slPositive(form.weightKg)) problems.push('Gross weight must be a number above zero');
  return problems;
}
const SL_DECLARATION_REQUIRED = [
  ['goods', 'What the goods are'], ['movedFrom', 'Moving from'], ['movedTo', 'Moving to'],
  ['packages', 'Packages'], ['grossWeightKg', 'Gross weight (kg)']
];
function slValidateDeclaration(form) {
  const problems = [];
  SL_DECLARATION_REQUIRED.forEach((pair) => { if (slBlank(form[pair[0]])) problems.push(pair[1]); });
  if (!slBlank(form.packages) && !slPositive(form.packages)) problems.push('Packages must be a number above zero');
  if (!slBlank(form.grossWeightKg) && !slPositive(form.grossWeightKg)) problems.push('Gross weight must be a number above zero');
  /* The document confirmation is a required field in its own right: an entry
     raised on an incomplete set is the single commonest reason goods sit at the
     border, so the platform will not take one. */
  if (!form.documentsConfirmed) problems.push('Confirmation that the document set is complete');
  return problems;
}

/* ── hydration — anything malformed is dropped rather than taking the screen
   down; a missing key means an untouched demo, so the seed is used ── */
function slIsRecord(v) { return !!v && typeof v === 'object'; }
function slIsConsignment(v) {
  if (!slIsRecord(v) || typeof v.id !== 'string' || typeof v.createdAt !== 'string') return false;
  if (SL_CONSIGNMENT_STAGES.indexOf(v.stage) === -1 || !slIsRecord(v.form)) return false;
  return SL_CONSIGNMENT_REQUIRED.every((pair) => typeof v.form[pair[0]] === 'string') &&
    typeof v.form.fromOutsideUk === 'boolean' && SL_CONSIGNMENT_MODES.indexOf(v.form.mode) !== -1;
}
function slIsDeclaration(v) {
  if (!slIsRecord(v) || typeof v.id !== 'string' || typeof v.createdAt !== 'string') return false;
  if (SL_DECLARATION_STAGES.indexOf(v.stage) === -1 || !slIsRecord(v.form)) return false;
  return SL_DECLARATION_REQUIRED.every((pair) => typeof v.form[pair[0]] === 'string') &&
    typeof v.form.consignmentRef === 'string' && typeof v.form.documentsConfirmed === 'boolean' &&
    SL_DECLARATION_KINDS.indexOf(v.form.kind) !== -1;
}
function slClone(list) { return list.map((x) => ({ id: x.id, stage: x.stage, createdAt: x.createdAt, form: Object.assign({}, x.form) })); }
function slRead(get, key, seed, guard) {
  const raw = get(key, null);
  if (raw === null) return slClone(seed);
  return Array.isArray(raw) ? raw.filter(guard) : slClone(seed);
}

/* Sequential references from the highest already held. */
function slNextRef(list, prefix, floor) {
  const numbers = list.map((x) => Number((new RegExp('^' + prefix + '-(\\d+)$').exec(x.id) || [])[1])).filter((n) => isFinite(n));
  const top = numbers.length ? Math.max.apply(null, numbers) : floor;
  return prefix + '-' + (top + 1);
}
/* Movements a declaration can be raised against: from outside the UK and not
   yet on the quay (lib/logistics.ts needingCustoms). */
function slNeedingCustoms(list) {
  return list.filter((c) => c.form.fromOutsideUk && !slIsFinal(SL_CONSIGNMENT_STAGES, c.stage));
}
/* 'Mon 18 Aug · 09:41' */
function slStamp() {
  const d = new Date();
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}
/* The hash is where the section lives, as ?section= is on the site: replace,
   never push, and never scroll (see crew-change.js for the full reasoning). */
function slWriteHash(lineId, sectionId, firstId) {
  if (typeof history === 'undefined' || !history.replaceState) return;
  const target = '#/' + (sectionId === firstId ? lineId : lineId + '/' + sectionId);
  if (typeof location !== 'undefined' && location.hash === target) return;
  try { history.replaceState(null, '', target); } catch (e) {}
}
function slFocus(id) { setTimeout(() => { const el = document.getElementById(id); if (el) el.focus(); }, 0); }

(Component._features = Component._features || []).push({
  state() {
    const get = (k, d) => this._get(k, d);
    return {
      slConsignments: slRead(get, SL_KEY_CONSIGNMENTS, SL_SEED_CONSIGNMENTS, slIsConsignment),
      slDeclarations: slRead(get, SL_KEY_DECLARATIONS, SL_SEED_DECLARATIONS, slIsDeclaration),
      slConsignmentForm: Object.assign({}, SL_EMPTY_CONSIGNMENT),
      slConsignmentProblems: [],
      slDeclarationForm: Object.assign({}, SL_EMPTY_DECLARATION),
      slDeclarationProblems: []
    };
  },

  vals(st) {
    const self = this;
    const line = SL_LINES[st.route];
    /* Not on a service line: contribute the one binding the partial needs to
       stay hidden, and nothing else. */
    if (!line) return { slIsLine: false };

    const consignments = st.slConsignments;
    const declarations = st.slDeclarations;

    /* --- section (from the hash, as ?section= on the site) --- */
    const firstSection = line.sections.length ? line.sections[0].id : '';
    const wanted = line.sections.some((s) => s.id === st.routeSection) ? st.routeSection : firstSection;
    const section = line.sections.find((s) => s.id === wanted) || null;
    /* An unrecognised section in the hash resolved to a live one: tidy the
       address bar on the next tick so what is shared next is the current name. */
    if (line.sections.length && st.routeSection && st.routeSection !== wanted) {
      setTimeout(() => {
        if (self.state.routeSection !== st.routeSection) return;
        slWriteHash(line.id, wanted, firstSection);
        self.setState({ routeSection: wanted });
      }, 0);
    }
    const goSection = (id) => { slWriteHash(line.id, id, firstSection); self.setState({ routeSection: id }); };

    /* --- suppliers in this line (lib/serviceLines.ts) — bookable first, then
       rating, then ratings submitted. Promotion is deliberately ignored: paid
       placement belongs on the directory, where it is labelled as such. --- */
    const inLine = this.SUPPLIERS.filter((s) => line.categories.indexOf(s.cat) !== -1).slice().sort((a, b) => {
      const bookable = Number(self.deriveStatus(b) !== 'blocked') - Number(self.deriveStatus(a) !== 'blocked');
      if (bookable !== 0) return bookable;
      if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
      return (b.ratingCount || 0) - (a.ratingCount || 0);
    });
    /* A category kept for a beta service (Bunkers) would otherwise render a chip
       that filters to an empty directory. */
    const stocked = line.categories.filter((c) => self.SUPPLIERS.some((s) => s.cat === c));
    const bookableCount = inLine.filter((s) => self.deriveStatus(s) !== 'blocked').length;
    const openCategory = (c) => { self.setState({ chip: c, query: '', esgOnly: false }); self.nav('marketplace'); };

    /* --- services --- */
    const services = line.services.map((sv) => {
      const gold = sv.provision === 'gac' && !sv.beta;
      let on;
      if (sv.action.kind === 'route') on = () => self.nav(sv.action.route);
      else if (sv.action.kind === 'section') on = () => goSection(sv.action.section);
      else if (sv.action.kind === 'category') on = () => openCategory(sv.action.category);
      else on = () => self.toastMsg(sv.label + ' — ' + SL_AGENT_ENGAGED);
      return {
        id: sv.id, label: sv.label, body: sv.body, beta: !!sv.beta,
        testId: 'line-service-' + sv.id, provision: sv.provision,
        cardStyle: (gold ? SL_CARD_GOLD : SL_CARD) + 'display:flex;flex-direction:column;justify-content:space-between;gap:14px;min-width:0;',
        pillStyle: slPill(sv.provision === 'gac' ? 'inhouse' : 'info'),
        pillLabel: SL_PROVISION_LABEL[sv.provision],
        btnStyle: gold ? SL_BTN_GOLD : SL_BTN_GHOST,
        btnLabel: sv.action.label,
        on: on
      };
    });

    /* --- "live in this line" --- */
    const running = consignments.filter((c) => !slIsFinal(SL_CONSIGNMENT_STAGES, c.stage));
    const openEntries = declarations.filter((d) => !slIsFinal(SL_DECLARATION_STAGES, d.stage));
    /* Every feature module is concatenated into the same x-dc script, so the
       crew-change module's own terminal-stage test is in scope here — better
       than a second copy of its pipeline that could drift. */
    const lettersInProgress = (st.ccRequests || []).filter((r) => !ccIsTerminalStage(r.kind, r.stage)).length;
    let live;
    if (line.id === 'agency') {
      const total = (st.ccRequests || []).length;
      live = [
        { label: 'Letters in progress', value: String(lettersInProgress), note: total === 0 ? 'No letters raised yet' : (total - lettersInProgress) + ' returned to you', on: () => self.nav('crew-change') },
        { label: 'Transport planned to a flight', value: 'Taxis · launches', note: 'Give us the flight number', on: () => { slWriteHash('crew-change', 'taxis', 'hotels'); self.setState({ routeSection: 'taxis' }); self.nav('crew-change'); } },
        { label: 'Quayside quotes', value: 'Compare', note: 'Replies land in one view', on: () => self.nav('quotes') }
      ];
    } else if (line.id === 'logistics') {
      const awaiting = running.filter((c) => c.form.fromOutsideUk).length;
      live = [
        { label: 'Movements running', value: String(running.length), note: (consignments.length - running.length) + ' delivered to the quay', on: () => goSection('consignments') },
        { label: 'Needing a customs entry', value: String(awaiting), note: awaiting === 0 ? 'Nothing waiting on an entry' : 'Raise it under Customs', on: () => self.nav('customs') },
        { label: 'In the GAC warehouse', value: String(consignments.filter((c) => c.stage === 'At GAC warehouse').length), note: 'Held until the berth is ready', on: () => goSection('warehousing') }
      ];
    } else {
      const waiting = slNeedingCustoms(consignments).filter((c) => !declarations.some((d) => d.form.consignmentRef === c.id)).length;
      live = [
        { label: 'Entries open', value: String(openEntries.length), note: (declarations.length - openEntries.length) + ' cleared', on: () => goSection('declarations') },
        { label: 'Movements without an entry', value: String(waiting), note: waiting === 0 ? 'Every movement is covered' : 'Raise one against the movement', on: () => self.nav('logistics') },
        { label: 'Document set', value: SL_DOCUMENT_CHECKLIST.length + ' items', note: 'What GAC needs before an entry', on: () => goSection('documents') }
      ];
    }

    /* --- logistics: the booking form and the movements --- */
    const cForm = st.slConsignmentForm;
    const setC = (patch) => self.setState({ slConsignmentForm: Object.assign({}, self.state.slConsignmentForm, patch) });
    const saveConsignments = (list) => { self._set(SL_KEY_CONSIGNMENTS, list); self.setState({ slConsignments: list }); };
    const vesselName = (id) => { const v = SL_VESSELS.find((x) => x.id === id); return v ? v.name : '—'; };

    const consignmentCards = consignments.map((c) => {
      const delivered = slIsFinal(SL_CONSIGNMENT_STAGES, c.stage);
      const action = SL_CONSIGNMENT_ACTIONS[c.stage] || '';
      return {
        id: c.id, testId: 'consignment-' + c.id, stage: c.stage,
        modePill: slPill('neutral'), mode: c.form.mode,
        meta: c.id + ' · ' + c.createdAt,
        description: c.form.description,
        routeLine: c.form.origin + ' → ' + c.form.deliveryPoint + ' · ' + vesselName(c.form.vesselId),
        detailLine: c.form.pieces + ' ' + (Number(c.form.pieces) === 1 ? 'piece' : 'pieces') + ' · ' + c.form.weightKg + ' kg · ready ' + c.form.readyDate,
        stagePillStyle: slPill(slStageTone(SL_CONSIGNMENT_STAGES, c.stage)),
        stageLabel: (delivered ? '✓ ' : '') + c.stage,
        track: slTrack(SL_CONSIGNMENT_STAGES, c.stage),
        needsCustoms: c.form.fromOutsideUk,
        customsLine: 'Customs entry needed — raise it against ' + c.id + ' →',
        onCustoms: () => self.nav('customs'),
        hasAction: !!action, actionLabel: action,
        onAdvance: () => saveConsignments(self.state.slConsignments.map((x) => (x.id === c.id ? Object.assign({}, x, { stage: slNextStage(SL_CONSIGNMENT_STAGES, x.stage) }) : x))),
        delivered: delivered,
        onPod: () => self.toastMsg('Illustrative — the proof of delivery would download here as a PDF.')
      };
    });

    /* --- customs: the declaration form and the entries --- */
    const dForm = st.slDeclarationForm;
    const setD = (patch) => self.setState({ slDeclarationForm: Object.assign({}, self.state.slDeclarationForm, patch) });
    const saveDeclarations = (list) => { self._set(SL_KEY_DECLARATIONS, list); self.setState({ slDeclarations: list }); };
    const available = slNeedingCustoms(consignments);

    const declarationCards = declarations.map((d) => {
      const cleared = slIsFinal(SL_DECLARATION_STAGES, d.stage);
      const action = SL_DECLARATION_ACTIONS[d.stage];
      return {
        id: d.id, testId: 'declaration-' + d.id, stage: d.stage,
        kindPill: slPill('neutral'), kind: d.form.kind,
        meta: d.id + ' · ' + d.createdAt,
        goods: d.form.goods,
        routeLine: d.form.movedFrom + ' → ' + d.form.movedTo + ' · ' + d.form.packages + ' ' + (Number(d.form.packages) === 1 ? 'package' : 'packages') + ' · ' + d.form.grossWeightKg + ' kg',
        hasMovement: !!d.form.consignmentRef,
        movementLabel: d.form.consignmentRef,
        onMovement: () => self.nav('logistics'),
        stagePillStyle: slPill(slStageTone(SL_DECLARATION_STAGES, d.stage)),
        stageLabel: (cleared ? '✓ ' : '') + d.stage,
        track: slTrack(SL_DECLARATION_STAGES, d.stage),
        hasAction: !!action, actionLabel: action ? action.label : '',
        onAdvance: () => {
          const steps = action ? action.steps : 1;
          saveDeclarations(self.state.slDeclarations.map((x) => {
            if (x.id !== d.id) return x;
            let stage = x.stage;
            for (let i = 0; i < steps; i += 1) stage = slNextStage(SL_DECLARATION_STAGES, stage);
            return Object.assign({}, x, { stage: stage });
          }));
        },
        cleared: cleared,
        onNote: () => self.toastMsg('Illustrative — the clearance note would download here as a PDF.')
      };
    });

    return {
      /* hub chrome */
      slIsLine: true,
      slLabel: line.label,
      slLineId: line.id,
      slName: line.name,
      slHeadline: line.headline,
      slIntro: line.intro,
      slTierLabel: line.tierLabel,
      slTierPillStyle: slPill('inhouse'),
      slTierSentence: slTierSentence(line),
      slGoTiers: this._go('tiers'),
      slDirectoryPointer: SL_DIRECTORY_POINTER,
      /* shared style strings the partial binds to */
      slCardStyle: SL_CARD,
      slLabelStyle: SL_LABEL,
      slInputStyle: SL_INPUT,
      slProvisionKey: SL_PROVISION_KEY,
      slLive: live,
      slServices: services,

      /* suppliers in this line */
      slHasSuppliers: inLine.length > 0,
      slNoNetwork: inLine.length === 0,
      slNoNetworkNote: line.noNetworkNote || '',
      slSupplierCount: bookableCount + ' bookable ' + (bookableCount === 1 ? 'supplier' : 'suppliers') + ' across ' +
        stocked.length + ' ' + (stocked.length === 1 ? 'category' : 'categories') + '. The marketplace holds the full directory, the vetting and the terms.',
      slCategories: stocked.map((c) => ({ label: c, style: SL_CHIP_BASE + SL_CHIP_OFF, on: () => openCategory(c) })),
      slSuppliers: inLine.slice(0, 3).map((s) => ({
        id: s.id, name: s.name, cat: s.cat,
        ratingLabel: (s.rating || 0).toFixed(1) + ' ★',
        ratingCountLabel: '· ' + (s.ratingCount || 0) + (s.ratingCount === 1 ? ' rating' : ' ratings'),
        onOpen: () => self.nav('supplier/' + s.id)
      })),

      /* sections */
      slHasSections: line.sections.length > 0,
      slSectionId: section ? section.id : '',
      slSectionLabel: section ? section.label : '',
      slSectionSummary: section ? section.summary : '',
      slSections: line.sections.map((s) => ({
        id: s.id, label: s.label,
        pressed: section && s.id === section.id ? 'true' : 'false',
        style: SL_CHIP_BASE + (section && s.id === section.id ? SL_CHIP_ON : SL_CHIP_OFF),
        on: () => goSection(s.id)
      })),
      slIsConsignments: line.id === 'logistics' && wanted === 'consignments',
      slIsWarehousing: line.id === 'logistics' && wanted === 'warehousing',
      slIsProjectCargo: line.id === 'logistics' && wanted === 'project-cargo',
      slIsDeclarations: line.id === 'customs' && wanted === 'declarations',
      slIsDocuments: line.id === 'customs' && wanted === 'documents',

      /* logistics section */
      slLogisticsIntro: SL_LOGISTICS_INTRO,
      slConsignmentNotice: SL_CONSIGNMENT_NOTICE,
      slNeutralPill: slPill('neutral'),
      slWarehousing: SL_WAREHOUSING,
      slProjectCargo: SL_PROJECT_CARGO,
      slCDescription: cForm.description,
      slOnCDescription: (e) => setC({ description: e.target.value }),
      slCOrigin: cForm.origin,
      slOnCOrigin: (e) => setC({ origin: e.target.value }),
      slCDeliveryPoint: cForm.deliveryPoint,
      slOnCDeliveryPoint: (e) => setC({ deliveryPoint: e.target.value }),
      slDeliveryPoints: SL_DELIVERY_POINTS.map((d) => ({ value: d, label: d })),
      slCVesselId: cForm.vesselId,
      slOnCVessel: (e) => setC({ vesselId: e.target.value }),
      slVesselOptions: SL_VESSELS.map((v) => ({ value: v.id, label: v.name + ' · ' + v.port })),
      slCMode: cForm.mode,
      slOnCMode: (e) => setC({ mode: e.target.value }),
      slModeOptions: SL_CONSIGNMENT_MODES.map((m) => ({ value: m, label: m })),
      slCReadyDate: cForm.readyDate,
      slOnCReadyDate: (e) => setC({ readyDate: e.target.value }),
      slCPieces: cForm.pieces,
      slOnCPieces: (e) => setC({ pieces: e.target.value }),
      slCWeight: cForm.weightKg,
      slOnCWeight: (e) => setC({ weightKg: e.target.value }),
      slCOutsideUk: cForm.fromOutsideUk,
      slCOutsideAria: cForm.fromOutsideUk ? 'true' : 'false',
      slCOutsideTrack: cForm.fromOutsideUk ? SL_TRACK_ON : SL_TRACK_OFF,
      slCOutsideKnob: cForm.fromOutsideUk ? SL_KNOB_ON : SL_KNOB_OFF,
      slToggleCOutside: () => setC({ fromOutsideUk: !self.state.slConsignmentForm.fromOutsideUk }),
      slCustomsPointer: SL_CUSTOMS_POINTER,
      slGoCustoms: this._go('customs'),
      slCHasProblems: st.slConsignmentProblems.length > 0,
      slCProblems: 'Still needed: ' + st.slConsignmentProblems.join(' · '),
      slCBookStyle: SL_BTN_PRIMARY,
      slCGhostStyle: SL_BTN_GHOST,
      slCBook: () => {
        const form = self.state.slConsignmentForm;
        const problems = slValidateConsignment(form);
        self.setState({ slConsignmentProblems: problems });
        if (problems.length) return;
        const id = slNextRef(self.state.slConsignments, 'CN', 2040);
        const list = [{ id: id, form: Object.assign({}, form), stage: 'Booked', createdAt: slStamp() }].concat(self.state.slConsignments);
        saveConsignments(list);
        self.setState({ slConsignmentForm: Object.assign({}, SL_EMPTY_CONSIGNMENT) });
        self.toastMsg(id + ' booked — ' + vesselName(form.vesselId) + ', ' + form.deliveryPoint + '. Illustrative: no carrier is contacted.');
        slFocus('sl-consignments');
      },
      slCFillExample: () => self.setState({ slConsignmentForm: Object.assign({}, SL_DEMO_CONSIGNMENT), slConsignmentProblems: [] }),
      slConsignments: consignmentCards,
      slConsignmentsSummary: consignments.length === 0
        ? 'No movements booked'
        : running.length + ' running · ' + (consignments.length - running.length) + ' delivered',
      slConsignmentsCount: 'Movements · ' + consignments.length,
      slResetConsignments: () => { try { localStorage.removeItem('gac-connect:' + SL_KEY_CONSIGNMENTS); } catch (e) {} self.setState({ slConsignments: slClone(SL_SEED_CONSIGNMENTS) }); },

      /* customs section */
      slCustomsIntro: SL_CUSTOMS_INTRO,
      slDeclarationNotice: SL_DECLARATION_NOTICE,
      slInformsNotAdvises: SL_INFORMS_NOT_ADVISES,
      slDocumentChecklist: SL_DOCUMENT_CHECKLIST,
      slDelayNote: SL_DELAY_NOTE,
      slDKind: dForm.kind,
      slOnDKind: (e) => setD({ kind: e.target.value }),
      slKindOptions: SL_DECLARATION_KINDS.map((k) => ({ value: k, label: k })),
      slDConsignmentRef: dForm.consignmentRef,
      slMovementOptions: [{ value: '', label: 'No movement — standalone entry' }].concat(
        available.map((c) => ({ value: c.id, label: c.id + ' · ' + c.form.description }))
      ),
      /* Picking a movement fills the entry in from the logistics record rather
         than asking the client to retype it. */
      slOnDConsignment: (e) => {
        const ref = e.target.value;
        const c = available.find((x) => x.id === ref);
        if (!c) { setD({ consignmentRef: '' }); return; }
        const cur = self.state.slDeclarationForm;
        setD({
          consignmentRef: c.id,
          goods: cur.goods || c.form.description,
          movedFrom: c.form.origin,
          movedTo: c.form.deliveryPoint,
          packages: c.form.pieces,
          grossWeightKg: c.form.weightKg
        });
      },
      slDGoods: dForm.goods,
      slOnDGoods: (e) => setD({ goods: e.target.value }),
      slDFrom: dForm.movedFrom,
      slOnDFrom: (e) => setD({ movedFrom: e.target.value }),
      slDTo: dForm.movedTo,
      slOnDTo: (e) => setD({ movedTo: e.target.value }),
      slDPackages: dForm.packages,
      slOnDPackages: (e) => setD({ packages: e.target.value }),
      slDWeight: dForm.grossWeightKg,
      slOnDWeight: (e) => setD({ grossWeightKg: e.target.value }),
      slDDocsAria: dForm.documentsConfirmed ? 'true' : 'false',
      slDDocsTrack: dForm.documentsConfirmed ? SL_TRACK_ON : SL_TRACK_OFF,
      slDDocsKnob: dForm.documentsConfirmed ? SL_KNOB_ON : SL_KNOB_OFF,
      slToggleDDocs: () => setD({ documentsConfirmed: !self.state.slDeclarationForm.documentsConfirmed }),
      slDHasProblems: st.slDeclarationProblems.length > 0,
      slDProblems: 'Still needed: ' + st.slDeclarationProblems.join(' · '),
      slDRaise: () => {
        const form = self.state.slDeclarationForm;
        const problems = slValidateDeclaration(form);
        self.setState({ slDeclarationProblems: problems });
        if (problems.length) return;
        const id = slNextRef(self.state.slDeclarations, 'DEC', 1186);
        const list = [{ id: id, form: Object.assign({}, form), stage: 'Documents received', createdAt: slStamp() }].concat(self.state.slDeclarations);
        saveDeclarations(list);
        self.setState({ slDeclarationForm: Object.assign({}, SL_EMPTY_DECLARATION) });
        self.toastMsg(id + ' raised — ' + form.kind + '. Illustrative: nothing is submitted to HMRC.');
        slFocus('sl-declarations');
      },
      slDFillExample: () => self.setState({ slDeclarationForm: Object.assign({}, SL_DEMO_DECLARATION), slDeclarationProblems: [] }),
      slDeclarations: declarationCards,
      slDeclarationsCount: 'Entries · ' + declarations.length,
      slDeclarationsSummary: declarations.length === 0
        ? 'No entries raised'
        : openEntries.length + ' open · ' + (declarations.length - openEntries.length) + ' cleared',
      slResetDeclarations: () => { try { localStorage.removeItem('gac-connect:' + SL_KEY_DECLARATIONS); } catch (e) {} self.setState({ slDeclarations: slClone(SL_SEED_DECLARATIONS) }); },
      slWarnPillStyle: slPill('warn')
    };
  },

  escape() { return false; }
});
