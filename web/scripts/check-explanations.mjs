// Checks insight personalisation against the DEV fixtures — no extra dependencies:
// Vite's own SSR loader runs the TypeScript/TSX modules directly.
// Usage (from web/): npm run test:explanations
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

try {
  const { personalise } = await server.ssrLoadModule("/src/lib/personalisation.ts");
  const { adaptStreamPayload } = await server.ssrLoadModule("/src/lib/streamAdapter.ts");
  const { initialMatchState, matchReducer } = await server.ssrLoadModule("/src/lib/matchState.ts");
  const fx = await server.ssrLoadModule("/src/dev/insightFixtures.ts");

  const state = fx.buildFixtureState();
  const eventsById = new Map(state.history.map((event) => [event.event_id, event]));
  const byType = Object.fromEntries(state.insights.map((insight) => [insight.type, insight]));

  // Payload compatibility: fixtures went through the real adapter + reducer intact.
  check("all 4 fixture insights received", state.insights.length === 4, `got ${state.insights.length}`);
  for (const [type, raw] of Object.entries(fx.FIXTURE_INSIGHTS)) {
    const got = byType[type];
    check(`${type}: id preserved`, got?.id === raw.id);
    check(`${type}: evidence ids preserved`, JSON.stringify(got?.evidence_event_ids) === JSON.stringify(raw.evidence_event_ids));
    check(`${type}: confidence preserved`, got?.confidence === raw.confidence);
    check(`${type}: team_id preserved`, got?.team_id === raw.team_id);
    if ("data" in raw) check(`${type}: structured data preserved`, JSON.stringify(got?.data) === JSON.stringify(raw.data));
  }

  const expectations = {
    pressure_surge: ["Arsenal", "0.91"],
    passing_pattern: ["Manchester United", "4", "10", "40"],
    shot_activity: ["Arsenal", "3"],
  };
  const audiences = ["fan", "analyst", "broadcast"];
  const languages = ["en", "es", "fr", "yo"];

  for (const [type, needles] of Object.entries(expectations)) {
    const insight = byType[type];
    const before = JSON.stringify(insight);
    for (const audience of audiences) {
      const english = personalise(insight, audience, "en", eventsById);
      for (const language of languages) {
        const out = personalise(insight, audience, language, eventsById);
        const text = `${out.headline} ${out.explanation} ${out.takeaway}`;
        const tag = `${type}/${audience}/${language}`;
        check(`${tag}: local template used`, out.source === "local-demo-template", out.source);
        check(`${tag}: language tagged`, out.language === language && out.audience === audience);
        check(`${tag}: no unfilled placeholders`, !/\{\w+\}/.test(text), text);
        // The module's fallbacks are "?" counts/percentages, "high" and "The team". (French puts a
        // space before "?" in questions, so look for the fallback shapes, not a bare "?".)
        check(`${tag}: no unknown-value fallbacks`, !/\(\?\s?%\)|\?\s(of|de|sur|nínú)\s|\bhigh\b|The team/.test(text), text);
        check(`${tag}: real values present`, needles.every((n) => text.includes(n)), text);
        if (language !== "en") check(`${tag}: translated`, out.explanation !== english.explanation);
      }
    }
    check(`${type}: original insight not mutated`, JSON.stringify(insight) === before);
  }

  const pressure = personalise(byType.pressure_surge, "fan", "en", eventsById);
  check("pressure average recomputed from all 5 received evidence events",
    pressure.derivedFromEvidence && pressure.evidenceReceived === 5 && pressure.evidenceTotal === 5);

  // The backend rule is a 5-event window at >= 0.75: no wording may still state 10 events.
  for (const audience of audiences) {
    for (const language of languages) {
      const out = personalise(byType.pressure_surge, audience, language, eventsById);
      const all = `${out.explanation} ${out.evidenceNote}`;
      check(`pressure ${audience}/${language}: no 10-event rule`, !/\b10\b|mẹ́wàá/.test(all), all);
      if (/\d/.test(out.explanation.replace("0.91", ""))) {
        check(`pressure ${audience}/${language}: states 5 events`, /\b5\b/.test(out.explanation), out.explanation);
      }
    }
    const note = personalise(byType.pressure_surge, "analyst", "en", eventsById).evidenceNote;
    check("analyst evidence note states the 5-event, >= 0.75 rule", /at least 0\.75 across 5 events/.test(note), note);
  }

  // Missing evidence: no invented average, and no untranslated "high" in other languages.
  const partial = new Map([...eventsById].slice(0, 3));
  for (const language of languages) {
    const out = personalise(byType.pressure_surge, "fan", language, partial);
    check(`partial evidence (${language}): threshold, not an invented value`,
      !out.derivedFromEvidence && out.explanation.includes("≥ 0.75") && !/\bhigh\b/.test(out.explanation), out.explanation);
  }

  // No template for this type: original backend wording, labelled as such.
  const unknown = byType.set_piece_threat;
  for (const language of languages) {
    const out = personalise(unknown, "broadcast", language, eventsById);
    check(`unknown type (${language}): backend fallback`, out.source === "backend-fallback" &&
      out.headline === unknown.headline && out.explanation === unknown.explanation);
  }

  // Backend insight text: team IDs shown as names, wording otherwise unchanged.
  check("backend headline humanised", byType.pressure_surge.headline === "Arsenal: sustained pressure is building");

  // insights: [] must never produce an insight.
  let empty = initialMatchState;
  for (const raw of fx.fixtureMessages()) {
    const payload = adaptStreamPayload({ ...raw, insights: [] });
    if (payload?.kind === "message") empty = matchReducer(empty, { type: "message", message: payload.message });
  }
  check("insights: [] produces no insights", empty.insights.length === 0 && empty.received > 0);

  // Re-delivered message (e.g. after reconnect) does not duplicate an insight.
  const last = fx.fixtureMessages().at(-1);
  const again = adaptStreamPayload(last);
  const replayed = matchReducer(state, { type: "message", message: again.message });
  check("duplicate delivery does not duplicate insights", replayed.insights.length === state.insights.length);
} finally {
  await server.close();
}

console.log(`${passed} passed, ${failures.length} failed`);
for (const failure of failures) console.log(`FAIL ${failure}`);
process.exit(failures.length ? 1 : 0);
