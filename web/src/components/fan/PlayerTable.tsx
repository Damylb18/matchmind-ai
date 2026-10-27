import { teamByApiName } from "../../data/teams";
import { percent } from "../../lib/format";
import type { PlayerStats } from "../../lib/matchState";
import { EmptyState, Panel } from "../Panel";
import { TeamCrest } from "../TeamCrest";

export function PlayerTable({ players }: { players: Record<string, PlayerStats> }) {
  const rows = Object.values(players).sort(
    (a, b) =>
      a.team.localeCompare(b.team) || a.player.localeCompare(b.player, undefined, { numeric: true }),
  );

  return (
    <Panel
      title="Feed Players"
      provenance="session"
      info="Per-ID totals from the current demo match. IDs are synthetic and not mapped to real players."
      className="player-table-panel"
    >
      {rows.length === 0 ? (
        <EmptyState>Waiting for match events…</EmptyState>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Player ID</th>
                <th scope="col">Team</th>
                <th scope="col">Touches</th>
                <th scope="col">Passes</th>
                <th scope="col">Pass acc.</th>
                <th scope="col">Shots</th>
                <th scope="col">Tackles</th>
                <th scope="col">Pressures</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const team = teamByApiName(row.team);
                const accuracy = percent(row.completedPasses, row.passes);
                return (
                  <tr key={row.key}>
                    <th scope="row" className="synthetic-id">
                      {row.player}
                    </th>
                    <td>
                      <span className="table-team">
                        {team && <TeamCrest team={team} size={16} />}
                        {team?.shortName ?? row.team}
                      </span>
                    </td>
                    <td>{row.events}</td>
                    <td>{row.passes}</td>
                    <td>{accuracy === null ? "–" : `${accuracy}%`}</td>
                    <td>{row.shots}</td>
                    <td>{row.tackles}</td>
                    <td>{row.pressures}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
