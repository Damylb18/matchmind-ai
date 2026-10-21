
import type { MatchEvent, MatchMetrics } from "./types.js";

export function calculateMetrics(events: MatchEvent[]): MatchMetrics {
  const passes = events.filter((event) => event.event_type === "pass");

  const completedPasses = passes.filter(
    (event) => event.completed === true
  ).length;

  return {
    attempted_passes: passes.length,
    completed_passes: completedPasses,
    pass_accuracy:
      passes.length === 0
        ? 0
        : Math.round((completedPasses / passes.length) * 100),
  };
}
