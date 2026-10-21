import { PLAYER_PROFILES } from "../../data/players";
import type { GraphicId, LowerThirdStyle, TacticalGraphic, TransitionType } from "./graphics";
import { SCENE_BY_ID, SCENES, type SceneId } from "./scenes";

export type ScoreboardStyle = "standard" | "minimal" | "wide";
export type BoardPosition = "tl" | "tc" | "tr" | "bl" | "bc" | "br";
export type BannerPosition = "lower-left" | "lower-center" | "upper-right";
export type Corner = "tl" | "tr" | "bl" | "br";
export type ThemeId = "emerald" | "steel" | "gold";
export type Quality = "high" | "balanced" | "low";

export type Overlays = {
  scoreboard: {
    visible: boolean;
    style: ScoreboardStyle;
    clock: boolean;
    live: boolean;
    identifiers: boolean;
    position: BoardPosition;
    scale: number;
  };
  insight: {
    enabled: boolean;
    auto: boolean;
    /** Seconds of match clock; null = hold until hidden. */
    duration: number | null;
    position: BannerPosition;
    /** null = always the latest insight. */
    selectedKey: string | null;
  };
  player: { visible: boolean; profileId: string; portrait: boolean; details: boolean; style: LowerThirdStyle };
  tactical: { annotations: boolean; graphic: TacticalGraphic; intensity: number };
  branding: { logo: boolean; position: Corner; theme: ThemeId; safeArea: boolean };
  stats: { strip: boolean; pressureMeter: boolean; passAccuracy: boolean; ticker: boolean };
};

export type PlaylistItem = { id: string; sceneId: SceneId; duration: number | null; label?: string };

export type LogEntry = { id: number; clock: number | null; text: string };

export type ProgramTake = { scene: SceneId; take: number };

export type ProductionState = {
  overlays: Overlays;
  sceneDurations: Record<SceneId, number | null>;
  selectedScene: SceneId;
  program: ProgramTake;
  /** Kept briefly so the renderer can transition out of it. */
  previousProgram: ProgramTake | null;
  preview: SceneId;
  monitor: "program" | "preview";
  /** Local simulated output state. Nothing is streamed or recorded. */
  output: boolean;
  autoAdvance: boolean;
  playlist: PlaylistItem[];
  liveItemId: string | null;
  transition: TransitionType;
  quality: Quality;
  /** Insight shown on demand, until the given match clock (seconds). */
  banner: { key: string; untilClock: number } | null;
  /** Latest auto insight the operator hid; not re-shown automatically. */
  dismissedKey: string | null;
  log: LogEntry[];
  nextId: number;
};

const LOG_SIZE = 40;

export const initialProduction: ProductionState = {
  overlays: {
    scoreboard: {
      visible: true,
      style: "standard",
      clock: true,
      live: true,
      identifiers: true,
      position: "tl",
      scale: 100,
    },
    insight: { enabled: true, auto: true, duration: 10, position: "lower-left", selectedKey: null },
    player: {
      visible: false,
      profileId: PLAYER_PROFILES[0]!.id,
      portrait: true,
      details: true,
      style: "classic",
    },
    tactical: { annotations: true, graphic: "high-press", intensity: 60 },
    branding: { logo: true, position: "tr", theme: "emerald", safeArea: false },
    stats: { strip: false, pressureMeter: false, passAccuracy: false, ticker: false },
  },
  sceneDurations: Object.fromEntries(SCENES.map((scene) => [scene.id, scene.defaultDuration])) as Record<
    SceneId,
    number | null
  >,
  selectedScene: "main",
  program: { scene: "main", take: 0 },
  previousProgram: null,
  preview: "tactical",
  monitor: "program",
  output: false,
  autoAdvance: true,
  playlist: [
    { id: "p1", sceneId: "transition", duration: 5, label: "Opening Stinger" },
    { id: "p2", sceneId: "main", duration: null },
    { id: "p3", sceneId: "tactical", duration: 10 },
    { id: "p4", sceneId: "player", duration: 8 },
    { id: "p5", sceneId: "stats", duration: 8 },
    { id: "p6", sceneId: "transition", duration: 5, label: "Closing Stinger" },
  ],
  liveItemId: "p2",
  transition: "crossfade",
  quality: "high",
  banner: null,
  dismissedKey: null,
  log: [],
  nextId: 7,
};

type OverlayAction = {
  [K in keyof Overlays]: { type: "overlay"; section: K; patch: Partial<Overlays[K]> };
}[keyof Overlays];

