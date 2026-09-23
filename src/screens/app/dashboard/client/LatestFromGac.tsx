import { Link } from 'react-router-dom';
import { Card } from '../../../../components/ui/Card';
import { CardHeader } from '../../../../components/ui/CardHeader';
import { Icon } from '../../../../components/ui/Icon';
import { LINE_LABELS, type ActivityItem } from '../../../../data/clientDesk';
import { visibleActivity } from '../../../../lib/clientDesk';
import { useApp } from '../../../../store/app';

/**
 * "Latest from GAC" (spec §2, row 3 right): what has moved since yesterday,
 * newest first, each row leading to where it happened. Rows on a line the
 * client does not hold (Logistics, Customs) show only while that pillar is on
 * — the feed follows the tier card, as the spend chart does.
 */

const SOURCE_LABELS: Record<ActivityItem['line'], string> = {
  ...LINE_LABELS,
  quotes: 'Quotes',
  invoices: 'Invoices',
  svs: 'SVS',
};

export function LatestFromGac() {
  const tier = useApp((s) => s.tier);
  const items = visibleActivity(tier);

  return (
    <Card>
      <CardHeader title="Latest from GAC" subtitle="What has moved since yesterday" />
      <ol role="list" data-testid="client-activity" className="mt-4 list-none">
        {items.map((item, i) => (
          <li
            key={item.id}
            data-line={item.line}
            className={`relative flex gap-3 pb-4 last:pb-0 ${
              item.line === 'logistics' || item.line === 'customs'
                ? 'animate-[fade-up_0.3s_ease_both]'
                : ''
            }`}
          >
            {/* The thread between one row's tile and the next. */}
            {i < items.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute top-9 bottom-1 left-4 w-px -translate-x-1/2 bg-line"
              />
            ) : null}
            <span
              aria-hidden="true"
              className="relative grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sea-soft text-sea"
            >
              <Icon name={item.icon} size={16} />
            </span>
            <div className="min-w-0 flex-1 pt-[3px]">
              {/* The link's ::after covers the whole row (the <li> is relative), so
                  the tile and the timestamp are part of one 44px+ target; the
                  accessible name stays the item's own words. */}
              <Link
                to={item.to}
                className="text-[13.5px] leading-snug font-medium text-ink no-underline transition-colors after:absolute after:inset-0 hover:text-sea hover:underline"
              >
                {item.text}
              </Link>
              <p className="mt-0.5 text-[12px] text-ink-soft tabular-nums">
                {item.when} · {SOURCE_LABELS[item.line]}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
