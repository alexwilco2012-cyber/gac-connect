/* Desk data (live dashboards, 23 Sep 2026, task T4).

   The deck's mirror of the site's seed data and pure rules for the client
   dashboard, the supplier dashboard, the SVS desk and supplier analytics:

     src/data/desk.ts, clientDesk.ts, supplierDesk.ts, svsDesk.ts, analytics.ts
     src/lib/clientDesk.ts, src/lib/svsDesk.ts (and tierPct from lib/tier.ts)
     src/lib/crewChange.ts stampLabel, src/store/svsDesk.ts APPROVED_NOTE,
     src/data/plans.ts SPARKLINE_30D

   The same figures, labels and rules as the site, value for value: every
   constant sits on DK under the site's export name (DK.PORT_CALLS,
   DK.PERIOD_SUMMARY[30] …), and every rule is a DK_ function that behaves
   exactly as its site namesake. The long series were pasted from the site's
   values rather than retyped, and a harness checks the lot against the
   site's modules. Change one surface and change the other.

   DK is deep-frozen. The seeds are what Reset demo goes back to, so nothing
   may edit them in place: DK_clone a seed before changing it (desk-state.js
   does this for the three persisted lists), and copy an array before
   sorting it.

   No state and no bindings live here: desk-state.js holds the shared state
   (evidence, applications, quotes) and the screens' modules read both.
   Script-scope rules: the deck is one script, so every top-level name here
   starts with DK. Keep the less-than character out of string literals. */

/* ---------- helpers the data needs ---------- */

function DK_deepFreeze(v) {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    Object.keys(v).forEach((k) => DK_deepFreeze(v[k]));
  }
  return v;
}

/* A plain, unfrozen copy of seed data (the seeds hold only JSON values). */
function DK_clone(v) {
  return JSON.parse(JSON.stringify(v));
}

/* ---------- data ---------- */

