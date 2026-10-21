import { useMemo, useState } from "react";
import { FORMATIONS } from "../../data/formations";
import { AWAY, HOME, teamByApiName, type TeamInfo } from "../../data/teams";
import { seededRandom } from "../../lib/analysis";
import { formatClock, percent } from "../../lib/format";
import type { MatchEvent } from "../../types/match";
import { Icon } from "../icons/Icon";
import { EmptyState, Panel } from "../Panel";
import { Pitch, PITCH_LENGTH, PITCH_WIDTH } from "../pitch/Pitch";
import { TeamCrest } from "../TeamCrest";

export type PassOutcome = "all" | "completed" | "incomplete";

const OUTCOMES: { id: PassOutcome; label: string }[] = [
  { id: "all", label: "All passes" },
  { id: "completed", label: "Completed" },
  { id: "incomplete", label: "Incomplete" },
];

const matchesOutcome = (event: MatchEvent, outcome: PassOutcome) =>
  outcome === "all" || (outcome === "completed" ? event.completed === true : event.completed === false);

// Horizontal pitch viewBox "-4 -2.5 113 73"
const toLeft = (x: number) => ((x + 4) / 113) * 100;
const toTop = (y: number) => ((y + 2.5) / 73) * 100;

/* ───────────── Tab ───────────── */

