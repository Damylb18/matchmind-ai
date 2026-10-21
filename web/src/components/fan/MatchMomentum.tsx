import { useState, type PointerEvent } from "react";
import { AWAY, HOME } from "../../data/teams";
import { formatClockSeconds } from "../../lib/format";
import {
  MOMENTUM_BIN_SECONDS,
  MOMENTUM_WEIGHTS,
  momentumSeries,
  type MomentumBins,
  type MomentumPoint,
} from "../../lib/momentum";
import { EmptyState, Panel } from "../Panel";
import { TeamCrest } from "../TeamCrest";

const W = 600;
const H = 120;
const MID = H / 2;
const AMP = MID - 6;

type Range = "session" | "match";

type MatchMomentumProps = {
  momentum: MomentumBins;
  sessionStart: number | null;
  clock: number | null;
};

const INFO =
  "Illustrative event-based estimate — not possession, xG or tracking data. " +
  `Each event credits its team: completed pass ${MOMENTUM_WEIGHTS.completedPass}, ` +
  `incomplete pass ${MOMENTUM_WEIGHTS.incompletePass}, shot ${MOMENTUM_WEIGHTS.shot}, ` +
  `tackle ${MOMENTUM_WEIGHTS.tackle}, pressure ${MOMENTUM_WEIGHTS.pressurePerUnit} × intensity. ` +
  `Per ${MOMENTUM_BIN_SECONDS}-second bin: (home − away) ÷ (home + away), smoothed over 3 bins. ` +
  "Only events received since this browser connected are included.";

