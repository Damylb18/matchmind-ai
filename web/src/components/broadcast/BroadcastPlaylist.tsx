import { useState, type CSSProperties, type DragEvent } from "react";
import { formatClockSeconds } from "../../lib/format";
import { Icon } from "../icons/Icon";
import type { ProductionAction, ProductionState } from "./productionState";
import { DURATION_OPTIONS, durationValue, formatDuration, parseDuration, SCENE_BY_ID, SCENES, type SceneId } from "./scenes";
import { SceneThumb } from "./Thumbs";

type BroadcastPlaylistProps = {
  production: ProductionState;
  dispatch: (action: ProductionAction) => void;
  clock: number | null;
  autoRunning: boolean;
};

export function BroadcastPlaylist({ production, dispatch, clock, autoRunning }: BroadcastPlaylistProps) {
  const [addScene, setAddScene] = useState<SceneId | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const sceneToAdd = addScene ?? production.selectedScene;
  const { playlist } = production;

  const onDrop = (event: DragEvent, to: number) => {
    event.preventDefault();
    if (dragIndex !== null) dispatch({ type: "playlistMove", from: dragIndex, to });
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <section className="panel bc-playlist" aria-label="Playlist">
      <header className="panel-head">
        <Icon name="play" size={16} />
        <h2>Playlist</h2>
        <div className="panel-actions">
          <select
            className="compact-select"
            aria-label="Scene to add"
            value={sceneToAdd}
            onChange={(event) => setAddScene(event.target.value as SceneId)}
          >
            {SCENES.map((scene) => (
              <option key={scene.id} value={scene.id}>
                {scene.title}
              </option>
            ))}
          </select>
          <button type="button" className="bc-btn" onClick={() => dispatch({ type: "playlistAdd", scene: sceneToAdd, clock })}>
            <Icon name="plus" size={14} /> Add
          </button>
        </div>
      </header>

      {playlist.length === 0 ? (
        <p className="empty-state">Playlist is empty. Add a scene to enable Take Next and auto-advance.</p>
      ) : (
        <ol className="bc-playlist-list">
          {playlist.map((item, index) => {
            const live = item.id === production.liveItemId;
            const title = item.label ?? SCENE_BY_ID[item.sceneId].title;
            return (
              <li
                key={item.id}
                className={`bc-playlist-row ${live ? "is-live" : ""} ${overIndex === index ? "is-drop-target" : ""} ${
                  dragIndex === index ? "is-dragging" : ""
                }`}
                draggable
                onDragStart={(event) => {
                  setDragIndex(index);
                  event.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setOverIndex(index);
                }}
                onDragLeave={() => setOverIndex((current) => (current === index ? null : current))}
                onDrop={(event) => onDrop(event, index)}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
              >
                <span className="bc-grip" aria-hidden="true">
                  <Icon name="grip" size={16} />
                </span>
                <SceneThumb scene={item.sceneId} profileId={production.overlays.player.profileId} />
                <button
                  type="button"
                  className="bc-playlist-title"
                  onClick={() => dispatch({ type: "take", scene: item.sceneId, itemId: item.id, clock })}
                  aria-label={`Take ${title} live`}
                >
                  <strong>{title}</strong>
                  <span>{live ? (production.output ? "On air" : "Program") : SCENE_BY_ID[item.sceneId].description}</span>
                </button>
                <select
                  className="compact-select"
                  aria-label={`${title} duration`}
                  value={durationValue(item.duration)}
                  onChange={(event) =>
                    dispatch({ type: "itemDuration", id: item.id, duration: parseDuration(event.target.value) })
                  }
                >
                  {DURATION_OPTIONS.map((duration) => (
                    <option key={durationValue(duration)} value={durationValue(duration)}>
                      {formatDuration(duration)}
                    </option>
                  ))}
                </select>
                <span className="bc-row-tools">
                  <button
                    type="button"
                    className="bc-icon-btn"
                    aria-label={`Move ${title} up`}
                    disabled={index === 0}
                    onClick={() => dispatch({ type: "playlistMove", from: index, to: index - 1 })}
                  >
                    <Icon name="chevronUp" size={14} />
                  </button>
                  <button
                    type="button"
                    className="bc-icon-btn"
                    aria-label={`Move ${title} down`}
                    disabled={index === playlist.length - 1}
                    onClick={() => dispatch({ type: "playlistMove", from: index, to: index + 1 })}
                  >
                    <Icon name="chevronDown" size={14} />
                  </button>
                  <button
                    type="button"
                    className="bc-icon-btn"
                    aria-label={`Remove ${title}`}
                    onClick={() => dispatch({ type: "playlistRemove", id: item.id, clock })}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </span>
                {live && item.duration !== null && (
                  <span
                    key={production.program.take}
                    className={`bc-progress ${autoRunning ? "is-running" : ""}`}
                    style={{ "--bc-dur": `${item.duration}s` } as CSSProperties}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      )}

      <div className="bc-log">
        <h3>Production log</h3>
        {production.log.length === 0 ? (
          <p className="muted">No production actions yet.</p>
        ) : (
          <ol>
            {production.log.slice(0, 5).map((entry) => (
              <li key={entry.id}>
                <time>{entry.clock === null ? "--:--" : formatClockSeconds(entry.clock)}</time>
                {entry.text}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
