/**
 * DEV-ONLY insight fixtures, written as raw backend SSE payloads so they exercise the
 * real stream adapter and reducer. Used by the fixture harness (?insight-fixtures in
 * `npm run dev`) and scripts/check-explanations.mjs. Never imported by the live app.
 *
 * pressure_surge mirrors the current backend rule exactly (api/src/rules.ts: 5-event
 * window, average >= 0.75, average included in the explanation). passing_pattern and
 * shot_activity are NOT emitted by the current backend; they follow the shapes the
 * personalisation templates expect, including the optional structured `data` field.
 */
import { initialMatchState, matchReducer, type MatchState } from "../lib/matchState";
import { adaptStreamPayload } from "../lib/streamAdapter";

type RawEvent = Record<string, unknown> & { event_id: string };

const MATCH = { match_id: "match_001", home_team_id: "man_utd", away_team_id: "arsenal", status: "live" };

function rawEvent(n: number, team: string, player: string, type: string, extra: Record<string, unknown>): RawEvent {
  return {
    event_id: `evt_${n}`,
    match_id: "match_001",
    minute: Math.floor((n - 1) / 60),
    second: (n - 1) % 60,
    team_id: team,
    player_id: player,
    event_type: type,
    x: 40 + (n % 40),
    y: 20 + (n % 50),
    ...extra,
  };
}

// Arsenal pressure sequence: evt_1201–evt_1205 (the backend's 5-event window), average 0.91.
const PRESSURE = [0.88, 0.93, 0.9, 0.95, 0.89];
const pressureEvents = PRESSURE.map((value, index) =>
  rawEvent(1201 + index, "arsenal", index % 2 ? "ars_10" : "ars_8", "pressure", { pressure: value }),
);

// Manchester United passing sequence: evt_1211–evt_1220, 4 of 10 completed.
const passEvents = Array.from({ length: 10 }, (_, index) =>
  rawEvent(1211 + index, "man_utd", index % 2 ? "mun_7" : "mun_8", "pass", {
    completed: index < 4,
    outcome: index < 4 ? "successful" : "unsuccessful",
    pressure: 0.4,
  }),
);

// Arsenal shots within the latest 30 events: evt_1221, evt_1224, evt_1227.
const shotEvents = [1221, 1224, 1227].map((n) =>
  rawEvent(n, "arsenal", "ars_10", "shot", { outcome: n === 1224 ? "saved" : "off_target", end_x: 100, end_y: 50 }),
);

const ids = (events: RawEvent[]) => events.map((event) => event.event_id);

export const FIXTURE_INSIGHTS = {
  pressure_surge: {
    // Exactly what api/src/rules.ts sends today: team ID in the text, no `data`.
    id: "insight_fx_1",
    type: "pressure_surge",
    headline: "arsenal: sustained pressure is building",
    explanation:
      "arsenal recorded an average pressure intensity of 0.91 across 5 recent pressure events. This indicates sustained pressing intensity, not necessarily territorial control or scoring threat.",
    minute: 20,
    team_id: "arsenal",
    confidence: 0.9,
    evidence_event_ids: ids(pressureEvents),
  },
  passing_pattern: {
    id: "insight_fx_2",
    type: "passing_pattern",
    headline: "man_utd: passing accuracy has dropped",
    explanation: "4 of the team's last 10 passes were completed (40%).",
    minute: 20,
    team_id: "man_utd",
    confidence: 0.8,
    evidence_event_ids: ids(passEvents),
    data: { team: "Manchester United", completedPasses: 4, totalPasses: 10, passAccuracy: 40 },
  },
  shot_activity: {
    id: "insight_fx_3",
    type: "shot_activity",
    headline: "arsenal: shot activity increasing",
    explanation: "arsenal recorded 3 shots in the latest 30 match events.",
    minute: 20,
    team_id: "arsenal",
    confidence: 0.7,
    evidence_event_ids: ids(shotEvents),
    data: { team: "Arsenal", shotCount: 3 },
  },
} as const;

/** An insight type with no local template: should fall back to the backend wording. */
export const FIXTURE_UNKNOWN_TYPE = {
  id: "insight_fx_4",
  type: "set_piece_threat",
  headline: "arsenal: set-piece threat",
  explanation: "arsenal won 3 corners in the latest 30 match events.",
  minute: 20,
  team_id: "arsenal",
  confidence: 0.6,
  evidence_event_ids: ["evt_1222", "evt_1225", "evt_1228"],
};

/** Raw SSE messages in arrival order; each insight rides on its last evidence event. */
export function fixtureMessages(): unknown[] {
  const events = [...pressureEvents, ...passEvents, ...shotEvents].sort(
    (a, b) => Number(a.event_id.slice(4)) - Number(b.event_id.slice(4)),
  );
  const trigger: Record<string, unknown[]> = {
    evt_1205: [FIXTURE_INSIGHTS.pressure_surge],
    evt_1220: [FIXTURE_INSIGHTS.passing_pattern],
    evt_1227: [FIXTURE_INSIGHTS.shot_activity, FIXTURE_UNKNOWN_TYPE],
  };
  return events.map((event, index) => ({
    event,
    match: { ...MATCH, home_score: 0, away_score: 0, clock_seconds: Number(event.event_id.slice(4)) - 1 },
    metrics: { attempted_passes: 10 + index, completed_passes: 8 + index, pass_accuracy: 80 },
    insights: trigger[event.event_id] ?? [],
  }));
}

/** Runs the fixture payloads through the real adapter and reducer, isolated from the live app. */
export function buildFixtureState(): MatchState {
  return fixtureMessages().reduce<MatchState>((state, raw) => {
    const payload = adaptStreamPayload(raw);
    return payload?.kind === "message" ? matchReducer(state, { type: "message", message: payload.message }) : state;
  }, initialMatchState);
}
