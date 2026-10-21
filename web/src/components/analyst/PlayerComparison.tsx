import { useState } from "react";
import { HOME, teamByApiName } from "../../data/teams";
import { sortPlayers } from "../../lib/analysis";
import { EVENT_LABELS, formatClock, percent } from "../../lib/format";
import type { PlayerStats } from "../../lib/matchState";
import type { MatchEvent } from "../../types/match";
import { EmptyState, Panel } from "../Panel";
import { TeamCrest } from "../TeamCrest";

type PlayerComparisonProps = {
  players: Record<string, PlayerStats>;
  events: MatchEvent[];
  compact?: boolean;
};

type Row = { label: string; a: number | null; b: number | null; format?: (value: number) => string };

const avgIntensity = (stats: PlayerStats) => (stats.pressures ? stats.pressureSum / stats.pressures : null);

export function PlayerComparison({ players, events, compact = false }: PlayerComparisonProps) {
  const list = sortPlayers(Object.values(players));
  const [keyA, setKeyA] = useState<string | null>(null);
  const [keyB, setKeyB] = useState<string | null>(null);

  const fallbackA = list.find((item) => item.team === HOME.apiName) ?? list[0];
  const fallbackB = list.find((item) => item.team !== HOME.apiName) ?? list[1];
  const a = (keyA && players[keyA]) || fallbackA;
  const b = (keyB && players[keyB]) || fallbackB;

  const selector = (value: PlayerStats | undefined, onChange: (key: string) => void, label: string) => (
    <select
      className="compact-select"
      aria-label={label}
      value={value?.key ?? ""}
      onChange={(event) => onChange(event.target.value)}
      disabled={!list.length}
    >
      {list.map((item) => (
        <option key={item.key} value={item.key}>
          {teamByApiName(item.team)?.code ?? item.team} · {item.player}
        </option>
      ))}
    </select>
  );

  const rows: Row[] =
    a && b
      ? [
          { label: "Touches (events)", a: a.events, b: b.events },
          { label: "Passes", a: a.passes, b: b.passes },
          {
            label: "Pass accuracy",
            a: percent(a.completedPasses, a.passes),
            b: percent(b.completedPasses, b.passes),
            format: (value) => `${value}%`,
          },
          { label: "Shots", a: a.shots, b: b.shots },
          { label: "Tackles", a: a.tackles, b: b.tackles },
          { label: "Pressure actions", a: a.pressures, b: b.pressures },
          ...(compact
            ? []
            : [
                { label: "Completed passes", a: a.completedPasses, b: b.completedPasses },
                {
                  label: "Avg pressure intensity",
                  a: avgIntensity(a),
                  b: avgIntensity(b),
                  format: (value: number) => value.toFixed(2),
                },
              ]),
        ]
      : [];

  return (
    <Panel
      title={compact ? "Player Comparison" : "Feed Player Comparison"}
      provenance="session"
      info="Compares synthetic feed IDs (e.g. Player_7) for the selected period. These IDs are not linked to real footballers."
      className="player-compare-panel"
      actions={
        !compact && (
          <>
            {selector(a, setKeyA, "First feed player")}
            <span className="vs">vs</span>
            {selector(b, setKeyB, "Second feed player")}
          </>
        )
      }
    >
      {!a || !b ? (
        <EmptyState>Waiting for events from at least two feed players…</EmptyState>
      ) : (
        <>
          <div className="compare-heads">
            <PlayerHead stats={a} />
            {compact ? (
              <div className="compare-compact-select">
                {selector(a, setKeyA, "First feed player")}
                {selector(b, setKeyB, "Second feed player")}
              </div>
            ) : (
              <span className="vs">vs</span>
            )}
            <PlayerHead stats={b} align="right" />
          </div>

          <table className="comparison player-bars">
            <caption className="sr-only">
              {a.player} compared with {b.player}
            </caption>
            <tbody>
              {rows.map((row) => {
                const max = Math.max(row.a ?? 0, row.b ?? 0);
                const width = (value: number | null) => (max > 0 && value !== null ? (value / max) * 100 : 0);
                const fmt = (value: number | null) =>
                  value === null ? "–" : row.format ? row.format(value) : String(value);
                return (
                  <tr key={row.label}>
                    <td className="cmp-value">{fmt(row.a)}</td>
                    <td className="cmp-bar home">
                      <span style={{ width: `${width(row.a)}%`, background: teamByApiName(a.team)?.colors.data }} />
                    </td>
                    <th scope="row">{row.label}</th>
                    <td className="cmp-bar away">
                      <span style={{ width: `${width(row.b)}%`, background: teamByApiName(b.team)?.colors.data }} />
                    </td>
                    <td className="cmp-value away">{fmt(row.b)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!compact && (
            <div className="player-histories">
              <PlayerHistory stats={a} events={events} />
              <PlayerHistory stats={b} events={events} />
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

function PlayerHead({ stats, align = "left" }: { stats: PlayerStats; align?: "left" | "right" }) {
  const team = teamByApiName(stats.team);
  return (
    <div className={`player-head ${align}`}>
      {team && <TeamCrest team={team} size={28} />}
      <div>
        <strong className="synthetic-id">{stats.player}</strong>
        <span>{team?.name ?? stats.team} · synthetic ID</span>
      </div>
    </div>
  );
}

function PlayerHistory({ stats, events }: { stats: PlayerStats; events: MatchEvent[] }) {
  const own = events
    .filter((event) => event.team === stats.team && event.player === stats.player)
    .slice(-10)
    .reverse();
  const team = teamByApiName(stats.team);

  return (
    <div className="player-history">
      <h3>
        <span className="synthetic-id">{stats.player}</span> · {team?.shortName ?? stats.team} · latest events
      </h3>
      <ol>
        {own.map((event) => (
          <li key={event.event_id}>
            <time>{formatClock(event.minute, event.second)}</time>
            <span>{EVENT_LABELS[event.event_type]}</span>
            <span className="muted">
              {event.event_type === "pass" && typeof event.completed === "boolean"
                ? event.completed
                  ? "Completed"
                  : "Incomplete"
                : typeof event.pressure === "number" && event.event_type === "pressure"
                  ? `Intensity ${event.pressure.toFixed(2)}`
                  : ""}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
