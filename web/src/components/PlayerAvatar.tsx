import { useState } from "react";
import type { PlayerProfile } from "../data/players";
import { TEAMS } from "../data/teams";

type PlayerAvatarProps = { profile: PlayerProfile; size?: number };

export function PlayerAvatar({ profile, size = 72 }: PlayerAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const team = TEAMS[profile.teamId];
  const photo = profile.photo;
  const initials = profile.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <div
      className="player-avatar"
      style={{ width: size, height: size, borderColor: team.colors.primary }}
    >
      {photo && failedSrc !== photo.src ? (
        <img
          src={photo.src}
          alt={`${profile.name}`}
          style={{ objectPosition: photo.focus }}
          loading="lazy"
          onError={() => setFailedSrc(photo.src)}
        />
      ) : (
        <span aria-label={profile.name} role="img">
          {initials}
        </span>
      )}
    </div>
  );
}
