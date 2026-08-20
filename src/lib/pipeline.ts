/**
 * Shared stage-pipeline helpers.
 *
 * The procurement flow and the crew-change letters each grew their own copy of
 * this logic before the service lines existed, and both keep theirs (their
 * pipelines carry extra rules — a simulate button that covers two stages, a
 * kind-dependent pipeline). The logistics and customs pipelines share these
 * instead of adding a third and fourth copy.
 *
 * Every read is defensive: a stage the pipeline does not recognise — an entry
 * from an older build, or storage edited by hand — restarts at the first stage
 * rather than sticking forever.
 */

/** Position of a stage in its pipeline; -1 when the stage is not in it. */
export function stageIndexIn<T extends string>(stages: readonly T[], stage: string): number {
  return (stages as readonly string[]).indexOf(stage);
}

/** The stage after this one. The final stage returns itself. */
export function nextStageIn<T extends string>(stages: readonly T[], stage: string): T {
  const i = stageIndexIn(stages, stage);
  if (i === -1) return stages[0]!;
  return stages[Math.min(i + 1, stages.length - 1)]!;
}

/** True once the pipeline has run to its last stage. */
export function isFinalStageIn<T extends string>(stages: readonly T[], stage: string): boolean {
  return stage === stages[stages.length - 1];
}

/** True when `current` has reached `stage` or gone past it — drives the stage rail. */
export function stageReachedIn<T extends string>(
  stages: readonly T[],
  current: string,
  stage: T,
): boolean {
  const now = stageIndexIn(stages, current);
  const target = stageIndexIn(stages, stage);
  if (now === -1 || target === -1) return false;
  return now >= target;
}

/** Pill tone: info while the job is running, verified once it is finished. */
export function stageToneIn<T extends string>(
  stages: readonly T[],
  stage: string,
): 'info' | 'verified' {
  return isFinalStageIn(stages, stage) ? 'verified' : 'info';
}

/** True when a persisted value is one of this pipeline's stages. */
export function isStageOf<T extends string>(stages: readonly T[], v: unknown): v is T {
  return typeof v === 'string' && stageIndexIn(stages, v) !== -1;
}
