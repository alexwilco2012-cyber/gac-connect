/* SVS screen (live dashboards, 23 Sep 2026, task T10; spec §4.5).

   The deck's mirror of the site's src/screens/app/Svs.tsx and svs/*:
   Register, SectionTabs, SvsKpis, Onboarding, ApplicantPanel,
   EvidenceQueue, DocumentPreview and InviteModal. Same order on screen, same
   copy word for word, same figures.

   Owner: T10 · binding prefix sv* · partials 49-svs.html (the screen),
   77-applicant-modal.html (the applicant panel) and 78-invite-modal.html
   (the invite form and the evidence queue's note dialog).

   What lives where:
   · The register is the core's: svsRows / svsChips, the alerts banner
     (svsAlertCount / svsAlertLine) and the SVS filter (st.svsFilter) stay in
     component.js. The banner keeps data-tour="svs", the tour's stop 11.
   · The queues' data is desk-state.js's: st.dkApplications, st.dkEvidence
     and the _dk* actions, which write pres.desk.* and append the audit trail.
     The sidebar badge (svNavBadge) is defined there too.
   · This module holds the screen's own state, none of it persisted: the
     applicant panel, its note form, the evidence item picked, the evidence
     note dialog and the invite form. Reset demo re-runs state(), so all of
     it closes.

   Tabs: '#/svs', '#/svs/onboarding', '#/svs/evidence' arrive as
   st.routeSection (component.js _parseHash). Picking a tab rewrites the hash
   in place with history.replaceState (no history entry, no hashchange, no
   scroll to the top), exactly as the site's ?section= does, and sets
   routeSection, which is what re-renders. Everything here is guarded on
   st.route === 'svs': the routeSection slot is shared with other screens.

   Nothing here feeds the bell or "Waiting on you": the SVS team's queue is
   not the client's. Script-scope rules: every top-level name starts with SV_,
   and no string literal carries the less-than character. */

const SV_SECTIONS = ['register', 'onboarding', 'evidence'];

/* ---------- pills: status colour always travels with words ---------- */

const SV_TONES = {
  verified: 'background:#E7F4EF;color:#047857;',
  warn: 'background:#FBF0E1;color:#A84D08;',
  danger: 'background:#FBEAEA;color:#B91C1C;',
  info: 'background:#E8F1F7;color:#0E5E8A;',
  neutral: 'background:#FAFBFD;color:#33475F;border:1px solid #CBD6E2;',
};

function SV_pill(tone) {
  return (
    'display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:2px 10px;' +
    'font-size:11.5px;font-weight:700;letter-spacing:.02em;line-height:1.5;white-space:nowrap;' +
    (SV_TONES[tone] || SV_TONES.neutral)
  );
}

const SV_RISK_TONE = { Low: 'neutral', Medium: 'warn', High: 'danger' };
const SV_SLA_TONE = { ok: 'neutral', due: 'warn', over: 'danger' };
const SV_CHECK_STATUS = {
  pending: { label: 'Pending', tone: 'neutral' },
  passed: { label: '✓ Passed', tone: 'verified' },
  failed: { label: '✗ Failed', tone: 'danger' },
  na: { label: 'N/A', tone: 'neutral' },
};
const SV_CHECK_OPTIONS = [
  { value: 'passed', text: 'Pass' },
  { value: 'failed', text: 'Fail' },
  { value: 'na', text: 'N/A' },
];
const SV_STAGE_NOTES = {
  Applied: 'Application in, first checks',
  Documents: 'Evidence coming in',
  Checks: 'Screening and references',
  Decision: 'Ready for the SVS team',
};
const SV_NOTE_MAX = 400;

/* ---------- small helpers (svs/ui.ts) ---------- */

