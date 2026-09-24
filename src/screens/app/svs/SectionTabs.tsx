import { Icon, type IconName } from '../../../components/ui/Icon';
import type { SvsSection } from './useSvsSection';

export interface SectionTab {
  id: SvsSection;
  label: string;
  /** Words hidden on a phone to keep the strip on one line; screen readers still hear them. */
  labelTail?: string;
  icon: IconName;
  count?: number;
}

/**
 * The SVS screen's section switch (spec §4.5): a `role="group"` of
 * `aria-pressed` buttons, the pattern the register's filters already use,
 * drawn as an underlined strip so it reads as the screen's sections rather
 * than one more row of filters. Counts sit in a fixed-width badge, so a count
 * changing never nudges the strip.
 */
export function SectionTabs({
  tabs,
  current,
  onSelect,
  controls,
}: {
  tabs: readonly SectionTab[];
  current: SvsSection;
  onSelect: (id: SvsSection) => void;
  /** The id of the panel the strip switches. */
  controls: string;
}) {
  return (
    <div
      role="group"
      aria-label="SVS sections"
      className="relative -mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:gap-2 sm:px-0"
    >
      {tabs.map((t) => {
        const pressed = t.id === current;
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={pressed}
            aria-controls={controls}
            aria-label={`${t.label}${t.labelTail ?? ''}${t.count !== undefined ? ` ${t.count}` : ''}`}
            onClick={() => onSelect(t.id)}
            className={`relative -mb-px inline-flex min-h-[46px] shrink-0 cursor-pointer items-center gap-2 border-x-0 border-t-0 border-b-2 bg-transparent px-2.5 pt-1.5 pb-2 text-[14px] font-semibold whitespace-nowrap transition-colors sm:px-3 ${
              pressed
                ? 'border-sea text-ink'
                : 'border-transparent text-ink-soft hover:border-line-strong hover:text-ink'
            }`}
          >
            <Icon
              name={t.icon}
              size={16}
              className={`hidden sm:block ${pressed ? 'text-sea' : 'text-ink-soft'}`}
            />
            <span>
              {t.label}
              {t.labelTail ? <span className="max-sm:sr-only">{t.labelTail}</span> : null}
            </span>
            {t.count !== undefined ? (
              <span
                className={`min-w-[22px] rounded-full px-1.5 py-px text-center text-[11.5px] font-bold tabular-nums ${
                  pressed ? 'bg-sea text-white' : 'bg-sea-soft text-sea'
                }`}
              >
                {t.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
