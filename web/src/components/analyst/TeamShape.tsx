import { useState } from "react";
import { FORMATION_NAMES, FORMATIONS, type FormationSlot } from "../../data/formations";
import { AWAY, HOME, type TeamInfo } from "../../data/teams";
import { Panel } from "../Panel";
import { Pitch } from "../pitch/Pitch";
import { TeamCrest } from "../TeamCrest";

export function TeamShape() {
  const [homeShape, setHomeShape] = useState("4-2-3-1");
  const [awayShape, setAwayShape] = useState("4-3-3");

  return (
    <Panel
      title="Team Shape"
      provenance="illustrative"
      info="Generic formation templates for layout and discussion. The feed has no line-ups, formations or player positions, so these are not observed team shapes."
      className="shape-panel"
    >
      <div className="shape-grid">
        <ShapeDiagram team={HOME} shape={homeShape} onShapeChange={setHomeShape} />
        <ShapeDiagram team={AWAY} shape={awayShape} onShapeChange={setAwayShape} />
      </div>
      <p className="panel-footnote">Template only · not an observed formation</p>
    </Panel>
  );
}

type ShapeDiagramProps = { team: TeamInfo; shape: string; onShapeChange: (shape: string) => void };

function ShapeDiagram({ team, shape, onShapeChange }: ShapeDiagramProps) {
  const [hover, setHover] = useState<FormationSlot | null>(null);
  const slots = FORMATIONS[shape] ?? [];
  const side = team.id === HOME.id ? "home" : "away";

  return (
    <figure className="shape-diagram">
      <figcaption>
        <TeamCrest team={team} size={16} />
        <span>{team.shortName}</span>
        <select
          className="compact-select"
          aria-label={`${team.name} formation template`}
          value={shape}
          onChange={(event) => onShapeChange(event.target.value)}
        >
          {FORMATION_NAMES.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </figcaption>
      <div className="shape-pitch">
        <Pitch orientation="vertical" label={`${team.name} ${shape} template`} stripes={false}>
          {slots.map((slot) => (
            <g
              key={slot.role}
              className={`shape-slot ${side}`}
              onPointerEnter={() => setHover(slot)}
              onPointerLeave={() => setHover(null)}
            >
              <circle cx={slot.x} cy={slot.y} r={2.9} />
              <text x={slot.x} y={slot.y + 6.6} textAnchor="middle">
                {slot.role}
              </text>
            </g>
          ))}
        </Pitch>
        {hover && (
          <div
            className="chart-tooltip"
            style={{ left: `${((hover.x + 2.5) / 73) * 100}%`, top: `${((hover.y + 4) / 113) * 100}%` }}
          >
            <strong>{hover.role}</strong>
            <span>{hover.label}</span>
          </div>
        )}
      </div>
      <span className={`shape-badge ${side}`}>{shape}</span>
    </figure>
  );
}
