import type { ConnectionStatus, Mode } from "../types/match";
import { STATUS_TEXT } from "../lib/format";
import { Icon, type IconName } from "./icons/Icon";

const MODES: { id: Mode; label: string; icon: IconName }[] = [
  { id: "fan", label: "Fan Mode", icon: "fan" },
  { id: "analyst", label: "Analyst Mode", icon: "analyst" },
  { id: "broadcast", label: "Broadcast Mode", icon: "broadcast" },
];

type SidebarProps = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  status: ConnectionStatus;
  received: number;
};

export function Sidebar({ mode, onModeChange, status, received }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          M
        </span>
        <span className="brand-text">
          <strong>MatchMind</strong>
          <span>AI Football Intelligence</span>
        </span>
      </div>

      <nav className="mode-nav" aria-label="View modes">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={mode === item.id ? "mode-link active" : "mode-link"}
            aria-current={mode === item.id ? "page" : undefined}
            onClick={() => onModeChange(item.id)}
          >
            <Icon name={item.icon} size={18} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-section">
        <p className="sidebar-label">Data feed</p>
        <dl className="feed-facts">
          <div>
            <dt>Stream</dt>
            <dd className={`feed-status feed-${status}`}>
              <span className="dot" aria-hidden="true" />
              {STATUS_TEXT[status]}
            </dd>
          </div>
          <div>
            <dt>Events received</dt>
            <dd>{received.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>Synthetic simulation</dd>
          </div>
        </dl>
      </div>

      <p className="sidebar-footer">Microsoft × Premier League Hackathon prototype</p>
    </aside>
  );
}

