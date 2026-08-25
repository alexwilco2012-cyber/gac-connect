import type { IconName } from '../components/ui/Icon';
import { INVOICES } from '../data/invoices';
import { daysLeft, invoiceState, windowLabel } from './invoices';
import { isTerminalStage } from './crewChange';
import { useApp } from '../store/app';
import { useCrewChange } from '../store/crewChange';

/**
 * The "needs you" feed — one source for the dashboard feed and the top-bar
 * bell, so the two can never disagree about what is waiting. Three rows:
 * invoices inside their seven-day window, the SVS compliance watch, and
 * crew-change letters in flight. Ordered by urgency, tightest deadline first;
 * zero-count rows stay (muted) so the card never jumps height between demo
 * runs.
 */

export interface NeedsYouItem {
  id: 'invoices' | 'compliance' | 'letters';
  icon: IconName;
  count: number;
  headline: string;
  detail: string;
  chip?: { label: string; tone: 'info' | 'warn' | 'danger' };
  to: string;
  cta: string;
  /** Counts toward the bell badge — a deadline or an alert, not paperwork
   *  that is simply on its way through. */
  actionable: boolean;
}

export function useNeedsYou(): NeedsYouItem[] {
  const invoiceDecisions = useApp((s) => s.invoiceDecisions);
  const crewRequests = useCrewChange((s) => s.requests);

  // Invoices still inside the client's seven-day review window.
  const awaiting = INVOICES.filter(
    (inv) => invoiceState(inv.receivedDaysAgo, invoiceDecisions[inv.id]) === 'awaiting',
  );
  const tightest = awaiting.reduce<number | null>(
    (acc, inv) =>
      acc === null || daysLeft(inv.receivedDaysAgo) < daysLeft(acc) ? inv.receivedDaysAgo : acc,
    null,
  );

  // LOI / repatriation letters not yet returned to the client.
  const letters = crewRequests.filter((r) => !isTerminalStage(r.kind, r.stage)).length;

  const items: { rank: number; item: NeedsYouItem }[] = [
    {
      rank: tightest === null ? 80 : daysLeft(tightest),
      item: {
        id: 'invoices',
        icon: 'receipt',
        count: awaiting.length,
        headline:
          awaiting.length === 0
            ? 'Invoices — all clear'
            : `${awaiting.length} ${awaiting.length === 1 ? 'invoice' : 'invoices'} awaiting your review`,
        detail:
          awaiting.length === 0
            ? 'Everything received has matched in GAC Agent.'
            : 'Left alone, an invoice matches as it stands.',
        chip:
          tightest === null
            ? undefined
            : {
                label: windowLabel(tightest),
                tone: daysLeft(tightest) <= 2 ? 'warn' : 'info',
              },
        to: '/app/invoices',
        cta: 'Review invoices',
        actionable: awaiting.length > 0,
      },
    },
    {
      rank: 10,
      item: {
        id: 'compliance',
        icon: 'triangle-alert',
        count: 2,
        headline: '2 suppliers on compliance watch',
        detail:
          'Granite NDT Ltd — GWO expires in 21 days, reminder sent · Peterhead Diving Services — insurance lapsed',
        chip: { label: '1 blocked from booking', tone: 'danger' },
        to: '/app/svs',
        cta: 'Open SVS',
        actionable: true,
      },
    },
    {
      rank: 90,
      item: {
        id: 'letters',
        icon: 'file-check',
        count: letters,
        headline:
          letters === 0
            ? 'No letters in progress'
            : `${letters} ${letters === 1 ? 'letter' : 'letters'} in progress`,
        detail:
          letters === 0
            ? 'LOI and repatriation templates live in crew change.'
            : 'LOI and repatriation letters on their way through GAC and Border Force.',
        to: '/app/agency/crew-change',
        cta: 'Open crew change',
        actionable: false,
      },
    },
  ];

  return items.sort((a, b) => a.rank - b.rank).map((row) => row.item);
}
