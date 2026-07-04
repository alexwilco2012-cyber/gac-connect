import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ToastHost } from './components/ui/ToastHost';
import { BRAND_NAME, SITE_TAGLINE } from './config/brand';

export default function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = `${BRAND_NAME} — ${SITE_TAGLINE}`;
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <>
      <Outlet />
      <ToastHost />
    </>
  );
}