/* Two initials for an applicant or supplier tile ("Cove Bay Scaffolding" → "CB"). */
function SV_initials(name) {
  const words = String(name)
    .replace(/[^A-Za-z ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
  return String(name).slice(0, 2).toUpperCase() || '·';
}

/* "Yesterday 15:40" → "yesterday 15:40" mid-sentence; weekday labels are left alone. */
function SV_midSentence(label) {
  return /^(Today|Yesterday|Last)\b/.test(label)
    ? label.charAt(0).toLowerCase() + label.slice(1)
    : label;
}

/* Most days in review first, so the card nearest its deadline leads the column. */
function SV_byUrgency(a, b) {
  return b.daysInReview - a.daysInReview || DK_refNumber(b.id) - DK_refNumber(a.id);
}

/* "Applied yesterday", "Applied Mon", "Invited today". */
function SV_arrivedLine(app) {
  const first = app.trail && app.trail[0];
  const invited = !!first && first.text.indexOf('Invitation sent') === 0;
  return (invited ? 'Invited' : 'Applied') + ' ' + SV_midSentence(app.appliedLabel);
}

function SV_submittedLine(at) {
  return 'Submitted ' + SV_midSentence(at);
}

/* Open items first, then newest first; a copy, never the frozen seed. */
function SV_sortQueue(evidence) {
  const open = (e) => (e.stage === 'submitted' ? 1 : 0);
  return evidence
    .slice()
    .sort((a, b) => open(b) - open(a) || DK_refNumber(b.id) - DK_refNumber(a.id));
}

/* The hash is where the tab lives, as ?section= is on the site. Replace, never
   push, and fire no hashchange, so the core does not scroll to the top. */
function SV_writeHash(section) {
  if (typeof history === 'undefined' || !history.replaceState) return;
  const target = section === 'register' ? '#/svs' : '#/svs/' + section;
  if (typeof location !== 'undefined' && location.hash === target) return;
  try {
    history.replaceState(null, '', target);
  } catch (e) {
    /* a sandboxed frame may refuse; the state still switches */
  }
}

/* Focus once the next render has committed, for controls that mount or
   unmount on use. `fallback` is tried when the first is missing or disabled. */
function SV_focusSoon(selector, fallback) {
  setTimeout(() => {
    let el = document.querySelector(selector);
    if ((!el || el.disabled) && fallback) el = document.querySelector(fallback);
    if (el && typeof el.focus === 'function') el.focus();
  }, 20);
}

/* The id on an applicant's button: on the board or in Decided, never both. */
function SV_cardId(id) {
  return 'sv-applicant-' + id;
}

/* After the applicant panel closes, focus goes to the applicant's own card
   where it sits now. The core hands focus back to the button that opened the
   panel, but after a stage move that card has re-mounted in another column:
   the old button is gone (focus would fall to the page) or, with the board's
   index keys, now holds another applicant. The board's heading takes it if
   the card has left the board. */
function SV_focusApplicant(id) {
  setTimeout(() => {
    const el = document.getElementById(SV_cardId(id)) || document.getElementById('sv-board-title');
    if (el && document.activeElement !== el) el.focus();
  }, 20);
}

/* The core moves focus into a dialog when the first one appears; this covers
   the case where another dialog (the tour card) was already on screen. */
function SV_focusIntoDialog(id) {
  setTimeout(() => {
    const d = document.getElementById(id);
    if (!d || d.contains(document.activeElement)) return;
    const first = d.querySelector(
      'input:not([type="hidden"]),select,textarea,button:not([disabled]),[tabindex]:not([tabindex="-1"])',
    );
    if (first) first.focus();
  }, 20);
}

/* ---------- icons (Lucide, ISC licence — the site's Icon.tsx paths) ---------- */

const SV_ICON_PATHS = {
  'user-plus': [
    ['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }],
    ['circle', { cx: 9, cy: 7, r: 4 }],
    ['line', { x1: 19, x2: 19, y1: 8, y2: 14 }],
    ['line', { x1: 22, x2: 16, y1: 11, y2: 11 }],
  ],
  'file-check': [
    ['path', { d: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z' }],
    ['path', { d: 'M14 2v4a2 2 0 0 0 2 2h4' }],
    ['path', { d: 'm9 15 2 2 4-4' }],
  ],
  'triangle-alert': [
    ['path', { d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3' }],
    ['path', { d: 'M12 9v4' }],
    ['path', { d: 'M12 17h.01' }],
  ],
  clock: [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['path', { d: 'M12 6v6l4 2' }],
  ],
  'shield-check': [
    [
      'path',
      {
        d: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
      },
    ],
    ['path', { d: 'm9 12 2 2 4-4' }],
  ],
};
const SV_ICON_CACHE = {};

/* A decorative icon as a React element; the runtime renders elements raw. */
function SV_icon(name, size) {
  const key = name + '@' + size;
  if (!SV_ICON_CACHE[key]) {
    const parts = (SV_ICON_PATHS[name] || []).map((p) => React.createElement(p[0], p[1]));
    SV_ICON_CACHE[key] = React.createElement.apply(
      null,
      [
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.75,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block', flexShrink: 0 },
        },
      ].concat(parts),
    );
  }
  return SV_ICON_CACHE[key];
}

/* ---------- shared styles ---------- */

const SV_MONO =
  'display:grid;place-items:center;flex-shrink:0;border-radius:10px;background:#E8F1F7;color:#0E5E8A;' +
  "font-family:'Space Grotesk',sans-serif;font-weight:700;";

function SV_monoStyle(size) {
  const font = size === 44 ? 15 : size === 36 ? 13 : 12;
  return SV_MONO + 'width:' + size + 'px;height:' + size + 'px;font-size:' + font + 'px;';
}

/* Checks done out of eight: sea while in progress, success once complete. */
function SV_barFill(done, total) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    'display:block;height:100%;border-radius:999px;width:' +
    pct +
    '%;background:' +
    (done === total ? '#047857' : '#0E5E8A') +
    ';'
  );
}

/* The audit trail, newest first, by role — never a person's name. */
function SV_trail(trail) {
  const entries = (trail || []).slice().reverse();
  return entries.map((t, i) => ({
    text: t.text,
    meta: t.by + ' · ' + t.at,
    dotStyle:
      'display:block;width:8px;height:8px;border-radius:999px;margin-top:5px;box-sizing:border-box;' +
      (i === 0 ? 'background:#0E5E8A;' : 'background:#FFFFFF;border:1.5px solid #CBD6E2;'),
    hasLine: i < entries.length - 1,
    rowStyle:
      'position:relative;display:grid;grid-template-columns:14px minmax(0,1fr);column-gap:10px;' +
      (i < entries.length - 1 ? 'padding-bottom:12px;' : ''),
  }));
}

/* A required note (asking for more, declining, rejecting). Nothing is sent
   until there is something to send; an empty submit shows one "Still needed"
   line and puts focus back in the box. */
function SV_noteVals(note, spec) {
  const text = note ? note.text : '';
  const empty = text.trim() === '';
  const showAlert = !!note && note.tried && empty;
  return {
    label: spec.label,
    placeholder: spec.placeholder,
    submitLabel: spec.submitLabel,
    text: text,
    count: text.length + ' / ' + SV_NOTE_MAX,
    invalid: showAlert ? 'true' : null,
    showAlert: showAlert,
    alert: 'Still needed: ' + spec.missing,
    submitClass: spec.destructive
      ? 'gac-sv-btn gac-sv-btn-destructive'
      : 'gac-sv-btn gac-sv-btn-primary',
  };
}

/* ---------- registration ---------- */

(Component._features = Component._features || []).push({
  state() {
    return {
      /* the applicant whose panel is open, and its inline note form
         ({ mode: 'info' | 'decline', text, tried }) */
      svAppId: null,
      svAppNote: null,
      /* the evidence item picked; the first open one leads until then */
      svEvPinned: null,
      /* the evidence note dialog: { id, kind: 'info' | 'reject', text, tried } */
      svEvNote: null,
      /* the invite form: { company, category, port, tried } */
      svInvite: null,
    };
  },

  vals(st) {
    if (st.route !== 'svs') {
      /* Left the screen with something open (Back, the tour): tidy it away
         after this render rather than during it. */
      if ((st.svAppId || st.svInvite || st.svEvNote) && !this._svTidyT) {
        this._svTidyT = setTimeout(() => {
          this._svTidyT = null;
          if (this.state.route !== 'svs') {
            this.setState({ svAppId: null, svAppNote: null, svInvite: null, svEvNote: null });
          }
        }, 0);
      }
      return { svAppOpen: false, svInviteOpen: false, svEvNoteOpen: false };
    }

    /* An unknown '#/svs/x' already opens the register (_parseHash); tidy the
       address bar too, as the site tidies an unknown ?section=. */
    if (typeof location !== 'undefined') {
      const m = /^#\/?svs\/([^/?#]+)/.exec(location.hash);
      if (m && !SV_SECTIONS.includes(m[1]) && this._svTidiedHash !== location.hash) {
        this._svTidiedHash = location.hash;
        setTimeout(() => {
          if (this.state.route === 'svs') SV_writeHash('register');
        }, 0);
      }
    }

    const section =
      st.routeSection === 'onboarding' || st.routeSection === 'evidence'
        ? st.routeSection
        : 'register';
    const apps = st.dkApplications || [];
    const evidence = st.dkEvidence || [];
    const findApp = (id) => (this.state.dkApplications || []).find((a) => a.id === id) || null;
    const findEv = (id) => (this.state.dkEvidence || []).find((e) => e.id === id) || null;

    const selectSection = (id) => {
      SV_writeHash(id);
      this.setState({ routeSection: id === 'register' ? null : id });
    };

    /* ---- the four numbers (SvsKpis) ---- */
    const watch = this._complianceWatch();
    const blocked = watch.filter((w) => w.blocked).length;
    const onboarding = DK_openCount(apps);
    const overdue = apps.filter(
      (a) => a.outcome === 'open' && DK_slaState(a).state === 'over',
    ).length;
    const toReview = DK_evidenceOpenCount(evidence);
    const oldest = evidence
      .filter((e) => e.stage === 'submitted')
      .sort((a, b) => DK_refNumber(a.id) - DK_refNumber(b.id))[0];
    const kpis = [
      {
        id: 'onboarding',
        label: 'In onboarding',
        value: String(onboarding),
        note: overdue
          ? overdue + ' past the ' + DK.SLA_DAYS + '-day target'
          : 'All inside the ' + DK.SLA_DAYS + '-day target',
        icon: 'user-plus',
      },
      {
        id: 'evidence',
        label: 'Evidence to review',
        value: String(toReview),
        note: oldest ? 'Oldest sent ' + SV_midSentence(oldest.submittedAt) : 'Queue clear',
        icon: 'file-check',
      },
      {
        id: 'alerts',
        label: 'Compliance alerts',
        value: String(watch.length),
        note: blocked + ' blocked · ' + (watch.length - blocked) + ' renewals due',
        icon: 'triangle-alert',
        warn: true,
      },
      {
        id: 'verify',
        label: 'Median time to verify',
        value: DK.MEDIAN_VERIFY_LABEL,
        note: 'Target ' + DK.SLA_DAYS + ' working days',
        icon: 'clock',
      },
    ].map((k) => ({
      testId: 'svs-kpi-' + k.id,
      label: k.label,
      value: k.value,
      note: k.note,
      icon: SV_icon(k.icon, 16),
      iconStyle:
        'width:32px;height:32px;margin-top:2px;flex-shrink:0;border-radius:8px;display:grid;place-items:center;' +
        (k.warn ? 'background:#FBF0E1;color:#A84D08;' : 'background:#E8F1F7;color:#0E5E8A;'),
    }));

    /* ---- the section switch (SectionTabs) ---- */
    const tabs = [
      { id: 'register', label: 'Register', tail: '', icon: 'shield-check', count: null },
      { id: 'onboarding', label: 'Onboarding', tail: '', icon: 'user-plus', count: onboarding },
      { id: 'evidence', label: 'Evidence', tail: ' queue', icon: 'file-check', count: toReview },
    ].map((t) => {
      const pressed = t.id === section;
      return {
        label: t.label,
        tail: t.tail,
        hasTail: !!t.tail,
        aria: t.label + t.tail + (t.count !== null ? ' ' + t.count : ''),
        pressed: pressed ? 'true' : 'false',
        style:
          'position:relative;margin-bottom:-1px;display:inline-flex;align-items:center;gap:8px;flex-shrink:0;' +
          'min-height:46px;padding:6px 12px 8px;background:transparent;border:none;border-bottom:2px solid ' +
          (pressed ? '#0E5E8A' : 'transparent') +
          ';color:' +
          (pressed ? '#0A2540' : '#33475F') +
          ';font-family:inherit;font-size:14px;font-weight:600;white-space:nowrap;cursor:pointer;',
        icon: SV_icon(t.icon, 16),
        iconStyle: 'display:inline-flex;color:' + (pressed ? '#0E5E8A' : '#33475F') + ';',
        hasCount: t.count !== null,
        count: String(t.count),
        countStyle:
          'min-width:22px;box-sizing:border-box;border-radius:999px;padding:1px 6px;text-align:center;' +
          'font-size:11.5px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.5;' +
          (pressed ? 'background:#0E5E8A;color:#FFFFFF;' : 'background:#E8F1F7;color:#0E5E8A;'),
        on: () => selectSection(t.id),
      };
    });

    /* ---- onboarding board ---- */
    const openApp = (id) => {
      this.setState({ svAppId: id, svAppNote: null });
      SV_focusIntoDialog('sv-applicant-dialog');
    };
    const openApps = apps.filter((a) => a.outcome === 'open');
    const card = (a) => {
      const p = DK_checklistProgress(a);
      const sla = DK_slaState(a);
      return {
        company: a.company,
        mono: SV_initials(a.company),
        monoStyle: SV_monoStyle(36),
        sub: a.category + ' · ' + a.port,
        checks: p.done + ' of ' + p.total + ' checks',
        arrived: SV_arrivedLine(a),
        barStyle: SV_barFill(p.done, p.total),
        slaLabel: sla.label,
        slaStyle: SV_pill(SV_SLA_TONE[sla.state]),
        riskLabel: a.risk + ' risk',
        riskStyle: SV_pill(SV_RISK_TONE[a.risk]),
        awaiting: !!a.infoRequest,
        awaitingStyle: SV_pill('info'),
        cardId: SV_cardId(a.id),
        onOpen: () => openApp(a.id),
      };
    };
    const columns = DK.ONBOARDING_STAGES.map((stage, i) => {
      const list = openApps.filter((a) => a.stage === stage).sort(SV_byUrgency);
      return {
        stage: stage,
        testId: 'svs-column-' + stage,
        headingId: 'sv-stage-' + stage,
        num: String(i + 1),
        count: String(list.length),
        countSr: list.length === 1 ? ' applicant' : ' applicants',
        note: SV_STAGE_NOTES[stage],
        hasCards: list.length > 0,
        empty: list.length === 0,
        cards: list.map(card),
      };
    });
    const decided = apps
      .filter((a) => a.outcome !== 'open')
      .sort((a, b) => DK_refNumber(b.id) - DK_refNumber(a.id))
      .map((a) => ({
        company: a.company,
        mono: SV_initials(a.company),
        monoStyle: SV_monoStyle(32),
        sub: a.category + ' · ' + a.port + ' · ' + a.id,
        note: a.decisionNote || '',
        pill: a.outcome === 'approved' ? '✓ Approved' : '✗ Declined',
        pillStyle: SV_pill(a.outcome === 'approved' ? 'verified' : 'danger'),
        cardId: SV_cardId(a.id),
        onOpen: () => openApp(a.id),
      }));

    /* ---- the applicant panel (ApplicantPanel) ---- */
    const app = st.svAppId ? apps.find((a) => a.id === st.svAppId) || null : null;
    const ap = app ? this._svApplicantVals(app, st, findApp) : {};

    /* ---- evidence queue ---- */
    const queue = SV_sortQueue(evidence);
    const selected = queue.find((e) => e.id === st.svEvPinned) || queue[0] || null;
    const pick = (id) => {
      this.setState({ svEvPinned: id });
      /* Stacked on a phone: bring the detail up to meet the pick. */
      if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
        setTimeout(() => {
          const d = document.getElementById('sv-ev-detail');
          if (d) d.scrollIntoView({ block: 'start' });
          const t = document.getElementById('sv-ev-title');
          if (t) t.focus({ preventScroll: true });
        }, 20);
      }
    };
    const evRows = queue.map((e) => {
      const status = DK_evidenceStatus(e.stage);
      const isSel = !!selected && selected.id === e.id;
      return {
        supplier: e.supplierName,
        cert: e.certLabel,
        meta:
          (e.kind === 'renewal' ? 'Renewal' : 'New certificate') +
          ' · ' +
          SV_submittedLine(e.submittedAt),
        status: status.label,
        statusStyle: SV_pill(status.tone),
        pressed: isSel ? 'true' : 'false',
        style:
          'position:relative;display:block;width:100%;box-sizing:border-box;text-align:left;cursor:pointer;' +
          'font-family:inherit;color:#0A2540;border-radius:8px;padding:12px 14px;' +
          (isSel
            ? 'border:1px solid #B7CCDD;background:rgba(232,241,247,.7);box-shadow:inset 3px 0 0 #0E5E8A;'
            : 'border:1px solid transparent;background:transparent;'),
        on: () => pick(e.id),
      };
    });
    const ev = selected ? this._svEvidenceVals(selected, findEv) : {};

    /* ---- the evidence note dialog ---- */
    const noteItem = st.svEvNote ? evidence.find((e) => e.id === st.svEvNote.id) || null : null;
    const en = noteItem ? this._svEvNoteVals(noteItem, st.svEvNote, findEv) : {};

    /* ---- the invite form ---- */
    const iv = st.svInvite ? this._svInviteVals(st.svInvite) : {};

    return {
      svIsRegister: section === 'register',
      svIsOnboarding: section === 'onboarding',
      svIsEvidence: section === 'evidence',
      svKpis: kpis,
      svTabs: tabs,
      svOpenInvite: () => {
        this.setState({
          svInvite: {
            company: '',
            category: DK.INVITE_CATEGORIES[0],
            port: DK.BASE_PORTS[0],
            tried: false,
          },
        });
        SV_focusIntoDialog('sv-invite-dialog');
      },

      /* onboarding */
      svSlaDays: String(DK.SLA_DAYS),
      svColumns: columns,
      svHasDecided: decided.length > 0,
      svNoDecided: decided.length === 0,
      svDecided: decided,
      svDecidedCount:
        decided.length + (decided.length === 1 ? ' decision' : ' decisions') + ' · newest first',

      /* the applicant panel */
      svAppOpen: !!app,
      svAp: ap,

      /* evidence queue */
      svEvWaiting: toReview
        ? toReview + ' awaiting review · open items first, newest first'
        : 'Nothing awaiting review · decided items below',
      svEvRows: evRows,
      svEvHasRows: evRows.length > 0,
      svEvNoRows: evRows.length === 0,
      svEvHasSelected: !!selected,
      svEvNoSelected: !selected,
      svEv: ev,

      /* the evidence note dialog */
      svEvNoteOpen: !!noteItem,
      svEn: en,

      /* the invite form */
      svInviteOpen: !!st.svInvite,
      svIv: iv,
      svInviteCategories: DK.INVITE_CATEGORIES.map((c) => ({ value: c, label: c })),
      svInvitePorts: DK.BASE_PORTS.map((p) => ({ value: p, label: p })),
    };
  },

  escape() {
    if (this.state.svEvNote) {
      this.setState({ svEvNote: null });
      return true;
    }
    if (this.state.svInvite) {
      this.setState({ svInvite: null });
      return true;
    }
    if (this.state.svAppId) {
      const id = this.state.svAppId;
      this.setState({ svAppId: null, svAppNote: null });
      SV_focusApplicant(id);
      return true;
    }
    return false;
  },
});

/* ---------- the three panels' bindings, on the Component ---------- */

Object.assign(Component.prototype, {
  /* One applicant: checks, info request, decision and trail (ApplicantPanel.tsx). */
  _svApplicantVals(app, st, findApp) {
    const open = app.outcome === 'open';
    const p = DK_checklistProgress(app);
    const sla = DK_slaState(app);
    const blocker = DK_approveBlocker(app);
    const next = DK_nextStage(app.stage);
    const canMove = open && next !== app.stage;
    const note = st.svAppNote;
    const at = DK.ONBOARDING_STAGES.indexOf(app.stage);

    const close = () => {
      this.setState({ svAppId: null, svAppNote: null });
      SV_focusApplicant(app.id);
    };
    /* After an approval or a decline the card has left the board, so focus
       follows it to the Decided list rather than falling back to the page. */
    const decided = () => {
      this.setState({ svAppId: null, svAppNote: null });
      SV_focusSoon('#sv-decided-title');
    };
    const setMode = (mode) => {
      this.setState({ svAppNote: { mode: mode, text: '', tried: false } });
      SV_focusSoon('#sv-ap-note');
    };
    const cancelNote = () => {
      const from = this.state.svAppNote ? this.state.svAppNote.mode : 'info';
      this.setState({ svAppNote: null });
      SV_focusSoon('[data-sv-action="' + (from === 'decline' ? 'decline' : 'info') + '"]');
    };
    const noteSpec =
      note && note.mode === 'decline'
        ? {
            label: 'Reason for declining',
            placeholder: 'The reason the applicant will see',
            submitLabel: 'Decline application',
            missing: 'a reason',
            destructive: true,
          }
        : {
            label: 'Note to the applicant',
            placeholder: 'What the applicant needs to send, and why',
            submitLabel: 'Send request',
            missing: 'a note for the applicant',
            destructive: false,
          };

    return {
      id: app.id,
      eyebrow: 'Onboarding · ' + app.id,
      company: app.company,
      mono: SV_initials(app.company),
      monoStyle: SV_monoStyle(44),
      sub: app.category + ' · ' + app.port,
      close: close,
      overlay: (e) => {
        if (e.target === e.currentTarget) close();
      },

      approved: app.outcome === 'approved',
      declined: app.outcome === 'declined',
      approvedStyle: SV_pill('verified'),
      declinedStyle: SV_pill('danger'),
      showSla: open,
      slaLabel: sla.label,
      slaStyle: SV_pill(SV_SLA_TONE[sla.state]),
      riskLabel: app.risk + ' risk',
      riskStyle: SV_pill(SV_RISK_TONE[app.risk]),
      awaiting: !!app.infoRequest,
      awaitingStyle: SV_pill('info'),

      isOpen: open,
      isClosed: !open,
      stages: DK.ONBOARDING_STAGES.map((s, i) => {
        const state = i < at ? 'done' : i === at ? 'current' : 'todo';
        return {
          label: s,
          done: state === 'done',
          current: state === 'current' ? 'step' : null,
          barStyle:
            'display:block;height:6px;border-radius:999px;background:' +
            (state === 'todo' ? '#E5EAF1' : state === 'done' ? 'rgba(14,94,138,.45)' : '#0E5E8A') +
            ';',
          labelStyle:
            'display:block;margin-top:6px;font-size:11.5px;line-height:1.25;overflow-wrap:anywhere;' +
            (state === 'current' ? 'font-weight:700;color:#0A2540;' : 'color:#33475F;'),
        };
      }),
      outcomeStyle:
        'margin:16px 0 0;border-radius:8px;padding:10px 14px;font-size:13.5px;' +
        (app.outcome === 'approved'
          ? 'background:#E7F4EF;color:#047857;'
          : 'background:#FBEAEA;color:#B91C1C;'),
      outcomeWord: app.outcome === 'approved' ? 'Approved' : 'Declined',
      outcomeRest:
        ' — ' +
        (app.outcome === 'approved'
          ? DK.APPROVED_NOTE.replace(/^Approved — /, '')
          : app.decisionNote || 'no reason recorded'),

      hasInfo: !!app.infoRequest,
      info: app.infoRequest || '',
      canAnswer: open && !!app.infoRequest,
      answer: () => {
        this._dkClearInfo(app.id);
        SV_focusSoon('#sv-applicant-checks');
      },

      checksLine: p.done + ' of ' + p.total + ' checks',
      barStyle: SV_barFill(p.done, p.total),
      checks: DK.CHECKS.map((c) => {
        const state = app.checks[c.id];
        const label = DK_checkLabel(app, c.id);
        const status = SV_CHECK_STATUS[state] || SV_CHECK_STATUS.pending;
        return {
          label: label,
          pill: status.label,
          pillStyle: SV_pill(status.tone),
          showCtl: open,
          opts: SV_CHECK_OPTIONS.map((o) => {
            const pressed = state === o.value;
            return {
              text: o.text,
              pressed: pressed ? 'true' : 'false',
              title: pressed ? 'Press again to reopen this check' : null,
              style:
                'min-width:52px;border:none;border-radius:6px;padding:0 10px;cursor:pointer;font-family:inherit;' +
                'font-size:12.5px;font-weight:600;' +
                (pressed
                  ? 'background:#0A2540;color:#FFFFFF;'
                  : 'background:transparent;color:#33475F;'),
              on: () => {
                const cur = findApp(app.id);
                if (!cur) return;
                this._dkSetCheck(app.id, c.id, cur.checks[c.id] === o.value ? 'pending' : o.value);
              },
            };
          }),
        };
      }),

      showDecision: open,
      modeNone: open && !note,
      modeNote: open && !!note,
      canMove: canMove,
      moveLabel: 'Move to ' + next,
      move: () => {
        const cur = findApp(app.id);
        if (!cur) return;
        const reachesDecision = DK_nextStage(cur.stage) === 'Decision';
        this._dkAdvance(app.id);
        /* the button goes once the application reaches Decision */
        if (reachesDecision) SV_focusSoon('[data-sv-action="approve"]', '#sv-applicant-title');
      },
      canRequest: !app.infoRequest,
      request: () => setMode('info'),
      decline: () => setMode('decline'),
      approve: () => {
        const cur = findApp(app.id);
        if (!cur || !DK_canApprove(cur)) return;
        this._dkApprove(app.id);
        this.toastMsg(
          'Approved: ' +
            cur.company +
            '. The listing goes live at the next marketplace publish (simulated).',
        );
        decided();
      },
      approveDisabled: blocker !== null,
      approveDescribedBy: blocker ? 'sv-approve-blocker' : null,
      hasBlocker: blocker !== null,
      blocker: blocker || '',
      ready: blocker === null,

      note: SV_noteVals(note, noteSpec),
      noteChange: (e) => {
        const n = this.state.svAppNote;
        if (!n) return;
        this.setState({ svAppNote: Object.assign({}, n, { text: e.target.value }) });
      },
      noteCancel: cancelNote,
      noteSubmit: (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const n = this.state.svAppNote;
        const cur = findApp(app.id);
        if (!n || !cur) return;
        const text = n.text.trim();
        if (!text) {
          this.setState({ svAppNote: Object.assign({}, n, { tried: true }) });
          SV_focusSoon('#sv-ap-note');
          return;
        }
        if (n.mode === 'decline') {
          this._dkDecline(cur.id, text);
          this.toastMsg('Declined: ' + cur.company + '.');
          decided();
          return;
        }
        this._dkRequestInfo(cur.id, text);
        this.setState({ svAppNote: null });
        this.toastMsg('Sent to ' + cur.company + ': more information requested (simulated).');
        SV_focusSoon('#sv-info-box');
      },

      trail: SV_trail(app.trail),
    };
  },

  /* The picked evidence item (EvidenceQueue.tsx Detail + DocumentPreview.tsx). */
  _svEvidenceVals(item, findEv) {
    const status = DK_evidenceStatus(item.stage);
    const open = item.stage === 'submitted';
    const kind = item.kind === 'renewal' ? 'Renewal' : 'New certificate';
    const openNote = (k) => {
      this.setState({ svEvNote: { id: item.id, kind: k, text: '', tried: false } });
      SV_focusIntoDialog('sv-evnote-dialog');
    };
    const outcomeTone =
      item.stage === 'approved'
        ? 'background:#E7F4EF;color:#047857;'
        : item.stage === 'rejected'
          ? 'background:#FBEAEA;color:#B91C1C;'
          : 'background:#FBF0E1;color:#A84D08;';
    return {
      eyebrow: item.id + ' · ' + kind,
      title: item.certLabel,
      sub: item.supplierName + ' · ' + SV_submittedLine(item.submittedAt),
      status: status.label,
      statusStyle: SV_pill(status.tone),

      /* the document preview */
      docKind: item.kind === 'renewal' ? 'Certificate · renewal' : 'Certificate',
      docLabel:
        'Illustrative preview of ' +
        item.fileName +
        ': ' +
        item.certLabel +
        ', issued to ' +
        item.supplierName +
        ' by ' +
        item.issuer +
        ', reference ' +
        item.reference +
        ', expires ' +
        DK_formatDateGB(item.expiresOn) +
        '.',
      supplier: item.supplierName,
      issuer: item.issuer,
      reference: item.reference,
      dates:
        'Issued ' +
        DK_formatDateGB(item.issuedOn) +
        ' · Expires ' +
        DK_formatDateGB(item.expiresOn),
      file: item.fileName + ' · ' + DK_fileSizeLabel(item.fileSize),

      fields: [
        ['Supplier', item.supplierName],
        ['Certificate type', item.certType],
        ['Issuing body', item.issuer],
        ['Reference', item.reference],
        ['Issued', DK_formatDateGB(item.issuedOn)],
        ['Expires', DK_formatDateGB(item.expiresOn)],
        ['Days to expiry when sent', item.daysLeft.toLocaleString('en-GB') + ' days'],
        [
          'Kind',
          item.kind === 'renewal' ? 'Renewal of a certificate held' : 'New to this supplier',
        ],
      ].map((f) => ({ k: f[0], v: f[1] })),

      isOpen: open,
      isDecided: !open,
      approve: () => {
        const cur = findEv(item.id);
        if (!cur || cur.stage !== 'submitted') return;
        this.setState({ svEvPinned: item.id });
        this._dkDecideEvidence(item.id, 'approved');
        this.toastMsg('Verified: ' + cur.certLabel + ' for ' + cur.supplierName + '.');
        SV_focusSoon('#sv-ev-outcome');
      },
      request: () => openNote('info'),
      reject: () => openNote('reject'),
      approveNote:
        item.kind === 'renewal'
          ? 'Approving puts this renewal on file in place of the certificate ' +
            item.supplierName +
            ' holds now.'
          : 'Approving adds the certificate to ' +
            item.supplierName +
            '’s record — the register, their profile and their dashboard.',
      outcomeStyle: 'border-radius:8px;padding:12px 14px;font-size:13.5px;' + outcomeTone,
      outcomeHead:
        item.stage === 'approved'
          ? item.kind === 'renewal'
            ? '✓ Verified — the renewal is on file'
            : '✓ Verified — now on ' + item.supplierName + '’s record'
          : item.stage === 'rejected'
            ? '✗ Rejected'
            : '⚠ Sent back — more information needed',
      hasNote: !open && !!item.note,
      noteLine: 'Your note: ' + (item.note || ''),

      trail: SV_trail(item.trail),
    };
  },

  /* Request information / Reject certificate, typed in a small dialog. */
  _svEvNoteVals(item, note, findEv) {
    const info = note.kind === 'info';
    const close = () => this.setState({ svEvNote: null });
    return {
      eyebrow: item.id + ' · ' + item.supplierName,
      title: info ? 'Request information' : 'Reject certificate',
      lede: info
        ? item.certLabel +
          ' goes back to ' +
          item.supplierName +
          ' with your note, and leaves the queue until they send it again.'
        : item.certLabel +
          ' is rejected. ' +
          item.supplierName +
          ' sees your reason, and anything already on their record stands.',
      form: SV_noteVals(
        note,
        info
          ? {
              label: 'Note to the supplier',
              placeholder: 'What is missing or unclear, and what to send',
              submitLabel: 'Send back',
              missing: 'a note for the supplier',
              destructive: false,
            }
          : {
              label: 'Reason for rejecting',
              placeholder: 'The reason the supplier will see',
              submitLabel: 'Reject certificate',
              missing: 'a reason',
              destructive: true,
            },
      ),
      close: close,
      overlay: (e) => {
        if (e.target === e.currentTarget) close();
      },
      change: (e) => {
        const n = this.state.svEvNote;
        if (!n) return;
        this.setState({ svEvNote: Object.assign({}, n, { text: e.target.value }) });
      },
      submit: (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const n = this.state.svEvNote;
        const cur = n ? findEv(n.id) : null;
        if (!n || !cur) return;
        const text = n.text.trim();
        if (!text) {
          this.setState({ svEvNote: Object.assign({}, n, { tried: true }) });
          SV_focusSoon('#sv-en-note');
          return;
        }
        const isInfo = n.kind === 'info';
        this.setState({ svEvPinned: cur.id });
        this._dkDecideEvidence(cur.id, isInfo ? 'info-requested' : 'rejected', text);
        this.toastMsg(
          isInfo
            ? 'Sent back to ' + cur.supplierName + ' with your note.'
            : 'Rejected: ' + cur.certLabel + ' for ' + cur.supplierName + '.',
        );
        this.setState({ svEvNote: null });
        SV_focusSoon('#sv-ev-outcome');
      },
    };
  },

  /* Invite a supplier (InviteModal.tsx): the invitation itself is simulated. */
  _svInviteVals(form) {
    const missing = form.company.trim() === '';
    const patch = (p) => {
      const cur = this.state.svInvite;
      if (cur) this.setState({ svInvite: Object.assign({}, cur, p) });
    };
    const close = () => this.setState({ svInvite: null });
    return {
      company: form.company,
      category: form.category,
      port: form.port,
      invalid: form.tried && missing ? 'true' : null,
      showAlert: form.tried && missing,
      onCompany: (e) => patch({ company: e.target.value }),
      onCategory: (e) => patch({ category: e.target.value }),
      onPort: (e) => patch({ port: e.target.value }),
      close: close,
      overlay: (e) => {
        if (e.target === e.currentTarget) close();
      },
      submit: (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const cur = this.state.svInvite;
        if (!cur) return;
        const name = cur.company.trim();
        if (!name) {
          patch({ tried: true });
          SV_focusSoon('#sv-invite-company');
          return;
        }
        this._dkInvite({ company: name, category: cur.category, port: cur.port });
        this.toastMsg('Invitation sent to ' + name + ' (simulated). They appear under Applied.');
        /* The new card is under Applied, so show the board, as the toast says. */
        SV_writeHash('onboarding');
        this.setState({ svInvite: null, routeSection: 'onboarding' });
      },
    };
  },
});
