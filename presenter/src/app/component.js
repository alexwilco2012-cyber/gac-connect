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
      /* sub-section the hash asked for ('#/launches' → crew-change 'launches');
         the owning feature module reads it, and keeps it and the hash in step
         when the user picks another (it rewrites the hash in place) */
      routeSection: parsed.section || null,
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
      /* Landing consolidation reveal (2 Sep): the motif builds pillar by pillar
         when the section reaches the viewport, and the tier ladder beside it
         lights from the same count, so the drawing and the rungs cannot drift.
         0..4 pillars up, then the roof. */
      consolLit: 0, consolRoof: false,
      /* which side of the Dashboard is showing - the client's or the
         supplier's (26 Aug). Persisted so a rehearsal picks up where it was
         left, exactly as the site does. */
      dashView: this._get('dash-view', 'client') === 'supplier' ? 'supplier' : 'client',
      /* Advantage opening: presOn shows the overlay, advSlide 0..3 is the active
         slide, advOp/advPe drive the fade-out into the platform. */
      presOn: presWanted, advSlide: 0, advOp: '1', advPe: 'auto',
      /* v2 (5 Sep): advStep is the second beat on the figures and the ask;
         kick gives the browser one frame at the vessel's start position so
         her 40s steam-in transition actually runs on the cold open. */
      advStep: 0, kick: false
    };
    /* Feature modules (app/features/*.js — the launches panel, Procurement,
       Crew change, added after the 17 Aug review) contribute their own initial state. */
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

  /* Two initials, for a supplier or a category tile. The tiles used to carry
     icons, which meant one lorry glyph standing for Haulage, Taxis and Waste
     at once — a monogram says "category" and lets the word do the naming. */
  _monogram(name) {
    const words = String(name).replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(Boolean);
    if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
    return String(name).slice(0, 2).toUpperCase();
  }

  /* ---------- interactive harbour (landing hero) ---------- */
  _hbPick(id) { return () => this.setState({ hbSel: this.state.hbSel === id ? null : id }); }
  _hbF(field) { const id = this.state.hbSel; return id ? this.HARBOUR[id][field] : ''; }
  _hbB(i) { const id = this.state.hbSel; return id ? this.HARBOUR[id].bullets[i] : ''; }
  /* The label chips arrive last, once everything they name has. */
  get HB_CHIP_DELAY() {
    return { assets: '2.2s', agency: '2.6s', marketplace: '2.4s', procurement: '2.5s', customs: '2.7s', logistics: '3.3s' };
  }
  _hbChip(id) {
    /* the booth and the warehouse stand just under the vessel's berth, so their labels sit below them, on the road */
    const pos = (id === 'customs' || id === 'procurement') ? 'bottom:-14px;' : 'top:-16px;';
    return 'pointer-events:none;position:absolute;' + pos + 'left:50%;transform:translateX(-50%);z-index:3;border-radius:999px;padding:4px 12px;font-size:12.5px;font-weight:700;white-space:nowrap;box-shadow:0 2px 10px rgba(4,16,31,.4);transition:background-color .2s;'
      + 'opacity:0;animation:fadeIn .5s ' + (this.HB_CHIP_DELAY[id] || '2.2s') + ' ease forwards;'
      + (this.state.hbSel === id ? 'background:#FFC72C;color:#0A2540;' : 'background:#FFFFFF;color:#0A2540;');
  }

  /* ---------- landing consolidation reveal ----------
     Started by an IntersectionObserver on [data-consol], re-attached whenever
     the landing screen is (re)rendered. Once only: a motif that rebuilds every
     time you scroll past it stops being a reveal and becomes a fidget. */
  _watchConsolidation() {
    if (this._consolDone || typeof IntersectionObserver === 'undefined') return;
    const el = document.querySelector('[data-consol]');
    if (!el || this._consolEl === el) return;
    this._consolEl = el;
    const still = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) {
      /* No build-up to watch, so show the finished claim rather than an
         empty frame: `animation:none` would leave every part at opacity 0. */
      this._consolDone = true;
      this.setState({ consolLit: 4, consolRoof: true });
      return;
    }
    if (this._consolIo) this._consolIo.disconnect();
    this._consolIo = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      this._consolIo.disconnect();
      this._consolDone = true;
      /* 0.2s, then one every 0.55s; the roof follows the fourth pillar. */
      this._consolTimers = [1, 2, 3, 4].map((n, i) =>
        setTimeout(() => this.setState({ consolLit: n }), 200 + i * 550));
      this._consolTimers.push(setTimeout(() => this.setState({ consolRoof: true }), 200 + 4 * 550));
    }, { threshold: 0.45 });
    this._consolIo.observe(el);
  }
  _hbGlow(id) {
    return 'display:block;width:100%;height:auto;transition:filter .25s;' +
      (this.state.hbSel === id ? 'filter:drop-shadow(0 0 3px rgba(255,199,44,.95)) drop-shadow(0 8px 22px rgba(255,199,44,.45));' : 'filter:drop-shadow(0 8px 14px rgba(4,16,31,.4));');
  }

  /* ---------- routing ---------- */
  _parseHash() {
    const h = (typeof location !== 'undefined' ? location.hash : '').replace(/^#\/?/, '');
    if (!h) return { route: '', profileId: null, section: null };
    let parts = h.split('/');
    if (parts[0] === 'supplier' && parts[1]) return { route: 'supplier', profileId: parts[1], section: null };
    /* '#/crew-change/<section>' mirrors the site's ?section= deep link; there is
       no Launches tab any more (17 Aug review follow-up), so the old '#/launches'
       opens Crew change on its Launches section, as the site's /app/launches
       redirect does. Retired section names ('#/crew-change/transfers', minted
       before taxis and launches were split) are passed through as written and
       resolved by the crew-change module, which reads state.routeSection. */
    if (parts[0] === 'launches') return { route: 'crew-change', profileId: null, section: 'launches' };
    /* Crew change, certification and bunkers moved inside the Agency service
       line on 20 Aug, so '#/agency/crew-change/taxis' is written the way the
       site's /app/agency/crew-change?section=taxis is. The leading segment is
       simply dropped — every address minted before the restructure
       ('#/crew-change/taxis', '#/certification') still lands, exactly as the
       site's redirects do. */
    if (parts[0] === 'agency' && parts[1]) parts = parts.slice(1);
    if (parts[0] === 'crew-change' && parts[1]) return { route: 'crew-change', profileId: null, section: parts[1] };
    /* A hub section: '#/logistics/warehousing', '#/customs/documents'. */
    if ((parts[0] === 'logistics' || parts[0] === 'customs') && parts[1]) {
      return { route: parts[0], profileId: null, section: parts[1] };
    }
    const valid = ['home', 'clients', 'suppliers', 'about', 'dashboard', 'internal', 'marketplace', 'agency', 'logistics', 'customs', 'procurement', 'crew-change', 'quotes', 'invoices', 'tiers', 'svs', 'analytics', 'certification', 'bunkers', 'kitchen-sink'];
    return { route: valid.includes(parts[0]) ? parts[0] : 'home', profileId: null, section: null };
  }
  /* Which nav tab reads as current. A tab stays lit on the screens that live
     inside it: Marketplace on a supplier profile, Agency on crew change and on
     the two beta previews that moved under it (20 Aug service lines). */
  _navHeld(tab, route) {
    if (tab === route) return true;
    if (tab === 'marketplace') return route === 'supplier';
    if (tab === 'agency') return route === 'crew-change' || route === 'certification' || route === 'bunkers';
    return false;
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
      this.setState({ route: p.route || (this.props.startScreen ?? 'home'), profileId: p.profileId, routeSection: p.section || null });
      /* The platform shell scrolls its main column, not the window. */
      const sc = document.getElementById('gac-scroll');
      if (sc) sc.scrollTo({ top: 0 });
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
    this._kickT = setTimeout(() => this.setState({ kick: true }), 90);
    if (this.state.presOn) document.body.style.overflow = 'hidden';
    if (this.state.loader === 'visible') this._loaderTimer = setTimeout(() => this._hideLoader(), 4800);
    this._watchConsolidation();
    this._selfTest();
  }
  componentDidUpdate() {
    /* The landing screen may have just been rendered (or re-rendered after a
       hotspot swap), so the observer has a fresh element to watch. */
    this._watchConsolidation();
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
    if (this._consolIo) this._consolIo.disconnect();
    (this._consolTimers || []).forEach(clearTimeout);
    clearTimeout(this._presT); clearTimeout(this._navT); clearTimeout(this._kickT);
    document.body.style.overflow = '';
  }

  /* ---------- Advantage opening (partials/20-opening.html) ----------
     Ported 1:1 from the standalone "GAC Connect Advantage" build: slide state
     lives in st.advSlide and the CSS does the rest via the .active class. The
     one deliberate difference is the closer's CTA, which fades the overlay into
     the embedded platform home instead of linking to the live site. */
  get ADV_SLIDES() { return 15; }
  _advGo(i) {
    if (!this.state.presOn || this._advLeaving) return;
    if (i < 0 || i >= this.ADV_SLIDES || i === this.state.advSlide) return;
    this.setState({ advSlide: i, advStep: 0 });
  }
  _advNext() {
    if (!this.state.presOn || this._advLeaving) return;
    if (this.state.advSlide === this.ADV_SLIDES - 1) { this._advPulse(); return; }
    /* the figures (11) and the ask (13) build in two beats */
    if (this.BUILD_SLIDES.includes(this.state.advSlide) && this.state.advStep === 0) { this.setState({ advStep: 1 }); return; }
    this._advGo(this.state.advSlide + 1);
  }
  /* zero-indexed: the slides whose second column arrives on a second click */
  get BUILD_SLIDES() { return [10, 12]; }
  _advPrev() { if (this.state.advStep === 1) { this.setState({ advStep: 0 }); return; } this._advGo(this.state.advSlide - 1); }
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
    const parts = [(isHotel ? 'Booking request' : 'Quote request') + ' sent to ' + rq.name + ' — ' + service + ', MV Elan.', 'Reply-by window: ' + win.label + '.'];
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

  /* ---- compliance watch (mirrors src/lib/svs.ts complianceWatch) --------
     Derived from the supplier certificates, never hand-counted: the SVS
     banner, the dashboard feed and the top-bar bell all read this one list,
     so a cert change in the data moves every surface at once. Blocked first,
     then soonest expiry. */
  _complianceWatch() {
    const out = [];
    this.SUPPLIERS.forEach((sup) => {
      const certs = sup.certs || [];
      const lapsed = certs.filter((c) => c.state === 'lapsed');
      const due = certs.filter((c) => c.state === 'due').slice()
        .sort((a, b) => (a.days || 0) - (b.days || 0));
      if (!lapsed.length && !due.length) return;
      const blocked = lapsed.length > 0;
      const cert = blocked ? lapsed[0] : due[0];
      out.push({
        name: sup.name, blocked: blocked,
        certName: cert.label, days: cert.days
      });
    });
    return out.sort((a, b) => {
      if (a.blocked !== b.blocked) return a.blocked ? -1 : 1;
      return (a.days || 0) - (b.days || 0);
    });
  }

  /* "GWO" stays upper-case; "Insurance" reads as "insurance" mid-sentence. */
  _certName(n) {
    return /^[A-Z0-9]{2,}$/.test(n) ? n : n.charAt(0).toLowerCase() + n.slice(1);
  }

  _watchLine(w) {
    const c = this._certName(w.certName);
    if (w.blocked) return w.name + ' — ' + c + ' lapsed';
    return w.name + ' — ' + c + (/s$/.test(w.certName) ? ' expire' : ' expires') + ' in ' + w.days + ' days';
  }

  /* Sparkline points for a 100x28 viewBox — the same hand-rolled shape the
     site draws, as a polyline "x,y x,y" string the template binds directly. */
  _spark(points) {
    const W = 100, H = 28, PAD = 2;
    const min = Math.min.apply(null, points), max = Math.max.apply(null, points);
    const span = (max - min) || 1;
    const step = (W - PAD * 2) / ((points.length - 1) || 1);
    return points.map((p, i) => {
      const x = PAD + i * step;
      const y = PAD + (1 - (p - min) / span) * (H - PAD * 2);
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
  }
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

    const platformRoutes = ['marketplace', 'dashboard', 'internal', 'agency', 'logistics', 'customs', 'supplier', 'procurement', 'crew-change', 'quotes', 'invoices', 'tiers', 'svs', 'analytics', 'certification', 'bunkers', 'kitchen-sink'];
    const isPlatform = platformRoutes.includes(route);

    /* nav — the same ten platform items as the site's AppLayout, in the same
       order (launches are a section of Crew change, not a tab; Analytics is
       supplier-facing and is reached from For Suppliers, not the client's nav),
       so the padding is tight and the tier screen is "Tiers" */
    const mk = (label, r, beta) => ({
      label: label, beta: !!beta, pressed: this._navHeld(r, route) ? 'true' : 'false',
      go: this._go(r),
      style: 'background:none;border:none;padding:8px 8px;border-radius:6px;font-weight:600;font-size:13px;white-space:nowrap;cursor:pointer;font-family:inherit;' +
        (this._navHeld(r, route) ? 'color:#FFFFFF;background:rgba(255,255,255,.14);box-shadow:inset 0 -3px 0 #C9A227;' : 'color:#B9C8D6;')
    });
    const navItems = isPlatform
      ? [mk('Marketplace', 'marketplace'), mk('Dashboard', 'dashboard'), mk('Agency', 'agency'), mk('Logistics', 'logistics'), mk('Customs', 'customs'), mk('Procurement', 'procurement'), mk('Quotes', 'quotes'), mk('Invoices', 'invoices'), mk('SVS', 'svs'), mk('Tiers', 'tiers'), mk('Internal', 'internal')]
      : [mk('Home', 'home'), mk('For Clients', 'clients'), mk('For Suppliers', 'suppliers'), mk('About', 'about')];

    /* marketplace */
    /* Hero counters (26 Aug) — read off the roster, never written down, so a
       supplier added to data.js moves the number without anyone editing it.
       Categories counts what is actually stocked, not what CATEGORIES declares:
       a category with nothing in it is not a category a client can shop. */
    const mktStocked = this.CATEGORIES.filter((c) => c !== 'All'
      && this.SUPPLIERS.some((sp) => sp.cat === c)).length;
    const mktBookable = this.SUPPLIERS.filter((sp) => this.deriveStatus(sp) !== 'blocked').length;
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
      /* A line with a hub of its own opens it rather than firing a request the
         client cannot see afterwards; GAC Assets is the one line with no hub,
         so it keeps the engage-service action (mirrors the site's Marketplace). */
      actionLabel: (this.INHOUSE_ROUTES[s.id] || {}).label || 'Engage service',
      onAction: this.INHOUSE_ROUTES[s.id]
        ? this._go(this.INHOUSE_ROUTES[s.id].route)
        : () => this.toastMsg('Request sent to your GAC agent — surfaced inside the existing relationship, not a new queue.')
    }));

    let third = this.SUPPLIERS.filter(match).slice().sort(sorter);
    third = third.slice().sort((a, b) => (b.promoted ? 1 : 0) - (a.promoted ? 1 : 0)); // promoted first, within third-party only
    const thirdList = third.map((s) => {
      const status = this.deriveStatus(s);
      const blocked = status === 'blocked';
      return {
        name: s.name, desc: s.desc, cat: s.cat,
        ratingLabel: s.rating.toFixed(1) + ' ★',
        ratingCountLabel: '· ' + s.ratingCount + ' ratings',
        goldBand: s.goldBand === 'held' && !blocked,
        promoted: !!s.promoted, blocked: blocked, due: status === 'due', verified: !blocked,
        mono: this._monogram(s.name),
        monoStyle: 'display:grid;place-items:center;width:44px;height:44px;flex-shrink:0;border-radius:14px;font-family:\'Space Grotesk\',sans-serif;font-size:15px;font-weight:700;'
          + (s.promoted ? 'background:#EFE9FB;color:#5B3FA8;' : 'background:#E8F1F7;color:#0E5E8A;'),
        cardStyle: 'display:flex;flex-wrap:wrap;align-items:center;gap:14px;padding:16px 20px;margin-bottom:10px;border-radius:14px;box-shadow:0 1px 3px rgba(10,37,64,.07);' +
          (s.promoted ? 'border:1.5px solid #C9BCF0;background:linear-gradient(180deg,#FBFAFF,#FFFFFF 60%);' : 'border:1.5px solid #E5EAF1;background:#FFFFFF;') + (blocked ? 'opacity:.75;' : ''),
        actionLabel: blocked ? 'Unavailable' : 'Request quote',
        actionStyle: blocked
          ? 'background:#FFFFFF;color:#9AA8B8;border:1.5px solid #E5EAF1;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13.5px;cursor:not-allowed;white-space:nowrap;'
          : 'background:#FFFFFF;color:#0E5E8A;border:1.5px solid #CBD6E2;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13.5px;cursor:pointer;white-space:nowrap;',
        onAction: () => this._requestQuote(s),
        onOpen: () => this.nav('supplier/' + s.id)
      };
    });

    /* Tiles count what is actually stocked, like the counters above: a
       category with nothing in it is not one a client can shop. */
    const tiles = this.CATEGORIES.filter((c) => c !== 'All')
      .map((c) => ({ label: c, n: this.SUPPLIERS.filter((sp) => sp.tags.includes(c)).length }))
      .filter((t) => t.n > 0)
      .map((t) => ({
        label: t.label, mono: this._monogram(t.label),
        aria: 'Browse ' + t.label,
        countLabel: t.n + (t.n === 1 ? ' supplier' : ' suppliers'),
        on: () => this.setState({ chip: t.label })
      }));
    /* Past browsing once a category or a search is on: the chip beside Sort
       carries the state from there. */
    const browsing = st.chip === 'All' && q === '';

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

    /* Pillar, then its label a third of a second later. State starts each
       one, so there is no chain of CSS delays to keep in step with the
       ladder beside it. */
    const CONSOL_RISE = 'pillarRise .8s cubic-bezier(.34,1.56,.64,1) both';
    const CONSOL_LABEL = 'labelIn .5s .35s ease both';
    const consolStep = (n, anim) => ((st.consolLit || 0) >= n ? anim : 'none');
    const ladderPill = (lit, gold) =>
      'display:inline-flex;align-items:center;gap:10px;border-radius:14px;padding:10px 16px;'
      + 'box-shadow:0 1px 3px rgba(10,37,64,.07);transition:border-color .4s,background .4s,opacity .4s;'
      + (gold ? 'border:1.5px solid #C9A227;background:#FBF6E3;opacity:1;'
        : lit ? 'border:1.5px solid #0E5E8A;background:#F4F8FB;opacity:1;'
          : 'border:1.5px solid #E5EAF1;background:#FFFFFF;opacity:.45;');

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
      const other = !!st.accepted && !isAccepted;
      const sup = this.SUPPLIERS.find((s) => s.name === qc.name);
      const BTN = 'border:none;border-radius:8px;padding:11px 18px;font-weight:700;font-size:14px;font-family:inherit;transition:background .15s;margin-top:16px;';
      return {
        name: qc.name, price: qc.price, avail: qc.avail, capacity: qc.capacity, rating: qc.rating, esg: qc.esg, src: qc.src,
        dotColor: qc.outlook ? '#C9A227' : '#0E5E8A',
        best: !!qc.best && !st.accepted,
        /* the Gold Band is earned at the audit and lost on lapse: read it off the supplier record, never hard-coded */
        gold: !!(sup && sup.goldBand === 'held' && this.deriveStatus(sup) !== 'blocked'),
        parsed: !!qc.outlook,
        accepted: isAccepted,
        disabled: !!st.accepted,
        cardStyle: 'display:flex;flex-direction:column;background:#FFFFFF;border-radius:14px;padding:22px;box-shadow:0 1px 3px rgba(10,37,64,.07);border:'
          + (isAccepted ? '2px solid #047857' : (qc.best && !st.accepted) ? '2px solid #0E5E8A' : '1px solid #E5EAF1') + ';'
          + (other ? 'opacity:.55;' : ''),
        actionLabel: isAccepted ? 'Booked \u2713 \u00b7 PO 48211' : other ? 'Not selected' : 'Accept quote',
        actionStyle: BTN + (isAccepted ? 'background:#047857;color:#FFFFFF;cursor:default;'
          : other ? 'background:#F1F4F8;color:#8FA3B8;cursor:default;'
          : qc.best ? 'background:#0E5E8A;color:#FFFFFF;cursor:pointer;' : 'background:#FFFFFF;color:#0E5E8A;border:1.5px solid #CBD6E2;cursor:pointer;'),
        onAccept: () => { if (this.state.accepted) return; this._openModal(qc.name, qc.price); }
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
    const LAST = this.ADV_SLIDES - 1;
    const advCls = (i) => 'slide slide-' + (i + 1) + (i === LAST ? ' closer' : '') + (adv === i ? ' active' : '');
    const advHid = (i) => (adv === i ? 'false' : 'true');
    const ADV_DOT_LABELS = [
      'Slide 1 — 0800 tomorrow', 'Slide 2 — GAC Connect', 'Slide 3 — today', 'Slide 4 — four pillars and a roof',
      'Slide 5 — chess', 'Slide 6 — we already own the data',
      'Slide 7 — F1', 'Slide 8 — scrutineering was hours ago',
      'Slide 9 — Hyrox', 'Slide 10 — the agent’s job changes shape',
      'Slide 11 — the figures', 'Slide 12 — the cash', 'Slide 13 — the ask',
      'Slide 14 — the point', 'Slide 15 — enter the platform'
    ];
    /* Root classes: s-open / s-title hide the chrome on the first two slides,
       hb shows the harbour layer (slides 1, 2 and 15: the vessel the deck
       follows), and the footer rail lights chapter by chapter: I is slides
       5-6, II 7-8, III 9-10; from the figures on, all three read as done. */
    const advChapter = adv >= 10 ? 4 : (adv >= 8 ? 3 : (adv >= 6 ? 2 : (adv >= 4 ? 1 : 0)));
    const advRootCls = 'adv' + (adv === 0 ? ' s-open' : '') + (adv === 1 ? ' s-title' : '') +
      ((adv === 0 || adv === 1 || adv === LAST) ? ' hb' : '') + (adv === LAST ? ' s-reveal' : '') + (advChapter ? ' ch' + advChapter : '') +
      (st.advStep === 1 ? ' step1' : '') + (st.kick ? ' kick' : '');
    const advRailCls = (i) => 'rl' + (advChapter > i ? ' done' : '') + (advChapter === i ? ' on' : '');
    /* One advCls<n>/advHid<n> binding per slide, built from the count so adding
       a slide is a partial plus a dot label and nothing else. */
    const advSlots = {};
    for (let i = 0; i < this.ADV_SLIDES; i++) { advSlots['advCls' + (i + 1)] = advCls(i); advSlots['advHid' + (i + 1)] = advHid(i); }
    if (!this._advGoCache) this._advGoCache = ADV_DOT_LABELS.map((_, i) => (e) => this._advDot(i, e));

    const vals = {
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
      advRootCls: advRootCls,
      /* the gold cue that a click remains on a two-beat slide; empty otherwise, and CSS hides the empty box */
      advBuildHint: (adv === 10 && st.advStep === 0) ? '\u2192 the six revenue lines' : (adv === 12 && st.advStep === 0) ? '\u2192 where the \u00a3370,000 goes' : '',
      advRailCls1: advRailCls(1), advRailCls2: advRailCls(2), advRailCls3: advRailCls(3),
      ...advSlots,
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
      isDashboard: route === 'dashboard', isInternal: route === 'internal',
      isMarketplace: route === 'marketplace', isProfile: route === 'supplier',
      isQuotes: route === 'quotes', isInvoices: route === 'invoices', isTiers: route === 'tiers', isSvs: route === 'svs', isAnalytics: route === 'analytics',
      isCert: route === 'certification', isBunkers: route === 'bunkers', isKitchen: route === 'kitchen-sink',
      isProcurement: route === 'procurement', isCrew: route === 'crew-change',
      isAgency: route === 'agency', isLogistics: route === 'logistics', isCustoms: route === 'customs',
      navItems: navItems,
      mktCatCount: String(mktStocked),
      mktBookableCount: String(mktBookable),
      mktInhouseCount: String(this.INHOUSE.length),
      goHome: this._go('home'), goClients: this._go('clients'), goSuppliers: this._go('suppliers'), goAbout: this._go('about'),
      goDashboard: this._go('dashboard'), goInternal: this._go('internal'), goMarketplace: this._go('marketplace'), goQuotes: this._go('quotes'), goInvoices: this._go('invoices'),
      goTiers: this._go('tiers'), goSvs: this._go('svs'), goAnalytics: this._go('analytics'), goKitchen: this._go('kitchen-sink'),
      goProcurement: this._go('procurement'), goCrew: this._go('crew-change'),
      goAgency: this._go('agency'), goLogistics: this._go('logistics'), goCustoms: this._go('customs'),
      /* dashboard crew-change card line — a default the crew-change module overrides with a live count */
      dashCrewLine: 'No letters in progress. Hotels, immigration, LOI and repatriation-letter templates live in one place.',

      /* feature modules (app/features/*.js) — their bindings ride alongside and win over the defaults above */
      ...this._featureVals(st),

      /* interactive harbour (landing hero) */
      /* The hero's search hands off to the marketplace exactly as the top bar
         does — the first thing anyone types on the landing screen lands them
         inside the platform rather than doing nothing. */
      onLandingSearch: (e) => { if (e && e.preventDefault) e.preventDefault(); this.nav('marketplace'); },

      /* Consolidation reveal. Each part's animation is 'none' until its step
         lands, and the ladder reads the same count, so the two cannot
         disagree about how many pillars are standing. */
      consolLabel: (st.consolLit || 0) + ' of 4 pillars active under one roof'
        + (st.consolRoof ? ', Full Stack' : ''),
      consolP1: consolStep(1, CONSOL_RISE), consolP2: consolStep(2, CONSOL_RISE),
      consolP3: consolStep(3, CONSOL_RISE), consolP4: consolStep(4, CONSOL_RISE),
      consolL1: consolStep(1, CONSOL_LABEL), consolL2: consolStep(2, CONSOL_LABEL),
      consolL3: consolStep(3, CONSOL_LABEL), consolL4: consolStep(4, CONSOL_LABEL),
      consolRoof: st.consolRoof
        ? 'roofDrop .7s cubic-bezier(.34,1.3,.64,1) both, roofGold .6s .55s ease both'
        : 'none',
      consolWord: st.consolRoof ? 'fadeIn .5s .8s ease forwards' : 'none',
      consolGlint: st.consolRoof ? 'glint .7s .6s ease-out both' : 'none',
      ladderA: ladderPill(st.consolLit >= 1, false),
      ladderB: ladderPill(st.consolLit >= 2, false),
      ladderC: ladderPill(st.consolLit >= 3, st.consolRoof),
      ladderAColor: '#0E5E8A',
      ladderBColor: '#0E5E8A',
      ladderCColor: st.consolRoof ? '#9A7B14' : '#0E5E8A',

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
      /* ---- Dashboard: the client's and the supplier's view (26 Aug) ----
         The platform opens on the marketplace now, so this screen answers what
         the two paying sides actually arrive with: a client asks where its work
         is and what is waiting on it, a supplier asks whether it is being found
         and whether its paperwork still holds. One screen, two views, mirroring
         the site's src/screens/app/Dashboard.tsx.

         The commercial guardrail rides along with the split: commission is a
         supplier mechanism, so the plan card exists only on the supplier side
         and the client side never mentions it. */
      ...(function (self) {
        const client = st.dashView !== 'supplier';
        const sup = self.SUPPLIERS.find(function (x) { return x.id === 'silver-city-welding'; });
        const band = sup && sup.premium ? 10 : 20;
        const job = 4400;
        const seg = function (on) {
          return 'display:inline-flex;align-items:center;border:none;border-radius:6px;'
            + 'padding:9px 14px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;'
            + (on ? 'background:#0A2540;color:#FFFFFF;' : 'background:transparent;color:#33475F;');
        };
        const pill = function (bg, fg) {
          return 'display:inline-flex;align-items:center;border-radius:999px;padding:3px 10px;'
            + 'font-size:11.5px;font-weight:700;background:' + bg + ';color:' + fg + ';';
        };
        const tierOn = self.state.calc;
        const kpiChip = function (tone) {
          const bg = tone === 'warn' ? '#FBF0E1' : '#E8F1F7';
          const fg = tone === 'warn' ? '#B45309' : '#0E5E8A';
          return 'display:inline-block;border-radius:999px;padding:2px 8px;font-size:11.5px;'
            + 'font-weight:700;white-space:nowrap;background:' + bg + ';color:' + fg + ';';
        };
        const line = function (name, route, on, count, detail, nudge) {
          return {
            name: name,
            detail: on ? detail : nudge,
            count: on ? count : '0',
            nameColor: on ? '#0A2540' : '#8FA3B8',
            countStyle: 'display:inline-grid;place-items:center;min-width:28px;height:28px;'
              + 'border-radius:999px;padding:0 8px;font-size:12.5px;font-weight:700;'
              + (on ? 'background:#0A2540;color:#FFFFFF;' : 'background:#FAFBFD;color:#33475F;'),
            go: self._go(route)
          };
        };
        const quoteSent = function (what, who) {
          return function () {
            self.toastMsg('Quote sent for ' + what + ' \u2014 ' + who
              + '. It lands in the client\u2019s comparison view beside every other reply.', 'SENT');
          };
        };
        return {
          dashIsClient: client,
          dashIsSupplier: !client,
          dashTitle: client ? 'Browne Energy' : 'Silver City Welding',
          dashEyebrow: client ? 'Client dashboard' : 'Supplier dashboard',
          dashLede: client
            ? 'Everything GAC has running for you, and everything waiting on you. The platform itself costs you nothing.'
            : 'How you are being found, what is waiting for a quote, and whether your paperwork still holds.',
          dashClientStyle: seg(client),
          dashSupplierStyle: seg(!client),
          dashClientPressed: client ? 'true' : 'false',
          dashSupplierPressed: !client ? 'true' : 'false',
          setDashClient: function () { self.setState({ dashView: 'client' }); self._set('dash-view', 'client'); },
          setDashSupplier: function () { self.setState({ dashView: 'supplier' }); self._set('dash-view', 'supplier'); },

          /* client - what GAC has running, line by line. A line the client
             has not consolidated goes grey with a count of 0 and a nudge
             naming the tier it would reach: the point of the row is that the
             line exists and is empty, so hiding it would make the dashboard
             smaller as the client buys less, which is backwards. */
          dashLines: [
            line('Agency', 'agency', tierOn.agency, '3', 'Port calls, berths and crew change', 'Not consolidated. Add Agency to reach the 2% tier'),
            line('Logistics', 'logistics', tierOn.logistics, '2', 'Consignments on their way to the quay', 'Not consolidated. Add Logistics to reach the 4% tier'),
            line('Customs', 'customs', tierOn.customs, '1', 'Declarations working through to clearance', 'Not consolidated. Customs is the 7% pillar'),
            line('Procurement', 'procurement', true, '1', 'One list ready to send to Compass', '')
          ],
          /* 22px beside the consolidation card's 44px: one number leads. */
          clientKpis: [
            { label: 'Port calls in the window', value: '3', delta: 'Aberdeen and Peterhead', chipStyle: kpiChip('info') },
            { label: 'Quotes to compare', value: '3', delta: 'Crane hire \u2014 MV Elan', chipStyle: kpiChip('info') },
            { label: 'Invoices in your window', value: '2', delta: 'Tightest closes in 2 days', chipStyle: kpiChip('warn') }
          ],

          /* supplier - reach, the inbox, the listing, the vault, the plan */
          supReach: [
            { label: 'Profile views (30 days)', value: '412', barStyle: 'display:block;height:100%;border-radius:3px;background:#0E5E8A;width:72%;' },
            { label: 'Quote requests received', value: '38', barStyle: 'display:block;height:100%;border-radius:3px;background:#0E5E8A;width:58%;' },
            { label: 'Win rate', value: '34%', barStyle: 'display:block;height:100%;border-radius:3px;background:#0E5E8A;width:34%;' },
            { label: 'Avg. response time', value: '2.1 hrs', barStyle: 'display:block;height:100%;border-radius:3px;background:#0E5E8A;width:86%;' }
          ],
          supInbox: [
            {
              service: 'Onboard pipework repair',
              detail: 'MV Granite Coast \u00b7 coded welder, two days alongside Regent Quay',
              replyBy: 'Reply by 16:00 today',
              pillStyle: pill('#FBF0E1', '#B45309'),
              onQuote: quoteSent('onboard pipework repair', 'MV Granite Coast')
            },
            {
              service: 'Fabrication \u2014 skid frames',
              detail: 'Wilkinson Drilling mobilisation \u00b7 three frames to drawing, delivered to the GAC warehouse',
              replyBy: 'Reply by Friday 12:00',
              pillStyle: pill('#E8F1F7', '#0E5E8A'),
              onQuote: quoteSent('fabrication', 'Wilkinson Drilling mobilisation')
            }
          ],
          supInboxCount: '2 open',
          supName: sup ? sup.name : '',
          supDesc: sup ? sup.desc : '',
          supCat: sup ? sup.cat : '',
          supRatingLine: sup ? sup.rating.toFixed(1) + ' \u2605 \u00b7 ' + sup.ratingCount + ' ratings' : '',
          supPromoted: !!(sup && sup.promoted),
          supGoldNote: sup && sup.goldBandDate
            ? sup.goldBandDate + '. The Gold Band is earned at the audit and never bought \u2014 it appears here the day it is passed, and goes the day compliance lapses.'
            : '',
          supCerts: sup ? sup.certs.map(function (c) {
            const bg = c.state === 'lapsed' ? '#FBEAEA' : c.state === 'due' ? '#FBF0E1' : '#E7F4EF';
            const fg = c.state === 'lapsed' ? '#B91C1C' : c.state === 'due' ? '#B45309' : '#047857';
            const tail = c.state === 'due' ? ' \u00b7 ' + c.days + ' days' : c.state === 'lapsed' ? ' \u00b7 lapsed' : '';
            return {
              label: c.label + tail,
              style: 'display:inline-block;margin:2px;border-radius:6px;padding:2px 8px;font-size:11.5px;font-weight:700;background:' + bg + ';color:' + fg + ';'
            };
          }) : [],
          supPlanLine: 'Premium \u00b7 \u00a31,800 per year',
          supBandLabel: band + '% commission',
          supKeeps: self._gbp(job - Math.round(job * band / 100)),
          supKeepsLine: 'yours, after the ' + band + '% Premium band',
          supJobLine: 'A ' + self._gbp(job) + ' job won through the platform',
          goSupProfile: function () { self.setState({ profileId: 'silver-city-welding' }); self.nav('supplier'); }
        };
      })(this),

      /* ---- restyled dashboard (26 Aug, mirrors the site) --------------
         Sidebar item styling per route, KPI tiles with sparklines, the
         Needs-you feed and the 48-hour strip. Everything variable-width in
         the strip lives in the label column so every track lines up. */
      ...(function (self) {
        const SIDE = [
          ['marketplace', 'Marketplace'], ['dashboard', 'Dashboard'], ['agency', 'Agency'],
          ['logistics', 'Logistics'], ['customs', 'Customs'], ['procurement', 'Procurement'],
          ['quotes', 'Quotes'], ['invoices', 'Invoices'], ['svs', 'SVS'], ['tiers', 'Tiers'],
          ['internal', 'Internal']
        ];
        const base = 'display:flex;align-items:center;gap:12px;width:100%;padding:10px 12px;border-radius:8px;'
          + 'font-weight:600;font-size:13.5px;background:none;border:none;cursor:pointer;font-family:inherit;text-align:left;';
        const out = {};
        SIDE.forEach(function (row) {
          const key = row[0].replace(/-(\w)/g, function (m, c) { return c.toUpperCase(); });
          const cap = key.charAt(0).toUpperCase() + key.slice(1);
          const on = self._navHeld(row[0], route);
          out['ns' + cap] = base + (on
            ? 'color:#FFFFFF;background:rgba(255,255,255,.10);box-shadow:inset 3px 0 0 #C9A227;'
            : 'color:#B9C8D6;');
          out['np' + cap] = on ? 'true' : 'false';
        });
        return out;
      })(this),

      /* Top-bar search hands off to the marketplace on SUBMIT, not on every
         keystroke: navigating as someone types is a change of context on
         input (WCAG 3.2.2) and yanks the screen away mid-word. */
      onTopSearchType: (e) => { this.setState({ query: e.target.value }); },
      onTopSearchSubmit: (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (this.state.route !== 'marketplace') this.nav('marketplace');
      },

      /* ---- compliance watch, derived once and shared -------------------
         The SVS banner, the Needs-you feed and the bell all read this, so
         they can never disagree about how many suppliers are flagged. */
      ...(function (self) {
        const watch = self._complianceWatch();
        const blocked = watch.filter(function (w) { return w.blocked; }).length;
        return {
          svsAlertCount: String(watch.length),
          svsAlertLine: watch.map(function (w) {
            return self._watchLine(w) + (w.blocked
              ? ' (booking blocked until evidence uploaded).'
              : ' (renewal reminder sent).');
          }).join(' '),
          watchCount: watch.length,
          watchHeadline: watch.length === 0
            ? 'Compliance — all clear'
            : watch.length + (watch.length === 1 ? ' supplier' : ' suppliers') + ' on compliance watch',
          watchDetail: watch.length === 0
            ? 'Every supplier certificate is current.'
            : watch.map(function (w) { return self._watchLine(w); }).join(' · '),
          watchChip: blocked > 0,
          watchChipLabel: blocked + ' blocked from booking',
          watchIconStyle: 'width:32px;height:32px;flex-shrink:0;border-radius:8px;display:grid;place-items:center;margin-top:2px;'
            + (blocked > 0 ? 'background:#FBEAEA;color:#B91C1C;' : 'background:#E8F1F7;color:#0E5E8A;')
        };
      })(this),

      /* KPI tiles — series are illustrative seven-week histories ending on
         the headline value, same as the site's DASHBOARD_KPIS. Flat keys so
         each tile can carry its own literal icon in the partial. */
      ...(function (self) {
        const K = [
          { label: 'Active jobs', value: '14', delta: '+3 this week', tone: 'up', pts: [9, 10, 12, 11, 13, 11, 14] },
          { label: 'Open quote requests', value: st.sent ? '9' : '6', delta: st.sent ? '9 just issued for MV Elan' : '2 replies awaiting review', tone: 'flat', pts: [2, 4, 3, 5, 4, 6, st.sent ? 9 : 6] },
          { label: 'SVS-verified suppliers', value: '52', delta: '4 onboarding', tone: 'up', pts: [44, 46, 47, 48, 50, 51, 52] },
          { label: 'Admin time saved a month', value: '31 hrs', delta: 'vs the manual workflow', tone: 'flat', pts: [22, 24, 26, 27, 29, 30, 31] }
        ];
        const out = {};
        K.forEach(function (k, i) {
          const n = 'kpi' + (i + 1);
          out[n + 'Label'] = k.label;
          out[n + 'Value'] = k.value;
          out[n + 'Delta'] = k.delta;
          out[n + 'Spark'] = self._spark(k.pts);
          out[n + 'ChipStyle'] = 'display:inline-block;border-radius:999px;padding:2px 8px;font-size:11.5px;'
            + 'font-weight:700;white-space:nowrap;'
            + (k.tone === 'up' ? 'background:#E7F4EF;color:#047857;' : 'background:#E8F1F7;color:#0E5E8A;');
        });
        return out;
      })(this),

      /* 48-hour strip. Offsets are hours from the demo "now" (Thursday
         08:00); the label column carries every fact the drawing shows. */
      dashCalls: (function (self) {
        const chip = function (bg, fg) {
          return 'display:inline-flex;align-items:center;border-radius:999px;padding:3px 10px;font-size:11.5px;font-weight:700;background:' + bg + ';color:' + fg + ';';
        };
        /* a bar from the call's start to the strip's end (or the sailing),
           in percent of the 48 hours; text is clipped, never wrapped */
        const mark = function (left, width, bg, fg) {
          return 'position:absolute;top:6px;bottom:6px;left:' + left + '%;width:' + width + '%;box-sizing:border-box;border-radius:6px;background:' + bg + ';color:' + fg
            + ';font-size:11px;font-weight:700;display:flex;align-items:center;padding:0 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        };
        return [
          { name: 'MV Elan', sched: 'Aberdeen \u00b7 ETA Fri 08:00 \u00b7 Regent Quay \u00b7 Browne Energy / Grizzell Marine', pill: self.state.sent ? '9 quote requests out' : 'Procurement list ready', pillStyle: chip('#E8F1F7', '#0E5E8A'), mark: 'Fri 08:00 \u2192', markStyle: mark(50, 48, '#0E5E8A', '#FFFFFF') },
          { name: 'MV Boreal', sched: 'Peterhead \u00b7 ETA Fri 14:30 \u00b7 Smith Quay \u00b7 Stronach Subsea', pill: '2 certs expiring on booked supplier', pillStyle: chip('#FBF0E1', '#B45309'), mark: 'Fri 14:30 \u2192', markStyle: mark(63.5, 34.5, '#FBF0E1', '#B45309') },
          { name: 'MV Granite Coast', sched: 'Aberdeen \u00b7 ETD Sat 06:00 \u00b7 Customs: T1 in progress \u00b7 Wilkinson Drilling', pill: 'All documents complete', pillStyle: chip('#E7F4EF', '#047857'), mark: 'Alongside \u00b7 sails Sat 06:00', markStyle: mark(0, 95.8, '#E7F4EF', '#047857') + 'padding-left:12px;' }
        ];
      })(this),
      sent: !!st.sent,
      sendLabel: st.sent ? '\u2713 9 quote requests issued' : 'Send 9 quote requests',
      sendNote: st.sent
        ? 'Replies will populate the comparison view automatically \u2014 open Quotes when they land.'
        : '3 suppliers for each of 3 services \u00b7 replies land side by side in Quotes',
      sendBtnStyle: 'border:none;border-radius:8px;padding:11px 18px;font-weight:700;font-size:14px;font-family:inherit;transition:background .15s;'
        + (st.sent ? 'background:#E7F4EF;color:#047857;cursor:default;' : 'background:#0E5E8A;color:#FFFFFF;cursor:pointer;'),
      sendQuoteRequests: () => {
        if (this.state.sent) return;   /* idempotent: a second click does nothing */
        this.setState({ sent: true }); this._set('sent', true);
        this.toastMsg('9 quote requests issued for MV Elan \u00b7 reply-by Thu 12:00', 'SENT');
        this._routeTimer = setTimeout(() => this.nav('quotes'), 1500);
      },
      /* offered on any platform screen, not the dashboard alone: the closing
         slide's QR lands on the harbour, and whichever tab they open first
         should still offer the walkthrough. The landing screen carries its own
         invitation above the harbour (partials/40-home.html). */
      showTourPrompt: isPlatform && !st.tourDismissed && st.tourStep === null,
      showTourRestart: isPlatform && st.tourDismissed && st.tourStep === null,

      /* Sidebar count for Quotes (2 Sep) — neutral, because three replies
         to compare is work rather than a deadline. Invoices' badge is derived
         after the feature merge below, beside the bell it agrees with. */
      navQuoteCount: String(this.QUOTES.length),

      /* The dashboard's consolidation card. The arithmetic stays in the tier
         helpers; the switches write the same calculator state the Tiers screen
         does, so a demonstrator who changes it here finds that screen agreeing. */
      consolCardStyle: full
        ? 'border:1.5px solid #C9A227;background:linear-gradient(180deg,#FFFDF4,#FFFFFF 60%);'
        : 'border:1px solid #E5EAF1;background:#FFFFFF;',
      saveOnly: this._gbp(save),
      dashConsolLabel: [calc.agency, calc.logistics, calc.customs, true].filter(Boolean).length
        + ' of 4 pillars active under one roof' + (full ? ', Full Stack' : ''),
      dashConsolHint: full
        ? 'All three lines held: Full Stack.'
        : (calc.customs && !calc.logistics)
          ? 'Customs alone does not reach 7%: the ladder runs Agency, then Logistics, then Customs.'
          : 'Reach Customs and the roof turns gold.',
      /* One spark at the apex while Full Stack is held. */
      dashGlint: full ? 'glint .7s ease-out both' : 'none',
      keyAgency: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCalc({ agency: !this.state.calc.agency }); } },
      keyLogistics: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCalc({ logistics: !this.state.calc.logistics }); } },
      keyCustoms: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCalc({ customs: !this.state.calc.customs }); } },

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
      tiles: tiles,
      mktBrowsing: browsing,
      mktFiltered: !browsing,
      mktResultsTitle: browsing ? 'All services' : (st.chip === 'All' ? 'Search results' : st.chip),
      mktFilterLabel: st.chip === 'All' ? '\u201C' + st.query.trim() + '\u201D' : st.chip,
      mktFilterAria: 'Clear the ' + (st.chip === 'All' ? st.query.trim() : st.chip) + ' filter',
      clearMktFilter: () => this.setState({ chip: 'All', query: '' }),
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
      /* the GAC Agent band and the queue rewrite on acceptance */
      gaBandStyle: 'margin-top:18px;border-radius:12px;padding:14px 18px;display:flex;gap:14px;align-items:center;font-size:13.5px;flex-wrap:wrap;color:#D8E2EC;transition:background .3s;background:' + (st.accepted ? '#0B3B2E' : '#0A2540') + ';',
      gaHead: st.accepted ? 'Purchase order 48211 raised in GAC Agent.' : 'GAC Agent is ready.',
      gaBody: st.accepted
        ? 'Against MV Elan, with the 60/40 Browne Energy / Grizzell Marine billing split applied from the vessel profile. The agreement went to the supplier with the booked window and terms. Nothing re-keyed.'
        : 'On acceptance, a purchase order is generated automatically against MV Elan with the 60/40 Browne Energy / Grizzell Marine billing split applied from the vessel profile. No re-keying.',
      queueCraneLine: st.accepted ? 'Booked \u00b7 ' + st.accepted + ' \u00b7 PO 48211' : '3 of 3 replies in \u00b7 reviewing now',
      queueCraneStyle: 'border-radius:10px;padding:12px 14px;' + (st.accepted ? 'border:1.5px solid #047857;background:#E7F4EF;' : 'border:1.5px solid #0E5E8A;background:#E8F1F7;'),

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
      tourStepLabel: tourOpen ? (st.tourStep + 1) + ' / ' + this.TOUR.length : '',
      tourTitle: stop ? stop.title : '',
      tourBody: stop ? stop.body : '',
      tourHasBack: tourOpen && st.tourStep > 0,
      tourNextLabel: tourOpen && st.tourStep === this.TOUR.length - 1 ? 'Finish' : 'Next',
      startTour: () => { this.setState({ tourStep: 0 }); this.nav(this.TOUR[0].route); },
      dismissTourPrompt: () => { this.setState({ tourDismissed: true }); this._set('tour-dismissed', true); },
      skipTour: this._skipTour,
      tourBack: () => {
        const i = Math.max(0, this.state.tourStep - 1);
        this.setState({ tourStep: i }); this.nav(this.TOUR[i].route);
      },
      tourNext: () => {
        const i = this.state.tourStep;
        if (i >= this.TOUR.length - 1) { this._skipTour(); this.toastMsg('Tour complete. Everything you just saw persists between visits — pick any tab and carry on.'); return; }
        this.setState({ tourStep: i + 1 }); this.nav(this.TOUR[i + 1].route);
      }
    };

    /* The bell is derived last, once the feature modules' bindings have been
       merged in: it counts what needs a decision — invoices still inside
       their seven-day window plus compliance alerts. Letters in flight are
       progress, not action, so they are deliberately not counted. */
    vals.navInvoiceCount = String(vals.dashInvCount || 0);
    vals.dashInvIconStyle = 'width:32px;height:32px;flex-shrink:0;border-radius:8px;display:grid;place-items:center;margin-top:2px;background:#E8F1F7;color:#0E5E8A;';
    const bell = (vals.dashInvCount || 0) + (vals.watchCount || 0);
    vals.bellCount = String(bell);
    vals.bellHasCount = bell > 0;
    vals.bellLabel = bell > 0
      ? 'Notifications: ' + bell + ' items need you — open the Needs-you list'
      : 'Notifications: nothing needs you';
    return vals;
  }
}
