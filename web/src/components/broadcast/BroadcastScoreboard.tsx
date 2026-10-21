import type { CSSProperties } from "react";
import { AWAY, HOME } from "../../data/teams";
import { TeamCrest } from "../TeamCrest";
import type { Overlays } from "./productionState";

type BroadcastScoreboardProps = {
  settings: Overlays["scoreboard"];
  visible: boolean;
  clock: string;
  live: boolean;
};

/**
 * Scorebug. The feed has no goals, so the score slot shows "v" — never a scoreline.
 */
export function BroadcastScoreboard({ settings, visible, clock, live }: BroadcastScoreboardProps) {
  const { style, identifiers } = settings;
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
      aria-label={`${HOME.name} v ${AWAY.name}, ${clock}`}
    >
      {style === "minimal" ? (
        <div className="bc-sb-row">
          <span className="bc-sb-code" style={{ borderColor: identifiers ? HOME.colors.data : undefined }}>
            {HOME.code}
          </span>
          <span className="bc-sb-vs">v</span>
          <span className="bc-sb-code" style={{ borderColor: identifiers ? AWAY.colors.data : undefined }}>
            {AWAY.code}
          </span>
          {meta}
        </div>
      ) : (
        <div className="bc-sb-row">
          {crest(HOME)}
          <span className="bc-sb-team">{style === "wide" ? HOME.name : HOME.code}</span>
          <span className="bc-sb-vs">v</span>
          <span className="bc-sb-team">{style === "wide" ? AWAY.name : AWAY.code}</span>
          {crest(AWAY)}
          {meta}
        </div>
      )}
    </div>
  );
}
