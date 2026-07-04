import { Link, useRouteError } from 'react-router-dom';
import { BRAND_NAME } from '../../config/brand';

/** Branded router-level error fallback (04_ARCHITECTURE §robustness). */
export function RouteErrorBoundary() {
  const error = useRouteError();
  const detail = error instanceof Error ? error.message : undefined;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-4 px-6">
      <p className="font-display text-xs font-bold tracking-[0.22em] uppercase text-sea">
        {BRAND_NAME}
      </p>
      <h1 className="font-display text-2xl font-bold">Something broke.</h1>
      <p className="text-ink-soft">
        Refresh the page, or head back to the dashboard. Nothing you were working on is lost — this
        is a proof of concept running entirely in your browser.
      </p>
      {detail ? <p className="text-sm text-ink-soft">Detail: {detail}</p> : null}
      <Link
        to="/app"
        className="rounded-lg bg-sea px-4 py-2 text-sm font-bold text-white hover:bg-[#0B4C70]"
      >
        Back to the dashboard
      </Link>
    </main>
  );
}
