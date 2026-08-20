/* Crew change — presenter mirror of the site's Crew change screen (17 Aug review;
   owner's follow-up: taxis and launches are sections in their own right, and each
   points at the other — the flight-timed planner sits with the taxis because it is
   the airport run that hangs off the flight). Feature module: registers state /
   bindings / Escape handling with the core Component via Component._features
   (see component.js "feature-module extension points"). Data it needs lives
   here too, so app/data.js stays the v12 baseline. Mirrors
   src/screens/app/CrewChange.tsx, src/lib/crewChange.ts, src/lib/transfers.ts,
   src/data/crewChange.ts and src/store/crewChange.ts — copy verbatim, rules
   ported verbatim. The launches panel on the Launches section is bound by
   features/launches.js. All data on this screen is illustrative and fictional.

   Deep link: the core maps '#/crew-change/<section>' (and '#/launches', which is
   '#/crew-change/launches') to route 'crew-change' with state.routeSection =
   '<section>' (component.js _parseHash); this module resolves that name — retired
   ids included — and shows it. Picking a chip or following a cross-link rewrites
   the hash in place rather than pushing, so the section survives a reload or a
   shared link and Back still leaves the screen (site: setParams replace). */

/* ---------- copy tables (src/data/crewChange.ts) ---------- */
const CC_SECTIONS = [
  { id: 'hotels', label: 'Hotels', summary: 'Rooms for crew held ashore — off-signers, transit crews, medical stand-downs.' },
  { id: 'taxis', label: 'Taxis', summary: 'Airport, hotel and quay runs, timed to the crew member’s tracked flight when you give us the flight number.' },
  { id: 'launches', label: 'Launches', summary: 'Crew, stores and light freight out to vessels at anchor — capacity and whether freight is included, launch by launch, port by port.' },
  { id: 'immigration', label: 'Immigration', summary: 'What your GAC agent needs before any letter goes out, and what GAC does not do.' },
  { id: 'loi', label: 'LOI (on-signers)', summary: 'Immigration Support Letter for a visa-national crew member joining through the UK — issued and signed by GAC as agents.' },
  { id: 'repat', label: 'Repat letters (off-signers)', summary: 'Disembarkation / repatriation letter for a crew member leaving through the UK — prepared by GAC, endorsed by UK Border Force.' }
];
/* Section ids that have been renamed. A link minted before taxis and launches
   were split ('#/crew-change/transfers') still lands somewhere sensible instead
   of silently dropping the visitor on Hotels (site: RETIRED_CREW_SECTIONS). */
const CC_RETIRED_SECTIONS = { transfers: 'taxis' };
const CC_DEFAULT_SECTION = 'hotels';
function ccIsSectionId(v) { return !!v && CC_SECTIONS.some((s) => s.id === v); }
/* The section a hash asks for: current id, retired id, or the default. */
function ccResolveSection(v) {
  if (ccIsSectionId(v)) return v;
  if (v && CC_RETIRED_SECTIONS[v]) return CC_RETIRED_SECTIONS[v];
  return CC_DEFAULT_SECTION;
}
/* The hash is where the section lives, exactly as ?section= is on the site, so a
   reload or a shared link reopens the section the visitor is looking at. Two
   rules come with that, both taken from CrewChange.tsx:
     · the write replaces, never pushes — setParams(next, { replace: true }) —
       otherwise every chip click stacks a history entry and Back walks back
       through the sections instead of leaving the screen;
     · it must not scroll: the site only scrolls to the top on a pathname change
       (App.tsx), and a section swap is not one.
   history.replaceState satisfies both — it rewrites the hash in place and fires
   no hashchange, so the core's scroll-to-top does not run. The caller sets
   state.routeSection alongside it, which is what actually re-renders. */
function ccWriteHash(id) {
  if (typeof history === 'undefined' || !history.replaceState) return;
  const target = '#/' + (id === CC_DEFAULT_SECTION ? 'crew-change' : 'crew-change/' + id);
  if (typeof location !== 'undefined' && location.hash === target) return;
  try { history.replaceState(null, '', target); } catch (e) {}
}
/* Taxis section — copy for the flight-timed planner. */
const CC_TAXIS_INTRO = 'Give us the flight number and the platform tracks the flight and times the transport to it: the taxi meets the crew at arrivals, the launch leaves the quay when they get there, and a delay moves the whole chain — no phone calls.';
/* Taxis → Launches: the planner times the launch leg, the operators live elsewhere. */
const CC_TAXIS_LAUNCH_POINTER = 'The planner times the launch leg with the taxi. The launch operators themselves — capacity, freight and port notes — are under Launches.';
/* Launches → Taxis: the reciprocal pointer, so a run can be hung off the flight. */
const CC_LAUNCHES_TAXI_POINTER = 'A run can be timed to the crew member’s tracked flight — the planner under Taxis times the taxi and the launch to the same flight.';

/* ---------- flight-timed transfers (src/lib/transfers.ts, verbatim) ----------
   There is no live feed in this proof of concept: trTrackFlight looks a flight up
   in a small illustrative table and a "delay" is applied on demand. Fictional
   flight numbers (ZZ prefix). */
const TR_DEMO_FLIGHTS = {
  ZZ417: { flight: 'ZZ417', route: 'Amsterdam → Aberdeen', scheduled: '13:55', direction: 'arriving' },
  ZZ122: { flight: 'ZZ122', route: 'London Heathrow → Aberdeen', scheduled: '09:40', direction: 'arriving' },
  ZZ204: { flight: 'ZZ204', route: 'Aberdeen → Amsterdam', scheduled: '17:10', direction: 'departing' },
  ZZ131: { flight: 'ZZ131', route: 'Aberdeen → London Heathrow', scheduled: '19:25', direction: 'departing' }
};
const TR_FLIGHT_FEED_NOTE = 'Illustrative — flight status is simulated here. In production the estimate comes from a live flight-status feed (Skyscanner-style, or the airport’s own status API) and the transport re-times itself.';
/* Ports a taxi run can serve. Taxis stand on their own (owner's follow-up): they
   cover every port the letters cover plus the launch ports, so the planner is not
   limited to the two ports that happen to have a launch (site: TRANSFER_PORTS). */
