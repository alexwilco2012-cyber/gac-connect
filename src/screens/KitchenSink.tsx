import { useState } from 'react';
import {
  BenchmarkBar,
  ChartFigure,
  ExpiryBar,
  FunnelBars,
  HBarList,
  Heatmap,
  LINE_COLOURS,
  StackedColumns,
  TimeSeriesPanels,
  VIZ,
  type ExpiryState,
  type LegendItem,
  type ServiceLineId,
} from '../components/charts';
import { binRanges } from '../components/charts/scale';
import { Button, ButtonLink } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { CertChip } from '../components/ui/CertChip';
import { Chip } from '../components/ui/Chip';
import { Drawer } from '../components/ui/Drawer';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Modal } from '../components/ui/Modal';
import { BetaPill, GoldBandPill, Pill, StatusPill } from '../components/ui/Pill';
import { Rating } from '../components/ui/Rating';
import { StatCard } from '../components/ui/StatCard';
import { Toggle } from '../components/ui/Toggle';
import { Loader } from '../components/motif/Loader';
import { PillarsRoof } from '../components/motif/PillarsRoof';
import { supplierKeeps } from '../lib/commission';
import { compactGbp, gbp } from '../lib/format';
import { session } from '../lib/storage';
import { tierPct } from '../lib/tier';
import { useApp } from '../store/app';

/* ——— Chart gallery sample data (illustrative; the screens read src/data) ——— */

const KS_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const KS_MONTH_NAMES = [
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
/** 90 days ending Wed 23 Sep 2026 — "Fri 26 Jun" … "Wed 23 Sep". */
const KS_DAYS = Array.from({ length: 90 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 5, 26 + i));
  return `${KS_WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${KS_MONTH_NAMES[d.getUTCMonth()]}`;
});

