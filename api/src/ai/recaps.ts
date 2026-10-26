import type { MatchEvent, MatchState, Team } from "../types.js";
import type { AiCaller } from "./client.js";
import type { AiConfig } from "./config.js";
import { collectNumbers, validateVariants, variantsSchema, type Audience, type Variants } from "./grounding.js";

export type RecapPhase = "half_time" | "full_time";
export type RecapFields = "headline" | "summary";

export type TeamRecapStats = {
  passes: number;
  completed_passes: number;
  /** Whole percent, or null with no passes. */
  pass_accuracy: number | null;
  shots: number;
  shots_on_target: number;
  goals: number;
  tackles: number;
  tackles_won: number;
  pressure_events: number;
  /** Mean pressure intensity (2 dp), or null without pressure events. */
  average_pressure: number | null;
  high_pressure_events: number;
};

export type PressureMoment = {
  insight_id: string;
  team_id: string;
  minute: number;
  /** Average of the insight's evidence events (2 dp). */
  average: number;
};

/** Sent as { type: "match_recap", recap }. Statistics are computed here, never by the model. */
export type MatchRecap = {
  match_id: string;
  phase: RecapPhase;
  created_at: string;
  clock_seconds: number;
  home_team_id: string;
  away_team_id: string;
  score: { home: number; away: number };
  events_analysed: number;
  teams: Record<string, TeamRecapStats>;
  /** For full time only: the same statistics for each half. */
  halves?: { first: Record<string, TeamRecapStats>; second: Record<string, TeamRecapStats> };
  pressure_surges: Record<string, number>;
  /** Up to five strongest surges, in match order. */
  key_moments: PressureMoment[];
  /** pending: AI text requested; ready: `ai` filled; unavailable: show the deterministic recap. */
  ai_status: "pending" | "ready" | "unavailable";
  ai: null | {
    source: "openai";
    model: string;
    generated_at: string;
    latency_ms: number;
    variants: Variants<RecapFields>;
  };
};

const HIGH_PRESSURE = 0.75;
const round2 = (value: number) => Math.round(value * 100) / 100;

export function teamStats(events: MatchEvent[], teamId: string): TeamRecapStats {
  const own = events.filter((event) => event.team_id === teamId);
  const passes = own.filter((event) => event.event_type === "pass");
  const completed = passes.filter((event) => event.completed === true).length;
  const shots = own.filter((event) => event.event_type === "shot");
  const tackles = own.filter((event) => event.event_type === "tackle");
  const pressures = own
    .filter((event) => event.event_type === "pressure" && typeof event.pressure === "number")
    .map((event) => event.pressure!);

  return {
    passes: passes.length,
    completed_passes: completed,
    pass_accuracy: passes.length ? Math.round((completed / passes.length) * 100) : null,
    shots: shots.length,
    shots_on_target: shots.filter((event) => ["on_target", "saved", "goal"].includes(event.outcome ?? "")).length,
    goals: shots.filter((event) => event.outcome === "goal").length,
    tackles: tackles.length,
    tackles_won: tackles.filter((event) => event.outcome === "successful").length,
    pressure_events: pressures.length,
    average_pressure: pressures.length ? round2(pressures.reduce((sum, value) => sum + value, 0) / pressures.length) : null,
    high_pressure_events: pressures.filter((value) => value >= HIGH_PRESSURE).length,
  };
}

const statsFor = (events: MatchEvent[], match: MatchState) => ({
  [match.home_team_id]: teamStats(events, match.home_team_id),
  [match.away_team_id]: teamStats(events, match.away_team_id),
});

export function buildRecap(
  phase: RecapPhase,
  match: MatchState,
  events: MatchEvent[],
  moments: PressureMoment[],
  aiEnabled: boolean,
): MatchRecap {
  const surges: Record<string, number> = { [match.home_team_id]: 0, [match.away_team_id]: 0 };
  for (const moment of moments) surges[moment.team_id] = (surges[moment.team_id] ?? 0) + 1;

  const keyMoments = [...moments]
    .sort((a, b) => b.average - a.average || a.minute - b.minute)
    .slice(0, 5)
    .sort((a, b) => a.minute - b.minute);

  const recap: MatchRecap = {
    match_id: match.match_id,
    phase,
    created_at: new Date().toISOString(),
    clock_seconds: match.clock_seconds,
    home_team_id: match.home_team_id,
    away_team_id: match.away_team_id,
    score: { home: match.home_score, away: match.away_score },
    events_analysed: events.length,
    teams: statsFor(events, match),
    pressure_surges: surges,
    key_moments: keyMoments,
    ai_status: aiEnabled ? "pending" : "unavailable",
    ai: null,
  };

  if (phase === "full_time") {
    const firstHalfEnd = 45 * 60;
    const clock = (event: MatchEvent) => event.minute * 60 + event.second;
    recap.halves = {
      first: statsFor(events.filter((event) => clock(event) <= firstHalfEnd), match),
      second: statsFor(events.filter((event) => clock(event) > firstHalfEnd), match),
    };
  }
  return recap;
}

