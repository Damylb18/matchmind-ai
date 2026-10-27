import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectInsights, resetInsightDetection } from "./rules.js";
import type { MatchEvent } from "./types.js";

const pressure = (sequence: number, value = 0.85): MatchEvent => ({
  event_id: `evt_${sequence}`,
  match_id: "match_test",
  minute: 0,
  second: sequence,
  team_id: "man_utd",
  player_id: "mun_7",
  event_type: "pressure",
  pressure: value,
});

describe("insight rule lifecycle", () => {
  it("starts with clean windows and counters after a match reset", () => {
    resetInsightDetection();
    for (let sequence = 1; sequence < 5; sequence++) {
      assert.deepEqual(detectInsights(pressure(sequence)), []);
    }
    assert.equal(detectInsights(pressure(5))[0]?.id, "insight_1");
    assert.deepEqual(detectInsights(pressure(6)), [], "an active surge is emitted only once");

    resetInsightDetection();
    for (let sequence = 1; sequence < 5; sequence++) {
      assert.deepEqual(detectInsights(pressure(sequence)), []);
    }
    assert.equal(detectInsights(pressure(5))[0]?.id, "insight_1");
  });
});
