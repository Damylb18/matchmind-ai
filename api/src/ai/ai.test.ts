// Mocked tests for the OpenAI layer — no network calls, no charges.
// Run from api/: npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Insight, MatchEvent, MatchMetrics, MatchState } from "../types.js";
import { createOpenAiCaller, redactSecrets, type AiCaller, type AiRequest } from "./client.js";
import { loadAiConfig, type AiConfig } from "./config.js";
import { checkGrounding, collectNumbers, hasYorubaNumberWord } from "./grounding.js";
import { createMatchAi } from "./matchAi.js";
import { buildInsightPayload } from "./narratives.js";
import { buildRecap } from "./recaps.js";
import { AiScheduler } from "./scheduler.js";

const TEAMS = [
  { id: "man_utd", name: "Manchester United", short_name: "MUN" },
  { id: "arsenal", name: "Arsenal", short_name: "ARS" },
];
const FAKE_KEY = "sk-test-0123456789abcdef";

const config = (overrides: Partial<AiConfig> = {}): AiConfig => ({
  ...loadAiConfig({ OPENAI_ENABLED: "true", OPENAI_API_KEY: FAKE_KEY }),
  minIntervalMs: 0,
  ...overrides,
});

const match = (overrides: Partial<MatchState> = {}): MatchState => ({
  match_id: "match_001",
  home_team_id: "man_utd",
  away_team_id: "arsenal",
  home_score: 0,
  away_score: 0,
  clock_seconds: 4,
  status: "live",
  ...overrides,
});

const pressureEvents = (values: number[], team = "man_utd", start = 1): MatchEvent[] =>
  values.map((pressure, index) => ({
    event_id: `evt_${start + index}`,
    match_id: "match_001",
    minute: 0,
    second: start + index - 1,
    team_id: team,
    player_id: "mun_7",
    event_type: "pressure",
    pressure,
  }));

const insightFor = (events: MatchEvent[], id = "insight_1"): Insight => ({
  id,
  type: "pressure_surge",
  headline: "man_utd: sustained pressure is building",
  explanation: "rule text",
  minute: events.at(-1)!.minute,
  team_id: events.at(-1)!.team_id,
  confidence: 0.9,
  evidence_event_ids: events.map((event) => event.event_id),
});

const METRICS: MatchMetrics = {
  attempted_passes: 0,
  completed_passes: 0,
  incomplete_passes: 0,
  pass_accuracy: 0,
};

/** Builds a model answer with every language/audience filled by `make`. */
function variants(fields: [string, string], make: (lang: string, audience: string) => [string, string]) {
  const out: Record<string, Record<string, Record<string, string>>> = {};
  for (const lang of ["en", "es", "fr", "yo"]) {
    out[lang] = {};
    for (const audience of ["fan", "analyst", "broadcast"]) {
      const [a, b] = make(lang, audience);
      out[lang][audience] = { [fields[0]]: a, [fields[1]]: b };
    }
  }
  return JSON.stringify(out);
}

