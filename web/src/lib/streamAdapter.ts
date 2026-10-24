import type {
  BackendMatchState,
  EventType,
  Insight,
  MatchEvent,
  MatchMetrics,
  StreamMessage,
} from "../types/match";
import { TEAMS } from "../data/teams";

/**
 * Converts raw SSE payloads into the frontend model. Anything malformed is
 * dropped (or, for optional parts, ignored) rather than passed to the UI.
 */
export type StreamPayload =
  /** Sent when a connection opens: the current match state, no event. */
  | { kind: "snapshot"; match: BackendMatchState }
  | { kind: "message"; message: StreamMessage };

const EVENT_TYPES: EventType[] = ["pass", "shot", "tackle", "pressure"];
const MATCH_STATUSES: BackendMatchState["status"][] = ["live", "half_time", "full_time"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

export function parseMatch(value: unknown): BackendMatchState | undefined {
  if (!isRecord(value)) return undefined;
  const { match_id, home_team_id, away_team_id, home_score, away_score, clock_seconds, status } = value;
  if (
    typeof match_id !== "string" ||
    typeof home_team_id !== "string" ||
    typeof away_team_id !== "string" ||
    !isCount(home_score) ||
    !isCount(away_score) ||
    !isCount(clock_seconds) ||
    !MATCH_STATUSES.includes(status as BackendMatchState["status"])
  ) {
    return undefined;
  }
  return {
    match_id,
    home_team_id,
    away_team_id,
    home_score,
    away_score,
    clock_seconds,
    status: status as BackendMatchState["status"],
  };
}

function parseMetrics(value: unknown): MatchMetrics | null {
  if (!isRecord(value)) return null;
  const { attempted_passes, completed_passes, pass_accuracy } = value;
  if (!isCount(attempted_passes) || !isCount(completed_passes) || !isCount(pass_accuracy)) return null;
  return { attempted_passes, completed_passes, pass_accuracy };
}

/**
 * The backend writes team IDs into insight text ("arsenal: pressure is building").
 * Replace exact ID tokens with display names; the wording is otherwise unchanged.
 */
const TEAM_ID_PATTERNS = Object.values(TEAMS).map((team) => ({
  pattern: new RegExp(`\\b${team.apiName}\\b`, "g"),
  name: team.name,
}));

export const humaniseTeamIds = (text: string) =>
  TEAM_ID_PATTERNS.reduce((result, { pattern, name }) => result.replace(pattern, name), text);

function parseInsight(value: unknown): Insight | null {
  if (!isRecord(value)) return null;
  const { id, type, headline, explanation, minute, evidence_event_ids } = value;
  if (
    typeof id !== "string" ||
    typeof type !== "string" ||
    typeof headline !== "string" ||
    typeof explanation !== "string" ||
    typeof minute !== "number" ||
    !Array.isArray(evidence_event_ids)
  ) {
    return null;
  }
  const insight: Insight = {
    id,
    type,
    headline: humaniseTeamIds(headline),
    explanation: humaniseTeamIds(explanation),
    minute,
    evidence_event_ids: evidence_event_ids.filter((item): item is string => typeof item === "string"),
  };
  if (typeof value.team_id === "string") insight.team_id = value.team_id;
  if (typeof value.confidence === "number") insight.confidence = value.confidence;
  if (isRecord(value.data)) insight.data = value.data;
  return insight;
}

export function adaptStreamPayload(value: unknown): StreamPayload | null {
  if (!isRecord(value)) return null;

  // Sent when an SSE connection opens. Carries the current match state but no event.
  if (value.type === "connected") {
    const match = parseMatch(value.match);
    return match ? { kind: "snapshot", match } : null;
  }

  const event = value.event;
  const metrics = parseMetrics(value.metrics);
  if (!isRecord(event) || !metrics || !Array.isArray(value.insights)) return null;

  if (
    typeof event.event_id !== "string" ||
    !isCount(event.minute) ||
    !isCount(event.second) ||
    !EVENT_TYPES.includes(event.event_type as EventType)
  ) {
    return null;
  }

  const team =
    typeof event.team === "string" ? event.team : typeof event.team_id === "string" ? event.team_id : null;
  const player =
    typeof event.player === "string" ? event.player : typeof event.player_id === "string" ? event.player_id : null;
  if (!team || !player) return null;

  const receiver =
    typeof event.receiver === "string"
      ? event.receiver
      : typeof event.recipient_player_id === "string"
        ? event.recipient_player_id
        : undefined;

  // Keep the backend's own fields (the Event Explorer shows them verbatim) and add the
  // normalised team/player/receiver names the UI uses.
  const adapted = { ...event, team, player } as MatchEvent;
  if (receiver !== undefined) adapted.receiver = receiver;

  return {
    kind: "message",
    message: {
      // A malformed match block is ignored; the reducer keeps the last valid one.
      match: parseMatch(value.match),
      event: adapted,
      metrics,
      insights: value.insights.map(parseInsight).filter((insight): insight is Insight => insight !== null),
    },
  };
}
