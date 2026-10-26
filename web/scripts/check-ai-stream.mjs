// Checks the optional AI stream messages end to end in the frontend: adapter -> reducer ->
// personalisation and the local recap fallback. Mocked payloads only; no network.
// Usage (from web/): npm run test:ai
import { createServer } from "vite";

const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error",
});

let passed = 0;
const failures = [];
const check = (name, ok, detail = "") => {
  if (ok) passed++;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const LANGS = ["en", "es", "fr", "yo"];
const AUDIENCES = ["fan", "analyst", "broadcast"];

try {
  const { adaptStreamPayload } = await server.ssrLoadModule("/src/lib/streamAdapter.ts");
  const { initialMatchState, matchReducer } = await server.ssrLoadModule("/src/lib/matchState.ts");
  const { personalise } = await server.ssrLoadModule("/src/lib/personalisation.ts");
  const { localRecapLines } = await server.ssrLoadModule("/src/lib/recapCopy.ts");

  const match = (extra = {}) => ({
    match_id: "match_001",
    home_team_id: "man_utd",
    away_team_id: "arsenal",
    home_score: 0,
    away_score: 0,
    clock_seconds: 4,
    status: "live",
    ...extra,
  });
  const pressure = (n, value) => ({
    event_id: `evt_${n}`,
    match_id: "match_001",
    minute: 0,
    second: n - 1,
    team_id: "man_utd",
    player_id: "mun_7",
    event_type: "pressure",
    pressure: value,
  });
  const insight = {
    id: "insight_1",
    type: "pressure_surge",
    headline: "man_utd: sustained pressure is building",
    explanation: "man_utd recorded an average pressure intensity of 0.85 across 5 recent pressure events.",
    minute: 0,
    team_id: "man_utd",
    confidence: 0.9,
    evidence_event_ids: ["evt_1", "evt_2", "evt_3", "evt_4", "evt_5"],
  };
  const values = [0.81, 0.85, 0.9, 0.84, 0.86];
  const eventMessages = values.map((value, index) => ({
    event: pressure(index + 1, value),
    match: match({ clock_seconds: index }),
    metrics: { attempted_passes: 0, completed_passes: 0, pass_accuracy: 0 },
    insights: index === 4 ? [insight] : [],
  }));

  const aiVariants = (fields) =>
    Object.fromEntries(
      LANGS.map((lang) => [
        lang,
        Object.fromEntries(
          AUDIENCES.map((audience) => [audience, { [fields[0]]: `AI ${lang} ${audience} headline`, [fields[1]]: `AI ${lang} ${audience} text 0.85` }]),
        ),
      ]),
    );

  // --- Adapter ---------------------------------------------------------------
  const narrativeRaw = {
    type: "insight_narrative",
    match_id: "match_001",
    insight_id: "insight_1",
    narrative: { source: "openai", model: "gpt-4.1-mini-2025-04-14", generated_at: "2026-10-26T12:00:00Z", latency_ms: 1, variants: aiVariants(["headline", "explanation"]) },
  };
  const narrative = adaptStreamPayload(narrativeRaw);
  check("narrative parsed", narrative?.kind === "narrative" && narrative.narrative.insightId === "insight_1");
  check("narrative has 12 variants", LANGS.every((l) => AUDIENCES.every((a) => narrative?.narrative.variants[l]?.[a])));
  const partial = structuredClone(narrativeRaw);
  delete partial.narrative.variants.yo;
  partial.narrative.variants.fr.fan.headline = "";
  const partialParsed = adaptStreamPayload(partial);
  check("incomplete variants dropped individually", !partialParsed.narrative.variants.yo && !partialParsed.narrative.variants.fr.fan && !!partialParsed.narrative.variants.fr.analyst);
  check("narrative without variants rejected", adaptStreamPayload({ ...narrativeRaw, narrative: { model: "m", variants: {} } }) === null);
  check("narrative without insight id rejected", adaptStreamPayload({ ...narrativeRaw, insight_id: 5 }) === null);
  check("unknown message type ignored", adaptStreamPayload({ type: "something_new", x: 1 }) === null);

  const stats = (extra = {}) => ({
    passes: 100, completed_passes: 80, pass_accuracy: 80, shots: 2, shots_on_target: 1, goals: 0, tackles: 10,
    tackles_won: 6, pressure_events: 20, average_pressure: 0.55, high_pressure_events: 8, ...extra,
  });
  const recapRaw = (ai_status, ai = null) => ({
    type: "match_recap",
    recap: {
      match_id: "match_001", phase: "half_time", created_at: "x", clock_seconds: 2700, home_team_id: "man_utd",
      away_team_id: "arsenal", score: { home: 1, away: 0 }, events_analysed: 2701,
      teams: { man_utd: stats({ goals: 1 }), arsenal: stats({ pass_accuracy: null, average_pressure: null }) },
      pressure_surges: { man_utd: 17, arsenal: 16 },
      key_moments: [{ insight_id: "insight_1", team_id: "man_utd", minute: 0, average: 0.88 }],
      ai_status, ai,
    },
  });
  const pending = adaptStreamPayload(recapRaw("pending"));
  check("recap parsed", pending?.kind === "recap" && pending.recap.score.home === 1 && pending.recap.events_analysed === 2701);
  check("recap null stats allowed", pending?.recap.teams.arsenal.pass_accuracy === null);
  const ready = adaptStreamPayload(recapRaw("ready", { source: "openai", model: "gpt-4.1-mini", generated_at: "y", variants: aiVariants(["headline", "summary"]) }));
  check("recap AI text parsed", ready?.recap.ai?.variants.yo?.fan?.summary === "AI yo fan text 0.85");
  const brokenReady = adaptStreamPayload(recapRaw("ready", { model: "m", variants: {} }));
  check("ready recap with unusable AI text falls back", brokenReady?.recap.ai_status === "unavailable" && brokenReady.recap.ai === null);
  check("malformed recap rejected", adaptStreamPayload({ type: "match_recap", recap: { phase: "half_time" } }) === null);

  // Existing event payload unchanged.
  const legacy = adaptStreamPayload(eventMessages[4]);
  check("event payload still parsed", legacy?.kind === "message" && legacy.message.insights[0].id === "insight_1");

  // --- Reducer ---------------------------------------------------------------
  let state = matchReducer(initialMatchState, { type: "snapshot", match: match() });
  for (const raw of eventMessages) state = matchReducer(state, { type: "message", message: adaptStreamPayload(raw).message });
  check("one insight before narrative", state.insights.length === 1);
  state = matchReducer(state, { type: "narrative", narrative: narrative.narrative });
  check("narrative stored by insight id", state.narratives.insight_1?.model === "gpt-4.1-mini-2025-04-14");
  check("narrative does not duplicate insights", state.insights.length === 1);
  check("insight data untouched", JSON.stringify(state.insights[0].evidence_event_ids) === JSON.stringify(insight.evidence_event_ids) && state.insights[0].confidence === 0.9);
  // Replay after a reconnect is idempotent.
  state = matchReducer(state, { type: "snapshot", match: match({ clock_seconds: 6 }) });
  state = matchReducer(state, { type: "narrative", narrative: narrative.narrative });
  check("replayed narrative idempotent", Object.keys(state.narratives).length === 1 && state.insights.length === 1);
  const next = adaptStreamPayload({ ...eventMessages[0], event: pressure(7, 0.2), insights: [] });
  state = matchReducer(state, { type: "message", message: next.message });
  check("narratives survive later events", !!state.narratives.insight_1);

  state = matchReducer(state, { type: "recap", recap: pending.recap });
  check("pending recap stored", state.recaps.half_time?.ai_status === "pending");
  state = matchReducer(state, { type: "recap", recap: ready.recap });
  check("ready recap replaces pending", state.recaps.half_time?.ai_status === "ready");
  state = matchReducer(state, { type: "recap", recap: pending.recap });
  check("late pending copy ignored", state.recaps.half_time?.ai_status === "ready");
  const restarted = matchReducer(state, { type: "snapshot", match: match({ clock_seconds: 0 }) });
  check("backend restart clears narratives and recaps", Object.keys(restarted.narratives).length === 0 && !restarted.recaps.half_time);

  // --- Personalisation -------------------------------------------------------
  const eventsById = new Map(state.history.map((event) => [event.event_id, event]));
  const entry = state.insights[0];
  for (const lang of LANGS) {
    for (const audience of AUDIENCES) {
      const out = personalise(entry, audience, lang, eventsById, state.narratives[entry.id]);
      const tag = `${audience}/${lang}`;
      check(`${tag}: AI text used`, out.source === "openai" && out.headline === `AI ${lang} ${audience} headline`, out.source);
      check(`${tag}: model and language tagged`, out.model === "gpt-4.1-mini-2025-04-14" && out.contentLang === lang && out.language === lang);
      check(`${tag}: evidence counts kept`, out.evidenceTotal === 5 && out.evidenceReceived === 5);
    }
  }
  const fallback = personalise(entry, "fan", "yo", eventsById, partialParsed.narrative);
  check("missing language falls back to template", fallback.source === "local-demo-template" && fallback.language === "yo");
  const noAi = personalise(entry, "analyst", "es", eventsById, undefined);
  check("no narrative: template as before", noAi.source === "local-demo-template" && noAi.headline.length > 0);
  check("AI never mutates the insight", JSON.stringify(entry.evidence_event_ids) === JSON.stringify(insight.evidence_event_ids) && entry.confidence === 0.9);

  // --- Local recap -----------------------------------------------------------
  for (const lang of LANGS) {
    const lines = localRecapLines(pending.recap, lang);
    const text = lines.join(" ");
    check(`local recap ${lang}: complete`, lines.length >= 5 && !/undefined|NaN|\{/.test(text), text);
    check(`local recap ${lang}: score and counts from data`, text.includes("1–0") && text.includes("80") && text.includes("17"), text);
  }
  check("local recap fr uses decimal comma", localRecapLines(pending.recap, "fr").join(" ").includes("0,88"));
} finally {
  await server.close();
}

console.log(`${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  process.exit(1);
}
