import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BRAND_MARK, POC_RIBBON } from '../../config/brand';
import { useNeedsYou } from '../../lib/needsYou';
import { persistent } from '../../lib/storage';
import { useFocusTrap } from '../../lib/useFocusTrap';
import { useApp } from '../../store/app';
import { Tour, TourPrompt } from '../../tour/Tour';
import { Loader } from '../motif/Loader';
import { Icon, type IconName } from '../ui/Icon';
import { Pill } from '../ui/Pill';
import { Wordmark } from './Wordmark';

/**
 * Platform shell (dashboard restyle, 25 Aug): grouped left sidebar plus a
 * light top bar, replacing the horizontal tab strip. Eleven items never fit a
 * tab row at 1280 — the sidebar groups them the way the business reads:
 * the four lines GAC sells and invoices, the spine every line runs through
 * (find, compare, pay), then the commercial and compliance views. Customs
 * keeps its own entry so the 2 / 4 / 7 tier reads straight off the nav.
 *
 * Marketplace leads (26 Aug): this platform is a marketplace first and a workflow
 * second, so the directory is the first item and the front door, and Dashboard
 * — now the client and supplier view — sits under it. Internal is pinned to the
 * foot of the column, below a rule and out of the client's reading path,
 * because the agent desk is the one part of this nav a client or a supplier
 * would never open.
 *
 * The chrome is real, not decorative: search routes to the marketplace, the
 * bell is fed by the same data as the dashboard's feed, and the avatar
 * offers the persona, the calculator and the tour. Everything survives
 * being poked — that is the demo's whole trick.
 */
interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

