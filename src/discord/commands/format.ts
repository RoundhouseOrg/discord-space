import type { ResolvedJob } from '../../db/jobs-engine';

/**
 * Renders the "while you were away" note every command shows after
 * resolving finished jobs (docs/05-tech-stack.md: "any command from the
 * player checks for unresolved, finished jobs and resolves them"). Empty
 * string when nothing resolved, so callers can just prepend it.
 */
export function describeResolvedJobs(resolved: readonly ResolvedJob[]): string {
  if (resolved.length === 0) return '';

  // `credited` is false only when this job's reward was already claimed by
  // an earlier resolution (docs/05-tech-stack.md idempotency guarantee) —
  // do not repeat the reward figure in that case, since it was not (again)
  // added to the ship's cargo just now.
  const lines = resolved.map(({ job, credited }) =>
    credited ? `Mining run complete: +${job.reward.oreTonnes}t ore.` : `Mining run complete.`,
  );
  return `${lines.join('\n')}\n\n`;
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h${minutes}m`;
}
