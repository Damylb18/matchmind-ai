import { useState } from "react";
import { teamByApiName } from "../../data/teams";
import { EVENT_LABELS, formatClock } from "../../lib/format";
import { HIGH_PRESSURE_THRESHOLD } from "../../lib/matchState";
import type { EventType, MatchEvent } from "../../types/match";
import { Icon } from "../icons/Icon";
import { EmptyState, Panel } from "../Panel";
import { TeamCrest } from "../TeamCrest";

type LiveEventsProps = {
  events: MatchEvent[];
  limit?: number;
  /** Show team / event type / player filters. */
  filters?: boolean;
  /** Show the pass outcome and pressure detail column. */
  details?: boolean;
  title?: string;
  onViewAll?: () => void;
};

const ALL = "all";

export function LiveEvents({
  events,
  limit = 5,
  filters = false,
  details = true,
  title = "Live Events",
  onViewAll,
}: LiveEventsProps) {
  const [team, setTeam] = useState(ALL);
  const [type, setType] = useState<EventType | typeof ALL>(ALL);
  const [player, setPlayer] = useState(ALL);

  const teamNames = Array.from(new Set(events.map((event) => event.team))).sort();
  const playerIds = Array.from(new Set(events.map((event) => event.player))).sort(
    (a, b) => a.localeCompare(b, undefined, { numeric: true }),
  );

  const visible = events
    .filter((event) => team === ALL || event.team === team)
    .filter((event) => type === ALL || event.event_type === type)
    .filter((event) => player === ALL || event.player === player)
    .slice(0, limit);

  return (
    <Panel
      title={title}
      provenance="session"
      info="Events streamed from the backend since this browser connected. Player names are synthetic IDs from the demo feed."
      className="events-panel"
      actions={
        onViewAll && (
          <button type="button" className="link-button" onClick={onViewAll}>
            View all <Icon name="arrowRight" size={14} />
          </button>
        )
      }
    >
      {filters && (
        <div className="filter-row">
          <label>
            <span>Team</span>
            <select value={team} onChange={(event) => setTeam(event.target.value)}>
              <option value={ALL}>All teams</option>
              {teamNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Event</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as EventType | typeof ALL)}
            >
              <option value={ALL}>All events</option>
              {(Object.keys(EVENT_LABELS) as EventType[]).map((item) => (
                <option key={item} value={item}>
                  {EVENT_LABELS[item]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Player ID</span>
            <select value={player} onChange={(event) => setPlayer(event.target.value)}>
              <option value={ALL}>All players</option>
              {playerIds.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState>
          {events.length === 0 ? "Waiting for match events…" : "No events match these filters yet."}
        </EmptyState>
      ) : (
        <ol className="event-list" aria-live="off">
          {visible.map((event) => (
            <EventRow key={event.event_id} event={event} details={details} />
          ))}
        </ol>
      )}
    </Panel>
  );
}

function EventRow({ event, details }: { event: MatchEvent; details: boolean }) {
  const team = teamByApiName(event.team);

  return (
    <li className="event-row">
      <time className="event-clock">{formatClock(event.minute, event.second)}</time>
      <span className={`event-icon event-${event.event_type}`}>
        <Icon name={event.event_type} size={16} />
      </span>
      {team ? <TeamCrest team={team} size={22} /> : <span className="crest-placeholder" />}
      <div className="event-text">
        <strong>{EVENT_LABELS[event.event_type]}</strong>
        <span>
          <span className="synthetic-id">{event.player}</span>
          <span className="event-team">{team?.shortName ?? event.team}</span>
        </span>
      </div>
      {details && <EventDetail event={event} />}
    </li>
  );
}

function EventDetail({ event }: { event: MatchEvent }) {
  if (event.event_type === "pass" && typeof event.completed === "boolean") {
    return (
      <span className={event.completed ? "outcome good" : "outcome bad"}>
        {event.completed ? "Completed" : "Incomplete"}
      </span>
    );
  }
  if (event.event_type === "pressure" && typeof event.pressure === "number") {
    const high = event.pressure > HIGH_PRESSURE_THRESHOLD;
    return (
      <span className={high ? "outcome intense" : "outcome neutral"} title="Pressure intensity, 0–1">
        {high ? "High" : "Intensity"} {event.pressure.toFixed(2)}
      </span>
    );
  }
  return null;
}