const NAV_GROUPS: { heading: string | null; items: NavItem[] }[] = [
  {
    heading: null,
    items: [
      { to: '/app/marketplace', label: 'Marketplace', icon: 'store' },
      { to: '/app/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    ],
  },
  {
    heading: 'Service lines',
    items: [
      { to: '/app/agency', label: 'Agency', icon: 'anchor' },
      { to: '/app/logistics', label: 'Logistics', icon: 'truck' },
      { to: '/app/customs', label: 'Customs', icon: 'stamp' },
      { to: '/app/procurement', label: 'Procurement', icon: 'clipboard-list' },
    ],
  },
  {
    heading: 'Work',
    items: [
      { to: '/app/quotes', label: 'Quotes', icon: 'message-square-quote' },
      { to: '/app/invoices', label: 'Invoices', icon: 'receipt' },
    ],
  },
  {
    heading: 'Commercial',
    items: [
      { to: '/app/svs', label: 'SVS', icon: 'shield-check' },
      { to: '/app/tiers', label: 'Tiers', icon: 'layers' },
    ],
  },
];

/** The agent desk. Kept out of NAV_GROUPS so it renders at the foot of the
 *  column, after the spacer, rather than in the reading order above it. */
const INTERNAL_ITEM: NavItem = { to: '/app/internal', label: 'Internal', icon: 'briefcase' };

function SidebarLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `flex min-h-11 items-center gap-3 rounded-lg py-2.5 text-[13.5px] font-semibold no-underline transition-colors ${
          collapsed ? 'justify-center px-0' : 'px-3'
        } ${
          isActive
            ? 'bg-white/10 text-white shadow-[inset_3px_0_0_var(--gold)]'
            : 'text-[#B9C8D6] hover:bg-white/8 hover:text-white'
        }`
      }
    >
      <Icon name={item.icon} size={18} className="shrink-0" />
      <span className={collapsed ? 'sr-only' : undefined}>{item.label}</span>
    </NavLink>
  );
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav aria-label="Platform" className="flex flex-1 flex-col overflow-y-auto px-2.5 pb-4">
      {NAV_GROUPS.map((group, gi) => (
        <div key={group.heading ?? 'pinned'}>
          {group.heading ? (
            collapsed ? (
              <div aria-hidden="true" className="mx-2 my-3 h-px bg-white/10" />
            ) : (
              <p className="mt-5 mb-1.5 px-3 text-[10.5px] font-bold tracking-[0.14em] text-white/[0.62] uppercase">
                {group.heading}
              </p>
            )
          ) : (
            gi === 0 && <div className="mt-2" />
          )}
          <ul className="m-0 list-none space-y-0.5 p-0">
            {group.items.map((item) => (
              <li key={item.to}>
                <SidebarLink item={item} collapsed={collapsed} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* The agent desk, pushed to the foot of the column. `mt-auto` needs a
          minimum gap of its own: on a short viewport the nav scrolls and the
          two blocks would otherwise touch. */}
      <div className="mt-auto pt-6">
        <div aria-hidden="true" className="mx-2 mb-2 h-px bg-white/10" />
        {collapsed ? null : (
          <p className="mb-1.5 px-3 text-[10.5px] font-bold tracking-[0.14em] text-white/[0.62] uppercase">
            GAC only
          </p>
        )}
        <ul className="m-0 list-none p-0">
          <li>
            <SidebarLink item={INTERNAL_ITEM} collapsed={collapsed} onNavigate={onNavigate} />
          </li>
        </ul>
      </div>
    </nav>
  );
}

/** Top-bar bell: fed by the same hook as the dashboard feed, so the badge
 *  and the feed can never disagree. Disclosure pattern — Escape or an
 *  outside click closes it. */
function BellMenu() {
  const items = useNeedsYou();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Escape handled on the wrapper, not the document: it only fires with focus
  // inside the menu, restores focus to the trigger, and never reaches the
  // Tour's document-level handler (which would dismiss the walkthrough).
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
      btnRef.current?.focus();
    }
  }

  const actionable = items.filter((i) => i.actionable);
  const badge = actionable.reduce((n, i) => n + i.count, 0);

  return (
    <div ref={ref} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="bell-panel"
        aria-label={`Notifications${badge > 0 ? ` (${badge})` : ''}`}
        className="relative grid h-11 w-11 cursor-pointer place-items-center rounded-lg border-none bg-transparent text-ink-soft transition-colors hover:bg-sea-soft hover:text-ink"
      >
        <Icon name="bell" size={19} />
        {badge > 0 ? (
          <span
            aria-hidden="true"
            className="absolute top-0.5 right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white"
          >
            {badge > 9 ? '9+' : badge}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          id="bell-panel"
          aria-label="Notifications"
          className="absolute top-[calc(100%+8px)] right-0 z-[60] w-[330px] max-w-[88vw] rounded-brand border border-line bg-white p-2 shadow-[0_12px_40px_rgba(10,37,64,0.14)]"
        >
          <p className="px-2.5 pt-1.5 pb-2 text-[11px] font-bold tracking-[0.1em] text-ink-soft uppercase">
            Needs you
          </p>
          {actionable.length === 0 ? (
            <p className="flex items-center gap-2 px-2.5 pb-2 text-[13px] text-ink-soft">
              <Icon name="circle-check" size={16} className="text-success" />
              All clear — nothing needs you.
            </p>
          ) : (
            <ul className="m-0 list-none space-y-0.5 p-0">
              {actionable.map((item) => (
                <li key={item.id}>
                  <NavLink
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 no-underline transition-colors hover:bg-sea-soft"
                  >
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-sea-soft text-sea">
                      <Icon name={item.icon} size={15} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-ink">
                        {item.headline}
                      </span>
                      {item.chip ? (
                        <span className="mt-1 block">
                          <Pill tone={item.chip.tone}>{item.chip.label}</Pill>
                        </span>
                      ) : null}
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Avatar menu: the demo persona, the calculator, and the tour. */
function AvatarMenu() {
  const startTour = useApp((s) => s.startTour);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
      btnRef.current?.focus();
    }
  }

  return (
    <div ref={ref} className="relative" onKeyDown={onKeyDown}>
      {/* 44px hit area around the 32px visual circle (02: touch targets). */}
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="avatar-panel"
        aria-label="Account"
        className="grid h-11 w-11 cursor-pointer place-items-center border-none bg-transparent p-0"
      >
        <span
          aria-hidden="true"
          className="grid h-8 w-8 place-items-center rounded-full bg-gold text-[13px] font-bold text-ink"
        >
          AW
        </span>
      </button>
      {open ? (
        <div
          id="avatar-panel"
          aria-label="Account"
          className="absolute top-[calc(100%+10px)] right-0 z-[60] w-[240px] rounded-brand border border-line bg-white p-2 shadow-[0_12px_40px_rgba(10,37,64,0.14)]"
        >
          <div className="px-2.5 pt-1.5 pb-2.5">
            <p className="text-[13.5px] font-bold">A. Wilkinson</p>
            <p className="mt-0.5 text-[12px] text-ink-soft">Aberdeen Agency · demo persona</p>
          </div>
          <div className="mx-1 h-px bg-line" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              startTour();
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none bg-transparent px-2.5 py-2 text-left text-[13px] font-semibold text-ink transition-colors hover:bg-sea-soft"
          >
            <Icon name="chevron-right" size={15} className="text-sea" />
            Take the guided tour
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/app/tiers');
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none bg-transparent px-2.5 py-2 text-left text-[13px] font-semibold text-ink transition-colors hover:bg-sea-soft"
          >
            <Icon name="layers" size={15} className="text-sea" />
            Tier Calculator
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => persistent.get('sidebarCollapsed', false));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const drawerRef = useFocusTrap<HTMLElement>(drawerOpen, () => setDrawerOpen(false));

  function toggleCollapsed() {
    setCollapsed((c) => {
      persistent.set('sidebarCollapsed', !c);
      return !c;
    });
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    navigate(q ? `/app/marketplace?q=${encodeURIComponent(q)}` : '/app/marketplace');
    // The box hands off; it does not mirror the marketplace filter.
    setSearch('');
  }

  return (
    // App-shell scroll model: the page never scrolls — the main column does.
    // A window-scrolled sticky sidebar pokes past the viewport by the ribbon's
    // height and clips its own Collapse control; this way the sidebar is always
    // whole, and the PoC ribbon (a guardrail) is permanently on screen.
    <div className="flex h-dvh flex-col font-app">
      <Loader />
      <Tour />
      <a
        href="#app-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-bold"
      >
        Skip to content
      </a>
      <div className="shrink-0 border-b border-[#EADFB4] bg-gold-soft px-3 py-1.5 text-center text-[12.5px] font-semibold tracking-[0.02em] text-gold-deep">
        {POC_RIBBON}
      </div>

      <div className="flex min-h-0 flex-1 items-stretch">
        {/* Sidebar — desktop only; the drawer below covers small screens */}
        <aside
          className={`sidebar-dark hidden h-full shrink-0 flex-col bg-gradient-to-b from-ink to-[#06132B] text-white transition-[width] duration-200 lg:flex ${
            collapsed ? 'w-16' : 'w-[232px]'
          }`}
        >
          <div className={`flex h-[58px] items-center ${collapsed ? 'justify-center' : 'px-4.5'}`}>
            {collapsed ? (
              <NavLink
                to="/"
                className="font-display text-[15px] font-bold tracking-[0.08em] text-white no-underline"
              >
                {BRAND_MARK.toUpperCase()}
              </NavLink>
            ) : (
              <Wordmark />
            )}
          </div>
          <SidebarNav collapsed={collapsed} />
          <div className="border-t border-white/10 p-2.5">
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-transparent px-3 py-2 text-[12.5px] font-semibold text-[#B9C8D6] transition-colors hover:bg-white/8 hover:text-white"
            >
              <Icon
                name="chevrons-left"
                size={16}
                className={`transition-transform ${collapsed ? 'rotate-180' : ''}`}
              />
              {collapsed ? null : 'Collapse'}
            </button>
          </div>
        </aside>

        <div id="app-scroll" className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur">
            <div className="flex h-[58px] items-center gap-2.5 px-4 sm:px-6">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation"
                className="grid h-11 w-11 cursor-pointer place-items-center rounded-lg border-none bg-transparent text-ink-soft transition-colors hover:bg-sea-soft hover:text-ink lg:hidden"
              >
                <Icon name="menu" size={20} />
              </button>
              <span className="lg:hidden">
                <Wordmark dark={false} />
              </span>
              <form role="search" onSubmit={submitSearch} className="hidden md:block">
                <label htmlFor="topbar-search" className="sr-only">
                  Search platform
                </label>
                <div className="relative">
                  <Icon
                    name="search"
                    size={15}
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft"
                  />
                  <input
                    id="topbar-search"
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search suppliers and services"
                    className="min-h-[44px] w-[min(320px,30vw)] rounded-lg border-[1.5px] border-line-strong bg-paper pr-3 pl-9 text-[13px] text-ink placeholder:text-ink-soft"
                  />
                </div>
              </form>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => navigate('/app/marketplace')}
                aria-label="Search the marketplace"
                className="grid h-11 w-11 cursor-pointer place-items-center rounded-lg border-none bg-transparent text-ink-soft transition-colors hover:bg-sea-soft hover:text-ink md:hidden"
              >
                <Icon name="search" size={19} />
              </button>
              <BellMenu />
              <span className="hidden text-[13px] text-ink-soft xl:inline">
                A. Wilkinson · Aberdeen Agency
              </span>
              <AvatarMenu />
            </div>
          </header>

          <main
            id="app-main"
            className="mx-auto w-full max-w-[1180px] flex-1 px-4 pt-7 pb-20 sm:px-6"
          >
            {/* Above the outlet, so someone arriving from the QR is offered the
                walkthrough on whatever screen they land on. */}
            <TourPrompt />
            <Outlet />
          </main>

          <footer className="border-t border-line">
            <div className="mx-auto max-w-[1180px] px-6 py-5 text-[12px] text-ink-soft">
              Proof of concept. All suppliers, vessels, clients, prices, and data on this page are
              illustrative. Beta screens preview future directions outside the current scope.
            </div>
          </footer>
        </div>
      </div>

      {/* Off-canvas navigation for small screens — rendered only while open,
          like the Drawer, so nothing off-canvas leaks focus or scroll width. */}
      {drawerOpen ? (
        <>
          <div
            className="fixed inset-0 z-[75] bg-ink/30 lg:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Platform navigation"
            className="sidebar-dark fixed top-0 left-0 z-[80] flex h-dvh w-[264px] max-w-[85vw] animate-[drawer-in-left_0.25s_ease] flex-col bg-gradient-to-b from-ink to-[#06132B] text-white lg:hidden"
          >
            <div className="flex h-[58px] items-center justify-between px-4.5">
              <Wordmark />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
                className="grid h-11 w-11 cursor-pointer place-items-center rounded-lg border-none bg-transparent text-[#B9C8D6] hover:text-white"
              >
                <Icon name="x" size={18} />
              </button>
            </div>
            <SidebarNav collapsed={false} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </>
      ) : null}
    </div>
  );
}