const mockCaller = (text: (request: AiRequest) => string, calls: AiRequest[] = []): AiCaller => async (request) => {
  calls.push(request);
  return { text: text(request), model: "gpt-4.1-mini-mock", responseId: "resp_mock", inputTokens: 10, outputTokens: 20 };
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe("config", () => {
  it("is off without OPENAI_ENABLED=true or without a key", () => {
    assert.equal(loadAiConfig({}).enabled, false);
    assert.equal(loadAiConfig({ OPENAI_API_KEY: FAKE_KEY }).enabled, false);
    assert.equal(loadAiConfig({ OPENAI_ENABLED: "true" }).enabled, false);
    assert.equal(loadAiConfig({ OPENAI_ENABLED: "true" }).disabledReason, "OPENAI_API_KEY is missing");
  });
  it("defaults to gpt-4.1-mini and honours OPENAI_MODEL", () => {
    assert.equal(loadAiConfig({}).model, "gpt-4.1-mini");
    assert.equal(loadAiConfig({ OPENAI_MODEL: "gpt-4.1" }).model, "gpt-4.1");
  });
  it("keeps two calls in reserve for the recaps", () => {
    const c = loadAiConfig({ OPENAI_MAX_CALLS_PER_MATCH: "5", OPENAI_MAX_INSIGHT_CALLS: "8" });
    assert.equal(c.maxInsightCalls, 3);
  });
});

describe("grounding", () => {
  const allowed = collectNumbers({ average: 0.85, values: [0.81, 0.9], window: 5, clock: "00:04" });
  it("accepts numbers from the evidence, incl. decimal commas and rounding", () => {
    assert.deepEqual(checkGrounding("Averaging 0.85 across 5 events", allowed, new Set()), { ok: true });
    assert.deepEqual(checkGrounding("con una media de 0,85", allowed, new Set()), { ok: true });
    assert.deepEqual(checkGrounding("around 0.9", allowed, new Set()), { ok: true });
  });
  it("rejects invented numbers and unsupplied identifiers", () => {
    assert.equal(checkGrounding("They have 3 shots", allowed, new Set()).ok, false);
    assert.equal(checkGrounding("62% possession", allowed, new Set()).ok, false);
    assert.equal(checkGrounding("mun_9 pressed hard", allowed, new Set()).ok, false);
    assert.equal(checkGrounding("Stalemate at Old Trafford", allowed, new Set()).ok, false);
    assert.equal(checkGrounding("Empate en el estadio", allowed, new Set()).ok, false);
  });
  it("flags Yoruba number words it cannot verify, but not 'both teams'", () => {
    assert.equal(hasYorubaNumberWord("Arsenal ní 8 pẹ̀lú mẹ́jọ tó tọ́ sí àfojúsùn"), true);
    assert.equal(hasYorubaNumberWord("àwọn ìṣe titẹ márùn-ún"), true);
    assert.equal(hasYorubaNumberWord("Ẹgbẹ́ méjèèjì ní góòlù kan"), false);
    assert.equal(hasYorubaNumberWord("ẹgbẹ́ méjì, 0.85 ní ìṣẹ́jú 10"), false);
  });
});

describe("OpenAI client (mocked fetch)", () => {
  const okBody = {
    id: "resp_1",
    model: "gpt-4.1-mini-2025-04-14",
    status: "completed",
    usage: { input_tokens: 100, output_tokens: 50 },
    output: [{ type: "message", content: [{ type: "output_text", text: '{"ok":true}' }] }],
  };
  const request: AiRequest = {
    instructions: "i",
    input: "{}",
    schemaName: "x",
    schema: { type: "object" },
    maxOutputTokens: 100,
    timeoutMs: 1000,
  };

  it("sends a strict json_schema Responses request with the key only in the header", async () => {
    let sent: { url: string; init: RequestInit } | null = null;
    const fetchMock = (async (url: string, init: RequestInit) => {
      sent = { url, init };
      return new Response(JSON.stringify(okBody), { status: 200 });
    }) as unknown as typeof fetch;
    const result = await createOpenAiCaller(config(), fetchMock)(request);
    assert.equal(result.text, '{"ok":true}');
    assert.equal(result.model, "gpt-4.1-mini-2025-04-14");
    assert.ok(sent);
    const { url, init } = sent as { url: string; init: RequestInit };
    assert.equal(url, "https://api.openai.com/v1/responses");
    const body = JSON.parse(String(init.body));
    assert.equal(body.model, "gpt-4.1-mini");
    assert.equal(body.text.format.type, "json_schema");
    assert.equal(body.text.format.strict, true);
    assert.equal(body.max_output_tokens, 100);
    assert.equal(body.store, false);
    assert.ok(!String(init.body).includes(FAKE_KEY));
    assert.equal((init.headers as Record<string, string>).Authorization, `Bearer ${FAKE_KEY}`);
  });

  it("redacts keys from API errors", async () => {
    const fetchMock = (async () =>
      new Response(JSON.stringify({ error: { message: `Incorrect API key provided: ${FAKE_KEY}` } }), {
        status: 401,
      })) as unknown as typeof fetch;
    await assert.rejects(createOpenAiCaller(config(), fetchMock)(request), (error: Error) => {
      assert.match(error.message, /HTTP 401/);
      assert.ok(!error.message.includes(FAKE_KEY));
      return true;
    });
    assert.equal(redactSecrets(`key ${FAKE_KEY}`), "key sk-***");
  });

  it("times out", async () => {
    const fetchMock = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      })) as unknown as typeof fetch;
    await assert.rejects(createOpenAiCaller(config(), fetchMock)({ ...request, timeoutMs: 30 }), /timed out/);
  });

  it("rejects incomplete (token-limited) responses", async () => {
    const fetchMock = (async () =>
      new Response(JSON.stringify({ ...okBody, status: "incomplete", incomplete_details: { reason: "max_output_tokens" } }), {
        status: 200,
      })) as unknown as typeof fetch;
    await assert.rejects(createOpenAiCaller(config(), fetchMock)(request), /max_output_tokens/);
  });
});

