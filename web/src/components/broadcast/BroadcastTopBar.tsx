import { STATUS_TEXT } from "../../lib/format";
import type { ConnectionStatus } from "../../types/match";
import { Icon } from "../icons/Icon";
import type { FeedNotice } from "./liveData";

type BroadcastTopBarProps = {
  clockLabel: string;
  status: ConnectionStatus;
  output: boolean;
  notice: FeedNotice | null;
  stale: boolean;
};

export function BroadcastTopBar({ clockLabel, status, output, notice, stale }: BroadcastTopBarProps) {
  return (
    <header className="bc-topbar">
      <p className="bc-context">
        <span>Premier League</span>
        <span aria-hidden="true">·</span>
        <span>Live Demo Match</span>
        <span className="bc-demo-chip">Simulated match</span>
      </p>

      {/* Fixed slot so connection notices never shift the layout. */}
      <p
        className={`bc-notice ${notice ? `tone-${notice.tone}` : "is-empty"}`}
        role="status"
        aria-live="polite"
        title={notice?.text}
      >
        {notice && (
          <>
            <Icon name={notice.tone === "ok" ? "trend" : "info"} size={14} />
            <span>{notice.text}</span>
          </>
        )}
      </p>

      <div className="bc-topbar-right">
        <span className={`status-pill status-${status}`}>
          <span className="dot" aria-hidden="true" />
          {STATUS_TEXT[status]}
        </span>
        <time className={stale ? "bc-top-clock is-stale" : "bc-top-clock"} aria-label="Match clock">
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
