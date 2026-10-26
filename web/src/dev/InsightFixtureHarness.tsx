/**
 * DEV-ONLY visual harness for insight personalisation. Loaded only by `npm run dev` with
 * `?insight-fixtures` in the URL (see main.tsx); excluded from production builds. Uses
 * its own fixture state, so it never touches the live match feed or its statistics.
 */
import "../App.css";
import "../components/analyst/analyst.css";
import "../components/broadcast/broadcast.css";
import { TacticalInsights } from "../components/analyst/TacticalInsights";
import { InsightBanner } from "../components/broadcast/InsightBanner";
import { AIInsights } from "../components/fan/AIInsights";
import { LanguageSelect } from "../components/LanguageSelect";
import { EvidenceContext } from "../lib/evidenceContext";
import { buildFixtureState } from "./insightFixtures";

const state = buildFixtureState();
const eventsById = new Map(state.history.map((event) => [event.event_id, event]));

export function InsightFixtureHarness() {
  const clock = state.clock;

  return (
    <EvidenceContext.Provider value={eventsById}>
      <div className="main-content" style={{ display: "grid", gap: 16 }}>
        <header className="panel" style={{ gap: 8 }}>
          <div className="panel-head">
            <h2>Insight personalisation — DEV fixture harness</h2>
            <span className="provenance provenance-illustrative">Fixture data · not live</span>
          </div>
          <p className="panel-footnote" style={{ marginTop: 0 }}>
            {state.insights.length} fixture insights (pressure_surge, passing_pattern, shot_activity and one type
            without a template) passed through the real stream adapter and reducer. Switch the language to check
            all four. Not connected to the match feed.
          </p>
          <div style={{ maxWidth: 260 }}>
            <LanguageSelect />
          </div>
        </header>

        <section aria-label="Fan Mode">
          <AIInsights insights={state.insights} clock={clock} limit={10} title="Fan · AI Insights" variant="editorial" />
        </section>

        <section aria-label="Analyst Mode">
          <TacticalInsights insights={state.insights} clock={clock} eventsById={eventsById} limit={10} />
        </section>

        <section aria-label="Broadcast Mode" className="panel" style={{ gap: 12 }}>
          <div className="panel-head">
            <h2>Broadcast · insight banner</h2>
          </div>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))" }}>
            {state.insights.map((insight) => (
              <div key={insight.key} className="bc-stage" style={{ background: "#0e2117" }}>
                <div className="bc-canvas theme-emerald">
                  <InsightBanner insight={insight} visible position="lower-left" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </EvidenceContext.Provider>
  );
}
