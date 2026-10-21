import { formatClockSeconds, STATUS_TEXT } from "../../lib/format";
import { PERIOD_LABELS, type Coverage, type Period } from "../../lib/analysis";
import type { ConnectionStatus } from "../../types/match";
import { Icon } from "../icons/Icon";

type CoverageBarProps = {
  period: Period;
  range: [number, number];
  coverage: Coverage;
  sessionStart: number | null;
  clock: number | null;
  eventCount: number;
  missed: number;
  status: ConnectionStatus;
};

export function CoverageBar({
  period,
  range,
  coverage,
  sessionStart,
  clock,
  eventCount,
  missed,
  status,
}: CoverageBarProps) {
  const pct = Math.round(coverage.fraction * 100);
  const pctText = pct === 0 && coverage.fraction > 0 ? "<1" : String(pct);
  const periodText =
    period.kind === "custom"
      ? `Custom · ${formatClockSeconds(range[0])}–${formatClockSeconds(range[1])}`
      : `${PERIOD_LABELS[period.kind]} · ${formatClockSeconds(range[0])}–${
          range[1] > 90 * 60 && period.kind !== "first" ? "now" : formatClockSeconds(range[1])
        }`;

  const message = {
    "not-started": "This period has not started yet.",
    none: "No events from this period were received in this browser session.",
    partial: `Only ${pctText}% of the period played so far is covered — this browser joined at ${
      sessionStart === null ? "--:--" : formatClockSeconds(sessionStart)
    }.`,
    complete: "Every event played in this period so far was received in this session.",
  }[coverage.status];

  return (
    <div className={`coverage-bar coverage-${coverage.status}`} role="status">
      <span className="coverage-period">{periodText}</span>
      <span className="coverage-meter" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </span>
      <span className="coverage-message">
        {coverage.status !== "complete" && <Icon name="info" size={14} />}
        {message}
      </span>
      <span className="coverage-facts">
        <span>
          <strong>{eventCount.toLocaleString()}</strong> events in period
        </span>
        {sessionStart !== null && clock !== null && (
          <span>
            Session {formatClockSeconds(sessionStart)}–{formatClockSeconds(clock)}
          </span>
        )}
        {missed > 0 && <span className="coverage-warn">{missed} missed on reconnect</span>}
        {status !== "live" && (
          <span className="coverage-warn">Stream {STATUS_TEXT[status].toLowerCase()} — figures paused</span>
        )}
      </span>
    </div>
  );
}
