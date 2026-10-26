// Mirrors api/src/types.ts — keep in sync with the backend contract.

export type EventType = "pass" | "shot" | "tackle" | "pressure";

export type MatchEvent = {
  event_id: string;
  match_id: string;
  minute: number;
  second: number;
  team: string;
  player: string;
  event_type: EventType;
  completed?: boolean;
  pressure?: number;
  /** e.g. "successful", "goal", "saved" — sent by the current backend. */
  outcome?: string;
  /**
   * Not emitted by the current backend. Reserved for a future feed: pitch
   * coordinates on a 0–100 scale (x along the pitch towards the opponent's
   * goal, y across it) and the pass receiver. UI shows these only when present.
   */
  x?: number;
  y?: number;
  end_x?: number;
  end_y?: number;
  receiver?: string;
};

export type Insight = {
  id: string;
  type: string;
  headline: string;
  explanation: string;
  minute: number;
  evidence_event_ids: string[];
  /** Sent by the current backend; optional so older payloads still parse. */
  team_id?: string;
  confidence?: number;
  /**
   * Optional structured values (e.g. pressureAverage, completedPasses) read by the
   * personalisation templates in lib/explanation.tsx. Not sent by the current backend.
   */
  data?: Record<string, unknown>;
};

/** Match-wide totals calculated by the backend over every event since it started. */
export type MatchMetrics = {
  attempted_passes: number;
  completed_passes: number;
  pass_accuracy: number;
};

export type BackendMatchState = {
  match_id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  clock_seconds: number;
  status: "live" | "half_time" | "full_time";
};

export type StreamMessage = {
  match?: BackendMatchState;
  event: MatchEvent;
  metrics: MatchMetrics;
  insights: Insight[];
};

/** "stalled": the connection is open but no data has arrived for several seconds. */
export type ConnectionStatus = "connecting" | "live" | "stalled" | "reconnecting" | "offline";

export type Mode = "fan" | "analyst" | "broadcast";

// --- Optional AI messages (sent separately; the event payload above is unchanged) ---

export type NarrativeLanguage = "en" | "es" | "fr" | "yo";
export type NarrativeAudience = "fan" | "analyst" | "broadcast";
export type AiVariants<F extends string> = Partial<
  Record<NarrativeLanguage, Partial<Record<NarrativeAudience, Record<F, string>>>>
>;

/** OpenAI wording for one backend insight, validated against its evidence by the backend. */
export type InsightNarrative = {
  insightId: string;
  model: string;
  generatedAt: string;
  variants: AiVariants<"headline" | "explanation">;
};

export type TeamRecapStats = {
  passes: number;
  completed_passes: number;
  pass_accuracy: number | null;
  shots: number;
  shots_on_target: number;
  goals: number;
  tackles: number;
  tackles_won: number;
  pressure_events: number;
  average_pressure: number | null;
  high_pressure_events: number;
};

/** Half-time / full-time recap. Statistics are computed by the backend from the actual events. */
export type MatchRecap = {
  match_id: string;
  phase: "half_time" | "full_time";
  clock_seconds: number;
  home_team_id: string;
  away_team_id: string;
  score: { home: number; away: number };
  events_analysed: number;
  teams: Record<string, TeamRecapStats>;
  pressure_surges: Record<string, number>;
  key_moments: { insight_id: string; team_id: string; minute: number; average: number }[];
  /** pending: AI text requested; ready: `ai` present; unavailable: local summary only. */
  ai_status: "pending" | "ready" | "unavailable";
  ai: { model: string; generatedAt: string; variants: AiVariants<"headline" | "summary"> } | null;
};
