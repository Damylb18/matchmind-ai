import { useId } from "react";
import type { TacticalGraphic } from "./graphics";

type TacticalOverlayProps = {
  graphic: TacticalGraphic;
  /** Thumbnails render the final frame without animation. */
  still?: boolean;
};

/**
 * Illustrative tactical annotations in horizontal pitch coordinates
 * (x 0–105 left→right, y 0–68). Home (red) attacks right. None of these
 * shapes come from tracking data.
 */
export function TacticalOverlay({ graphic, still = false }: TacticalOverlayProps) {
  const id = useId().replace(/:/g, "");
  const arrowHome = `bc-arrow-home-${id}`;
  const arrowAway = `bc-arrow-away-${id}`;
  const heat = `bc-heat-${id}`;

  const draw = (delay: number) => ({ className: "bc-draw", style: { animationDelay: `${delay}s` } });

  return (
    <g className={still ? "bc-tactical is-still" : "bc-tactical"}>
      <defs>
        <marker id={arrowHome} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0 0 10 5 0 10z" className="bc-head home" />
        </marker>
        <marker id={arrowAway} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0 0 10 5 0 10z" className="bc-head away" />
        </marker>
        <radialGradient id={heat}>
          <stop offset="0%" style={{ stopColor: "var(--home)", stopOpacity: 0.75 }} />
          <stop offset="60%" style={{ stopColor: "var(--home)", stopOpacity: 0.25 }} />
          <stop offset="100%" style={{ stopColor: "var(--home)", stopOpacity: 0 }} />
        </radialGradient>
      </defs>

      {graphic === "high-press" && (
        <>
          <path d="M70 12 Q98 6 101 34 Q98 62 70 56 Q64 34 70 12Z" className="bc-zone home bc-pulse" />
          <circle cx={94} cy={31} r={1.4} className="bc-dot away" />
          {[
            [78, 18],
            [80, 46],
            [72, 31],
            [88, 52],
          ].map(([x, y], index) => (
            <g key={index}>
              <circle cx={x} cy={y} r={1.4} className="bc-dot home" />
              <line
                x1={x}
                y1={y}
                x2={92 - index * 0.5}
                y2={31 + (y! - 31) * 0.2}
                pathLength={1}
                markerEnd={`url(#${arrowHome})`}
                {...draw(0.15 * index)}
              />
            </g>
          ))}
        </>
      )}

      {graphic === "build-up" && (
        <>
          <path
            d="M6 34 L20 22 L34 30 L50 20 L66 30"
            pathLength={1}
            markerEnd={`url(#${arrowHome})`}
            {...draw(0)}
          />
          <path d="M20 22 L22 48 L40 50" pathLength={1} className="bc-draw bc-alt" style={{ animationDelay: "0.4s" }} />
          {[
            [6, 34],
            [20, 22],
            [34, 30],
            [50, 20],
            [66, 30],
            [22, 48],
            [40, 50],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={1.4} className="bc-dot home" />
          ))}
        </>
      )}

      {graphic === "final-third" && (
        <>
          <rect x={70} y={0} width={35} height={68} className="bc-zone home bc-pulse" />
          <line x1={70} y1={13.84} x2={105} y2={13.84} className="bc-guide" />
          <line x1={70} y1={54.16} x2={105} y2={54.16} className="bc-guide" />
          <path d="M74 10 Q86 14 92 26" pathLength={1} markerEnd={`url(#${arrowHome})`} {...draw(0)} />
          <path d="M76 56 Q88 52 94 41" pathLength={1} markerEnd={`url(#${arrowHome})`} {...draw(0.25)} />
          <path d="M72 34 L90 34" pathLength={1} markerEnd={`url(#${arrowHome})`} {...draw(0.5)} />
        </>
      )}

      {graphic === "pressure-zones" && (
        <>
          <ellipse cx={80} cy={22} rx={14} ry={10} fill={`url(#${heat})`} className="bc-pulse" />
          <ellipse cx={86} cy={46} rx={12} ry={9} fill={`url(#${heat})`} className="bc-pulse" style={{ animationDelay: "0.6s" }} />
          <ellipse cx={62} cy={34} rx={10} ry={8} fill={`url(#${heat})`} className="bc-pulse" style={{ animationDelay: "1.2s" }} />
        </>
      )}

      {graphic === "attacking-direction" && (
        <>
          {[30, 50, 70].map((x, index) => (
            <path
              key={x}
              d={`M${x} 22 L${x + 10} 34 L${x} 46`}
              className="bc-chevron home"
              style={{ animationDelay: `${index * 0.25}s` }}
            />
          ))}
          <path d="M40 60 L22 60" pathLength={1} markerEnd={`url(#${arrowAway})`} className="bc-draw bc-away-line" />
        </>
      )}

      {graphic === "team-shape" && (
        <>
          {[
            "M18 8 L14 25 L14 43 L18 60",
            "M32 25 L32 43",
            "M50 9 L46 34 L50 59",
          ].map((d, index) => (
            <path key={d} d={d} pathLength={1} className="bc-draw bc-unit" style={{ animationDelay: `${index * 0.2}s` }} />
          ))}
          {[
            [5, 34],
            [18, 8],
            [14, 25],
            [14, 43],
            [18, 60],
            [32, 25],
            [32, 43],
            [50, 9],
            [46, 34],
            [50, 59],
            [64, 34],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={1.6} className="bc-dot home" />
          ))}
        </>
      )}
    </g>
  );
}
