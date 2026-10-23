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

type SquadMember = {
  shirt_number: number;
  position: Player["position"];
};

function createSquad(
  teamId: string,
  prefix: string,
  squad: SquadMember[]
): Player[] {
  return squad.map(({ shirt_number, position }) => ({
    id: `${prefix}_${shirt_number}`,
    name: `Player ${shirt_number}`,
    team_id: teamId,
    position,
    shirt_number,
  }));
}

const manUtdSquad: SquadMember[] = [
  { shirt_number: 1, position: "GK" },
  { shirt_number: 2, position: "DEF" },
  { shirt_number: 3, position: "DEF" },
  { shirt_number: 4, position: "DEF" },
  { shirt_number: 5, position: "DEF" },
  { shirt_number: 6, position: "MID" },
  { shirt_number: 7, position: "MID" },
  { shirt_number: 8, position: "DEF" },
  { shirt_number: 9, position: "FWD" },
  { shirt_number: 10, position: "MID" },
  { shirt_number: 11, position: "FWD" },
];

const arsenalSquad: SquadMember[] = [
  { shirt_number: 1, position: "GK" },
  { shirt_number: 2, position: "DEF" },
  { shirt_number: 3, position: "DEF" },
  { shirt_number: 4, position: "DEF" },
  { shirt_number: 5, position: "DEF" },
  { shirt_number: 6, position: "MID" },
  { shirt_number: 7, position: "MID" },
  { shirt_number: 8, position: "MID" },
  { shirt_number: 9, position: "FWD" },
  { shirt_number: 10, position: "FWD" },
  { shirt_number: 11, position: "FWD" },
];

export const players: Player[] = [
  ...createSquad("man_utd", "mun", manUtdSquad),
  ...createSquad("arsenal", "ars", arsenalSquad),
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