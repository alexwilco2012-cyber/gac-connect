import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import App from './App';
import { RouteErrorBoundary } from './components/ui/RouteErrorBoundary';
import Landing from './screens/marketing/Landing';

const ForClients = lazy(() => import('./screens/marketing/ForClients'));
const ForSuppliers = lazy(() => import('./screens/marketing/ForSuppliers'));
const About = lazy(() => import('./screens/marketing/About'));
const Dashboard = lazy(() => import('./screens/app/Dashboard'));
const Marketplace = lazy(() => import('./screens/app/Marketplace'));
const SupplierProfile = lazy(() => import('./screens/app/SupplierProfile'));
const Quotes = lazy(() => import('./screens/app/Quotes'));
const TierCalculator = lazy(() => import('./screens/app/TierCalculator'));
const Svs = lazy(() => import('./screens/app/Svs'));
const Analytics = lazy(() => import('./screens/app/Analytics'));
const CertificationBeta = lazy(() => import('./screens/app/CertificationBeta'));
const BunkersBeta = lazy(() => import('./screens/app/BunkersBeta'));
const KitchenSink = lazy(() => import('./screens/KitchenSink'));

function lazily(el: React.ReactNode) {
  return <Suspense fallback={null}>{el}</Suspense>;
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'for-clients', element: lazily(<ForClients />) },
      { path: 'for-suppliers', element: lazily(<ForSuppliers />) },
      { path: 'about', element: lazily(<About />) },
      { path: 'app', element: lazily(<Dashboard />) },
      { path: 'app/marketplace', element: lazily(<Marketplace />) },
      { path: 'app/marketplace/:supplierId', element: lazily(<SupplierProfile />) },
      { path: 'app/quotes', element: lazily(<Quotes />) },
      { path: 'app/tiers', element: lazily(<TierCalculator />) },
      { path: 'app/svs', element: lazily(<Svs />) },
      { path: 'app/analytics', element: lazily(<Analytics />) },
      { path: 'app/certification', element: lazily(<CertificationBeta />) },
      { path: 'app/bunkers', element: lazily(<BunkersBeta />) },
      { path: 'kitchen-sink', element: lazily(<KitchenSink />) },
    ],
  },
];
