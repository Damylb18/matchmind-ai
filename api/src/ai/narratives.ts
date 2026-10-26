import type { Insight, MatchEvent, MatchMetrics, MatchState, Team } from "../types.js";
import type { AiCaller } from "./client.js";
import type { AiConfig } from "./config.js";
import { collectNumbers, validateVariants, variantsSchema, type Audience, type Variants } from "./grounding.js";

export type NarrativeFields = "headline" | "explanation";

/** Sent to clients as { type: "insight_narrative", match_id, insight_id, narrative }. */
export type InsightNarrative = {
  source: "openai";
  model: string;
  generated_at: string;
  latency_ms: number;
  variants: Variants<NarrativeFields>;
};

export type InsightContext = {
  insight: Insight;
  match: MatchState;
  metrics: MatchMetrics;
  /** The insight's own evidence events, in the order the backend cited them. */
  evidence: MatchEvent[];
  teams: Team[];
};

const LIMITS: Record<Audience, Record<NarrativeFields, number>> = {
  fan: { headline: 80, explanation: 320 },
  analyst: { headline: 90, explanation: 420 },
  broadcast: { headline: 60, explanation: 170 },
};

const formatClock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Only verified values: nothing here is estimated or invented. */
export function buildInsightPayload({ insight, match, metrics, evidence, teams }: InsightContext) {
  const teamName = (id: string) => teams.find((team) => team.id === id)?.name ?? id;
  const pressures = evidence.map((event) => event.pressure).filter((value): value is number => typeof value === "number");
  const average = pressures.length ? pressures.reduce((sum, value) => sum + value, 0) / pressures.length : null;

  return {
    match_id: match.match_id,
    home_team: teamName(match.home_team_id),
    away_team: teamName(match.away_team_id),
    score: { home: match.home_score, away: match.away_score },
    match_clock: formatClock(match.clock_seconds),
    insight: {
      type: insight.type,
      team: teamName(insight.team_id),
      minute: insight.minute,
      rule: "The team's last 5 pressure events averaged at least 0.75 intensity (0 to 1 scale).",
      pressure_average: average === null ? null : round2(average),
      pressure_values: pressures.map(round2),
      evidence_event_count: insight.evidence_event_ids.length,
    },
    match_wide_passing: {
      attempted_passes: metrics.attempted_passes,
      completed_passes: metrics.completed_passes,
      pass_accuracy_percent: metrics.pass_accuracy,
    },
  };
}

export const NARRATIVE_INSTRUCTIONS = `You write live football insight copy for MatchMind, a match-intelligence demo that runs on a SYNTHETIC (simulated) match.
You receive one verified, rule-detected insight as JSON. Write it for three audiences in four languages.

Strict grounding rules:
- Use ONLY the facts in the JSON. Never invent players, goals, shots, chances, events, statistics, formations or causes.
- Do not name any player. Use the team names exactly as given.
- Pressure intensity measures pressing intensity only. It does NOT prove territorial control, dominance or scoring threat; never claim those.
- Any number you write must appear in the JSON, written in digits exactly as given (you may use a decimal comma in es/fr). Do not compute new numbers or percentages.
- Do not mention event IDs, confidence scores or the word "synthetic".
- Write every number in digits, never in words, in every language (e.g. "7", not "seven" or "méje").
- Never round, approximate or estimate a number ("over 700", "about 0.9" are not allowed): quote the exact value or leave it out.
- Never mention a venue, stadium, competition, referee, crowd or weather: none of these are in the data.
- Be honest about uncertainty; never state tactical certainty.

Audiences:
- fan: warm, clear, accessible storytelling. headline <= 60 characters; explanation 1-2 short sentences.
- analyst: precise tactical interpretation. Cite the average and that it covers 5 pressure events, and state what the data cannot show. headline <= 70 characters; explanation 2-3 sentences.
- broadcast: short and punchy for an on-screen overlay. headline <= 45 characters; explanation one sentence of at most 120 characters.

Languages: en = English, es = Spanish, fr = French, yo = Yoruba (natural Yoruba with correct tone marks; use "titẹ" for pressure, "ìkọjá bọ́ọ̀lù" only for passes, "ìgbìyànjú sí góòlù" for shots, "góòlù" for goal). Each language must be a natural rewrite, not a word-for-word translation.`;

export async function generateInsightNarrative(
  context: InsightContext,
  caller: AiCaller,
  config: AiConfig,
  log: (message: string) => void,
): Promise<InsightNarrative> {
  const payload = buildInsightPayload(context);
  const started = Date.now();
  const response = await caller({
    instructions: NARRATIVE_INSTRUCTIONS,
    input: JSON.stringify(payload),
    schemaName: "insight_narrative",
    schema: variantsSchema(["headline", "explanation"]),
    maxOutputTokens: config.insightMaxOutputTokens,
    timeoutMs: config.insightTimeoutMs,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    throw new Error("model output was not valid JSON");
  }

  const { variants, accepted, rejected } = validateVariants(parsed, LIMITS, collectNumbers(payload), new Set());
  if (rejected.length) log(`[ai] ${context.insight.id}: dropped ${rejected.length} variant(s) — ${rejected.join("; ")}`);
  if (accepted === 0) throw new Error("no variant passed validation");

  const latency = Date.now() - started;
  log(
    `[ai] ${context.insight.id}: narrative from ${response.model} in ${latency} ms ` +
      `(${accepted}/12 variants, tokens in ${response.inputTokens ?? "?"} / out ${response.outputTokens ?? "?"})`,
  );
  return {
    source: "openai",
    model: response.model,
    generated_at: new Date().toISOString(),
    latency_ms: latency,
    variants,
  };
}
