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

export type ConnectionStatus = "connecting" | "live" | "reconnecting" | "offline";

export type Mode = "fan" | "analyst" | "broadcast";
