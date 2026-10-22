import type { CSSProperties } from "react";
import { AWAY, HOME } from "../../data/teams";
import { TeamCrest } from "../TeamCrest";
import type { Overlays } from "./productionState";
import type { BackendMatchState } from "../../types/match";

type BroadcastScoreboardProps = {
  settings: Overlays["scoreboard"];
  visible: boolean;
  clock: string;
  live: boolean;
  match: BackendMatchState | null;
};

/** Scorebug showing the backend score when available. */
export function BroadcastScoreboard({ settings, visible, clock, live, match }: BroadcastScoreboardProps) {
  const { style, identifiers } = settings;
  const scoreLabel = match ? `${match.home_score}–${match.away_score}` : "v";
  const crest = (team: typeof HOME) =>
    identifiers ? (
      <span className="bc-crest">
        <TeamCrest team={team} size={24} />
      </span>
    ) : null;

  const meta = (settings.clock || (settings.live && live)) && (
    <span className="bc-sb-meta">
      {settings.clock && <span className="bc-sb-clock">{clock}</span>}
      {settings.live && live && <span className="bc-sb-live">Live</span>}
    </span>
  );

  return (
    <div
      className={`bc-overlay bc-scoreboard style-${style} pos-${settings.position}`}
      data-visible={visible}
      style={{ "--bc-scale": settings.scale / 100 } as CSSProperties}
      aria-label={`${HOME.name} ${scoreLabel} ${AWAY.name}, ${clock}`}
    >
      {style === "minimal" ? (
        <div className="bc-sb-row">
          <span className="bc-sb-code" style={{ borderColor: identifiers ? HOME.colors.data : undefined }}>
            {HOME.code}
          </span>
          <span className="bc-sb-vs">{scoreLabel}</span>
          <span className="bc-sb-code" style={{ borderColor: identifiers ? AWAY.colors.data : undefined }}>
            {AWAY.code}
          </span>
          {meta}
        </div>
      ) : (
        <div className="bc-sb-row">
          {crest(HOME)}
          <span className="bc-sb-team">{style === "wide" ? HOME.name : HOME.code}</span>
          <span className="bc-sb-vs">{scoreLabel}</span>
          <span className="bc-sb-team">{style === "wide" ? AWAY.name : AWAY.code}</span>
          {crest(AWAY)}
          {meta}
        </div>
      )}
    </div>
  );
}