/** What the model sees: team names instead of IDs, and only the recap's own numbers. */
export function buildRecapPayload(recap: MatchRecap, teams: Team[]) {
  const name = (id: string) => teams.find((team) => team.id === id)?.name ?? id;
  const named = (stats: Record<string, TeamRecapStats>) =>
    Object.fromEntries(Object.entries(stats).map(([id, value]) => [name(id), value]));

  return {
    phase: recap.phase === "half_time" ? "half-time (after 45 minutes)" : "full-time (after 90 minutes)",
    home_team: name(recap.home_team_id),
    away_team: name(recap.away_team_id),
    score: { home: recap.score.home, away: recap.score.away },
    events_analysed: recap.events_analysed,
    team_stats: named(recap.teams),
    ...(recap.halves ? { first_half: named(recap.halves.first), second_half: named(recap.halves.second) } : {}),
    pressure_surges_detected: Object.fromEntries(
      Object.entries(recap.pressure_surges).map(([id, count]) => [name(id), count]),
    ),
    strongest_pressure_moments: recap.key_moments.map((moment) => ({
      team: name(moment.team_id),
      minute: moment.minute,
      average_pressure: moment.average,
    })),
    notes: [
      "A pressure surge is detected when a team's last 5 pressure events average at least 0.75 intensity (0 to 1 scale).",
      "Pressure intensity measures pressing intensity only; it does not prove territorial control or chance quality.",
      "No player names, xG, possession or location data is available.",
    ],
  };
}

const LIMITS: Record<Audience, Record<RecapFields, number>> = {
  fan: { headline: 90, summary: 700 },
  analyst: { headline: 100, summary: 900 },
  broadcast: { headline: 70, summary: 260 },
};

export const RECAP_INSTRUCTIONS = `You write match recaps for MatchMind, a match-intelligence demo that runs on a SYNTHETIC (simulated) match.
You receive verified, accumulated statistics as JSON. Write a recap for three audiences in four languages.

Strict grounding rules:
- Use ONLY the facts in the JSON. Never invent goals, scorers, players, chances, events, possession, xG or causes.
- Do not name any player. Use team names exactly as given.
- State the score exactly as given. If the score is level or goalless, say so plainly.
- Any number you write must appear in the JSON, written in digits exactly as given (decimal comma allowed in es/fr). Do not compute new numbers, differences or percentages.
- Pressure intensity measures pressing intensity only; it does not prove control or threat.
- Where the data cannot support a stronger claim, say so briefly (e.g. no location or chance-quality data).
- Do not mention the word "synthetic", event IDs or confidence scores.
- Write every number in digits, never in words, in every language (e.g. "7", not "seven" or "méje").
- Never round, approximate or estimate a number ("over 700", "about 0.9" are not allowed): quote the exact value or leave it out.
- Never mention a venue, stadium, competition, referee, crowd or weather: none of these are in the data.
- Do not call the teams' numbers equal or identical unless the values are exactly the same.

Each recap covers: the score, the key statistical patterns, the significant pressure moments, and a concise account of how the match developed.

Audiences:
- fan: engaging, accessible story. headline <= 70 characters; summary 3-4 sentences.
- analyst: precise and evidence-led, comparing the teams' numbers and naming the data's limits. headline <= 80 characters; summary 4-5 sentences.
- broadcast: punchy on-screen copy. headline <= 50 characters; summary at most 2 short sentences (max 220 characters).

Languages: en = English, es = Spanish, fr = French, yo = Yoruba (natural Yoruba with correct tone marks; use "titẹ" for pressure, "ìkọjá bọ́ọ̀lù" only for passes, "ìgbìyànjú sí góòlù" for shots, "góòlù" for goal). Each language is a natural rewrite.`;

export async function generateRecapText(
  recap: MatchRecap,
  teams: Team[],
  caller: AiCaller,
  config: AiConfig,
  log: (message: string) => void,
): Promise<NonNullable<MatchRecap["ai"]>> {
  const payload = buildRecapPayload(recap, teams);
  const started = Date.now();
  const response = await caller({
    instructions: RECAP_INSTRUCTIONS,
    input: JSON.stringify(payload),
    schemaName: "match_recap",
    schema: variantsSchema(["headline", "summary"]),
    maxOutputTokens: config.recapMaxOutputTokens,
    timeoutMs: config.recapTimeoutMs,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    throw new Error("model output was not valid JSON");
  }

  const { variants, accepted, rejected } = validateVariants(parsed, LIMITS, collectNumbers(payload), new Set());
  if (rejected.length) log(`[ai] ${recap.phase} recap: dropped ${rejected.length} variant(s) — ${rejected.join("; ")}`);
  if (accepted === 0) throw new Error("no recap variant passed validation");

  const latency = Date.now() - started;
  log(
    `[ai] ${recap.phase} recap from ${response.model} in ${latency} ms ` +
      `(${accepted}/12 variants, tokens in ${response.inputTokens ?? "?"} / out ${response.outputTokens ?? "?"})`,
  );
  return { source: "openai", model: response.model, generated_at: new Date().toISOString(), latency_ms: latency, variants };
}
