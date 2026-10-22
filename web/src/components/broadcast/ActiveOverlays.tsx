import { TACTICAL_LABELS } from "./graphics";
import { profileById } from "./liveData";
import type { Overlays, ProductionAction } from "./productionState";
import type { SceneId } from "./scenes";

type Item = {
  id: string;
  label: string;
  /** Rendered in the scene on the monitor right now. */
  onScreen: boolean;
  off: ProductionAction;
};

const OVERLAY_SCENES: SceneId[] = ["main", "tactical"];

type ActiveOverlaysProps = {
  overlays: Overlays;
  scene: SceneId;
  /** An insight banner is currently due in this scene. */
  bannerDue: boolean;
  view: "program" | "preview";
  dispatch: (action: ProductionAction) => void;
};

/** Which overlays are switched on, and whether each is visible in the scene on the monitor. */
export function ActiveOverlays({ overlays: o, scene, bannerDue, view, dispatch }: ActiveOverlaysProps) {
  const inOverlayScene = OVERLAY_SCENES.includes(scene);
  const off = <K extends keyof Overlays>(section: K, patch: Partial<Overlays[K]>) =>
    ({ type: "overlay", section, patch }) as ProductionAction;

  const items: Item[] = [];
  if (o.scoreboard.visible) {
    items.push({ id: "scoreboard", label: "Scoreboard", onScreen: scene !== "transition", off: off("scoreboard", { visible: false }) });
  }
  if (o.insight.enabled) {
    items.push({
      id: "insight",
      label: o.insight.auto ? "Insight banner · auto" : "Insight banner",
      onScreen: bannerDue,
      off: off("insight", { enabled: false }),
    });
  }
  if (o.tactical.annotations) {
    items.push({
      id: "tactical",
      label: `${TACTICAL_LABELS[o.tactical.graphic]} · illustrative`,
      onScreen: scene === "main" || scene === "tactical",
      off: off("tactical", { annotations: false }),
    });
  }
  if (o.player.visible) {
    items.push({
      id: "player",
      label: `Lower third · ${profileById(o.player.profileId).name}`,
      onScreen: inOverlayScene,
      off: off("player", { visible: false }),
    });
  }
  if (o.stats.strip) items.push({ id: "strip", label: "Stats strip", onScreen: inOverlayScene, off: off("stats", { strip: false }) });
  if (o.stats.pressureMeter) {
    items.push({ id: "meter", label: "Pressure meter", onScreen: inOverlayScene, off: off("stats", { pressureMeter: false }) });
  }
  if (o.stats.passAccuracy) {
    items.push({ id: "accuracy", label: "Pass accuracy", onScreen: inOverlayScene, off: off("stats", { passAccuracy: false }) });
  }
  if (o.stats.ticker) {
    items.push({ id: "ticker", label: "Insight ticker", onScreen: scene !== "transition", off: off("stats", { ticker: false }) });
  }
  if (o.branding.logo) {
    items.push({ id: "logo", label: "Logo", onScreen: scene !== "transition", off: off("branding", { logo: false }) });
  }

  return (
    <div className="bc-active" aria-label={`Overlays enabled, ${view} view`}>
      <span className="bc-active-title">
        Overlays <b>{items.length}</b>
      </span>
      {items.length === 0 ? (
        <span className="muted">None enabled — clean feed.</span>
      ) : (
        <ul>
          {items.map((item) => (
            <li
              key={item.id}
              className={item.onScreen ? "is-on" : "is-standby"}
              title={item.onScreen ? "On screen in this scene" : "Enabled, but not shown in this scene"}
            >
              <span className="dot" aria-hidden="true" />
              {item.label}
              {!item.onScreen && <em>standby</em>}
              <button type="button" aria-label={`Turn off ${item.label}`} onClick={() => dispatch(item.off)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