const TR_TRANSFER_PORTS = ['Aberdeen', 'Peterhead', 'Montrose', 'Macduff'];
/* Timing rules, in minutes. Illustrative but sensible; a production platform reads them from client policy. */
const TR_BUFFERS = {
  bagsAndImmigrationMin: 40,
  taxiMin: { Aberdeen: 25, Peterhead: 55, Montrose: 60, Macduff: 75 },
  quayHandoverMin: 20,
  checkInBeforeDepartureMin: 120,
  simulatedDelayMin: 40
};
const TR_DIRECTIONS = [
  { id: 'arriving', label: 'On-signers arriving', hint: 'flight lands → taxi → quay → launch' },
  { id: 'departing', label: 'Off-signers departing', hint: 'launch → quay → taxi → flight' }
];
const TR_PHASE_TONE = { scheduled: 'neutral', 'in-air': 'info', delayed: 'warn', landed: 'verified' };
const TR_PHASE_LABEL = { scheduled: 'Scheduled', 'in-air': 'In the air', delayed: 'Delayed', landed: 'Landed' };
/* 'ZZ 417' / 'zz417' / ' Zz-417 ' → 'ZZ417'. */
function trNormaliseFlightNo(input) { return String(input || '').replace(/[^a-z0-9]/gi, '').toUpperCase(); }
/* HH:MM plus minutes, wrapping past midnight. */
function trAddMinutes(hhmm, minutes) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm).trim());
  if (!m) return hhmm;
  const total = (((Number(m[1]) * 60 + Number(m[2]) + Math.round(minutes)) % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const mm = total % 60;
  return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}
/* Look a flight up in the feed and apply a delay; null when the feed does not know it. */
function trTrackFlight(flightNo, delayMin) {
  const key = trNormaliseFlightNo(flightNo);
  const base = TR_DEMO_FLIGHTS[key];
  if (!base) return null;
  const delay = Math.max(0, Math.round(delayMin || 0));
  const phase = delay > 0 ? 'delayed' : (base.direction === 'arriving' ? 'in-air' : 'scheduled');
  return Object.assign({}, base, { estimated: trAddMinutes(base.scheduled, delay), delayMin: delay, phase: phase });
}
/* Minutes of launch transit parsed from a launch's transit line like '25 min to Aberdeen anchorage'. */
function trLaunchTransitMin(launch) {
  if (!launch) return 0;
  const m = /(\d+)\s*min/i.exec(launch.transit);
  return m ? Number(m[1]) : 30;
}
/* Arriving on-signers: land → taxi → quay → launch → vessel.
   Departing off-signers: vessel → launch → quay → taxi → airport by the check-in deadline.
   `launch` is null when the vessel is alongside (no launch leg). */
function trPlanTransfers(status, port, launch) {
  const taxi = TR_BUFFERS.taxiMin[port] ?? 30;
  const transit = trLaunchTransitMin(launch);
  if (status.direction === 'arriving') {
    const pickup = trAddMinutes(status.estimated, TR_BUFFERS.bagsAndImmigrationMin);
    const quay = trAddMinutes(pickup, taxi);
    const legs = [
      { label: 'Flight lands', time: status.estimated, note: status.delayMin ? 'delayed ' + status.delayMin + ' min' : 'on time' },
      { label: 'Taxi pickup at arrivals', time: pickup, note: TR_BUFFERS.bagsAndImmigrationMin + ' min for bags and immigration' },
      { label: 'Arrive at the quay, ' + port, time: quay, note: taxi + ' min by road' }
    ];
    if (launch) {
      const dep = trAddMinutes(quay, TR_BUFFERS.quayHandoverMin);
      legs.push({ label: 'Launch departs (' + launch.vesselName + ')', time: dep, note: TR_BUFFERS.quayHandoverMin + ' min quay handover' });
      legs.push({ label: 'Alongside the vessel', time: trAddMinutes(dep, transit), note: transit + ' min transit' });
    } else {
      legs.push({ label: 'Board the vessel alongside', time: quay });
    }
    return {
      direction: 'arriving',
      legs: legs,
      summary: 'Taxi pickup ' + pickup + ' at arrivals, timed to ' + status.flight + ' (' + status.estimated + (status.delayMin ? ', delayed ' + status.delayMin + ' min' : '') + ')' +
        (launch ? '; launch ' + launch.vesselName + ' ' + legs[3].time + ' from the quay' : '') + '.'
    };
  }
  /* Departing — work back from the check-in deadline. */
  const atAirport = trAddMinutes(status.estimated, -TR_BUFFERS.checkInBeforeDepartureMin);
  const taxiPickup = trAddMinutes(atAirport, -taxi);
  const legs = [];
  if (launch) {
    const quayArrive = trAddMinutes(taxiPickup, -TR_BUFFERS.quayHandoverMin);
    const launchDep = trAddMinutes(quayArrive, -transit);
    legs.push({ label: 'Launch leaves the vessel (' + launch.vesselName + ')', time: launchDep, note: transit + ' min transit' });
    legs.push({ label: 'Ashore at the quay, ' + port, time: quayArrive, note: TR_BUFFERS.quayHandoverMin + ' min quay handover' });
  } else {
    legs.push({ label: 'Leave the vessel alongside, ' + port, time: taxiPickup });
  }
  legs.push({ label: 'Taxi pickup at the quay', time: taxiPickup, note: taxi + ' min by road' });
  legs.push({ label: 'At the airport', time: atAirport, note: TR_BUFFERS.checkInBeforeDepartureMin + ' min before departure' });
  legs.push({ label: 'Flight departs', time: status.estimated, note: status.delayMin ? 'delayed ' + status.delayMin + ' min' : 'on time' });
  return {
    direction: 'departing',
    legs: legs,
    summary: (launch ? 'Launch ' + launch.vesselName + ' leaves the vessel ' + legs[0].time + '; ' : '') +
      'taxi ' + taxiPickup + ' from the quay for ' + status.flight + ' departing ' + status.estimated + (status.delayMin ? ' (delayed ' + status.delayMin + ' min)' : '') + '.'
  };
}
/* Launch operators and their home ports come from the shared roster (entries carrying a .launch block). */
function trLaunchSuppliers(list) { return list.filter((s) => s.launch !== undefined); }
function trLaunchPorts(list) {
  const ports = [];
  trLaunchSuppliers(list).forEach((s) => { if (!ports.includes(s.launch.port)) ports.push(s.launch.port); });
  return ports;
}
/* Ports the letters cover in this proof of concept. */
const CC_PORTS = ['Aberdeen', 'Peterhead', 'Montrose'];
/* Taxis run to every port the crew change covers; launches only to some of them. */
function ccTaxiPorts(launchPorts) {
  return TR_TRANSFER_PORTS.filter((p) => CC_PORTS.includes(p) || launchPorts.includes(p));
}
const CC_VESSELS = [
  { id: 'caledonian-star', name: 'MV Caledonian Star', port: 'Aberdeen' },
  { id: 'boreal', name: 'MV Boreal', port: 'Peterhead' },
  { id: 'granite-coast', name: 'MV Granite Coast', port: 'Aberdeen' }
];
const CC_ILLUSTRATIVE_NOTICE = 'Illustrative — do not enter real passport data in this proof of concept.';
const CC_FLOW = [
  { title: 'The platform holds the templates', body: 'One template per letter, kept current by GAC. You never start from a blank page or an old email attachment.' },
  { title: 'You fill them in', body: 'One letter per crew member, details as printed in the passport, vessel and port as on the call, flights as on the itinerary.' },
  { title: 'GAC endorses or routes, then returns', body: 'LOIs are signed by GAC as agents and sent back. Repatriation letters go to UK Border Force for endorsement and come back endorsed.' }
];
const CC_CHECKLIST = [
  { title: 'Visa national, or EEA / visa-waiver?', body: 'An LOI is only needed for visa-national crew. EEA and visa-waiver nationals travel without one — settle this before anything else.' },
  { title: 'Passport validity against the travel dates', body: 'The passport must be valid for the whole transit and beyond the joining date. An expiry close to the travel dates is a question for the owner, not for the letter.' },
  { title: 'Details from the passport itself', body: 'Family name, forenames, date of birth, nationality and passport number exactly as printed — never retyped from a crew list.' },
  { title: 'Vessel name and port as on the call', body: 'The letter names the vessel and the port where the crew member joins or leaves, matching the port call on the platform.' },
  { title: 'Flights as on the itinerary', body: 'The arriving flight into the UK for an on-signer; the repatriation flights out for an off-signer — as booked, not as planned.' },
  { title: 'One letter per crew member', body: 'Always. A shared letter for a group is not accepted and slows everyone down at the desk.' }
];
const CC_LOI_NOT_OKTB = 'GAC issues an Immigration Support Letter — a letter of invitation, the LOI — and signs it as agents. GAC does not issue OKTB (“OK to board”) letters: that would take on carrier-style liability. The LOI is what UK carriers and Border Force accept for a visa-national crew member transiting to join.';
const CC_INFORMS_NOT_ADVISES = 'Right of entry is distinct from permission to work aboard inside 12 nautical miles. GAC informs, it does not advise — compliance determinations rest with owners and the attending authorities.';
const CC_LOI_NOT_REQUIRED_NOTE = 'No LOI is required for EEA or visa-waiver nationals. Switch the toggle back on for a visa-national crew member.';
const CC_REPAT_INTRO = 'UK Border Force endorses the disembarkation letter as written leave to enter, so the crew member can travel home through the UK. GAC prepares it from your template, sends it to UKBF for endorsement and returns the endorsed letter to you.';
const CC_REPAT_QUESTION = 'Did the crew member join the vessel outside the UK, or has the vessel called at any non-UK port since they joined?';
const CC_STAGE_NOTES = {
  'Submitted by client': 'Template completed on the platform.',
  'GAC checking': 'Details checked against the passport; vessel checked against the registry.',
  'Endorsed by GAC — signed as agents': 'Letter issued and signed by your GAC agent, as agents.',
  'Prepared by GAC': 'Letter prepared from your template by your GAC agent.',
  'Sent to UK Border Force for endorsement': 'With UKBF for endorsement as written leave to enter.',
  'Endorsed by UKBF': 'Endorsed by UK Border Force.',
  'Returned to client': 'Endorsed letter back with you.'
};
/* Obviously fictional prefills. */
const CC_LOI_DEMO_FORM = {
  familyName: 'Demo', forenames: 'Crew Member', nationality: 'Demo nationality', dateOfBirth: '01/01/1990',
  passportNumber: 'X0000000', passportExpiry: '01/01/2030', vesselId: 'caledonian-star', port: 'Aberdeen',
  joiningDate: '22/08/2026', arrivingFlight: 'XX 000 · arriving Aberdeen 22/08/2026 14:35', visaNational: true
};
const CC_REPAT_DEMO_FORM = {
  familyName: 'Demo', forenames: 'Crew Member', dateOfBirth: '01/01/1990', nationality: 'Demo nationality',
  passportNumber: 'X0000000', vesselId: 'caledonian-star', port: 'Aberdeen', disembarkationDate: '22/08/2026',
  joinedOutsideUk: '', flights: ['XX 001 · Aberdeen → London 23/08/2026 07:10', '', '']
};

/* ---------- stage machines and validation (src/lib/crewChange.ts, verbatim) ---------- */
const CC_LOI_STAGES = ['Submitted by client', 'GAC checking', 'Endorsed by GAC — signed as agents', 'Returned to client'];
const CC_REPAT_STAGES = ['Submitted by client', 'Prepared by GAC', 'Sent to UK Border Force for endorsement', 'Endorsed by UKBF', 'Returned to client'];
function ccStagesFor(kind) { return kind === 'loi' ? CC_LOI_STAGES : CC_REPAT_STAGES; }
function ccStageIndex(kind, stage) { return ccStagesFor(kind).indexOf(stage); }
function ccNextStage(kind, stage) {
  const stages = ccStagesFor(kind);
  const i = ccStageIndex(kind, stage);
  if (i === -1) return stages[0];
  return stages[Math.min(i + 1, stages.length - 1)];
}
function ccIsTerminalStage(kind, stage) { const stages = ccStagesFor(kind); return stage === stages[stages.length - 1]; }
function ccStageTone(kind, stage) { return ccIsTerminalStage(kind, stage) ? 'verified' : 'info'; }
/* Each simulate button covers what one party does in one go, so a click may move two stages. */
function ccSimulateAction(kind, stage) {
  if (kind === 'loi') {
    switch (stage) {
      case 'Submitted by client': return { label: 'Simulate: GAC checks and endorses', steps: 2 };
      case 'GAC checking': return { label: 'Simulate: GAC endorses as agents', steps: 1 };
      case 'Endorsed by GAC — signed as agents': return { label: 'Simulate: GAC returns the letter', steps: 1 };
      default: return null;
    }
  }
  switch (stage) {
    case 'Submitted by client': return { label: 'Simulate: GAC prepares and sends to UKBF', steps: 2 };
    case 'Prepared by GAC': return { label: 'Simulate: GAC sends to UKBF', steps: 1 };
    case 'Sent to UK Border Force for endorsement': return { label: 'Simulate: UKBF endorses and returns', steps: 2 };
    case 'Endorsed by UKBF': return { label: 'Simulate: UKBF returns the letter', steps: 1 };
    default: return null;
  }
}
function ccLoiRequired(visaNational) { return visaNational; }
/* 'DEMO, Crew Member' — family name in capitals, forenames as given. */
function ccFormatCrewName(familyName, forenames) {
  const family = String(familyName || '').trim().toUpperCase();
  const given = String(forenames || '').trim();
  if (!family) return given;
  if (!given) return family;
  return family + ', ' + given;
}
const CC_MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
function ccUtcDate(y, m, d) {
  if (m < 0 || m > 11 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m || date.getUTCDate() !== d) return null;
  return date;
}
/* Lenient date parser: ISO, British numeric, day-month-name-year. Null when unparseable. */
function ccParseDateText(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (m) return ccUtcDate(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  if (m) return ccUtcDate(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  m = /^(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})$/.exec(t);
  if (m) {
    const month = CC_MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (month === undefined) return null;
    return ccUtcDate(Number(m[3]), month, Number(m[1]));
  }
  return null;
}
const CC_LOI_REQUIRED = [
  ['familyName', 'Family name'], ['forenames', 'Forenames'], ['nationality', 'Nationality'], ['dateOfBirth', 'Date of birth'],
  ['passportNumber', 'Passport number'], ['passportExpiry', 'Passport expiry'], ['vesselId', 'Vessel'], ['port', 'Port'],
  ['joiningDate', 'Joining on or around'], ['arrivingFlight', 'Arriving flight']
];
const CC_REPAT_REQUIRED = [
  ['familyName', 'Family name'], ['forenames', 'Forenames'], ['dateOfBirth', 'Date of birth'], ['nationality', 'Nationality'],
  ['passportNumber', 'Passport number'], ['vesselId', 'Vessel'], ['port', 'Disembarkation port'], ['disembarkationDate', 'Disembarkation date']
];
function ccBlank(v) { return typeof v !== 'string' || v.trim() === ''; }
function ccValidateLoi(form) {
  const problems = [];
  CC_LOI_REQUIRED.forEach((pair) => { if (ccBlank(form[pair[0]])) problems.push(pair[1]); });
  const expiry = ccParseDateText(form.passportExpiry);
  const joining = ccParseDateText(form.joiningDate);
  if (expiry && joining && expiry.getTime() <= joining.getTime()) problems.push('Passport expiry must be after the joining date');
  return problems;
}
function ccValidateRepat(form) {
  const problems = [];
  CC_REPAT_REQUIRED.forEach((pair) => { if (ccBlank(form[pair[0]])) problems.push(pair[1]); });
  if (form.joinedOutsideUk !== 'yes' && form.joinedOutsideUk !== 'no') problems.push('Joined outside the UK / called at a non-UK port (Yes or No)');
  if (!form.flights.some((f) => !ccBlank(f))) problems.push('Repatriation flights (at least one)');
  return problems;
}
function ccIsRecord(v) { return typeof v === 'object' && v !== null; }
function ccIsLoiForm(v) {
  if (!ccIsRecord(v)) return false;
  return CC_LOI_REQUIRED.every((pair) => typeof v[pair[0]] === 'string') && typeof v.visaNational === 'boolean';
}
function ccIsRepatForm(v) {
  if (!ccIsRecord(v)) return false;
  return CC_REPAT_REQUIRED.every((pair) => typeof v[pair[0]] === 'string') &&
    (v.joinedOutsideUk === 'yes' || v.joinedOutsideUk === 'no' || v.joinedOutsideUk === '') &&
    Array.isArray(v.flights) && v.flights.every((f) => typeof f === 'string');
}
/* Storage reads are defensive: a malformed entry is dropped, never a crash. */
function ccIsCrewRequest(v) {
  if (!ccIsRecord(v)) return false;
  if (typeof v.id !== 'string' || typeof v.createdAt !== 'string') return false;
  if (typeof v.stage !== 'string') return false;
  if (v.kind === 'loi') return ccIsLoiForm(v.form) && ccStageIndex('loi', v.stage) !== -1;
  if (v.kind === 'repat') return ccIsRepatForm(v.form) && ccStageIndex('repat', v.stage) !== -1;
  return false;
}
/* 'Mon 18 Aug · 09:41' */
function ccStampLabel(d) {
  const dt = d || new Date();
  const day = dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return day + ' · ' + time;
}

/* ---------- storage (store/crewChange.ts) — 'pres.' prefix keeps clear of the site's own keys ---------- */
const CC_KEY_REQUESTS = 'pres.crewChange.requests';
const CC_KEY_SEQ = 'pres.crewChange.seq';

/* ---------- style strings (inline, palette from 02) ---------- */
const CC_CARD = 'background:#FFFFFF;border:1px solid #E5EAF1;border-radius:10px;box-shadow:0 1px 3px rgba(10,37,64,.08),0 4px 14px rgba(10,37,64,.06);padding:20px;';
const CC_PILL = 'display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:3px 10px;font-size:11.5px;font-weight:700;letter-spacing:.02em;';
const CC_PILL_TONE = {
  verified: 'background:#E7F4EF;color:#047857;',
  info: 'background:#E8F1F7;color:#0E5E8A;',
  warn: 'background:#FBF0E1;color:#B45309;',
  danger: 'background:#FBEAEA;color:#B91C1C;',
  neutral: 'background:#FAFBFD;color:#33475F;border:1px solid #CBD6E2;'
};
const CC_CHIP = 'min-height:36px;border-radius:999px;padding:6px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;';
const CC_CHIP_ON = 'background:#0A2540;border:1.5px solid #0A2540;color:#FFFFFF;';
const CC_CHIP_OFF = 'background:#FFFFFF;border:1.5px solid #CBD6E2;color:#33475F;';
const CC_BTN_PRIMARY = 'background:#0E5E8A;color:#FFFFFF;border:none;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13.5px;cursor:pointer;font-family:inherit;';
const CC_BTN_PRIMARY_OFF = 'background:#E5EAF1;color:#9AA8B8;border:none;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13.5px;cursor:not-allowed;font-family:inherit;';
const CC_BTN_GHOST = 'background:#FFFFFF;color:#0E5E8A;border:1.5px solid #CBD6E2;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13.5px;cursor:pointer;font-family:inherit;';
const CC_BTN_BLOCKED = 'background:#FFFFFF;color:#9AA8B8;border:1.5px solid #E5EAF1;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13.5px;cursor:not-allowed;font-family:inherit;';
const CC_TRACK = 'min-width:150px;flex:1;border-radius:6px;padding:6px 8px;font-size:11.5px;line-height:1.3;list-style:none;margin:0;';
const CC_TRACK_STATE = {
  current: 'border:1px solid #0E5E8A;background:#E8F1F7;font-weight:700;color:#0E5E8A;',
  done: 'border:1px solid #E7F4EF;background:#E7F4EF;color:#047857;',
  pending: 'border:1px solid #E5EAF1;background:#FFFFFF;color:#33475F;'
};
const CC_SWITCH = 'position:relative;width:46px;height:26px;border-radius:999px;border:none;cursor:pointer;flex-shrink:0;padding:0;transition:background .2s;';
const CC_KNOB = 'position:absolute;top:3px;width:20px;height:20px;border-radius:50%;background:#FFFFFF;box-shadow:0 1px 3px rgba(10,37,64,.25);transition:left .2s;display:block;';

/* Presenter's hotel desc folds the availability caveat in; the site shows the
   description and the booking note separately, so split it back out here. */
function ccHotelDesc(desc) { return String(desc || '').replace(/\s*GAC rate indicative and subject to availability[\s\S]*$/, ''); }

(Component._features = Component._features || []).push({
  state() {
    const raw = this._get(CC_KEY_REQUESTS, []);
    const launches = trLaunchSuppliers(this.SUPPLIERS);
    const taxiPorts = ccTaxiPorts(trLaunchPorts(this.SUPPLIERS));
    return {
      /* No section key of its own: state.routeSection mirrors the hash and is the
         one source of truth for which section shows (site: the ?section= param). */
      ccLoi: Object.assign({}, CC_LOI_DEMO_FORM),
      ccLoiProblems: [],
      ccRepat: Object.assign({}, CC_REPAT_DEMO_FORM, { flights: CC_REPAT_DEMO_FORM.flights.slice() }),
      ccRepatProblems: [],
      ccRequests: Array.isArray(raw) ? raw.filter(ccIsCrewRequest) : [],
      /* flight-timed planner (Taxis) — not persisted, same as the site's FlightPlanner state */
      trDirection: 'arriving',
      trFlightNo: 'ZZ 417',
      trPax: '6',
      trPort: taxiPorts[0] || 'Aberdeen',
      trLaunchId: launches.length ? launches[0].id : '',
      trTracked: null,
      trNotFound: null,
      trDelay: 0
    };
  },

  vals(st) {
    const self = this;
    /* The section comes from the hash ('#/launches', '#/crew-change/taxis', the
       retired '#/crew-change/transfers') and from nothing else; a hash with no
       section ('#/crew-change') means the default, as a bare /app/crew-change does
       on the site. */
    const wanted = ccResolveSection(st.routeSection);
    const section = CC_SECTIONS.find((s) => s.id === wanted) || CC_SECTIONS[0];
    /* A retired id in the hash resolved to a live section: tidy the address bar on
       the next tick so what is shared next is the current name (site: CrewChange.tsx
       rewrites ?section=). The rewritten hash resolves to itself, so this settles
       after one pass.
       Guarded on the route: state.routeSection is shared by every screen that
       has sections, so without this a '#/customs/documents' — a section this
       module does not recognise — would be "tidied" to the crew-change default
       and drag the visitor off the screen they asked for. */
    if (st.route === 'crew-change' && st.routeSection && st.routeSection !== wanted) {
      setTimeout(() => {
        if (self.state.routeSection !== st.routeSection) return;
        ccWriteHash(wanted);
        self.setState({ routeSection: wanted });
      }, 0);
    }
    /* Switching section: rewrite the hash in place, then re-render on the new
       routeSection (site: setSection). With moveFocus, send focus to the
       destination's chip — a cross-link swaps the whole section body out from
       under the button that was clicked, and the chip stays mounted and carries
       aria-pressed, which announces where the visitor has landed (site:
       CrewChange.tsx setSection(id, true)). */
    const goSection = (id, moveFocus) => {
      ccWriteHash(id);
      self.setState({ routeSection: id });
      if (moveFocus) setTimeout(() => { const el = document.getElementById('crew-chip-' + id); if (el) el.focus(); }, 0);
    };

    /* --- helpers bound to the instance --- */
    const setLoi = (patch) => self.setState({ ccLoi: Object.assign({}, self.state.ccLoi, patch) });
    const setRepat = (patch) => self.setState({ ccRepat: Object.assign({}, self.state.ccRepat, patch) });
    const saveRequests = (list) => { self._set(CC_KEY_REQUESTS, list); self.setState({ ccRequests: list }); };
    const nextId = (kind) => {
      const seq = (self._get(CC_KEY_SEQ, 0) || 0) + 1;
      self._set(CC_KEY_SEQ, seq);
      return (kind === 'loi' ? 'LOI' : 'REP') + '-' + String(seq).padStart(4, '0');
    };
    const addRequest = (kind, form) => {
      const request = { id: nextId(kind), createdAt: ccStampLabel(), kind: kind, form: form, stage: 'Submitted by client' };
      saveRequests([request].concat(self.state.ccRequests));
      return request.id;
    };
    const advance = (id, steps) => {
      const list = self.state.ccRequests.map((r) => {
        if (r.id !== id) return r;
        let stage = r.stage;
        for (let i = 0; i < Math.max(1, steps || 1); i += 1) stage = ccNextStage(r.kind, stage);
        return Object.assign({}, r, { stage: stage });
      });
      saveRequests(list);
    };
    const vesselChange = (setter) => (e) => {
      const id = e.target.value;
      const v = CC_VESSELS.find((x) => x.id === id);
      const patch = { vesselId: id };
      if (v && CC_PORTS.includes(v.port)) patch.port = v.port;
      setter(patch);
    };
    const textField = (form, setter, key, label, placeholder) => ({
      key: key, label: label, value: form[key] || '', placeholder: placeholder || '',
      on: (e) => { const p = {}; p[key] = e.target.value; setter(p); }
    });

    /* --- section strip --- */
    const ccSections = CC_SECTIONS.map((s) => ({
      label: s.label, chipId: 'crew-chip-' + s.id,
      pressed: s.id === section.id ? 'true' : 'false',
      style: CC_CHIP + (s.id === section.id ? CC_CHIP_ON : CC_CHIP_OFF),
      on: () => goSection(s.id)
    }));

    /* --- taxis: flight-timed planner (CrewChange.tsx FlightPlanner) --- */
    const launches = trLaunchSuppliers(self.SUPPLIERS);
    const taxiPorts = ccTaxiPorts(trLaunchPorts(self.SUPPLIERS));
    const taxis = self.SUPPLIERS.filter((s) => s.cat === 'Taxis');
    const launchesHere = launches.filter((l) => l.launch.port === st.trPort);
    const trLaunchSup = st.trLaunchId === '' ? null : (launchesHere.find((l) => l.id === st.trLaunchId) || null);
    const trStatus = st.trTracked ? trTrackFlight(st.trTracked.flight, st.trDelay) : null;
    const trPlan = trStatus ? trPlanTransfers(trStatus, st.trPort, trLaunchSup ? trLaunchSup.launch : null) : null;
    const trPaxN = Math.max(1, Math.floor(Number(st.trPax) || 1));
    const trTaxi = taxis.find((t) => (st.trPort === 'Macduff' ? t.id === 'deveron-cabs' : t.id === 'regent-quay-cars')) || taxis[0] || null;
    const trSuggestions = Object.keys(TR_DEMO_FLIGHTS).map((k) => TR_DEMO_FLIGHTS[k]).filter((f) => f.direction === st.trDirection);
    const trTrack = () => {
      const found = trTrackFlight(self.state.trFlightNo);
      if (!found) { self.setState({ trTracked: null, trNotFound: self.state.trFlightNo.trim() || 'that flight' }); return; }
      self.setState({ trNotFound: null, trDelay: 0, trDirection: found.direction, trTracked: found });
    };
    const trPickDirection = (d) => {
      /* Offer a matching demo flight so the button always has something to track. */
      const first = Object.keys(TR_DEMO_FLIGHTS).map((k) => TR_DEMO_FLIGHTS[k]).find((f) => f.direction === d);
      self.setState({ trDirection: d, trTracked: null, trNotFound: null, trDelay: 0, trFlightNo: first ? first.flight : self.state.trFlightNo });
    };
    const trSend = () => {
      if (!trPlan || !trStatus) return;
      const who = trPaxN + ' ' + (trPaxN === 1 ? 'crew member' : 'crew');
      self.toastMsg('Transport request sent — ' + who + ', ' + trStatus.flight + ' ' + trStatus.route + '. ' + trPlan.summary +
        ' Taxi ' + (trTaxi ? trTaxi.name : 'operator') + (trLaunchSup ? ', launch ' + trLaunchSup.name : '') + ' — both hold the flight and re-time on a delay.');
    };
    const trLegs = trPlan ? trPlan.legs.map((leg, i) => ({
      n: String(i + 1), label: leg.label, hasNote: !!leg.note, note: leg.note ? '· ' + leg.note : '',
      time: leg.time, testId: 'leg-' + i,
      style: 'display:flex;align-items:baseline;justify-content:space-between;gap:12px;font-size:13px;padding-bottom:6px;' + (i === trPlan.legs.length - 1 ? '' : 'border-bottom:1px dashed #E5EAF1;')
    })) : [];

    /* --- taxis: the operator cards (CrewChange.tsx TaxiOperators) — request opens the shared quote-request modal --- */
    const ccTaxis = taxis.map((t) => {
      const status = self.deriveStatus(t);
      const blocked = status === 'blocked';
      return {
        id: t.id, testId: 'taxi-' + t.id, status: status, name: t.name,
        ratingLabel: t.rating.toFixed(1) + ' ★', ratingCountLabel: '· ' + t.ratingCount + (t.ratingCount === 1 ? ' rating' : ' ratings'),
        statusLabel: blocked ? '✗ Booking blocked' : (status === 'due' ? '⚠ Renewal due' : '✓ GAC Verified'),
        statusStyle: CC_PILL + (blocked ? CC_PILL_TONE.danger : (status === 'due' ? CC_PILL_TONE.warn : CC_PILL_TONE.verified)),
        desc: t.desc, facts: t.facts || [], hasFacts: !!(t.facts && t.facts.length),
        bookingNote: t.bookingNote || '', hasNote: !!t.bookingNote,
        bookable: !blocked, blocked: blocked, bookTestId: 'book-' + t.id,
        actionAria: 'Request taxi from ' + t.name,
        onBook: () => self._requestQuote(t),
        onOpen: () => self.nav('supplier/' + t.id)
      };
    });

    /* --- hotels (SVS status derived from the certs, blocking enforced in the action) --- */
    const ccHotels = self.SUPPLIERS.filter((s) => s.cat === 'Hotels').map((h) => {
      const status = self.deriveStatus(h);
      const blocked = status === 'blocked';
      return {
        id: h.id, testId: 'hotel-' + h.id, status: status, name: h.name,
        ratingLabel: h.rating.toFixed(1) + ' ★', ratingCountLabel: '· ' + h.ratingCount + (h.ratingCount === 1 ? ' rating' : ' ratings'),
        statusLabel: blocked ? '✗ Booking blocked' : (status === 'due' ? '⚠ Renewal due' : '✓ GAC Verified'),
        statusStyle: CC_PILL + (blocked ? CC_PILL_TONE.danger : (status === 'due' ? CC_PILL_TONE.warn : CC_PILL_TONE.verified)),
        desc: ccHotelDesc(h.desc), caveat: self.HOTEL_CAVEAT,
        bookable: !blocked, blocked: blocked, bookTestId: 'book-' + h.id,
        actionLabel: blocked ? 'Unavailable' : 'Request booking',
        actionStyle: blocked ? CC_BTN_BLOCKED : CC_BTN_PRIMARY,
        actionAria: blocked ? (h.name + ' unavailable — blocked by SVS') : ('Request booking at ' + h.name),
        actionTitle: blocked ? 'Blocked by SVS — compliance evidence required' : '',
        onBook: () => self._requestQuote(h),
        onOpen: () => self.nav('supplier/' + h.id)
      };
    });

    /* --- LOI template --- */
    const loi = st.ccLoi;
    const loiRequired = ccLoiRequired(loi.visaNational);
    const ccLoiFieldsA = [
      textField(loi, setLoi, 'familyName', 'Family name (as in passport)'),
      textField(loi, setLoi, 'forenames', 'Forenames (as in passport)'),
      textField(loi, setLoi, 'nationality', 'Nationality'),
      textField(loi, setLoi, 'dateOfBirth', 'Date of birth', 'DD/MM/YYYY'),
      textField(loi, setLoi, 'passportNumber', 'Passport number'),
      textField(loi, setLoi, 'passportExpiry', 'Passport expiry', 'DD/MM/YYYY')
    ];
    const ccLoiFieldsB = [
      textField(loi, setLoi, 'joiningDate', 'Joining on or around', 'DD/MM/YYYY'),
      textField(loi, setLoi, 'arrivingFlight', 'Arriving flight (as on the itinerary)')
    ];
    const ccLoiSubmit = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      const form = self.state.ccLoi;
      if (!ccLoiRequired(form.visaNational)) return;
      const found = ccValidateLoi(form);
      self.setState({ ccLoiProblems: found });
      if (found.length > 0) return;
      addRequest('loi', Object.assign({}, form));
      self.toastMsg('LOI request submitted for ' + ccFormatCrewName(form.familyName, form.forenames) + ' — your GAC agent checks the details against the passport and endorses the letter as agents.');
      self.setState({ ccLoi: Object.assign({}, CC_LOI_DEMO_FORM) });
    };
    const stageList = (kind) => ccStagesFor(kind).map((s, i) => ({ n: String(i + 1), label: s, note: CC_STAGE_NOTES[s] || '' }));

    /* --- repatriation template --- */
    const rep = st.ccRepat;
    const ccRepatFieldsA = [
      textField(rep, setRepat, 'familyName', 'Family name (as in passport)'),
      textField(rep, setRepat, 'forenames', 'Forenames (as in passport)'),
      textField(rep, setRepat, 'dateOfBirth', 'Date of birth', 'DD/MM/YYYY'),
      textField(rep, setRepat, 'nationality', 'Nationality'),
      textField(rep, setRepat, 'passportNumber', 'Passport number')
    ];
    const ccRepatFieldsB = [
      textField(rep, setRepat, 'disembarkationDate', 'Disembarkation date', 'DD/MM/YYYY')
    ];
    const ccRepatYesNo = ['yes', 'no'].map((v) => ({
      label: v === 'yes' ? 'Yes' : 'No', pressed: rep.joinedOutsideUk === v ? 'true' : 'false',
      style: CC_CHIP + (rep.joinedOutsideUk === v ? CC_CHIP_ON : CC_CHIP_OFF),
      on: () => setRepat({ joinedOutsideUk: v })
    }));
    const ccRepatFlights = rep.flights.map((f, i) => ({
      label: 'Flight ' + (i + 1), value: f, placeholder: 'Flight ' + (i + 1),
      on: (e) => { const flights = self.state.ccRepat.flights.slice(); flights[i] = e.target.value; setRepat({ flights: flights }); }
    }));
    const ccRepatSubmit = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      const form = self.state.ccRepat;
      const found = ccValidateRepat(form);
      self.setState({ ccRepatProblems: found });
      if (found.length > 0) return;
      addRequest('repat', Object.assign({}, form, { flights: form.flights.slice() }));
      self.toastMsg('Repatriation letter request submitted for ' + ccFormatCrewName(form.familyName, form.forenames) + ' — your GAC agent prepares the letter and sends it to UK Border Force for endorsement.');
      self.setState({ ccRepat: Object.assign({}, CC_REPAT_DEMO_FORM, { flights: CC_REPAT_DEMO_FORM.flights.slice() }) });
    };

    /* --- requests list --- */
    const requests = st.ccRequests;
    const inProgress = requests.filter((r) => !ccIsTerminalStage(r.kind, r.stage)).length;
    const ccRequests = requests.map((r) => {
      const vessel = CC_VESSELS.find((v) => v.id === r.form.vesselId);
      const action = ccSimulateAction(r.kind, r.stage);
      const terminal = ccIsTerminalStage(r.kind, r.stage);
      const current = ccStageIndex(r.kind, r.stage);
      const tone = ccStageTone(r.kind, r.stage);
      return {
        id: r.id, testId: 'crew-request-' + r.id, kind: r.kind, stage: r.stage,
        kindLabel: r.kind === 'loi' ? 'LOI' : 'Repat',
        meta: r.id + ' · ' + r.createdAt,
        name: ccFormatCrewName(r.form.familyName, r.form.forenames),
        line: (vessel ? vessel.name : '—') + ' · ' + r.form.port + ' · ' + (r.kind === 'loi' ? 'Joining ' + r.form.joiningDate : 'Disembarking ' + r.form.disembarkationDate),
        stageLabel: (terminal ? '✓ ' : '') + r.stage,
        stageStyle: CC_PILL + CC_PILL_TONE[tone] + 'white-space:normal;',
        tracker: ccStagesFor(r.kind).map((s, i) => {
          const state = i < current ? 'done' : (i === current ? 'current' : 'pending');
          return {
            label: s, state: state,
            mark: state === 'done' ? '✓' : (state === 'current' ? '●' : '○'),
            sr: state === 'done' ? ' (done)' : (state === 'current' ? ' (current)' : ' (pending)'),
            style: CC_TRACK + CC_TRACK_STATE[state]
          };
        }),
        hasAction: !!action, actionLabel: action ? action.label : '',
        onAdvance: () => { if (action) advance(r.id, action.steps); },
        terminal: terminal,
        onDownload: () => self.toastMsg('Illustrative — the endorsed letter would download here as a PDF.'),
        note: CC_STAGE_NOTES[r.stage] || ''
      };
    });

    return {
      /* header + flow */
      ccFlow: CC_FLOW,
      /* section strip */
      ccSections: ccSections,
      ccSectionId: section.id, ccSectionLabel: section.label, ccSectionSummary: section.summary,
      ccIsHotels: section.id === 'hotels', ccIsTaxis: section.id === 'taxis', ccIsLaunches: section.id === 'launches',
      ccIsImmigration: section.id === 'immigration', ccIsLoi: section.id === 'loi', ccIsRepat: section.id === 'repat',
      /* dashboard "Plan taxis" / "Book a launch" — open Crew change straight on that
         section (site: ?section=taxis / ?section=launches). The hash is the only
         record of the section, so a plain "Open crew change" ('#/crew-change',
         no section) afterwards lands on Hotels, as a bare /app/crew-change does. */
      goTaxis: self._go('crew-change/taxis'),
      goLaunches: self._go('crew-change/launches'),
      /* hotels */
      ccHotels: ccHotels,
      /* taxis — flight-timed planner */
      trIntro: CC_TAXIS_INTRO,
      trDirections: TR_DIRECTIONS.map((d) => ({
        label: d.label, hint: '· ' + d.hint, testId: 'direction-' + d.id,
        pressed: st.trDirection === d.id ? 'true' : 'false',
        style: 'min-height:34px;border-radius:999px;padding:5px 12px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;' + (st.trDirection === d.id ? CC_CHIP_ON : CC_CHIP_OFF),
        on: () => trPickDirection(d.id)
      })),
      trFlightNo: st.trFlightNo,
      onTrFlightNo: (e) => self.setState({ trFlightNo: e.target.value }),
      trPax: st.trPax,
      onTrPax: (e) => self.setState({ trPax: e.target.value }),
      onTrPaxBlur: () => { const t = String(Math.max(1, Math.floor(Number(self.state.trPax) || 1))); if (t !== self.state.trPax) self.setState({ trPax: t }); },
      trPorts: taxiPorts.map((p) => ({ value: p, label: p })),
      trPort: st.trPort,
      onTrPort: (e) => {
        const port = e.target.value;
        const first = launches.find((l) => l.launch.port === port);
        self.setState({ trPort: port, trLaunchId: first ? first.id : '' });
      },
      trLaunchOptions: launchesHere.map((l) => ({ value: l.id, label: l.launch.vesselName + ' · ' + l.name + ' · ' + l.launch.transit })),
      trLaunchId: st.trLaunchId,
      onTrLaunch: (e) => self.setState({ trLaunchId: e.target.value }),
      trSuggestions: trSuggestions.map((f, i) => ({
        sep: i ? ' · ' : '', flight: f.flight, tail: ' ' + f.route + ' ' + f.scheduled,
        on: () => self.setState({ trFlightNo: f.flight })
      })),
      trTrack: trTrack,
      trHasStatus: !!(trStatus && trPlan),
      trDelayBtnLabel: st.trDelay ? 'Simulate: back on time' : 'Simulate: flight delayed ' + TR_BUFFERS.simulatedDelayMin + ' min',
      trToggleDelay: () => self.setState({ trDelay: self.state.trDelay ? 0 : TR_BUFFERS.simulatedDelayMin }),
      trFeedNote: TR_FLIGHT_FEED_NOTE,
      trNotFound: !!st.trNotFound,
      trNotFoundText: 'The feed does not know ' + (st.trNotFound || 'that flight') + '. Check the number, or pick one of the demo flights above — in production your agent times the transport from the itinerary instead.',
      trFlight: trStatus ? trStatus.flight : '',
      trPhase: trStatus ? trStatus.phase : '',
      trPhaseLabel: trStatus ? TR_PHASE_LABEL[trStatus.phase] : '',
      trPhaseStyle: CC_PILL + (trStatus ? CC_PILL_TONE[TR_PHASE_TONE[trStatus.phase]] : ''),
      trRoute: trStatus ? trStatus.route : '',
      trScheduledLabel: trStatus ? 'Scheduled ' + (trStatus.direction === 'arriving' ? 'landing' : 'departure') : '',
      trScheduled: trStatus ? trStatus.scheduled : '',
      trEstimated: trStatus ? trStatus.estimated : '',
      trHasDelay: !!(trStatus && trStatus.delayMin),
      trDelayText: trStatus && trStatus.delayMin ? '+' + trStatus.delayMin + ' min' : '',
      trLegs: trLegs,
      trTaxiName: trTaxi ? trTaxi.name : '',
      trHasLaunch: !!trLaunchSup,
      trLaunchName: trLaunchSup ? trLaunchSup.name : '',
      trLaunchDetail: trLaunchSup
        ? '(' + trLaunchSup.launch.vesselName + ', max ' + trLaunchSup.launch.maxPassengers + ' passengers' + (trPaxN > trLaunchSup.launch.maxPassengers ? ' — ' + trPaxN + ' needs more than one run' : '') + ')'
        : '',
      trSend: trSend,
      /* the two pointers — each section names the other rather than duplicating it
         (site: TAXIS_LAUNCH_POINTER / LAUNCHES_TAXI_POINTER, both with a button
         that switches section and leaves focus on the destination chip) */
      trLaunchPointer: CC_TAXIS_LAUNCH_POINTER,
      openLaunches: () => goSection('launches', true),
      ccLaunchesTaxiPointer: CC_LAUNCHES_TAXI_POINTER,
      openTaxis: () => goSection('taxis', true),
      /* taxis — the operator cards */
      ccTaxis: ccTaxis,
      /* immigration */
      ccChecklist: CC_CHECKLIST, ccLoiNotOktb: CC_LOI_NOT_OKTB, ccInformsNotAdvises: CC_INFORMS_NOT_ADVISES,
      /* LOI */
      ccIllustrative: CC_ILLUSTRATIVE_NOTICE,
      ccLoiVisaAria: loi.visaNational ? 'true' : 'false',
      ccLoiVisaTrack: CC_SWITCH + (loi.visaNational ? 'background:#0E5E8A;' : 'background:#CBD6E2;'),
      ccLoiVisaKnob: CC_KNOB + (loi.visaNational ? 'left:23px;' : 'left:3px;'),
      ccLoiToggleVisa: () => setLoi({ visaNational: !self.state.ccLoi.visaNational }),
      ccLoiNotRequired: !loiRequired, ccLoiNotRequiredNote: CC_LOI_NOT_REQUIRED_NOTE,
      ccLoiFieldsDisabled: !loiRequired,
      ccLoiFieldsA: ccLoiFieldsA, ccLoiFieldsB: ccLoiFieldsB,
      ccLoiVessel: loi.vesselId, onCcLoiVessel: vesselChange(setLoi),
      ccLoiPort: loi.port, onCcLoiPort: (e) => setLoi({ port: e.target.value }),
      ccLoiHasProblems: st.ccLoiProblems.length > 0, ccLoiProblems: st.ccLoiProblems.join(' · '),
      ccLoiSubmit: ccLoiSubmit,
      ccLoiSubmitDisabled: !loiRequired,
      ccLoiSubmitStyle: loiRequired ? CC_BTN_PRIMARY : CC_BTN_PRIMARY_OFF,
      ccLoiStages: stageList('loi'),
      /* repat */
      ccRepatFieldsA: ccRepatFieldsA, ccRepatFieldsB: ccRepatFieldsB,
      ccRepatVessel: rep.vesselId, onCcRepatVessel: vesselChange(setRepat),
      ccRepatPort: rep.port, onCcRepatPort: (e) => setRepat({ port: e.target.value }),
      ccRepatQuestion: CC_REPAT_QUESTION, ccRepatYesNo: ccRepatYesNo,
      ccRepatFlights: ccRepatFlights,
      ccRepatHasProblems: st.ccRepatProblems.length > 0, ccRepatProblems: st.ccRepatProblems.join(' · '),
      ccRepatSubmit: ccRepatSubmit,
      ccRepatIntro: CC_REPAT_INTRO,
      ccRepatStages: stageList('repat'),
      /* requests */
      ccRequests: ccRequests,
      ccRequestsCount: 'Requests · ' + requests.length,
      ccRequestsSummary: requests.length === 0 ? 'No requests yet — submit a template above'
        : (inProgress === 0 ? 'All letters returned' : inProgress + ' in progress · ' + (requests.length - inProgress) + ' returned'),
      ccHasRequests: requests.length > 0,
      ccReset: () => { self._set(CC_KEY_REQUESTS, []); self._set(CC_KEY_SEQ, 0); self.setState({ ccRequests: [] }); },
      /* dashboard crew card — live count of letters not yet returned (src/screens/app/Dashboard.tsx);
         overrides the core's static fallback because feature vals are spread after it */
      dashCrewLine: inProgress === 0
        ? 'No letters in progress. Hotels, immigration, LOI and repatriation-letter templates live in one place.'
        : inProgress + (inProgress === 1 ? ' letter' : ' letters') + ' in progress — LOI and repatriation letters on their way through GAC and Border Force.'
    };
  },

  /* The hotel booking opens the core's shared quote-request modal, which the
     core's own Escape handling closes; this module owns no modal of its own. */
  escape() { return false; }
});
