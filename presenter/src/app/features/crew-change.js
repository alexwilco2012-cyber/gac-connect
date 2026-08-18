/* Crew change — presenter mirror of the site's Crew change screen (17 Aug review).
   Feature module: registers state / bindings / Escape handling with the core
   Component via Component._features (see component.js "feature-module
   extension points"). Data it needs lives here too, so app/data.js stays the
   v12 baseline. Mirrors src/screens/app/CrewChange.tsx, src/lib/crewChange.ts,
   src/data/crewChange.ts and src/store/crewChange.ts — copy verbatim, rules
   ported verbatim. All data on this screen is illustrative and fictional. */

/* ---------- copy tables (src/data/crewChange.ts) ---------- */
const CC_SECTIONS = [
  { id: 'hotels', label: 'Hotels', summary: 'Rooms for crew held ashore — off-signers, transit crews, medical stand-downs.' },
  { id: 'immigration', label: 'Immigration', summary: 'What your GAC agent needs before any letter goes out, and what GAC does not do.' },
  { id: 'loi', label: 'LOI (on-signers)', summary: 'Immigration Support Letter for a visa-national crew member joining through the UK — issued and signed by GAC as agents.' },
  { id: 'repat', label: 'Repat letters (off-signers)', summary: 'Disembarkation / repatriation letter for a crew member leaving through the UK — prepared by GAC, endorsed by UK Border Force.' }
];
const CC_PORTS = ['Aberdeen', 'Peterhead', 'Montrose'];
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
    return {
      ccSection: 'hotels',
      ccLoi: Object.assign({}, CC_LOI_DEMO_FORM),
      ccLoiProblems: [],
      ccRepat: Object.assign({}, CC_REPAT_DEMO_FORM, { flights: CC_REPAT_DEMO_FORM.flights.slice() }),
      ccRepatProblems: [],
      ccRequests: Array.isArray(raw) ? raw.filter(ccIsCrewRequest) : []
    };
  },

  vals(st) {
    const self = this;
    const section = CC_SECTIONS.find((s) => s.id === st.ccSection) || CC_SECTIONS[0];

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
      label: s.label, pressed: s.id === section.id ? 'true' : 'false',
      style: CC_CHIP + (s.id === section.id ? CC_CHIP_ON : CC_CHIP_OFF),
      on: () => self.setState({ ccSection: s.id })
    }));

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
      ccIsHotels: section.id === 'hotels', ccIsImmigration: section.id === 'immigration',
      ccIsLoi: section.id === 'loi', ccIsRepat: section.id === 'repat',
      /* hotels */
      ccHotels: ccHotels,
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
