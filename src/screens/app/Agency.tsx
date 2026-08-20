import { useState } from 'react';
import { ServiceLineHub } from '../../components/ServiceLineHub';
import type { LiveStat } from '../../components/ServiceLineHub';
import { RequestQuoteModal } from '../../components/RequestQuoteModal';
import type { RequestTarget } from '../../components/RequestQuoteModal';
import { AGENT_ENGAGED } from '../../data/serviceLines';
import type { LineService } from '../../data/serviceLines';
import { serviceLine } from '../../data/serviceLines';
import { isTerminalStage } from '../../lib/crewChange';
import { useApp } from '../../store/app';
import { useCrewChange } from '../../store/crewChange';

/**
 * Agency — the port-call line. It owns no working screen of its own: crew
 * change is a screen in its own right (six sections, two letter pipelines) and
 * the quayside is the marketplace, so the hub's job is to land the visitor on
 * what is live, name every service with who performs it, and hand off. Nesting
 * crew change one level deeper than its own sections would have put the taxis
 * three clicks from the dashboard, which is the trap this restructure exists
 * to avoid.
 */
export default function Agency() {
  const line = serviceLine('agency');
  const pushToast = useApp((s) => s.pushToast);
  const crewRequests = useCrewChange((s) => s.requests);
  const [target, setTarget] = useState<RequestTarget | null>(null);

  const lettersInProgress = crewRequests.filter((r) => !isTerminalStage(r.kind, r.stage)).length;
  const lettersReturned = crewRequests.length - lettersInProgress;

  const live: LiveStat[] = [
    {
      label: 'Letters in progress',
      value: String(lettersInProgress),
      note:
        crewRequests.length === 0 ? 'No letters raised yet' : `${lettersReturned} returned to you`,
      to: '/app/agency/crew-change',
    },
    {
      label: 'Transport planned to a flight',
      value: 'Taxis · launches',
      note: 'Give us the flight number',
      to: '/app/agency/crew-change?section=taxis',
    },
    {
      label: 'Quayside quotes',
      value: 'Compare',
      note: 'Replies land in one view',
      to: '/app/quotes',
    },
  ];

  function onRequest(service: LineService) {
    if (service.action.kind !== 'request') return;
    setTarget({ category: service.action.category, service: service.action.service });
  }

  function onAgent(service: LineService) {
    pushToast(`${service.label} — ${AGENT_ENGAGED}`);
  }

  return (
    <>
      <ServiceLineHub line={line} live={live} onRequest={onRequest} onAgent={onAgent} />
      <RequestQuoteModal target={target} onClose={() => setTarget(null)} />
    </>
  );
}
