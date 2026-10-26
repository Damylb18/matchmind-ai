
import express from "express";
import cors from "cors";
import { calculateMetrics } from "./metrics.js";
import { detectInsights } from "./rules.js";
import { teams, players, match } from "./data.js";
import type { EventType, MatchEvent } from "./types.js";

const app = express();

app.use(cors());
app.use(express.json());

const events: MatchEvent[] = [];
const clients = new Set<import("express").Response>();

let eventCounter = 0;

function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
    // Most events are passes; shots are deliberately rare.
    const roll = Math.random();

    if (roll < 0.005) {
      eventType = "shot";       // 0.5%
    } else if (roll < 0.16) {
      eventType = "tackle";     // 15.5%
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
  const x = randomNumber(5, 95);
  const y = randomNumber(5, 95);

  const event: MatchEvent = {
    event_id: `evt_${eventCounter}`,
    match_id: match.match_id,
    minute: Math.floor((eventCounter - 1) / 60),
    second: (eventCounter - 1) % 60,
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

    event.completed = completed;
    event.outcome = completed ? "successful" : "unsuccessful";
    event.end_x = Math.min(100, Math.max(0, x + randomNumber(-20, 25)));
    event.end_y = Math.min(100, Math.max(0, y + randomNumber(-20, 20)));
    event.pressure = Math.random();

    if (completed && recipient) {
      event.recipient_player_id = recipient.id;
    }
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

    event.end_x = 100;
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

  // The demo clock advances one second per generated event.
  match.clock_seconds = eventCounter - 1;

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
