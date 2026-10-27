
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { calculateMetrics } from "./metrics.js";
import { detectInsights, resetInsightDetection } from "./rules.js";
import { teams, players, match } from "./data.js";
import type { EventType, Insight, MatchEvent, Player } from "./types.js";
import { loadAiConfig } from "./ai/config.js";
import { createMatchAi } from "./ai/matchAi.js";

// Optional settings from api/.env (OpenAI key, model, timings). Never sent to clients.
dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

const app = express();

app.use(cors());
app.use(express.json());

const events: MatchEvent[] = [];
const eventHistory: { event: MatchEvent; insights: Insight[] }[] = [];
const clients = new Set<import("express").Response>();

const TEST_MODE = process.env.TEST_MODE === "true";

const SECONDS_PER_EVENT = TEST_MODE ? 60 : 1;
const HALF_TIME_SECONDS = 45 * 60;
const FULL_TIME_SECONDS = 90 * 60;

let eventCounter = 0;
let halftimeStarted = false;
let matchSequence = 1;

function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getPositionCoordinates(
  teamId: string,
  position: Player["position"]
): { x: number; y: number } {
  // X runs from left goal to right goal.
  // Man United attack right; Arsenal attack left.
  const attacksRight = teamId === match.home_team_id;

  const xZones: Record<Player["position"], [number, number]> = {
    GK: [4, 9],
    DEF: [16, 38],
    MID: [32, 66],
    FWD: [56, 89],
  };

  const yZones: Record<Player["position"], [number, number]> = {
    GK: [42, 58],
    DEF: [12, 88],
    MID: [10, 90],
    FWD: [18, 82],
  };

  const [minX, maxX] = xZones[position]!;
  const [minY, maxY] = yZones[position]!;

  const attackingX = randomNumber(minX, maxX);

  return {
    x: attacksRight ? attackingX : 100 - attackingX,
    y: randomNumber(minY, maxY),
  };
}

