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

export type StreamMessage = {
  event: MatchEvent;
  metrics: MatchMetrics;
  insights: Insight[];
};

export type ConnectionStatus = "connecting" | "live" | "reconnecting" | "offline";

export type Mode = "fan" | "analyst" | "broadcast";
