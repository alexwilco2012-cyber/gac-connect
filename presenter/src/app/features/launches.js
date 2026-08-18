/* Launches panel — presenter mirror of the site's LaunchesPanel (17 Aug review;
   owner's follow-up: there is no Launches tab, the panel is the Launches section
   of Crew change, standing next to Taxis rather than stacked under it — see
   partials/56-crew-change.html, which binds everything this module returns; the
   pointer back to the Taxis planner is bound by features/crew-change.js).
   Feature module: registers state / bindings / Escape handling with the core
   Component via Component._features (see component.js "feature-module
   extension points"). Data it needs lives here too, so app/data.js stays the
   v12 baseline.

   Mirrors src/components/LaunchesPanel.tsx, src/components/LaunchRequestModal.tsx
   and src/lib/launches.ts (the fit / runs / summary rules are ported verbatim
   below). Launch operators themselves come from the shared roster
   (this.SUPPLIERS, entries carrying a .launch block). Plan-a-run state is not
   persisted — same as the site. Ports, capacities and times are illustrative. */

/* ---------- data (mirrors src/lib/launches.ts LAUNCH_PORT_NOTES + src/data/vessels.ts) ---------- */
const LAUNCH_PORT_NOTES = {
  Aberdeen: 'Runs from the harbour to the outer anchorage and the inshore fields. Transit is short and notice is usually an hour or less; check capacity against the crew list before booking.',
  Macduff: 'Cover for the Moray Firth anchorages and vessels working the firth. Transits are longer and daylight running is the norm, so plan the return leg with the operator.'
};
const LAUNCH_VESSELS = [
  { id: 'caledonian-star', name: 'MV Caledonian Star', port: 'Aberdeen' },
  { id: 'boreal', name: 'MV Boreal', port: 'Peterhead' },
  { id: 'granite-coast', name: 'MV Granite Coast', port: 'Aberdeen' }
];
const LAUNCH_DEFAULT_PAX = 9;
const LAUNCH_DEFAULT_WINDOW = '4h';

