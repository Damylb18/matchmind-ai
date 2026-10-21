import type { CountStats } from "../../lib/matchState";
import type { MatchMetrics } from "../../types/match";
import { AuthoritativeTotals } from "../fan/KeyStats";
import { TeamComparison } from "../fan/TeamComparison";

type KeyMetricsProps = { teams: Record<string, CountStats>; metrics: MatchMetrics | null };

/** Team metrics for the selected period, plus the backend's match-wide totals. */
export function KeyMetrics({ teams, metrics }: KeyMetricsProps) {
  return (
    <TeamComparison
      teams={teams}
      title="Key Metrics"
      className="comparison-panel key-metrics-panel"
      info={
        "Team rows are counted from events received in this browser for the selected period. " +
        "The API total below is the backend's match-wide figure for both teams combined and ignores the period filter. " +
        "Possession, xG, shots on target and corners are not in the feed and are not shown."
      }
    >
      <AuthoritativeTotals metrics={metrics} />
    </TeamComparison>
  );
}
