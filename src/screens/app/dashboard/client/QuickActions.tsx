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
 * The layout follows the card's own width (a container query, so a collapsed
 * sidebar counts too). Where all five fit unbroken they are one row of
 * near-equal columns, each at least as wide as its label; below that, three
 * over two on a six-column grid, so no button is left alone across the card;
 * on a phone, two columns (labels may take two lines) with the fifth spanning
 * both. 930px is the five labels' combined width, plus a margin for the face.
 */

/** The span each button takes on the 3 + 2 grid: thirds on top, halves under. */
const SPANS = [
  '@min-[540px]:col-span-2',
  '@min-[540px]:col-span-2',
  '@min-[540px]:col-span-2',
  '@min-[540px]:col-span-3',
  'col-span-2 @min-[540px]:col-span-3',
];

export function QuickActions() {
  return (
    <Card data-testid="client-quick-actions" className="@container py-[18px]">
      <CardHeader title="Start something" />
      <ul
        role="list"
        className="mt-3 grid list-none grid-cols-2 gap-2 @min-[540px]:grid-cols-6 @min-[930px]:grid-cols-[repeat(5,minmax(max-content,1fr))]"
      >
        {QUICK_ACTIONS.map((action, i) => (
          <li key={action.to} className={`min-w-0 ${SPANS[i] ?? ''} @min-[930px]:col-span-1`}>
            <Link
              to={action.to}
              className="flex h-full min-h-[48px] items-center gap-2 rounded-lg border-[1.5px] border-line-strong bg-white px-3 py-2 text-[13px] leading-tight font-bold text-sea no-underline transition-colors hover:border-sea hover:bg-sea-soft/50 @min-[540px]:min-h-[44px] @min-[540px]:justify-center @min-[540px]:px-3.5 @min-[930px]:whitespace-nowrap"
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
