
import express from "express";
import cors from "cors";
import { calculateMetrics } from "./metrics.js";
import { detectInsights } from "./rules.js";
import { teams, players, match } from "./data.js";
import type { EventType, MatchEvent, Player } from "./types.js";

const app = express();

app.use(cors());
app.use(express.json());

const events: MatchEvent[] = [];
const clients = new Set<import("express").Response>();

const TEST_MODE = process.env.TEST_MODE === "true";

const SECONDS_PER_EVENT = TEST_MODE ? 60 : 1;
const EVENT_INTERVAL_MS = TEST_MODE ? 500 : 1000;
const HALFTIME_BREAK_MS = TEST_MODE ? 1000 : 15_000;

let eventCounter = 0;
let halftimeStarted = false;

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

  // Shorter, less frequent pressure spells.
  if (phase < 3) {
    eventType = "pressure";
    teamId = "man_utd";
    pressure = 0.65 + Math.random() * 0.20;
  } else if (phase >= 3 && phase < 6) {
    eventType = "pressure";
    teamId = "man_utd";
    pressure = 0.10 + Math.random() * 0.20;
  } else if (phase >= 40 && phase < 43) {
    eventType = "pressure";
    teamId = "arsenal";
    pressure = 0.65 + Math.random() * 0.20;
  } else if (phase >= 43 && phase < 46) {
    eventType = "pressure";
    teamId = "arsenal";
    pressure = 0.10 + Math.random() * 0.20;
  } else {
    // Most events are passes; shots are deliberately rare.
    const roll = Math.random();

    if (roll < 0.005) {
      eventType = "shot";       // 0.5%
    } else if (roll < 0.16) {
      eventType = "tackle";     // 16%
    } else {
      eventType = "pass";       // 84%
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

  const simulatedSeconds = Math.min(eventCounter * SECONDS_PER_EVENT, 5400);

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
    5400
  );

  match.clock_seconds = simulatedSeconds;

  if (simulatedSeconds >= 5400) {
    match.status = "full_time";
  } else if (simulatedSeconds >= 2700 && !halftimeStarted) {
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
      match,
    })}\n\n`
  );

  req.on("close", () => {
    clients.delete(res);
  });
});

// Generate synthetic match events for the prototype.
function broadcast(data: unknown) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;

  for (const client of clients) {
    client.write(payload);
  }
}

let halftimeTimer: ReturnType<typeof setTimeout> | undefined;

setInterval(() => {
  // Stop generating events during breaks or after full-time.
  if (match.status === "half_time" || match.status === "full_time") {
    return;
  }

  const result = processEvent(createEvent());

  // Preserve the existing event payload.
  broadcast(result);

  // Start the halftime break once.
  if (result.match.status === "half_time" && !halftimeStarted) {
    halftimeStarted = true;

    setTimeout(() => {
      if (match.status !== "half_time") return;

      match.status = "live";

      broadcast({
        type: "match_status",
        match: { ...match },
      });

      console.log("Second half started");
    }, HALFTIME_BREAK_MS);
  }

  if (result.match.status === "full_time") {
    console.log("Match finished");
  }
}, EVENT_INTERVAL_MS);

app.listen(4000, () => {
  console.log("MatchMind API running at http://localhost:4000");
});
