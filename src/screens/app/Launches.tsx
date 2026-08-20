import { Navigate } from 'react-router-dom';

/**
 * /app/launches — kept as a deep link only. Launches moved into Crew change and
 * now stands as its own section there (17 Aug review, owner's follow-up: taxis
 * and launches are separate sub-headings), and crew change in turn moved under
 * the Agency service line. The panel itself is
 * src/components/LaunchesPanel.tsx.
 */
export default function Launches() {
  return <Navigate to="/app/agency/crew-change?section=launches" replace />;
}
