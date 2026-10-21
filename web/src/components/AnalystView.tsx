import type { MatchState } from "../lib/matchState";
import { AIInsights } from "./fan/AIInsights";
import { AuthoritativeTotals } from "./fan/KeyStats";
import { LiveEvents } from "./fan/LiveEvents";
import { PlayerTable } from "./fan/PlayerTable";
import { PressureChart } from "./fan/PressureChart";
import { Panel } from "./Panel";

export function AnalystView({ state }: { state: MatchState }) {
  return (
    <div className="analyst-view">
      <Panel title="Match Totals" className="totals-panel">
        <AuthoritativeTotals metrics={state.metrics} />
        <p className="panel-footnote">
          {state.events.length} events in view · {state.received.toLocaleString()} received this session
        </p>
      </Panel>
      <div className="grid grid-analyst">
        <LiveEvents events={state.events} limit={25} filters title="Event Breakdown" />
        <div className="stack">
          <AIInsights insights={state.insights} clock={state.clock} limit={10} title="Tactical Insights" />
          <PressureChart points={state.pressure} />
        </div>
      </div>
      <PlayerTable players={state.players} />
    </div>
  );
}
