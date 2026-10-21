import type { RoleZone } from "../../data/players";

type Zone = { cx: number; cy: number; rx: number; ry: number };

// Pitch is 105 × 68, attacking left → right.
const ZONES: Record<RoleZone, Zone[]> = {
  "defensive-mid": [{ cx: 40, cy: 34, rx: 12, ry: 14 }],
  "central-mid": [{ cx: 53, cy: 34, rx: 14, ry: 15 }],
  "attacking-mid": [{ cx: 71, cy: 34, rx: 13, ry: 13 }],
  forward: [{ cx: 88, cy: 34, rx: 11, ry: 13 }],
  winger: [
    { cx: 80, cy: 9, rx: 17, ry: 7 },
    { cx: 80, cy: 59, rx: 17, ry: 7 },
  ],
};

type PitchRoleProps = { zone: RoleZone; color: string; label: string };

/** Typical zone for a listed position. Illustrative only — not tracking or heat-map data. */
export function PitchRole({ zone, color, label }: PitchRoleProps) {
  return (
    <figure className="pitch-role">
      <svg viewBox="-2 -2 109 72" role="img" aria-label={`Typical zone for a ${label.toLowerCase()}`}>
        <rect x="0" y="0" width="105" height="68" className="pitch-turf" />
        <g className="pitch-lines">
          <rect x="0" y="0" width="105" height="68" />
          <line x1="52.5" y1="0" x2="52.5" y2="68" />
          <circle cx="52.5" cy="34" r="9.15" />
          <rect x="0" y="13.84" width="16.5" height="40.32" />
          <rect x="88.5" y="13.84" width="16.5" height="40.32" />
          <rect x="0" y="24.84" width="5.5" height="18.32" />
          <rect x="99.5" y="24.84" width="5.5" height="18.32" />
        </g>
        {ZONES[zone].map((item) => (
          <ellipse
            key={`${item.cx}-${item.cy}`}
            {...item}
            fill={color}
            fillOpacity={0.32}
            stroke={color}
            strokeWidth={0.8}
          />
        ))}
        <path d="M44 72.5h17m-3-1.6 3 1.6-3 1.6" className="pitch-direction" />
      </svg>
      <figcaption>Typical zone · {label}</figcaption>
    </figure>
  );
}
