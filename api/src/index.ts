
import express from "express";
import cors from "cors";
import { calculateMetrics } from "./metrics.js";
import { detectInsights } from "./rules.js";
import type { EventType, MatchEvent} from "./types.js";

const app = express();

app.use(cors());
app.use(express.json());

const events: MatchEvent[] = [];
const clients = new Set<import("express").Response>();

let eventCounter = 0;

const teams = ["Manchester United", "Arsenal"];
const players = ["Player_7", "Player_8", "Player_10"];


function createEvent(): MatchEvent {
  eventCounter++;

  // Repeat an 80-second demo cycle.
  const phase = (eventCounter - 1) % 80;

  let eventType: EventType;
  let team: string;
  let pressure: number | undefined;

  // Manchester United high-pressure sequence.
  if (phase >= 0 && phase < 10) {
    eventType = "pressure";
    team = "Manchester United";
    pressure = 0.85 + Math.random() * 0.14;
  }
  // Manchester United low-pressure sequence, which resets the alert.
  else if (phase >= 20 && phase < 30) {
    eventType = "pressure";
    team = "Manchester United";
    pressure = 0.15 + Math.random() * 0.25;
  }
  // Arsenal high-pressure sequence.
  else if (phase >= 40 && phase < 50) {
    eventType = "pressure";
    team = "Arsenal";
    pressure = 0.85 + Math.random() * 0.14;
  }
  // Arsenal low-pressure sequence, which resets the alert.
  else if (phase >= 60 && phase < 70) {
    eventType = "pressure";
    team = "Arsenal";
    pressure = 0.15 + Math.random() * 0.25;
  }
  // Normal events fill the gaps between pressure sequences.
  else {
    eventType = (
      ["pass", "pass", "pass", "shot", "tackle"] as EventType[]
    )[Math.floor(Math.random() * 5)]!;

    team = teams[Math.floor(Math.random() * teams.length)]!;
  }

  const event: MatchEvent = {
    event_id: `evt_${eventCounter}`,
    match_id: "match_001",
    minute: Math.floor((eventCounter - 1) / 60),
    second: (eventCounter - 1) % 60,
    team,
    player: players[Math.floor(Math.random() * players.length)]!,
    event_type: eventType,
  };

  if (eventType === "pass") {
    event.completed = Math.random() > 0.2;
    event.pressure = Math.random();
  }

  if (eventType === "pressure") {
    event.pressure = pressure!;
  }

  return event;
}



function processEvent(event: MatchEvent) {
  events.push(event);

  const metrics = calculateMetrics(events);
  const insights = detectInsights(event);

  return {
    event,
    metrics,
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
