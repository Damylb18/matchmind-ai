import { createContext } from "react";
import type { InsightNarrative } from "../types/match";

/** OpenAI narratives received from the backend, keyed by insight id. Empty when AI is off. */
export const NarrativeContext = createContext<Readonly<Record<string, InsightNarrative>>>({});
