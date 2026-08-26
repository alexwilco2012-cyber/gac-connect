import type { ReactNode } from 'react';

/**
 * Card header — title · one-line subtitle · right-aligned control (dashboard
 * restyle). Cards lead with the fact; explanation drops to the subtitle so
 * body prose stays short. The title is an h2 by default; pass `as` where the
 * card sits deeper in the outline.
 */
export function CardHeader({
  title,
  subtitle,
  action,
  as: Heading = 'h2',
  className = '',
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  as?: 'h2' | 'h3';
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-x-3 gap-y-2 ${className}`}>
      <div className="min-w-0">
        <Heading className="font-display text-[15.5px] font-bold tracking-[-0.01em]">
          {title}
        </Heading>
        {subtitle ? <p className="mt-0.5 text-[12.5px] text-ink-soft">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}