function createEvent(): MatchEvent {
  eventCounter++;


  // Repeat a pressure demonstration every 80 events.
  const phase = (eventCounter - 1) % 80;

  let eventType: EventType;
  let teamId: string;
  let pressure: number | undefined;

  // Man Utd: five high-pressure events, then three low-pressure events.
  if (phase < 5) {
    eventType = "pressure";
    teamId = "man_utd";
    pressure = 0.78 + Math.random() * 0.14;
  } else if (phase < 8) {
    eventType = "pressure";
    teamId = "man_utd";
    pressure = 0.10 + Math.random() * 0.20;
  }

  // Arsenal: five high-pressure events, then three low-pressure events.
  else if (phase >= 40 && phase < 45) {
    eventType = "pressure";
    teamId = "arsenal";
    pressure = 0.78 + Math.random() * 0.14;
  } else if (phase >= 45 && phase < 48) {
    eventType = "pressure";
    teamId = "arsenal";
    pressure = 0.10 + Math.random() * 0.20;
  } else {
    // Keep the existing random event mix for other phases.
    const roll = Math.random();

    if (roll < 0.005) {
      eventType = "shot";
    } else if (roll < 0.16) {
      eventType = "tackle";
    } else {
      eventType = "pass";
    }

    teamId = teams[randomNumber(0, teams.length - 1)]!.id;
  }


  // Choose a player belonging to the event's team.
  const teamPlayers = players.filter(
    (player) => player.team_id === teamId
  );

  const player = teamPlayers[randomNumber(0, teamPlayers.length - 1)]!;

  // Normalised coordinates: 0–100 across the pitch.
  const { x, y } = getPositionCoordinates(teamId, player.position);

  const simulatedSeconds = Math.min(
    eventCounter * SECONDS_PER_EVENT,
    FULL_TIME_SECONDS
  );

  const event: MatchEvent = {
    event_id: `evt_${eventCounter}`,
    match_id: match.match_id,
    minute: Math.floor(simulatedSeconds / 60),
    second: simulatedSeconds % 60,
    team_id: teamId,
    player_id: player.id,
    event_type: eventType,
    x,
    y,
  };

  if (eventType === "pass") {
    const possibleRecipients = teamPlayers.filter(
      (candidate) => candidate.id !== player.id
    );

    const recipient =
      possibleRecipients.length > 0
        ? possibleRecipients[
            randomNumber(0, possibleRecipients.length - 1)
          ]!
        : undefined;

    const completed = Math.random() > 0.2;

    const targetPlayer =
      completed && recipient
        ? recipient
        : teamPlayers[randomNumber(0, teamPlayers.length - 1)]!;

    const target = getPositionCoordinates(teamId, targetPlayer.position);

    if (completed && recipient) {
      event.recipient_player_id = recipient.id;
      event.end_x = target.x;
      event.end_y = target.y;
    } else {
      // Incomplete passes tend to finish away from the intended target.
      event.end_x = Math.max(
        0,
        Math.min(100, target.x + randomNumber(-12, 12))
      );
      event.end_y = Math.max(
        0,
        Math.min(100, target.y + randomNumber(-12, 12))
      );
    }

    event.completed = completed;
    event.outcome = completed ? "successful" : "unsuccessful";
    event.pressure = Math.random();

  }

  if (eventType === "shot") {
    const roll = Math.random();

    if (roll < 0.05) {
      event.outcome = "goal";
    } else if (roll < 0.25) {
      event.outcome = "on_target";
    } else if (roll < 0.45) {
      event.outcome = "saved";
    } else if (roll < 0.70) {
      event.outcome = "blocked";
    } else {
      event.outcome = "off_target";
    }

    event.end_x = teamId === match.home_team_id ? 100 : 0;
    event.end_y = randomNumber(35, 65);
  }

  if (eventType === "tackle") {
    event.outcome = Math.random() > 0.5
      ? "successful"
      : "unsuccessful";
    event.end_x = x;
    event.end_y = y;
  }

  if (eventType === "pressure") {
    event.pressure = pressure!;
  }

  return event;
}

function processEvent(event: MatchEvent) {
  events.push(event);

  // Advance the simulated match clock.
  const simulatedSeconds = Math.min(
    eventCounter * SECONDS_PER_EVENT,
    FULL_TIME_SECONDS
  );

  match.clock_seconds = simulatedSeconds;

  if (simulatedSeconds >= FULL_TIME_SECONDS) {
    match.status = "full_time";
  } else if (simulatedSeconds >= HALF_TIME_SECONDS && !halftimeStarted) {
    match.status = "half_time";
  } else {
    match.status = "live";
  }

  // Update the score only for a goal event.
  if (event.event_type === "shot" && event.outcome === "goal") {
    if (event.team_id === match.home_team_id) {
      match.home_score++;
    } else if (event.team_id === match.away_team_id) {
      match.away_score++;
    }
  }

  const metrics = calculateMetrics(events);
  const insights = detectInsights(event);

  return {
    event,
    match: { ...match },
    metrics,
    insights,
  };
}


app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "MatchMind API" });
});

app.get("/api/match", (_req, res) => {
  res.json(match);
});

app.get("/api/teams", (_req, res) => {
  res.json(teams);
});

app.get("/api/players", (_req, res) => {
  res.json(players);
});

app.get("/api/match/recaps", (_req, res) => {
  res.json(matchAi.recaps());
});

app.get("/api/ai/status", (_req, res) => {
  res.json(matchAi.status());
});

app.get("/api/match/events", (_req, res) => {
  res.json(events.slice(-100));
});

