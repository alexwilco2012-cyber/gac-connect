import { NavLink, Outlet } from 'react-router-dom';
import { POC_RIBBON } from '../../config/brand';
import { Tour } from '../../tour/Tour';
import { Loader } from '../motif/Loader';
import { BetaPill } from '../ui/Pill';
import { Wordmark } from './Wordmark';

const NAV = [
  { to: '/app', label: 'Dashboard', end: true },
  { to: '/app/marketplace', label: 'Marketplace' },
  { to: '/app/quotes', label: 'Quotes' },
  { to: '/app/tiers', label: 'Tier Calculator' },
  { to: '/app/svs', label: 'SVS' },
  { to: '/app/certification', label: 'Certification', beta: true },
  { to: '/app/bunkers', label: 'Bunkers', beta: true },
];

export default function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Loader />
      <Tour />
      <a
        href="#app-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-bold"
      >
        Skip to content
      </a>
      <div className="border-b border-[#EADFB4] bg-gold-soft px-3 py-1.5 text-center text-[12.5px] font-semibold tracking-[0.02em] text-gold-deep">
        {POC_RIBBON}
      </div>
      <header className="sticky top-0 z-50 bg-ink text-white">
        <div className="mx-auto flex h-[58px] max-w-[1180px] items-center gap-5 px-4 sm:px-6">
          <Wordmark />
          <nav aria-label="Platform" className="flex flex-1 gap-0.5 overflow-x-auto">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-[13.5px] font-semibold whitespace-nowrap no-underline transition-colors ${
                    isActive
                      ? 'bg-white/14 text-white shadow-[inset_0_-3px_0_var(--gold)]'
                      : 'text-[#B9C8D6] hover:bg-white/8 hover:text-white'
                  }`
                }
              >
                {item.label}
                {item.beta ? <BetaPill /> : null}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2.5 text-[13px] text-[#C9D6E2] lg:flex">
            <span>A. Fraser · Aberdeen Agency</span>
            <span
              aria-hidden="true"
              className="grid h-8 w-8 place-items-center rounded-full bg-gold text-[13px] font-extrabold text-ink"
            >
              AF
            </span>
          </div>
        </div>
      </header>

      <main id="app-main" className="mx-auto w-full max-w-[1180px] flex-1 px-4 pt-7 pb-20 sm:px-6">
        <Outlet />
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-[1180px] px-6 py-5 text-[12px] text-ink-soft">
          Proof of concept. All suppliers, vessels, clients, prices, and data on this page are
          illustrative. Beta tabs preview future directions outside the current scope.
        </div>
      </footer>
    </div>
  );
}
