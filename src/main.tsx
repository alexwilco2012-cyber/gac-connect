import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes, prefetchRoutes } from './routes';
import { session } from './lib/storage';
import './styles/tokens.css';

/**
 * Deploy resilience: routes are lazy chunks with hashed names. A tab that was
 * open across a deploy still holds the old index, so its next lazy import can
 * point at a chunk that no longer exists. Vite raises `vite:preloadError` for
 * that case — reload once to pick up the new index rather than showing the
 * error boundary. A 30-second guard stops any reload loop.
 */
const RELOAD_GUARD_MS = 30_000;
window.addEventListener('vite:preloadError', (event) => {
  const last = session.get<number>('preloadReloadedAt', 0);
  if (Date.now() - last < RELOAD_GUARD_MS) return; // let the error boundary show
  event.preventDefault();
  session.set('preloadReloadedAt', Date.now());
  window.location.reload();
});

const router = createBrowserRouter(routes, {
  basename: import.meta.env.BASE_URL,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

/**
 * Warm the other screens once the first paint is done and the browser is idle
 * (during the entrance animation on a first visit), so the first click on each
 * nav item is instant instead of waiting on a chunk fetch. Falls back to a
 * short timer where requestIdleCallback is missing (Safari, jsdom).
 */
const idle: (cb: () => void) => void =
  typeof window.requestIdleCallback === 'function'
    ? (cb) => window.requestIdleCallback(cb, { timeout: 4000 })
    : (cb) => window.setTimeout(cb, 1500);
idle(() => void prefetchRoutes());
