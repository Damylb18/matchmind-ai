import { AWAY, HOME } from "../../data/teams";
import { formatClockSeconds, percent } from "../../lib/format";
import { emptyCounts, type CountStats } from "../../lib/matchState";
import type { MatchMetrics } from "../../types/match";
import { Panel } from "../Panel";

type KeyStatsProps = {
  teams: Record<string, CountStats>;
  metrics: MatchMetrics | null;
  sessionStart: number | null;
};

type Stat = { label: string; home: number | null; away: number | null; suffix?: string };

export function KeyStats({ teams, metrics, sessionStart }: KeyStatsProps) {
  const home = teams[HOME.apiName] ?? emptyCounts();
  const away = teams[AWAY.apiName] ?? emptyCounts();

  const stats: Stat[] = [
    {
      label: "Pass accuracy",
      home: percent(home.completedPasses, home.passes),
      away: percent(away.completedPasses, away.passes),
      suffix: "%",
    },
    { label: "Passes", home: home.passes, away: away.passes },
    { label: "Shots", home: home.shots, away: away.shots },
    { label: "Tackles", home: home.tackles, away: away.tackles },
  ];

  const since = sessionStart === null ? "" : ` since ${formatClockSeconds(sessionStart)}`;

  return (
    <Panel
      title="Key Stats"
      provenance="session"
      info={
        "Team figures are counted in this browser from events received since it connected, " +
        "so they cover only part of the match. Rings show the split between the two teams. " +
        "Match totals below come from the backend and cover both teams for the whole feed."
      }
      className="key-stats-panel"
    >
      <div className="key-stats">
        {stats.map((stat) => (
          <StatRing key={stat.label} stat={stat} />
        ))}
      </div>

      <div className="key-legend">
        <span>
          <i className="swatch home" /> {HOME.code}
        </span>
        <span>
          <i className="swatch away" /> {AWAY.code}
        </span>
        <span className="muted">Live session{since}</span>
      </div>

      <AuthoritativeTotals metrics={metrics} />
    </Panel>
  );
}

function StatRing({ stat }: { stat: Stat }) {
  const r = 25;
  const c = 2 * Math.PI * r;
  const gap = 3;
  const h = stat.home ?? 0;
  const a = stat.away ?? 0;
  const hasData = h + a > 0;
  const share = hasData ? h / (h + a) : 0;
  const homeLen = Math.max(0, share * c - gap);
  const awayLen = Math.max(0, (1 - share) * c - gap);
  const fmt = (value: number | null) => (value === null ? "–" : `${value}${stat.suffix ?? ""}`);

  return (
    <figure
      className="stat-ring"
      aria-label={`${stat.label}: ${HOME.name} ${fmt(stat.home)}, ${AWAY.name} ${fmt(stat.away)}`}
    >
      <figcaption>{stat.label}</figcaption>
      <div className="stat-ring-body">
        <div className="ring">
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r={r} className="ring-track" />
            {hasData && (
              <>
                <circle
                  cx="32"
                  cy="32"
                  r={r}
                  className="ring-arc home"
                  strokeDasharray={`${homeLen} ${c - homeLen}`}
                  strokeDashoffset={-gap / 2}
                />
                <circle
                  cx="32"
                  cy="32"
                  r={r}
                  className="ring-arc away"
                  strokeDasharray={`${awayLen} ${c - awayLen}`}
                  strokeDashoffset={-(share * c + gap / 2)}
                />
              </>
            )}
          </svg>
          <span className="ring-value">{fmt(stat.home)}</span>
        </div>
        <span className="ring-away">{fmt(stat.away)}</span>
      </div>
    </figure>
  );
}

export function AuthoritativeTotals({ metrics }: { metrics: MatchMetrics | null }) {
  return (
    <div className="api-totals">
      <span className="provenance provenance-authoritative">API total</span>
      <span className="api-totals-caption">Match-wide, both teams</span>
      <dl>
        <div>
          <dt>Passes</dt>
          <dd>{metrics?.attempted_passes ?? "–"}</dd>
        </div>
        <div>
          <dt>Completed</dt>
          <dd>{metrics?.completed_passes ?? "–"}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{metrics ? `${metrics.pass_accuracy}%` : "–"}</dd>
        </div>
      </dl>
    </div>
  );
}
