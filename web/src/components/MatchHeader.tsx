import type { ReactNode } from "react";
import { AWAY, HOME, type TeamInfo } from "../data/teams";
import { formatClock, STATUS_TEXT } from "../lib/format";
import type { ConnectionStatus } from "../types/match";
import { TeamCrest } from "./TeamCrest";

type MatchHeaderProps = {
  minute: number | null;
  second: number | null;
  status: ConnectionStatus;
  children?: ReactNode;
};

export function MatchHeader({ minute, second, status, children }: MatchHeaderProps) {
  const isLive = status === "live" && minute !== null;

  return (
    <header className="match-header">
      <div className="match-header-bg" aria-hidden="true">
        <svg viewBox="0 0 1200 260" preserveAspectRatio="xMidYMax slice">
          <g fill="none" stroke="currentColor" strokeWidth="1.2">
            <ellipse cx="600" cy="300" rx="560" ry="150" />
            <ellipse cx="600" cy="300" rx="120" ry="44" />
            <line x1="600" y1="150" x2="600" y2="260" />
          </g>
        </svg>
      </div>

      <div className="match-header-top">
        <p className="match-context">
          <span>Premier League</span>
          <span aria-hidden="true">·</span>
          <span>Live Demo Match</span>
        </p>
        <span className={`status-pill status-${status}`} role="status">
          <span className="dot" aria-hidden="true" />
          {STATUS_TEXT[status]}
        </span>
      </div>

      <h1 className="sr-only">
        {HOME.name} versus {AWAY.name}
      </h1>
      <div className="fixture">
        <TeamSide team={HOME} />

        <div className="scoreboard">
          <div
            className="score"
            aria-label="Score unavailable: the event feed does not include goals"
            title="The event feed does not include goals or a scoreline yet"
          >
            <span>–</span>
            <span className="score-sep">:</span>
            <span>–</span>
          </div>
          <div className="clock-row">
            <time className="match-clock" aria-label="Match clock">
              {minute !== null && second !== null ? formatClock(minute, second) : "--:--"}
            </time>
            {isLive && <span className="live-tag">Live</span>}
          </div>
          <span className="score-note">Score not in data feed</span>
        </div>

        <TeamSide team={AWAY} away />
      </div>

      {children}
    </header>
  );
}

function TeamSide({ team, away = false }: { team: TeamInfo; away?: boolean }) {
  return (
    <div className={away ? "team-side away" : "team-side"}>
      <TeamCrest team={team} size={56} />
      <p className="team-name">
        <span className="full">{team.name}</span>
        <span className="short">{team.code}</span>
      </p>
    </div>
  );
}
