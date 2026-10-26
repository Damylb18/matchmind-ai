import type {
  AiVariants,
  BackendMatchState,
  EventType,
  Insight,
  InsightNarrative,
  MatchEvent,
  MatchMetrics,
  MatchRecap,
  StreamMessage,
  TeamRecapStats,
} from "../types/match";
import { TEAMS } from "../data/teams";

/**
 * Converts raw SSE payloads into the frontend model. Anything malformed is
 * dropped (or, for optional parts, ignored) rather than passed to the UI.
 */
export type StreamPayload =
  /** Sent when a connection opens: the current match state, no event. */
  | { kind: "snapshot"; match: BackendMatchState }
  /** Sent during half-time / after full-time, when no events are generated. */
  | { kind: "status"; match: BackendMatchState }
  | { kind: "message"; message: StreamMessage }
  /** Optional OpenAI wording for an insight already received (matched by insight id). */
  | { kind: "narrative"; narrative: InsightNarrative }
  /** Half-time / full-time recap (deterministic stats, plus AI text when available). */
  | { kind: "recap"; recap: MatchRecap };

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

const AI_LANGUAGES = ["en", "es", "fr", "yo"] as const;
const AI_AUDIENCES = ["fan", "analyst", "broadcast"] as const;

/** Keeps only complete language/audience entries whose fields are non-empty strings. */
function parseVariants<F extends string>(value: unknown, fields: readonly F[]): AiVariants<F> {
  const variants: AiVariants<F> = {};
  if (!isRecord(value)) return variants;
  for (const lang of AI_LANGUAGES) {
    const byAudience = value[lang];
    if (!isRecord(byAudience)) continue;
    for (const audience of AI_AUDIENCES) {
      const entry = byAudience[audience];
      if (!isRecord(entry)) continue;
      if (!fields.every((field) => typeof entry[field] === "string" && (entry[field] as string).trim())) continue;
      const out = Object.fromEntries(fields.map((field) => [field, (entry[field] as string).trim()])) as Record<F, string>;
      (variants[lang] ??= {})[audience] = out;
    }
  }
  return variants;
}

const hasVariants = (variants: AiVariants<string>) => Object.keys(variants).length > 0;

function parseNarrative(value: Record<string, unknown>): InsightNarrative | null {
  const narrative = value.narrative;
  if (typeof value.insight_id !== "string" || !isRecord(narrative) || typeof narrative.model !== "string") return null;
  const variants = parseVariants(narrative.variants, ["headline", "explanation"] as const);
  if (!hasVariants(variants)) return null;
  return {
    insightId: value.insight_id,
    model: narrative.model,
    generatedAt: typeof narrative.generated_at === "string" ? narrative.generated_at : "",
    variants,
  };
}

const RECAP_STAT_KEYS: (keyof TeamRecapStats)[] = [
  "passes",
  "completed_passes",
  "pass_accuracy",
  "shots",
  "shots_on_target",
  "goals",
  "tackles",
  "tackles_won",
  "pressure_events",
  "average_pressure",
  "high_pressure_events",
];

function parseTeamStats(value: unknown): TeamRecapStats | null {
  if (!isRecord(value)) return null;
  for (const key of RECAP_STAT_KEYS) {
    const stat = value[key];
    const nullable = key === "pass_accuracy" || key === "average_pressure";
    if (!(isCount(stat) || (nullable && stat === null))) return null;
  }
  return Object.fromEntries(RECAP_STAT_KEYS.map((key) => [key, value[key]])) as TeamRecapStats;
}

function parseRecap(value: unknown): MatchRecap | null {
  if (!isRecord(value)) return null;
  const { match_id, phase, clock_seconds, home_team_id, away_team_id, score, events_analysed, teams, ai_status } = value;
  if (
    typeof match_id !== "string" ||
    (phase !== "half_time" && phase !== "full_time") ||
    !isCount(clock_seconds) ||
    typeof home_team_id !== "string" ||
    typeof away_team_id !== "string" ||
    !isRecord(score) ||
    !isCount(score.home) ||
    !isCount(score.away) ||
    !isCount(events_analysed) ||
    !isRecord(teams) ||
    (ai_status !== "pending" && ai_status !== "ready" && ai_status !== "unavailable")
  ) {
    return null;
  }
  const home = parseTeamStats(teams[home_team_id]);
  const away = parseTeamStats(teams[away_team_id]);
  if (!home || !away) return null;

  const surges = isRecord(value.pressure_surges) ? value.pressure_surges : {};
  const moments = Array.isArray(value.key_moments) ? value.key_moments : [];
  let ai: MatchRecap["ai"] = null;
  if (isRecord(value.ai) && typeof value.ai.model === "string") {
    const variants = parseVariants(value.ai.variants, ["headline", "summary"] as const);
    if (hasVariants(variants)) {
      ai = {
        model: value.ai.model,
        generatedAt: typeof value.ai.generated_at === "string" ? value.ai.generated_at : "",
        variants,
      };
    }
  }

  return {
    match_id,
    phase,
    clock_seconds,
    home_team_id,
    away_team_id,
    score: { home: score.home, away: score.away },
    events_analysed,
    teams: { [home_team_id]: home, [away_team_id]: away },
    pressure_surges: {
      [home_team_id]: isCount(surges[home_team_id]) ? surges[home_team_id] : 0,
      [away_team_id]: isCount(surges[away_team_id]) ? surges[away_team_id] : 0,
    },
    key_moments: moments.filter(
      (moment): moment is MatchRecap["key_moments"][number] =>
        isRecord(moment) &&
        typeof moment.insight_id === "string" &&
        typeof moment.team_id === "string" &&
        isCount(moment.minute) &&
        typeof moment.average === "number",
    ),
    // A "ready" recap whose AI text failed to parse is shown as the local summary.
    ai_status: ai_status === "ready" && !ai ? "unavailable" : ai_status,
    ai,
  };
}

export function adaptStreamPayload(value: unknown): StreamPayload | null {
  if (!isRecord(value)) return null;

  // Optional AI wording for an earlier insight. Older clients ignore this type.
  if (value.type === "insight_narrative") {
    const narrative = parseNarrative(value);
    return narrative ? { kind: "narrative", narrative } : null;
  }

  if (value.type === "match_recap") {
    const recap = parseRecap(value.recap);
    return recap ? { kind: "recap", recap } : null;
  }

  // Sent when an SSE connection opens. Carries the current match state but no event.
  if (value.type === "connected") {
    const match = parseMatch(value.match);
    return match ? { kind: "snapshot", match } : null;
  }

  // Match status update (half-time, second half resuming, full-time). No event.
  if (value.type === "match_status") {
    const match = parseMatch(value.match);
    return match ? { kind: "status", match } : null;
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
