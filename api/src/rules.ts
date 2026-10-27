
import type { Insight, MatchEvent } from "./types.js";

const WINDOW_SIZE = 5;
const PRESSURE_THRESHOLD = 0.75;

const recentPressure = new Map<string, MatchEvent[]>();
const activeSurges = new Set<string>();
let insightCounter = 0;

/** Clears match-scoped rule state before a new demo match begins. */
export function resetInsightDetection(): void {
  recentPressure.clear();
  activeSurges.clear();
  insightCounter = 0;
}

export function detectInsights(event: MatchEvent): Insight[] {
  if (
    event.event_type !== "pressure" ||
    typeof event.pressure !== "number" ||
    !Number.isFinite(event.pressure)
  ) {
    return [];
  }

  const teamEvents = [
    ...(recentPressure.get(event.team_id) ?? []),
    event,
  ].slice(-WINDOW_SIZE);

  recentPressure.set(event.team_id, teamEvents);

  // Wait for a complete window of real pressure events.
  if (teamEvents.length < WINDOW_SIZE) {
    return [];
  }

  const average =
    teamEvents.reduce((sum, item) => sum + item.pressure!, 0) /
    teamEvents.length;

  const surgeIsActive = average >= PRESSURE_THRESHOLD;

  // A drop in pressure allows a future surge to trigger a new insight.
  if (!surgeIsActive) {
    activeSurges.delete(event.team_id);
    return [];
  }

  // Emit only once while the team remains in the same surge.
  if (activeSurges.has(event.team_id)) {
    return [];
  }

  activeSurges.add(event.team_id);
  insightCounter++;

  return [
    {
      id: `insight_${insightCounter}`,
      type: "pressure_surge",
      headline: `${event.team_id}: sustained pressure is building`,
      explanation:
        `${event.team_id} recorded an average pressure intensity of ` +
        `${average.toFixed(2)} across ${WINDOW_SIZE} recent pressure events. ` +
        `This indicates sustained pressing intensity, not necessarily ` +
        `territorial control or scoring threat.`,
      minute: event.minute,
      team_id: event.team_id,
      confidence: 0.9,
      evidence_event_ids: teamEvents.map((item) => item.event_id),
    },
  ];
}
