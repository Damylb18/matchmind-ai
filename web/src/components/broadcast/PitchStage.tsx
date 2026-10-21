import { memo } from "react";
import { FORMATIONS } from "../../data/formations";
import { Pitch, PITCH_LENGTH, PITCH_WIDTH } from "../pitch/Pitch";
import type { TacticalGraphic } from "./graphics";
import type { Quality } from "./productionState";
import { TacticalOverlay } from "./TacticalOverlay";

type Marker = { id: string; x: number; y: number; side: "home" | "away"; delay: number; duration: number };

// Template positions compressed into a mid-game block. Simulated, not tracking data.
const MARKERS: Marker[] = [
  ...(FORMATIONS["4-2-3-1"] ?? []).map((slot, index) => ({
    id: `h-${slot.role}`,
    x: (PITCH_LENGTH - slot.y) * 0.8 + 3,
    y: slot.x,
    side: "home" as const,
    delay: -index * 0.7,
    duration: 5 + (index % 4),
  })),
  ...(FORMATIONS["4-3-3"] ?? []).map((slot, index) => ({
    id: `a-${slot.role}`,
    x: PITCH_LENGTH - ((PITCH_LENGTH - slot.y) * 0.8 + 3),
    y: PITCH_WIDTH - slot.x,
    side: "away" as const,
    delay: -index * 0.9,
    duration: 6 + (index % 3),
  })),
];

type PitchStageProps = {
  annotations: boolean;
  graphic: TacticalGraphic;
  intensity: number;
  quality: Quality;
  treatment: "live" | "dim" | "blur";
};

/**
 * Synthetic camera view of the pitch: a perspective-tilted SVG with simulated
 * player markers drifting around template positions. Memoised so the once-a-second
 * match updates do not re-render it.
 */
export const PitchStage = memo(function PitchStage({
  annotations,
  graphic,
  intensity,
  quality,
  treatment,
}: PitchStageProps) {
  return (
    <div className={`bc-pitch-stage quality-${quality} treat-${treatment}`} aria-hidden="true">
      <div className="bc-stands" />
      <div className="bc-camera">
        <div className="bc-plane">
          <Pitch label="Synthetic pitch">
            <g className="bc-players">
              {MARKERS.map((marker) => (
                <g
                  key={marker.id}
                  className={`bc-player ${marker.side}`}
                  style={{ animationDelay: `${marker.delay}s`, animationDuration: `${marker.duration}s` }}
                >
                  <ellipse cx={marker.x} cy={marker.y + 1.1} rx={1.5} ry={0.6} className="bc-shadow" />
                  <circle cx={marker.x} cy={marker.y} r={1.25} />
                </g>
              ))}
              <circle cx={58} cy={30} r={0.65} className="bc-ball" />
            </g>
            {annotations && (
              <g style={{ ["--bc-int" as string]: intensity / 100 }}>
                <TacticalOverlay key={graphic} graphic={graphic} />
              </g>
            )}
          </Pitch>
        </div>
      </div>
      <div className="bc-vignette" />
    </div>
  );
});