/* ---------- rules (ported verbatim from src/lib/launches.ts) ---------- */
const LAUNCH_LIB = {
  launchSuppliers(list) { return list.filter((s) => s.launch !== undefined); },
  /* Distinct home ports, in order of first appearance in the data. */
  launchPorts(list) {
    const ports = [];
    for (const s of LAUNCH_LIB.launchSuppliers(list)) {
      if (!ports.includes(s.launch.port)) ports.push(s.launch.port);
    }
    return ports;
  },
  launchesAt(list, port) { return LAUNCH_LIB.launchSuppliers(list).filter((s) => s.launch.port === port); },
  /* Runs needed to move `pax` passengers on a launch carrying `maxPassengers` — ceil, never below 1. */
  runsNeeded(maxPassengers, pax) {
    const max = Number.isFinite(maxPassengers) && maxPassengers > 0 ? Math.floor(maxPassengers) : 1;
    const people = Number.isFinite(pax) ? Math.floor(pax) : 0;
    return Math.max(1, Math.ceil(people / max));
  },
  /* Freight wins: a launch that does not carry freight is the wrong launch when
     freight has to go out, however many runs it could make. Then capacity. */
  fitsRun(launch, pax, needsFreight) {
    if (needsFreight && !launch.freightIncluded) return 'no-freight';
    if (LAUNCH_LIB.runsNeeded(launch.maxPassengers, pax) > 1) return 'runs';
    return 'fits';
  },
  /* Pill label for a fit — the same words on every card. */
  fitLabel(fit, runs) {
    if (fit === 'no-freight') return 'No freight';
    if (fit === 'runs') return runs + ' runs needed';
    return 'Fits in one run';
  },
  /* Warning for a request that exceeds the launch's capacity, or undefined when it fits. */
  overCapacityWarning(launch, pax) {
    if (pax <= launch.maxPassengers) return undefined;
    const runs = LAUNCH_LIB.runsNeeded(launch.maxPassengers, pax);
    return pax + ' is over ' + launch.vesselName + '’s ' + launch.maxPassengers + ' passenger limit — this will take ' + runs + ' runs, or choose a larger launch';
  },
  paxPhrase(pax) { return pax + ' ' + (pax === 1 ? 'passenger' : 'passengers'); },
  /* One launch against the requirement, in words — used when nothing fits in a single run. */
  describeFit(launch, pax, needsFreight) {
    const fit = LAUNCH_LIB.fitsRun(launch, pax, needsFreight);
    const runs = LAUNCH_LIB.runsNeeded(launch.maxPassengers, pax);
    const who = launch.vesselName + ' (' + launch.maxPassengers + ')';
    if (fit === 'fits') return who + ' carries ' + LAUNCH_LIB.paxPhrase(pax) + ' in one run';
    if (fit === 'runs') return who + ' needs ' + runs + ' runs for ' + LAUNCH_LIB.paxPhrase(pax);
    return runs > 1
      ? who + ' needs ' + runs + ' runs for ' + LAUNCH_LIB.paxPhrase(pax) + ' and does not carry freight'
      : who + ' does not carry freight';
  },
  /* The live sentence under the plan-a-run card. */
  planSummary(list, port, pax, needsFreight) {
    const launches = LAUNCH_LIB.launchesAt(list, port);
    if (launches.length === 0) return 'No launches are listed at ' + port + '.';
    const fitting = launches.filter((s) => LAUNCH_LIB.fitsRun(s.launch, pax, needsFreight) === 'fits');
    if (fitting.length > 0) {
      const n = fitting.length;
      return n + ' ' + (n === 1 ? 'launch' : 'launches') + ' at ' + port + ' can carry ' + LAUNCH_LIB.paxPhrase(pax) +
        (needsFreight ? ' with freight included' : '') + ' in a single run.';
    }
    const detail = launches.map((s) => LAUNCH_LIB.describeFit(s.launch, pax, needsFreight)).join('; ');
    return 'No launch at ' + port + ' carries ' + LAUNCH_LIB.paxPhrase(pax) + (needsFreight ? ' with freight' : '') + ' in a single run — ' + detail + '.';
  },
  /* "14" → 14; blank / junk → 1; never below 1 (site: Math.max(1, Math.floor(Number(text) || 1))). */
  parsePax(text) { return Math.max(1, Math.floor(Number(text) || 1)); }
};

/* ---------- style strings (inline, palette as the marketplace partial) ---------- */
const LAUNCH_STYLE = {
  pill: 'display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:3px 10px;font-size:11.5px;font-weight:700;letter-spacing:.02em;white-space:nowrap;',
  tone: {
    verified: 'background:#E7F4EF;color:#047857;',
    warn: 'background:#FBF0E1;color:#B45309;',
    danger: 'background:#FBEAEA;color:#B91C1C;',
    neutral: 'background:#FAFBFD;color:#33475F;border:1px solid #CBD6E2;'
  },
  primaryBtn: 'background:#0E5E8A;color:#FFFFFF;border:none;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13.5px;cursor:pointer;white-space:nowrap;min-height:40px;font-family:inherit;',
  disabledBtn: 'background:#FFFFFF;color:#9AA8B8;border:1.5px solid #E5EAF1;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13.5px;cursor:not-allowed;white-space:nowrap;min-height:40px;font-family:inherit;',
  chipBase: 'min-height:34px;border-radius:999px;padding:5px 12px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;',
  chipOn: 'background:#0A2540;border:1.5px solid #0A2540;color:#FFFFFF;',
  chipOff: 'background:#FFFFFF;border:1.5px solid #CBD6E2;color:#33475F;',
  track(on) { return 'position:relative;width:46px;height:26px;border-radius:999px;border:none;cursor:pointer;flex-shrink:0;padding:0;transition:background .2s;' + (on ? 'background:#0E5E8A;' : 'background:#CBD6E2;'); },
  knob(on) { return 'position:absolute;top:3px;width:20px;height:20px;border-radius:50%;background:#FFFFFF;box-shadow:0 1px 3px rgba(10,37,64,.25);transition:left .2s;display:block;' + (on ? 'left:23px;' : 'left:3px;'); },
  advice(tone) {
    return 'border-left:4px solid;border-radius:8px;padding:8px 12px;font-size:12.5px;margin:8px 0 0;' +
      (tone === 'warn' ? 'border-color:#B45309;background:#FBF0E1;color:#B45309;' : (tone === 'info' ? 'border-color:#0E5E8A;background:#E8F1F7;color:#0E5E8A;' : 'border-color:#047857;background:#E7F4EF;color:#047857;'));
  }
};
/* Fit → pill tone, same mapping as the site's FIT_TONE. */
const LAUNCH_FIT_TONE = { fits: 'verified', runs: 'warn', 'no-freight': 'neutral' };

