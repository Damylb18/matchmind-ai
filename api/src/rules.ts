
import type { Insight, MatchEvent } from "./types.js";

const WINDOW_SIZE = 10;
const PRESSURE_THRESHOLD = 0.75;

const recentPressure = new Map<string, MatchEvent[]>();
const activeSurges = new Set<string>();
let insightCounter = 0;

export function detectInsights(event: MatchEvent): Insight[] {
  if (
    event.event_type !== "pressure" ||
    typeof event.pressure !== "number"
  ) {
    return [];
  }

  const teamEvents = [
    ...(recentPressure.get(event.team) ?? []),
    event,
  ].slice(-WINDOW_SIZE);

  recentPressure.set(event.team, teamEvents);

  if (teamEvents.length < WINDOW_SIZE) {
    return [];
  }

  const average =
    teamEvents.reduce((sum, item) => sum + (item.pressure ?? 0), 0) /
    teamEvents.length;

  const surgeIsActive = average > PRESSURE_THRESHOLD;

  if (!surgeIsActive) {
    activeSurges.delete(event.team);
    return [];
  }

  if (activeSurges.has(event.team)) {
    return [];
  }

  activeSurges.add(event.team);
  insightCounter++;

  return [
    {
      id: `insight_${insightCounter}`,
      type: "pressure_surge",
      headline: `${event.team}: pressure is building`,
      explanation:
        `${event.team} has recorded high pressure intensity across ` +
        `${WINDOW_SIZE} recent pressure events. This indicates ` +
        `pressure intensity, not necessarily territorial control ` +
        `or scoring threat.`,
      minute: event.minute,
      evidence_event_ids: teamEvents.map((item) => item.event_id),
    },
  ];
}
