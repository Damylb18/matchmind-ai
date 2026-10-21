import type { RefObject } from "react";
import { Icon } from "../icons/Icon";
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

  return (
    <section className="bc-monitor" aria-label="Broadcast monitor">
      <header className="bc-monitor-head">
        <div className="bc-monitor-views" role="group" aria-label="Monitor view">
          <button type="button" aria-pressed={isProgram} onClick={() => dispatch({ type: "monitor", view: "program" })}>
            Program
          </button>
          <button type="button" aria-pressed={!isProgram} onClick={() => dispatch({ type: "monitor", view: "preview" })}>
            Preview
          </button>
        </div>
        <span className={isProgram ? "bc-bus pgm" : "bc-bus pvw"}>
          {isProgram ? (production.output ? "PGM · On air (simulated)" : "PGM · Standby") : "PVW"}
        </span>
        <span className="bc-monitor-scene">{SCENE_BY_ID[current.scene].title}</span>
        <div className="bc-monitor-actions">
          {!isProgram && (
            <button type="button" className="bc-btn bc-btn-take" onClick={() => dispatch({ type: "takePreview", clock })}>
              Take live
            </button>
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
        <div className={`bc-stage ${isProgram && production.output ? "is-on-air" : ""}`}>
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
    </section>
  );
}
