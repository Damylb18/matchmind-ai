import { teamByApiName } from "../../data/teams";
import { formatClockSeconds, matchTimeAgo } from "../../lib/format";
import { HIGH_PRESSURE_THRESHOLD, type InsightEntry } from "../../lib/matchState";
import type { MatchEvent } from "../../types/match";
import { Icon } from "../icons/Icon";
import { EmptyState, Panel } from "../Panel";

type TacticalInsightsProps = {
  insights: InsightEntry[];
  clock: number | null;
  eventsById: Map<string, MatchEvent>;
  onEvidenceSelect?: (eventId: string) => void;
  limit?: number;
  compact?: boolean;
};

const TYPE_LABELS: Record<string, string> = { pressure_surge: "Pressure surge" };

export function TacticalInsights({
  insights,
  clock,
  eventsById,
  onEvidenceSelect,
  limit = 3,
  compact = false,
}: TacticalInsightsProps) {
  return (
    <Panel
      title="Tactical Insights"
      provenance="session"
      info={`Backend rule output shown verbatim (api/src/rules.ts): fires when a team's last 10 pressure events average above ${HIGH_PRESSURE_THRESHOLD}. Evidence intensity is recomputed here from the referenced events this browser received.`}
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

            return (
              <li key={insight.key} className="insight">
                <span
                  className="insight-icon"
                  style={{ color: team?.colors.data, borderColor: team?.colors.data }}
                  aria-hidden="true"
                >
                  <Icon name={insight.type === "pressure_surge" ? "pressure" : "insight"} size={18} />
                </span>
                <div className="insight-body">
                  <div className="insight-title-row">
                    <h3>{insight.headline}</h3>
                    {clock !== null && (
                      <span className="insight-ago" title="Elapsed match time">
                        {matchTimeAgo(clock, insight.clock)}
                      </span>
                    )}
                  </div>
                  <p className={compact ? "clamp-2" : undefined}>{insight.explanation}</p>
                  <p className="insight-meta">
                    <span>{formatClockSeconds(insight.clock)}</span>
                    <span>{team?.name ?? insight.team}</span>
                    <span>{TYPE_LABELS[insight.type] ?? insight.type}</span>
                    {average !== null && <span>Evidence avg intensity {average.toFixed(2)}</span>}
                    <span>
                      {evidence.length}/{insight.evidence_event_ids.length} evidence events in session
                    </span>
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
