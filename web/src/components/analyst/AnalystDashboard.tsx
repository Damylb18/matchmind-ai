import { useState } from "react";
import "./analyst.css";
import { HOME, AWAY } from "../../data/teams";
import {
  coverage,
  filterByRange,
  filterInsights,
  periodRange,
  summarise,
  type Period,
} from "../../lib/analysis";
import type { MatchState } from "../../lib/matchState";
import type { ConnectionStatus } from "../../types/match";
import { EventMix } from "../fan/EventMix";
import { AuthoritativeTotals } from "../fan/KeyStats";
import { LiveEvents } from "../fan/LiveEvents";
import { PressureChart } from "../fan/PressureChart";
import { TeamComparison } from "../fan/TeamComparison";
import { Panel } from "../Panel";
import type { AnalystTab } from "./AnalystTabs";
import { CoverageBar } from "./CoverageBar";
import { EventExplorer } from "./EventExplorer";
import { KeyMetrics } from "./KeyMetrics";
import { PassingNetworkTab, PassVolume } from "./PassingNetwork";
import { PitchView } from "./PitchView";
import { PlayerComparison } from "./PlayerComparison";
import { ShowcaseProfiles } from "./ShowcaseProfiles";
import { MatchRecap } from "../MatchRecap";
import { TacticalInsights } from "./TacticalInsights";
import { TeamShape } from "./TeamShape";
import { TeamTrends } from "./TeamTrends";

/** Pressure points drawn in the chart; older ones are still counted in metrics. */
const PRESSURE_CHART_POINTS = 240;

type AnalystDashboardProps = {
  state: MatchState;
  status: ConnectionStatus;
  tab: AnalystTab;
  onTabChange: (tab: AnalystTab) => void;
  period: Period;
};

export function AnalystDashboard({ state, status, tab, onTabChange, period }: AnalystDashboardProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Recomputed per render: at most HISTORY_SIZE small events, about once a second.
  const range = periodRange(period, state.clock);
  const events = filterByRange(state.history, range);
  const summary = summarise(events);
  const insights = filterInsights(state.insights, range);
  const eventsById = new Map(state.history.map((event) => [event.event_id, event]));
  const cov = coverage(range, state.sessionStart, state.clock);
  const feed = events.slice(-60).reverse();
  const pressure = summary.pressure.slice(-PRESSURE_CHART_POINTS);

  const openEvidence = (eventId: string) => {
    setSelectedEventId(eventId);
    onTabChange("events");
  };

  return (
    <div
      className="analyst-dashboard"
      role="tabpanel"
      id={`analyst-panel-${tab}`}
      aria-labelledby={`analyst-tab-${tab}`}
    >
      <CoverageBar
        period={period}
        range={range}
        coverage={cov}
        sessionStart={state.sessionStart}
        clock={state.clock}
        eventCount={events.length}
        missed={state.missed}
        status={status}
      />

      {tab === "overview" && (
        <div className="analyst-stack">
          <MatchRecap recaps={state.recaps} audience="analyst" />
          <div className="grid grid-a-row-1">
            <KeyMetrics teams={summary.teams} metrics={state.metrics} />
            <PitchView events={events} />
            <TeamShape />
          </div>
          <div className="grid grid-a-row-2">
            <PressureChart points={pressure} />
            <PassVolume events={events} teams={[HOME, AWAY]} compact />
          </div>
          <div className="grid grid-a-row-3">
            <PlayerComparison players={summary.players} events={events} compact />
            <LiveEvents events={feed} limit={6} title="Event Timeline" onViewAll={() => onTabChange("events")} />
            <TacticalInsights
              insights={insights}
              clock={state.clock}
              eventsById={eventsById}
              onEvidenceSelect={openEvidence}
              compact
            />
          </div>
        </div>
      )}

      {tab === "players" && (
        <div className="analyst-stack">
          <PlayerComparison players={summary.players} events={events} />
          <ShowcaseProfiles />
        </div>
      )}

      {tab === "passing" && <PassingNetworkTab events={events} />}

      {tab === "teams" && (
        <div className="analyst-stack">
          <div className="grid grid-a-teams">
            <TeamComparison
              teams={summary.teams}
              info="Figures for the selected period, rebuilt from the current demo match history supplied by the backend. They are not official competition statistics."
            />
            <TeamTrends events={events} />
          </div>
          <div className="grid grid-a-teams">
            <EventMix teams={summary.teams} />
            <PressureChart points={pressure} />
          </div>
          <Panel title="Backend Match Totals" className="totals-panel">
            <AuthoritativeTotals metrics={state.metrics} />
            <p className="panel-footnote">
              Calculated by the backend over every event since the API started. Both teams combined; the period filter
              does not apply.
            </p>
          </Panel>
        </div>
      )}

      {tab === "events" && (
        <div className="analyst-stack">
          <EventExplorer
            events={events}
            insights={state.insights}
            selectedId={selectedEventId}
            onSelect={setSelectedEventId}
          />
          <TacticalInsights
            insights={insights}
            clock={state.clock}
            eventsById={eventsById}
            onEvidenceSelect={setSelectedEventId}
            limit={10}
          />
        </div>
      )}
    </div>
  );
}
