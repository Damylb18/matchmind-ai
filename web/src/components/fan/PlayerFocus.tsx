import { useState } from "react";
import { PLAYER_PROFILES } from "../../data/players";
import { TEAMS, teamByApiName } from "../../data/teams";
import { percent } from "../../lib/format";
import type { PlayerStats } from "../../lib/matchState";
import { Icon } from "../icons/Icon";
import { InfoTip, Panel, ProvenanceTag } from "../Panel";
import { PlayerAvatar } from "../PlayerAvatar";
import { TeamCrest } from "../TeamCrest";
import { PitchRole } from "./PitchRole";

type PlayerFocusProps = {
  players: Record<string, PlayerStats>;
  onOpenTable?: () => void;
};

export function PlayerFocus({ players, onOpenTable }: PlayerFocusProps) {
  const [profileId, setProfileId] = useState(PLAYER_PROFILES[0]!.id);
  const [feedKey, setFeedKey] = useState<string | null>(null);

  const profile = PLAYER_PROFILES.find((item) => item.id === profileId) ?? PLAYER_PROFILES[0]!;
  const team = TEAMS[profile.teamId];

  const feedPlayers = Object.values(players).sort(
    (a, b) =>
      a.team.localeCompare(b.team) || a.player.localeCompare(b.player, undefined, { numeric: true }),
  );
  const selected = (feedKey && players[feedKey]) || feedPlayers[0];
  const selectedTeam = selected ? teamByApiName(selected.team) : undefined;

  return (
    <Panel
      title="Player Focus"
      className="player-panel"
      actions={
        <select
          className="compact-select"
          aria-label="Choose player profile"
          value={profile.id}
          onChange={(event) => setProfileId(event.target.value)}
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
      }
    >
      <div className="focus-section-head">
        <ProvenanceTag kind="demo" />
        <span className="feed-player-title">Showcase profile</span>
        <InfoTip text="Real player profile from Wikidata with a CC BY-SA photo from Wikimedia Commons. Shown for presentation only: no live statistic is attributed to this player." />
      </div>
      <div className="profile">
        <PlayerAvatar profile={profile} size={68} />
        <div className="profile-text">
          <strong>{profile.name}</strong>
          <span>{profile.position}</span>
          <span className="profile-club">
            <TeamCrest team={team} size={14} /> {team.name}
          </span>
        </div>
        <PitchRole zone={profile.roleZone} color={team.colors.data} label={profile.position} />
      </div>

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
          , Wikimedia Commons (international match). Profile data: Wikidata.
        </p>
      )}

      <div className="feed-player">
        <div className="focus-section-head">
          <ProvenanceTag kind="session" />
          <span className="feed-player-title">Feed player</span>
          <InfoTip text="The demo feed uses anonymised IDs such as Player_7. They are not linked to the profile above until a verified player-ID mapping exists." />
          <select
            className="compact-select"
            aria-label="Choose feed player ID"
            value={selected?.key ?? ""}
            onChange={(event) => setFeedKey(event.target.value)}
            disabled={!feedPlayers.length}
          >
            {feedPlayers.map((item) => (
              <option key={item.key} value={item.key}>
                {teamByApiName(item.team)?.code ?? item.team} · {item.player}
              </option>
            ))}
          </select>
        </div>

        {selected ? (
          <dl className="feed-player-stats" aria-label={`${selected.player}, ${selectedTeam?.name ?? selected.team}`}>
            <Stat label="Touches" value={selected.events} />
            <Stat label="Passes" value={selected.passes} />
            <Stat
              label="Pass acc."
              value={
                percent(selected.completedPasses, selected.passes) === null
                  ? "–"
                  : `${percent(selected.completedPasses, selected.passes)}%`
              }
            />
            <Stat label="Shots" value={selected.shots} />
            <Stat label="Tackles" value={selected.tackles} />
            <Stat label="Pressures" value={selected.pressures} />
          </dl>
        ) : (
          <p className="empty-state">Waiting for match events…</p>
        )}
      </div>

      {onOpenTable && (
        <button type="button" className="ghost-button" onClick={onOpenTable}>
          All feed players <Icon name="arrowRight" size={14} />
        </button>
      )}
    </Panel>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
