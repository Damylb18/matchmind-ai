import { createContext } from "react";
import type { MatchEvent } from "../types/match";

/** Current-match events, by ID, so insight personalisation can read its own evidence. */
export const EvidenceContext = createContext<ReadonlyMap<string, MatchEvent>>(new Map());
