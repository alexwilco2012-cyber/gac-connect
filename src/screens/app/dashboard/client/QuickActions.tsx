import { Link } from 'react-router-dom';
import { Card } from '../../../../components/ui/Card';
import { CardHeader } from '../../../../components/ui/CardHeader';
import { Icon } from '../../../../components/ui/Icon';
import { QUICK_ACTIONS } from '../../../../data/clientDesk';

/**
 * "Start something" (spec §2, row 2): the five jobs a client starts most
 * often, one tap from the dashboard. Ghost buttons, because none of them is
 * the screen's primary action — the consolidation card above leads.
 *
 * From `sm` up they are one row of natural-width buttons that share the
 * spare width, so no label breaks; on a phone they fall into two columns
 * (labels may take two lines there) and the odd one out spans both.
 */
export function QuickActions() {
  return (
    <Card data-testid="client-quick-actions" className="py-[18px]">
      <CardHeader title="Start something" />
      <ul role="list" className="mt-3 grid list-none grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {QUICK_ACTIONS.map((action) => (
          <li key={action.to} className="min-w-0 last:col-span-2 sm:flex-auto">
            <Link
              to={action.to}
              className="flex h-full min-h-[48px] items-center gap-2 rounded-lg border-[1.5px] border-line-strong bg-white px-3 py-2 text-[13px] leading-tight font-bold text-sea no-underline transition-colors hover:border-sea hover:bg-sea-soft/50 sm:min-h-[44px] sm:justify-center sm:px-3.5 sm:whitespace-nowrap"
            >
              <Icon name={action.icon} size={17} className="shrink-0" />
              <span className="min-w-0">{action.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
