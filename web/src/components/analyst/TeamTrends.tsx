import { useState, type PointerEvent } from "react";
import { AWAY, HOME } from "../../data/teams";
import { metricValue, perMinute, TREND_METRICS, type TrendMetric } from "../../lib/analysis";
import { emptyCounts } from "../../lib/matchState";
import { formatClock } from "../../lib/format";
import type { MatchEvent } from "../../types/match";
import { EmptyState, Panel } from "../Panel";

const W = 600;
const H = 180;
const PAD = 10;

export function TeamTrends({ events }: { events: MatchEvent[] }) {
  const [metric, setMetric] = useState<TrendMetric>("passes");
  const [hoverMinute, setHoverMinute] = useState<number | null>(null);
  const meta = TREND_METRICS.find((item) => item.id === metric)!;

  const selector = (
    <select
      className="compact-select"
      aria-label="Trend metric"
      value={metric}
      onChange={(event) => setMetric(event.target.value as TrendMetric)}
    >
      {TREND_METRICS.map((item) => (
        <option key={item.id} value={item.id}>
          {item.label}
        </option>
      ))}
    </select>
  );

  const info =
    "Per-minute values for each team, from events received in this browser during the selected period. " +
    "The first and last minutes may be partial.";

  if (events.length === 0) {
    return (
      <Panel title="Team Trends" provenance="session" info={info} actions={selector} className="trends-panel">
        <EmptyState>No events in this period yet.</EmptyState>
      </Panel>
    );
  }

  const buckets = perMinute(events);
  const first = events[0]!.minute;
  const last = events[events.length - 1]!.minute;
  const minutes = Array.from({ length: last - first + 1 }, (_, index) => first + index);
  const series = [HOME, AWAY].map((team) => ({
    team,
    values: minutes.map((minute) => {
      // A minute with no events for this team is 0 for counts, and undefined for ratios.
      return metricValue(buckets.get(minute)?.[team.apiName] ?? emptyCounts(), metric);
    }),
  }));

  const maxValue =
    metric === "accuracy" ? 100 : metric === "intensity" ? 1 : Math.max(1, ...series.flatMap((s) => s.values.map((v) => v ?? 0)));
  const x = (index: number) => (minutes.length === 1 ? W / 2 : (index / (minutes.length - 1)) * W);
  const y = (value: number) => PAD + (1 - value / maxValue) * (H - PAD * 2);
  const path = (values: (number | null)[]) =>
    values
      .map((value, index) => (value === null ? null : `${x(index).toFixed(1)},${y(value).toFixed(1)}`))
      .reduce<string>((d, point, index, all) => {
        if (point === null) return d;
        return d + (index === 0 || all[index - 1] === null ? ` M${point}` : ` L${point}`);
      }, "");

  const fmt = (value: number | null) =>
    value === null ? "–" : metric === "intensity" ? value.toFixed(2) : `${value}${meta.unit ?? ""}`;

  const hoverIndex = hoverMinute === null ? -1 : minutes.indexOf(hoverMinute);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    setHoverMinute(minutes[Math.round(ratio * (minutes.length - 1))] ?? null);
  };

  return (
    <Panel title="Team Trends" provenance="session" info={info} actions={selector} className="trends-panel">
      <div className="trend-chart">
        <div className="trend-y" aria-hidden="true">
          <span>{fmt(maxValue)}</span>
          <span>{fmt(metric === "intensity" ? 0.5 : Math.round(maxValue / 2))}</span>
          <span>0</span>
        </div>
        <div className="trend-plot" onPointerMove={onPointerMove} onPointerLeave={() => setHoverMinute(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${meta.label} per minute by team`}>
          {[0, 0.5, 1].map((t) => (
            <line key={t} x1={0} x2={W} y1={PAD + t * (H - PAD * 2)} y2={PAD + t * (H - PAD * 2)} className="grid" />
          ))}
          {series.map(({ team, values }) => (
            <path key={team.id} d={path(values)} className={`rolling ${team.id === HOME.id ? "home" : "away"}`} />
          ))}
          {hoverIndex >= 0 && <line x1={x(hoverIndex)} x2={x(hoverIndex)} y1={0} y2={H} className="crosshair" />}
        </svg>
        {series.map(({ team, values }) =>
          values.map((value, index) =>
            value === null ? null : (
              <span
                key={`${team.id}-${minutes[index]}`}
                className={`trend-dot ${team.id === HOME.id ? "home" : "away"}`}
                style={{ left: `${(x(index) / W) * 100}%`, top: `${(y(value) / H) * 100}%` }}
                aria-hidden="true"
              />
            ),
          ),
        )}
        {hoverIndex >= 0 && (
          <div className="chart-tooltip" style={{ left: `${(x(hoverIndex) / W) * 100}%` }}>
            <strong>
              {formatClock(minutes[hoverIndex]!, 0)}–{formatClock(minutes[hoverIndex]!, 59)}
            </strong>
            {series.map(({ team, values }) => (
              <span key={team.id}>
                {team.code} {fmt(values[hoverIndex] ?? null)}
              </span>
            ))}
          </div>
        )}
        </div>
      </div>
      <div className="chart-axis trend-axis">
        <span>{formatClock(first, 0)}</span>
        <span className="key-legend inline">
          <span>
            <i className="swatch home" /> {HOME.code}
          </span>
          <span>
            <i className="swatch away" /> {AWAY.code}
          </span>
          <span className="muted">{meta.label} per clock minute</span>
        </span>
        <span>{formatClock(last, 0)}</span>
      </div>
    </Panel>
  );
}
