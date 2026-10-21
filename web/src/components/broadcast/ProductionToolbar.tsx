import { Icon } from "../icons/Icon";
import { Switch } from "./controls";
import type { ProductionAction, ProductionState, Quality } from "./productionState";
import { DURATION_OPTIONS, durationValue, formatDuration, parseDuration } from "./scenes";

type ProductionToolbarProps = {
  production: ProductionState;
  dispatch: (action: ProductionAction) => void;
  clock: number | null;
  duration: number | null;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
};

const QUALITY: { value: Quality; label: string }[] = [
  { value: "high", label: "High · full motion" },
  { value: "balanced", label: "Balanced · no camera drift" },
  { value: "low", label: "Low power · static pitch" },
];

export function ProductionToolbar({ production, dispatch, clock, duration, fullscreen, onToggleFullscreen }: ProductionToolbarProps) {
  const { output } = production;
  return (
    <div className="bc-toolbar" role="toolbar" aria-label="Production controls">
      <button
        type="button"
        className={output ? "bc-output is-on" : "bc-output"}
        aria-pressed={output}
        onClick={() => dispatch({ type: "output", on: !output, clock })}
      >
        <Icon name={output ? "stop" : "play"} size={16} />
        {output ? "Stop Output" : "Start Output"}
      </button>
      <button
        type="button"
        className="bc-take-next"
        disabled={production.playlist.length === 0}
        onClick={() => dispatch({ type: "takeNext", clock })}
      >
        <Icon name="skip" size={16} />
        Take Next
      </button>
      <Switch
        label="Auto-advance"
        checked={production.autoAdvance}
        onChange={(on) => dispatch({ type: "autoAdvance", on })}
      />
      <label className="bc-toolbar-field">
        <span>Live item</span>
        <select
          className="compact-select"
          value={durationValue(duration)}
          onChange={(event) => dispatch({ type: "liveDuration", duration: parseDuration(event.target.value) })}
        >
          {DURATION_OPTIONS.map((option) => (
            <option key={durationValue(option)} value={durationValue(option)}>
              {formatDuration(option)}
            </option>
          ))}
        </select>
      </label>
      <p className="bc-sim-note">
        {output ? "Simulated output running" : "Output stopped"} — local preview only. No stream, RTMP or recording.
      </p>
      <label className="bc-toolbar-field">
        <span>Preview quality</span>
        <select
          className="compact-select"
          value={production.quality}
          onChange={(event) => dispatch({ type: "quality", quality: event.target.value as Quality })}
        >
          {QUALITY.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="bc-icon-btn large" aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen preview"} onClick={onToggleFullscreen}>
        <Icon name="fullscreen" size={17} />
      </button>
    </div>
  );
}