const DK = DK_deepFreeze(
  (function () {
    /* ---- src/data/desk.ts ---- */
    const DEMO_CLIENT = 'Browne Energy';
    const DEMO_SUPPLIER_ID = 'silver-city-welding';
    const EXAMPLE_JOB_GBP = 4400;

    /* ---- src/data/clientDesk.ts ---- */
    const LINE_ORDER = ['agency', 'logistics', 'customs', 'procurement'];
    const LINE_LABELS = {
      agency: 'Agency',
      logistics: 'Logistics',
      customs: 'Customs',
      procurement: 'Procurement',
    };
    const PORT_CALL_STAGES = [
      'Pre-arrival',
      'Pilot booked',
      'Berth confirmed',
      'Alongside',
      'Sailed',
    ];
    /* One row per vessel, in VESSELS order (vesselId is the site's VESSELS id). */
    const PORT_CALLS = [
      {
        vesselId: 'choice',
        stage: 'Berth confirmed',
        when: 'ETA Fri 08:00',
        countdown: 'in 24 hrs',
        berth: 'Regent Quay, Aberdeen',
        chips: [
          { label: 'Crane hire · 3 quotes', to: '/app/quotes', tone: 'info' },
          { label: 'Compass list ready', to: '/app/procurement', tone: 'info' },
          { label: 'Crew change', to: '/app/agency/crew-change', tone: 'info' },
        ],
      },
      {
        vesselId: 'boreal',
        stage: 'Pilot booked',
        when: 'ETA Fri 14:30',
        countdown: 'in 30 hrs',
        berth: 'Smith Quay, Peterhead',
        chips: [
          { label: '2 certs expiring on booked supplier', to: '/app/svs', tone: 'warn' },
          { label: 'Diving support booked', to: '/app/marketplace', tone: 'info' },
        ],
      },
      {
        vesselId: 'granite-coast',
        stage: 'Alongside',
        when: 'ETD Sat 06:00',
        countdown: 'sails in 46 hrs',
        berth: 'Regent Quay, Aberdeen',
        chips: [
          { label: 'Customs: T1 in progress', to: '/app/customs', tone: 'info' },
          { label: 'All documents complete', tone: 'success' },
        ],
      },
    ];
    /* "Latest from GAC", newest first. Times are written from the demo's
       Thursday 08:00; `to` is the site path (the deck maps it to a route). */
    const CLIENT_ACTIVITY = [
      {
        id: 'act-pilot-choice',
        when: 'Today 07:42',
        line: 'agency',
        icon: 'anchor',
        text: 'Pilot booked for MV Choice — Regent Quay, 08:00 tomorrow',
        to: '/app/agency',
      },
      {
        id: 'act-crane-quote',
        when: 'Today 07:15',
        line: 'quotes',
        icon: 'message-square-quote',
        text: 'Third crane-hire quote in for MV Choice — ready to compare',
        to: '/app/quotes',
      },
      {
        id: 'act-consignment-glasgow',
        when: 'Yesterday 16:20',
        line: 'logistics',
        icon: 'truck',
        text: 'Consignment collected in Glasgow, due at the GAC warehouse on Friday',
        to: '/app/logistics',
      },
      {
        id: 'act-invoice-4471',
        when: 'Yesterday 14:05',
        line: 'invoices',
        icon: 'receipt',
        text: 'Invoice INV-4471 received — in your seven-day review window',
        to: '/app/invoices',
      },
      {
        id: 'act-t1-granite-coast',
        when: 'Yesterday 11:30',
        line: 'customs',
        icon: 'stamp',
        text: 'T1 transit declaration submitted to HMRC for MV Granite Coast',
        to: '/app/customs',
      },
      {
        id: 'act-stores-list',
        when: 'Mon 09:10',
        line: 'procurement',
        icon: 'clipboard-list',
        text: 'Stores list for MV Choice drafted — ready to send to Compass',
        to: '/app/procurement',
      },
      {
        id: 'act-berth-boreal',
        when: 'Mon 08:30',
        line: 'agency',
        icon: 'anchor',
        text: 'Berth confirmed at Smith Quay, Peterhead for MV Boreal',
        to: '/app/agency',
      },
      {
        id: 'act-svs-alert-boreal',
        when: 'Sun 17:45',
        line: 'svs',
        icon: 'shield-check',
        text: 'SVS alert: a supplier booked for MV Boreal has two certificates due for renewal',
        to: '/app/svs',
      },
    ];
    const SPEND_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
    /* Pounds a month. At Full Stack the six months total £250,000, so the
       £17,500 saved at 7% is half the tier calculator's annual saving. */
    const SPEND_BY_LINE = {
      agency: [23000, 24000, 21000, 26000, 25000, 27000],
      logistics: [8000, 9000, 7000, 10000, 9000, 11000],
      customs: [4000, 4000, 3000, 5000, 4000, 5000],
      procurement: [4000, 4000, 5000, 4000, 4000, 4000],
    };
    const QUICK_ACTIONS = [
      { label: 'Request a quote', icon: 'message-square-quote', to: '/app/marketplace' },
      { label: 'Book a movement', icon: 'truck', to: '/app/logistics' },
      { label: 'Start a crew change', icon: 'ship', to: '/app/agency/crew-change' },
      { label: 'Raise a customs entry', icon: 'stamp', to: '/app/customs' },
      { label: 'Send a Compass list', icon: 'clipboard-list', to: '/app/procurement' },
    ];

    /* ---- src/data/analytics.ts (first: the supplier KPIs read its series) ---- */
    /* 90 days ending Wed 23 Sep 2026, oldest first. */
    const DAY_LABELS_90 = [
      'Fri 26 Jun',
      'Sat 27 Jun',
      'Sun 28 Jun',
      'Mon 29 Jun',
      'Tue 30 Jun',
      'Wed 1 Jul',
      'Thu 2 Jul',
      'Fri 3 Jul',
      'Sat 4 Jul',
      'Sun 5 Jul',
      'Mon 6 Jul',
      'Tue 7 Jul',
      'Wed 8 Jul',
      'Thu 9 Jul',
      'Fri 10 Jul',
      'Sat 11 Jul',
      'Sun 12 Jul',
      'Mon 13 Jul',
      'Tue 14 Jul',
      'Wed 15 Jul',
      'Thu 16 Jul',
      'Fri 17 Jul',
      'Sat 18 Jul',
      'Sun 19 Jul',
      'Mon 20 Jul',
      'Tue 21 Jul',
      'Wed 22 Jul',
      'Thu 23 Jul',
      'Fri 24 Jul',
      'Sat 25 Jul',
      'Sun 26 Jul',
      'Mon 27 Jul',
      'Tue 28 Jul',
      'Wed 29 Jul',
      'Thu 30 Jul',
      'Fri 31 Jul',
      'Sat 1 Aug',
      'Sun 2 Aug',
      'Mon 3 Aug',
      'Tue 4 Aug',
      'Wed 5 Aug',
      'Thu 6 Aug',
      'Fri 7 Aug',
      'Sat 8 Aug',
      'Sun 9 Aug',
      'Mon 10 Aug',
      'Tue 11 Aug',
      'Wed 12 Aug',
      'Thu 13 Aug',
      'Fri 14 Aug',
      'Sat 15 Aug',
      'Sun 16 Aug',
      'Mon 17 Aug',
      'Tue 18 Aug',
      'Wed 19 Aug',
      'Thu 20 Aug',
      'Fri 21 Aug',
      'Sat 22 Aug',
      'Sun 23 Aug',
      'Mon 24 Aug',
      'Tue 25 Aug',
      'Wed 26 Aug',
      'Thu 27 Aug',
      'Fri 28 Aug',
      'Sat 29 Aug',
      'Sun 30 Aug',
      'Mon 31 Aug',
      'Tue 1 Sep',
      'Wed 2 Sep',
      'Thu 3 Sep',
      'Fri 4 Sep',
      'Sat 5 Sep',
      'Sun 6 Sep',
      'Mon 7 Sep',
      'Tue 8 Sep',
      'Wed 9 Sep',
      'Thu 10 Sep',
      'Fri 11 Sep',
      'Sat 12 Sep',
      'Sun 13 Sep',
      'Mon 14 Sep',
      'Tue 15 Sep',
      'Wed 16 Sep',
      'Thu 17 Sep',
      'Fri 18 Sep',
      'Sat 19 Sep',
      'Sun 20 Sep',
      'Mon 21 Sep',
      'Tue 22 Sep',
      'Wed 23 Sep',
    ];
    /* Thirteen trailing weeks; the oldest is six days (90 = 12 × 7 + 6). */
    const WEEK_LABELS_13 = [
      '26 Jun–1 Jul',
      '2–8 Jul',
      '9–15 Jul',
      '16–22 Jul',
      '23–29 Jul',
      '30 Jul–5 Aug',
      '6–12 Aug',
      '13–19 Aug',
      '20–26 Aug',
      '27 Aug–2 Sep',
      '3–9 Sep',
      '10–16 Sep',
      '17–23 Sep',
    ];
    /* Profile views per day: 318 · 349 · 412 by 30-day block, 1,079 in all. */
    const VIEWS_90 = [
      11, 5, 5, 14, 15, 12, 13, 12, 5, 5, 13, 14, 12, 13, 11, 5, 5, 12, 14, 15, 12, 11, 5, 5, 14,
      16, 13, 12, 13, 6, 5, 13, 16, 14, 15, 14, 5, 5, 13, 14, 14, 13, 11, 6, 5, 13, 14, 13, 15, 14,
      6, 6, 16, 15, 14, 15, 15, 7, 6, 17, 18, 18, 14, 12, 7, 5, 18, 17, 18, 17, 13, 7, 7, 15, 20,
      15, 16, 13, 7, 6, 18, 18, 17, 14, 16, 8, 6, 16, 17, 19,
    ];
    /* Quote requests per day: 29 · 34 · 38, 101 in all. The last 30 peak once,
       at 4 on Tue 1 Sep. */
    const REQUESTS_90 = [
      1, 0, 1, 0, 1, 1, 3, 1, 0, 0, 0, 2, 2, 0, 2, 0, 0, 3, 3, 2, 3, 1, 0, 0, 2, 0, 1, 0, 0, 0, 0,
      1, 3, 0, 0, 3, 0, 1, 2, 0, 3, 0, 1, 0, 0, 1, 3, 1, 2, 0, 1, 0, 4, 2, 2, 0, 2, 0, 0, 2, 1, 1,
      3, 0, 0, 0, 1, 4, 1, 1, 1, 0, 0, 2, 3, 2, 1, 1, 0, 0, 3, 2, 1, 1, 1, 0, 0, 3, 2, 3,
    ];
    /* Category average views per day across verified Welding suppliers. */
    const CATEGORY_VIEWS_90 = [
      8.5, 6.7, 6.5, 9.6, 9.7, 9.4, 9.3, 8.7, 7, 6.5, 9.4, 9.6, 9.8, 9.4, 8.8, 7, 6.4, 9.7, 9.7, 10,
      9.4, 9.2, 7, 6.4, 9.6, 9.8, 9.8, 9.8, 8.9, 7.3, 6.6, 9.9, 10.2, 10.2, 9.8, 9.4, 7.4, 6.5, 9.8,
      10.1, 9.9, 9.5, 9.1, 7.4, 6.7, 10, 10.2, 10.4, 10, 9.5, 7.3, 6.8, 9.9, 10.1, 10.4, 9.9, 9.3,
      7.5, 6.8, 10, 10.6, 10.6, 10.1, 9.8, 7.6, 7.1, 10.1, 10.6, 10.5, 10.5, 9.9, 7.7, 7.1, 10.8,
      11, 10.5, 10.5, 9.5, 7.7, 7, 10.7, 10.8, 10.8, 10.7, 9.9, 7.9, 7.1, 10.7, 11, 10.7,
    ];
    /* Heatmap rows, Monday first, and its twelve two-hour columns. */
    const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const WEEKDAY_NAMES = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    const HOUR_BLOCKS = [
      '00–02',
      '02–04',
      '04–06',
      '06–08',
      '08–10',
      '10–12',
      '12–14',
      '14–16',
      '16–18',
      '18–20',
      '20–22',
      '22–24',
    ];
    const HOUR_BLOCK_NAMES = [
      '00:00–02:00',
      '02:00–04:00',
      '04:00–06:00',
      '06:00–08:00',
      '08:00–10:00',
      '10:00–12:00',
      '12:00–14:00',
      '14:00–16:00',
      '16:00–18:00',
      '18:00–20:00',
      '20:00–22:00',
      '22:00–24:00',
    ];
    /* When requests arrive, rows Mon–Sun. Each row is that weekday's requests
       in the period; one peak in each, at Tuesday 08:00–10:00. */
    const HEATMAP_30 = [
      [0, 0, 0, 2, 2, 2, 0, 0, 1, 2, 0, 0],
      [0, 1, 0, 2, 5, 0, 1, 2, 1, 0, 0, 0],
      [0, 0, 0, 0, 1, 4, 2, 1, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 1, 0, 1, 2, 0, 0, 1],
      [0, 0, 0, 0, 2, 0, 1, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ];
    const HEATMAP_90 = [
      [0, 0, 0, 3, 7, 5, 1, 0, 5, 3, 0, 0],
      [0, 1, 1, 3, 9, 2, 4, 4, 1, 0, 1, 0],
      [0, 0, 0, 2, 3, 7, 3, 2, 2, 1, 0, 0],
      [0, 0, 1, 3, 1, 3, 1, 1, 2, 0, 1, 1],
      [1, 0, 0, 1, 3, 1, 1, 2, 3, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
    ];
    const SEARCH_TERMS = [
      'coded welder aberdeen',
      'onboard welding repair',
      'pipework repair',
      'skid frame fabrication',
      '24/7 welding call-out',
    ];
    const SOURCE_LABELS = [
      'Marketplace search',
      'Welding category page',
      'Promoted placement',
      'Service-line hub',
      'Direct link and other',
    ];
    const FUNNEL_LABELS = [
      'Search appearances',
      'Profile views',
      'Quote requests',
      'Quotes sent',
      'Jobs won',
    ];
    function summary(p) {
      const funnelValues = [p.appearances, p.views, p.requests, p.quoted, p.won];
      return {
        views: p.views,
        viewsPrev: p.viewsPrev,
        requests: p.requests,
        requestsPrev: p.requestsPrev,
        winRate: p.winRate,
        winRatePrev: p.winRatePrev,
        won: p.won,
        quoted: p.quoted,
        responseHrs: p.responseHrs,
        responseHrsPrev: p.responseHrsPrev,
        categoryWinRate: p.categoryWinRate,
        categoryResponseHrs: p.categoryResponseHrs,
        funnel: FUNNEL_LABELS.map((label, i) => ({ label: label, value: funnelValues[i] })),
        sources: SOURCE_LABELS.map((label, i) =>
          Object.assign(
            { label: label, value: p.sources[i] },
            i === 2 ? { promoted: true } : {},
            i === 4 ? { other: true } : {},
          ),
        ),
        searches: SEARCH_TERMS.map((term, i) => ({ term: term, count: p.searches[i] })),
        heatmap: p.heatmap.map((row) => row.slice()),
      };
    }
    const PERIOD_SUMMARY = {
      30: summary({
        views: 412,
        viewsPrev: 349,
        requests: 38,
        requestsPrev: 34,
        winRate: 34,
        winRatePrev: 30,
        won: 12,
        quoted: 35,
        responseHrs: 2.1,
        responseHrsPrev: 2.6,
        categoryWinRate: 27,
        categoryResponseHrs: 5.4,
        appearances: 2960,
        sources: [168, 104, 71, 38, 31],
        searches: [64, 41, 33, 18, 15],
        heatmap: HEATMAP_30,
      }),
      90: summary({
        views: 1079,
        viewsPrev: 951,
        requests: 101,
        requestsPrev: 88,
        winRate: 32,
        winRatePrev: 29,
        won: 30,
        quoted: 93,
        responseHrs: 2.4,
        responseHrsPrev: 2.9,
        categoryWinRate: 26,
        categoryResponseHrs: 5.6,
        appearances: 8140,
        sources: [441, 272, 186, 99, 81],
        searches: [171, 118, 92, 49, 37],
        heatmap: HEATMAP_90,
      }),
    };
    /* What each funnel step says about the one before it. */
    const FUNNEL_RATE_VERBS = ['opened your profile', 'asked for a quote', 'quoted', 'won'];
    /* Behind the 4.4 ★ · 72 ratings. All time, not per period. */
    const RATINGS_DISTRIBUTION = [
      { stars: 5, count: 42 },
      { stars: 4, count: 21 },
      { stars: 3, count: 6 },
      { stars: 2, count: 2 },
      { stars: 1, count: 1 },
    ];

    /* ---- src/data/supplierDesk.ts ---- */
    const SUPPLIER_INBOX = [
      {
        id: 'req-4471',
        service: 'Onboard pipework repair',
        vessel: 'MV Granite Coast',
        detail: 'Coded welder, two days alongside Regent Quay',
        replyBy: 'Reply by 16:00 today',
        tone: 'warn',
      },
      {
        id: 'req-4478',
        service: 'Fabrication — skid frames',
        vessel: 'Wilkinson Drilling mobilisation',
        detail: 'Three frames to drawing, delivered to the GAC warehouse',
        replyBy: 'Reply by Friday 12:00',
        tone: 'info',
      },
    ];
    /* Quotes already with clients. Ids are lower-case like the inbox's; show
       them upper-cased if a reference is ever displayed. */
    const AWAITING_QUOTES = [
      {
        id: 'req-4462',
        service: 'Handrail repair',
        vessel: 'MV Boreal',
        amountGbp: 1850,
        sentLabel: 'Sent Tue',
      },
      {
        id: 'req-4455',
        service: 'Coded welder call-out',
        vessel: 'Regent Quay laydown',
        amountGbp: 2400,
        sentLabel: 'Sent Mon',
      },
      {
        id: 'req-4449',
        service: 'Pipe spool fabrication',
        vessel: 'Stronach Subsea',
        amountGbp: 6300,
        sentLabel: 'Sent last week',
      },
    ];
    const WON_THIS_MONTH = 4;
    const LEAD_TIMES = ['Same day', 'Next day', '2–3 days', 'Within a week'];
    const VALIDITY = ['7 days', '14 days', '30 days'];
    /* The date the vault's days-left figures are counted from. */
    const VAULT_AS_OF_ISO = '2026-09-23';
    /* Silver City's certificates: fictional issuers, illustrative references,
       all more than 90 days out. svsName is the site's SUPPLIERS name; the
       deck's own roster calls them 'Coding certs', 'Insurance' and 'GWO'. */
    const SILVER_CITY_VAULT = [
      {
        id: 'vc-coded',
        name: 'Coded welder qualifications (BS EN ISO 9606-1)',
        svsName: 'Coding certificates',
        issuer: 'Northgate Weld Certification',
        reference: 'CW-26-0418',
        issuedOn: '2026-03-14',
        expiresOn: '2027-03-13',
        daysLeft: 171,
      },
      {
        id: 'vc-insurance',
        name: 'Employers’ and public liability insurance',
        svsName: 'Insurance',
        issuer: 'Northsound Mutual Insurance',
        reference: 'NSM-EL-7731',
        issuedOn: '2026-02-01',
        expiresOn: '2027-01-31',
        daysLeft: 130,
      },
      {
        id: 'vc-gwo',
        name: 'GWO Basic Safety Training',
        svsName: 'GWO',
        issuer: 'Quayside Safety Training',
        reference: 'GWO-BST-2291',
        issuedOn: '2025-01-09',
        expiresOn: '2027-01-08',
        daysLeft: 107,
      },
    ];
    const RECOMMENDED_FOR_WELDING = [
      'Coded welder qualifications (BS EN ISO 9606-1)',
      'Employers’ and public liability insurance',
      'GWO Basic Safety Training',
      'ISO 9001 quality management',
    ];
    const EARNINGS_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
    /* £56,100 won; £50,490 kept at the 10% Premium band. */
    const EARNINGS_WON = [7200, 9850, 6400, 11300, 8750, 12600];
    /* The latest three of the 72. `by` is a client company or a role, never a person. */
    const RECENT_REVIEWS = [
      {
        id: 'rv-1',
        stars: 5,
        by: 'Browne Energy',
        job: 'Onboard pipework repair, MV Boreal',
        text: 'Coded welder on board inside two hours; job signed off first time.',
        when: '2 weeks ago',
      },
      {
        id: 'rv-2',
        stars: 4,
        by: 'GAC agent on close-out',
        job: 'Fabrication call-out, Regent Quay laydown',
        text: 'Good work; paperwork arrived a day after the job.',
        when: '3 weeks ago',
      },
      {
        id: 'rv-3',
        stars: 5,
        by: 'Wilkinson Drilling',
        job: 'Skid frame modifications',
        text: 'Frames to drawing and delivered to the GAC warehouse on the day promised.',
        when: '5 weeks ago',
      },
    ];
    /* The supplier view's four tiles, the same figures as PERIOD_SUMMARY[30]. */
    const SUPPLIER_KPIS = [
      {
        id: 'views',
        label: 'Profile views (30 days)',
        value: '412',
        delta: '+18% on the previous 30 days',
        series: VIEWS_90.slice(60),
      },
      {
        id: 'requests',
        label: 'Quote requests (30 days)',
        value: '38',
        delta: '+12% on the previous 30 days',
        series: REQUESTS_90.slice(60),
      },
      { id: 'win', label: 'Win rate', value: '34%', delta: '+4 pts · 12 won of 35 quoted' },
      { id: 'response', label: 'Avg. response time', value: '2.1 hrs', delta: '0.5 hrs faster' },
    ];

    /* ---- src/data/svsDesk.ts ---- */
    const CERT_TYPES = [
      'Coded welder qualification (BS EN ISO 9606-1)',
      'ISO 9001 quality management',
      'ISO 3834 welding quality requirements',
      'ISO 45001 occupational health and safety',
      'ISO 14001 environmental management',
      'Employers’ liability insurance',
      'Public liability insurance',
      'GWO Basic Safety Training',
      'BOSIET offshore survival',
      'LOLER thorough examination report',
      'Offshore medical',
      'Other',
    ];
    const ONBOARDING_STAGES = ['Applied', 'Documents', 'Checks', 'Decision'];
    /* The eight onboarding checks, in order; the category check's label is per applicant. */
    const CHECKS = [
      { id: 'company', label: 'Company registration and VAT number' },
      { id: 'insurance', label: 'Employers’ and public liability insurance' },
      { id: 'hse', label: 'Health and safety policy, signed within 12 months' },
      { id: 'sanctions', label: 'Sanctions and adverse media screen' },
      { id: 'bank', label: 'Bank details confirmed (Confirmation of Payee)' },
      { id: 'references', label: 'Two trade references' },
      { id: 'category', label: 'Category competence evidence' },
      { id: 'policies', label: 'Anti-bribery and modern slavery statements' },
    ];
    const checks = (passed) => ({
      company: passed.includes('company') ? 'passed' : 'pending',
      insurance: passed.includes('insurance') ? 'passed' : 'pending',
      hse: passed.includes('hse') ? 'passed' : 'pending',
      sanctions: passed.includes('sanctions') ? 'passed' : 'pending',
      bank: passed.includes('bank') ? 'passed' : 'pending',
      references: passed.includes('references') ? 'passed' : 'pending',
      category: passed.includes('category') ? 'passed' : 'pending',
      policies: passed.includes('policies') ? 'passed' : 'pending',
    });
    const RECEIVED = 'Application received through the For Suppliers page';
    /* Four open applicants, one at each stage, newest first (Internal's
       "4 onboarding"). Fictional companies, roles only in the trails, and
       never in SUPPLIERS: they are not vetted yet. */
    const SEED_APPLICATIONS = [
      {
        id: 'APP-3107',
        company: 'Torry Point Rope Access',
        category: 'Rope access',
        port: 'Aberdeen',
        appliedLabel: 'Yesterday',
        daysInReview: 1,
        stage: 'Applied',
        outcome: 'open',
        risk: 'Medium',
        categoryCheckLabel: 'Rope access technician certificates',
        checks: checks(['company']),
        trail: [
          { at: 'Yesterday 14:26', by: 'Applicant', text: RECEIVED },
          {
            at: 'Yesterday 16:05',
            by: 'SVS team',
            text: 'Company registration and VAT number — passed',
          },
        ],
      },
      {
        id: 'APP-3104',
        company: 'Girdle Ness Marine Electrical',
        category: 'Marine electrical',
        port: 'Aberdeen',
        appliedLabel: 'Mon',
        daysInReview: 3,
        stage: 'Documents',
        outcome: 'open',
        risk: 'Low',
        categoryCheckLabel: 'Marine electrical competence certificates',
        checks: checks(['company', 'insurance']),
        infoRequest:
          'The health and safety policy supplied is dated 2023 — please upload the current signed policy.',
        trail: [
          { at: 'Mon 09:40', by: 'Applicant', text: RECEIVED },
          { at: 'Mon 15:10', by: 'SVS team', text: 'Company registration and VAT number — passed' },
          {
            at: 'Tue 10:25',
            by: 'SVS team',
            text: 'Employers’ and public liability insurance — passed',
          },
          {
            at: 'Tue 11:02',
            by: 'SVS team',
            text: 'Asked for more information: the health and safety policy supplied is dated 2023 — please upload the current signed policy.',
          },
        ],
      },
      {
        id: 'APP-3101',
        company: 'Balnagask Hydraulics',
        category: 'Hydraulics',
        port: 'Peterhead',
        appliedLabel: 'Last Fri',
        daysInReview: 4,
        stage: 'Checks',
        outcome: 'open',
        risk: 'Low',
        categoryCheckLabel: 'Hydraulic hose assembly competence',
        checks: checks(['company', 'insurance', 'hse', 'bank', 'category', 'policies']),
        trail: [
          { at: 'Last Fri 11:15', by: 'Applicant', text: RECEIVED },
          { at: 'Mon 10:12', by: 'SVS team', text: 'Documents complete — moved to Checks' },
          {
            at: 'Tue 14:30',
            by: 'SVS team',
            text: 'Bank details confirmed (Confirmation of Payee) — passed',
          },
          { at: 'Wed 09:05', by: 'SVS team', text: 'Sanctions and adverse media screen started' },
        ],
      },
      {
        id: 'APP-3098',
        company: 'Cove Bay Scaffolding',
        category: 'Scaffolding',
        port: 'Montrose',
        appliedLabel: 'Last Wed',
        daysInReview: 6,
        stage: 'Decision',
        outcome: 'open',
        risk: 'Low',
        categoryCheckLabel: 'Scaffolder competence cards',
        checks: checks([
          'company',
          'insurance',
          'hse',
          'sanctions',
          'bank',
          'references',
          'category',
          'policies',
        ]),
        trail: [
          { at: 'Last Wed 10:40', by: 'Applicant', text: RECEIVED },
          { at: 'Last Fri 12:20', by: 'SVS team', text: 'Documents complete — moved to Checks' },
          { at: 'Tue 16:45', by: 'SVS team', text: 'All eight checks passed — moved to Decision' },
        ],
      },
    ];
    /* Two submissions waiting on the SVS team, newest first, from suppliers
       already Verified (their SUPPLIERS ids), so approving them moves no status. */
    const SEED_EVIDENCE = [
      {
        id: 'EVD-2038',
        supplierId: 'caledonia-lifting',
        supplierName: 'Caledonia Lifting Ltd',
        kind: 'renewal',
        certType: 'LOLER thorough examination report',
        certLabel: 'LOLER thorough examination — 60t crawler crane',
        issuer: 'Northgate Lifting Inspection',
        reference: 'LOL-26-5512',
        issuedOn: '2026-09-16',
        expiresOn: '2027-09-15',
        daysLeft: 357,
        fileName: 'LOLER-60t-crawler.pdf',
        fileSize: 1258291,
        submittedAt: 'Today 08:05',
        stage: 'submitted',
        trail: [
          { at: 'Today 08:05', by: 'Supplier', text: 'Renewal uploaded: LOLER-60t-crawler.pdf' },
        ],
      },
      {
        id: 'EVD-2036',
        supplierId: 'aberdeen-offshore-medical',
        supplierName: 'Aberdeen Offshore Medical',
        kind: 'new',
        certType: 'ISO 45001 occupational health and safety',
        certLabel: 'ISO 45001 occupational health and safety',
        issuer: 'Northgate Quality Assurance',
        reference: 'OHS-45-0877',
        issuedOn: '2026-09-01',
        expiresOn: '2029-08-31',
        daysLeft: 1073,
        fileName: 'ISO45001-certificate.pdf',
        fileSize: 319488,
        submittedAt: 'Yesterday 15:40',
        stage: 'submitted',
        trail: [
          {
            at: 'Yesterday 15:40',
            by: 'Supplier',
            text: 'Certificate uploaded: ISO45001-certificate.pdf',
          },
        ],
      },
    ];
    const MEDIAN_VERIFY_LABEL = '3.5 days';
    /* Working days the SVS team aims to decide an application in. */
    const SLA_DAYS = 5;
    const BASE_PORTS = ['Aberdeen', 'Peterhead', 'Montrose'];
    /* The invite form's categories: the applicants' trades, then the
       marketplace's (the site derives this from its CATEGORIES, which hold the
       same list in the same order as DC_DATA.CATEGORIES). */
    const INVITE_CATEGORIES = [
      'Rope access',
      'Marine electrical',
      'Hydraulics',
      'Scaffolding',
      'Cranes',
      'FLT',
      'Launches',
      'Taxis',
      'Haulage',
      'Medical',
      'Diving',
      'NDT',
      'Welding',
      'Catering',
      'Hotels',
      'Waste',
      'Bunkers',
    ];

    /* ---- src/lib/svsDesk.ts (the certificate form) ---- */
    const EMPTY_CERT_FORM = {
      certType: '',
      otherLabel: '',
      issuer: '',
      reference: '',
      issuedOn: '',
      expiresOn: '',
      fileName: '',
      fileSize: 0,
      declared: false,
    };
    /* "Fill with an example": the ISO 9001 the Welding listing is missing. */
    const EXAMPLE_CERT_FORM = {
      certType: 'ISO 9001 quality management',
      otherLabel: '',
      issuer: 'Northgate Quality Assurance',
      reference: 'QA-9001-2618',
      issuedOn: '2026-09-02',
      expiresOn: '2029-09-01',
      fileName: 'ISO9001-certificate.pdf',
      fileSize: 248 * 1024,
      declared: true,
    };
    const MAX_FILE_BYTES = 10 * 1024 * 1024;
    const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

    /* ---- src/store/svsDesk.ts ---- */
    const APPROVED_NOTE =
      'Approved — listing goes live at the next marketplace publish (simulated)';

    /* ---- src/data/plans.ts: the last 30 days of quote requests ---- */
    const SPARKLINE_30D = REQUESTS_90.slice(60);

    return {
      DEMO_CLIENT,
      DEMO_SUPPLIER_ID,
      EXAMPLE_JOB_GBP,
      LINE_ORDER,
      LINE_LABELS,
      PORT_CALL_STAGES,
      PORT_CALLS,
      CLIENT_ACTIVITY,
      SPEND_MONTHS,
      SPEND_BY_LINE,
      QUICK_ACTIONS,
      SUPPLIER_INBOX,
      AWAITING_QUOTES,
      WON_THIS_MONTH,
      LEAD_TIMES,
      VALIDITY,
      VAULT_AS_OF_ISO,
      SILVER_CITY_VAULT,
      RECOMMENDED_FOR_WELDING,
      EARNINGS_MONTHS,
      EARNINGS_WON,
      RECENT_REVIEWS,
      SUPPLIER_KPIS,
      CERT_TYPES,
      ONBOARDING_STAGES,
      CHECKS,
      SEED_APPLICATIONS,
      SEED_EVIDENCE,
      MEDIAN_VERIFY_LABEL,
      SLA_DAYS,
      BASE_PORTS,
      INVITE_CATEGORIES,
      DAY_LABELS_90,
      WEEK_LABELS_13,
      VIEWS_90,
      REQUESTS_90,
      CATEGORY_VIEWS_90,
      WEEKDAYS,
      WEEKDAY_NAMES,
      HOUR_BLOCKS,
      HOUR_BLOCK_NAMES,
      PERIOD_SUMMARY,
      FUNNEL_RATE_VERBS,
      RATINGS_DISTRIBUTION,
      EMPTY_CERT_FORM,
      EXAMPLE_CERT_FORM,
      MAX_FILE_BYTES,
      ACCEPTED_EXTENSIONS,
      APPROVED_NOTE,
      SPARKLINE_30D,
    };
  })(),
);

/* ---------- client desk rules (src/lib/clientDesk.ts) ----------
   The spend chart and "Latest from GAC" follow the lines held in the tier
   card. `tier` is { agency, logistics, customs } — the deck's st.calc will
   do. Procurement is included at any tier, so it is always held. */

/* lib/tier.ts tierPct: the highest single tier held, never the sum. */
function DK_tierPct(tier) {
  const on = Object.keys(DC_DATA.TIERS).filter((k) => tier[k]);
  return on.length
    ? Math.max.apply(
        null,
        on.map((k) => DC_DATA.TIERS[k]),
      )
    : 0;
}

/* The lines held, in ladder order. Procurement always. */
function DK_heldLines(tier) {
  return DK.LINE_ORDER.filter((id) => id === 'procurement' || tier[id]);
}

/* The spend chart's stacks, bottom to top. A line's entry never changes with
   what else is held, so colour can follow the line id. */
function DK_spendSeries(tier) {
  return DK_heldLines(tier).map((id) => ({
    id: id,
    label: DK.LINE_LABELS[id],
    values: DK.SPEND_BY_LINE[id].slice(),
  }));
}

/* What the tier discount saved each month: held lines' total × tier, to the pound. */
function DK_monthlySaving(tier) {
  const pct = DK_tierPct(tier);
  const series = DK_spendSeries(tier);
  return DK.SPEND_MONTHS.map((_, i) => {
    const total = series.reduce((acc, s) => acc + (s.values[i] ?? 0), 0);
    return Math.round((total * pct) / 100);
  });
}

/* "Latest from GAC" without the Logistics and Customs rows not held. */
function DK_visibleActivity(tier) {
  return DK.CLIENT_ACTIVITY.filter((item) => {
    if (item.line === 'logistics') return tier.logistics;
    if (item.line === 'customs') return tier.customs;
    return true;
  });
}

/* Position on the five-step milestone rail, counted from one. */
function DK_portCallStep(stage) {
  return DK.PORT_CALL_STAGES.indexOf(stage) + 1;
}

/* ---------- analytics (src/data/analytics.ts) ---------- */

/* Trailing seven-day sums ending on the last value; the oldest bin takes the remainder. */
function DK_weeklySums(values) {
  const out = [];
  for (let end = values.length; end > 0; end -= 7) {
    const start = Math.max(0, end - 7);
    out.unshift(values.slice(start, end).reduce((a, b) => a + b, 0));
  }
  return out;
}

/* "13.9% opened your profile", "9.2% asked for a quote", "92% quoted", "34% won". */
function DK_funnelRateLabels(funnel) {
  return DK.FUNNEL_RATE_VERBS.map((verb, i) => {
    const from = (funnel[i] && funnel[i].value) ?? 0;
    const to = (funnel[i + 1] && funnel[i + 1].value) ?? 0;
    const pct = from === 0 ? 0 : (to / from) * 100;
    return (pct >= 20 ? Math.round(pct) : pct.toFixed(1)) + '% ' + verb;
  });
}

/* Every series the analytics screen draws for one period (30 or 90):
   daily at 30 days; at 90, requests and both sparklines become 13 weekly sums. */
function DK_seriesFor(period) {
  const from = 90 - period;
  const labels = DK.DAY_LABELS_90.slice(from);
  const views = DK.VIEWS_90.slice(from);
  const requests = DK.REQUESTS_90.slice(from);
  const category = DK.CATEGORY_VIEWS_90.slice(from);
  if (period === 30) {
    return {
      labels: labels,
      views: views,
      category: category,
      requests: requests,
      requestLabels: labels.slice(),
      sparkViews: views.slice(),
      sparkRequests: requests.slice(),
    };
  }
  const weeklyRequests = DK_weeklySums(requests);
  return {
    labels: labels,
    views: views,
    category: category,
    requests: weeklyRequests,
    requestLabels: DK.WEEK_LABELS_13.slice(),
    sparkViews: DK_weeklySums(views),
    sparkRequests: weeklyRequests.slice(),
  };
}

/* ---------- SVS desk rules (src/lib/svsDesk.ts) ---------- */

function DK_hasAcceptedExtension(fileName) {
  const lower = fileName.toLowerCase();
  return DK.ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/* What is still needed before the form can go to the SVS team, in the order
   the form asks; shown as one "Still needed: …" line. Pass todayISO in
   (DK_todayISO() in the handler), so the rule stays pure. */
function DK_validateCertForm(form, todayISO) {
  const problems = [];
  if (!form.certType) problems.push('certificate type');
  if (form.certType === 'Other' && !(form.otherLabel || '').trim()) {
    problems.push('a description of the certificate');
  }
  if (!(form.issuer || '').trim()) problems.push('issuing body');
  if (!(form.reference || '').trim()) problems.push('reference or certificate number');
  if (!form.issuedOn) problems.push('issue date');
  if (!form.expiresOn) problems.push('expiry date');
  if (form.issuedOn && form.expiresOn && form.expiresOn <= form.issuedOn) {
    problems.push('expiry after issue');
  }
  if (form.expiresOn && form.expiresOn <= todayISO) {
    problems.push('expiry in the future — this certificate has already expired');
  }
  if (!form.fileName) {
    problems.push('a file');
  } else {
    if (!DK_hasAcceptedExtension(form.fileName)) problems.push('file must be a PDF, JPG or PNG');
    if (form.fileSize > DK.MAX_FILE_BYTES) problems.push('file must be under 10 MB');
  }
  if (!form.declared) problems.push('the confirmation tick');
  return problems;
}

/* "248 KB", "1.2 MB", "512 bytes", as a file browser puts it. */
function DK_fileSizeLabel(bytes) {
  if (bytes < 1024) return bytes + ' bytes';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  const mb = bytes / (1024 * 1024);
  return (mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10) + ' MB';
}

const DK_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function DK_parseISO(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

/* '2027-03-13' → '13 Mar 2027'. An unreadable date comes back as it went in. */
function DK_formatDateGB(iso) {
  const p = DK_parseISO(iso);
  if (!p) return iso;
  return p.d + ' ' + DK_MONTHS[p.m - 1] + ' ' + p.y;
}

/* Whole days from one ISO date to another (negative when `to` is earlier). */
function DK_daysBetween(fromISO, toISO) {
  const a = DK_parseISO(fromISO);
  const b = DK_parseISO(toISO);
  if (!a || !b) return 0;
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000);
}

/* Today on this device, 'YYYY-MM-DD'. Impure: handlers and state methods only. */
function DK_todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

/* 'Thu 24 Sep · 09:12', the site's stampLabel (lib/crewChange.ts). Impure. */
function DK_stampLabel(d) {
  const dt = d || new Date();
  const day = dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = dt.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return day + ' · ' + time;
}

function DK_evidenceStatus(stage) {
  switch (stage) {
    case 'approved':
      return { label: 'Verified by the SVS team', tone: 'verified' };
    case 'info-requested':
      return { label: 'More information needed', tone: 'warn' };
    case 'rejected':
      return { label: 'Rejected', tone: 'danger' };
    default:
      return { label: 'Awaiting SVS review', tone: 'info' };
  }
}

function DK_nextRef(prefix, existing, floor) {
  const pattern = new RegExp('^' + prefix + '-(\\d+)$');
  const numbers = existing
    .map((x) => {
      const m = pattern.exec(x.id);
      return Number(m ? m[1] : NaN);
    })
    .filter((n) => Number.isFinite(n));
  const top = numbers.length ? Math.max.apply(null, numbers) : floor;
  return prefix + '-' + (top + 1);
}

/* 'EVD-2039': one above the highest evidence reference held. */
function DK_nextEvidenceRef(existing) {
  return DK_nextRef('EVD', existing, 2038);
}

/* 'APP-3108': one above the highest application reference held. */
function DK_nextApplicationRef(existing) {
  return DK_nextRef('APP', existing, 3107);
}

/* Submissions waiting on the SVS team: the SVS nav badge and the queue's count. */
function DK_evidenceOpenCount(ev) {
  return ev.filter((e) => e.stage === 'submitted').length;
}

/* The label a check carries for this applicant (the category check is per trade). */
function DK_checkLabel(app, id) {
  if (id === 'category') return app.categoryCheckLabel;
  const check = DK.CHECKS.find((c) => c.id === id);
  return check ? check.label : id;
}

/* Checks passed or not applicable, out of eight. */
function DK_checklistProgress(app) {
  const done = DK.CHECKS.filter((c) => {
    const state = app.checks[c.id];
    return state === 'passed' || state === 'na';
  }).length;
  return { done: done, total: DK.CHECKS.length };
}

/* Why "Approve and list" is not available yet, in words; null when it is. */
function DK_approveBlocker(app) {
  if (app.outcome === 'approved') return 'This applicant has already been approved.';
  if (app.outcome === 'declined') return 'This application was declined.';
  if (app.infoRequest) {
    return 'Waiting on the applicant: mark the information request as answered first.';
  }
  const failed = DK.CHECKS.filter((c) => app.checks[c.id] === 'failed').map((c) =>
    DK_checkLabel(app, c.id),
  );
  if (failed.length) {
    return 'A check has failed (' + failed.join('; ') + '). Ask for more information, or decline.';
  }
  const pending = DK.CHECKS.filter((c) => app.checks[c.id] === 'pending').map((c) =>
    DK_checkLabel(app, c.id),
  );
  if (pending.length) {
    const count = pending.length === 1 ? 'One check' : pending.length + ' checks';
    return count + ' still to complete: ' + pending.join('; ') + '.';
  }
  if (app.stage !== 'Decision') return 'Move the application to Decision first.';
  return null;
}

/* Open, at Decision, every check passed or N/A, nothing waiting on the applicant. */
function DK_canApprove(app) {
  return DK_approveBlocker(app) === null;
}

/* The stage after this one (the site's nextOnboardingStage). Decision is the
   last: approve or decline from there. */
function DK_nextStage(stage) {
  const i = DK.ONBOARDING_STAGES.indexOf(stage);
  if (i === -1) return DK.ONBOARDING_STAGES[0];
  return DK.ONBOARDING_STAGES[Math.min(i + 1, DK.ONBOARDING_STAGES.length - 1)];
}

/* Against the five-day SLA: fine under four days, due at four or five, overdue beyond. */
function DK_slaState(app) {
  const d = app.daysInReview;
  if (d > DK.SLA_DAYS) return { state: 'over', label: 'Overdue · day ' + d + ' of ' + DK.SLA_DAYS };
  if (d <= 0) return { state: 'ok', label: 'New today' };
  return { state: d >= DK.SLA_DAYS - 1 ? 'due' : 'ok', label: 'Day ' + d + ' of ' + DK.SLA_DAYS };
}

/* Applicants still in onboarding (the site's onboardingOpenCount). */
function DK_openCount(apps) {
  return apps.filter((a) => a.outcome === 'open').length;
}

function DK_approvedCount(apps) {
  return apps.filter((a) => a.outcome === 'approved').length;
}

/* ---------- the overlay rule (spec §4.4) ---------- */

/* The SVS alert tiers applied to a certificate's own dates: due inside 90 days. */
function DK_stateFromDays(daysLeft) {
  if (daysLeft <= 0) return 'lapsed';
  if (daysLeft <= 90) return 'due';
  return 'ok';
}

function DK_inForceStatus(state) {
  if (state === 'lapsed') return { statusLabel: 'Lapsed', statusTone: 'danger' };
  if (state === 'due') return { statusLabel: 'Renewal due', statusTone: 'warn' };
  return { statusLabel: 'In date', statusTone: 'verified' };
}

function DK_refNumber(id) {
  const m = /(\d+)$/.exec(id);
  return Number(m ? m[1] : 0);
}

/* The most recent of a set of submissions, by reference: order-independent. */
function DK_latest(subs) {
  return subs.reduce(
    (best, s) => (!best || DK_refNumber(s.id) > DK_refNumber(best.id) ? s : best),
    undefined,
  );
}

/* The supplier's certificate rows: each vault certificate carrying its latest
   renewal (pending: shown beside the current dates; approved: the new dates
   take over), then one row per new certificate sent in, latest first. A
   re-upload supersedes an earlier submission of the same certificate. */
function DK_vaultRows(vault, evidence, supplierId) {
  const mine = evidence.filter((e) => e.supplierId === supplierId);

  const held = vault.map((cert) => {
    const renewal = DK_latest(mine.filter((e) => e.kind === 'renewal' && e.vaultId === cert.id));
    const base = {
      id: cert.id,
      name: cert.name,
      vaultId: cert.id,
      issuer: cert.issuer,
      reference: cert.reference,
      expiresOn: cert.expiresOn,
      daysLeft: cert.daysLeft,
    };
    const state = DK_stateFromDays(cert.daysLeft);
    if (!renewal) return Object.assign({}, base, { state: state }, DK_inForceStatus(state));

    const tracked = { submissionId: renewal.id };
    switch (renewal.stage) {
      case 'approved': {
        const renewed = DK_stateFromDays(renewal.daysLeft);
        return Object.assign(
          {},
          base,
          tracked,
          {
            issuer: renewal.issuer,
            reference: renewal.reference,
            expiresOn: renewal.expiresOn,
            daysLeft: renewal.daysLeft,
            state: renewed,
          },
          renewed === 'ok'
            ? { statusLabel: 'Verified by the SVS team', statusTone: 'verified' }
            : DK_inForceStatus(renewed),
        );
      }
      case 'info-requested':
        return Object.assign({}, base, tracked, {
          state: state,
          statusLabel: 'More information needed',
          statusTone: 'warn',
          note: renewal.note,
        });
      case 'rejected':
        return Object.assign({}, base, tracked, {
          state: state,
          statusLabel: 'Renewal rejected',
          statusTone: 'danger',
          note: renewal.note,
        });
      default:
        return Object.assign({}, base, tracked, {
          state: state,
          statusLabel: 'Renewal awaiting SVS review',
          statusTone: 'info',
          pendingRenewal: true,
        });
    }
  });

  /* One row per new certificate, the latest submission of each winning. */
  const byName = new Map();
  mine
    .filter((x) => x.kind === 'new')
    .forEach((e) => {
      const key = e.certLabel.trim().toLowerCase();
      const current = byName.get(key);
      if (!current || DK_refNumber(e.id) > DK_refNumber(current.id)) byName.set(key, e);
    });
  const added = Array.from(byName.values())
    .sort((a, b) => DK_refNumber(b.id) - DK_refNumber(a.id))
    .map((e) => {
      const base = {
        id: e.id,
        name: e.certLabel,
        issuer: e.issuer,
        reference: e.reference,
        expiresOn: e.expiresOn,
        submissionId: e.id,
      };
      const status = DK_evidenceStatus(e.stage);
      switch (e.stage) {
        case 'approved':
          return Object.assign({}, base, {
            daysLeft: e.daysLeft,
            state: DK_stateFromDays(e.daysLeft),
            statusLabel: status.label,
            statusTone: 'verified',
          });
        case 'info-requested':
          return Object.assign({}, base, {
            daysLeft: null,
            state: 'info',
            statusLabel: status.label,
            statusTone: 'warn',
            note: e.note,
          });
        case 'rejected':
          return Object.assign({}, base, {
            daysLeft: null,
            state: 'rejected',
            statusLabel: status.label,
            statusTone: 'danger',
            note: e.note,
          });
        default:
          return Object.assign({}, base, {
            daysLeft: e.daysLeft,
            state: 'pending',
            statusLabel: status.label,
            statusTone: 'info',
          });
      }
    });

  return held.concat(added);
}

/* A supplier's certificates as the gate reads them ({ name, state }), plus
   each approved new certificate as { name, state: 'ok' }. Existing entries
   pass through untouched, so no status, bell, alert or marketplace row ever
   moves on an approval. The deck's roster names its certificates `label`:
   Component#_dkCertsFor (desk-state.js) adapts it. */
function DK_certsWithApproved(supplierId, certs, evidence) {
  const out = certs.slice();
  const names = new Set(certs.map((c) => c.name.toLowerCase()));
  const approved = evidence
    .filter((e) => e.supplierId === supplierId && e.kind === 'new' && e.stage === 'approved')
    .sort((a, b) => DK_refNumber(a.id) - DK_refNumber(b.id));
  approved.forEach((e) => {
    const key = e.certLabel.toLowerCase();
    if (names.has(key)) return;
    names.add(key);
    out.push({ name: e.certLabel, state: 'ok' });
  });
  return out;
}

/* The Welding listing's recommended set against what the supplier holds:
   on file (in force), pending (with the SVS team), missing (anything else). */
function DK_recommendedStatus(rows) {
  const missing = [];
  const pending = [];
  let onFile = 0;
  DK.RECOMMENDED_FOR_WELDING.forEach((name) => {
    const matches = rows.filter((r) => r.name.trim().toLowerCase() === name.toLowerCase());
    if (matches.some((r) => r.state === 'ok' || r.state === 'due')) onFile += 1;
    else if (matches.some((r) => r.state === 'pending')) pending.push(name);
    else missing.push(name);
  });
  return {
    onFile: onFile,
    total: DK.RECOMMENDED_FOR_WELDING.length,
    missing: missing,
    pending: pending,
  };
}