export function MatchMomentum({ momentum, sessionStart, clock }: MatchMomentumProps) {
  const [range, setRange] = useState<Range>("session");
  const [hoverBin, setHoverBin] = useState<number | null>(null);

  const rangeToggle = (
    <div className="segmented" role="group" aria-label="Momentum time range">
      {(["session", "match"] as Range[]).map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={range === item}
          onClick={() => setRange(item)}
        >
          {item === "session" ? "Session" : "90 min"}
        </button>
      ))}
    </div>
  );

  if (clock === null || sessionStart === null) {
    return (
      <Panel title="Match Momentum" info={INFO} provenance="illustrative" className="momentum-panel">
        <EmptyState>Waiting for match events…</EmptyState>
      </Panel>
    );
  }

  const fromSec = range === "match" ? 0 : Math.floor(sessionStart / 60) * 60;
  const toSec =
    range === "match"
      ? Math.max(90 * 60, Math.ceil((clock + 1) / 60) * 60)
      : Math.max(fromSec + 5 * 60, Math.ceil((clock + 1) / 60) * 60);
  const span = toSec - fromSec;
  const x = (sec: number) => ((sec - fromSec) / span) * W;

  const series = momentumSeries(
    momentum,
    HOME.apiName,
    AWAY.apiName,
    Math.floor(sessionStart / MOMENTUM_BIN_SECONDS),
    Math.floor(clock / MOMENTUM_BIN_SECONDS),
  );
  const binX = (bin: number) =>
    x(Math.min(clock, bin * MOMENTUM_BIN_SECONDS + MOMENTUM_BIN_SECONDS / 2));

  const ticks = tickMarks(fromSec, toSec, range);
  const latest = [...series].reverse().find((point) => point.value !== null);
  const hovered = series.find((point) => point.bin === hoverBin && point.value !== null);

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const sec = fromSec + ((event.clientX - rect.left) / rect.width) * span;
    setHoverBin(Math.floor(sec / MOMENTUM_BIN_SECONDS));
  };

  return (
    <Panel
      title="Match Momentum"
      info={INFO}
      provenance="illustrative"
      actions={rangeToggle}
      className="momentum-panel"
    >
      <div className="momentum">
        <div className="momentum-axis-teams" aria-hidden="true">
          <TeamCrest team={HOME} size={22} />
          <TeamCrest team={AWAY} size={22} />
        </div>

        <div className="momentum-plot">
          <span className="momentum-label top">↑ {HOME.shortName} on top</span>
          <span className="momentum-label bottom">↓ {AWAY.shortName} on top</span>

          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={`Momentum estimate. Latest value ${describe(latest)}.`}
            onPointerMove={onPointerMove}
            onPointerLeave={() => setHoverBin(null)}
          >
            <defs>
              <pattern id="no-data" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" className="hatch" />
              </pattern>
            </defs>

            {sessionStart > fromSec && (
              <rect x={0} y={0} width={x(sessionStart)} height={H} fill="url(#no-data)" />
            )}

            {ticks.map((tick) => (
              <line key={tick} x1={x(tick)} x2={x(tick)} y1={0} y2={H} className="grid" />
            ))}
            <line x1={0} x2={W} y1={MID} y2={MID} className="baseline" />

            <path d={areaPath(series, binX, 1)} className="area home" />
            <path d={areaPath(series, binX, -1)} className="area away" />

            <line x1={x(clock)} x2={x(clock)} y1={0} y2={H} className="now-line" />
            {hovered && (
              <line x1={binX(hovered.bin)} x2={binX(hovered.bin)} y1={0} y2={H} className="crosshair" />
            )}
          </svg>

          {latest?.value != null && (
            <span
              className="momentum-dot"
              style={{
                left: `${(x(clock) / W) * 100}%`,
                top: `${((MID - latest.value * AMP) / H) * 100}%`,
              }}
              aria-hidden="true"
            />
          )}

          {hovered?.value != null && (
            <div
              className="chart-tooltip"
              style={{ left: `${(binX(hovered.bin) / W) * 100}%` }}
              role="status"
            >
              <strong>{formatClockSeconds(hovered.bin * MOMENTUM_BIN_SECONDS)}</strong>
              <span>{describe(hovered)}</span>
            </div>
          )}

          <div className="momentum-ticks" aria-hidden="true">
            {ticks.map((tick) => (
              <span key={tick} style={{ left: `${(x(tick) / W) * 100}%` }}>
                {Math.round(tick / 60)}'
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="panel-footnote">
        {sessionStart > fromSec ? "Hatched: before this session connected. " : ""}
        Event-weighted estimate, not an official metric.
      </p>
    </Panel>
  );
}

function describe(point: MomentumPoint | undefined) {
  if (!point || point.value === null) return "no data";
  const strength = Math.abs(point.value);
  if (strength < 0.1) return "Evenly balanced";
  const team = point.value > 0 ? HOME.shortName : AWAY.shortName;
  return `${team} ${strength > 0.5 ? "strongly " : ""}on top (${Math.round(strength * 100)}%)`;
}

function areaPath(series: MomentumPoint[], binX: (bin: number) => number, sign: 1 | -1) {
  let d = "";
  let run: string[] = [];
  const flush = (lastX: number) => {
    if (run.length) d += `${run.join(" ")} L${lastX.toFixed(1)},${MID} Z `;
    run = [];
  };
  let lastX = 0;
  for (const point of series) {
    if (point.value === null) {
      flush(lastX);
      continue;
    }
    const px = binX(point.bin);
    const value = sign === 1 ? Math.max(point.value, 0) : Math.min(point.value, 0);
    const py = MID - value * AMP;
    if (!run.length) run.push(`M${px.toFixed(1)},${MID}`);
    run.push(`L${px.toFixed(1)},${py.toFixed(1)}`);
    lastX = px;
  }
  flush(lastX);
  return d;
}

function tickMarks(fromSec: number, toSec: number, range: Range) {
  const spanMin = (toSec - fromSec) / 60;
  const step = range === "match" ? 15 : spanMin <= 10 ? 1 : spanMin <= 30 ? 5 : 15;
  const ticks: number[] = [];
  for (let min = Math.ceil(fromSec / 60 / step) * step; min * 60 <= toSec; min += step) {
    ticks.push(min * 60);
  }
  return ticks;
}
