import { stageIndexIn } from '../../lib/pipeline';

/**
 * The horizontal progress rail used on a request card — done / current /
 * pending, one box per stage. The crew-change letters drew this inline first;
 * the logistics and customs pipelines share it rather than each drawing their
 * own. State is carried on `data-stage-state` so a test can read progress
 * without reading colour.
 */
export function StageTrack({
  stages,
  current,
  notes,
  label = 'Progress',
}: {
  stages: readonly string[];
  current: string;
  /** Optional one-liner under each stage — what happens at that step. */
  notes?: Record<string, string>;
  label?: string;
}) {
  const at = stageIndexIn(stages, current);
  return (
    <ol className="mt-3 flex flex-wrap gap-1.5" aria-label={label} data-testid="stage-tracker">
      {stages.map((s, i) => {
        const state = i < at ? 'done' : i === at ? 'current' : 'pending';
        return (
          <li
            key={s}
            data-stage-state={state}
            className={`min-w-[150px] flex-1 rounded-md border px-2 py-1.5 text-[11.5px] leading-tight ${
              state === 'current'
                ? 'border-sea bg-sea-soft font-bold text-sea'
                : state === 'done'
                  ? 'border-success-soft bg-success-soft text-success'
                  : 'border-line bg-white text-ink-soft'
            }`}
          >
            <span aria-hidden="true" className="mr-1">
              {state === 'done' ? '✓' : state === 'current' ? '●' : '○'}
            </span>
            <strong>{s}</strong>
            {notes?.[s] ? (
              <span className="block font-normal text-ink-soft">{notes[s]}</span>
            ) : null}
            <span className="sr-only">
              {state === 'done' ? ' (done)' : state === 'current' ? ' (current)' : ' (pending)'}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
