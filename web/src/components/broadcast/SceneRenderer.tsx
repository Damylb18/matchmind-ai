import { AWAY, HOME, TEAMS, teamByApiName } from "../../data/teams";
import { formatClockSeconds } from "../../lib/format";
import type { CountStats, InsightEntry, PressurePoint } from "../../lib/matchState";
import type { BackendMatchState, MatchMetrics } from "../../types/match";
import { usePersonaliser } from "../../hooks/usePersonaliser";
import { SOURCE_LABEL } from "../../lib/personalisation";
import { TeamCrest } from "../TeamCrest";
import { BroadcastScoreboard } from "./BroadcastScoreboard";
import { TACTICAL_LABELS, type TransitionType } from "./graphics";
import { InsightBanner } from "./InsightBanner";
import { profileById, rollingPressure } from "./liveData";
import { PitchStage } from "./PitchStage";
import { PhotoCredit, PlayerLowerThird, Portrait } from "./PlayerLowerThird";
import type { Overlays, ProgramTake, Quality } from "./productionState";
import type { SceneId } from "./scenes";
import { InsightTicker, PassAccuracyChip, PressureMeter, StatsScene, StatsStrip } from "./StatsGraphics";

export type StageData = {
  clockLabel: string;
  match: BackendMatchState | null;
  /** Feed connected and updating. */
  live: boolean;
  /** Feed interrupted while showing last known data. */
  stale: boolean;
  insights: InsightEntry[];
  /** Insight banner currently due on screen (main scene). */
  banner: InsightEntry | null;
  /** Selected or latest insight, used by insight-led scenes. */
  focus: InsightEntry | null;
  teams: Record<string, CountStats>;
  metrics: MatchMetrics | null;
  pressure: PressurePoint[];
  sessionStart: number | null;
};

type SceneRendererProps = {
  current: ProgramTake;
  /** Previous take, for the transition out. null on the preview monitor. */
  previous: ProgramTake | null;
  transition: TransitionType;
  overlays: Overlays;
  quality: Quality;
  videoUrl: string | null;
  data: StageData;
};

const OVERLAY_SCENES: SceneId[] = ["main", "tactical"];

/** Composes one frame: background, scene layers with transitions, then overlays. */
export function SceneRenderer({ current, previous, transition, overlays, quality, videoUrl, data }: SceneRendererProps) {
  const scene = current.scene;
  const withOverlays = OVERLAY_SCENES.includes(scene);
  const annotations = !videoUrl && (scene === "tactical" || (scene === "main" && overlays.tactical.annotations));
  const treatment = scene === "main" || scene === "tactical" ? "live" : scene === "transition" ? "dim" : "blur";
  const bannerInsight = scene === "tactical" ? data.focus : scene === "main" ? data.banner : null;
  const showPrevious = previous && transition !== "cut" && previous.take === current.take - 1;
  const lift = overlays.stats.ticker && scene !== "transition";

  return (
    <div
      className={`bc-canvas theme-${overlays.branding.theme} ${lift ? "has-ticker" : ""}`}
      style={{ ["--bc-int" as string]: overlays.tactical.intensity / 100 }}
    >
      {videoUrl ? (
        <video className={`bc-video treat-${treatment}`} src={videoUrl} autoPlay muted loop playsInline />
      ) : (
        <PitchStage
          annotations={annotations}
          graphic={overlays.tactical.graphic}
          intensity={overlays.tactical.intensity}
          quality={quality}
          treatment={treatment}
        />
      )}

      {showPrevious && (
        <div key={`prev-${previous.take}`} className={`bc-layer leave-${transition}`} aria-hidden="true">
          <SceneContent scene={previous.scene} data={data} overlays={overlays} />
        </div>
      )}
      <div key={`cur-${current.take}-${scene}`} className={`bc-layer enter-${transition}`}>
        <SceneContent scene={scene} data={data} overlays={overlays} />
      </div>

      {annotations && (
        <span className="bc-tag bc-tactical-tag">
          {TACTICAL_LABELS[overlays.tactical.graphic]} · Illustrative
          {overlays.tactical.graphic === "pressure-zones" && <PressureReadout points={data.pressure} />}
        </span>
      )}

      <BroadcastScoreboard
        settings={overlays.scoreboard}
        visible={overlays.scoreboard.visible && scene !== "transition"}
        clock={data.clockLabel}
        live={data.live}
        stale={data.stale}
        match={data.match}
      />
      <InsightBanner
        insight={bannerInsight ?? data.focus}
        visible={overlays.insight.enabled && bannerInsight !== null}
        position={overlays.insight.position}
      />
      <PlayerLowerThird settings={overlays.player} visible={withOverlays && overlays.player.visible} />
      <StatsStrip teams={data.teams} sessionStart={data.sessionStart} visible={withOverlays && overlays.stats.strip} />
      <PressureMeter points={data.pressure} visible={withOverlays && overlays.stats.pressureMeter} />
      <PassAccuracyChip metrics={data.metrics} visible={withOverlays && overlays.stats.passAccuracy} />
      <InsightTicker insights={data.insights} visible={lift} />

      <span
        className={`bc-overlay bc-logo pos-${overlays.branding.position}`}
        data-visible={overlays.branding.logo && scene !== "transition"}
      >
        <i>M</i>MatchMind <em>Demo</em>
      </span>

      <span className="bc-demo-label">
        {videoUrl ? "Local video source" : "Simulated pitch · Demonstration, not match footage"}
      </span>

      {overlays.branding.safeArea && (
        <div className="bc-safe" aria-hidden="true">
          <span className="bc-safe-action" />
          <span className="bc-safe-title" />
        </div>
      )}
    </div>
  );
}

