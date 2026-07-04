import { useState } from 'react';
import { Button, ButtonLink } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { CertChip } from '../components/ui/CertChip';
import { Chip } from '../components/ui/Chip';
import { Drawer } from '../components/ui/Drawer';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Modal } from '../components/ui/Modal';
import { BetaPill, Pill, StatusPill } from '../components/ui/Pill';
import { StatCard } from '../components/ui/StatCard';
import { Toggle } from '../components/ui/Toggle';
import { Loader } from '../components/motif/Loader';
import { PillarsRoof } from '../components/motif/PillarsRoof';
import { session } from '../lib/storage';
import { useApp } from '../store/app';

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
    { label: 'Procure', on: pillars[3] ?? false },
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
          <Pill tone="info">GA vessel profile loaded</Pill>
          <Pill tone="neutral">Neutral</Pill>
          <span>
            Nav item
            <BetaPill />
          </span>
          <StatusPill status="verified" />
          <StatusPill status="renewal-due" />
          <StatusPill status="blocked" />
        </div>
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
