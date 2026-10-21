import { useEffect, useReducer, useRef } from "react";
import { initialProduction, liveDuration, productionReducer } from "./productionState";

/**
 * Production state plus the auto-advance timer. Called from App so the production
 * persists across mode switches.
 * The timer runs only while output is on and auto-advance is enabled, restarts
 * on every take, and is cleared on any change or unmount.
 */
export function useProduction(clock: number | null) {
  const [state, dispatch] = useReducer(productionReducer, initialProduction);
  const clockRef = useRef(clock);

  useEffect(() => {
    clockRef.current = clock;
  }, [clock]);

  const duration = liveDuration(state);
  const autoRunning = state.output && state.autoAdvance && duration !== null && state.playlist.length > 0;
  const take = state.program.take;

  useEffect(() => {
    if (!autoRunning || duration === null) return;
    const timer = window.setTimeout(
      () => dispatch({ type: "takeNext", clock: clockRef.current }),
      duration * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [autoRunning, duration, take]);

  return { state, dispatch, duration, autoRunning };
}

export type Production = ReturnType<typeof useProduction>;