function PressureReadout({ points }: { points: PressurePoint[] }) {
  const fmt = (value: number | null) => (value === null ? "–" : value.toFixed(2));
  return (
    <b>
      Live pressure {HOME.code} {fmt(rollingPressure(points, HOME.apiName))} · {AWAY.code}{" "}
      {fmt(rollingPressure(points, AWAY.apiName))}
    </b>
  );
}

function SceneContent({ scene, data, overlays }: { scene: SceneId; data: StageData; overlays: Overlays }) {
  switch (scene) {
    case "main":
    case "tactical":
      return null;
    case "player":
      return <PlayerScene profileId={overlays.player.profileId} />;
    case "stats":
      return <StatsScene teams={data.teams} metrics={data.metrics} sessionStart={data.sessionStart} />;
    case "insight":
      return <FullInsight insight={data.focus} />;
    case "transition":
      return <BrandSting />;
  }
}

function PlayerScene({ profileId }: { profileId: string }) {
  const profile = profileById(profileId);
  const team = TEAMS[profile.teamId];
  return (
    <div className="bc-player-scene" style={{ ["--bc-team" as string]: team.colors.data }}>
      <span className="bc-spotlight" aria-hidden="true" />
      <Portrait profile={profile} className="bc-portrait-xl" />
      <div className="bc-player-info">
        <span className="bc-eyebrow">Player focus · showcase profile</span>
        <strong>{profile.name}</strong>
        <span className="bc-player-role">{profile.position}</span>
        <span className="bc-player-club">
          <TeamCrest team={team} size={22} /> {team.name}
        </span>
        <span className="bc-player-note">Profile from Wikidata · no live statistics attributed</span>
        <PhotoCredit profile={profile} />
      </div>
    </div>
  );
}

const INSIGHT_TYPE_LABELS: Record<string, string> = {
  pressure_surge: "Pressure surge",
  passing_pattern: "Passing pattern",
  shot_activity: "Shot activity",
};

function FullInsight({ insight }: { insight: InsightEntry | null }) {
  const personalise = usePersonaliser("broadcast");
  if (!insight) {
    return (
      <div className="bc-card bc-insight-card is-empty">
        <span className="bc-eyebrow">MatchMind insight</span>
        <strong>Awaiting the first backend insight</strong>
        <p>Insights appear when the rule engine detects sustained high pressure.</p>
      </div>
    );
  }
  const team = teamByApiName(insight.team);
  const text = personalise(insight);
  return (
    <div className="bc-card bc-insight-card" style={{ borderColor: team?.colors.data }} lang={text.contentLang}>
      <span className="bc-eyebrow">MatchMind rule-based insight · {formatClockSeconds(insight.clock)}</span>
      <strong>{text.headline}</strong>
      <p>{text.explanation}</p>
      {text.source === "local-demo-template" && <p className="bc-insight-takeaway">{text.takeaway}</p>}
      <footer>
        {team && <TeamCrest team={team} size={22} />}
        <span>{team?.name ?? insight.team}</span>
        <span>{INSIGHT_TYPE_LABELS[insight.type] ?? insight.type}</span>
        <span>{insight.evidence_event_ids.length} evidence events</span>
        <span>{SOURCE_LABEL[text.source]} wording</span>
      </footer>
    </div>
  );
}

function BrandSting() {
  return (
    <div className="bc-sting">
      <span className="bc-sting-bar" />
      <span className="bc-sting-bar two" />
      <div className="bc-sting-mark">
        <i>M</i>
        <span>
          MatchMind
          <em>AI Football Intelligence</em>
        </span>
      </div>
    </div>
  );
}
