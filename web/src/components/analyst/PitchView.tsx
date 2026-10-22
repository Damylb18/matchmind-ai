import { useState } from "react";
import { AWAY, HOME, teamByApiName } from "../../data/teams";
import { seededRandom } from "../../lib/analysis";
import { EVENT_LABELS, formatClock } from "../../lib/format";
import type { EventType, MatchEvent } from "../../types/match";
import { Icon } from "../icons/Icon";
import { InfoTip, Panel } from "../Panel";
import { Pitch, PITCH_LENGTH, PITCH_WIDTH } from "../pitch/Pitch";

type Marker = {
  id: string;
  x: number;
  y: number;
  team: string;
  type: EventType;
  player: string;
  clock: string;
  completed?: boolean;
  simulated: boolean;
};

type TypeFilter = EventType | "all";

const TYPES: EventType[] = ["pass", "shot", "tackle", "pressure"];

const FILTER_LABELS: Record<TypeFilter, string> = {
  all: "All events",
  pass: "Passes",
  shot: "Shots",
  tackle: "Tackles",
  pressure: "Pressure",
};

// viewBox of the horizontal pitch: "-4 -2.5 113 73"
const toLeft = (x: number) => ((x + 4) / 113) * 100;
const toTop = (y: number) => ((y + 2.5) / 73) * 100;

const hasLocation = (event: MatchEvent) => typeof event.x === "number" && typeof event.y === "number";

/** Fixed, seeded demo markers. Never derived from or mixed with live data. */
function simulatedMarkers(): Marker[] {
  const random = seededRandom(20260521);
  return Array.from({ length: 140 }, (_, index) => {
    const home = random() < 0.5;
    const type = TYPES[Math.min(3, Math.floor(random() ** 1.6 * 4))]!;
    const depth = random() * 0.85 + 0.08;
    return {
      id: `sim-${index}`,
      x: (home ? depth : 1 - depth) * PITCH_LENGTH,
      y: (0.06 + random() * 0.88) * PITCH_WIDTH,
      team: home ? HOME.apiName : AWAY.apiName,
      type,
      player: "Simulated",
      clock: "—",
      completed: type === "pass" ? random() > 0.2 : undefined,
      simulated: true,
    };
  });
}

const SIMULATED_MARKERS = simulatedMarkers();

