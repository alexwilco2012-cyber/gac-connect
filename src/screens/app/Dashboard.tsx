import { Eyebrow } from '../../components/ui/Eyebrow';
import { Icon, type IconName } from '../../components/ui/Icon';
import { DEMO_CLIENT, DEMO_SUPPLIER_ID } from '../../data/desk';
import { supplierById } from '../../data/suppliers';
import { useApp, type DashboardView } from '../../store/app';
import { ClientView } from './dashboard/ClientView';
import { StatusRow } from './dashboard/supplier/StatusRow';
import { SupplierView } from './dashboard/SupplierView';

/**
 * Dashboard — the client's and the supplier's view of the platform (26 Aug).
 *
 * The platform is a marketplace first and a workflow second, so `/app` opens on
 * the marketplace and this screen answers the question the two paying sides
 * actually arrive with: a client asks "where is my work, and what is waiting on
 * me"; a supplier asks "am I being found, and does my paperwork still hold".
 * The agent's working desk — predictive procurement, the 48-hour strip, the
 * Outlook add-in — moved to Internal, where the people it was written for work.
 *
 * One screen, two views, because the platform runs on a single demo persona and
 * a switch shows a panel both sides without inventing a login. The commercial
 * guardrail rides along with the split: commission is a supplier mechanism, so
 * the plan card exists only in the supplier view and the client view never
 * mentions it (03 §3.2 — tested, as it is on Invoices and Quotes).
 *
 * Counts come from the live stores, not from prose: book a consignment and the
 * Logistics row moves while you watch.
 *
 * The two views live in `./dashboard/` (23 Sep); this file keeps the header
 * (with the supplier's standing pills, in the supplier view) and the switch
 * between them. The personas are in `data/desk`.
 */

function ViewSwitch({
  view,
  onChange,
}: {
  view: DashboardView;
  onChange: (v: DashboardView) => void;
}) {
  const options: { id: DashboardView; label: string; icon: IconName }[] = [
    { id: 'client', label: 'Client view', icon: 'ship' },
    { id: 'supplier', label: 'Supplier view', icon: 'store' },
  ];
  return (
    <div
      role="group"
      aria-label="Dashboard view"
      data-testid="dashboard-view-switch"
      className="inline-flex rounded-lg border-[1.5px] border-line-strong bg-white p-1"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={view === o.id}
          onClick={() => onChange(o.id)}
          className={`inline-flex min-h-[38px] cursor-pointer items-center gap-2 rounded-md border-none px-3.5 py-1.5 text-[13px] font-bold transition-colors ${
            view === o.id ? 'bg-ink text-white' : 'bg-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <Icon name={o.icon} size={15} />
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const view = useApp((s) => s.dashboardView);
  const setView = useApp((s) => s.setDashboardView);
  const client = view === 'client';

  return (
    <div className="screen-enter">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow>{client ? 'Client dashboard' : 'Supplier dashboard'}</Eyebrow>
          <h1 className="mt-1 font-display text-2xl font-bold">
            {client ? DEMO_CLIENT : supplierById(DEMO_SUPPLIER_ID)!.name}
          </h1>
          <p className="mt-1 max-w-[620px] text-[14px] text-ink-soft">
            {client
              ? 'Everything GAC has running for you, and everything waiting on you. The platform itself costs you nothing.'
              : 'How you are being found, what is waiting for a quote, and whether your paperwork still holds.'}
          </p>
          {/* The supplier's standing belongs with its name: under the lede,
              above the switch when the header wraps on a phone. */}
          {client ? null : <StatusRow />}
        </div>
        <ViewSwitch view={view} onChange={setView} />
      </div>

      {client ? <ClientView /> : <SupplierView />}
    </div>
  );
}
