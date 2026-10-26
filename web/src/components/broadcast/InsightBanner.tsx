import { teamByApiName } from "../../data/teams";
import { usePersonaliser } from "../../hooks/usePersonaliser";
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

/** Backend rule insight, worded for broadcast in the selected language (local templates). */
export function InsightBanner({ insight, visible, position }: InsightBannerProps) {
  const team = insight ? teamByApiName(insight.team) : undefined;
  const personalise = usePersonaliser("broadcast");
  const text = insight ? personalise(insight) : null;

  return (
    <div
      className={`bc-overlay bc-banner pos-${position}`}
      data-visible={visible && insight !== null}
      style={{ borderColor: team?.colors.data }}
      role="status"
      aria-live="polite"
    >
      {insight && text && (
        <>
          <span className="bc-banner-icon" style={{ color: team?.colors.data }} aria-hidden="true">
            <Icon name="pressure" size={22} />
          </span>
          <div className="bc-banner-body" lang={text.contentLang}>
            <span className="bc-banner-label">
              Tactical insight · {formatClockSeconds(insight.clock)}
            </span>
            <strong>{text.headline}</strong>
            <p>{text.explanation}</p>
          </div>
        </>
      )}
    </div>
  );
}
