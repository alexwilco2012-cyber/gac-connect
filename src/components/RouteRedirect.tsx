import { Navigate, useLocation } from 'react-router-dom';

/**
 * A permanent redirect that carries the query string with it.
 *
 * The service-line restructure moved crew change, certification and bunkers
 * under `/app/agency`, and those addresses are in the docs, the presenter and
 * anything the owner has already shared. Every old path still resolves, and a
 * deep link keeps its section: `/app/crew-change?section=taxis` lands on the
 * taxis section, not the top of the screen.
 */
export function RouteRedirect({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}
