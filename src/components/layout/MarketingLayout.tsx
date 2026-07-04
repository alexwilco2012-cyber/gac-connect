import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BRAND_NAME, POC_FOOTER } from '../../config/brand';
import { ButtonLink } from '../ui/Button';
import { Wordmark } from './Wordmark';

const LINKS = [
  { to: '/for-clients', label: 'For clients' },
  { to: '/for-suppliers', label: 'For suppliers' },
  { to: '/about', label: 'About' },
];

export default function MarketingLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-bold"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-50 bg-ink text-white">
        <div className="mx-auto flex h-[58px] max-w-[1180px] items-center gap-6 px-6">
          <Wordmark />
          <nav aria-label="Main" className="hidden flex-1 items-center gap-1 sm:flex">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-[13.5px] font-semibold no-underline transition-colors ${
                    isActive
                      ? 'bg-white/14 text-white shadow-[inset_0_-3px_0_var(--gold)]'
                      : 'text-[#B9C8D6] hover:bg-white/8 hover:text-white'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto hidden sm:block">
            <ButtonLink to="/app" variant="gold" className="!min-h-[38px] !py-1.5">
              Explore the platform
            </ButtonLink>
          </div>
          <button
            type="button"
            className="ml-auto cursor-pointer rounded-md border border-white/25 bg-transparent px-3 py-2 text-[13px] font-bold text-white sm:hidden"
            aria-expanded={menuOpen}
            aria-controls="marketing-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? 'Close' : 'Menu'}
          </button>
        </div>
        {menuOpen ? (
          <nav
            id="marketing-menu"
            aria-label="Main"
            className="flex flex-col gap-1 border-t border-white/10 px-6 py-3 sm:hidden"
          >
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-3 py-2.5 text-[15px] font-semibold text-[#B9C8D6] no-underline hover:text-white"
              >
                {l.label}
              </NavLink>
            ))}
            <ButtonLink to="/app" variant="gold" className="mt-2">
              Explore the platform
            </ButtonLink>
          </nav>
        ) : null}
      </header>

      <div id="main" className="flex-1">
        <Outlet />
      </div>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-3 px-6 py-8 text-[12.5px] text-ink-soft">
          <Wordmark dark={false} />
          <p>
            {BRAND_NAME} · {POC_FOOTER}
          </p>
        </div>
      </footer>
    </div>
  );
}