export function PitchView({ events }: { events: MatchEvent[] }) {
  const [filter, setFilter] = useState<TypeFilter>("all");
  const [simulated, setSimulated] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const counts: Record<TypeFilter, number> = { all: events.length, pass: 0, shot: 0, tackle: 0, pressure: 0 };
  for (const event of events) counts[event.event_type]++;

  const live: Marker[] = events.filter(hasLocation).map((event) => ({
    id: event.event_id,
    x: (event.x! / 100) * PITCH_LENGTH,
    y: (event.y! / 100) * PITCH_WIDTH,
    team: event.team,
    type: event.event_type,
    player: event.player,
    clock: formatClock(event.minute, event.second),
    completed: event.completed,
    simulated: false,
  }));

  const source = simulated ? SIMULATED_MARKERS : live;
  const markers = source.filter((marker) => filter === "all" || marker.type === filter);
  const hovered = markers.find((marker) => marker.id === hoverId);
  const selected = source.find((marker) => marker.id === selectedId);
  const unavailable = !simulated && live.length === 0;

  return (
    <Panel
      title="Pitch View"
      provenance={simulated ? "illustrative" : "session"}
      info="Plots live events using the coordinates supplied by the backend (0–100). If an event has no coordinates, it is omitted from the live pitch. Simulated preview is illustrative only."
      className="pitch-panel"
      actions={
        <button
          type="button"
          className={simulated ? "toggle on" : "toggle"}
          aria-pressed={simulated}
          onClick={() => {
            setSimulated(!simulated);
            setSelectedId(null);
          }}
        >
          <span className="toggle-track" aria-hidden="true" />
          Simulated preview
        </button>
      }
    >
      <div className="pitch-view">
        <div className={simulated ? "pitch-frame is-simulated" : "pitch-frame"}>
          <Pitch label={simulated ? "Pitch with simulated event markers" : "Pitch event map"}>
            {markers.map((marker) => (
              <circle
                key={marker.id}
                cx={marker.x}
                cy={marker.y}
                r={marker.id === selectedId ? 1.7 : 1.2}
                className={`event-marker ${marker.team === HOME.apiName ? "home" : "away"} ${
                  marker.simulated ? "simulated" : ""
                } ${marker.id === selectedId ? "selected" : ""}`}
                tabIndex={0}
                role="button"
                aria-label={`${EVENT_LABELS[marker.type]}, ${marker.team}${marker.simulated ? ", simulated" : ""}`}
                onPointerEnter={() => setHoverId(marker.id)}
                onPointerLeave={() => setHoverId(null)}
                onFocus={() => setHoverId(marker.id)}
                onBlur={() => setHoverId(null)}
                onClick={() => setSelectedId(marker.id === selectedId ? null : marker.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedId(marker.id === selectedId ? null : marker.id);
                  }
                }}
              />
            ))}
          </Pitch>

          {simulated && <span className="simulated-watermark">Simulated — not match data</span>}

          {unavailable && (
            <div className="pitch-unavailable">
              <Icon name="database" size={20} />
              <strong>Event locations unavailable</strong>
              <p>
                The feed sent {counts[filter].toLocaleString()} {filter === "all" ? "" : EVENT_LABELS[filter].toLowerCase() + " "}
                events for this period, but none include pitch coordinates.
              </p>
              <p className="muted">Needs <code>x</code> and <code>y</code> (0–100) on each event.</p>
            </div>
          )}

          {hovered && (
            <div className="chart-tooltip" style={{ left: `${toLeft(hovered.x)}%`, top: `${toTop(hovered.y)}%` }}>
              <strong>
                {EVENT_LABELS[hovered.type]}
                {hovered.simulated ? " · simulated" : ` · ${hovered.clock}`}
              </strong>
              <span>
                {teamByApiName(hovered.team)?.shortName ?? hovered.team}
                {hovered.simulated ? "" : ` · ${hovered.player}`}
              </span>
            </div>
          )}
        </div>

        <div className="pitch-filters">
          <div role="group" aria-label="Event type" className="pitch-filter-list">
            {(["all", ...TYPES] as TypeFilter[]).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={filter === item}
                onClick={() => {
                  setFilter(item);
                  setSelectedId(null);
                }}
              >
                <Icon name={item === "all" ? "analyst" : item} size={14} />
                <span>{FILTER_LABELS[item]}</span>
                {!simulated && <span className="count">{counts[item]}</span>}
              </button>
            ))}
          </div>
          <div className="pitch-legend">
            <span>
              <i className="swatch home" /> {HOME.shortName}
            </span>
            <span>
              <i className="swatch away" /> {AWAY.shortName}
            </span>
          </div>
        </div>
      </div>

      {selected ? (
        <p className="pitch-selection">
          <strong>{EVENT_LABELS[selected.type]}</strong> · {teamByApiName(selected.team)?.shortName ?? selected.team}
          {selected.simulated
            ? " · simulated marker, not a match event"
            : ` · ${selected.player} · ${selected.clock} · x ${((selected.x / PITCH_LENGTH) * 100).toFixed(0)}, y ${((selected.y / PITCH_WIDTH) * 100).toFixed(0)}`}
          {selected.completed !== undefined && ` · ${selected.completed ? "completed" : "incomplete"}`}
        </p>
      ) : (
        <p className="panel-footnote">
          {simulated ? (
            <>
              Simulated preview shows layout only. <InfoTip text="140 fixed, seeded markers. They do not come from the feed and do not change with filters other than event type." />
            </>
          ) : (
            "Select a marker to inspect it."
          )}
        </p>
      )}
    </Panel>
  );
}
