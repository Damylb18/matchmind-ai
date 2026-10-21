import { useState } from "react";
import type { TeamInfo } from "../data/teams";

type TeamCrestProps = { team: TeamInfo; size?: number };

/**
 * Renders a licensed crest when one is configured in data/teams.ts, otherwise a
 * neutral monogram shield in club colours (deliberately not the official crest).
 */
export function TeamCrest({ team, size = 32 }: TeamCrestProps) {
  const [failed, setFailed] = useState(false);

  if (team.crest && !failed) {
    return (
      <img
        className="team-crest"
        src={team.crest.src}
        alt={`${team.name} crest`}
        width={size}
        height={size}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <svg
      className="team-crest"
      width={size}
      height={size * 1.1}
      viewBox="0 0 40 44"
      role="img"
      aria-label={team.name}
    >
      <path
        d="M20 1.5 37 6.5v14.2c0 10.4-7.2 18.5-17 21.8C10.2 39.2 3 31.1 3 20.7V6.5L20 1.5Z"
        fill={team.colors.primary}
      />
      <path
        d="M20 4.6 34.2 8.8v11.9c0 8.8-6 15.7-14.2 18.7-8.2-3-14.2-9.9-14.2-18.7V8.8L20 4.6Z"
        fill="none"
        stroke={team.colors.secondary}
        strokeOpacity={0.85}
        strokeWidth={1.2}
      />
      <text
        x="20"
        y="25.5"
        textAnchor="middle"
        fill="#fff"
        fontSize="10.5"
        fontWeight="800"
        letterSpacing="0.4"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {team.code}
      </text>
    </svg>
  );
}
