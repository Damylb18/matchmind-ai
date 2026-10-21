import type { ReactNode } from "react";
import "./pitch.css";

/** Pitch dimensions in metres (IFAB recommended 105 × 68). */
export const PITCH_LENGTH = 105;
export const PITCH_WIDTH = 68;

type PitchProps = {
  /** horizontal: length runs left→right. vertical: length runs bottom→top. */
  orientation?: "horizontal" | "vertical";
  /** Overlay content, in the coordinate space of the chosen orientation. */
  children?: ReactNode;
  className?: string;
  label: string;
  stripes?: boolean;
};

const STRIPE_COUNT = 12;

/**
 * Regulation pitch markings as SVG.
 * Horizontal space: x ∈ [0, 105] along the pitch, y ∈ [0, 68] across.
 * Vertical space:   x ∈ [0, 68] across, y ∈ [0, 105] with y = 105 at the bottom goal.
 */
export function Pitch({ orientation = "horizontal", children, className, label, stripes = true }: PitchProps) {
  const vertical = orientation === "vertical";
  const viewBox = vertical ? "-2.5 -4 73 113" : "-4 -2.5 113 73";

  return (
    <svg
      className={`pitch ${className ?? ""}`}
      viewBox={viewBox}
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
    >
      <g transform={vertical ? `matrix(0 -1 1 0 0 ${PITCH_LENGTH})` : undefined}>
        <rect x={0} y={0} width={PITCH_LENGTH} height={PITCH_WIDTH} className="pitch-grass" />
        {stripes &&
          Array.from({ length: STRIPE_COUNT / 2 }, (_, index) => (
            <rect
              key={index}
              x={(index * 2 * PITCH_LENGTH) / STRIPE_COUNT}
              y={0}
              width={PITCH_LENGTH / STRIPE_COUNT}
              height={PITCH_WIDTH}
              className="pitch-stripe"
            />
          ))}
        <g className="pitch-markings">
          <rect x={0} y={0} width={PITCH_LENGTH} height={PITCH_WIDTH} />
          <line x1={52.5} y1={0} x2={52.5} y2={68} />
          <circle cx={52.5} cy={34} r={9.15} />
          <circle cx={52.5} cy={34} r={0.45} className="pitch-spot" />
          {/* Penalty and goal areas */}
          <rect x={0} y={13.84} width={16.5} height={40.32} />
          <rect x={88.5} y={13.84} width={16.5} height={40.32} />
          <rect x={0} y={24.84} width={5.5} height={18.32} />
          <rect x={99.5} y={24.84} width={5.5} height={18.32} />
          <circle cx={11} cy={34} r={0.45} className="pitch-spot" />
          <circle cx={94} cy={34} r={0.45} className="pitch-spot" />
          <path d="M16.5 26.69A9.15 9.15 0 0 1 16.5 41.31" />
          <path d="M88.5 26.69A9.15 9.15 0 0 0 88.5 41.31" />
          {/* Corner arcs */}
          <path d="M0 1A1 1 0 0 0 1 0M104 0A1 1 0 0 0 105 1M105 67A1 1 0 0 0 104 68M1 68A1 1 0 0 0 0 67" />
          {/* Goals */}
          <rect x={-2} y={30.34} width={2} height={7.32} className="pitch-goal" />
          <rect x={105} y={30.34} width={2} height={7.32} className="pitch-goal" />
        </g>
      </g>
      {children}
    </svg>
  );
}
