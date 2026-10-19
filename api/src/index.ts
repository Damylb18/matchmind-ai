
import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

type EventType = "pass" | "shot" | "tackle" | "pressure";

type MatchEvent = {
  event_id: string;
  match_id: string;
  minute: number;
  second: number;
  team: string;
  player: string;
  event_type: EventType;
  completed?: boolean;
  pressure?: number;
};

type Insight = {
  type: string;
  headline: string;
  explanation: string;
  minute: number;
  evidence_event_ids: string[];
};

const events: MatchEvent[] = [];
const clients = new Set<import("express").Response>();

let eventCounter = 0;
let completedPasses = 0;
let attemptedPasses = 0;
let recentPressure: number[] = [];

const teams = ["Manchester United", "Arsenal"];
const players = ["Player_7", "Player_8", "Player_10"];

function createEvent(): MatchEvent {
  eventCounter++;

  const eventType = (
    ["pass", "pass", "pass", "shot", "tackle", "pressure"] as EventType[]
  )[Math.floor(Math.random() * 6)]!;

  const event: MatchEvent = {
    event_id: `evt_${eventCounter}`,
    match_id: "match_001",
    minute: Math.floor((eventCounter - 1) / 60),
    second: (eventCounter - 1) % 60,
    team: teams[Math.floor(Math.random() * teams.length)]!,
    player: players[Math.floor(Math.random() * players.length)]!,
    event_type: eventType,
  };

  if (eventType === "pass") {
    event.completed = Math.random() > 0.2;
    event.pressure = Math.random();
  }

  if (eventType === "pressure") {
    event.pressure = Math.random();
  }

  return event;
}

function processEvent(event: MatchEvent) {
  events.push(event);

  if (event.event_type === "pass") {
    attemptedPasses++;

    if (event.completed) completedPasses++;
  }

  if (
    event.event_type === "pressure" &&
    typeof event.pressure === "number"
  ) {
    recentPressure.push(event.pressure);

    // Keep the latest 10 pressure events.
    recentPressure = recentPressure.slice(-10);
  }

  const insights: Insight[] = [];

  if (
    event.event_type === "pressure" &&
    recentPressure.length === 10
  ) {
    const avg =
      recentPressure.reduce((sum, value) => sum + value, 0) /
      recentPressure.length;

    if (avg > 0.75) {
      insights.push({
        type: "pressure_surge",
        headline: "Pressure is building",
        explanation:
          "Recent pressure-event intensity is high. " +
          "Check territorial entries and possession sequences " +
          "before concluding that one team controls the match.",
        minute: event.minute,
        evidence_event_ids: events
          .filter((e) => e.event_type === "pressure")
          .slice(-10)
          .map((e) => e.event_id),
      });
    }
  }

  return {
    event,
    metrics: {
      attempted_passes: attemptedPasses,
      completed_passes: completedPasses,
      pass_accuracy:
        attemptedPasses === 0
          ? 0
          : Math.round(
              (completedPasses / attemptedPasses) * 100
            ),
    },
    insights,
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "MatchMind API" });
});

app.get("/api/match/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  clients.add(res);

  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  req.on("close", () => {
    clients.delete(res);
  });
});

// Generate an event every second for the prototype.
setInterval(() => {
  const result = processEvent(createEvent());
  const payload = `data: ${JSON.stringify(result)}\n\n`;

  for (const client of clients) {
    client.write(payload);
  }
}, 1000);

app.listen(4000, () => {
  console.log("MatchMind API running at http://localhost:4000");
});
