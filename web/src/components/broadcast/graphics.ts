export type TacticalGraphic =
  | "high-press"
  | "build-up"
  | "final-third"
  | "pressure-zones"
  | "attacking-direction"
  | "team-shape";

export type LowerThirdStyle = "classic" | "compact" | "stripe";
export type TransitionType = "crossfade" | "wipe" | "cut";

export type GraphicCategory = "tactical" | "player" | "stats" | "insights" | "lower-thirds" | "transitions";

export type GraphicId =
  | TacticalGraphic
  | "player-spotlight"
  | "name-strap"
  | "team-comparison"
  | "pressure-meter"
  | "pass-accuracy"
  | "insight-banner"
  | "insight-ticker"
  | "lt-classic"
  | "lt-compact"
  | "lt-stripe"
  | "tr-crossfade"
  | "tr-wipe"
  | "tr-cut";

/** Where a graphic's content comes from — shown on every card. */
export type GraphicSource = "live" | "illustrative" | "profile" | "control";

export type GraphicDef = {
  id: GraphicId;
  category: GraphicCategory;
  label: string;
  source: GraphicSource;
  description: string;
};

export const GRAPHIC_CATEGORIES: { id: GraphicCategory; label: string }[] = [
  { id: "tactical", label: "Tactical" },
  { id: "player", label: "Player" },
  { id: "stats", label: "Stats" },
  { id: "insights", label: "Insights" },
  { id: "lower-thirds", label: "Lower Thirds" },
  { id: "transitions", label: "Transitions" },
];

export const TACTICAL_LABELS: Record<TacticalGraphic, string> = {
  "high-press": "High Press",
  "build-up": "Build Up",
  "final-third": "Final Third",
  "pressure-zones": "Pressure Zones",
  "attacking-direction": "Attacking Direction",
  "team-shape": "Team Shape",
};

const tactical = (id: TacticalGraphic, description: string): GraphicDef => ({
  id,
  category: "tactical",
  label: TACTICAL_LABELS[id],
  source: "illustrative",
  description,
});

export const GRAPHICS: GraphicDef[] = [
  tactical("high-press", "Pressing block and press lines in the opponent half"),
  tactical("build-up", "Passing chain from the back"),
  tactical("final-third", "Final-third zone and entries into the box"),
  tactical("pressure-zones", "Pressure heat zones; live pressure readout alongside"),
  tactical("attacking-direction", "Direction of play"),
  tactical("team-shape", "4-2-3-1 template with unit lines"),
  {
    id: "player-spotlight",
    category: "player",
    label: "Player Spotlight",
    source: "profile",
    description: "Lower third with licensed portrait",
  },
  {
    id: "name-strap",
    category: "player",
    label: "Name Strap",
    source: "profile",
    description: "Name and role, no portrait",
  },
  {
    id: "team-comparison",
    category: "stats",
    label: "Team Comparison",
    source: "live",
    description: "Session stats strip",
  },
  {
    id: "pressure-meter",
    category: "stats",
    label: "Pressure Meter",
    source: "live",
    description: "Rolling pressure per team vs insight threshold",
  },
  {
    id: "pass-accuracy",
    category: "stats",
    label: "Pass Accuracy",
    source: "live",
    description: "Backend match-wide total",
  },
  {
    id: "insight-banner",
    category: "insights",
    label: "AI Insight Banner",
    source: "live",
    description: "Show the latest backend insight now",
  },
  {
    id: "insight-ticker",
    category: "insights",
    label: "Insight Ticker",
    source: "live",
    description: "Scrolling recent insight headlines",
  },
  { id: "lt-classic", category: "lower-thirds", label: "Classic", source: "profile", description: "Portrait and details" },
  { id: "lt-compact", category: "lower-thirds", label: "Compact", source: "profile", description: "Slim name bar" },
  { id: "lt-stripe", category: "lower-thirds", label: "Club Stripe", source: "profile", description: "Club-colour edge" },
  { id: "tr-crossfade", category: "transitions", label: "Crossfade", source: "control", description: "Dissolve on take" },
  { id: "tr-wipe", category: "transitions", label: "Wipe", source: "control", description: "Left-to-right wipe" },
  { id: "tr-cut", category: "transitions", label: "Cut", source: "control", description: "Instant switch" },
];

export const SOURCE_LABELS: Record<GraphicSource, string> = {
  live: "Live data",
  illustrative: "Illustrative",
  profile: "Showcase profile",
  control: "Transition",
};