export function PassingNetworkTab({ events }: { events: MatchEvent[] }) {
  const [team, setTeam] = useState<TeamInfo>(HOME);
  const [outcome, setOutcome] = useState<PassOutcome>("all");
  const passes = events.filter((event) => event.event_type === "pass");

  return (
    <div className="analyst-stack">
      <div className="toolbar" role="group" aria-label="Passing filters">
        <div className="segmented" role="group" aria-label="Team">
          {[HOME, AWAY].map((item) => (
            <button key={item.id} type="button" aria-pressed={team.id === item.id} onClick={() => setTeam(item)}>
              {item.shortName}
            </button>
          ))}
        </div>
        <div className="segmented" role="group" aria-label="Pass outcome">
          {OUTCOMES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={outcome === item.id}
              onClick={() => setOutcome(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className="toolbar-note">Filters apply to every panel on this tab.</span>
      </div>

      <div className="grid grid-passing">
        <LiveNetwork passes={passes} team={team} outcome={outcome} />
        <PassVolume events={events} teams={[team]} outcome={outcome} />
      </div>

      <IllustrativeNetworks outcome={outcome} />
    </div>
  );
}

/* ───────────── Live network (requires receiver + coordinates) ───────────── */

function buildNetwork(usable: MatchEvent[]) {
  if (!usable.length) return null;
  const sums = new Map<string, { x: number; y: number; n: number }>();
  const edges = new Map<string, number>();
  for (const event of usable) {
    const sum = sums.get(event.player) ?? { x: 0, y: 0, n: 0 };
    sums.set(event.player, { x: sum.x + event.x!, y: sum.y + event.y!, n: sum.n + 1 });
    const pair = [event.player, event.receiver!].sort().join("|");
    edges.set(pair, (edges.get(pair) ?? 0) + 1);
  }
  const nodes = new Map(
    [...sums].map(([id, sum]) => [
      id,
      { x: (sum.x / sum.n / 100) * PITCH_LENGTH, y: (sum.y / sum.n / 100) * PITCH_WIDTH },
    ]),
  );
  return { nodes, edges: [...edges].map(([pair, count]) => ({ ids: pair.split("|"), count })) };
}

function LiveNetwork({ passes, team, outcome }: { passes: MatchEvent[]; team: TeamInfo; outcome: PassOutcome }) {
  const own = passes.filter((event) => event.team === team.apiName && matchesOutcome(event, outcome));
  const usable = own.filter(
    (event) => typeof event.receiver === "string" && typeof event.x === "number" && typeof event.y === "number",
  );

  const network = buildNetwork(usable);
  const maxCount = Math.max(1, ...(network?.edges.map((edge) => edge.count) ?? [1]));



  return (
    <Panel
      title={`Passing Network — ${team.name}`}
      provenance="session"
      info="A live network needs who received each pass and where passes happened. It is built automatically from the feed once those fields exist."
      className="network-panel"
    >
      <div className="network-frame">
        <Pitch label={`${team.name} live passing network`}>
          {network?.edges.map(({ ids, count }) => {
            const a = network.nodes.get(ids[0]!);
            const b = network.nodes.get(ids[1]!);
            if (!a || !b) return null;
            return (
              <line
                key={ids.join("-")}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={`network-edge ${team.id === HOME.id ? "home" : "away"}`}
                strokeWidth={0.3 + (count / maxCount) * 1.6}
              />
            );
          })}
          {network &&
            [...network.nodes].map(([id, node]) => (
              <circle key={id} cx={node.x} cy={node.y} r={2.4} className={`network-node ${team.id === HOME.id ? "home" : "away"}`}>
                <title>{id}</title>
              </circle>
            ))}
        </Pitch>

        {!network && (
          <div className="pitch-unavailable">
            <Icon name="pass" size={20} />
            <strong>Passing network unavailable</strong>
            <p>
              {own.length.toLocaleString()} {team.shortName} passes in this period, but the feed does not say who
              received them or where they were played.
            </p>
            <ul className="field-list">
              <li>
                <code>receiver</code> — player ID of the pass recipient
              </li>
              <li>
                <code>x</code>, <code>y</code> — pass origin, 0–100
              </li>
            </ul>
          </div>
        )}
      </div>
    </Panel>
  );
}

/* ───────────── Pass volume (real feed data) ───────────── */

const attempts = (row: { completed: number; incomplete: number; unknown: number }) =>
  row.completed + row.incomplete + row.unknown;

type PassVolumeProps = { events: MatchEvent[]; teams: TeamInfo[]; outcome?: PassOutcome; compact?: boolean };

export function PassVolume({ events, teams, outcome = "all", compact = false }: PassVolumeProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const passes = events.filter(
    (event) => event.event_type === "pass" && teams.some((team) => team.apiName === event.team),
  );

  const rows = (() => {
    type Row = { key: string; team: string; player: string; completed: number; incomplete: number; unknown: number };
    const map = new Map<string, Row>();
    for (const event of passes) {
      const key = `${event.team}::${event.player}`;
      const row = map.get(key) ?? { key, team: event.team, player: event.player, completed: 0, incomplete: 0, unknown: 0 };
      if (event.completed === true) row.completed++;
      else if (event.completed === false) row.incomplete++;
      else row.unknown++;
      map.set(key, row);
    }
    const homeFirst = (team: string) => (team === HOME.apiName ? 0 : 1);
    return [...map.values()].sort(
      (a, b) =>
        homeFirst(a.team) - homeFirst(b.team) || attempts(b) - attempts(a),
    );
  })();

  const shown = (row: (typeof rows)[number]) =>
    outcome === "all" ? attempts(row) : outcome === "completed" ? row.completed : row.incomplete;
  const max = Math.max(1, ...rows.map(attempts));
  // A selection made under another team filter no longer applies.
  const active = rows.find((row) => row.key === selected);
  const log = active
    ? passes
        .filter((event) => `${event.team}::${event.player}` === active.key && matchesOutcome(event, outcome))
        .slice(-12)
        .reverse()
    : [];

  return (
    <Panel
      title="Pass Volume by Player"
      provenance="session"
      info="Passes attempted per synthetic feed ID in the selected period, split into completed (solid) and incomplete (faded). This uses only the passer and outcome fields the feed actually sends."
      className="volume-panel"
    >
      {rows.length === 0 ? (
        <EmptyState>No passes in this period yet.</EmptyState>
      ) : (
        <ol className="volume-list">
          {rows.map((row) => {
            const team = teamByApiName(row.team);
            // Accuracy uses passes with a known outcome only.
            const accuracy = percent(row.completed, row.completed + row.incomplete);
            return (
              <li key={row.key}>
                <button
                  type="button"
                  className="volume-row"
                  aria-pressed={selected === row.key}
                  onClick={() => setSelected(selected === row.key ? null : row.key)}
                  disabled={compact}
                >
                  <span className="volume-label">
                    {team && <TeamCrest team={team} size={16} />}
                    <span className="synthetic-id">{row.player}</span>
                  </span>
                  <span className="volume-bar" aria-hidden="true">
                    {outcome !== "incomplete" && (
                      <span
                        className="done"
                        style={{ width: `${(row.completed / max) * 100}%`, background: team?.colors.data }}
                      />
                    )}
                    {outcome !== "completed" && (
                      <span
                        className="missed"
                        style={{ width: `${(row.incomplete / max) * 100}%`, background: team?.colors.data }}
                      />
                    )}
                  </span>
                  <span className="volume-value">
                    {shown(row)}
                    <span className="muted"> · {accuracy === null ? "–" : `${accuracy}%`}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {!compact &&
        (active ? (
          <div className="pass-log">
            <h3>
              Latest {outcome === "all" ? "" : `${outcome} `}passes ·{" "}
              <span className="synthetic-id">{active.player}</span>
            </h3>
            {log.length === 0 && <p className="muted">No {outcome} passes for this player in the period.</p>}
            <ol>
              {log.map((event) => (
                <li key={event.event_id}>
                  <time>{formatClock(event.minute, event.second)}</time>
                  <span className={event.completed ? "outcome good" : "outcome bad"}>
                    {event.completed ? "Completed" : "Incomplete"}
                  </span>
                  <span className="muted">Receiver not in feed</span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="panel-footnote">Select a player to see their pass log.</p>
        ))}
    </Panel>
  );
}

/* ───────────── Illustrative networks (synthetic, clearly separated) ───────────── */

type DemoNode = { role: string; label: string; x: number; y: number };
type DemoEdge = { a: string; b: string; completed: number; incomplete: number };

function demoNetwork(team: TeamInfo, formation: string): { nodes: DemoNode[]; edges: DemoEdge[] } {
  const random = seededRandom(team.id === HOME.id ? 7 : 11);
  const nodes = (FORMATIONS[formation] ?? []).map((slot) => ({
    role: slot.role,
    label: slot.label,
    x: PITCH_LENGTH - slot.y,
    y: slot.x,
  }));
  const edges: DemoEdge[] = [];
  nodes.forEach((a, i) =>
    nodes.slice(i + 1).forEach((b) => {
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance > 36) return;
      const total = Math.round(3 + random() * 24 * (1 - distance / 40));
      const completed = Math.round(total * (0.72 + random() * 0.22));
      edges.push({ a: a.role, b: b.role, completed, incomplete: total - completed });
    }),
  );
  return { nodes, edges };
}

function IllustrativeNetworks({ outcome }: { outcome: PassOutcome }) {
  return (
    <section className="panel illustrative-panel" aria-label="Illustrative passing networks">
      <header className="panel-head">
        <h2>Illustrative network — not derived from live feed</h2>
        <span className="provenance provenance-illustrative">Illustrative</span>
      </header>
      <p className="panel-footnote illustrative-note">
        Synthetic, seeded data laid out on generic formation templates to show how the live network will look.
        Node labels are template roles, not players.
      </p>
      <div className="illustrative-grid">
        <DemoNetwork team={HOME} formation="4-2-3-1" outcome={outcome} />
        <DemoNetwork team={AWAY} formation="4-3-3" outcome={outcome} />
      </div>
    </section>
  );
}

function DemoNetwork({ team, formation, outcome }: { team: TeamInfo; formation: string; outcome: PassOutcome }) {
  const { nodes, edges } = useMemo(() => demoNetwork(team, formation), [team, formation]);
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const focus = hover ?? pinned;
  const side = team.id === HOME.id ? "home" : "away";

  const value = (edge: DemoEdge) =>
    outcome === "all" ? edge.completed + edge.incomplete : outcome === "completed" ? edge.completed : edge.incomplete;
  const max = Math.max(1, ...edges.map(value));
  const byRole = new Map(nodes.map((node) => [node.role, node]));
  const focusNode = focus ? byRole.get(focus) : undefined;
  const focusTotal = focus
    ? edges.filter((edge) => edge.a === focus || edge.b === focus).reduce((sum, edge) => sum + value(edge), 0)
    : 0;

  return (
    <figure className="demo-network">
      <figcaption>
        <TeamCrest team={team} size={16} /> {team.name} <span className="muted">· {formation} template</span>
      </figcaption>
      <div className="network-frame is-simulated">
        <Pitch label={`Illustrative ${team.name} passing network`}>
          {edges.map((edge) => {
            const a = byRole.get(edge.a)!;
            const b = byRole.get(edge.b)!;
            const linked = !focus || edge.a === focus || edge.b === focus;
            return (
              <line
                key={`${edge.a}-${edge.b}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={`network-edge ${side} ${linked ? "" : "dimmed"}`}
                strokeWidth={0.25 + (value(edge) / max) * 1.6}
              />
            );
          })}
          {nodes.map((node) => (
            <g
              key={node.role}
              className={`network-node-group ${side} ${focus && focus !== node.role ? "dimmed" : ""}`}
              tabIndex={0}
              role="button"
              aria-pressed={pinned === node.role}
              aria-label={`${node.label}, illustrative node`}
              onPointerEnter={() => setHover(node.role)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(node.role)}
              onBlur={() => setHover(null)}
              onClick={() => setPinned(pinned === node.role ? null : node.role)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setPinned(pinned === node.role ? null : node.role);
                }
              }}
            >
              <circle cx={node.x} cy={node.y} r={3.1} className={`network-node ${side}`} />
              <text x={node.x} y={node.y + 0.9} textAnchor="middle">
                {node.role}
              </text>
            </g>
          ))}
        </Pitch>
        <span className="simulated-watermark">Illustrative</span>
        {focusNode && (
          <div className="chart-tooltip" style={{ left: `${toLeft(focusNode.x)}%`, top: `${toTop(focusNode.y)}%` }}>
            <strong>{focusNode.label}</strong>
            <span>
              {focusTotal} synthetic {outcome === "all" ? "" : outcome + " "}passes
            </span>
          </div>
        )}
      </div>
      <div className="key-legend">
        <span>
          <i className="swatch line" /> Thicker = more passes (synthetic)
        </span>
        <span className="muted">Hover or select a node to isolate its links</span>
      </div>
    </figure>
  );
}
