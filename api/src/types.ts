export type EventType = "pass" | "shot" | "tackle" | "pressure";

export type EventOutcome =

  | "successful"

  | "unsuccessful"

  | "on_target"

  | "off_target"

  | "saved"

  | "goal"

  | "blocked"

  | "unknown";

  export type Player = {

  id: string;

  name: string;

  team_id: string;

  position: "GK" | "DEF" | "MID" | "FWD";

  shirt_number: number;

};

export type Team = {

  id: string;

  name: string;

  short_name: string;

};

export type MatchStatus = "live" | "half_time" | "full_time";

export type MatchState = {

  match_id: string;

  home_team_id: string;

  away_team_id: string;

  home_score: number;

  away_score: number;

  clock_seconds: number;

  status: MatchStatus;

};

export type MatchEvent = {
  event_id: string;
  match_id: string;
  minute: number;
  second: number;
  team_id: string;
  player_id: string;
  event_type: EventType;

  // Normalised pitch coordinates: x and y range from 0 to 100.

  x?: number;

  y?: number;

  end_x?: number;

  end_y?: number;

  recipient_player_id?: string;

  outcome?: EventOutcome;

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
  team_id: string;
  confidence: number;
};

export type MatchMetrics = {
  attempted_passes: number;
  completed_passes: number;
  pass_accuracy: number;
  incomplete_passes: number;
};

export type ProcessedEvent = {
  event: MatchEvent;
  match: MatchState;
  metrics: MatchMetrics;
  insights: Insight[];
};
