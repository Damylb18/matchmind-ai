import { useEffect, useReducer, useState } from "react";
import { initialMatchState, isStreamMessage, matchReducer } from "../lib/matchState";
import type { ConnectionStatus } from "../types/match";

export const STREAM_URL: string =
  import.meta.env.VITE_MATCH_STREAM_URL ?? "http://localhost:4000/api/match/stream";

export function useMatchStream() {
  const [state, dispatch] = useReducer(matchReducer, initialMatchState);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  useEffect(() => {
    const source = new EventSource(STREAM_URL);

    source.onopen = () => setStatus("live");

    source.onmessage = (message) => {
      try {
        const data: unknown = JSON.parse(message.data);
        if (isStreamMessage(data)) dispatch({ type: "message", message: data });
      } catch (error) {
        console.error("Invalid match event", error);
      }
    };

    // EventSource retries on its own; CLOSED means it has given up.
    source.onerror = () =>
      setStatus(source.readyState === EventSource.CLOSED ? "offline" : "reconnecting");

    return () => source.close();
  }, []);

  return { state, status };
}