export type ProductionAction =
  | OverlayAction
  | { type: "selectScene"; scene: SceneId }
  | { type: "previewScene"; scene: SceneId }
  | { type: "take"; scene: SceneId; itemId?: string; clock: number | null }
  | { type: "takePreview"; clock: number | null }
  | { type: "takeNext"; clock: number | null }
  | { type: "monitor"; view: "program" | "preview" }
  | { type: "output"; on: boolean; clock: number | null }
  | { type: "autoAdvance"; on: boolean }
  | { type: "sceneDuration"; scene: SceneId; duration: number | null }
  | { type: "playlistAdd"; scene: SceneId; clock: number | null }
  | { type: "playlistRemove"; id: string; clock: number | null }
  | { type: "playlistMove"; from: number; to: number }
  | { type: "itemDuration"; id: string; duration: number | null }
  | { type: "liveDuration"; duration: number | null }
  | { type: "transition"; transition: TransitionType }
  | { type: "quality"; quality: Quality }
  | { type: "showBanner"; key: string; clock: number }
  | { type: "hideBanner"; latestKey: string | null }
  | { type: "graphic"; id: GraphicId; latestInsightKey: string | null; clock: number | null };

const log = (state: ProductionState, clock: number | null, text: string): ProductionState => ({
  ...state,
  log: [{ id: state.nextId, clock, text }, ...state.log].slice(0, LOG_SIZE),
  nextId: state.nextId + 1,
});

function take(state: ProductionState, scene: SceneId, itemId: string | null, clock: number | null) {
  const item = state.playlist.find((entry) => entry.id === itemId);
  return log(
    {
      ...state,
      previousProgram: state.program,
      program: { scene, take: state.program.take + 1 },
      liveItemId: itemId,
      monitor: "program" as const,
    },
    clock,
    `Took live: ${item?.label ?? SCENE_BY_ID[scene].title}`,
  );
}

function bannerUntil(state: ProductionState, clock: number) {
  const duration = state.overlays.insight.duration;
  return duration === null ? Number.POSITIVE_INFINITY : clock + duration;
}

export function productionReducer(state: ProductionState, action: ProductionAction): ProductionState {
  switch (action.type) {
    case "overlay": {
      const section = action.section;
      return {
        ...state,
        overlays: { ...state.overlays, [section]: { ...state.overlays[section], ...action.patch } },
      };
    }
    case "selectScene":
      return { ...state, selectedScene: action.scene };
    case "previewScene":
      return { ...state, preview: action.scene, selectedScene: action.scene, monitor: "preview" };
    case "take":
      return take(state, action.scene, action.itemId ?? null, action.clock);
    case "takePreview":
      return take(state, state.preview, null, action.clock);
    case "takeNext": {
      if (state.playlist.length === 0) return state;
      const index = state.playlist.findIndex((item) => item.id === state.liveItemId);
      const next = state.playlist[(index + 1) % state.playlist.length]!;
      return take(state, next.sceneId, next.id, action.clock);
    }
    case "monitor":
      return { ...state, monitor: action.view };
    case "output":
      return log(
        { ...state, output: action.on },
        action.clock,
        action.on ? "Output started (local simulation)" : "Output stopped",
      );
    case "autoAdvance":
      return { ...state, autoAdvance: action.on };
    case "sceneDuration":
      return { ...state, sceneDurations: { ...state.sceneDurations, [action.scene]: action.duration } };
    case "playlistAdd": {
      const id = `p${state.nextId}`;
      return log(
        {
          ...state,
          playlist: [
            ...state.playlist,
            { id, sceneId: action.scene, duration: state.sceneDurations[action.scene] },
          ],
          nextId: state.nextId + 1,
        },
        action.clock,
        `Added to playlist: ${SCENE_BY_ID[action.scene].title}`,
      );
    }
    case "playlistRemove": {
      const item = state.playlist.find((entry) => entry.id === action.id);
      if (!item) return state;
      return log(
        {
          ...state,
          playlist: state.playlist.filter((entry) => entry.id !== action.id),
          liveItemId: state.liveItemId === action.id ? null : state.liveItemId,
        },
        action.clock,
        `Removed from playlist: ${item.label ?? SCENE_BY_ID[item.sceneId].title}`,
      );
    }
    case "playlistMove": {
      const { from, to } = action;
      if (from === to || from < 0 || to < 0 || from >= state.playlist.length || to >= state.playlist.length) {
        return state;
      }
      const playlist = [...state.playlist];
      const [moved] = playlist.splice(from, 1);
      playlist.splice(to, 0, moved!);
      return { ...state, playlist };
    }
    case "itemDuration":
      return {
        ...state,
        playlist: state.playlist.map((item) => (item.id === action.id ? { ...item, duration: action.duration } : item)),
      };
    case "liveDuration":
      // Applies to the live playlist item, or to the scene default when the take came from the library.
      return state.liveItemId && state.playlist.some((item) => item.id === state.liveItemId)
        ? productionReducer(state, { type: "itemDuration", id: state.liveItemId, duration: action.duration })
        : productionReducer(state, { type: "sceneDuration", scene: state.program.scene, duration: action.duration });
    case "transition":
      return { ...state, transition: action.transition };
    case "quality":
      return { ...state, quality: action.quality };
    case "showBanner":
      return {
        ...state,
        banner: { key: action.key, untilClock: bannerUntil(state, action.clock) },
        dismissedKey: null,
      };
    case "hideBanner":
      return { ...state, banner: null, dismissedKey: action.latestKey };
    case "graphic":
      return applyGraphic(state, action.id, action.latestInsightKey, action.clock);
  }
}

