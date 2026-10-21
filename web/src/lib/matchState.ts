import type { Insight, MatchEvent, MatchMetrics, StreamMessage } from "../types/match";
import { MOMENTUM_BIN_SECONDS, momentumWeight, type MomentumBins } from "./momentum";

/** Latest events kept for feeds. Session aggregates below cover every event received. */
export const EVENT_BUFFER_SIZE = 200;
/** Chronological session history for period filtering (~2 hours at one event per second). */
export const HISTORY_SIZE = 7200;
const PRESSURE_HISTORY_SIZE = 180;
const INSIGHT_HISTORY_SIZE = 50;

/** Mirrors PRESSURE_THRESHOLD in api/src/rules.ts. */
export const HIGH_PRESSURE_THRESHOLD = 0.75;

export type CountStats = {
  events: number;
  passes: number;
  completedPasses: number;
  shots: number;
  tackles: number;
  pressures: number;
  pressureSum: number;
  highPressures: number;
};

export type PlayerStats = CountStats & { key: string; team: string; player: string };

export type InsightEntry = Insight & {
  key: string;
  /** Team of the event that triggered the insight in the backend rule. */
  team: string;
  /** Match clock (seconds) of the triggering event. */
  clock: number;
};

export type PressurePoint = { id: string; clock: number; team: string; value: number };

export type MatchState = {
  /** Newest first, capped at EVENT_BUFFER_SIZE. */
  events: MatchEvent[];
  /** Oldest first, capped at HISTORY_SIZE. Used by Analyst Mode period filters. */
  history: MatchEvent[];
  insights: InsightEntry[];
  /** Authoritative backend totals (match-wide, both teams). */
  metrics: MatchMetrics | null;
  /** Session aggregates: every event received since this browser connected. */
  teams: Record<string, CountStats>;
  players: Record<string, PlayerStats>;
  momentum: MomentumBins;
  pressure: PressurePoint[];
  sessionStart: number | null;
  clock: number | null;
  minute: number | null;
  second: number | null;
  lastSeq: number | null;
  received: number;
  /** Events skipped in the sequence, e.g. during a reconnect. */
  missed: number;
};

export const initialMatchState: MatchState = {
  events: [],
  history: [],
  insights: [],
  metrics: null,
  teams: {},
  players: {},
  momentum: {},
  pressure: [],
  sessionStart: null,
  clock: null,
  minute: null,
  second: null,
  lastSeq: null,
  received: 0,
  missed: 0,
};

export type MatchAction = { type: "message"; message: StreamMessage };

export const emptyCounts = (): CountStats => ({
  events: 0,
  passes: 0,
  completedPasses: 0,
  shots: 0,
  tackles: 0,
  pressures: 0,
  pressureSum: 0,
  highPressures: 0,
});

export const clockOf = (event: Pick<MatchEvent, "minute" | "second">) =>
  event.minute * 60 + event.second;

export const playerKey = (team: string, player: string) => `${team}::${player}`;

const sequenceOf = (eventId: string) => Number(eventId.replace(/\D/g, ""));

export function addEvent<T extends CountStats>(stats: T, event: MatchEvent): T {
  const next = { ...stats, events: stats.events + 1 };
  switch (event.event_type) {
    case "pass":
      next.passes++;
      if (event.completed) next.completedPasses++;
      break;
    case "shot":
      next.shots++;
      break;
    case "tackle":
      next.tackles++;
      break;
    case "pressure": {
      const value = event.pressure ?? 0;
      next.pressures++;
      next.pressureSum += value;
      if (value > HIGH_PRESSURE_THRESHOLD) next.highPressures++;
      break;
    }
  }
  return next;
}

export function matchReducer(state: MatchState, action: MatchAction): MatchState {
  const { event, metrics, insights } = action.message;
  const seq = sequenceOf(event.event_id);
  let base = state;
  let missed = 0;

  if (state.lastSeq !== null && Number.isFinite(seq)) {
    // Duplicate delivery: ignore.
    if (seq === state.lastSeq) return state;
    // Sequence went backwards: the backend restarted, so start a fresh session.
    if (seq < state.lastSeq) base = initialMatchState;
    else missed = seq - state.lastSeq - 1;
  }

  const clock = clockOf(event);
  const key = playerKey(event.team, event.player);
  const bin = Math.floor(clock / MOMENTUM_BIN_SECONDS);
  const binWeights = base.momentum[bin] ?? {};

  const newInsights: InsightEntry[] = (insights ?? []).map((insight) => ({
    ...insight,
    key: `${event.event_id}-${insight.id}`,
    team: event.team,
    clock,
  }));

  return {
    events: [event, ...base.events].slice(0, EVENT_BUFFER_SIZE),
    history:
      base.history.length >= HISTORY_SIZE
        ? [...base.history.slice(1 - HISTORY_SIZE), event]
        : [...base.history, event],
    insights: [...newInsights.reverse(), ...base.insights].slice(0, INSIGHT_HISTORY_SIZE),
    metrics,
    teams: {
      ...base.teams,
      [event.team]: addEvent(base.teams[event.team] ?? emptyCounts(), event),
    },
    players: {
      ...base.players,
      [key]: addEvent(
        base.players[key] ?? { ...emptyCounts(), key, team: event.team, player: event.player },
        event,
      ),
    },
    momentum: {
      ...base.momentum,
      [bin]: { ...binWeights, [event.team]: (binWeights[event.team] ?? 0) + momentumWeight(event) },
    },
    pressure:
      event.event_type === "pressure" && typeof event.pressure === "number"
        ? [
            ...base.pressure,
            { id: event.event_id, clock, team: event.team, value: event.pressure },
          ].slice(-PRESSURE_HISTORY_SIZE)
        : base.pressure,
    sessionStart: base.sessionStart ?? clock,
    clock,
    minute: event.minute,
    second: event.second,
    lastSeq: Number.isFinite(seq) ? seq : base.lastSeq,
    received: base.received + 1,
    missed: base.missed + missed,
  };
}

export function isStreamMessage(value: unknown): value is StreamMessage {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<StreamMessage>;
  return (
    typeof candidate.event?.event_id === "string" &&
    typeof candidate.event.minute === "number" &&
    typeof candidate.event.team === "string" &&
    typeof candidate.metrics === "object" &&
    Array.isArray(candidate.insights)
  );
}