/** Seeded PRNG so the gallery draws the same curve every time. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KS_SERIES = (() => {
  const rand = seeded(23092026);
  const views: number[] = [];
  const requests: number[] = [];
  const category: number[] = [];
  for (let i = 0; i < 90; i++) {
    const weekday = (5 + i) % 7;
    const weekend = weekday === 0 || weekday === 6;
    const base = 9 + i * 0.07;
    views.push(Math.max(1, Math.round((weekend ? base * 0.45 : base) + (rand() - 0.5) * 6)));
    requests.push(weekend ? (rand() < 0.2 ? 1 : 0) : Math.floor(rand() * 3.2));
    category.push(Number((9.1 + Math.sin(i / 6) * 0.9).toFixed(1)));
  }
  views[80] = Math.max(...views) + 5; // one clear peak
  requests[74] = 4; // and one peak in the last 30 days of requests
  return { views, requests, category };
})();

const KS_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
const KS_SPEND: Record<ServiceLineId, number[]> = {
  agency: [23000, 24000, 21000, 26000, 25000, 27000],
  logistics: [8000, 9000, 7000, 10000, 9000, 11000],
  customs: [4000, 4000, 3000, 5000, 4000, 5000],
  procurement: [4000, 4000, 5000, 4000, 4000, 4000],
};
const KS_LINE_LABELS: Record<ServiceLineId, string> = {
  agency: 'Agency',
  logistics: 'Logistics',
  customs: 'Customs',
  procurement: 'Procurement',
};
const KS_WON = [7200, 9850, 6400, 11300, 8750, 12600];

const KS_FUNNEL = [
  { label: 'Search appearances', value: 2960 },
  { label: 'Profile views', value: 412 },
  { label: 'Quote requests', value: 38 },
  { label: 'Quotes sent', value: 35 },
  { label: 'Jobs won', value: 12 },
];
const KS_FUNNEL_RATES = [
  '13.9% opened your profile',
  '9.2% asked for a quote',
  '92% quoted',
  '34% won',
];

const KS_SOURCES = [
  { id: 'search', label: 'Marketplace search', value: 168 },
  { id: 'category', label: 'Welding category page', value: 104 },
  { id: 'promoted', label: 'Promoted placement', value: 71, tag: '▲ Promoted' },
  { id: 'hub', label: 'Service-line hub', value: 38 },
  { id: 'other', label: 'Direct link and other', value: 31, color: VIZ.other },
];
const KS_RATINGS = [42, 21, 6, 2, 1];
const KS_SEARCHES = [
  { term: 'coded welder aberdeen', count: 64 },
  { term: 'onboard welding repair', count: 41 },
  { term: 'pipework repair', count: 33 },
  { term: 'skid frame fabrication', count: 18 },
  { term: '24/7 welding call-out', count: 15 },
];

const KS_WEEKDAY_ROWS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const KS_DAY_NAMES: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};
const KS_HOURS = Array.from({ length: 12 }, (_, i) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(i * 2)}–${pad(i * 2 + 2)}`;
});
const KS_HEAT = [
  [0, 0, 0, 0, 1, 2, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 5, 2, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 2, 2, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
];

const KS_CERTS: {
  name: string;
  daysLeft: number | null;
  state: ExpiryState;
  expires: string;
}[] = [
  { name: 'Coded welder qualifications', daysLeft: 171, state: 'ok', expires: '13 Mar 2027' },
  { name: 'GWO Basic Safety Training', daysLeft: 21, state: 'due', expires: '14 Oct 2026' },
  { name: 'Employers’ liability insurance', daysLeft: 0, state: 'lapsed', expires: '2 Sep 2026' },
  { name: 'ISO 9001 quality management', daysLeft: 1074, state: 'pending', expires: '1 Sep 2029' },
  { name: 'Offshore medical', daysLeft: null, state: 'info', expires: 'Dates to follow' },
];

const plural = (n: number, one: string, many: string) =>
  `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;

/** Hidden component gallery for design review (05 §E2). Not linked from nav. */
export default function KitchenSink() {
  const pushToast = useApp((s) => s.pushToast);
  const [toggleOn, setToggleOn] = useState(true);
  const [chip, setChip] = useState('All');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pillars, setPillars] = useState([true, true, false, false]);
  const [range, setRange] = useState(50);
  const [loaderKey, setLoaderKey] = useState(0);

  function replayLoader() {
    session.remove('loaderSeen');
    useApp.setState({ loaderSeen: false });
    setLoaderKey((k) => k + 1);
  }

  const pillarDefs = [
    { label: 'Agency', on: pillars[0] ?? false },
    { label: 'Logistics', on: pillars[1] ?? false },
    { label: 'Customs', on: pillars[2] ?? false },
    { label: 'Procurement', on: pillars[3] ?? false },
  ];
  const fullStack = pillars.every(Boolean);

  return (
    <main className="screen-enter mx-auto max-w-[1180px] px-6 py-10">
      <Eyebrow>Kitchen sink · design review only</Eyebrow>
      <h1 className="mt-1 font-display text-2xl font-bold">Every component, one screen</h1>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold">Pills and badges</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="inhouse">★ GAC In-House</Pill>
          <Pill tone="verified">✓ GAC Verified</Pill>
          <Pill tone="promoted">▲ Promoted</Pill>
          <Pill tone="warn">⚠ Renewal due</Pill>
          <Pill tone="danger">✗ Blocked</Pill>
          <Pill tone="info">GAC Agent vessel profile loaded</Pill>
          <Pill tone="neutral">Neutral</Pill>
          <GoldBandPill />
          <span>
            Nav item
            <BetaPill />
          </span>
          <StatusPill status="verified" />
          <StatusPill status="renewal-due" />
          <StatusPill status="blocked" />
        </div>
        <p className="mt-3 text-[14px]">
          <Rating rating={4.9} count={127} />
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold">Buttons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="gold">Gold — in-house only</Button>
          <Button disabled>Disabled</Button>
          <ButtonLink to="/kitchen-sink" variant="ghost">
            Link as button
          </ButtonLink>
          <span className="inline-block rounded-lg bg-ink p-3">
            <Button variant="dark-outline">Dark outline</Button>
          </span>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold">Cards</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <p className="font-bold">Default card</p>
            <p className="mt-1 text-[13px] text-ink-soft">Hairline border, soft shadow.</p>
          </Card>
          <Card variant="inhouse">
            <p className="font-bold">In-house card</p>
            <p className="mt-1 text-[13px] text-ink-soft">Gold border, warm wash.</p>
          </Card>
          <Card variant="promoted">
            <p className="font-bold">Promoted card</p>
            <p className="mt-1 text-[13px] text-ink-soft">Violet border, cool wash.</p>
          </Card>
          <Card variant="dark">
            <p className="font-bold">Dark card</p>
            <p className="mt-1 text-[13px] text-white/70">Ink surface for result moments.</p>
          </Card>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold">Form controls</h2>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <Toggle
              pressed={toggleOn}
              onToggle={() => setToggleOn(!toggleOn)}
              label="Demo toggle"
            />
            <span className="text-[13px] text-ink-soft">{toggleOn ? 'On' : 'Off'}</span>
          </div>
          <label className="flex min-w-[260px] items-center gap-3">
            <span className="text-[13px] font-semibold">Slider</span>
            <input
              type="range"
              min="0"
              max="100"
              value={range}
              onChange={(e) => setRange(Number(e.target.value))}
              className="w-full accent-sea"
            />
            <span className="w-8 text-[13px] text-ink-soft">{range}</span>
          </label>
          <input
            type="search"
            placeholder="Search services, suppliers, or categories…"
            aria-label="Example search"
            className="min-w-[280px] rounded-lg border-[1.5px] border-line-strong bg-white px-3.5 py-2.5 text-[14.5px]"
          />
          <div className="flex gap-2">
            {['All', 'Cranes', 'Medical'].map((c) => (
              <Chip key={c} pressed={chip === c} onClick={() => setChip(c)}>
                {c}
              </Chip>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold">Table with cert chips</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse overflow-hidden rounded-brand border border-line bg-white text-[13.5px]">
            <thead>
              <tr>
                {['Supplier', 'Certifications', 'Status'].map((h) => (
                  <th
                    key={h}
                    className="bg-ink px-3.5 py-2.5 text-left text-[12px] tracking-[0.05em] text-white uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line">
                <td className="px-3.5 py-3 font-bold">Example Supplier A</td>
                <td className="px-3.5 py-3">
                  <CertChip cert={{ name: 'LOLER', state: 'ok' }} />
                  <CertChip cert={{ name: 'Insurance', state: 'ok' }} />
                </td>
                <td className="px-3.5 py-3">
                  <StatusPill status="verified" />
                </td>
              </tr>
              <tr>
                <td className="px-3.5 py-3 font-bold">Example Supplier B</td>
                <td className="px-3.5 py-3">
                  <CertChip cert={{ name: 'GWO', state: 'due', daysToExpiry: 21 }} />
                  <CertChip cert={{ name: 'Insurance', state: 'lapsed' }} />
                </td>
                <td className="px-3.5 py-3">
                  <StatusPill status="blocked" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold">Stat cards</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Profile views (30 days)" value="412" barPct={72} />
          <StatCard label="Quote requests" value="38" barPct={58} />
          <StatCard label="Win rate" value="34%" barPct={34} />
          <StatCard label="Avg. response time" value="2.1 hrs" barPct={86} />
        </div>
      </section>

      <ChartsGallery />

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold">Pillars and roof — parametric</h2>
        <Card className="max-w-[420px]">
          <PillarsRoof pillars={pillarDefs} fullStack={fullStack} className="mx-auto w-[260px]" />
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {pillarDefs.map((p, i) => (
              <Chip
                key={p.label}
                pressed={p.on}
                onClick={() => setPillars((prev) => prev.map((v, j) => (j === i ? !v : v)))}
              >
                {p.label}
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-center text-[12.5px] text-ink-soft">
            {fullStack
              ? 'Full Stack — the roof turns gold.'
              : 'Light all four pillars to gild the roof.'}
          </p>
        </Card>
      </section>

      <section className="mt-8 mb-16">
        <h2 className="mb-3 font-display text-lg font-bold">Overlays and the loader</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => pushToast('This is a toast. It dismisses itself in five seconds.', 'GA')}
          >
            Show toast
          </Button>
          <Button variant="ghost" onClick={replayLoader}>
            Replay loader
          </Button>
          <Button variant="ghost" onClick={() => setDrawerOpen(true)}>
            Open drawer
          </Button>
          <Button variant="ghost" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
        </div>
      </section>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Example drawer"
        outlookHeader
      >
        <p className="text-ink-soft">
          Right slide-over, 400px, focus-trapped, Escape closes. The Outlook-blue header marks the
          add-in preview context.
        </p>
      </Drawer>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} labelledBy="ks-modal-title">
        <Eyebrow>Example modal</Eyebrow>
        <h2 id="ks-modal-title" className="mt-1 font-display text-lg font-bold">
          Centred, focus-trapped
        </h2>
        <p className="mt-2 text-[14px] text-ink-soft">
          Escape closes it. Focus returns to the trigger afterwards.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setModalOpen(false)}>Confirm</Button>
        </div>
      </Modal>

      {loaderKey > 0 ? <Loader key={loaderKey} /> : null}
    </main>
  );
}

/** A segmented switch (the analytics period control): `aria-pressed` buttons. */
function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-lg border-[1.5px] border-line-strong bg-white p-0.5"
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`min-h-[40px] rounded-md px-3 text-[12.5px] font-bold sm:min-h-[32px] ${
              on ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Charts (live dashboards spec §6): every component in the kit with sample
 * figures. Hover, tab to a plot and use the arrow keys, or tap and drag on a
 * phone. The period switch and the pillar chips show the frame holding still
 * and colours following the line, never its rank.
 */
function ChartsGallery() {
  const [period, setPeriod] = useState<30 | 90>(30);
  const [held, setHeld] = useState({ logistics: true, customs: false });

  // Views and quote requests
  const from = period === 30 ? 60 : 0;
  const labels = KS_DAYS.slice(from);
  const views = KS_SERIES.views.slice(from);
  const category = KS_SERIES.category.slice(from);
  const daily = KS_SERIES.requests.slice(from);
  const weeks = binRanges(90, 13);
  const sum = (xs: number[], s: number, e: number) => xs.slice(s, e + 1).reduce((a, b) => a + b, 0);
  const requests = period === 30 ? daily : weeks.map(([s, e]) => sum(daily, s, e));
  const count = (n: number) => n.toLocaleString('en-GB');
  const viewsTotal = views.reduce((a, b) => a + b, 0);
  const requestsTotal = daily.reduce((a, b) => a + b, 0);

  // GAC spend by line, colour fixed to the line
  const on: Record<ServiceLineId, boolean> = {
    agency: true,
    logistics: held.logistics,
    customs: held.customs,
    procurement: true,
  };
  const lines = (['agency', 'logistics', 'customs', 'procurement'] as const).filter((id) => on[id]);
  const pct = tierPct({ agency: true, logistics: held.logistics, customs: held.customs });
  const spend = lines.map((id) => ({
    id,
    label: KS_LINE_LABELS[id],
    color: LINE_COLOURS[id],
    values: KS_SPEND[id],
  }));
  const monthTotals = KS_MONTHS.map((_, i) => spend.reduce((a, s) => a + s.values[i]!, 0));
  const saved = monthTotals.map((t) => Math.round((t * pct) / 100));
  const spendTotal = monthTotals.reduce((a, b) => a + b, 0);
  const savedTotal = saved.reduce((a, b) => a + b, 0);
  const spendLegend: LegendItem[] = spend.map((s) => ({ label: s.label, color: s.color }));

  // Earnings (supplier view only)
  const kept = KS_WON.map((w) => supplierKeeps(w, 'premium'));
  const band = KS_WON.map((w, i) => w - kept[i]!);
  const wonTotal = KS_WON.reduce((a, b) => a + b, 0);
  const keptTotal = kept.reduce((a, b) => a + b, 0);

  const ratingsTotal = KS_RATINGS.reduce((a, b) => a + b, 0);
  const sourcesTotal = KS_SOURCES.reduce((a, s) => a + s.value, 0);
  const share = (v: number) => `${Math.round((v / sourcesTotal) * 100)}%`;

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-bold">Charts</h2>
      <p className="mt-1 mb-4 max-w-[720px] text-[13px] text-ink-soft">
        Hand-rolled SVG and HTML, no chart library. Hover a plot, tab to it and use the arrow keys,
        or tap and drag on a phone. Figures are illustrative.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Profile views (30 days)"
          value="412"
          delta="+18% on the previous 30 days"
          series={KS_SERIES.views.slice(60)}
        />
        <StatCard
          label="Quote requests (30 days)"
          value="38"
          delta="+12% on the previous 30 days"
          series={KS_SERIES.requests.slice(60)}
        />
        <StatCard
          label="Win rate"
          value="34%"
          delta="+4 pts · 12 won of 35 quoted"
          deltaTone="info"
        />
        <StatCard label="Avg. response time" value="2.1 hrs" delta="0.5 hrs faster" />
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
        <ChartFigure
          className="lg:col-span-2"
          title="Views and quote requests"
          subtitle={`Per day, last ${period} days${period === 90 ? ' · requests summed by week' : ''}`}
          takeaway={`${count(viewsTotal)} profile views and ${count(requestsTotal)} quote requests in the last ${period} days, with views running above the category average on most weekdays.`}
          legend={[
            { label: 'Profile views', color: VIZ.sea, shape: 'line' },
            { label: 'Category average', color: VIZ.context, shape: 'line' },
          ]}
          action={
            <Segmented
              label="Period"
              value={period}
              onChange={setPeriod}
              options={[
                { value: 30, label: '30 days' },
                { value: 90, label: '90 days' },
              ]}
            />
          }
          table={
            period === 30
              ? {
                  caption: 'Profile views, category average and quote requests per day',
                  columns: ['Day', 'Profile views', 'Category average', 'Quote requests'],
                  rows: labels.map((l, i) => [
                    l,
                    count(views[i]!),
                    category[i]!.toFixed(1),
                    count(daily[i]!),
                  ]),
                }
              : {
                  caption: 'Profile views and quote requests per week',
                  columns: ['Week', 'Profile views', 'Quote requests'],
                  rows: weeks.map(([s, e], k) => [
                    `${labels[s]} to ${labels[e]}`,
                    count(sum(views, s, e)),
                    count(requests[k]!),
                  ]),
                }
          }
        >
          <TimeSeriesPanels
            labels={labels}
            ariaLabel={`Profile views and quote requests, last ${period} days`}
            panels={[
              {
                id: 'views',
                label: 'Profile views per day',
                kind: 'area',
                values: views,
                format: count,
                benchmark: { label: 'Category average', values: category },
              },
              {
                id: 'requests',
                label: period === 30 ? 'Quote requests per day' : 'Quote requests per week',
                kind: 'columns',
                values: requests,
                format: count,
              },
            ]}
          />
        </ChartFigure>

        <ChartFigure
          title="GAC spend, last six months"
          subtitle="By service line, with what your tier discount saved underneath"
          takeaway={`${gbp(spendTotal)} across ${lines.length} service lines since April; the ${pct}% tier discount saved ${gbp(savedTotal)}.`}
          headline={
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span className="font-display text-[22px] leading-none font-bold">
                {gbp(spendTotal)}
              </span>
              <span className="text-[13px] text-ink-soft">
                {gbp(savedTotal)} saved at {pct}%
              </span>
            </p>
          }
          legend={spendLegend}
          action={
            <div role="group" aria-label="Lines held" className="flex gap-1.5">
              <Chip
                pressed={held.logistics}
                onClick={() => setHeld((h) => ({ ...h, logistics: !h.logistics }))}
              >
                Logistics
              </Chip>
              <Chip
                pressed={held.customs}
                onClick={() => setHeld((h) => ({ ...h, customs: !h.customs }))}
              >
                Customs
              </Chip>
            </div>
          }
          footnote="Illustrative figures. The chart follows the lines held in the tier card above."
          table={{
            caption: 'GAC spend by service line and tier saving per month',
            columns: ['Month', ...spend.map((s) => s.label), 'Total', 'Saved'],
            rows: KS_MONTHS.map((m, i) => [
              m,
              ...spend.map((s) => gbp(s.values[i]!)),
              gbp(monthTotals[i]!),
              gbp(saved[i]!),
            ]),
          }}
        >
          <StackedColumns
            categories={KS_MONTHS}
            series={spend}
            format={gbp}
            axisFormat={compactGbp}
            directLabelLast
            lower={{
              label: 'Saved by your tier discount',
              color: VIZ.derived,
              values: saved,
              format: gbp,
            }}
            ariaLabel="GAC spend by service line per month, with the tier saving below"
          />
        </ChartFigure>

        <ChartFigure
          title="Earnings through the platform"
          subtitle="Work won through the platform, and what you keep after your band"
          takeaway={`${gbp(keptTotal)} kept of ${gbp(wonTotal)} won since April.`}
          headline={
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span className="font-display text-[22px] leading-none font-bold">
                {gbp(keptTotal)} kept
              </span>
              <span className="text-[13px] text-ink-soft">of {gbp(wonTotal)} won</span>
            </p>
          }
          legend={[
            { label: 'You keep', color: VIZ.sea },
            { label: '10% Premium band', color: VIZ.deduction },
          ]}
          table={{
            caption: 'Work won, band and amount kept per month',
            columns: ['Month', 'Won', 'Band', 'You keep'],
            rows: KS_MONTHS.map((m, i) => [m, gbp(KS_WON[i]!), gbp(band[i]!), gbp(kept[i]!)]),
          }}
        >
          <StackedColumns
            categories={KS_MONTHS}
            series={[
              { id: 'keep', label: 'You keep', color: VIZ.sea, values: kept },
              { id: 'band', label: '10% Premium band', color: VIZ.deduction, values: band },
            ]}
            format={gbp}
            axisFormat={compactGbp}
            directLabelLast
            ariaLabel="Work won per month, split into what you keep and the band"
          />
        </ChartFigure>

        <ChartFigure
          title="From search to signed job"
          subtitle="Last 30 days, each step as a share of the one before"
          takeaway="12 jobs won from 2,960 search appearances; nearly every request received a quote."
          table={{
            caption: 'Funnel from search appearance to job won',
            columns: ['Step', 'Count', 'Rate from previous step'],
            rows: KS_FUNNEL.map((s, i) => [
              s.label,
              count(s.value),
              i ? KS_FUNNEL_RATES[i - 1]! : '—',
            ]),
          }}
        >
          <FunnelBars
            steps={KS_FUNNEL}
            format={count}
            rateLabels={KS_FUNNEL_RATES}
            ariaLabel="Funnel from search appearances to jobs won"
          />
        </ChartFigure>

        <ChartFigure
          title="Against your category"
          subtitle="Premium · market benchmarking"
          takeaway="Win rate 7 points above the category average; responses 3.3 hours faster."
          footnote="Category average across verified Welding suppliers on the platform, anonymised."
          table={{
            caption: 'Your figures against the category average',
            columns: ['Measure', 'You', 'Category average'],
            rows: [
              ['Win rate', '34%', '27%'],
              ['Average response', '2.1 hrs', '5.4 hrs'],
            ],
          }}
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[12.5px] font-semibold text-ink">Win rate</p>
              <BenchmarkBar
                value={34}
                benchmark={27}
                max={50}
                format={(n) => `${n}%`}
                ariaLabel="Win rate 34%, category average 27%"
              />
              <p className="mt-2 text-[12.5px] text-ink-soft">
                7 points above the category average
              </p>
            </div>
            <div>
              <p className="mb-2 text-[12.5px] font-semibold text-ink">Average response</p>
              <BenchmarkBar
                value={2.1}
                benchmark={5.4}
                max={8}
                lowerIsBetter
                format={(n) => `${n} hrs`}
                ariaLabel="Average response 2.1 hours, category average 5.4 hours"
              />
              <p className="mt-2 text-[12.5px] text-ink-soft">
                3.3 hrs faster than the category average
              </p>
            </div>
          </div>
        </ChartFigure>

        <ChartFigure
          title="Where clients found you"
          subtitle="Profile views by source, last 30 days"
          takeaway="Marketplace search brought 41% of profile views; the promoted placement 17%."
          table={{
            caption: 'Profile views by source',
            columns: ['Source', 'Views', 'Share'],
            rows: KS_SOURCES.map((s) => [s.label, count(s.value), share(s.value)]),
          }}
        >
          <HBarList
            rows={KS_SOURCES.map((s) => ({ ...s, valueLabel: `${s.value} · ${share(s.value)}` }))}
            format={count}
            ariaLabel="Profile views by source"
          />
        </ChartFigure>

        <ChartFigure
          title="Ratings"
          subtitle="All time"
          takeaway="4.4 stars from 72 ratings; 42 of them five stars."
          headline={<Rating rating={4.4} count={72} />}
          table={{
            caption: 'Ratings by stars',
            columns: ['Stars', 'Ratings'],
            rows: KS_RATINGS.map((c, i) => [`${5 - i} ★`, count(c)]),
          }}
        >
          <HBarList
            rows={KS_RATINGS.map((c, i) => ({
              id: `r${5 - i}`,
              label: `${5 - i} ★`,
              value: c,
            }))}
            format={(n) => plural(n, 'rating', 'ratings')}
            ariaLabel={`Ratings by stars, ${ratingsTotal} in all`}
          />
        </ChartFigure>

        <ChartFigure
          title="When requests arrive"
          subtitle="Quote requests by weekday and time of day, last 30 days"
          takeaway="Requests cluster on weekday mornings, peaking on Tuesday between 08:00 and 10:00."
          table={{
            caption: 'Quote requests by weekday and two-hour block',
            columns: ['Day', ...KS_HOURS],
            rows: KS_WEEKDAY_ROWS.map((d, r) => [d, ...KS_HEAT[r]!.map(String)]),
          }}
        >
          <Heatmap
            rows={KS_WEEKDAY_ROWS}
            cols={KS_HOURS}
            values={KS_HEAT}
            bins={[0, 1, 2, 3, 5]}
            cellLabel={(row, col, v) =>
              `${KS_DAY_NAMES[row] ?? row} ${col.replace('–', ':00–')}:00 · ${plural(v, 'request', 'requests')}`
            }
            ariaLabel="Quote requests by weekday and two-hour block"
          />
        </ChartFigure>

        <ChartFigure
          title="Searches that found you"
          subtitle="Top five search terms, last 30 days"
          takeaway="“coded welder aberdeen” surfaced the profile most often, 64 times."
          table={{
            caption: 'Search terms that surfaced the profile',
            columns: ['Search term', 'Searches'],
            rows: KS_SEARCHES.map((s) => [s.term, count(s.count)]),
          }}
        >
          <HBarList
            rows={KS_SEARCHES.map((s) => ({ id: s.term, label: s.term, value: s.count }))}
            format={count}
            ariaLabel="Search terms that surfaced the profile"
          />
        </ChartFigure>

        <ChartFigure
          title="Certificates"
          subtitle="Days left on each certificate, 0–180 day scale"
          takeaway="One certificate lapsed, one due within 30 days, one awaiting review."
          footnote="Alerts fire at 90, 30 and 7 days before expiry."
          table={{
            caption: 'Certificates and days left',
            columns: ['Certificate', 'Expires', 'Days left'],
            rows: KS_CERTS.map((c) => [
              c.name,
              c.expires,
              c.state === 'lapsed' ? 'Lapsed' : c.daysLeft === null ? '—' : count(c.daysLeft),
            ]),
          }}
        >
          <ul className="space-y-3">
            {KS_CERTS.map((c, i) => (
              <li key={c.name}>
                <p className="mb-1 flex flex-wrap justify-between gap-x-3 text-[12.5px]">
                  <span className="font-semibold text-ink">{c.name}</span>
                  <span className="text-ink-soft">{c.expires}</span>
                </p>
                <ExpiryBar
                  daysLeft={c.daysLeft}
                  state={c.state}
                  scale={i === 0}
                  label={`${c.name}: ${
                    c.state === 'lapsed'
                      ? 'lapsed'
                      : c.daysLeft === null
                        ? 'no dates yet'
                        : `${c.daysLeft} days left`
                  }`}
                />
              </li>
            ))}
          </ul>
        </ChartFigure>
      </div>
    </section>
  );
}