describe("scheduler", () => {
  const quiet = () => {};
  it("enforces the per-match budget, keeping room for recaps", async () => {
    const scheduler = new AiScheduler(config({ maxCallsPerMatch: 3, maxInsightCalls: 1 }), quiet);
    assert.equal(await scheduler.submit("insight", "a", async () => 1), 1);
    assert.equal(await scheduler.submit("insight", "b", async () => 2), null);
    assert.equal(await scheduler.submit("recap", "c", async () => 3), 3);
    assert.equal(await scheduler.submit("recap", "d", async () => 4), 4);
    assert.equal(await scheduler.submit("recap", "e", async () => 5), null);
  });
  it("bounds the queue, caches by key and turns failures into null", async () => {
    const scheduler = new AiScheduler(config({ queueSize: 1, maxInsightCalls: 10, maxCallsPerMatch: 12 }), quiet);
    let release!: () => void;
    const first = scheduler.submit("insight", "slow", () => new Promise<number>((r) => (release = () => r(1))));
    await settle();
    const second = scheduler.submit("insight", "queued", async () => 2);
    const third = scheduler.submit("insight", "dropped", async () => 3);
    assert.equal(await third, null);
    release();
    assert.equal(await first, 1);
    assert.equal(await second, 2);
    let runs = 0;
    await scheduler.submit("insight", "slow", async () => ++runs);
    assert.equal(runs, 0, "cached result reused");
    assert.equal(await scheduler.submit("insight", "boom", async () => Promise.reject(new Error("x"))), null);
  });
  it("stops calling after a fatal error such as a rejected key", async () => {
    const { AiError } = await import("./client.js");
    const scheduler = new AiScheduler(config({ maxInsightCalls: 8 }), quiet);
    let runs = 0;
    await scheduler.submit("insight", "a", async () => {
      runs++;
      throw new AiError("OpenAI HTTP 401: bad key", true);
    });
    assert.equal(await scheduler.submit("insight", "b", async () => ++runs), null);
    assert.equal(await scheduler.submit("recap", "c", async () => ++runs), null);
    assert.equal(runs, 1);
    assert.ok(scheduler.getStats().stopped);
  });
  it("does nothing when AI is disabled", async () => {
    let ran = false;
    const scheduler = new AiScheduler(loadAiConfig({}), quiet);
    assert.equal(await scheduler.submit("insight", "a", async () => (ran = true)), null);
    assert.equal(ran, false);
  });
});

describe("narratives", () => {
  const events = pressureEvents([0.81, 0.85, 0.9, 0.84, 0.86]);
  const insight = insightFor(events);
  const grounded = variants(["headline", "explanation"], (lang, audience) => [
    `${lang} ${audience}: Manchester United press`,
    `Average 0.85 across 5 pressure events (${lang}).`,
  ]);

  it("payload holds only verified values", () => {
    const payload = buildInsightPayload({ insight, match: match(), metrics: METRICS, evidence: events, teams: TEAMS });
    assert.equal(payload.insight.pressure_average, 0.85);
    assert.deepEqual(payload.insight.pressure_values, [0.81, 0.85, 0.9, 0.84, 0.86]);
    assert.equal(payload.insight.team, "Manchester United");
    assert.ok(!JSON.stringify(payload).includes("mun_7"), "no player ids");
  });

  it("publishes a narrative after the insight, keyed by its id, without blocking", async () => {
    const published: any[] = [];
    let resolveCall!: () => void;
    const gate = new Promise<void>((r) => (resolveCall = r));
    const caller: AiCaller = async (request) => {
      await gate;
      return mockCaller(() => grounded)(request);
    };
    const ai = createMatchAi({ config: config(), teams: TEAMS, publish: (m) => published.push(m), log: () => {}, caller });
    const started = Date.now();
    ai.onInsights([insight], match(), METRICS, events);
    assert.ok(Date.now() - started < 20, "onInsights returns immediately");
    assert.equal(published.length, 0);
    resolveCall();
    await settle();
    assert.equal(published.length, 1);
    assert.equal(published[0].type, "insight_narrative");
    assert.equal(published[0].insight_id, "insight_1");
    assert.equal(published[0].narrative.source, "openai");
    assert.equal(published[0].narrative.variants.es.analyst.explanation, "Average 0.85 across 5 pressure events (es).");
    assert.ok(!JSON.stringify(published).includes("confidence"), "confidence stays backend-owned");
    assert.equal(ai.replayMessages().length, 1);
  });

  it("drops ungrounded variants and keeps the template when none survive", async () => {
    const published: any[] = [];
    const partly = variants(["headline", "explanation"], (lang, audience) =>
      audience === "fan" ? ["Goal!", "They scored 2 goals."] : ["Press on", "Average 0.85."],
    );
    const ai = createMatchAi({
      config: config(),
      teams: TEAMS,
      publish: (m) => published.push(m),
      log: () => {},
      caller: mockCaller(() => partly),
    });
    ai.onInsights([insight], match(), METRICS, events);
    await settle();
    assert.equal(published.length, 1);
    assert.equal(published[0].narrative.variants.en.fan, undefined, "invented goals rejected");
    assert.ok(published[0].narrative.variants.en.analyst);

    const none: any[] = [];
    const ai2 = createMatchAi({
      config: config(),
      teams: TEAMS,
      publish: (m) => none.push(m),
      log: () => {},
      caller: mockCaller(() => "not json"),
    });
    ai2.onInsights([insight], match(), METRICS, events);
    await settle();
    assert.equal(none.length, 0);
  });

  it("selects insights: one per team per gap, none when disabled", async () => {
    const calls: AiRequest[] = [];
    const ai = createMatchAi({
      config: config({ teamGapSeconds: 600 }),
      teams: TEAMS,
      publish: () => {},
      log: () => {},
      caller: mockCaller(() => grounded, calls),
    });
    ai.onInsights([insight], match({ clock_seconds: 4 }), METRICS, events);
    const later = pressureEvents([0.8, 0.8, 0.8, 0.8, 0.8], "man_utd", 81);
    ai.onInsights([insightFor(later, "insight_3")], match({ clock_seconds: 84 }), METRICS, [...events, ...later]);
    await settle();
    assert.equal(calls.length, 1, "second surge within 600s is not sent");

    const offCalls: AiRequest[] = [];
    const off = createMatchAi({
      config: loadAiConfig({}),
      teams: TEAMS,
      publish: () => {},
      log: () => {},
      caller: mockCaller(() => grounded, offCalls),
    });
    off.onInsights([insight], match(), METRICS, events);
    await settle();
    assert.equal(offCalls.length, 0);
  });
});

