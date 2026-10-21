import { useState } from "react";
import type { PlayerProfile } from "../../data/players";
import { TEAMS } from "../../data/teams";
import { TeamCrest } from "../TeamCrest";
import { profileById } from "./liveData";
import type { Overlays } from "./productionState";

/** Licensed portrait with an initials fallback. */
export function Portrait({ profile, className }: { profile: PlayerProfile; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const photo = profile.photo;
  const initials = profile.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <span className={`bc-portrait ${className ?? ""}`}>
      {photo && failedSrc !== photo.src ? (
        <img src={photo.src} alt={profile.name} style={{ objectPosition: photo.focus }} onError={() => setFailedSrc(photo.src)} />
      ) : (
        <span className="bc-initials">{initials}</span>
      )}
    </span>
  );
}

export function PhotoCredit({ profile }: { profile: PlayerProfile }) {
  if (!profile.photo) return null;
  return (
    <span className="bc-credit">
      Photo: {profile.photo.author}, {profile.photo.license}, Wikimedia Commons
    </span>
  );
}

type PlayerLowerThirdProps = { settings: Overlays["player"]; visible: boolean };

/** Showcase profile only. Live feed statistics are never attached to a named player. */
export function PlayerLowerThird({ settings, visible }: PlayerLowerThirdProps) {
  const profile = profileById(settings.profileId);
  const team = TEAMS[profile.teamId];
  const portrait = settings.portrait && settings.style !== "compact";

  return (
    <div
      className={`bc-overlay bc-lower-third style-${settings.style}`}
      data-visible={visible}
      style={{ ["--bc-team" as string]: team.colors.data }}
    >
      {portrait && <Portrait profile={profile} />}
      <div className="bc-lt-body">
        <strong>{profile.name}</strong>
        {settings.details && (
          <span className="bc-lt-details">
            <TeamCrest team={team} size={14} />
            {profile.position} · {team.name}
          </span>
        )}
        {portrait && <PhotoCredit profile={profile} />}
      </div>
    </div>
  );
}
