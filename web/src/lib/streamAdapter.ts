
import type { MatchEvent, StreamMessage } from "../types/match";

type BackendEvent = Omit<MatchEvent, "team" | "player" | "receiver"> & {
  team_id: string;
  player_id: string;
  recipient_player_id?: string;
  end_x?: number;
  end_y?: number;
  outcome?: string;
};

type BackendMessage = {
  event: BackendEvent;
  metrics: StreamMessage["metrics"];
  insights: StreamMessage["insights"];
  match?: StreamMessage["match"];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function adaptStreamMessage(value: unknown): StreamMessage | null {
  if (!isRecord(value)) return null;

  // The backend sends this when the SSE connection opens.
  // It is not a match event.
  if (value.type === "connected") return null;

  if (!isRecord(value.event) || !isRecord(value.metrics) || !Array.isArray(value.insights)) {
    return null;
  }

  const event = value.event;

  if (
    typeof event.event_id !== "string" ||
    typeof event.minute !== "number" ||
    typeof event.second !== "number" ||
    typeof event.event_type !== "string"
  ) {
    return null;
  }

  const team =
    typeof event.team === "string" ? event.team :
    typeof event.team_id === "string" ? event.team_id :
    null;

  const player =
    typeof event.player === "string" ? event.player :
    typeof event.player_id === "string" ? event.player_id :
    null;

  if (!team || !player) return null;

  const backend = value as unknown as BackendMessage;

  return {
    match: backend.match,
    event: {
      ...backend.event,
      team,
      player,
      receiver:
        typeof event.receiver === "string" ? event.receiver :
        typeof event.recipient_player_id === "string"
          ? event.recipient_player_id
          : undefined,
    },
    metrics: backend.metrics,
    insights: backend.insights,
  };
}
