
import { useEffect, useReducer, useState } from "react";
import { initialMatchState, isStreamMessage, matchReducer } from "../lib/matchState";
import { adaptStreamMessage } from "../lib/streamAdapter";
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
        const adapted = adaptStreamMessage(data);

        if (adapted && isStreamMessage(adapted)) {
          dispatch({ type: "message", message: adapted });
        }
      } catch (error) {
        console.error("Invalid match event", error);
      }
    };

    source.onerror = () =>
      setStatus(source.readyState === EventSource.CLOSED ? "offline" : "reconnecting");

    return () => source.close();
  }, []);

  return { state, status };
}
