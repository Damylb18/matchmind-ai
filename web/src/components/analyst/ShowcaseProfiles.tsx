import { useState } from "react";
import { PLAYER_PROFILES, type PlayerProfile } from "../../data/players";
import { TEAMS } from "../../data/teams";
import { PitchRole } from "../fan/PitchRole";
import { Panel } from "../Panel";
import { PlayerAvatar } from "../PlayerAvatar";
import { TeamCrest } from "../TeamCrest";

/** Real player profiles for presentation. Deliberately carries no feed statistics. */
export function ShowcaseProfiles() {
  const [idA, setIdA] = useState("bruno-fernandes");
  const [idB, setIdB] = useState("martin-odegaard");

  return (
    <Panel
      title="Showcase Profiles"
      provenance="demo"
      info="Real players from Wikidata with CC BY-SA photos from Wikimedia Commons. Not linked to the feed: no live statistic is attributed to these players until a verified player-ID mapping exists."
      className="showcase-panel"
    >
      <div className="showcase-pair">
        <ProfileCard id={idA} onChange={setIdA} />
        <span className="vs">vs</span>
        <ProfileCard id={idB} onChange={setIdB} />
      </div>
    </Panel>
  );
}

function ProfileCard({ id, onChange }: { id: string; onChange: (id: string) => void }) {
  const profile: PlayerProfile = PLAYER_PROFILES.find((item) => item.id === id) ?? PLAYER_PROFILES[0]!;
  const team = TEAMS[profile.teamId];

  return (
    <div className="showcase-card">
      <select
        className="compact-select"
        aria-label="Choose showcase profile"
        value={profile.id}
        onChange={(event) => onChange(event.target.value)}
      >
        {Object.values(TEAMS).map((club) => (
          <optgroup key={club.id} label={club.name}>
            {PLAYER_PROFILES.filter((item) => item.teamId === club.id).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <div className="showcase-body">
        <PlayerAvatar profile={profile} size={64} />
        <div className="profile-text">
          <strong>{profile.name}</strong>
          <span>{profile.position}</span>
          <span className="profile-club">
            <TeamCrest team={team} size={14} /> {team.name}
          </span>
        </div>
      </div>
      <PitchRole zone={profile.roleZone} color={team.colors.data} label={profile.position} />
      {profile.photo && (
        <p className="photo-credit">
          Photo:{" "}
          <a href={profile.photo.sourceUrl} target="_blank" rel="noreferrer">
            {profile.photo.author}
          </a>
          ,{" "}
          <a href={profile.photo.licenseUrl} target="_blank" rel="noreferrer">
            {profile.photo.license}
          </a>
          , Wikimedia Commons
        </p>
      )}
    </div>
  );
}
