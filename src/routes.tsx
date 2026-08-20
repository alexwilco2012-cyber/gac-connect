import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import App from './App';
import MarketingLayout from './components/layout/MarketingLayout';
import { RouteRedirect } from './components/RouteRedirect';
import { RouteErrorBoundary } from './components/ui/RouteErrorBoundary';
import Landing from './screens/marketing/Landing';

/**
 * Every screen is its own chunk (Vite code-splits on dynamic import), so the
 * first paint only ships the landing page. The importers are kept in one table
 * so `prefetchRoutes` can warm the rest once the browser is idle — the first
 * click on any nav item then renders from cache instead of waiting on a fetch.
 *
 * The app routes are grouped by **service line** — Agency, Logistics, Customs,
 * Procurement — mirroring how GAC sells and invoices, and the 2 / 4 / 7 tier.
 * Everything that moved keeps its old address as a redirect that carries the
 * query string, so shared deep links and printed references still resolve.
 */
const importers = {
  ForClients: () => import('./screens/marketing/ForClients'),
  ForSuppliers: () => import('./screens/marketing/ForSuppliers'),
  About: () => import('./screens/marketing/About'),
  Dashboard: () => import('./screens/app/Dashboard'),
  Marketplace: () => import('./screens/app/Marketplace'),
  SupplierProfile: () => import('./screens/app/SupplierProfile'),
  Agency: () => import('./screens/app/Agency'),
  Logistics: () => import('./screens/app/Logistics'),
  Customs: () => import('./screens/app/Customs'),
  Launches: () => import('./screens/app/Launches'),
  Procurement: () => import('./screens/app/Procurement'),
  CrewChange: () => import('./screens/app/CrewChange'),
  Quotes: () => import('./screens/app/Quotes'),
  Invoices: () => import('./screens/app/Invoices'),
  TierCalculator: () => import('./screens/app/TierCalculator'),
  Svs: () => import('./screens/app/Svs'),
  Analytics: () => import('./screens/app/Analytics'),
  CertificationBeta: () => import('./screens/app/CertificationBeta'),
  BunkersBeta: () => import('./screens/app/BunkersBeta'),
  KitchenSink: () => import('./screens/KitchenSink'),
  AppLayout: () => import('./components/layout/AppLayout'),
};

const ForClients = lazy(importers.ForClients);
const ForSuppliers = lazy(importers.ForSuppliers);
const About = lazy(importers.About);
const Dashboard = lazy(importers.Dashboard);
const Marketplace = lazy(importers.Marketplace);
const SupplierProfile = lazy(importers.SupplierProfile);
const Agency = lazy(importers.Agency);
const Logistics = lazy(importers.Logistics);
const Customs = lazy(importers.Customs);
const Launches = lazy(importers.Launches);
const Procurement = lazy(importers.Procurement);
const CrewChange = lazy(importers.CrewChange);
const Quotes = lazy(importers.Quotes);
const Invoices = lazy(importers.Invoices);
const TierCalculator = lazy(importers.TierCalculator);
const Svs = lazy(importers.Svs);
const Analytics = lazy(importers.Analytics);
const CertificationBeta = lazy(importers.CertificationBeta);
const BunkersBeta = lazy(importers.BunkersBeta);
const KitchenSink = lazy(importers.KitchenSink);
const AppLayout = lazy(importers.AppLayout);

/** Warm every route chunk. Failures are ignored — a route that fails to
 *  prefetch simply loads on demand as before. */
export function prefetchRoutes(): Promise<void> {
  return Promise.allSettled(Object.values(importers).map((load) => load())).then(() => undefined);
}

function lazily(el: React.ReactNode) {
  return <Suspense fallback={null}>{el}</Suspense>;
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <MarketingLayout />,
        children: [
          { index: true, element: <Landing /> },
          { path: 'for-clients', element: lazily(<ForClients />) },
          { path: 'for-suppliers', element: lazily(<ForSuppliers />) },
          { path: 'about', element: lazily(<About />) },
        ],
      },
      {
        path: 'app',
        element: lazily(<AppLayout />),
        children: [
          { index: true, element: lazily(<Dashboard />) },

          // Service lines
          { path: 'agency', element: lazily(<Agency />) },
          { path: 'agency/crew-change', element: lazily(<CrewChange />) },
          { path: 'agency/certification', element: lazily(<CertificationBeta />) },
          { path: 'agency/bunkers', element: lazily(<BunkersBeta />) },
          { path: 'logistics', element: lazily(<Logistics />) },
          { path: 'customs', element: lazily(<Customs />) },
          { path: 'procurement', element: lazily(<Procurement />) },

          // Find, compare, pay — the spine every line runs through
          { path: 'marketplace', element: lazily(<Marketplace />) },
          { path: 'marketplace/:supplierId', element: lazily(<SupplierProfile />) },
          { path: 'quotes', element: lazily(<Quotes />) },
          { path: 'invoices', element: lazily(<Invoices />) },

          // Commercial and compliance
          { path: 'tiers', element: lazily(<TierCalculator />) },
          { path: 'svs', element: lazily(<Svs />) },
          { path: 'analytics', element: lazily(<Analytics />) },

          // Addresses that pre-date the service lines
          { path: 'crew-change', element: <RouteRedirect to="/app/agency/crew-change" /> },
          { path: 'certification', element: <RouteRedirect to="/app/agency/certification" /> },
          { path: 'bunkers', element: <RouteRedirect to="/app/agency/bunkers" /> },
          { path: 'launches', element: lazily(<Launches />) },
        ],
      },
      { path: 'kitchen-sink', element: lazily(<KitchenSink />) },
    ],
  },
];
