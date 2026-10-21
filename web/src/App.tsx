import { useState } from "react";
import "./App.css";
import { AnalystDashboard } from "./components/analyst/AnalystDashboard";
import { AnalystNav, type AnalystTab } from "./components/analyst/AnalystTabs";
import { BroadcastView } from "./components/BroadcastView";
import { FanDashboard, FanTabs, type FanTab } from "./components/fan/FanDashboard";
import { MatchHeader } from "./components/MatchHeader";
import { Sidebar } from "./components/Sidebar";
import { useMatchStream } from "./hooks/useMatchStream";
import { DEFAULT_PERIOD, type Period } from "./lib/analysis";
import type { Mode } from "./types/match";

export default function App() {
  const { state, status } = useMatchStream();
  const [mode, setMode] = useState<Mode>("fan");
  const [fanTab, setFanTab] = useState<FanTab>("overview");
  const [analystTab, setAnalystTab] = useState<AnalystTab>("overview");
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD);

  return (
    <div className="app-shell">
      <Sidebar mode={mode} onModeChange={setMode} status={status} received={state.received} />

      <main className="main-content">
        <MatchHeader minute={state.minute} second={state.second} status={status}>
          {mode === "fan" && <FanTabs tab={fanTab} onChange={setFanTab} />}
          {mode === "analyst" && (
            <AnalystNav
              tab={analystTab}
              onTabChange={setAnalystTab}
              period={period}
              onPeriodChange={setPeriod}
              maxMinute={state.minute ?? 90}
            />
          )}
        </MatchHeader>

        {mode === "fan" && <FanDashboard state={state} tab={fanTab} onTabChange={setFanTab} />}
        {mode === "analyst" && (
          <AnalystDashboard
            state={state}
            status={status}
            tab={analystTab}
            onTabChange={setAnalystTab}
            period={period}
          />
        )}
        {mode === "broadcast" && <BroadcastView state={state} />}

        <footer className="page-footer">
          MatchMind AI · Synthetic match simulation · Player photos via Wikimedia Commons (CC BY-SA 4.0) ·
          Club names used for identification only
        </footer>
      </main>
    </div>
  );
}
