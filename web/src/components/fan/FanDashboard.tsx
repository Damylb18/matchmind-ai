import { useRef, type KeyboardEvent } from "react";
import type { MatchState } from "../../lib/matchState";
import { AIInsights } from "./AIInsights";
import { EventMix } from "./EventMix";
import { KeyStats } from "./KeyStats";
import { LiveEvents } from "./LiveEvents";
import { MatchMomentum } from "./MatchMomentum";
import { PlayerFocus } from "./PlayerFocus";
import { PlayerTable } from "./PlayerTable";
import { PressureChart } from "./PressureChart";
import { TeamComparison } from "./TeamComparison";

export type FanTab = "overview" | "events" | "insights" | "stats";

const FAN_TABS: { id: FanTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "events", label: "Live Events" },
  { id: "insights", label: "AI Insights" },
  { id: "stats", label: "Team Stats" },
];

type FanTabsProps = { tab: FanTab; onChange: (tab: FanTab) => void };

export function FanTabs({ tab, onChange }: FanTabsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + FAN_TABS.length) % FAN_TABS.length;
    onChange(FAN_TABS[next]!.id);
    refs.current[next]?.focus();
  };

  return (
    <div className="fan-tabs" role="tablist" aria-label="Fan Mode sections">
      {FAN_TABS.map((item, index) => (
        <button
          key={item.id}
          ref={(node) => {
            refs.current[index] = node;
          }}
          type="button"
          role="tab"
          id={`tab-${item.id}`}
          aria-selected={tab === item.id}
          aria-controls={`panel-${item.id}`}
          tabIndex={tab === item.id ? 0 : -1}
          onClick={() => onChange(item.id)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

type FanDashboardProps = { state: MatchState; tab: FanTab; onTabChange: (tab: FanTab) => void };

export function FanDashboard({ state, tab, onTabChange }: FanDashboardProps) {
  return (
    <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="fan-dashboard">
      {tab === "overview" && <Overview state={state} onTabChange={onTabChange} />}

      {tab === "events" && (
        <div className="grid grid-events">
          <LiveEvents events={state.events} limit={60} filters title="Event Feed" />
          <div className="stack">
            <EventMix teams={state.teams} />
            <SessionNote state={state} />
          </div>
        </div>
      )}

      {tab === "insights" && (
        <div className="grid grid-insights">
          <AIInsights insights={state.insights} clock={state.clock} limit={20} variant="editorial" />
          <div className="stack">
            <PressureChart points={state.pressure} title="Signal Behind the Insights" />
            <MatchMomentum momentum={state.momentum} sessionStart={state.sessionStart} clock={state.clock} />
          </div>
        </div>
      )}

      {tab === "stats" && (
        <div className="grid grid-stats">
          <KeyStats teams={state.teams} metrics={state.metrics} sessionStart={state.sessionStart} />
          <TeamComparison teams={state.teams} />
          <PlayerTable players={state.players} />
          <EventMix teams={state.teams} />
        </div>
      )}
    </div>
  );
}

function Overview({ state, onTabChange }: { state: MatchState; onTabChange: (tab: FanTab) => void }) {
  return (
    <div className="overview">
      <div className="grid grid-row-1">
        <MatchMomentum momentum={state.momentum} sessionStart={state.sessionStart} clock={state.clock} />
        <KeyStats teams={state.teams} metrics={state.metrics} sessionStart={state.sessionStart} />
      </div>
      <div className="grid grid-row-2">
        <LiveEvents events={state.events} limit={5} onViewAll={() => onTabChange("events")} />
        <AIInsights
          insights={state.insights}
          clock={state.clock}
          limit={4}
          onViewAll={() => onTabChange("insights")}
        />
        <PlayerFocus players={state.players} onOpenTable={() => onTabChange("stats")} />
      </div>
      <div className="grid grid-row-3">
        <TeamComparison teams={state.teams} />
        <PressureChart points={state.pressure} />
        <EventMix teams={state.teams} />
      </div>
    </div>
  );
}

function SessionNote({ state }: { state: MatchState }) {
  return (
    <section className="panel session-note" aria-label="About this data">
      <header className="panel-head">
        <h2>About this feed</h2>
      </header>
      <ul>
        <li>
          <strong>{state.received.toLocaleString()}</strong> events received in this session; the latest{" "}
          {state.events.length} are kept for the feed.
        </li>
        {state.missed > 0 && (
          <li>
            <strong>{state.missed}</strong> events were missed while reconnecting and are absent from session
            figures.
          </li>
        )}
        <li>Player names in the feed are synthetic IDs generated by the demo backend.</li>
        <li>The feed carries no shot outcomes, goals, locations or receivers, so none are shown.</li>
      </ul>
    </section>
  );
}
