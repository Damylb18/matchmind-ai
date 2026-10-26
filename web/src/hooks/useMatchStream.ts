import { useEffect, useReducer, useState } from "react";
import { initialMatchState, matchReducer } from "../lib/matchState";
import { adaptStreamPayload } from "../lib/streamAdapter";
import type { ConnectionStatus } from "../types/match";

export const STREAM_URL: string =
  import.meta.env.VITE_MATCH_STREAM_URL ?? "http://localhost:4000/api/match/stream";

/** The backend sends an event every second; this long without data means the feed has stalled. */
const STALL_MS = 5000;
const MAX_RETRY_MS = 10000;

export function useMatchStream() {
  const [state, dispatch] = useReducer(matchReducer, initialMatchState);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  useEffect(() => {
    let source: EventSource | null = null;
    let retryTimer: number | undefined;
    let stallTimer: number | undefined;
    let attempts = 0;
    let disposed = false;

    const scheduleReconnect = () => {
      window.clearTimeout(retryTimer);
      const delay = Math.min(MAX_RETRY_MS, 1000 * 2 ** attempts);
      attempts++;
      retryTimer = window.setTimeout(() => {
        if (!disposed) connect();
      }, delay);
    };

    // No data for STALL_MS on an open connection: drop it and reconnect.
    const armStallTimer = () => {
      window.clearTimeout(stallTimer);
      stallTimer = window.setTimeout(() => {
        setStatus("stalled");
        source?.close();
        scheduleReconnect();
      }, STALL_MS);
    };

    const connect = () => {
      source = new EventSource(STREAM_URL);

      // An open connection is not "live" until data actually arrives.
      source.onopen = armStallTimer;

      source.onmessage = (message) => {
        attempts = 0;
        armStallTimer();
        setStatus("live");
        try {
          const payload = adaptStreamPayload(JSON.parse(message.data));
          if (payload?.kind === "snapshot") dispatch({ type: "snapshot", match: payload.match });
          else if (payload?.kind === "status") dispatch({ type: "status", match: payload.match });
          else if (payload?.kind === "message") dispatch({ type: "message", message: payload.message });
        } catch (error) {
          console.warn("Ignored malformed match message", error);
        }
      };

      source.onerror = () => {
        window.clearTimeout(stallTimer);
        setStatus("reconnecting");
        // EventSource retries by itself unless it has given up (CLOSED), e.g. after an
        // HTTP error. In that case open a new connection with backoff.
        if (source?.readyState === EventSource.CLOSED) {
          source.close();
          scheduleReconnect();
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      window.clearTimeout(retryTimer);
      window.clearTimeout(stallTimer);
      source?.close();
    };
  }, []);

  return { state, status };
}
