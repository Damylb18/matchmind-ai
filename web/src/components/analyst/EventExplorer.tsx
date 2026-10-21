import { useState } from "react";
import { teamByApiName } from "../../data/teams";
import { EVENT_LABELS, formatClock, formatClockSeconds } from "../../lib/format";
import { clockOf, HIGH_PRESSURE_THRESHOLD, type InsightEntry } from "../../lib/matchState";
import type { EventType, MatchEvent } from "../../types/match";
import { EmptyState, Panel } from "../Panel";
import { TeamCrest } from "../TeamCrest";

const ALL = "all";
const ROW_LIMIT = 250;

type Outcome = typeof ALL | "completed" | "incomplete" | "high-pressure";

type EventExplorerProps = {
  events: MatchEvent[];
  insights: InsightEntry[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

/** Fields a full event model would carry that the current feed does not send. */
const EXPECTED_FIELDS: Record<EventType, string[]> = {
  pass: ["x", "y", "receiver"],
  shot: ["x", "y", "outcome"],
  tackle: ["x", "y", "outcome"],
  pressure: ["x", "y"],
};

export function EventExplorer({ events, insights, selectedId, onSelect }: EventExplorerProps) {
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState(ALL);
  const [player, setPlayer] = useState(ALL);
  const [type, setType] = useState<EventType | typeof ALL>(ALL);
  const [outcome, setOutcome] = useState<Outcome>(ALL);
  const [fromMin, setFromMin] = useState("");
  const [toMin, setToMin] = useState("");

  const firstClock = events.length ? clockOf(events[0]!) : 0;
  const lastClock = events.length ? clockOf(events[events.length - 1]!) : 0;
  const minMinute = Math.floor(firstClock / 60);
  const maxMinute = Math.floor(lastClock / 60) + 1;
  const teams = Array.from(new Set(events.map((event) => event.team))).sort();
  const players = Array.from(new Set(events.map((event) => event.player))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );

  const evidenceIndex = new Map<string, InsightEntry[]>();
  for (const insight of insights) {
    for (const id of insight.evidence_event_ids) {
      evidenceIndex.set(id, [...(evidenceIndex.get(id) ?? []), insight]);
    }
  }

  const q = query.trim().toLowerCase();
  // Same semantics as the Custom period: clock boundaries, end excluded (88–89 = 88:00 up to 89:00).
  const from = fromMin === "" ? -Infinity : Number(fromMin) * 60;
  const to = toMin === "" ? Infinity : Number(toMin) * 60;
  const rangeInvalid = fromMin !== "" && toMin !== "" && to <= from;

  const filtered = events
    .filter((event) => team === ALL || event.team === team)
    .filter((event) => player === ALL || event.player === player)
    .filter((event) => type === ALL || event.event_type === type)
    .filter((event) => {
      if (outcome === ALL) return true;
      if (outcome === "high-pressure") return (event.pressure ?? 0) > HIGH_PRESSURE_THRESHOLD && event.event_type === "pressure";
      return event.event_type === "pass" && event.completed === (outcome === "completed");
    })
    .filter((event) => {
      const clock = clockOf(event);
      return clock >= from && clock < to;
    })
    .filter(
      (event) =>
        !q ||
        event.event_id.toLowerCase().includes(q) ||
        event.player.toLowerCase().includes(q) ||
        event.team.toLowerCase().includes(q),
    );

  const rows = filtered.slice(-ROW_LIMIT).reverse();
  const selected = events.find((event) => event.event_id === selectedId);

  const reset = () => {
    setQuery("");
    setTeam(ALL);
    setPlayer(ALL);
    setType(ALL);
    setOutcome(ALL);
    setFromMin("");
    setToMin("");
  };

  return (
    <div className="grid grid-explorer">
      <Panel
        title="Event Explorer"
        provenance="session"
        info="Every event this browser received in the selected period, with the fields exactly as the backend sent them."
        className="explorer-panel"
        actions={
          <button type="button" className="link-button" onClick={reset}>
            Reset filters
          </button>
        }
      >
        <div className="explorer-filters">
          <label className="search-field">
            <span>Search</span>
            <input
              type="search"
              placeholder="Event ID, player ID or team"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label>
            <span>Team</span>
            <select value={team} onChange={(event) => setTeam(event.target.value)}>
              <option value={ALL}>All teams</option>
              {teams.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Player ID</span>
            <select value={player} onChange={(event) => setPlayer(event.target.value)}>
              <option value={ALL}>All players</option>
              {players.map((id) => (
                <option key={id}>{id}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Event</span>
            <select value={type} onChange={(event) => setType(event.target.value as EventType | typeof ALL)}>
              <option value={ALL}>All events</option>
              {(Object.keys(EVENT_LABELS) as EventType[]).map((item) => (
                <option key={item} value={item}>
                  {EVENT_LABELS[item]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Outcome</span>
            <select value={outcome} onChange={(event) => setOutcome(event.target.value as Outcome)}>
              <option value={ALL}>Any</option>
              <option value="completed">Completed passes</option>
              <option value="incomplete">Incomplete passes</option>
              <option value="high-pressure">High pressure (&gt; {HIGH_PRESSURE_THRESHOLD})</option>
            </select>
          </label>
          <fieldset className="minute-range">
            <legend>
              Clock range, min{" "}
              <span className="muted">
                (data {formatClockSeconds(firstClock)}–{formatClockSeconds(lastClock)})
              </span>
            </legend>
            <input
              type="number"
              aria-label="From minute"
              placeholder={String(minMinute)}
              min={minMinute}
              max={maxMinute}
              value={fromMin}
              aria-invalid={rangeInvalid}
              onChange={(event) => setFromMin(event.target.value)}
            />
            <span aria-hidden="true">–</span>
            <input
              type="number"
              aria-label="To minute"
              placeholder={String(maxMinute)}
              min={minMinute}
              max={maxMinute}
              value={toMin}
              aria-invalid={rangeInvalid}
              onChange={(event) => setToMin(event.target.value)}
            />
          </fieldset>
        </div>

        <p className="explorer-count">
          {filtered.length.toLocaleString()} matching events
          {filtered.length > ROW_LIMIT && ` · showing latest ${ROW_LIMIT}`}
        </p>

        {rows.length === 0 ? (
          <EmptyState>{events.length === 0 ? "No events in this period yet." : "No events match these filters."}</EmptyState>
        ) : (
          <div className="table-scroll explorer-scroll">
            <table className="data-table explorer-table">
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Team</th>
                  <th scope="col">Player ID</th>
                  <th scope="col">Event</th>
                  <th scope="col">Pass outcome</th>
                  <th scope="col">Pressure</th>
                  <th scope="col">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((event) => {
                  const teamInfo = teamByApiName(event.team);
                  const refs = evidenceIndex.get(event.event_id);
                  return (
                    <tr
                      key={event.event_id}
                      className={event.event_id === selectedId ? "selected" : undefined}
                      onClick={() => onSelect(event.event_id === selectedId ? null : event.event_id)}
                    >
                      <th scope="row">
                        <button
                          type="button"
                          className="row-button"
                          aria-pressed={event.event_id === selectedId}
                          onClick={(click) => {
                            click.stopPropagation();
                            onSelect(event.event_id === selectedId ? null : event.event_id);
                          }}
                        >
                          {formatClock(event.minute, event.second)}
                        </button>
                      </th>
                      <td>
                        <span className="table-team">
                          {teamInfo && <TeamCrest team={teamInfo} size={14} />}
                          {teamInfo?.code ?? event.team}
                        </span>
                      </td>
                      <td className="synthetic-id">{event.player}</td>
                      <td>{EVENT_LABELS[event.event_type]}</td>
                      <td>
                        {event.event_type === "pass" && typeof event.completed === "boolean" ? (
                          <span className={event.completed ? "outcome good" : "outcome bad"}>
                            {event.completed ? "Completed" : "Incomplete"}
                          </span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>{typeof event.pressure === "number" ? event.pressure.toFixed(2) : <span className="muted">—</span>}</td>
                      <td>{refs ? (
                          <span className="evidence-flag">
                            {refs.length} insight{refs.length === 1 ? "" : "s"}
                          </span>
                        ) : (
                          ""
                        )}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <EventDetails event={selected} insights={selected ? evidenceIndex.get(selected.event_id) ?? [] : []} />
    </div>
  );
}

function EventDetails({ event, insights }: { event: MatchEvent | undefined; insights: InsightEntry[] }) {
  if (!event) {
    return (
      <Panel title="Event Details" className="details-panel">
        <EmptyState>Select an event to see the fields the backend sent for it.</EmptyState>
      </Panel>
    );
  }

  const missing = EXPECTED_FIELDS[event.event_type].filter((field) => !(field in event));

  return (
    <Panel title="Event Details" provenance="session" className="details-panel">
      <dl className="raw-fields">
        {Object.entries(event).map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{String(value)}</dd>
          </div>
        ))}
      </dl>

      {missing.length > 0 && (
        <p className="details-missing">
          Not in feed: {missing.map((field) => <code key={field}>{field}</code>)}
        </p>
      )}

      <div className="details-evidence">
        <h3>Insight evidence</h3>
        {insights.length === 0 ? (
          <p className="muted">Not referenced by any backend insight in this session.</p>
        ) : (
          <ul>
            {insights.map((insight) => (
              <li key={insight.key}>
                <strong>{insight.headline}</strong>
                <span className="muted">
                  {insight.id} · {formatClockSeconds(insight.clock)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
