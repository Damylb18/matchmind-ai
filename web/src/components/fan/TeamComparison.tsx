import type { ReactNode } from "react";
import { AWAY, HOME } from "../../data/teams";
import { percent } from "../../lib/format";
import { emptyCounts, type CountStats } from "../../lib/matchState";
import { Panel } from "../Panel";
import { TeamCrest } from "../TeamCrest";

type Row = { label: string; home: number | null; away: number | null; format?: (v: number) => string };

type TeamComparisonProps = {
  teams: Record<string, CountStats>;
  title?: string;
  info?: string;
  className?: string;
  children?: ReactNode;
};

const DEFAULT_INFO =
  "Counted from events received since this browser connected. Bars compare the two values in each row.";

export function TeamComparison({
  teams,
  title = "Team Comparison",
  info = DEFAULT_INFO,
  className = "comparison-panel",
  children,
}: TeamComparisonProps) {
  const h = teams[HOME.apiName] ?? emptyCounts();
  const a = teams[AWAY.apiName] ?? emptyCounts();
  const avg = (stats: CountStats) => (stats.pressures ? stats.pressureSum / stats.pressures : null);

  const rows: Row[] = [
    { label: "Passes", home: h.passes, away: a.passes },
    { label: "Completed passes", home: h.completedPasses, away: a.completedPasses },
    {
      label: "Pass accuracy",
      home: percent(h.completedPasses, h.passes),
      away: percent(a.completedPasses, a.passes),
      format: (v) => `${v}%`,
    },
    { label: "Shots", home: h.shots, away: a.shots },
    { label: "Tackles", home: h.tackles, away: a.tackles },
    { label: "Pressure actions", home: h.pressures, away: a.pressures },
    {
      label: "Avg pressure intensity",
      home: avg(h),
      away: avg(a),
      format: (v) => v.toFixed(2),
    },
  ];

  return (
    <Panel
      title={title}
      provenance="session"
      info={info}
      className={className}
    >
      <div className="comparison-teams">
        <span>
          <TeamCrest team={HOME} size={24} /> {HOME.name}
        </span>
        <span>
          {AWAY.name} <TeamCrest team={AWAY} size={24} />
        </span>
      </div>
      <table className="comparison">
        <caption className="sr-only">Team comparison for this live session</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">{HOME.name}</th>
            <th scope="col">Metric</th>
            <th scope="col">{AWAY.name}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const max = Math.max(row.home ?? 0, row.away ?? 0);
            const width = (value: number | null) => (max > 0 && value !== null ? (value / max) * 100 : 0);
            const fmt = (value: number | null) =>
              value === null ? "–" : row.format ? row.format(value) : String(value);
            return (
              <tr key={row.label}>
                <td className="cmp-value">{fmt(row.home)}</td>
                <td className="cmp-bar home">
                  <span style={{ width: `${width(row.home)}%` }} />
                </td>
                <th scope="row">{row.label}</th>
                <td className="cmp-bar away">
                  <span style={{ width: `${width(row.away)}%` }} />
                </td>
                <td className="cmp-value away">{fmt(row.away)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {children}
    </Panel>
  );
}
