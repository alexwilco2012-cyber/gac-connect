import type { ServiceLine } from '../data/serviceLines';
import { Chip } from './ui/Chip';

/**
 * The chip strip for a service line's sections, with the active section's
 * heading and summary underneath. The section itself is held in the URL by
 * `useLineSection` (src/lib), so a hub card, the dashboard and a shared link
 * all open straight onto the right one.
 */
export function LineSectionStrip({
  line,
  section,
  onSelect,
}: {
  line: ServiceLine;
  section: string;
  onSelect: (id: string) => void;
}) {
  const sections = line.sections ?? [];
  const active = sections.find((s) => s.id === section) ?? sections[0];
  if (!active) return null;

  return (
    <>
      <div
        className="mt-6 flex flex-wrap gap-2"
        role="group"
        aria-label={`${line.name} sections`}
        data-testid="line-sections"
      >
        {sections.map((s) => (
          <Chip key={s.id} pressed={s.id === active.id} onClick={() => onSelect(s.id)}>
            {s.label}
          </Chip>
        ))}
      </div>
      <div className="mt-4">
        <h2 className="font-display text-[19px] font-bold">{active.label}</h2>
        <p className="mt-0.5 text-[13.5px] text-ink-soft" data-testid="line-section-summary">
          {active.summary}
        </p>
      </div>
    </>
  );
}