(Component._features = Component._features || []).push({
  state() {
    const ports = LAUNCH_LIB.launchPorts(this.SUPPLIERS);
    return {
      /* plan a run — not persisted (site decision) */
      lnPort: ports[0] || 'Aberdeen',
      lnPaxText: String(LAUNCH_DEFAULT_PAX),
      lnFreight: true,
      /* launch request modal — null while closed; the form starts fresh from the
         plan-a-run defaults every time it opens (site: form remounts per open) */
      lrq: null
    };
  },

  vals(st) {
    const self = this;
    const ports = LAUNCH_LIB.launchPorts(this.SUPPLIERS);
    const pax = LAUNCH_LIB.parsePax(st.lnPaxText);
    const needsFreight = !!st.lnFreight;
    const setLrq = (patch) => this.setState({ lrq: Object.assign({}, this.state.lrq, patch) });
    const closeLrq = () => this.setState({ lrq: null });
    const openLrq = (s) => {
      if (this.deriveStatus(s) === 'blocked') return;
      this.setState({ lrq: {
        id: s.id, vesselId: LAUNCH_VESSELS[0].id,
        paxText: String(LAUNCH_LIB.parsePax(this.state.lnPaxText)), freight: !!this.state.lnFreight,
        freightDetail: '', outTime: 'Fri 06:00', returnTime: 'Fri 10:00', windowId: LAUNCH_DEFAULT_WINDOW
      } });
    };

    /* one card per launch operator */
    const card = (s) => {
      const launch = s.launch;
      const status = this.deriveStatus(s);
      const bookable = status !== 'blocked';
      const fit = LAUNCH_LIB.fitsRun(launch, pax, needsFreight);
      const runs = LAUNCH_LIB.runsNeeded(launch.maxPassengers, pax);
      return {
        id: s.id, name: s.name, desc: s.desc, fit: fit,
        statusLabel: status === 'blocked' ? '✗ Booking blocked' : (status === 'due' ? '⚠ Renewal due' : '✓ GAC Verified'),
        statusStyle: LAUNCH_STYLE.pill + (status === 'blocked' ? LAUNCH_STYLE.tone.danger : (status === 'due' ? LAUNCH_STYLE.tone.warn : LAUNCH_STYLE.tone.verified)),
        fitLabel: LAUNCH_LIB.fitLabel(fit, runs),
        fitStyle: LAUNCH_STYLE.pill + LAUNCH_STYLE.tone[LAUNCH_FIT_TONE[fit]],
        ratingLabel: s.rating.toFixed(1) + ' ★',
        ratingCountLabel: '· ' + s.ratingCount.toLocaleString('en-GB') + (s.ratingCount === 1 ? ' rating' : ' ratings'),
        vesselName: launch.vesselName,
        rows: [
          { k: 'Max capacity', v: launch.maxPassengers + ' passengers' },
          { k: 'Freight', v: launch.freightIncluded ? 'Included ✓' : 'Not included ✗' },
          { k: 'Transit', v: launch.transit },
          { k: 'Availability', v: launch.availability }
        ],
        freightNote: launch.freightNote,
        bookable: bookable, blocked: !bookable,
        onRequest: () => openLrq(s),
        onOpen: () => self.nav('supplier/' + s.id)
      };
    };
    const portSections = ports.map((p) => ({
      port: p, heading: 'Launches from ' + p,
      /* heading id slugged as the site does (a multi-word port must not yield an id with a space) */
      slug: p.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      note: LAUNCH_PORT_NOTES[p] || '', hasNote: !!LAUNCH_PORT_NOTES[p],
      launches: LAUNCH_LIB.launchesAt(this.SUPPLIERS, p).map(card)
    }));

    /* launch request modal */
    const rq = st.lrq;
    const rqSup = rq ? this.SUPPLIERS.find((s) => s.id === rq.id) : null;
    const rqLaunch = rqSup ? rqSup.launch : null;
    const rqPax = rq ? LAUNCH_LIB.parsePax(rq.paxText) : LAUNCH_DEFAULT_PAX;
    const rqRuns = rqLaunch ? LAUNCH_LIB.runsNeeded(rqLaunch.maxPassengers, rqPax) : 1;
    const rqOver = rqLaunch ? LAUNCH_LIB.overCapacityWarning(rqLaunch, rqPax) : undefined;
    const rqWin = rq ? (this.REPLY_WINDOWS.find((w) => w.id === rq.windowId) || this.REPLY_WINDOWS[3]) : this.REPLY_WINDOWS[3];
    const rqAdvice = this._deadlineAdvice(rqWin.hours);
    const rqVessel = rq ? (LAUNCH_VESSELS.find((v) => v.id === rq.vesselId) || LAUNCH_VESSELS[0]) : LAUNCH_VESSELS[0];
    const sendLrq = () => {
      const r = this.state.lrq; if (!r) return;
      const s = this.SUPPLIERS.find((x) => x.id === r.id); if (!s) return;
      const l = s.launch;
      const p = LAUNCH_LIB.parsePax(r.paxText);
      const runs = LAUNCH_LIB.runsNeeded(l.maxPassengers, p);
      const vessel = LAUNCH_VESSELS.find((v) => v.id === r.vesselId) || LAUNCH_VESSELS[0];
      const win = this.REPLY_WINDOWS.find((w) => w.id === r.windowId) || this.REPLY_WINDOWS[3];
      const parts = ['Launch request sent to ' + s.name + ' — ' + vessel.name + ', ' + p + ' ' + (p === 1 ? 'passenger' : 'passengers') + (runs > 1 ? ' (' + runs + ' runs)' : '')];
      if (r.freight) {
        /* The qualifier stays inside the bracket so the sentence reads as one clause:
           "freight (1 pallet, quoted separately)" rather than a second dash (site parity). */
        const detail = (r.freightDetail || '').trim();
        const quals = [detail, l.freightIncluded ? '' : 'quoted separately'].filter(Boolean);
        parts.push('freight' + (quals.length ? ' (' + quals.join(', ') + ')' : ''));
      }
      parts.push(l.port + ' ' + (r.outTime || '').trim() + '–' + (r.returnTime || '').trim());
      this.setState({ lrq: null });
      this.toastMsg(parts.join(', ') + '. Reply-by window: ' + win.label + '.');
    };

    return {
      /* plan a run */
      planPorts: ports.map((p) => ({ value: p, label: p })),
      planPort: st.lnPort,
      onPlanPort: (e) => this.setState({ lnPort: e.target.value }),
      planPaxText: st.lnPaxText,
      onPlanPax: (e) => this.setState({ lnPaxText: e.target.value }),
      /* What is shown is what is computed: a blank or 0 field settles on the
         minimum once the user leaves it, instead of silently reading as 1 (site parity). */
      onPlanPaxBlur: () => {
        const t = String(LAUNCH_LIB.parsePax(this.state.lnPaxText));
        if (t !== this.state.lnPaxText) this.setState({ lnPaxText: t });
      },
      planFreightAria: needsFreight ? 'true' : 'false',
      planFreightTrack: LAUNCH_STYLE.track(needsFreight),
      planFreightKnob: LAUNCH_STYLE.knob(needsFreight),
      togglePlanFreight: () => this.setState({ lnFreight: !this.state.lnFreight }),
      planSummary: LAUNCH_LIB.planSummary(this.SUPPLIERS, st.lnPort, pax, needsFreight),

      /* per-port sections */
      portSections: portSections,

      /* launch request modal (74-launch-request.html) */
      lrqOpen: !!rq,
      lrqName: rqSup ? rqSup.name : '',
      lrqTitle: rqSup ? 'Request launch — ' + rqSup.name : '',
      lrqSummary: rqLaunch
        ? rqLaunch.vesselName + ' from ' + rqLaunch.port + ' · max ' + rqLaunch.maxPassengers + ' passengers · freight ' + (rqLaunch.freightIncluded ? 'included' : 'not included') + '. The operator quotes against the deadline you set.'
        : '',
      lrqVessels: LAUNCH_VESSELS.map((v) => ({ id: v.id, label: v.name + ' · ' + v.port })),
      lrqVesselId: rq ? rq.vesselId : LAUNCH_VESSELS[0].id,
      onLrqVessel: (e) => setLrq({ vesselId: e.target.value }),
      lrqPaxText: rq ? rq.paxText : '',
      onLrqPax: (e) => setLrq({ paxText: e.target.value }),
      onLrqPaxBlur: () => {
        const r = this.state.lrq; if (!r) return;
        const t = String(LAUNCH_LIB.parsePax(r.paxText));
        if (t !== r.paxText) setLrq({ paxText: t });
      },
      lrqOverLimit: !!rqOver,
      lrqOverLimitText: rqOver || '',
      lrqPaxDescribedBy: rqOver ? 'launch-over-limit' : undefined,
      lrqFreight: !!(rq && rq.freight),
      lrqFreightAria: rq && rq.freight ? 'true' : 'false',
      lrqFreightTrack: LAUNCH_STYLE.track(!!(rq && rq.freight)),
      lrqFreightKnob: LAUNCH_STYLE.knob(!!(rq && rq.freight)),
      toggleLrqFreight: () => setLrq({ freight: !this.state.lrq.freight }),
      lrqFreightDetail: rq ? rq.freightDetail : '',
      onLrqFreightDetail: (e) => setLrq({ freightDetail: e.target.value }),
      lrqFreightIncluded: !!(rqLaunch && rqLaunch.freightIncluded),
      lrqFreightNote: rqLaunch ? rqLaunch.freightNote : '',
      lrqQuotedSeparately: rqSup ? 'Quoted separately by ' + rqSup.name + '.' : '',
      lrqOutLabel: rqLaunch ? 'Out from ' + rqLaunch.port : 'Out',
      lrqOutTime: rq ? rq.outTime : '',
      onLrqOut: (e) => setLrq({ outTime: e.target.value }),
      lrqReturnTime: rq ? rq.returnTime : '',
      onLrqReturn: (e) => setLrq({ returnTime: e.target.value }),
      lrqWindows: this.REPLY_WINDOWS.map((w) => ({
        label: w.label, pressed: rq && rq.windowId === w.id ? 'true' : 'false',
        style: LAUNCH_STYLE.chipBase + (rq && rq.windowId === w.id ? LAUNCH_STYLE.chipOn : LAUNCH_STYLE.chipOff),
        on: () => setLrq({ windowId: w.id })
      })),
      lrqAdvice: rqAdvice.text,
      lrqAdviceTone: rqAdvice.tone,
      lrqAdviceStyle: LAUNCH_STYLE.advice(rqAdvice.tone),
      lrqRuns: rqRuns,
      closeLrq: closeLrq,
      closeLrqOverlay: (e) => { if (e.target === e.currentTarget) closeLrq(); },
      sendLrq: sendLrq
    };
  },

  escape() {
    if (this.state.lrq) { this.setState({ lrq: null }); return true; }
    return false;
  }
});
