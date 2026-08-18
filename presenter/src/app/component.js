/* GAC Connect presenter · behaviour. Routing, the Advantage opening
   (4-slide sequence shown before the platform), loader, tier business
   rules (§3.1/§3.3), booking + SVS blocked rule, tour, toasts, and the
   renderVals() binding map consumed by the sc-templates in src/partials/.
   Runs inside the dc-runtime as new Function('DCLogic', ...); the class
   MUST stay named Component. Demo data lives in app/data.js (DC_DATA). */
class Component extends DCLogic {
  constructor(props) {
    super(props);

    Object.assign(this, DC_DATA);   // all demo/business data — see app/data.js

    const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rawHash = (typeof window !== 'undefined' ? location.hash : '').replace(/^#\/?/, '');
    const presWanted = (this.props.presenter ?? true) && (rawHash === '' || rawHash === 'present');
    const loaderWanted = !presWanted && (this.props.loader ?? true) && !reduced && sessionStorage.getItem('gac-connect:loader-seen') !== '1';
    const parsed = this._parseHash();
    this.ctaRef = React.createRef();   // "Enter the platform" button on the closer slide

    this.state = {
      route: parsed.route || (this.props.startScreen ?? 'home'),
      profileId: parsed.profileId,
      loader: loaderWanted ? 'visible' : 'gone',
      chip: 'All', query: '', sort: 'featured', esgOnly: false,
      svsFilter: 'all',
      calc: this._get('calc', { agency: true, logistics: false, customs: false, spend: 500000 }),
      drawerOpen: false,
      modal: null,
      rq: null,
      toast: { msg: '', tag: '' }, toastOn: false,
      accepted: this._get('accepted', null),
      sent: this._get('sent', false),
      tourDismissed: this._get('tour-dismissed', false),
      tourStep: null,
      hbSel: null,
      /* Advantage opening: presOn shows the overlay, advSlide 0..3 is the active
         slide, advOp/advPe drive the fade-out into the platform. */
      presOn: presWanted, advSlide: 0, advOp: '1', advPe: 'auto'
    };
    /* Feature modules (app/features/*.js — Launches, Procurement, Crew change,
       added after the 17 Aug review) contribute their own initial state. */
    Object.assign(this.state, this._featureState());

    this._goCache = {};
  }

  /* ---------- feature-module extension points ----------
     Each module in app/features/ extends Component.prototype after this class
     is defined (the runtime returns Component after the whole script runs).
     They register themselves in FEATURES so the core stays unaware of them:
       state()     → initial state keys
       vals(st)    → renderVals bindings
       escape()    → true if Escape closed something the module owns
     Nothing here references a specific feature. */
  get FEATURES() { return Component._features || (Component._features = []); }
  _featureState() {
    return this.FEATURES.reduce((acc, f) => Object.assign(acc, f.state ? f.state.call(this) : {}), {});
  }
  _featureVals(st) {
    return this.FEATURES.reduce((acc, f) => Object.assign(acc, f.vals ? f.vals.call(this, st) : {}), {});
  }
  _featureEscape() {
    return this.FEATURES.some((f) => f.escape ? f.escape.call(this) : false);
  }

  /* ---------- storage adapter ---------- */
  _get(k, d) { try { const v = localStorage.getItem('gac-connect:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  _set(k, v) { try { localStorage.setItem('gac-connect:' + k, JSON.stringify(v)); } catch (e) {} }

  /* ---------- interactive harbour (landing hero) ---------- */
  _hbPick(id) { return () => this.setState({ hbSel: this.state.hbSel === id ? null : id }); }
  _hbF(field) { const id = this.state.hbSel; return id ? this.HARBOUR[id][field] : ''; }
  _hbB(i) { const id = this.state.hbSel; return id ? this.HARBOUR[id].bullets[i] : ''; }
  _hbChip(id) {
    return 'pointer-events:none;position:absolute;top:-16px;left:50%;transform:translateX(-50%);z-index:3;border-radius:999px;padding:4px 12px;font-size:12.5px;font-weight:700;white-space:nowrap;box-shadow:0 2px 10px rgba(4,16,31,.4);transition:background-color .2s;' +
      (this.state.hbSel === id ? 'background:#FFC72C;color:#0A2540;' : 'background:#FFFFFF;color:#0A2540;');
  }
  _hbGlow(id) {
    return 'display:block;width:100%;height:auto;transition:filter .25s;' +
      (this.state.hbSel === id ? 'filter:drop-shadow(0 0 3px rgba(255,199,44,.95)) drop-shadow(0 8px 22px rgba(255,199,44,.45));' : 'filter:drop-shadow(0 8px 14px rgba(4,16,31,.4));');
  }

  /* ---------- routing ---------- */
  _parseHash() {
    const h = (typeof location !== 'undefined' ? location.hash : '').replace(/^#\/?/, '');
    if (!h) return { route: '', profileId: null };
    const parts = h.split('/');
    if (parts[0] === 'supplier' && parts[1]) return { route: 'supplier', profileId: parts[1] };
    const valid = ['home', 'clients', 'suppliers', 'about', 'dashboard', 'marketplace', 'launches', 'procurement', 'crew-change', 'quotes', 'tiers', 'svs', 'analytics', 'certification', 'bunkers', 'kitchen-sink'];
    return { route: valid.includes(parts[0]) ? parts[0] : 'home', profileId: null };
  }
  nav(r) {
    if (typeof location !== 'undefined') {
      const target = '#/' + r;
      if (location.hash === target) return;
      location.hash = target;
    }
  }
  _go(r) {
    if (!this._goCache[r]) this._goCache[r] = () => this.nav(r);
    return this._goCache[r];
  }

  componentDidMount() {
    /* The static splash in src/index.html covered the viewport while the
       runtime and React loaded; React has now committed the first frame
       (layout-effect timing, before paint), so drop it. */
    const splash = document.getElementById('gac-presenter-splash');
    if (splash) splash.remove();
    this._onHash = () => {
      const p = this._parseHash();
      this.setState({ route: p.route || (this.props.startScreen ?? 'home'), profileId: p.profileId });
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', this._onHash);
    this._onKey = (e) => {
      if (e.key === 'Escape') {
        if (this._featureEscape()) { /* a feature module closed its own modal */ }
        else if (this.state.rq) this.setState({ rq: null });
        else if (this.state.modal) this.setState({ modal: null });
        else if (this.state.drawerOpen) this.setState({ drawerOpen: false });
        else if (this.state.tourStep !== null) this._skipTour();
        this._hideLoader();
      }
    };
    window.addEventListener('keydown', this._onKey);
    /* Advantage opening keys (same map as the standalone build):
       → / Space / PageDown next · Enter next, or enter the platform on the closer ·
       ← / PageUp back · Esc jumps to the closer.
       Two additions the standalone did not need because nothing sat beneath it:
       Tab is trapped inside the overlay (the platform renders underneath and must
       not receive focus), and Enter on a focused dot/CTA button is left to that
       button's own click so it is never handled twice. */
    this._onPresKey = (e) => {
      if (!this.state.presOn || this._advLeaving) return;
      if (e.key === 'Tab') { this._advTrapTab(e); return; }
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Spacebar' || e.key === 'PageDown') { e.preventDefault(); this._advNext(); return; }
      if (e.key === 'Enter') {
        if (e.target && e.target.closest && e.target.closest('.adv button')) return;   // the focused control acts
        if (this.state.advSlide === this.ADV_SLIDES - 1) this._advEnter(); else this._advNext();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); this._advPrev(); return; }
      if (e.key === 'Escape') this._advGo(this.ADV_SLIDES - 1);
    };
    window.addEventListener('keydown', this._onPresKey);
    if (this.state.presOn) document.body.style.overflow = 'hidden';
    if (this.state.loader === 'visible') this._loaderTimer = setTimeout(() => this._hideLoader(), 4800);
    this._selfTest();
  }
  componentDidUpdate() {
    /* Dialog focus parity with the site's Modal: when any [role=dialog] appears,
       move focus to its first control (remembering what had focus); when the
       last dialog goes, give focus back. Runs after every commit, so it costs
       one querySelector; it never steals focus while a dialog is already open. */
    const dlg = document.querySelector('[role="dialog"]');
    if (!dlg) {
      if (this._dlgOpen) {
        this._dlgOpen = false;
        const back = this._dlgReturn; this._dlgReturn = null;
        if (back && document.contains(back) && typeof back.focus === 'function') back.focus();
      }
      return;
    }
    if (this._dlgOpen) return;
    this._dlgOpen = true;
    this._dlgReturn = document.activeElement;
    const first = dlg.querySelector('input:not([type="hidden"]),select,textarea,button:not([disabled]),[tabindex]:not([tabindex="-1"])');
    if (first && !dlg.contains(document.activeElement)) first.focus();
  }
  componentWillUnmount() {
    window.removeEventListener('hashchange', this._onHash);
    window.removeEventListener('keydown', this._onKey);
    window.removeEventListener('keydown', this._onPresKey);
    clearTimeout(this._loaderTimer); clearTimeout(this._loaderTimer2);
    clearTimeout(this._toastTimer); clearTimeout(this._routeTimer);
    clearTimeout(this._presT); clearTimeout(this._navT);
    document.body.style.overflow = '';
  }

  /* ---------- Advantage opening (partials/20-opening.html) ----------
     Ported 1:1 from the standalone "GAC Connect Advantage" build: slide state
     lives in st.advSlide and the CSS does the rest via the .active class. The
     one deliberate difference is the closer's CTA, which fades the overlay into
     the embedded platform home instead of linking to the live site. */
  get ADV_SLIDES() { return 4; }
  _advGo(i) {
    if (!this.state.presOn || this._advLeaving) return;
    if (i < 0 || i >= this.ADV_SLIDES || i === this.state.advSlide) return;
    this.setState({ advSlide: i });
  }
  _advNext() {
    if (!this.state.presOn || this._advLeaving) return;
    if (this.state.advSlide === this.ADV_SLIDES - 1) { this._advPulse(); return; }
    this._advGo(this.state.advSlide + 1);
  }
  _advPrev() { this._advGo(this.state.advSlide - 1); }
  _advDot(i, e) {
    /* a MOUSE click on a dot drops focus afterwards so a following Enter advances
       the deck rather than re-activating the dot (e.detail is 0 for keyboard-
       synthesised clicks, which keep focus so Enter/Space still work on the dot) */
    if (e && e.detail > 0 && e.currentTarget && e.currentTarget.blur) e.currentTarget.blur();
    this._advGo(i);
  }
  _advTrapTab(e) {
    const root = document.querySelector('.adv'); if (!root) return;
    const focusable = Array.from(root.querySelectorAll('button')).filter((b) => {
      const cs = getComputedStyle(b);
      return cs.visibility !== 'hidden' && cs.display !== 'none' && b.offsetParent !== null;
    });
    if (!focusable.length) { e.preventDefault(); return; }
    const i = focusable.indexOf(document.activeElement);
    let next;
    if (e.shiftKey) next = i <= 0 ? focusable[focusable.length - 1] : focusable[i - 1];
    else next = i < 0 || i === focusable.length - 1 ? focusable[0] : focusable[i + 1];
    e.preventDefault();
    next.focus();
  }
  _advPulse() {
    /* restart the CTA pulse: same classList dance as the original (React leaves
       the class alone because the bound className never changes) */
    const el = this.ctaRef.current; if (!el) return;
    el.classList.remove('pulse');
    void el.offsetWidth;
    el.classList.add('pulse');
  }
  _advEnter() {
    if (!this.state.presOn || this._advLeaving) return;
    this._advLeaving = true;
    /* the platform home is already rendered beneath the overlay: fade the
       overlay out (opening.css transition), normalise the route, then unmount */
    this.setState({ advOp: '0', advPe: 'none' });
    this._navT = setTimeout(() => this.nav('home'), 60);
    this._presT = setTimeout(() => {
      document.body.style.overflow = '';
      this._advLeaving = false;
      this.setState({ presOn: false });
    }, 900);
  }

  /* ---------- loader ---------- */
  _hideLoader() {
    if (this.state.loader === 'gone' || this.state.loader === 'hiding') return;
    try { sessionStorage.setItem('gac-connect:loader-seen', '1'); } catch (e) {}
    this.setState({ loader: 'hiding' });
    this._loaderTimer2 = setTimeout(() => this.setState({ loader: 'gone' }), 850);
  }
  _mark(text) {
    if (this._markText === text && this._markEl) return this._markEl;
    const n = Math.min(text.length, 4) || 3;
    const chars = (text || 'GAC').slice(0, 4).split('');
    const kids = [];
    const anims = ['lG', 'lA', 'lC'];
    chars.forEach((c, i) => {
      const x = 280 + (i - (chars.length - 1) / 2) * 160;
      kids.push(React.createElement('text', {
        key: 'l' + i, x: x, y: 140, textAnchor: 'middle', fill: '#FFFFFF',
        style: { fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '120px', letterSpacing: '-.02em', opacity: 0, transformBox: 'fill-box', transformOrigin: 'center', animation: anims[i % 3] + ' .9s ' + (0.3 + i * 0.25) + 's cubic-bezier(.34,1.56,.64,1) forwards' }
      }, c));
    });
    for (let g = 0; g < chars.length - 1; g++) {
      const mid = 280 + ((g + 0.5) - (chars.length - 1) / 2) * 160;
      [-24, 0, 24].forEach((dx, j) => {
        kids.push(React.createElement('ellipse', {
          key: 'k' + g + '-' + j, cx: mid + dx, cy: 105, rx: j === 1 ? 6 : 10, ry: j === 1 ? 10 : 6,
          fill: 'none', stroke: '#FFC72C', strokeWidth: 4, strokeLinecap: 'round',
          style: { opacity: 0, transform: 'scale(0)', transformBox: 'fill-box', transformOrigin: 'center', animation: 'linkPop .3s ' + (1.1 + g * 0.35 + j * 0.1) + 's cubic-bezier(.34,1.56,.64,1) forwards' }
        }));
      });
    }
    this._markText = text;
    this._markEl = React.createElement('svg', { viewBox: '0 0 560 200', style: { width: '560px', maxWidth: '92vw', height: '200px', overflow: 'visible' }, 'aria-hidden': true }, kids);
    return this._markEl;
  }

  /* ---------- business rules (03 §3.1 / §3.3) ---------- */
  tierPct(a) {
    const on = Object.keys(this.TIERS).filter((k) => a[k]);
    return on.length ? Math.max(...on.map((k) => this.TIERS[k])) : 0;
  }
  isFullStack(a) { return !!(a.agency && a.logistics && a.customs); }
  annualSaving(spend, a) { return Math.round(spend * this.tierPct(a) / 100); }
  deriveStatus(s) {
    if (s.certs.some((c) => c.state === 'lapsed')) return 'blocked';
    if (s.certs.some((c) => c.state === 'due')) return 'due';
    return 'verified';
  }
  _selfTest() {
    const t = (a, l, c) => this.tierPct({ agency: a, logistics: l, customs: c });
    const cases = [
      [t(false, false, false), 0], [t(true, false, false), 2], [t(false, true, false), 4],
      [t(false, false, true), 7], [t(true, true, false), 4], [t(true, false, true), 7], [t(true, true, true), 7],
      [this.annualSaving(500000, { agency: true, logistics: true, customs: true }), 35000],
      [this.annualSaving(100000, { agency: true, logistics: false, customs: false }), 2000]
    ];
    const pass = cases.every((c) => c[0] === c[1]) && this.isFullStack({ agency: true, logistics: true, customs: true }) === true;
    console.log('[GAC Connect] 03 §3.1 rule tests: ' + (pass ? 'PASS (10/10)' : 'FAIL') + ' · blocked-beats-promotion enforced in booking handler');
  }

  /* ---------- toast ---------- */
  toastMsg(msg, tag) {
    clearTimeout(this._toastTimer);
    this.setState({ toast: { msg: msg, tag: tag || '' }, toastOn: true });
    this._toastTimer = setTimeout(() => this.setState({ toastOn: false }), 5200);
  }

  /* ---------- booking (blocked rule enforced here, not just in UI) ---------- */
  _requestQuote(s) {
    if (this.deriveStatus(s) === 'blocked') {
      this.toastMsg(s.name + ' is blocked — insurance certificate lapsed. Booking is refused until evidence is uploaded and verified.', 'SVS');
      return;
    }
    this.setState({ rq: { id: s.id, name: s.name, cat: s.cat, windowId: '4h', related: {}, meals: false, nights: 1, bookedWindow: 'Fri 06:00–18:00' } });
  }
  /* Deadline advice — a taxi can be quoted in ten minutes; a crane cannot. */
  _deadlineAdvice(hours) {
    if (hours < 1) return { tone: 'warn', text: 'Very short windows rarely draw a full set of replies. A taxi can be quoted in ten minutes; a crane, a medic, or a scaffold crew cannot. Give more time and expect a better quote.' };
    if (hours < 4) return { tone: 'info', text: 'Workable for most services. Suppliers with the job in front of them reply fastest; expect fewer replies on specialist lines.' };
    return { tone: 'ok', text: 'A full window. Suppliers can check availability properly, so expect more replies and sharper prices.' };
  }
  _mealPerDay(nights) {
    const n = Math.max(1, nights);
    const band = this.MEAL_SCALE.find((b) => n <= b.upToNights) || this.MEAL_SCALE[this.MEAL_SCALE.length - 1];
    return band.perDay;
  }
  _rqSet(patch) { this.setState({ rq: Object.assign({}, this.state.rq, patch) }); }
  _sendRq() {
    const rq = this.state.rq; if (!rq) return;
    const win = this.REPLY_WINDOWS.find((w) => w.id === rq.windowId) || this.REPLY_WINDOWS[3];
    const service = this.CATEGORY_SERVICE[rq.cat] || rq.cat;
    const isHotel = rq.cat === 'Hotels';
    const related = (this.RELATED[rq.cat] || []).filter((r) => rq.related[r.id]);
    const hotelChosen = related.some((r) => r.meals);
    const mealLine = 'meal allowance ' + this._gbp(this._mealPerDay(rq.nights)) + '/day, ' + rq.nights + (rq.nights === 1 ? ' night' : ' nights');
    const parts = [(isHotel ? 'Booking request' : 'Quote request') + ' sent to ' + rq.name + ' — ' + service + ', MV Caledonian Star.', 'Reply-by window: ' + win.label + '.'];
    if (isHotel) parts.push('Rate indicative and subject to availability — your agent confirms the booking on the platform' + (rq.meals ? ' (' + mealLine + ')' : '') + '.');
    if (this._isOverrunCat(rq.cat)) parts.push('Price covers the booked window ' + (rq.bookedWindow || '').trim() + '; overrun not included, subject to change, supplier T&Cs included.');
    if (related.length) parts.push(related.length + ' related ' + (related.length === 1 ? 'service' : 'services') + ' passed to your GAC agent' + (hotelChosen && rq.meals ? ' (' + mealLine + ')' : '') + '.');
    this.setState({ rq: null });
    this.toastMsg(parts.join(' '));
  }
  _openModal(name, price) {
    const s = this.SUPPLIERS.find((x) => x.name === name);
    if (s && this.deriveStatus(s) === 'blocked') {
      this.toastMsg(name + ' is blocked — booking refused by the SVS.', 'SVS');
      return;
    }
    this.setState({ modal: { name: name, price: price } });
  }
  _confirmBooking() {
    const m = this.state.modal; if (!m) return;
    this.setState({ modal: null, accepted: m.name });
    this._set('accepted', m.name);
    this.toastMsg('Booked with ' + m.name + ' at ' + m.price + '. PO 48211 generated in GAC Agent — billing split 60/40 Browne Energy / Grizzell Marine applied automatically.', 'GA');
  }

  /* ---------- listing facts + hire terms (17 Aug review; mirrors lib/marketplace.ts + data/serviceTerms.ts) ---------- */
  _listingFacts(s) {
    if (s.facts && s.facts.length) return s.facts;
    const l = s.launch; if (!l) return [];
    return [
      { label: 'Port', value: l.port },
      { label: 'Max capacity', value: l.maxPassengers + ' passengers' },
      { label: 'Freight', value: l.freightIncluded ? 'Included' : 'Not included' }
    ];
  }
  _isOverrunCat(cat) { return this.OVERRUN_CATEGORIES.includes(cat); }
  _termsFor(cat) { return this._isOverrunCat(cat) ? this.OVERRUN_TERMS : ''; }

  /* ---------- format helpers ---------- */
  _gbp(n) { return '£' + n.toLocaleString('en-GB'); }
  _esgStyle(e) {
    const c = e === 'A' ? '#047857' : e === 'B' ? '#3E7C2F' : '#B45309';
    return 'font-weight:700;color:' + c + ';';
  }

  renderVals() {
    const st = this.state;
    const brandName = (this.props.brandName ?? 'GAC Connect').trim() || 'GAC Connect';
    const bParts = brandName.split(/\s+/);
    const brandMainUpper = bParts[0].toUpperCase();
    const brandSubUpper = bParts.slice(1).join(' ').toUpperCase() || 'CONNECT';
    const route = st.route;

    const platformRoutes = ['dashboard', 'marketplace', 'supplier', 'launches', 'procurement', 'crew-change', 'quotes', 'tiers', 'svs', 'analytics', 'certification', 'bunkers', 'kitchen-sink'];
    const isPlatform = platformRoutes.includes(route);

    /* nav — eleven platform items after the 17 Aug review, so the padding is
       tight (mirrors the site's AppLayout) and the tier screen is "Tiers" */
    const mk = (label, r, beta) => ({
      label: label, beta: !!beta, pressed: (route === r || (r === 'marketplace' && route === 'supplier')) ? 'true' : 'false',
      go: this._go(r),
      style: 'background:none;border:none;padding:8px 8px;border-radius:6px;font-weight:600;font-size:13px;white-space:nowrap;cursor:pointer;font-family:inherit;' +
        ((route === r || (r === 'marketplace' && route === 'supplier')) ? 'color:#FFFFFF;background:rgba(255,255,255,.14);box-shadow:inset 0 -3px 0 #C9A227;' : 'color:#B9C8D6;')
    });
    const navItems = isPlatform
      ? [mk('Dashboard', 'dashboard'), mk('Marketplace', 'marketplace'), mk('Launches', 'launches'), mk('Procurement', 'procurement'), mk('Crew change', 'crew-change'), mk('Quotes', 'quotes'), mk('Tiers', 'tiers'), mk('SVS', 'svs'), mk('Analytics', 'analytics'), mk('Certification', 'certification', true), mk('Bunkers', 'bunkers', true)]
      : [mk('Home', 'home'), mk('For Clients', 'clients'), mk('For Suppliers', 'suppliers'), mk('About', 'about')];

    /* marketplace */
    const q = st.query.toLowerCase();
    const match = (s) => {
      const inCat = st.chip === 'All' || s.tags.includes(st.chip);
      const inQ = !q || (s.name + ' ' + s.desc + ' ' + s.cat).toLowerCase().includes(q);
      const inEsg = !st.esgOnly || s.esg === 'A' || s.esg === 'B';
      return inCat && inQ && inEsg;
    };
    const sorters = {
      featured: (a, b) => (b.rating || 0) - (a.rating || 0),
      rating: (a, b) => (b.rating || 0) - (a.rating || 0),
      esg: (a, b) => a.esg.localeCompare(b.esg) || (b.rating || 0) - (a.rating || 0),
      name: (a, b) => a.name.localeCompare(b.name)
    };
    const sorter = sorters[st.sort] || sorters.featured;

    const inhouseList = this.INHOUSE.filter(match).map((s) => ({
      name: s.name, desc: s.desc, cat: s.cat, esg: s.esg, esgStyle: this._esgStyle(s.esg), tierLabel: s.tierLabel,
      cardStyle: 'display:grid;grid-template-columns:1fr auto;gap:14px;padding:16px 18px;margin-bottom:12px;border-radius:10px;box-shadow:0 1px 3px rgba(10,37,64,.08),0 4px 14px rgba(10,37,64,.06);border:1.5px solid #C9A227;background:linear-gradient(180deg,#FFFDF4,#FFFFFF 60%);',
      /* Procurement has its own working example (the Compass flow) — mirrors the site */
      actionLabel: s.id === 'gac-procurement' ? 'Send a list to Compass' : 'Engage service',
      onAction: s.id === 'gac-procurement'
        ? this._go('procurement')
        : () => this.toastMsg('Request sent to your GAC agent — surfaced inside the existing relationship, not a new queue.')
    }));

    let third = this.SUPPLIERS.filter(match).slice().sort(sorter);
    third = third.slice().sort((a, b) => (b.promoted ? 1 : 0) - (a.promoted ? 1 : 0)); // promoted first, within third-party only
    const thirdList = third.map((s) => {
      const status = this.deriveStatus(s);
      const blocked = status === 'blocked';
      const facts = this._listingFacts(s);
      return {
        name: s.name, desc: s.desc, cat: s.cat, esg: s.esg, esgStyle: this._esgStyle(s.esg),
        ratingLabel: s.rating.toFixed(1) + ' ★',
        ratingCountLabel: '· ' + s.ratingCount + ' ratings',
        facts: facts, hasFacts: facts.length > 0,
        terms: this._termsFor(s.cat), hasTerms: !!this._termsFor(s.cat),
        goldBand: s.goldBand === 'held' && !blocked,
        promoted: !!s.promoted, blocked: blocked, due: status === 'due', verified: !blocked,
        cardStyle: 'display:grid;grid-template-columns:1fr auto;gap:14px;padding:16px 18px;margin-bottom:12px;border-radius:10px;box-shadow:0 1px 3px rgba(10,37,64,.08),0 4px 14px rgba(10,37,64,.06);' +
          (s.promoted ? 'border:1.5px solid #C9BCF0;background:linear-gradient(180deg,#FBFAFF,#FFFFFF 60%);' : 'border:1px solid #E5EAF1;background:#FFFFFF;') + (blocked ? 'opacity:.92;' : ''),
        actionLabel: blocked ? 'Unavailable' : 'Request quote',
        actionStyle: blocked
          ? 'background:#FFFFFF;color:#9AA8B8;border:1.5px solid #E5EAF1;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13.5px;cursor:not-allowed;white-space:nowrap;'
          : 'background:#FFFFFF;color:#0E5E8A;border:1.5px solid #CBD6E2;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13.5px;cursor:pointer;white-space:nowrap;',
        onAction: () => this._requestQuote(s),
        onOpen: () => this.nav('supplier/' + s.id)
      };
    });

    const chips = this.CATEGORIES.map((c) => ({
      label: c, pressed: st.chip === c ? 'true' : 'false',
      style: 'border-radius:999px;padding:6px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;' +
        (st.chip === c ? 'background:#0A2540;border:1.5px solid #0A2540;color:#FFFFFF;' : 'background:#FFFFFF;border:1.5px solid #CBD6E2;color:#33475F;'),
      on: () => this.setState({ chip: c })
    }));

    /* calculator */
    const calc = st.calc;
    const pct = this.tierPct(calc);
    const full = this.isFullStack(calc);
    const save = this.annualSaving(calc.spend, calc);
    let tierNote;
    if (pct === 0) tierNote = 'No GAC services selected — no tier discount applies. Marketplace access is unaffected.';
    else if (full) tierNote = 'Full Stack: all three pillars in use. The 7% tier applies across the client’s GAC service spend — the highest single tier, not 2+4+7.';
    else if (pct === 7) tierNote = 'Qualifying tier: GAC Customs (7%) — already the top tier. Adding the other pillars deepens consolidation at the same rate.';
    else if (pct === 4) tierNote = 'Qualifying tier: GAC Logistics (4%). Adding Customs lifts the client to the 7% top tier.';
    else tierNote = 'Qualifying tier: GAC Agency (2%). Adding Logistics lifts the client to 4%; adding Customs to 7%.';

    const setCalc = (patch) => {
      const next = Object.assign({}, this.state.calc, patch);
      this.setState({ calc: next });
      this._set('calc', next);
    };
    const swStyle = (on) => 'position:relative;width:46px;height:26px;border-radius:999px;border:none;cursor:pointer;flex-shrink:0;transition:background .2s;background:' + (on ? '#0E5E8A' : '#CBD6E2') + ';';
    const swKnob = (on) => 'position:absolute;top:3px;left:' + (on ? '23px' : '3px') + ';width:20px;height:20px;border-radius:50%;background:#FFFFFF;transition:left .2s;display:block;';

    /* tour */
    const tourOpen = st.tourStep !== null;
    const stop = tourOpen ? this.TOUR[st.tourStep] : null;
    this._skipTour = this._skipTour || (() => { this.setState({ tourStep: null, tourDismissed: true }); this._set('tour-dismissed', true); });

    /* quote-request modal */
    const rq = st.rq;
    const chipBase = 'min-height:34px;border-radius:999px;padding:5px 12px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;';
    const chipOn = 'background:#0A2540;border:1.5px solid #0A2540;color:#FFFFFF;';
    const chipOff = 'background:#FFFFFF;border:1.5px solid #CBD6E2;color:#33475F;';
    const rqWin = rq ? (this.REPLY_WINDOWS.find((w) => w.id === rq.windowId) || this.REPLY_WINDOWS[3]) : this.REPLY_WINDOWS[3];
    const rqAdvice = this._deadlineAdvice(rqWin.hours);
    const rqWindows = this.REPLY_WINDOWS.map((w) => ({
      label: w.label, pressed: rq && rq.windowId === w.id ? 'true' : 'false',
      style: chipBase + (rq && rq.windowId === w.id ? chipOn : chipOff),
      on: () => this._rqSet({ windowId: w.id })
    }));
    const rqRelated = rq ? (this.RELATED[rq.cat] || []).map((r) => {
      const on = !!rq.related[r.id];
      return {
        id: r.id, label: r.label, body: r.body, hasCaveat: !!r.caveat, caveat: this.HOTEL_CAVEAT,
        mark: on ? '☑' : '☐', pressed: on ? 'true' : 'false',
        style: 'background:none;border:none;padding:0;font-size:13px;font-weight:700;color:#0A2540;cursor:pointer;font-family:inherit;text-align:left;',
        showMeal: !!(r.meals && on),
        on: () => { const rel = Object.assign({}, this.state.rq.related); rel[r.id] = !rel[r.id]; this._rqSet({ related: rel }); }
      };
    }) : [];
    const rqNightChips = [1, 2, 3, 4, 5, 7].map((n) => ({
      label: String(n), pressed: rq && rq.nights === n ? 'true' : 'false',
      style: 'min-height:30px;border-radius:999px;padding:3px 10px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;margin-left:6px;' + (rq && rq.nights === n ? chipOn : chipOff),
      on: () => this._rqSet({ nights: n })
    }));

    /* quotes */
    const quotesList = this.QUOTES.map((qc) => {
      const isAccepted = st.accepted === qc.name;
      return {
        name: qc.name, price: qc.price, avail: qc.avail, capacity: qc.capacity, rating: qc.rating, esg: qc.esg, src: qc.src,
        dotColor: qc.outlook ? '#0F6CBD' : '#047857',
        best: !!qc.best,
        accepted: isAccepted,
        cardStyle: 'display:flex;flex-direction:column;gap:10px;padding:18px;border-radius:10px;box-shadow:0 1px 3px rgba(10,37,64,.08),0 4px 14px rgba(10,37,64,.06);' +
          (isAccepted ? 'border:1.5px solid #047857;background:linear-gradient(180deg,#F2FAF6,#FFFFFF 60%);' : (qc.best ? 'border:1.5px solid #0E5E8A;background:#FFFFFF;' : 'border:1px solid #E5EAF1;background:#FFFFFF;')),
        actionLabel: isAccepted ? 'Booked ✓ · PO 48211' : 'Accept quote',
        actionStyle: isAccepted
          ? 'background:#E7F4EF;color:#047857;border:none;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13.5px;cursor:default;margin-top:auto;'
          : (qc.best ? 'background:#0E5E8A;color:#FFFFFF;border:none;' : 'background:#FFFFFF;color:#0E5E8A;border:1.5px solid #CBD6E2;') + 'border-radius:8px;padding:9px 16px;font-weight:700;font-size:13.5px;cursor:pointer;margin-top:auto;',
        onAccept: () => this._openModal(qc.name, qc.price)
      };
    });

    /* supplier profile */
    const certChip = (c) => ({
      label: c.label, detail: c.detail,
      stateLabel: c.state === 'ok' ? 'Valid' : (c.state === 'due' ? 'Due' : 'Lapsed'),
      chipStyle: 'display:inline-block;border-radius:6px;padding:2px 8px;font-size:11.5px;font-weight:700;white-space:nowrap;flex-shrink:0;' +
        (c.state === 'ok' ? 'background:#E7F4EF;color:#047857;' : (c.state === 'due' ? 'background:#FBF0E1;color:#B45309;' : 'background:#FBEAEA;color:#B91C1C;'))
    });
    const prof = route === 'supplier' ? this.SUPPLIERS.find((s) => s.id === st.profileId) : null;
    const profStatus = prof ? this.deriveStatus(prof) : '';

    /* svs */
    const svsChips = [
      { key: 'all', label: 'All suppliers' }, { key: 'verified', label: 'Verified' },
      { key: 'due', label: 'Renewal due' }, { key: 'blocked', label: 'Blocked' }
    ].map((f) => ({
      label: f.label, pressed: st.svsFilter === f.key ? 'true' : 'false',
      style: 'border-radius:999px;padding:6px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;' +
        (st.svsFilter === f.key ? 'background:#0A2540;border:1.5px solid #0A2540;color:#FFFFFF;' : 'background:#FFFFFF;border:1.5px solid #CBD6E2;color:#33475F;'),
      on: () => this.setState({ svsFilter: f.key })
    }));
    const svsRows = this.SUPPLIERS
      .filter((s) => st.svsFilter === 'all' || this.deriveStatus(s) === st.svsFilter)
      .map((s) => {
        const status = this.deriveStatus(s);
        return {
          name: s.name, cat: s.cat, esg: s.esg, esgStyle: this._esgStyle(s.esg),
          rating: s.rating.toFixed(1) + ' ★ · ' + s.ratingCount + ' ratings',
          gold: s.goldBand === 'held' && status !== 'blocked',
          certs: s.certs.map((c) => ({
            text: c.label + (c.state === 'ok' ? '' : (c.state === 'due' ? ' · due' : ' · lapsed')),
            style: 'display:inline-block;border-radius:6px;padding:2px 8px;font-size:11.5px;font-weight:700;margin:1px 2px;white-space:nowrap;' +
              (c.state === 'ok' ? 'background:#E7F4EF;color:#047857;' : (c.state === 'due' ? 'background:#FBF0E1;color:#B45309;' : 'background:#FBEAEA;color:#B91C1C;'))
          })),
          statusLabel: status === 'blocked' ? '✗ Blocked' : (status === 'due' ? '⚠ Renewal due' : '✓ Verified'),
          statusStyle: 'display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:3px 10px;font-size:11.5px;font-weight:700;white-space:nowrap;' +
            (status === 'blocked' ? 'background:#FBEAEA;color:#B91C1C;' : (status === 'due' ? 'background:#FBF0E1;color:#B45309;' : 'background:#E7F4EF;color:#047857;')),
          onOpen: () => this.nav('supplier/' + s.id)
        };
      });

    /* Advantage opening */
    const adv = st.advSlide;
    const pad2 = (n) => (n < 10 ? '0' : '') + n;
    const advCls = (i) => 'slide slide-' + (i + 1) + (i === 3 ? ' closer' : '') + (adv === i ? ' active' : '');
    const advHid = (i) => (adv === i ? 'false' : 'true');
    const ADV_DOT_LABELS = ['Slide 1 — chess', 'Slide 2 — F1', 'Slide 3 — Hyrox', 'Slide 4 — GAC Connect'];
    if (!this._advGoCache) this._advGoCache = ADV_DOT_LABELS.map((_, i) => (e) => this._advDot(i, e));

    return {
      /* brand */
      brandName: brandName, brandMainUpper: brandMainUpper, brandSubUpper: brandSubUpper,
      brandUpper: brandName.toUpperCase(),

      /* Advantage opening */
      presOn: st.presOn,
      advOp: st.advOp, advPe: st.advPe,
      advStageClick: (e) => { if (e && e.target && e.target.closest && e.target.closest('a,button')) return; this._advNext(); },
      advEnter: () => this._advEnter(),
      ctaRef: this.ctaRef,
      advCounter: pad2(adv + 1) + ' / ' + pad2(this.ADV_SLIDES),
      advCls1: advCls(0), advCls2: advCls(1), advCls3: advCls(2), advCls4: advCls(3),
      advHid1: advHid(0), advHid2: advHid(1), advHid3: advHid(2), advHid4: advHid(3),
      advDots: ADV_DOT_LABELS.map((label, i) => ({
        cls: 'dot' + (adv === i ? ' on' : ''), label: label, go: this._advGoCache[i]
      })),

      /* loader */
      loaderShown: st.loader !== 'gone',
      loaderOpacity: st.loader === 'hiding' ? '0' : '1',
      loaderMark: this._mark(brandMainUpper),
      hideLoader: () => this._hideLoader(),

      /* zones + routes */
      isPlatform: isPlatform, isMarketing: !isPlatform,
      isHome: route === 'home', isClients: route === 'clients', isSuppliers: route === 'suppliers', isAbout: route === 'about',
      isDashboard: route === 'dashboard', isMarketplace: route === 'marketplace', isProfile: route === 'supplier',
      isQuotes: route === 'quotes', isTiers: route === 'tiers', isSvs: route === 'svs', isAnalytics: route === 'analytics',
      isCert: route === 'certification', isBunkers: route === 'bunkers', isKitchen: route === 'kitchen-sink',
      isLaunches: route === 'launches', isProcurement: route === 'procurement', isCrew: route === 'crew-change',
      navItems: navItems,
      goHome: this._go('home'), goClients: this._go('clients'), goSuppliers: this._go('suppliers'), goAbout: this._go('about'),
      goDashboard: this._go('dashboard'), goMarketplace: this._go('marketplace'), goQuotes: this._go('quotes'),
      goTiers: this._go('tiers'), goSvs: this._go('svs'), goAnalytics: this._go('analytics'), goKitchen: this._go('kitchen-sink'),
      goLaunches: this._go('launches'), goProcurement: this._go('procurement'), goCrew: this._go('crew-change'),
      /* dashboard crew-change card line — a default the crew-change module overrides with a live count */
      dashCrewLine: 'No letters in progress. Hotels, immigration, LOI and repatriation-letter templates live in one place.',

      /* feature modules (app/features/*.js) — their bindings ride alongside and win over the defaults above */
      ...this._featureVals(st),

      /* interactive harbour (landing hero) */
      hbListVis: !st.hbSel,
      hbCardVis: !!st.hbSel,
      hbClear: () => this.setState({ hbSel: null }),
      hbPickAgency: this._hbPick('agency'), hbPickLogistics: this._hbPick('logistics'), hbPickCustoms: this._hbPick('customs'),
      hbPickAssets: this._hbPick('assets'), hbPickProcurement: this._hbPick('procurement'), hbPickMarketplace: this._hbPick('marketplace'),
      hbPrAgency: st.hbSel === 'agency' ? 'true' : 'false', hbPrLogistics: st.hbSel === 'logistics' ? 'true' : 'false',
      hbPrCustoms: st.hbSel === 'customs' ? 'true' : 'false', hbPrAssets: st.hbSel === 'assets' ? 'true' : 'false',
      hbPrProcurement: st.hbSel === 'procurement' ? 'true' : 'false', hbPrMarketplace: st.hbSel === 'marketplace' ? 'true' : 'false',
      hbChipAgency: this._hbChip('agency'), hbChipLogistics: this._hbChip('logistics'), hbChipCustoms: this._hbChip('customs'),
      hbChipAssets: this._hbChip('assets'), hbChipProcurement: this._hbChip('procurement'), hbChipMarketplace: this._hbChip('marketplace'),
      hbGlowAgency: this._hbGlow('agency'), hbGlowLogistics: this._hbGlow('logistics'), hbGlowCustoms: this._hbGlow('customs'),
      hbGlowAssets: this._hbGlow('assets'), hbGlowProcurement: this._hbGlow('procurement'), hbGlowMarketplace: this._hbGlow('marketplace'),
      hbTag: this._hbF('tag'),
      hbTagStyle: 'display:inline-flex;align-items:center;border-radius:999px;padding:3px 10px;font-size:11.5px;font-weight:700;' +
        (st.hbSel === 'marketplace' ? 'background:#E8F1F7;color:#0E5E8A;' : 'background:#FBF6E3;border:1px solid #E5D89A;color:#9A7B14;'),
      hbTitle: this._hbF('title'),
      hbDesc: this._hbF('desc'),
      hbB0: this._hbB(0), hbB1: this._hbB(1), hbB2: this._hbB(2),
      hbCtaLabel: st.hbSel ? this._hbF('cta') + ' →' : '',
      hbFact: this._hbF('fact'),
      hbGo: () => { const id = this.state.hbSel; if (!id) return; const r = this.HARBOUR[id].route; this.setState({ hbSel: null }); this.nav(r); },

      /* dashboard */
      todayLabel: new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
      sent: !!st.sent,
      sendLabel: st.sent ? 'Requests sent ✓' : 'Send quote requests',
      sendBtnStyle: st.sent
        ? 'background:#E7F4EF;color:#047857;border:none;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13.5px;cursor:default;'
        : 'background:#0E5E8A;color:#FFFFFF;border:none;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13.5px;cursor:pointer;',
      sendQuoteRequests: () => {
        if (this.state.sent) return;
        this.setState({ sent: true }); this._set('sent', true);
        this.toastMsg('9 quote requests issued for MV Caledonian Star. Replies will populate the comparison view.', 'SENT');
        this._routeTimer = setTimeout(() => this.nav('quotes'), 1500);
      },
      showTourPrompt: route === 'dashboard' && !st.tourDismissed && st.tourStep === null,

      /* pillars widget (bound live to calculator state) */
      p1Fill: calc.agency ? '#0E5E8A' : '#D7DFE8',
      p2Fill: calc.logistics ? '#0E5E8A' : '#D7DFE8',
      p3Fill: calc.customs ? '#0E5E8A' : '#D7DFE8',
      p4Fill: pct > 0 ? '#0E5E8A' : '#D7DFE8',
      roofFill: full ? '#C9A227' : '#E9EDF2',
      roofStroke: full ? '#9A7B14' : '#CBD6E2',
      fullStack: full,
      tierPctLabel: pct + '%',
      pctColor: full ? '#9A7B14' : '#0A2540',
      bigPctColor: pct === 7 ? '#FFC72C' : '#FFFFFF',
      dashTierLine: 'tier discount held · est. ' + this._gbp(save) + ' saved this year on ' + this._gbp(calc.spend) + ' GAC service spend',

      /* marketplace */
      query: st.query,
      onQuery: (e) => this.setState({ query: e.target.value }),
      sort: st.sort,
      onSort: (e) => this.setState({ sort: e.target.value }),
      esgPressed: st.esgOnly ? 'true' : 'false',
      esgBtnStyle: 'border-radius:8px;padding:9px 14px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;' +
        (st.esgOnly ? 'background:#0A2540;border:1.5px solid #0A2540;color:#FFFFFF;' : 'background:#FFFFFF;border:1.5px solid #CBD6E2;color:#33475F;'),
      toggleEsg: () => this.setState({ esgOnly: !this.state.esgOnly }),
      chips: chips,
      inhouseList: inhouseList, hasInhouse: inhouseList.length > 0,
      thirdList: thirdList, hasThird: thirdList.length > 0,
      promotedIncluded: thirdList.some((s) => s.promoted),
      noResults: inhouseList.length === 0 && thirdList.length === 0,
      inviteSupplier: () => this.toastMsg('Invitation link generated. New suppliers onboard through the SVS verification checklist.'),

      /* calculator */
      swAgency: calc.agency ? 'true' : 'false', swLogistics: calc.logistics ? 'true' : 'false', swCustoms: calc.customs ? 'true' : 'false',
      swAgencyStyle: swStyle(calc.agency), swLogisticsStyle: swStyle(calc.logistics), swCustomsStyle: swStyle(calc.customs),
      swAgencyKnob: swKnob(calc.agency), swLogisticsKnob: swKnob(calc.logistics), swCustomsKnob: swKnob(calc.customs),
      toggleAgency: () => setCalc({ agency: !this.state.calc.agency }),
      toggleLogistics: () => setCalc({ logistics: !this.state.calc.logistics }),
      toggleCustoms: () => setCalc({ customs: !this.state.calc.customs }),
      spend: calc.spend,
      spendLabel: this._gbp(calc.spend),
      onSpend: (e) => setCalc({ spend: parseInt(e.target.value, 10) }),
      saveLabel: this._gbp(save) + ' saved / year',
      tierNote: tierNote,

      /* quotes — the crane scenario carries the hire terms (17 Aug review) */
      quotesList: quotesList,
      quoteTermsShort: this.OVERRUN_TERMS_SHORT,
      quoteTermsFull: this.OVERRUN_TERMS,
      quoteBookedWindow: this.QUOTE_REQUEST.bookedWindow,

      /* supplier profile */
      profFound: !!prof,
      profMissing: route === 'supplier' && !prof,
      profName: prof ? prof.name : '',
      profAbout: prof ? prof.about : '',
      profCat: prof ? prof.cat : '',
      profEsg: prof ? prof.esg : '',
      profEsgStyle: prof ? this._esgStyle(prof.esg) : '',
      profRating: prof ? prof.rating.toFixed(1) + ' ★' : '',
      profRatingCount: prof ? '· ' + prof.ratingCount + ' ratings' : '',
      profGold: !!(prof && prof.goldBand === 'held' && profStatus !== 'blocked'),
      profGoldScheduled: !!(prof && prof.goldBand === 'scheduled'),
      profGoldDate: prof && prof.goldBandDate ? prof.goldBandDate : '',
      profPromoted: !!(prof && prof.promoted),
      profPremium: !!(prof && prof.premium),
      profBlocked: profStatus === 'blocked',
      profDue: profStatus === 'due',
      profVerified: !!prof && profStatus !== 'blocked',
      profCerts: prof ? prof.certs.map(certChip) : [],
      profActivity: prof ? prof.activity : [],
      profFacts: prof ? this._listingFacts(prof) : [],
      profHasFacts: !!(prof && this._listingFacts(prof).length),
      profTerms: prof ? this._termsFor(prof.cat) : '',
      profHasTerms: !!(prof && this._termsFor(prof.cat)),
      profCtaLabel: profStatus === 'blocked' ? 'Unavailable' : 'Request quote',
      profCtaStyle: profStatus === 'blocked'
        ? 'background:#FFFFFF;color:#9AA8B8;border:1.5px solid #E5EAF1;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13.5px;cursor:not-allowed;white-space:nowrap;'
        : 'background:#0E5E8A;color:#FFFFFF;border:none;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13.5px;cursor:pointer;white-space:nowrap;',
      profCta: () => { if (prof) this._requestQuote(prof); },

      /* svs */
      svsChips: svsChips,
      svsRows: svsRows,

      /* suppliers page */
      founderInterest: () => this.toastMsg('Interest registered. The founder programme covers the first 50 suppliers — first year free, with a 5-point commission-band reduction for 24 months.'),
      planFree: () => this.toastMsg('Basic plan selected — free, 20% commission band on work won through the platform. Onboarding starts with the SVS verification checklist — certificates, insurance, references.'),
      planPro: () => this.toastMsg('Professional plan selected — £900/year, 15% commission band. Onboarding starts with the SVS verification checklist.'),
      planPremium: () => this.toastMsg('Premium plan selected — £1,800/year, 10% commission band, and eligibility for the GAC Gold Band audit. A GAC onboarding manager completes SVS verification with you.'),
      silverQuote: () => this._requestQuote(this.SUPPLIERS.find((x) => x.id === 'silver-city-welding')),

      /* kitchen sink */
      kitchToast: () => this.toastMsg('This is the standard toast — confirmations and SVS refusals share this channel.', 'DEMO'),
      kitchModal: () => this._openModal('North Sea Crane Co.', '£4,850'),

      /* drawer */
      drawerRight: st.drawerOpen ? '0px' : '-420px',
      openDrawer: () => this.setState({ drawerOpen: true }),
      closeDrawer: () => this.setState({ drawerOpen: false }),
      drawerToQuotes: () => { this.setState({ drawerOpen: false }); this.nav('quotes'); },

      /* quote-request modal */
      rqOpen: !!rq,
      rqName: rq ? rq.name : '',
      rqDialogLabel: rq ? 'Request a quote — ' + rq.name : 'Quote request',
      rqService: rq ? (this.CATEGORY_SERVICE[rq.cat] || rq.cat) : '',
      rqIsHotel: !!(rq && rq.cat === 'Hotels'),
      rqIsOverrun: !!(rq && this._isOverrunCat(rq.cat)),
      rqOverrunTerms: this.OVERRUN_TERMS,
      rqBookedWindow: rq ? (rq.bookedWindow || '') : '',
      onRqBookedWindow: (e) => this._rqSet({ bookedWindow: e.target.value }),
      rqWindows: rqWindows,
      rqAdvice: rqAdvice.text,
      rqAdviceStyle: 'border-left:4px solid;border-radius:8px;padding:8px 12px;font-size:12.5px;margin:8px 0 0;' +
        (rqAdvice.tone === 'warn' ? 'border-color:#B45309;background:#FBF0E1;color:#B45309;' : (rqAdvice.tone === 'info' ? 'border-color:#0E5E8A;background:#E8F1F7;color:#0E5E8A;' : 'border-color:#047857;background:#E7F4EF;color:#047857;')),
      rqHasRelated: rqRelated.length > 0,
      rqRelated: rqRelated,
      rqRelatedIntro: rq ? (this.RELATED_INTRO[rq.cat] || '') : '',
      rqHotelCaveat: this.HOTEL_CAVEAT,
      rqMeals: !!(rq && rq.meals),
      rqMealsAria: rq && rq.meals ? 'true' : 'false',
      rqMealTrackStyle: 'position:relative;width:46px;height:26px;border-radius:999px;border:none;cursor:pointer;flex-shrink:0;padding:0;' + (rq && rq.meals ? 'background:#0E5E8A;' : 'background:#CBD6E2;'),
      rqMealKnobStyle: 'position:absolute;top:3px;width:20px;height:20px;border-radius:50%;background:#FFFFFF;box-shadow:0 1px 3px rgba(10,37,64,.25);' + (rq && rq.meals ? 'left:23px;' : 'left:3px;'),
      rqToggleMeals: () => this._rqSet({ meals: !this.state.rq.meals }),
      rqNightChips: rqNightChips,
      rqMealPerDay: rq ? this._gbp(this._mealPerDay(rq.nights)) : '',
      rqMealTotal: rq ? this._gbp(this._mealPerDay(rq.nights) * Math.max(1, rq.nights)) : '',
      rqNightsLabel: rq ? (rq.nights + (rq.nights === 1 ? ' night' : ' nights')) : '',
      closeRq: () => this.setState({ rq: null }),
      closeRqOverlay: (e) => { if (e.target === e.currentTarget) this.setState({ rq: null }); },
      sendRq: () => this._sendRq(),

      /* modal */
      modalOpen: !!st.modal,
      modalSupplier: st.modal ? st.modal.name : '',
      modalPrice: st.modal ? st.modal.price : '',
      closeModal: () => this.setState({ modal: null }),
      closeModalOverlay: (e) => { if (e.target === e.currentTarget) this.setState({ modal: null }); },
      confirmBooking: () => this._confirmBooking(),

      /* toast */
      toastMsg: st.toast.msg, toastTag: st.toast.tag, toastHasTag: !!st.toast.tag,
      toastTransform: st.toastOn ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(80px)',
      toastOpacity: st.toastOn ? '1' : '0',

      /* tour */
      tourOpen: tourOpen,
      tourStepLabel: tourOpen ? (st.tourStep + 1) + ' / 5' : '',
      tourTitle: stop ? stop.title : '',
      tourBody: stop ? stop.body : '',
      tourHasBack: tourOpen && st.tourStep > 0,
      tourNextLabel: tourOpen && st.tourStep === 4 ? 'Finish' : 'Next',
      startTour: () => { this.setState({ tourStep: 0 }); this.nav('dashboard'); },
      dismissTourPrompt: () => { this.setState({ tourDismissed: true }); this._set('tour-dismissed', true); },
      skipTour: this._skipTour,
      tourBack: () => {
        const i = Math.max(0, this.state.tourStep - 1);
        this.setState({ tourStep: i }); this.nav(this.TOUR[i].route);
      },
      tourNext: () => {
        const i = this.state.tourStep;
        if (i >= 4) { this._skipTour(); this.toastMsg('Tour complete. The five core flows are yours — everything persists between visits.'); return; }
        this.setState({ tourStep: i + 1 }); this.nav(this.TOUR[i + 1].route);
      }
    };
  }
}
