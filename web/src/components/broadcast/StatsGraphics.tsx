import { AWAY, HOME } from "../../data/teams";
import { formatClockSeconds, percent } from "../../lib/format";
import { emptyCounts, HIGH_PRESSURE_THRESHOLD, type CountStats, type InsightEntry, type PressurePoint } from "../../lib/matchState";
import type { MatchMetrics } from "../../types/match";
import { usePersonaliser } from "../../hooks/usePersonaliser";
import { TeamCrest } from "../TeamCrest";
import { rollingPressure, ROLLING_WINDOW } from "./liveData";

type Row = { label: string; home: number | null; away: number | null; fmt?: (value: number) => string };

function sessionRows(teams: Record<string, CountStats>): Row[] {
  const h = teams[HOME.apiName] ?? emptyCounts();
  const a = teams[AWAY.apiName] ?? emptyCounts();
  const avg = (stats: CountStats) => (stats.pressures ? stats.pressureSum / stats.pressures : null);
  return [
    { label: "Passes", home: h.passes, away: a.passes },
    {
      label: "Pass accuracy",
      home: percent(h.completedPasses, h.passes),
      away: percent(a.completedPasses, a.passes),
      fmt: (value) => `${value}%`,
    },
    { label: "Shots", home: h.shots, away: a.shots },
    { label: "Tackles", home: h.tackles, away: a.tackles },
    { label: "Pressure actions", home: h.pressures, away: a.pressures },
    { label: "Avg pressure", home: avg(h), away: avg(a), fmt: (value) => value.toFixed(2) },
  ];
}

const show = (row: Row, value: number | null) => (value === null ? "–" : row.fmt ? row.fmt(value) : String(value));

const sessionNote = (sessionStart: number | null) =>
  sessionStart === null ? "Live session" : `Live session since ${formatClockSeconds(sessionStart)}`;

/** Compact strip overlay: four session metrics. */
export function StatsStrip({
  teams,
  sessionStart,
  visible,
}: {
  teams: Record<string, CountStats>;
  sessionStart: number | null;
  visible: boolean;
}) {
  const rows = sessionRows(teams).filter((row) => ["Passes", "Pass accuracy", "Shots", "Avg pressure"].includes(row.label));
  return (
    <div className="bc-overlay bc-strip" data-visible={visible}>
      <span className="bc-strip-team">
        <TeamCrest team={HOME} size={18} /> {HOME.code}
      </span>
      {rows.map((row) => (
        <span key={row.label} className="bc-strip-cell">
          <b>{show(row, row.home)}</b>
          <em>{row.label}</em>
          <b>{show(row, row.away)}</b>
        </span>
      ))}
      <span className="bc-strip-team">
        {AWAY.code} <TeamCrest team={AWAY} size={18} />
      </span>
      <span className="bc-strip-note">{sessionNote(sessionStart)}</span>
    </div>
  );
}

/** Rolling pressure per team against the backend insight threshold. Live data. */
export function PressureMeter({ points, visible }: { points: PressurePoint[]; visible: boolean }) {
  return (
    <div className="bc-overlay bc-meter" data-visible={visible}>
      <span className="bc-meter-title">Pressure · last {ROLLING_WINDOW} events</span>
      {[HOME, AWAY].map((team) => {
        const value = rollingPressure(points, team.apiName);
        return (
          <div key={team.id} className="bc-meter-row">
            <span>{team.code}</span>
            <span className="bc-meter-track">
              <span className="bc-meter-fill" style={{ width: `${(value ?? 0) * 100}%`, background: team.colors.data }} />
              <span className="bc-meter-threshold" style={{ left: `${HIGH_PRESSURE_THRESHOLD * 100}%` }} />
            </span>
            <b>{value === null ? "–" : value.toFixed(2)}</b>
          </div>
        );
      })}
    </div>
  );
}

/** Backend match-wide total — both teams combined. */
export function PassAccuracyChip({ metrics, visible }: { metrics: MatchMetrics | null; visible: boolean }) {
  return (
    <div className="bc-overlay bc-chip-accuracy" data-visible={visible}>
      <b>{metrics ? `${metrics.pass_accuracy}%` : "–"}</b>
      <span>
        Pass accuracy
        <em>Match total · both teams</em>
      </span>
    </div>
  );
}

export function InsightTicker({ insights, visible }: { insights: InsightEntry[]; visible: boolean }) {
  const personalise = usePersonaliser("broadcast");
  const items = insights.slice(0, 5);
  return (
    <div className="bc-overlay bc-ticker" data-visible={visible}>
      <span className="bc-ticker-label">MatchMind AI</span>
      <div className="bc-ticker-track">
        {items.length === 0 ? (
          <span>Awaiting backend insights</span>
        ) : (
          <div className="bc-ticker-run">
            {[...items, ...items].map((insight, index) => (
              <span key={`${insight.key}-${index}`}>
                {formatClockSeconds(insight.clock)} · {personalise(insight).headline}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Full-frame stats scene. */
export function StatsScene({
  teams,
  metrics,
  sessionStart,
}: {
  teams: Record<string, CountStats>;
  metrics: MatchMetrics | null;
  sessionStart: number | null;
}) {
  const rows = sessionRows(teams);
  return (
    <div className="bc-card bc-stats-card">
      <header className="bc-stats-head">
        <span>
          <TeamCrest team={HOME} size={30} />
          {HOME.name}
        </span>
        <strong>Team Comparison</strong>
        <span>
          {AWAY.name}
          <TeamCrest team={AWAY} size={30} />
        </span>
      </header>
      {rows.map((row, index) => {
        const max = Math.max(row.home ?? 0, row.away ?? 0);
        const width = (value: number | null) => (max > 0 && value !== null ? (value / max) * 100 : 0);
        return (
          <div key={row.label} className="bc-stats-row" style={{ animationDelay: `${0.08 * index}s` }}>
            <b>{show(row, row.home)}</b>
            <span className="bc-stats-bar home">
              <span style={{ width: `${width(row.home)}%` }} />
            </span>
            <em>{row.label}</em>
            <span className="bc-stats-bar away">
              <span style={{ width: `${width(row.away)}%` }} />
            </span>
            <b>{show(row, row.away)}</b>
          </div>
        );
      })}
      <footer className="bc-stats-foot">
        <span>{sessionNote(sessionStart)} · not full-match statistics</span>
        <span>
          Match total pass accuracy, both teams: <b>{metrics ? `${metrics.pass_accuracy}%` : "–"}</b>
        </span>
      </footer>
    </div>
  );
}
