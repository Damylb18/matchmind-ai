/**
 * OpenAI settings, read from environment variables only (api/.env is loaded by
 * index.ts). AI is off unless OPENAI_ENABLED=true and OPENAI_API_KEY is set; the
 * app then keeps using its rule-based text and local templates.
 */
export type AiConfig = {
  enabled: boolean;
  /** Why AI is off, for logs and /api/ai/status. Never contains the key. */
  disabledReason: string | null;
  apiKey: string;
  model: string;
  baseUrl: string;
  /** Per-request timeouts. A recap returns more text, so it gets longer. */
  insightTimeoutMs: number;
  recapTimeoutMs: number;
  insightMaxOutputTokens: number;
  recapMaxOutputTokens: number;
  /** Hard cap on OpenAI calls per match (insight narratives + recaps). */
  maxCallsPerMatch: number;
  /** Narrative calls allowed per match; the rest of the budget is kept for the two recaps. */
  maxInsightCalls: number;
  /** Minimum time between the starts of two OpenAI calls. */
  minIntervalMs: number;
  /** Narrative requests waiting at most; further insights keep their template text. */
  queueSize: number;
  /** A team's next insight gets a narrative only this many match seconds after its last one. */
  teamGapSeconds: number;
};

type Env = Record<string, string | undefined>;

const DEFAULT_MODEL = "gpt-4.1-mini";

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

export function loadAiConfig(env: Env = process.env): AiConfig {
  const apiKey = (env.OPENAI_API_KEY ?? "").trim();
  const flag = (env.OPENAI_ENABLED ?? "").trim().toLowerCase();
  const switchedOn = flag === "true" || flag === "1";

  const disabledReason = !switchedOn
    ? "OPENAI_ENABLED is not set to true"
    : !apiKey
      ? "OPENAI_API_KEY is missing"
      : null;

  const maxCallsPerMatch = positiveInt(env.OPENAI_MAX_CALLS_PER_MATCH, 10);

  return {
    enabled: disabledReason === null,
    disabledReason,
    apiKey,
    model: (env.OPENAI_MODEL ?? "").trim() || DEFAULT_MODEL,
    baseUrl: "https://api.openai.com/v1",
    insightTimeoutMs: positiveInt(env.OPENAI_TIMEOUT_MS, 30_000),
    recapTimeoutMs: positiveInt(env.OPENAI_RECAP_TIMEOUT_MS, 60_000),
    insightMaxOutputTokens: positiveInt(env.OPENAI_MAX_OUTPUT_TOKENS, 2000),
    recapMaxOutputTokens: positiveInt(env.OPENAI_RECAP_MAX_OUTPUT_TOKENS, 3500),
    maxCallsPerMatch,
    // Two calls stay reserved for the half-time and full-time recaps.
    maxInsightCalls: Math.min(positiveInt(env.OPENAI_MAX_INSIGHT_CALLS, 8), Math.max(0, maxCallsPerMatch - 2)),
    minIntervalMs: positiveInt(env.OPENAI_MIN_INTERVAL_MS, 2000),
    queueSize: positiveInt(env.OPENAI_QUEUE_SIZE, 3),
    teamGapSeconds: positiveInt(env.OPENAI_TEAM_GAP_SECONDS, 600),
  };
}
