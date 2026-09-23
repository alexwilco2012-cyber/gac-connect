/* Desk state (live dashboards, 23 Sep 2026, task T4).

   The deck's mirror of the site's two new stores, shared by every screen
   that shows them:
     src/store/svsDesk.ts       → st.dkEvidence, st.dkApplications
     src/store/supplierDesk.ts  → st.dkQuotes
   The supplier dashboard sends quotes and certificates in (client-desk.js,
   supplier-desk.js), the SVS screen decides them (svs-screen.js), and the
   core reads them for the Internal KPI tile, the SVS register and the
   supplier profile. One owner, so the screens can never disagree.

   Persistence: 'pres.desk.evidence', 'pres.desk.applications' and
   'pres.desk.quotes'. The 'pres.' prefix is the whole of the reset wiring:
   Component#_clearDemoKeys sweeps it on Reset demo and on a fresh visit, and
   resetDemo re-runs state(), which finds the keys gone and seeds again.
   Reads are defensive, as on the site: a malformed entry is dropped, a
   malformed list (or none) means the seed. The seed itself is never written
   back; a key appears only once something has been done.

   Every action below reads this.state at the moment it runs (the runtime's
   setState updates it synchronously, so two actions in one handler compose),
   writes through _set, then setState. Each appends to the item's audit trail
   by role, never by person. Nothing here feeds the bell: the SVS team's queue
   is not the client's "Waiting on you". */

const DK_KEY_EVIDENCE = 'pres.desk.evidence';
const DK_KEY_APPLICATIONS = 'pres.desk.applications';
const DK_KEY_QUOTES = 'pres.desk.quotes';

const DK_EVIDENCE_STAGES = ['submitted', 'approved', 'info-requested', 'rejected'];
const DK_CHECK_STATES = ['pending', 'passed', 'failed', 'na'];
const DK_ACTORS = ['SVS team', 'Applicant', 'Supplier', 'System'];
/* A non-breaking space, built rather than typed so no editor or formatter
   can turn it into an invisible character in the source. */
const DK_NBSP = String.fromCharCode(160);
const DK_CHECK_WORDS = {
  pending: 'reopened',
  passed: 'passed',
  failed: 'failed',
  na: 'not applicable',
};

/* ---------- shape guards (store/svsDesk.ts, store/supplierDesk.ts) ---------- */

