import type { RefObject } from "react";
import { formatClockSeconds } from "../../lib/format";
import { Icon } from "../icons/Icon";
import { ActiveOverlays } from "./ActiveOverlays";
import type { ProductionAction, ProductionState } from "./productionState";
import { SCENE_BY_ID } from "./scenes";
import { SceneRenderer, type StageData } from "./SceneRenderer";

type BroadcastPreviewProps = {
  production: ProductionState;
  dispatch: (action: ProductionAction) => void;
  data: StageData;
  clock: number | null;
  videoUrl: string | null;
  screenRef: RefObject<HTMLDivElement | null>;
  fullscreen: boolean;
  /** True when using the in-page fallback rather than native fullscreen. */
  expanded: boolean;
  onToggleFullscreen: () => void;
};

export function BroadcastPreview({
  production,
  dispatch,
  data,
  clock,
  videoUrl,
  screenRef,
  fullscreen,
  expanded,
  onToggleFullscreen,
}: BroadcastPreviewProps) {
  const isProgram = production.monitor === "program";
  const current = isProgram ? production.program : { scene: production.preview, take: -1 };
  const lastAction = production.log[0];
  const bannerDue =
    production.overlays.insight.enabled &&
    (current.scene === "tactical" ? data.focus !== null : current.scene === "main" ? data.banner !== null : false);

  return (
    <section className="bc-monitor" aria-label="Broadcast monitor">
      <header className="bc-monitor-head">
        {/* Program and Preview are always both visible; clicking one shows it on the monitor. */}
        <div className="bc-buses" role="group" aria-label="Monitor view">
          <button
            type="button"
            className={`bc-bus-card pgm ${production.output ? "is-on-air" : ""}`}
            aria-pressed={isProgram}
            onClick={() => dispatch({ type: "monitor", view: "program" })}
          >
            <span className="bc-bus-tag">
              Program<span className="bc-bus-sub">{production.output ? " · on air" : " · standby"}</span>
            </span>
            <strong>{SCENE_BY_ID[production.program.scene].title}</strong>
          </button>
          <button
            type="button"
            className="bc-take-btn"
            onClick={() => dispatch({ type: "takePreview", clock })}
            title="Cut the Preview scene to Program using the selected transition"
          >
            Take <Icon name="arrowRight" size={14} />
          </button>
          <button
            type="button"
            className="bc-bus-card pvw"
            aria-pressed={!isProgram}
            onClick={() => dispatch({ type: "monitor", view: "preview" })}
          >
            <span className="bc-bus-tag">
              Preview<span className="bc-bus-sub"> · next</span>
            </span>
            <strong>{SCENE_BY_ID[production.preview].title}</strong>
          </button>
        </div>
        <div className="bc-monitor-actions">
          {lastAction && (
            <span className="bc-last-action" key={lastAction.id}>
              <Icon name="trend" size={13} />
              {lastAction.text}
              {lastAction.clock !== null && <time>{formatClockSeconds(lastAction.clock)}</time>}
            </span>
          )}
          <button type="button" className="bc-icon-btn" onClick={onToggleFullscreen} aria-label="Fullscreen monitor">
            <Icon name="fullscreen" size={15} />
          </button>
        </div>
      </header>

      <div
        ref={screenRef}
        className={`bc-screen ${fullscreen ? "is-fullscreen" : ""} ${expanded ? "is-expanded" : ""}`}
        role={expanded ? "dialog" : undefined}
        aria-label={expanded ? "Broadcast monitor, expanded" : undefined}
      >
        <div
          className={`bc-stage ${isProgram ? "view-program" : "view-preview"} ${
            isProgram && production.output ? "is-on-air" : ""
          }`}
        >
          <span className="bc-view-tag" aria-hidden="true">
            {isProgram ? "PGM" : "PVW"}
          </span>
          <SceneRenderer
            current={current}
            previous={isProgram ? production.previousProgram : null}
            transition={production.transition}
            overlays={production.overlays}
            quality={production.quality}
            videoUrl={videoUrl}
            data={data}
          />
        </div>
        {fullscreen && (
          <button type="button" className="bc-exit-full" onClick={onToggleFullscreen}>
            Exit fullscreen (Esc)
          </button>
        )}
      </div>

      <ActiveOverlays
        overlays={production.overlays}
        scene={current.scene}
        bannerDue={bannerDue}
        view={production.monitor}
        dispatch={dispatch}
      />
    </section>
  );
}
