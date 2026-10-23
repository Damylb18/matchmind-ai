
import type { MatchEvent, MatchMetrics } from "./types.js";

export function calculateMetrics(events: MatchEvent[]): MatchMetrics {
  const passes = events.filter((event) => event.event_type === "pass");

  const completedPasses = passes.filter(
    (event) => event.completed === true || event.outcome === "successful"
  );

  const attemptedPasses = passes.length;

  const incompletePasses = passes.filter(
    (event) => event.completed === false || event.outcome === "unsuccessful"
  );

  const passAccuracy =
    attemptedPasses > 0
      ? Math.round((completedPasses.length / attemptedPasses) * 100)
      : 0;

  return {
    attempted_passes: passes.length,
    completed_passes: completedPasses.length,
    incomplete_passes: incompletePasses.length,
    pass_accuracy: passAccuracy,
  };
}
