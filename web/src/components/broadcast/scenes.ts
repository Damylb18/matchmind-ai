export type SceneId = "main" | "tactical" | "player" | "stats" | "insight" | "transition";

export type SceneDef = {
  id: SceneId;
  title: string;
  description: string;
  /** null = hold until the operator takes the next item. */
  defaultDuration: number | null;
};

export const SCENES: SceneDef[] = [
  {
    id: "main",
    title: "Main Match Feed",
    description: "Synthetic pitch with scoreboard and active overlays",
    defaultDuration: null,
  },
  {
    id: "tactical",
    title: "Tactical Insight",
    description: "Illustrative tactical graphic with the latest backend insight",
    defaultDuration: 10,
  },
  {
    id: "player",
    title: "Player Focus",
    description: "Showcase profile with licensed portrait",
    defaultDuration: 8,
  },
  {
    id: "stats",
    title: "Stats Comparison",
    description: "Team comparison from this live session",
    defaultDuration: 8,
  },
  {
    id: "insight",
    title: "Full Screen Insight",
    description: "Backend insight with its evidence",
    defaultDuration: 12,
  },
  {
    id: "transition",
    title: "Branded Transition",
    description: "MatchMind sting",
    defaultDuration: 5,
  },
];

export const SCENE_BY_ID = Object.fromEntries(SCENES.map((scene) => [scene.id, scene])) as Record<
  SceneId,
  SceneDef
>;

export const DURATION_OPTIONS: (number | null)[] = [5, 8, 10, 12, 15, 20, 30, null];

export const formatDuration = (duration: number | null) => (duration === null ? "Hold" : `${duration}s`);

/** Encodes a duration for <select> values. */
export const durationValue = (duration: number | null) => (duration === null ? "hold" : String(duration));
export const parseDuration = (value: string) => (value === "hold" ? null : Number(value));
