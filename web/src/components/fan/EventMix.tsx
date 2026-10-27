import { AWAY, HOME, type TeamInfo } from "../../data/teams";
import { emptyCounts, type CountStats } from "../../lib/matchState";
import { Panel } from "../Panel";
import { TeamCrest } from "../TeamCrest";

const SEGMENTS = [
  { key: "passes", label: "Passes", className: "mix-pass" },
  { key: "shots", label: "Shots", className: "mix-shot" },
  { key: "tackles", label: "Tackles", className: "mix-tackle" },
  { key: "pressures", label: "Pressure", className: "mix-pressure" },
] as const;

export function EventMix({ teams }: { teams: Record<string, CountStats> }) {
  return (
    <Panel
      title="Event Mix"
      provenance="session"
      info="Share of each team's events by type in the current demo match."
      className="mix-panel"
    >
      <div className="mix-rows">
        {[HOME, AWAY].map((team) => (
          <MixRow key={team.id} team={team} stats={teams[team.apiName] ?? emptyCounts()} />
        ))}
      </div>
      <div className="key-legend">
        {SEGMENTS.map((segment) => (
          <span key={segment.key}>
            <i className={`swatch ${segment.className}`} /> {segment.label}
          </span>
        ))}
      </div>
    </Panel>
  );
}

function MixRow({ team, stats }: { team: TeamInfo; stats: CountStats }) {
  const total = stats.events;
  return (
    <div className="mix-row">
      <div className="mix-row-head">
        <TeamCrest team={team} size={18} />
        <span>{team.shortName}</span>
        <span className="muted">{total} events</span>
      </div>
      <div className="mix-bar" role="img" aria-label={SEGMENTS.map((s) => `${s.label} ${stats[s.key]}`).join(", ")}>
        {total > 0 &&
          SEGMENTS.map((segment) =>
            stats[segment.key] > 0 ? (
              <span
                key={segment.key}
                className={segment.className}
                style={{ flexGrow: stats[segment.key] }}
                title={`${segment.label}: ${stats[segment.key]} (${Math.round((stats[segment.key] / total) * 100)}%)`}
              >
                {stats[segment.key] / total >= 0.12 ? stats[segment.key] : ""}
              </span>
            ) : null,
          )}
      </div>
    </div>
  );
}
