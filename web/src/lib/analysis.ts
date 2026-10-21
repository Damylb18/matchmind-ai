import type { MatchEvent } from "../types/match";
import {
  addEvent,
  clockOf,
  emptyCounts,
  playerKey,
  type CountStats,
  type InsightEntry,
  type PlayerStats,
  type PressurePoint,
} from "./matchState";

/* ───────────── Match periods ───────────── */

export type PeriodKind = "full" | "first" | "second" | "custom";

export type Period = { kind: PeriodKind; fromMin: number; toMin: number };

export const DEFAULT_PERIOD: Period = { kind: "full", fromMin: 0, toMin: 90 };

export const PERIOD_LABELS: Record<PeriodKind, string> = {
  full: "Full Match",
  first: "First Half",
  second: "Second Half",
  custom: "Custom",
};

/**
 * Period bounds in match seconds, [start, end). The demo clock keeps running
 * past 90:00, so open-ended periods extend to the current clock.
 */
export function periodRange(period: Period, clock: number | null): [number, number] {
  const now = (clock ?? 0) + 1;
  switch (period.kind) {
    case "full":
      return [0, Math.max(90 * 60, now)];
    case "first":
      return [0, 45 * 60];
    case "second":
      return [45 * 60, Math.max(90 * 60, now)];
    case "custom":
      return [period.fromMin * 60, Math.max(period.fromMin + 1, period.toMin) * 60];
  }
}

export const inRange = (seconds: number, [start, end]: [number, number]) =>
  seconds >= start && seconds < end;

export type Coverage = {
  /** Part of the period that has been played so far, in seconds. */
  elapsed: number;
  /** Part of that this browser actually received, in seconds. */
  covered: number;
  fraction: number;
  status: "not-started" | "none" | "partial" | "complete";
};

export function coverage(
  range: [number, number],
  sessionStart: number | null,
  clock: number | null,
): Coverage {
  const [start, end] = range;
  if (clock === null || sessionStart === null) {
    return { elapsed: 0, covered: 0, fraction: 0, status: "none" };
  }
  const playedTo = Math.min(end, clock + 1);
  const elapsed = Math.max(0, playedTo - start);
  if (elapsed === 0) return { elapsed, covered: 0, fraction: 0, status: "not-started" };
  const covered = Math.max(0, playedTo - Math.max(start, sessionStart));
  const fraction = covered / elapsed;
  return {
    elapsed,
    covered,
    fraction,
    status: covered === 0 ? "none" : fraction >= 0.999 ? "complete" : "partial",
  };
}

/* ───────────── Aggregation ───────────── */

export type Summary = {
  teams: Record<string, CountStats>;
  players: Record<string, PlayerStats>;
  pressure: PressurePoint[];
};

export function summarise(events: MatchEvent[]): Summary {
  const teams: Record<string, CountStats> = {};
  const players: Record<string, PlayerStats> = {};
  const pressure: PressurePoint[] = [];

  for (const event of events) {
    teams[event.team] = addEvent(teams[event.team] ?? emptyCounts(), event);
    const key = playerKey(event.team, event.player);
    players[key] = addEvent(
      players[key] ?? { ...emptyCounts(), key, team: event.team, player: event.player },
      event,
    );
    if (event.event_type === "pressure" && typeof event.pressure === "number") {
      pressure.push({ id: event.event_id, clock: clockOf(event), team: event.team, value: event.pressure });
    }
  }

  return { teams, players, pressure };
}

export const filterByRange = (events: MatchEvent[], range: [number, number]) =>
  events.filter((event) => inRange(clockOf(event), range));

export const filterInsights = (insights: InsightEntry[], range: [number, number]) =>
  insights.filter((insight) => inRange(insight.clock, range));

export const sortPlayers = (players: PlayerStats[]) =>
  [...players].sort(
    (a, b) =>
      a.team.localeCompare(b.team) || a.player.localeCompare(b.player, undefined, { numeric: true }),
  );

/* ───────────── Trends ───────────── */

export type TrendMetric =
  | "events"
  | "passes"
  | "accuracy"
  | "shots"
  | "tackles"
  | "pressures"
  | "intensity";

export const TREND_METRICS: { id: TrendMetric; label: string; unit?: string }[] = [
  { id: "events", label: "Events recorded" },
  { id: "passes", label: "Pass attempts" },
  { id: "accuracy", label: "Pass accuracy", unit: "%" },
  { id: "shots", label: "Shots recorded" },
  { id: "tackles", label: "Tackles recorded" },
  { id: "pressures", label: "Pressure actions" },
  { id: "intensity", label: "Avg pressure intensity" },
];

export function metricValue(stats: CountStats, metric: TrendMetric): number | null {
  switch (metric) {
    case "events":
      return stats.events;
    case "passes":
      return stats.passes;
    case "accuracy":
      return stats.passes ? Math.round((stats.completedPasses / stats.passes) * 100) : null;
    case "shots":
      return stats.shots;
    case "tackles":
      return stats.tackles;
    case "pressures":
      return stats.pressures;
    case "intensity":
      return stats.pressures ? Math.round((stats.pressureSum / stats.pressures) * 100) / 100 : null;
  }
}

/** Per-minute buckets: minute → team → counts. */
export function perMinute(events: MatchEvent[]) {
  const buckets = new Map<number, Record<string, CountStats>>();
  for (const event of events) {
    const bucket = buckets.get(event.minute) ?? {};
    bucket[event.team] = addEvent(bucket[event.team] ?? emptyCounts(), event);
    buckets.set(event.minute, bucket);
  }
  return buckets;
}

/* ───────────── Deterministic pseudo-random (illustrative visuals only) ───────────── */

export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
