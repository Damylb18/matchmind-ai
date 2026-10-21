import { STATUS_TEXT } from "../../lib/format";
import type { ConnectionStatus } from "../../types/match";

type BroadcastTopBarProps = { clockLabel: string; status: ConnectionStatus; output: boolean };

export function BroadcastTopBar({ clockLabel, status, output }: BroadcastTopBarProps) {
  return (
    <header className="bc-topbar">
      <p className="bc-context">
        <span>Premier League</span>
        <span aria-hidden="true">·</span>
        <span>Live Demo Match</span>
        <span className="bc-demo-chip">Demonstration</span>
      </p>
      <div className="bc-topbar-right">
        <span className={`status-pill status-${status}`} role="status">
          <span className="dot" aria-hidden="true" />
          {STATUS_TEXT[status]}
        </span>
        <time className="bc-top-clock" aria-label="Match clock">
          {clockLabel}
        </time>
        <span className={output ? "bc-onair is-on" : "bc-onair"} role="status">
          <span className="bc-onair-dot" aria-hidden="true" />
          {output ? "On air · simulated" : "Standby"}
        </span>
      </div>
    </header>
  );
}
