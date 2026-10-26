import type { Insight, MatchEvent, MatchMetrics, MatchState, Team } from "../types.js";
import { createOpenAiCaller, type AiCaller } from "./client.js";
import type { AiConfig } from "./config.js";
import { generateInsightNarrative, type InsightNarrative } from "./narratives.js";
import { buildRecap, generateRecapText, type MatchRecap, type PressureMoment, type RecapPhase } from "./recaps.js";
import { AiScheduler } from "./scheduler.js";

type Options = {
  config: AiConfig;
  teams: Team[];
  /** Sends a message to every connected SSE client. */
  publish: (message: unknown) => void;
  log?: (message: string) => void;
  /** Defaults to the real OpenAI Responses API. Tests pass a mock. */
  caller?: AiCaller;
};

/**
 * Optional AI layer beside the match loop. Every method returns immediately: OpenAI work
 * runs in the scheduler, and results go out later as their own SSE messages
 * ("insight_narrative", "match_recap"). The { event, match, metrics, insights } payload is
 * never changed, and the rule-based text stays the immediate fallback.
 */
export function createMatchAi({ config, teams, publish, log = console.log, caller }: Options) {
  const call = caller ?? createOpenAiCaller(config);
  const scheduler = new AiScheduler(config, log);
  const narratives = new Map<string, { match_id: string; narrative: InsightNarrative }>();
  const recaps = new Map<RecapPhase, MatchRecap>();
  const moments: PressureMoment[] = [];
  const lastNarrativeClock = new Map<string, number>();

  const narrativeMessage = (insightId: string, entry: { match_id: string; narrative: InsightNarrative }) => ({
    type: "insight_narrative",
    match_id: entry.match_id,
    insight_id: insightId,
    narrative: entry.narrative,
  });
  const recapMessage = (recap: MatchRecap) => ({ type: "match_recap", recap });

  log(
    config.enabled
      ? `[ai] OpenAI enabled (model ${config.model}, max ${config.maxCallsPerMatch} calls per match)`
      : `[ai] OpenAI disabled (${config.disabledReason}); using rule-based text and local templates`,
  );

  /** Records insights for recaps and, for selected ones, requests a narrative. */
  function onInsights(insights: Insight[], match: MatchState, metrics: MatchMetrics, events: MatchEvent[]) {
    for (const insight of insights) {
      // The insight's own evidence, found among the most recent events.
      const wanted = new Set(insight.evidence_event_ids);
      const evidence = events.slice(-200).filter((event) => wanted.has(event.event_id));
      const pressures = evidence.map((event) => event.pressure).filter((value): value is number => typeof value === "number");
      if (insight.type === "pressure_surge" && pressures.length) {
        moments.push({
          insight_id: insight.id,
          team_id: insight.team_id,
          minute: insight.minute,
          average: Math.round((pressures.reduce((sum, value) => sum + value, 0) / pressures.length) * 100) / 100,
        });
      }

      if (!config.enabled || evidence.length !== insight.evidence_event_ids.length) continue;
      // Not every insight: a team's next narrative waits teamGapSeconds of match time.
      const last = lastNarrativeClock.get(insight.team_id);
      if (last !== undefined && match.clock_seconds - last < config.teamGapSeconds) continue;
      lastNarrativeClock.set(insight.team_id, match.clock_seconds);

      const context = { insight, match: { ...match }, metrics: { ...metrics }, evidence, teams };
      void scheduler
        .submit("insight", `narrative:${match.match_id}:${insight.id}`, () =>
          generateInsightNarrative(context, call, config, log),
        )
        .then((narrative) => {
          if (!narrative) return;
          const entry = { match_id: match.match_id, narrative };
          narratives.set(insight.id, entry);
          publish(narrativeMessage(insight.id, entry));
        });
    }
  }

  /** Builds the half-time or full-time recap once, publishes it, then adds AI text if available. */
  function onPhase(phase: RecapPhase, match: MatchState, events: MatchEvent[]) {
    if (recaps.has(phase)) return;
    const recap = buildRecap(phase, { ...match }, events, moments, config.enabled);
    recaps.set(phase, recap);
    publish(recapMessage(recap));
    if (!config.enabled) return;

    void scheduler
      .submit("recap", `recap:${match.match_id}:${phase}`, () => generateRecapText(recap, teams, call, config, log))
      .then((ai) => {
        const updated: MatchRecap = ai ? { ...recap, ai, ai_status: "ready" } : { ...recap, ai_status: "unavailable" };
        recaps.set(phase, updated);
        publish(recapMessage(updated));
      });
  }

  return {
    onInsights,
    onPhase,
    /** Messages a newly connected client needs to catch up (stored narratives and recaps). */
    replayMessages(): unknown[] {
      return [
        ...[...narratives].map(([id, entry]) => narrativeMessage(id, entry)),
        ...[...recaps.values()].map(recapMessage),
      ];
    },
    recaps: () => [...recaps.values()],
    /** Safe to expose: no key or prompt content. */
    status: () => ({
      enabled: config.enabled,
      disabled_reason: config.disabledReason,
      model: config.model,
      max_calls_per_match: config.maxCallsPerMatch,
      max_insight_calls: config.maxInsightCalls,
      narratives: narratives.size,
      recaps: [...recaps.values()].map((recap) => ({ phase: recap.phase, ai_status: recap.ai_status })),
      ...scheduler.getStats(),
    }),
  };
}

export type MatchAi = ReturnType<typeof createMatchAi>;