describe("recaps", () => {
  const events: MatchEvent[] = [
    ...pressureEvents([0.81, 0.85, 0.9, 0.84, 0.86]),
    { event_id: "evt_6", match_id: "match_001", minute: 0, second: 6, team_id: "arsenal", player_id: "ars_9", event_type: "shot", outcome: "goal" },
    { event_id: "evt_7", match_id: "match_001", minute: 0, second: 7, team_id: "arsenal", player_id: "ars_8", event_type: "pass", completed: true },
    { event_id: "evt_8", match_id: "match_001", minute: 0, second: 8, team_id: "man_utd", player_id: "mun_8", event_type: "pass", completed: false },
  ];
  const ht = match({ status: "half_time", clock_seconds: 2700, away_score: 1 });

  it("computes statistics from the actual events", () => {
    const recap = buildRecap("half_time", ht, events, [{ insight_id: "insight_1", team_id: "man_utd", minute: 0, average: 0.85 }], false);
    assert.deepEqual(recap.score, { home: 0, away: 1 });
    assert.equal(recap.teams.arsenal!.goals, 1);
    assert.equal(recap.teams.arsenal!.pass_accuracy, 100);
    assert.equal(recap.teams.man_utd!.pass_accuracy, 0);
    assert.equal(recap.teams.man_utd!.average_pressure, 0.85);
    assert.equal(recap.pressure_surges.man_utd, 1);
    assert.equal(recap.ai_status, "unavailable");
  });

  const recapText = variants(["headline", "summary"], (lang) => [`${lang}: Arsenal lead 1-0`, "Arsenal lead 1-0 at the break."]);

  it("publishes the deterministic recap first, then the AI text, once per phase", async () => {
    const published: any[] = [];
    const calls: AiRequest[] = [];
    const ai = createMatchAi({
      config: config(),
      teams: TEAMS,
      publish: (m) => published.push(m),
      log: () => {},
      caller: mockCaller(() => recapText, calls),
    });
    ai.onPhase("half_time", ht, events);
    assert.equal(published[0].recap.ai_status, "pending");
    ai.onPhase("half_time", ht, events);
    await settle();
    assert.equal(calls.length, 1, "not regenerated");
    assert.equal(published.length, 2);
    assert.equal(published[1].recap.ai_status, "ready");
    assert.equal(published[1].recap.ai.variants.yo.fan.headline, "yo: Arsenal lead 1-0");
    assert.equal(ai.recaps().length, 1);
    assert.equal(ai.replayMessages().length, 1);
  });

  it("falls back when the API fails", async () => {
    const published: any[] = [];
    const ai = createMatchAi({
      config: config(),
      teams: TEAMS,
      publish: (m) => published.push(m),
      log: () => {},
      caller: async () => {
        throw new Error("OpenAI request timed out after 60000 ms");
      },
    });
    ai.onPhase("full_time", match({ status: "full_time", clock_seconds: 5400 }), events);
    await settle();
    assert.equal(published.at(-1).recap.ai_status, "unavailable");
    assert.equal(published.at(-1).recap.ai, null);
    assert.ok(published.at(-1).recap.halves, "full time includes each half");
  });

  it("with AI disabled, publishes only the deterministic recap", async () => {
    const published: any[] = [];
    const ai = createMatchAi({ config: loadAiConfig({}), teams: TEAMS, publish: (m) => published.push(m), log: () => {} });
    ai.onPhase("half_time", ht, events);
    await settle();
    assert.equal(published.length, 1);
    assert.equal(published[0].recap.ai_status, "unavailable");
  });
});
