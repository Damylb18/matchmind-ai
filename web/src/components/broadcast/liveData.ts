import { PLAYER_PROFILES, type PlayerProfile } from "../../data/players";
import type { InsightEntry, PressurePoint } from "../../lib/matchState";
import type { ProductionState } from "./productionState";

/** Mirrors WINDOW_SIZE in api/src/rules.ts. */
export const ROLLING_WINDOW = 10;

/** Average of a team's last ten pressure events — the signal the backend insight rule uses. */
export function rollingPressure(points: PressurePoint[], team: string): number | null {
  const own = points.filter((point) => point.team === team).slice(-ROLLING_WINDOW);
  if (!own.length) return null;
  return own.reduce((sum, point) => sum + point.value, 0) / own.length;
}

/**
 * The insight banner currently on screen, derived from the match clock so no
 * extra timers are needed: an on-demand banner lasts until its end clock, and
 * auto mode shows the newest insight for the configured duration after it fired.
 */
export function bannerInsight(
  production: ProductionState,
  insights: InsightEntry[],
  clock: number | null,
): InsightEntry | null {
  const settings = production.overlays.insight;
  if (!settings.enabled || clock === null) return null;

  if (production.banner && clock < production.banner.untilClock) {
    const pinned = insights.find((insight) => insight.key === production.banner!.key);
    if (pinned) return pinned;
  }

  const latest = insights[0];
  if (!settings.auto || !latest || latest.key === production.dismissedKey) return null;
  const duration = settings.duration ?? Number.POSITIVE_INFINITY;
  return clock - latest.clock < duration ? latest : null;
}

/** Insight used by insight-led scenes: the operator's selection, else the latest. */
export function focusInsight(production: ProductionState, insights: InsightEntry[]): InsightEntry | null {
  const selected = production.overlays.insight.selectedKey;
  return (selected && insights.find((insight) => insight.key === selected)) || insights[0] || null;
}

export const profileById = (id: string): PlayerProfile =>
  PLAYER_PROFILES.find((profile) => profile.id === id) ?? PLAYER_PROFILES[0]!;