function applyGraphic(
  state: ProductionState,
  id: GraphicId,
  latestInsightKey: string | null,
  clock: number | null,
): ProductionState {
  const o = state.overlays;
  const set = <K extends keyof Overlays>(section: K, patch: Partial<Overlays[K]>) =>
    productionReducer(state, { type: "overlay", section, patch } as ProductionAction);

  switch (id) {
    case "high-press":
    case "build-up":
    case "final-third":
    case "pressure-zones":
    case "attacking-direction":
    case "team-shape": {
      const active = o.tactical.annotations && o.tactical.graphic === id;
      return set("tactical", { graphic: id, annotations: !active });
    }
    case "player-spotlight": {
      const active = o.player.visible && o.player.portrait && o.player.style === "classic";
      return set("player", active ? { visible: false } : { visible: true, portrait: true, style: "classic" });
    }
    case "name-strap": {
      const active = o.player.visible && o.player.style === "compact";
      return set("player", active ? { visible: false } : { visible: true, portrait: false, style: "compact" });
    }
    case "lt-classic":
    case "lt-compact":
    case "lt-stripe": {
      const style = id === "lt-classic" ? "classic" : id === "lt-compact" ? "compact" : "stripe";
      const active = o.player.visible && o.player.style === style;
      return set("player", active ? { visible: false } : { visible: true, style });
    }
    case "team-comparison":
      return set("stats", { strip: !o.stats.strip });
    case "pressure-meter":
      return set("stats", { pressureMeter: !o.stats.pressureMeter });
    case "pass-accuracy":
      return set("stats", { passAccuracy: !o.stats.passAccuracy });
    case "insight-ticker":
      return set("stats", { ticker: !o.stats.ticker });
    case "insight-banner": {
      if (!latestInsightKey || clock === null) return state;
      const shown = productionReducer(state, { type: "showBanner", key: latestInsightKey, clock });
      return { ...shown, overlays: { ...shown.overlays, insight: { ...shown.overlays.insight, enabled: true } } };
    }
    case "tr-crossfade":
      return { ...state, transition: "crossfade" };
    case "tr-wipe":
      return { ...state, transition: "wipe" };
    case "tr-cut":
      return { ...state, transition: "cut" };
  }
}

/** Whether a graphic's effect is currently applied. */
export function isGraphicActive(state: ProductionState, id: GraphicId, bannerVisible: boolean): boolean {
  const o = state.overlays;
  switch (id) {
    case "high-press":
    case "build-up":
    case "final-third":
    case "pressure-zones":
    case "attacking-direction":
    case "team-shape":
      return o.tactical.annotations && o.tactical.graphic === id;
    case "player-spotlight":
      return o.player.visible && o.player.portrait && o.player.style === "classic";
    case "name-strap":
      return o.player.visible && o.player.style === "compact";
    case "lt-classic":
      return o.player.visible && o.player.style === "classic";
    case "lt-compact":
      return o.player.visible && o.player.style === "compact";
    case "lt-stripe":
      return o.player.visible && o.player.style === "stripe";
    case "team-comparison":
      return o.stats.strip;
    case "pressure-meter":
      return o.stats.pressureMeter;
    case "pass-accuracy":
      return o.stats.passAccuracy;
    case "insight-ticker":
      return o.stats.ticker;
    case "insight-banner":
      return bannerVisible;
    case "tr-crossfade":
      return state.transition === "crossfade";
    case "tr-wipe":
      return state.transition === "wipe";
    case "tr-cut":
      return state.transition === "cut";
  }
}

/** Duration of what is on program now: the live playlist item, else the scene default. */
export function liveDuration(state: ProductionState): number | null {
  const item = state.playlist.find((entry) => entry.id === state.liveItemId);
  return item ? item.duration : state.sceneDurations[state.program.scene];
}
