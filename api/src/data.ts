
import type { MatchState, Player, Team } from "./types.js";

export const teams: Team[] = [
  {
    id: "man_utd",
    name: "Manchester United",
    short_name: "MUN",
  },
  {
    id: "arsenal",
    name: "Arsenal",
    short_name: "ARS",
  },
];

export const players: Player[] = [
  {
    id: "mun_7",
    name: "Player 7",
    team_id: "man_utd",
    position: "MID",
    shirt_number: 7,
  },
  {
    id: "mun_8",
    name: "Player 8",
    team_id: "man_utd",
    position: "DEF",
    shirt_number: 8,
  },
  {
    id: "ars_10",
    name: "Player 10",
    team_id: "arsenal",
    position: "FWD",
    shirt_number: 10,
  },
];

export const match: MatchState = {
  match_id: "match_001",
  home_team_id: "man_utd",
  away_team_id: "arsenal",
  home_score: 0,
  away_score: 0,
  clock_seconds: 0,
  status: "live",
};
