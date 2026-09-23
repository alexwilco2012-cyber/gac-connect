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
} from '../components/charts';
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
import {
  HOUR_BLOCK_NAMES,
  HOUR_BLOCKS,
  PERIOD_SUMMARY,
  RATINGS_DISTRIBUTION,
  WEEKDAY_NAMES,
  WEEKDAYS,
  funnelRateLabels,
  seriesFor,
  weeklySums,
  type Period,
} from '../data/analytics';
import { LINE_LABELS, SPEND_MONTHS } from '../data/clientDesk';
import { ANALYTICS_EXAMPLE } from '../data/plans';
import { EARNINGS_MONTHS, EARNINGS_WON, SUPPLIER_KPIS } from '../data/supplierDesk';
import { monthlySaving, spendSeries } from '../lib/clientDesk';
import { supplierKeeps } from '../lib/commission';
import { compactGbp, gbp } from '../lib/format';
import { session } from '../lib/storage';
import { tierPct } from '../lib/tier';
import { useApp } from '../store/app';

/*
 * The chart gallery draws the seeded data the product screens draw
 * (src/data), through the same rules (lib/clientDesk, lib/commission), so a
 * figure here always matches its screen. Only the certificate rows below are
 * the gallery's own: one row per bar state, which no single supplier has.
 */

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

/** The lines the gallery's chips switch; Procurement is held at any tier. */
const LINE_SWITCHES = ['agency', 'logistics', 'customs'] as const;

