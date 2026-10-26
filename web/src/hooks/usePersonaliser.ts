import { useContext } from "react";
import { EvidenceContext } from "../lib/evidenceContext";
import { useExplanationPreferences, type ExplanationAudience } from "../lib/explanation";
import { NarrativeContext } from "../lib/narrativeContext";
import { personalise } from "../lib/personalisation";
import type { Insight } from "../types/match";

/** Returns a function that personalises an insight for this audience in the selected language. */
export function usePersonaliser(audience: ExplanationAudience) {
  const { language } = useExplanationPreferences();
  const eventsById = useContext(EvidenceContext);
  const narratives = useContext(NarrativeContext);
  return (insight: Insight) => personalise(insight, audience, language, eventsById, narratives[insight.id]);
}
