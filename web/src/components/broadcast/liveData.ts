import { PLAYER_PROFILES, type PlayerProfile } from "../../data/players";
import { formatClockSeconds } from "../../lib/format";
import type { InsightEntry, MatchState, PressurePoint } from "../../lib/matchState";
import type { ConnectionStatus } from "../../types/match";
import type { ProductionState } from "./productionState";

/** Mirrors WINDOW_SIZE in api/src/rules.ts. */
export const ROLLING_WINDOW = 5;

/** Average of a team's last ROLLING_WINDOW pressure events — the signal the backend insight rule uses. */
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

export type FeedNotice = { tone: "info" | "warn" | "ok"; text: string };

/** How long (match seconds) a "feed restored" notice stays up. */
const RECOVERY_NOTICE_SECONDS = 10;

/**
 * Operator-facing feed status: interruptions, recovery and empty states, so stale
 * data is never mistaken for live data.
 */
export function feedNotice(
  status: ConnectionStatus,
  state: MatchState,
  clockLabel: string,
): FeedNotice | null {
  const hasData = state.match !== null || state.clock !== null;
  const score = state.match ? `, ${state.match.home_score}–${state.match.away_score}` : "";

  if (status === "connecting") {
    return hasData ? null : { tone: "info", text: "Connecting to the match feed — no match data yet." };
  }

  if (status !== "live") {
    if (!hasData) {
      return { tone: "warn", text: "Match feed unavailable — retrying automatically. No match data to show yet." };
    }
    return {
      tone: "warn",
      text: `Feed ${status === "stalled" ? "stalled" : "interrupted"} — retrying automatically. Showing the last known state (${clockLabel}${score}); nothing is updating.`,
    };
  }

  const recovery = state.recovery;
  const now = state.match?.clock_seconds ?? state.clock;
  if (recovery && now !== null && now - recovery.atClock < RECOVERY_NOTICE_SECONDS) {
    return recovery.kind === "restart"
      ? {
          tone: "info",
          text: `Backend restarted — a new match session began at ${formatClockSeconds(recovery.atClock)}. Session statistics were reset.`,
        }
      : {
          tone: "ok",
          text: `Feed restored at ${formatClockSeconds(recovery.atClock)} — ${recovery.gapSeconds}s of match time passed while disconnected. Score and clock are current.`,
        };
  }

  return hasData ? null : { tone: "info", text: "Connected — waiting for the first match event." };
}