function DK_isRecord(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function DK_isOptionalString(v) {
  return v === undefined || typeof v === 'string';
}

function DK_isTrail(v) {
  return (
    Array.isArray(v) &&
    v.every(
      (t) =>
        DK_isRecord(t) &&
        typeof t.at === 'string' &&
        typeof t.text === 'string' &&
        DK_ACTORS.includes(t.by),
    )
  );
}

function DK_isEvidence(v) {
  if (!DK_isRecord(v)) return false;
  return (
    typeof v.id === 'string' &&
    typeof v.supplierId === 'string' &&
    typeof v.supplierName === 'string' &&
    (v.kind === 'new' || v.kind === 'renewal') &&
    typeof v.certType === 'string' &&
    typeof v.certLabel === 'string' &&
    DK_isOptionalString(v.vaultId) &&
    typeof v.issuer === 'string' &&
    typeof v.reference === 'string' &&
    typeof v.issuedOn === 'string' &&
    typeof v.expiresOn === 'string' &&
    typeof v.daysLeft === 'number' &&
    typeof v.fileName === 'string' &&
    typeof v.fileSize === 'number' &&
    typeof v.submittedAt === 'string' &&
    DK_EVIDENCE_STAGES.includes(v.stage) &&
    DK_isOptionalString(v.note) &&
    DK_isTrail(v.trail)
  );
}

function DK_isApplication(v) {
  if (!DK_isRecord(v)) return false;
  const checks = v.checks;
  return (
    typeof v.id === 'string' &&
    typeof v.company === 'string' &&
    typeof v.category === 'string' &&
    typeof v.port === 'string' &&
    typeof v.appliedLabel === 'string' &&
    typeof v.daysInReview === 'number' &&
    DK.ONBOARDING_STAGES.includes(v.stage) &&
    (v.outcome === 'open' || v.outcome === 'approved' || v.outcome === 'declined') &&
    (v.risk === 'Low' || v.risk === 'Medium' || v.risk === 'High') &&
    typeof v.categoryCheckLabel === 'string' &&
    DK_isRecord(checks) &&
    DK.CHECKS.every((c) => DK_CHECK_STATES.includes(checks[c.id])) &&
    DK_isOptionalString(v.infoRequest) &&
    DK_isOptionalString(v.decisionNote) &&
    DK_isTrail(v.trail)
  );
}

function DK_isSentQuote(v) {
  if (typeof v !== 'object' || v === null) return false;
  return (
    typeof v.amountGbp === 'number' &&
    Number.isFinite(v.amountGbp) &&
    typeof v.leadTime === 'string' &&
    typeof v.validity === 'string' &&
    typeof v.note === 'string' &&
    typeof v.sentAt === 'string'
  );
}

/* ---------- defensive reads: a missing key means an untouched demo ---------- */

function DK_readEvidence(get) {
  const raw = get(DK_KEY_EVIDENCE, null);
  if (raw === null) return DK_clone(DK.SEED_EVIDENCE);
  return Array.isArray(raw) ? raw.filter(DK_isEvidence) : DK_clone(DK.SEED_EVIDENCE);
}

function DK_readApplications(get) {
  const raw = get(DK_KEY_APPLICATIONS, null);
  if (raw === null) return DK_clone(DK.SEED_APPLICATIONS);
  return Array.isArray(raw) ? raw.filter(DK_isApplication) : DK_clone(DK.SEED_APPLICATIONS);
}

function DK_readQuotes(get) {
  const raw = get(DK_KEY_QUOTES, null);
  if (!DK_isRecord(raw)) return {};
  const out = {};
  Object.keys(raw).forEach((k) => {
    if (DK_isSentQuote(raw[k])) out[k] = raw[k];
  });
  return out;
}

function DK_entry(by, text) {
  return { at: DK_stampLabel(), by: by, text: text };
}

/* ---------- actions (the stores' methods), on the Component ---------- */

Object.assign(Component.prototype, {
  _dkWriteEvidence(list) {
    this._set(DK_KEY_EVIDENCE, list);
    this.setState({ dkEvidence: list });
  },

  _dkWriteApplications(list) {
    this._set(DK_KEY_APPLICATIONS, list);
    this.setState({ dkApplications: list });
  },

  /* Applies `change` to one open application; unknown or decided ones are
     left alone. `change` returns the next application, or null for no change.
     True when something changed. */
  _dkUpdateOpen(appId, change) {
    let changed = false;
    const list = this.state.dkApplications.map((a) => {
      if (a.id !== appId || a.outcome !== 'open') return a;
      const next = change(a);
      if (!next) return a;
      changed = true;
      return next;
    });
    if (changed) this._dkWriteApplications(list);
    return changed;
  },

  /* A supplier sends a certificate in: { supplierId, supplierName, kind:
     'new' | 'renewal', vaultId?, form } with form as DK.EMPTY_CERT_FORM.
     Metadata only: the file itself never leaves the browser. Validate with
     DK_validateCertForm first. Returns the new reference. */
  _dkSubmitEvidence(input) {
    const form = input.form;
    const existing = this.state.dkEvidence;
    const id = DK_nextEvidenceRef(existing);
    const at = DK_stampLabel();
    const submission = {
      id: id,
      supplierId: input.supplierId,
      supplierName: input.supplierName,
      kind: input.kind,
      certType: form.certType,
      certLabel: form.certType === 'Other' ? form.otherLabel.trim() : form.certType,
    };
    if (input.kind === 'renewal' && input.vaultId) submission.vaultId = input.vaultId;
    Object.assign(submission, {
      issuer: form.issuer.trim(),
      reference: form.reference.trim(),
      issuedOn: form.issuedOn,
      expiresOn: form.expiresOn,
      daysLeft: DK_daysBetween(DK_todayISO(), form.expiresOn),
      fileName: form.fileName,
      fileSize: form.fileSize,
      submittedAt: at,
      stage: 'submitted',
      trail: [
        {
          at: at,
          by: 'Supplier',
          text:
            (input.kind === 'renewal' ? 'Renewal' : 'Certificate') + ' uploaded: ' + form.fileName,
        },
      ],
    });
    this._dkWriteEvidence([submission].concat(existing));
    return id;
  },

  /* The SVS team decides a submission still waiting on it. Asking for more or
     rejecting needs a note. True when it was decided. */
  _dkDecideEvidence(id, decision, note) {
    const text = typeof note === 'string' ? note.trim() : '';
    if (decision !== 'approved' && !text) return false;
    let changed = false;
    const list = this.state.dkEvidence.map((e) => {
      if (e.id !== id || e.stage !== 'submitted') return e;
      changed = true;
      const line =
        decision === 'approved'
          ? 'Verified by the SVS team'
          : decision === 'info-requested'
            ? 'Asked for more information: ' + text
            : 'Rejected: ' + text;
      const next = Object.assign({}, e, {
        stage: decision,
        trail: e.trail.concat([DK_entry('SVS team', line)]),
      });
      if (decision === 'approved') delete next.note;
      else next.note = text;
      return next;
    });
    if (changed) this._dkWriteEvidence(list);
    return changed;
  },

  /* Pass, fail, N/A or reopen one of an applicant's eight checks. */
  _dkSetCheck(appId, check, state) {
    return this._dkUpdateOpen(appId, (a) =>
      a.checks[check] === state
        ? null
        : Object.assign({}, a, {
            checks: Object.assign({}, a.checks, { [check]: state }),
            trail: a.trail.concat([
              DK_entry('SVS team', DK_checkLabel(a, check) + ' — ' + DK_CHECK_WORDS[state]),
            ]),
          }),
    );
  },

  /* One stage on; never past Decision (approve or decline from there). */
  _dkAdvance(appId) {
    return this._dkUpdateOpen(appId, (a) => {
      const stage = DK_nextStage(a.stage);
      if (stage === a.stage) return null;
      return Object.assign({}, a, {
        stage: stage,
        trail: a.trail.concat([DK_entry('SVS team', 'Moved to ' + stage)]),
      });
    });
  },

  _dkRequestInfo(appId, note) {
    const text = typeof note === 'string' ? note.trim() : '';
    if (!text) return false;
    return this._dkUpdateOpen(appId, (a) =>
      Object.assign({}, a, {
        infoRequest: text,
        trail: a.trail.concat([DK_entry('SVS team', 'Asked for more information: ' + text)]),
      }),
    );
  },

  /* Simulates the applicant answering the open request. */
  _dkClearInfo(appId) {
    return this._dkUpdateOpen(appId, (a) => {
      if (!a.infoRequest) return null;
      const next = Object.assign({}, a, {
        trail: a.trail.concat([
          DK_entry('Applicant', 'Answered the information request (simulated)'),
        ]),
      });
      delete next.infoRequest;
      return next;
    });
  },

  /* Only what DK_canApprove allows. The listing step is simulated. */
  _dkApprove(appId) {
    return this._dkUpdateOpen(appId, (a) =>
      DK_canApprove(a)
        ? Object.assign({}, a, {
            outcome: 'approved',
            decisionNote: DK.APPROVED_NOTE,
            trail: a.trail.concat([
              DK_entry(
                'SVS team',
                'Approved and listed — the listing goes live at the next marketplace publish (simulated)',
              ),
            ]),
          })
        : null,
    );
  },

  _dkDecline(appId, reason) {
    const text = typeof reason === 'string' ? reason.trim() : '';
    if (!text) return false;
    return this._dkUpdateOpen(appId, (a) =>
      Object.assign({}, a, {
        outcome: 'declined',
        decisionNote: text,
        trail: a.trail.concat([DK_entry('SVS team', 'Declined: ' + text)]),
      }),
    );
  },

  /* A new applicant at Applied, every check pending: { company, category,
     port }. Returns its reference, or '' when the name is blank. */
  _dkInvite(input) {
    const name = typeof input.company === 'string' ? input.company.trim() : '';
    if (!name) return '';
    const existing = this.state.dkApplications;
    const id = DK_nextApplicationRef(existing);
    const invited = {
      id: id,
      company: name,
      category: input.category,
      port: input.port,
      appliedLabel: 'Today',
      daysInReview: 0,
      stage: 'Applied',
      outcome: 'open',
      risk: 'Medium',
      categoryCheckLabel: input.category + ' competence evidence',
      checks: {
        company: 'pending',
        insurance: 'pending',
        hse: 'pending',
        sanctions: 'pending',
        bank: 'pending',
        references: 'pending',
        category: 'pending',
        policies: 'pending',
      },
      trail: [DK_entry('SVS team', 'Invitation sent by the SVS team (simulated)')],
    };
    this._dkWriteApplications([invited].concat(existing));
    return id;
  },

  /* The demo supplier quotes an inbox request: { amountGbp, leadTime,
     validity, note }. Keyed by request id; a second quote replaces the first. */
  _dkSendQuote(requestId, q) {
    const quotes = Object.assign({}, this.state.dkQuotes, {
      [requestId]: Object.assign({}, q, {
        note: String(q.note || '').trim(),
        sentAt: DK_stampLabel(),
      }),
    });
    this._set(DK_KEY_QUOTES, quotes);
    this.setState({ dkQuotes: quotes });
  },

  /* A roster supplier's certificates for display (the SVS register, the
     profile, the supplier dashboard): its own certs, untouched, plus each new
     certificate the SVS team has approved for it (DK_certsWithApproved). The
     deck's roster names a cert `label` and carries a `detail`, so the added
     ones do too. Never feed this to deriveStatus: the gate reads s.certs,
     and an approval must not move it (spec §4.4). */
  _dkCertsFor(s) {
    if (!s) return [];
    const own = s.certs || [];
    const evidence = this.state.dkEvidence || [];
    const merged = DK_certsWithApproved(
      s.id,
      own.map((c) => ({ name: c.label, state: c.state })),
      evidence,
    );
    if (merged.length === own.length) return own;
    return own.concat(
      merged.slice(own.length).map((c) => {
        const from = evidence.find(
          (e) =>
            e.supplierId === s.id &&
            e.kind === 'new' &&
            e.stage === 'approved' &&
            e.certLabel === c.name,
        );
        /* 'valid to Aug 2029', as the roster writes it; non-breaking, because an
           added certificate's name is long and the detail must not split */
        const expires = from
          ? DK_formatDateGB(from.expiresOn).split(' ').slice(1).join(DK_NBSP)
          : '';
        return {
          label: c.name,
          state: 'ok',
          detail: expires ? ['valid', 'to', expires].join(DK_NBSP) : 'verified by the SVS team',
        };
      }),
    );
  },
});

/* ---------- registration ---------- */

(Component._features = Component._features || []).push({
  state() {
    const get = (k, d) => this._get(k, d);
    return {
      dkEvidence: DK_readEvidence(get),
      dkApplications: DK_readApplications(get),
      dkQuotes: DK_readQuotes(get),
    };
  },

  vals(st) {
    /* The SVS sidebar badge (30-chrome.html): evidence waiting on the SVS
       team, in the info tone. A queue to work, not a lapse, so it is not the
       bell's business and it hides at zero, as the site's does. */
    const open = DK_evidenceOpenCount(st.dkEvidence || []);
    return {
      svNavBadge: String(open),
      svNavBadgeShow: open > 0,
    };
  },

  escape() {
    return false;
  },
});
