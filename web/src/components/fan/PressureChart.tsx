import { useState } from "react";
import { AWAY, HOME, teamByApiName } from "../../data/teams";
import { formatClockSeconds } from "../../lib/format";
import { HIGH_PRESSURE_THRESHOLD, type PressurePoint } from "../../lib/matchState";
import { EmptyState, Panel } from "../Panel";

const W = 600;
const H = 150;
const PAD_Y = 8;
/** Mirrors WINDOW_SIZE in api/src/rules.ts. */
const ROLLING_WINDOW = 10;

type PressureChartProps = { points: PressurePoint[]; title?: string };

export function PressureChart({ points, title = "Pressure Intensity" }: PressureChartProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const info =
    "Every pressure event from the feed (0–1 intensity). Lines show each team's rolling average of its last " +
    `${ROLLING_WINDOW} pressure events — the same signal the backend uses to trigger insights when it exceeds ` +
    `${HIGH_PRESSURE_THRESHOLD}.`;

  if (points.length === 0) {
    return (
      <Panel title={title} provenance="session" info={info} className="pressure-panel">
        <EmptyState>Waiting for pressure events…</EmptyState>
      </Panel>
    );
  }

  const from = points[0]!.clock;
  const to = Math.max(from + 60, points[points.length - 1]!.clock);
  const x = (clock: number) => ((clock - from) / (to - from)) * W;
  const y = (value: number) => PAD_Y + (1 - value) * (H - PAD_Y * 2);

  const lines = [HOME, AWAY].map((team) => {
    const own = points.filter((point) => point.team === team.apiName);
    const coords = own.map((point, index) => {
      const window = own.slice(Math.max(0, index - ROLLING_WINDOW + 1), index + 1);
      const average = window.reduce((sum, item) => sum + item.value, 0) / window.length;
      return `${x(point.clock).toFixed(1)},${y(average).toFixed(1)}`;
    });
    return { team, d: coords.length > 1 ? `M${coords.join(" L")}` : "" };
  });

  const hovered = points.find((point) => point.id === hoverId);
  const hoveredTeam = hovered ? teamByApiName(hovered.team) : undefined;

  return (
    <Panel title={title} provenance="session" info={info} className="pressure-panel">
      <div className="pressure-chart">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Pressure intensity over time by team">
          {[0.25, 0.5, 1].map((tick) => (
            <line key={tick} x1={0} x2={W} y1={y(tick)} y2={y(tick)} className="grid" />
          ))}
          <line
            x1={0}
            x2={W}
            y1={y(HIGH_PRESSURE_THRESHOLD)}
            y2={y(HIGH_PRESSURE_THRESHOLD)}
            className="threshold"
          />
          {lines.map(({ team, d }) => (
            <path key={team.id} d={d} className={`rolling ${team.id === HOME.id ? "home" : "away"}`} />
          ))}
        </svg>

        {points.map((point) => (
          <span
            key={point.id}
            className={`pressure-dot ${point.team === HOME.apiName ? "home" : "away"}`}
            style={{ left: `${(x(point.clock) / W) * 100}%`, top: `${(y(point.value) / H) * 100}%` }}
            aria-hidden="true"
            onPointerEnter={() => setHoverId(point.id)}
            onPointerLeave={() => setHoverId(null)}
          />
        ))}

        <span className="threshold-label" style={{ top: `${(y(HIGH_PRESSURE_THRESHOLD) / H) * 100}%` }}>
          Insight threshold {HIGH_PRESSURE_THRESHOLD}
        </span>

        {hovered && (
          <div
            className="chart-tooltip"
            style={{ left: `${(x(hovered.clock) / W) * 100}%` }}
            role="status"
          >
            <strong>{formatClockSeconds(hovered.clock)}</strong>
            <span>
              {hoveredTeam?.shortName ?? hovered.team} · {hovered.value.toFixed(2)}
            </span>
          </div>
        )}
      </div>
      <div className="chart-axis">
        <span>{formatClockSeconds(from)}</span>
        <span className="key-legend inline">
          <span>
            <i className="swatch home" /> {HOME.code}
          </span>
          <span>
            <i className="swatch away" /> {AWAY.code}
          </span>
          <span>
            <i className="swatch line" /> Rolling avg ({ROLLING_WINDOW})
          </span>
        </span>
        <span>{formatClockSeconds(to)}</span>
      </div>
    </Panel>
  );
}
