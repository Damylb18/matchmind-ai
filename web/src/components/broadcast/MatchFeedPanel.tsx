import { AWAY, HOME, teamByApiName } from "../../data/teams";
import { EVENT_LABELS, formatClock, formatClockSeconds, STATUS_TEXT } from "../../lib/format";
import type { MatchState } from "../../lib/matchState";
import type { ConnectionStatus, MatchEvent } from "../../types/match";
import { Icon } from "../icons/Icon";
import { TeamCrest } from "../TeamCrest";

const FEED_LENGTH = 6;

const OUTCOME_TEXT: Record<string, string> = {
  goal: "Goal",
  on_target: "On target",
  off_target: "Off target",
  saved: "Saved",
  blocked: "Blocked",
  successful: "Won",
  unsuccessful: "Lost",
};

const MATCH_STATUS: Record<string, string> = { live: "Live", half_time: "Half time", full_time: "Full time" };

function detail(event: MatchEvent): string {
  if (event.event_type === "pass" && typeof event.completed === "boolean") {
    return event.completed ? "Completed" : "Incomplete";
  }
  if (event.event_type === "pressure" && typeof event.pressure === "number") {
    return `Intensity ${event.pressure.toFixed(2)}`;
  }
  return event.outcome ? (OUTCOME_TEXT[event.outcome] ?? event.outcome) : "";
}

type MatchFeedPanelProps = { state: MatchState; status: ConnectionStatus };

/** What the feed is actually sending: score, latest events and the latest backend insight. */
export function MatchFeedPanel({ state, status }: MatchFeedPanelProps) {
  const { match } = state;
  const home = (match && teamByApiName(match.home_team_id)) || HOME;
  const away = (match && teamByApiName(match.away_team_id)) || AWAY;
  const events = state.events.slice(0, FEED_LENGTH);
  const insight = state.insights[0];
  const updating = status === "live";

  return (
    <section className="panel bc-feed" aria-label="Match feed">
      <header className="panel-head">
        <Icon name="database" size={16} />
        <h2>Match Feed</h2>
        <span className={`bc-feed-status status-${status}`}>
          <span className="dot" aria-hidden="true" />
          {updating ? "Updating" : STATUS_TEXT[status]}
        </span>
      </header>

      <div className={updating ? "bc-feed-score" : "bc-feed-score is-stale"}>
        <span className="bc-feed-team">
          <TeamCrest team={home} size={20} /> {home.code}
        </span>
        <strong>{match ? `${match.home_score} – ${match.away_score}` : "–"}</strong>
        <span className="bc-feed-team">
          {away.code} <TeamCrest team={away} size={20} />
        </span>
        <span className="bc-feed-clock">
          {!match
            ? "No match state yet"
            : updating
              ? `${formatClockSeconds(match.clock_seconds)} · ${MATCH_STATUS[match.status]}`
              : `Last known · ${formatClockSeconds(match.clock_seconds)}`}
        </span>
      </div>

      {events.length === 0 ? (
        <p className="empty-state">
          {updating || status === "connecting" ? "Waiting for the first match event…" : "No events received — the feed is not connected."}
        </p>
      ) : (
        <ol className="bc-feed-list" aria-label="Latest events">
          {events.map((event) => {
            const team = teamByApiName(event.team);
            const isGoal = event.outcome === "goal";
            return (
              <li key={event.event_id} className={isGoal ? "is-goal" : undefined}>
                <time>{formatClock(event.minute, event.second)}</time>
                {team ? <TeamCrest team={team} size={14} /> : <span />}
                <span className="bc-feed-type">{isGoal ? "Goal" : EVENT_LABELS[event.event_type]}</span>
                <span className="bc-feed-detail">{isGoal ? team?.name : detail(event)}</span>
                <span className="synthetic-id">{event.player}</span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="bc-feed-insight">
        <span className="bc-feed-label">Latest backend insight</span>
        {insight ? (
          <p>
            <strong>{insight.headline}</strong>
            <span>{formatClockSeconds(insight.clock)}</span>
          </p>
        ) : (
          <p className="muted">None yet — insights fire on sustained high pressure.</p>
        )}
      </div>
    </section>
  );
}
