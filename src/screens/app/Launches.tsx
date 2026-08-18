import { Navigate } from 'react-router-dom';

/**
 * /app/launches — kept as a deep link only. Launches moved into Crew change
 * › Transfers (17 Aug review, owner's follow-up: launches belong with taxis
 * and the crew's flights). The panel itself is src/components/LaunchesPanel.tsx.
 */
export default function Launches() {
  return <Navigate to="/app/crew-change?section=transfers" replace />;
}
