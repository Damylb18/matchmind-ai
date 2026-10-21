import { Icon } from "../icons/Icon";
import type { ProductionAction, ProductionState } from "./productionState";
import { DURATION_OPTIONS, durationValue, formatDuration, parseDuration, SCENES } from "./scenes";
import { SceneThumb } from "./Thumbs";

type SceneLibraryProps = {
  production: ProductionState;
  dispatch: (action: ProductionAction) => void;
  clock: number | null;
};

export function SceneLibrary({ production, dispatch, clock }: SceneLibraryProps) {
  return (
    <section className="panel bc-library" aria-label="Scene library">
      <header className="panel-head">
        <Icon name="broadcast" size={17} />
        <h2>Scene Library</h2>
      </header>
      <ol className="bc-scene-list">
        {SCENES.map((scene, index) => {
          const onAir = production.program.scene === scene.id;
          const inPreview = production.preview === scene.id;
          const selected = production.selectedScene === scene.id;
          return (
            <li
              key={scene.id}
              className={`bc-scene-row ${selected ? "is-selected" : ""} ${onAir ? "is-on-air" : ""}`}
              onClick={() => dispatch({ type: "selectScene", scene: scene.id })}
            >
              <span className="bc-scene-index">{index + 1}</span>
              <SceneThumb scene={scene.id} profileId={production.overlays.player.profileId} />
              <div className="bc-scene-text">
                <strong>{scene.title}</strong>
                <span>{scene.description}</span>
                <span className="bc-scene-badges">
                  {onAir && <em className="pgm">{production.output ? "On air" : "Program"}</em>}
                  {inPreview && <em className="pvw">Preview</em>}
                </span>
              </div>
              <div className="bc-scene-actions" onClick={(event) => event.stopPropagation()}>
                <select
                  className="compact-select"
                  aria-label={`${scene.title} duration`}
                  value={durationValue(production.sceneDurations[scene.id])}
                  onChange={(event) =>
                    dispatch({ type: "sceneDuration", scene: scene.id, duration: parseDuration(event.target.value) })
                  }
                >
                  {DURATION_OPTIONS.map((duration) => (
                    <option key={durationValue(duration)} value={durationValue(duration)}>
                      {formatDuration(duration)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="bc-btn ghost"
                  aria-label={`Preview ${scene.title}`}
                  onClick={() => dispatch({ type: "previewScene", scene: scene.id })}
                >
                  Preview
                </button>
                <button
                  type="button"
                  className="bc-btn"
                  aria-label={`Take ${scene.title} live`}
                  onClick={() => dispatch({ type: "take", scene: scene.id, clock })}
                >
                  Take
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