app.get("/api/match/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  clients.add(res);

  res.write(
    `data: ${JSON.stringify({
      type: "connected",
      match: { ...match },
      metrics: calculateMetrics(events),
      history: eventHistory,
    })}\n\n`
  );

  // Catch up a new or reconnecting client on AI narratives and recaps already produced.
  for (const message of matchAi.replayMessages()) {
    res.write(`data: ${JSON.stringify(message)}\n\n`);
  }

  req.on("close", () => {
    clients.delete(res);
  });
});

// Match lifecycle. The demo clock advances one second per event, so the event
// generated at 45:00 starts half-time and the event at 90:00 ends the match.
// Optional overrides (e.g. accelerated test runs); defaults are the demo values.
const EVENT_INTERVAL_MS = Number(process.env.EVENT_INTERVAL_MS) || 1000;
const HALF_TIME_BREAK_MS =
  Number(process.env.HALF_TIME_BREAK_MS) || (TEST_MODE ? 1000 : 15_000);
const AUTO_RESTART_MS = Number(process.env.AUTO_RESTART_MS) || (TEST_MODE ? 1000 : 15_000);
// While no events are generated, a small status message keeps clients informed
// (and shows the connection is alive). Event payloads keep their existing shape.
const STATUS_HEARTBEAT_MS = 2000;

function broadcast(data: unknown) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;

  for (const client of clients) {
    client.write(payload);
  }
}

// Optional OpenAI narratives and recaps. Runs beside the match loop and never blocks it.
// Each instance belongs to one match. Late results from a completed match are discarded.
const aiConfig = loadAiConfig();

function createAiForCurrentMatch() {
  const matchId = match.match_id;
  return createMatchAi({
    config: aiConfig,
    teams,
    publish: (message) => {
      if (match.match_id === matchId) broadcast(message);
    },
  });
}

let matchAi = createAiForCurrentMatch();

function restartMatch(): void {
  matchSequence++;
  eventCounter = 0;
  halftimeStarted = false;
  events.length = 0;
  eventHistory.length = 0;
  resetInsightDetection();

  match.match_id = `match_${String(matchSequence).padStart(3, "0")}`;
  match.home_score = 0;
  match.away_score = 0;
  match.clock_seconds = 0;
  match.status = "live";
  matchAi = createAiForCurrentMatch();

  // Existing browsers reset immediately; new browsers receive the same snapshot on connect.
  broadcast({
    type: "connected",
    match: { ...match },
    metrics: calculateMetrics(events),
    history: eventHistory,
  });
  console.log(`New demo match started (${match.match_id})`);
}

// Generate synthetic match events for the prototype.
setInterval(() => {
  // Stop generating events during breaks or after full-time.
  if (match.status === "half_time" || match.status === "full_time") {
    return;
  }

  const result = processEvent(createEvent());
  eventHistory.push({ event: result.event, insights: result.insights });

  // Preserve the existing event payload.
  broadcast(result);

  // After the event is sent: AI work is queued and its results arrive as separate messages.
  matchAi.onInsights(result.insights, match, result.metrics, events);

  // Start the halftime break once.
  if (result.match.status === "half_time") {
    halftimeStarted = true;
    matchAi.onPhase("half_time", match, events);
    console.log("Half-time");

    setTimeout(() => {
      if (match.status !== "half_time") return;

      match.status = "live";

      broadcast({
        type: "match_status",
        match: { ...match },
      });

      console.log("Second half started");
    }, HALF_TIME_BREAK_MS);
  }

  if (result.match.status === "full_time") {
    matchAi.onPhase("full_time", match, events);
    console.log("Match finished");

    const finishedMatchId = match.match_id;
    setTimeout(() => {
      if (match.match_id === finishedMatchId && match.status === "full_time") restartMatch();
    }, AUTO_RESTART_MS);
  }
}, EVENT_INTERVAL_MS);

setInterval(() => {
  if (match.status !== "live") {
    broadcast({ type: "match_status", match: { ...match } });
  }
}, STATUS_HEARTBEAT_MS);

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`MatchMind API running on port ${PORT}`);
});
