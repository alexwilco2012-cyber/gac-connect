import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from './routes';
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
