import { teamByApiName } from "../../data/teams";
import { useExplanationPreferences } from "../../lib/explanation";
import { personalise } from "../../lib/personalisation";
import { formatClockSeconds, matchTimeAgo } from "../../lib/format";
import { HIGH_PRESSURE_THRESHOLD, type InsightEntry } from "../../lib/matchState";
import type { MatchEvent } from "../../types/match";
import { Icon } from "../icons/Icon";
import { InsightSource } from "../InsightSource";
import { EmptyState, Panel } from "../Panel";

type TacticalInsightsProps = {
  insights: InsightEntry[];
  clock: number | null;
  eventsById: Map<string, MatchEvent>;
  onEvidenceSelect?: (eventId: string) => void;
  limit?: number;
  compact?: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  pressure_surge: "Pressure surge",
  passing_pattern: "Passing pattern",
  shot_activity: "Shot activity",
};

export function TacticalInsights({
  insights,
  clock,
  eventsById,
  onEvidenceSelect,
  limit = 3,
  compact = false,
}: TacticalInsightsProps) {
  const { language } = useExplanationPreferences();
  return (
    <Panel
      title="Tactical Insights"
      provenance="session"
      info={`Detected by the backend rule engine (api/src/rules.ts): fires when a team's last 5 pressure events average at least ${HIGH_PRESSURE_THRESHOLD}. Wording is adapted for analysts from built-in local templates (not Azure AI); the original backend text is shown underneath. Evidence intensity is recomputed from the referenced events this browser received.`}
      className={compact ? "tactical-panel compact" : "tactical-panel"}
    >
      {insights.length === 0 ? (
        <EmptyState>No backend insights in this period yet.</EmptyState>
      ) : (
        <ol className="insight-list">
          {insights.slice(0, limit).map((insight) => {
            const team = teamByApiName(insight.team);
            const evidence = insight.evidence_event_ids
              .map((id) => eventsById.get(id))
              .filter((event): event is MatchEvent => event !== undefined);
            const values = evidence
              .map((event) => event.pressure)
              .filter((value): value is number => typeof value === "number");
            const average = values.length
              ? values.reduce((sum, value) => sum + value, 0) / values.length
              : null;
            // This panel already holds the period's event map, so personalise against it directly.
            const text = personalise(insight, "analyst", language, eventsById);

            return (
              <li key={insight.key} className="insight">
                <span
                  className="insight-icon"
                  style={{ color: team?.colors.data, borderColor: team?.colors.data }}
                  aria-hidden="true"
                >
                  <Icon name={insight.type === "pressure_surge" ? "pressure" : "insight"} size={18} />
                </span>
                <div className="insight-body" lang={text.contentLang}>
                  <div className="insight-title-row">
                    <h3>{text.headline}</h3>
                    {clock !== null && (
                      <span className="insight-ago" title="Elapsed match time">
                        {matchTimeAgo(clock, insight.clock)}
                      </span>
                    )}
                  </div>
                  <p className={compact ? "clamp-2" : undefined}>{text.explanation}</p>
                  {!compact && (
                    <>
                      {text.source === "local-demo-template" && <p className="insight-takeaway">{text.takeaway}</p>}
                      <p className="insight-note">{text.evidenceNote}</p>
                      {text.source === "local-demo-template" && (
                        <p className="insight-original" lang="en">
                          Backend original: “{insight.headline}”
                        </p>
                      )}
                    </>
                  )}
                  <p className="insight-meta">
                    <span>{formatClockSeconds(insight.clock)}</span>
                    <span>{team?.name ?? insight.team}</span>
                    <span>{TYPE_LABELS[insight.type] ?? insight.type}</span>
                    {average !== null && <span>Evidence avg intensity {average.toFixed(2)}</span>}
                    <span>
                      {evidence.length}/{insight.evidence_event_ids.length} evidence events in session
                    </span>
                    {typeof insight.confidence === "number" && (
                      <span>Rule confidence {Math.round(insight.confidence * 100)}%</span>
                    )}
                    <InsightSource personalised={text} />
                  </p>
                  {!compact && onEvidenceSelect && (
                    <div className="evidence-chips" aria-label="Evidence events">
                      {insight.evidence_event_ids.map((id) => {
                        const event = eventsById.get(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            disabled={!event}
                            onClick={() => onEvidenceSelect(id)}
                            title={
                              event
                                ? `Open ${id} in Event Analysis`
                                : "Received before this browser connected"
                            }
                          >
                            {id}
                            {typeof event?.pressure === "number" && <em>{event.pressure.toFixed(2)}</em>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
