import type { CSSProperties } from "react";
import { AWAY, HOME, teamByApiName, type TeamInfo } from "../../data/teams";
import type { BackendMatchState } from "../../types/match";
import { TeamCrest } from "../TeamCrest";
import type { Overlays } from "./productionState";

type BroadcastScoreboardProps = {
  settings: Overlays["scoreboard"];
  visible: boolean;
  clock: string;
  /** Feed connected and updating. */
  live: boolean;
  /** Showing last known data while the feed is interrupted. */
  stale: boolean;
  match: BackendMatchState | null;
};

const STATUS_LABEL: Record<BackendMatchState["status"], string | null> = {
  live: null,
  half_time: "HT",
  full_time: "FT",
};

/**
 * Scorebug. Score, clock and status come from the backend's simulated match;
 * before the first match state arrives the score slot shows "v".
 */
export function BroadcastScoreboard({ settings, visible, clock, live, stale, match }: BroadcastScoreboardProps) {
  const { style, identifiers } = settings;
  // Follow the backend's home/away assignment, falling back to the configured fixture.
  const home: TeamInfo = (match && teamByApiName(match.home_team_id)) || HOME;
  const away: TeamInfo = (match && teamByApiName(match.away_team_id)) || AWAY;
  const statusLabel = match ? STATUS_LABEL[match.status] : null;
  const showLive = settings.live && live && !statusLabel;

  const crest = (team: TeamInfo) =>
    identifiers ? (
      <span className="bc-crest">
        <TeamCrest team={team} size={24} />
      </span>
    ) : null;

  // Keyed by the score so a change remounts it and replays the goal pulse.
  const score = match ? (
    <span key={`${match.home_score}-${match.away_score}`} className="bc-sb-score">
      <b>{match.home_score}</b>
      <i aria-hidden="true">–</i>
      <b>{match.away_score}</b>
    </span>
  ) : (
    <span className="bc-sb-vs">v</span>
  );

  const meta = (settings.clock || showLive || statusLabel) && (
    <span className={stale ? "bc-sb-meta is-stale" : "bc-sb-meta"}>
      {settings.clock && <span className="bc-sb-clock">{clock}</span>}
      {statusLabel && <span className="bc-sb-status">{statusLabel}</span>}
      {showLive && <span className="bc-sb-live">Live</span>}
    </span>
  );

  const label = match
    ? `${home.name} ${match.home_score}, ${away.name} ${match.away_score}, ${clock}`
    : `${home.name} v ${away.name}, ${clock}`;

  return (
    <div
      className={`bc-overlay bc-scoreboard style-${style} pos-${settings.position}`}
      data-visible={visible}
      style={{ "--bc-scale": settings.scale / 100 } as CSSProperties}
      aria-label={label}
    >
      {style === "minimal" ? (
        <div className="bc-sb-row">
          <span className="bc-sb-code" style={{ borderColor: identifiers ? home.colors.data : undefined }}>
            {home.code}
          </span>
          {score}
          <span className="bc-sb-code" style={{ borderColor: identifiers ? away.colors.data : undefined }}>
            {away.code}
          </span>
          {meta}
        </div>
      ) : (
        <div className="bc-sb-row">
          {crest(home)}
          <span className="bc-sb-team">{style === "wide" ? home.name : home.code}</span>
          {score}
          <span className="bc-sb-team">{style === "wide" ? away.name : away.code}</span>
          {crest(away)}
          {meta}
        </div>
      )}
    </div>
  );
}
