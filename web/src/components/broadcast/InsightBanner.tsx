import { teamByApiName } from "../../data/teams";
import { formatClockSeconds } from "../../lib/format";
import type { InsightEntry } from "../../lib/matchState";
import { Icon } from "../icons/Icon";
import type { BannerPosition } from "./productionState";

type InsightBannerProps = {
  /** Content to render; kept while hidden so the exit can animate. */
  insight: InsightEntry | null;
  visible: boolean;
  position: BannerPosition;
};

/** Backend insight, shown verbatim. */
export function InsightBanner({ insight, visible, position }: InsightBannerProps) {
  const team = insight ? teamByApiName(insight.team) : undefined;

  return (
    <div
      className={`bc-overlay bc-banner pos-${position}`}
      data-visible={visible && insight !== null}
      style={{ borderColor: team?.colors.data }}
      role="status"
      aria-live="polite"
    >
      {insight && (
        <>
          <span className="bc-banner-icon" style={{ color: team?.colors.data }} aria-hidden="true">
            <Icon name="pressure" size={22} />
          </span>
          <div className="bc-banner-body">
            <span className="bc-banner-label">
              Tactical insight · {formatClockSeconds(insight.clock)}
            </span>
            <strong>{insight.headline}</strong>
            <p>{insight.explanation}</p>
          </div>
        </>
      )}
    </div>
  );
}