const plural = (n: number, one: string, many: string) =>
  `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;

/**
 * Hidden component gallery for design review (05 §E2). Not linked from nav.
 * It sits outside both layouts, so it sets the app face (`font-app`) itself:
 * the charts size their gutters for Inter and should be reviewed in it.
 */
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
    <main className="screen-enter mx-auto max-w-[1180px] px-6 py-10 font-app">
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
          {ANALYTICS_EXAMPLE.map((a) => (
            <StatCard key={a.label} label={a.label} value={a.value} barPct={a.barPct} />
          ))}
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
 * Charts (live dashboards spec §6): every component in the kit, drawing the
 * product's seeded figures. Hover, tab to a plot and use the arrow keys, or
 * tap and drag on a phone. The period switch and the line chips show the
 * frame holding still and colours following the line, never its rank.
 */
function ChartsGallery() {
  const [period, setPeriod] = useState<Period>(30);
  const [held, setHeld] = useState({ agency: true, logistics: true, customs: false });
  const count = (n: number) => n.toLocaleString('en-GB');

  // Views and quote requests: the analytics screen's series for the period.
  const trend = seriesFor(period);
  const weekly = period === 90;
  const totals = PERIOD_SUMMARY[period];
  const weeklyViews = weeklySums(trend.views);

  // Everything else is the 30-day summary, as its subtitles say.
  const month = PERIOD_SUMMARY[30];
  const funnelRates = funnelRateLabels(month.funnel);
  const sourcesTotal = month.sources.reduce((a, r) => a + r.value, 0);
  const share = (v: number) => `${Math.round((v / sourcesTotal) * 100)}%`;
  const topSource = month.sources[0]!;
  const promoted = month.sources.find((r) => r.promoted);
  const ratingsTotal = RATINGS_DISTRIBUTION.reduce((a, r) => a + r.count, 0);
  const ratingsMean =
    Math.round(
      (RATINGS_DISTRIBUTION.reduce((a, r) => a + r.stars * r.count, 0) / ratingsTotal) * 10,
    ) / 10;
  const winLead = month.winRate - month.categoryWinRate;
  const faster = (month.categoryResponseHrs - month.responseHrs).toFixed(1);

  // GAC spend by line, colour fixed to the line (the client view's own rules).
  const pct = tierPct(held);
  const spend = spendSeries(held).map((s) => ({ ...s, color: LINE_COLOURS[s.id] }));
  const saved = monthlySaving(held);
  const monthTotals = SPEND_MONTHS.map((_, i) => spend.reduce((a, s) => a + (s.values[i] ?? 0), 0));
  const spendTotal = monthTotals.reduce((a, b) => a + b, 0);
  const savedTotal = saved.reduce((a, b) => a + b, 0);
  const spendLegend: LegendItem[] = spend.map((s) => ({ label: s.label, color: s.color }));

  // Earnings (supplier view only)
  const kept = EARNINGS_WON.map((w) => supplierKeeps(w, 'premium'));
  const band = EARNINGS_WON.map((w, i) => w - kept[i]!);
  const wonTotal = EARNINGS_WON.reduce((a, b) => a + b, 0);
  const keptTotal = kept.reduce((a, b) => a + b, 0);

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-bold">Charts</h2>
      <p className="mt-1 mb-4 max-w-[720px] text-[13px] text-ink-soft">
        Hand-rolled SVG and HTML, no chart library. Hover a plot, tab to it and use the arrow keys,
        or tap and drag on a phone. Figures are illustrative.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SUPPLIER_KPIS.map((k) => (
          <StatCard
            key={k.id}
            label={k.label}
            value={k.value}
            delta={k.delta}
            deltaTone={k.id === 'win' ? 'info' : 'success'}
            series={k.series}
          />
        ))}
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
        <ChartFigure
          className="lg:col-span-2"
          title="Views and quote requests"
          subtitle={`Last ${period} days · ${weekly ? 'views per day, requests per week' : 'views and requests per day'}`}
          takeaway={`${count(totals.views)} profile views and ${count(totals.requests)} quote requests in the last ${period} days, with views running above the category average on most weekdays.`}
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
            weekly
              ? {
                  caption: 'Profile views and quote requests per week',
                  columns: ['Week', 'Profile views', 'Quote requests'],
                  rows: trend.requestLabels.map((week, k) => [
                    week,
                    count(weeklyViews[k] ?? 0),
                    count(trend.requests[k] ?? 0),
                  ]),
                }
              : {
                  caption: 'Profile views, category average and quote requests per day',
                  columns: ['Day', 'Profile views', 'Category average', 'Quote requests'],
                  rows: trend.labels.map((day, i) => [
                    day,
                    count(trend.views[i] ?? 0),
                    (trend.category[i] ?? 0).toFixed(1),
                    count(trend.requests[i] ?? 0),
                  ]),
                }
          }
        >
          <TimeSeriesPanels
            labels={trend.labels}
            ariaLabel={`Profile views and quote requests, last ${period} days`}
            panels={[
              {
                id: 'views',
                label: 'Profile views per day',
                kind: 'area',
                values: trend.views,
                format: count,
                benchmark: { label: 'Category average', values: trend.category },
              },
              {
                id: 'requests',
                label: weekly ? 'Quote requests per week' : 'Quote requests per day',
                kind: 'columns',
                values: trend.requests,
                format: count,
                ...(weekly ? { binLabels: trend.requestLabels } : {}),
              },
            ]}
          />
        </ChartFigure>

        <ChartFigure
          title="GAC spend, last six months"
          subtitle="By service line, with what your tier discount saved underneath"
          takeaway={`${gbp(spendTotal)} across ${spend.length} service lines since April; ${
            pct > 0 ? `the ${pct}% tier discount saved ${gbp(savedTotal)}` : 'no tier discount held'
          }.`}
          headline={
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span className="font-display text-[22px] leading-none font-bold">
                {gbp(spendTotal)}
              </span>
              <span className="text-[13px] text-ink-soft">
                {pct > 0 ? `${gbp(savedTotal)} saved at ${pct}%` : 'No tier discount held yet'}
              </span>
            </p>
          }
          legend={spendLegend}
          action={
            <div role="group" aria-label="Lines held" className="flex flex-wrap gap-1.5">
              {LINE_SWITCHES.map((id) => (
                <Chip
                  key={id}
                  pressed={held[id]}
                  onClick={() => setHeld((h) => ({ ...h, [id]: !h[id] }))}
                >
                  {LINE_LABELS[id]}
                </Chip>
              ))}
            </div>
          }
          footnote="Illustrative figures. The chart follows the lines held in the tier card above."
          table={{
            caption: 'GAC spend by service line and tier saving per month',
            columns: ['Month', ...spend.map((s) => s.label), 'Total', 'Saved'],
            rows: SPEND_MONTHS.map((m, i) => [
              m,
              ...spend.map((s) => gbp(s.values[i] ?? 0)),
              gbp(monthTotals[i] ?? 0),
              gbp(saved[i] ?? 0),
            ]),
          }}
        >
          <StackedColumns
            categories={[...SPEND_MONTHS]}
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
            rows: EARNINGS_MONTHS.map((m, i) => [
              m,
              gbp(EARNINGS_WON[i] ?? 0),
              gbp(band[i] ?? 0),
              gbp(kept[i] ?? 0),
            ]),
          }}
        >
          <StackedColumns
            categories={[...EARNINGS_MONTHS]}
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
          takeaway={`${count(month.won)} jobs won from ${count(month.funnel[0]?.value ?? 0)} search appearances; ${Math.round((month.quoted / month.requests) * 100)}% of requests received a quote.`}
          table={{
            caption: 'Funnel from search appearance to job won',
            columns: ['Step', 'Count', 'Rate from previous step'],
            rows: month.funnel.map((s, i) => [
              s.label,
              count(s.value),
              i ? (funnelRates[i - 1] ?? '') : '—',
            ]),
          }}
        >
          <FunnelBars
            steps={month.funnel}
            format={count}
            rateLabels={funnelRates}
            ariaLabel="Funnel from search appearances to jobs won"
          />
        </ChartFigure>

        <ChartFigure
          title="Against your category"
          subtitle="Premium · market benchmarking"
          takeaway={`Win rate ${winLead} points above the category average; responses ${faster} hours faster.`}
          footnote="Category average across verified Welding suppliers on the platform, anonymised."
          table={{
            caption: 'Your figures against the category average',
            columns: ['Measure', 'You', 'Category average'],
            rows: [
              ['Win rate', `${month.winRate}%`, `${month.categoryWinRate}%`],
              ['Average response', `${month.responseHrs} hrs`, `${month.categoryResponseHrs} hrs`],
            ],
          }}
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[12.5px] font-semibold text-ink">Win rate</p>
              <BenchmarkBar
                value={month.winRate}
                benchmark={month.categoryWinRate}
                max={50}
                format={(n) => `${n}%`}
                ariaLabel={`Win rate ${month.winRate}%, category average ${month.categoryWinRate}%`}
              />
              <p className="mt-2 text-[12.5px] text-ink-soft">
                {winLead} points above the category average
              </p>
            </div>
            <div>
              <p className="mb-2 text-[12.5px] font-semibold text-ink">Average response</p>
              <BenchmarkBar
                value={month.responseHrs}
                benchmark={month.categoryResponseHrs}
                max={8}
                lowerIsBetter
                format={(n) => `${n} hrs`}
                ariaLabel={`Average response ${month.responseHrs} hours, category average ${month.categoryResponseHrs} hours`}
              />
              <p className="mt-2 text-[12.5px] text-ink-soft">
                {faster} hrs faster than the category average
              </p>
            </div>
          </div>
        </ChartFigure>

        <ChartFigure
          title="Where clients found you"
          subtitle="Profile views by source, last 30 days"
          takeaway={`${topSource.label} brought ${share(topSource.value)} of profile views${
            promoted ? `; the promoted placement ${share(promoted.value)}` : ''
          }.`}
          table={{
            caption: 'Profile views by source',
            columns: ['Source', 'Views', 'Share'],
            rows: month.sources.map((s) => [s.label, count(s.value), share(s.value)]),
          }}
        >
          <HBarList
            rows={month.sources.map((s) => ({
              id: s.label,
              label: s.label,
              value: s.value,
              valueLabel: `${count(s.value)} · ${share(s.value)}`,
              ...(s.promoted ? { tag: '▲ Promoted' } : {}),
              ...(s.other ? { color: VIZ.other } : {}),
            }))}
            format={count}
            ariaLabel="Profile views by source"
          />
        </ChartFigure>

        <ChartFigure
          title="Ratings"
          subtitle="All time"
          takeaway={`${ratingsMean} stars from ${ratingsTotal} ratings; ${RATINGS_DISTRIBUTION.find((r) => r.stars === 5)?.count ?? 0} of them five stars.`}
          headline={<Rating rating={ratingsMean} count={ratingsTotal} />}
          table={{
            caption: 'Ratings by stars',
            columns: ['Stars', 'Ratings'],
            rows: RATINGS_DISTRIBUTION.map((r) => [`${r.stars} ★`, count(r.count)]),
          }}
        >
          <HBarList
            rows={RATINGS_DISTRIBUTION.map((r) => ({
              id: `r${r.stars}`,
              label: `${r.stars} ★`,
              value: r.count,
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
            columns: ['Day', ...HOUR_BLOCKS],
            rows: month.heatmap.map((row, r) => [WEEKDAYS[r] ?? '', ...row.map(String)]),
          }}
        >
          <Heatmap
            rows={[...WEEKDAYS]}
            cols={[...HOUR_BLOCKS]}
            values={month.heatmap}
            bins={[0, 1, 2, 3, 5]}
            cellLabel={(row, col, v) =>
              `${WEEKDAY_NAMES[WEEKDAYS.indexOf(row)] ?? row} ${HOUR_BLOCK_NAMES[HOUR_BLOCKS.indexOf(col)] ?? col} · ${plural(v, 'request', 'requests')}`
            }
            ariaLabel="Quote requests by weekday and two-hour block"
          />
        </ChartFigure>

        <ChartFigure
          title="Searches that found you"
          subtitle="Top five search terms, last 30 days"
          takeaway={`“${month.searches[0]?.term ?? ''}” surfaced the profile most often, ${count(month.searches[0]?.count ?? 0)} times.`}
          table={{
            caption: 'Search terms that surfaced the profile',
            columns: ['Search term', 'Searches'],
            rows: month.searches.map((s) => [s.term, count(s.count)]),
          }}
        >
          <HBarList
            rows={month.searches.map((s) => ({ id: s.term, label: s.term, value: s.count }))}
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
