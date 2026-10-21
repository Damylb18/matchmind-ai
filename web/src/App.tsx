
import { useEffect, useState } from "react";
import "./App.css";

type MatchEvent = {
  event_id: string;
  minute: number;
  second: number;
  team: string;
  player: string;
  event_type: string;
  completed?: boolean;
};

type Insight = {
  id?: string;
  type: string;
  headline: string;
  explanation: string;
};

type Message = {
  event: MatchEvent;
  metrics: {
    attempted_passes: number;
    completed_passes: number;
    pass_accuracy: number;
  };
  insights: Insight[];
};

type Mode = "fan" | "analyst" | "broadcast";

const formatTime = (minute: number, second: number) =>
  `${minute}:${String(second).padStart(2, "0")}`;

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<Mode>("fan");
  const [connected, setConnected] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState("All players");

  useEffect(() => {
    const source = new EventSource(
      "http://localhost:4000/api/match/stream"
    );

    source.onopen = () => setConnected(true);

    source.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data);
        if (!data.event) return;

        setMessages((previous) =>
          [data as Message, ...previous].slice(0, 100)
        );
      } catch (error) {
        console.error("Invalid match event", error);
      }
    };

    source.onerror = () => setConnected(false);

    return () => source.close();
  }, []);

  const latest = messages[0];
  const metrics = latest?.metrics;
  const players = Array.from(
    new Set(messages.map((item) => item.event.player))
  );
  const visibleMessages = messages.filter(
    (item) =>
      selectedPlayer === "All players" ||
      item.event.player === selectedPlayer
  );
  const insights = messages.flatMap((item) =>
    (item.insights ?? []).map((insight) => ({
      ...insight,
      eventId: item.event.event_id,
      time: formatTime(item.event.minute, item.event.second),
    }))
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <strong>MatchMind</strong>
            <span>AI MATCH INTELLIGENCE</span>
          </div>
        </div>

        <p className="sidebar-label">WORKSPACE</p>

        <nav className="navigation" aria-label="View modes">
          {(["fan", "analyst", "broadcast"] as Mode[]).map((item) => (
            <button
              key={item}
              className={mode === item ? "nav-button active" : "nav-button"}
              onClick={() => setMode(item)}
            >
              <span className="nav-icon">
                {item === "fan" ? "◉" : item === "analyst" ? "▥" : "▣"}
              </span>
              {item.charAt(0).toUpperCase() + item.slice(1)} Mode
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" />
          Synthetic match simulation
          <small>Microsoft × Premier League Hackathon</small>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">MATCH INTELLIGENCE / LIVE CENTRE</p>
            <h1>
              {mode === "fan"
                ? "Match Centre"
                : mode === "analyst"
                ? "Performance Analysis"
                : "Broadcast Studio"}
            </h1>
          </div>

          <div className={connected ? "connection live" : "connection"}>
            <span className="status-dot" />
            {connected ? "Stream connected" : "Connecting to stream"}
          </div>
        </header>

        <section className="match-banner">
          <div className="match-banner-top">
            <span className="competition">LIVE DEMO MATCH</span>
            <span className="live-pill">
              <span className="status-dot" />
              LIVE DATA
            </span>
          </div>

          <div className="fixture">
            <div className="team">
              <div className="team-crest united">MU</div>
              <h2>Manchester United</h2>
            </div>

            <div className="match-centre">
              <span className="clock">
                {latest
                  ? formatTime(latest.event.minute, latest.event.second)
                  : "00:00"}
              </span>
              <strong>VS</strong>
              <span className="score-note">
                Score unavailable in event API
              </span>
            </div>

            <div className="team">
              <div className="team-crest arsenal">ARS</div>
              <h2>Arsenal</h2>
            </div>
          </div>
        </section>

        <div className="section-heading">
          <div>
            <p className="eyebrow">REAL-TIME PERFORMANCE</p>
            <h2>Match overview</h2>
          </div>
          <span className="subtle-text">Synthetic event feed</span>
        </div>

        <section className="stats-grid">
          <article className="stat-card">
            <span>Pass accuracy</span>
            <strong>{metrics?.pass_accuracy ?? 0}%</strong>
            <small>Across both teams</small>
          </article>
          <article className="stat-card">
            <span>Passes attempted</span>
            <strong>{metrics?.attempted_passes ?? 0}</strong>
            <small>Match total</small>
          </article>
          <article className="stat-card">
            <span>Passes completed</span>
            <strong>{metrics?.completed_passes ?? 0}</strong>
            <small>Match total</small>
          </article>
          <article className="stat-card">
            <span>Events in view</span>
            <strong>{messages.length}</strong>
            <small>Latest 100 events</small>
          </article>
        </section>

        {mode === "broadcast" && (
          <section className="broadcast-preview">
            <div className="broadcast-label">BROADCAST GRAPHIC PREVIEW</div>
            <div className="broadcast-overlay">
              <span>MATCHMIND AI</span>
              <strong>
                MAN UTD <em>VS</em> ARSENAL
              </strong>
              <span>
                {latest
                  ? formatTime(latest.event.minute, latest.event.second)
                  : "00:00"}
              </span>
            </div>
            <p>
              This graphic uses the live event clock. Score overlays can be
              added once the backend provides goal and score data.
            </p>
          </section>
        )}

        <div className="content-grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">MATCH ACTIVITY</p>
                <h2>
                  {mode === "analyst"
                    ? "Event breakdown"
                    : "Live event timeline"}
                </h2>
              </div>
              <span className="live-indicator">● LIVE</span>
            </div>

            {mode === "analyst" && (
              <div className="filter-bar">
                <label htmlFor="player-filter">Player focus</label>
                <select
                  id="player-filter"
                  value={selectedPlayer}
                  onChange={(event) =>
                    setSelectedPlayer(event.target.value)
                  }
                >
                  <option>All players</option>
                  {players.map((player) => (
                    <option key={player}>{player}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="event-list">
              {visibleMessages.length === 0 ? (
                <p className="empty-state">
                  Waiting for match events from the backend…
                </p>
              ) : (
                visibleMessages.slice(0, 25).map((item) => (
                  <article
                    className="event-item"
                    key={item.event.event_id}
                  >
                    <span className="event-time">
                      {formatTime(
                        item.event.minute,
                        item.event.second
                      )}
                    </span>
                    <span className="event-symbol">
                      {item.event.event_type === "shot"
                        ? "◎"
                        : item.event.event_type === "pass"
                        ? "➜"
                        : item.event.event_type === "tackle"
                        ? "◆"
                        : "◈"}
                    </span>
                    <div className="event-description">
                      <strong>
                        {item.event.event_type.toUpperCase()}
                      </strong>
                      <p>
                        {item.event.player} · {item.event.team}
                      </p>
                      {mode === "analyst" &&
                        item.event.event_type === "pass" && (
                          <small>
                            {item.event.completed
                              ? "Completed pass"
                              : "Incomplete pass"}
                          </small>
                        )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="panel insights-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">AI-POWERED EXPLANATIONS</p>
                <h2>
                  {mode === "broadcast"
                    ? "Commentary cues"
                    : "Tactical insights"}
                </h2>
              </div>
              <span className="ai-tag">AI</span>
            </div>

            {insights.length === 0 ? (
              <div className="empty-insights">
                <span>✦</span>
                <h3>Watching the game</h3>
                <p>
                  Tactical insights will appear here as the backend
                  identifies meaningful patterns.
                </p>
              </div>
            ) : (
              <div className="insights-list">
                {insights.slice(0, 10).map((insight) => (
                  <article
                    className="insight-card"
                    key={`${insight.eventId}-${insight.id ?? insight.type}`}
                  >
                    <div className="insight-meta">
                      <span>✦ MATCHMIND INSIGHT</span>
                      <span>{insight.time}</span>
                    </div>
                    <h3>{insight.headline}</h3>
                    <p>{insight.explanation}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <footer className="page-footer">
          MatchMind AI · Synthetic football intelligence prototype
        </footer>
      </main>
    </div>
  );
}
