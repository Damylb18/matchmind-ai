import { AWAY, HOME } from "../data/teams";
import { formatClock } from "../lib/format";
import type { MatchState } from "../lib/matchState";
import { AIInsights } from "./fan/AIInsights";
import { Panel } from "./Panel";
import { TeamCrest } from "./TeamCrest";

export function BroadcastView({ state }: { state: MatchState }) {
  const clock = state.minute !== null && state.second !== null ? formatClock(state.minute, state.second) : "00:00";
  const cue = state.insights[0];

  return (
    <div className="broadcast-view">
      <Panel title="Broadcast Graphic Preview" className="broadcast-panel">
        <div className="broadcast-stage">
          <div className="scorebug">
            <span className="scorebug-brand">MatchMind</span>
            <span className="scorebug-team">
              <TeamCrest team={HOME} size={18} /> {HOME.code}
            </span>
            <span className="scorebug-vs">v</span>
            <span className="scorebug-team">
              {AWAY.code} <TeamCrest team={AWAY} size={18} />
            </span>
            <span className="scorebug-clock">{clock}</span>
          </div>
          {cue && (
            <div className="lower-third">
              <span>MatchMind Insight</span>
              <strong>{cue.headline}</strong>
            </div>
          )}
        </div>
        <p className="panel-footnote">
          The graphic uses the live event clock. Score overlays can be added once the backend provides goal and
          score data.
        </p>
      </Panel>
      <AIInsights insights={state.insights} clock={state.clock} limit={10} title="Commentary Cues" />
    </div>
  );
}
