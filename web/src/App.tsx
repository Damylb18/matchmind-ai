import { useState } from "react";
import "./App.css";
import { AnalystView } from "./components/AnalystView";
import { BroadcastView } from "./components/BroadcastView";
import { FanDashboard, FanTabs, type FanTab } from "./components/fan/FanDashboard";
import { MatchHeader } from "./components/MatchHeader";
import { Sidebar } from "./components/Sidebar";
import { useMatchStream } from "./hooks/useMatchStream";
import type { Mode } from "./types/match";

export default function App() {
  const { state, status } = useMatchStream();
  const [mode, setMode] = useState<Mode>("fan");
  const [fanTab, setFanTab] = useState<FanTab>("overview");

  return (
    <div className="app-shell">
      <Sidebar mode={mode} onModeChange={setMode} status={status} received={state.received} />

      <main className="main-content">
        <MatchHeader minute={state.minute} second={state.second} status={status}>
          {mode === "fan" && <FanTabs tab={fanTab} onChange={setFanTab} />}
        </MatchHeader>

        {mode === "fan" && <FanDashboard state={state} tab={fanTab} onTabChange={setFanTab} />}
        {mode === "analyst" && <AnalystView state={state} />}
        {mode === "broadcast" && <BroadcastView state={state} />}

        <footer className="page-footer">
          MatchMind AI · Synthetic match simulation · Player photos via Wikimedia Commons (CC BY-SA 4.0) ·
          Club names used for identification only
        </footer>
      </main>
    </div>
  );
}
