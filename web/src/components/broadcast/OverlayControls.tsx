import { useState, type ChangeEvent } from "react";
import { PLAYER_PROFILES } from "../../data/players";
import { AWAY, HOME, TEAMS, teamByApiName } from "../../data/teams";
import { formatClockSeconds } from "../../lib/format";
import type { InsightEntry, PressurePoint } from "../../lib/matchState";
import { usePersonaliser } from "../../hooks/usePersonaliser";
import { Icon } from "../icons/Icon";
import { InsightSource } from "../InsightSource";
import { Field, Segmented, Switch } from "./controls";
import { TACTICAL_LABELS, type TacticalGraphic } from "./graphics";
import { rollingPressure } from "./liveData";
import type {
  BannerPosition,
  BoardPosition,
  Corner,
  Overlays,
  ProductionAction,
  ProductionState,
  ScoreboardStyle,
  ThemeId,
} from "./productionState";
import { DURATION_OPTIONS, durationValue, formatDuration, parseDuration } from "./scenes";
import { TacticalThumb } from "./Thumbs";

type Tab = "scoreboard" | "insights" | "player" | "tactical" | "branding";

const TABS: { id: Tab; label: string }[] = [
  { id: "scoreboard", label: "Scoreboard" },
  { id: "insights", label: "Insights" },
  { id: "player", label: "Player Info" },
  { id: "tactical", label: "Tactical" },
  { id: "branding", label: "Branding" },
];

type OverlayControlsProps = {
  production: ProductionState;
  dispatch: (action: ProductionAction) => void;
  insights: InsightEntry[];
  pressure: PressurePoint[];
  clock: number | null;
  clockLabel: string;
  /** Current backend score, e.g. "2–1"; null before any match state. */
  scoreLabel: string | null;
  bannerVisible: boolean;
  videoUrl: string | null;
  videoName: string | null;
  onVideoFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onClearVideo: () => void;
};

export function OverlayControls(props: OverlayControlsProps) {
  const [tab, setTab] = useState<Tab>("scoreboard");
  const o = props.production.overlays;
  const set = <K extends keyof Overlays>(section: K, patch: Partial<Overlays[K]>) =>
    props.dispatch({ type: "overlay", section, patch } as ProductionAction);

  return (
    <section className="panel bc-controls" aria-label="Overlay controls">
      <header className="panel-head">
        <Icon name="broadcast" size={17} />
        <h2>Overlay Controls</h2>
      </header>
      <div className="bc-tabs" role="tablist" aria-label="Overlay control groups">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`bc-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`bc-panel-${item.id}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="bc-tab-panel" role="tabpanel" id={`bc-panel-${tab}`} aria-labelledby={`bc-tab-${tab}`}>
        {tab === "scoreboard" && (
          <ScoreboardTab o={o} set={set} clockLabel={props.clockLabel} scoreLabel={props.scoreLabel} />
        )}
        {tab === "insights" && <InsightsTab {...props} o={o} set={set} />}
        {tab === "player" && <PlayerTab o={o} set={set} />}
        {tab === "tactical" && <TacticalTab o={o} set={set} pressure={props.pressure} videoActive={!!props.videoUrl} />}
        {tab === "branding" && <BrandingTab {...props} o={o} set={set} />}
      </div>
    </section>
  );
}

type SetFn = <K extends keyof Overlays>(section: K, patch: Partial<Overlays[K]>) => void;

function ScoreboardTab({
  o,
  set,
  clockLabel,
  scoreLabel,
}: {
  o: Overlays;
  set: SetFn;
  clockLabel: string;
  scoreLabel: string | null;
}) {
  const middle = scoreLabel ?? "v";
  const s = o.scoreboard;
  const styles: { id: ScoreboardStyle; label: string }[] = [
    { id: "standard", label: "Standard" },
    { id: "minimal", label: "Minimal" },
    { id: "wide", label: "Wide" },
  ];
  const positions: BoardPosition[] = ["tl", "tc", "tr", "bl", "bc", "br"];
  const positionNames: Record<BoardPosition, string> = {
    tl: "Top left",
    tc: "Top centre",
    tr: "Top right",
    bl: "Bottom left",
    bc: "Bottom centre",
    br: "Bottom right",
  };

  return (
    <>
      <Field label="Scoreboard style">
        <div className="bc-style-cards" role="group" aria-label="Scoreboard style">
          {styles.map((style) => (
            <button
              key={style.id}
              type="button"
              aria-pressed={s.style === style.id}
              onClick={() => set("scoreboard", { style: style.id })}
            >
              <span className={`bc-style-mini style-${style.id}`} aria-hidden="true">
                {style.id === "wide" ? (
                  <>
                    <i>Man Utd</i> <b>{middle}</b> <i>Arsenal</i>
                  </>
                ) : (
                  <>
                    {HOME.code} <b>{middle}</b> {AWAY.code}
                  </>
                )}
                {style.id !== "minimal" && <small>{clockLabel}</small>}
              </span>
              {style.label}
            </button>
          ))}
        </div>
      </Field>
      <div className="bc-switch-grid">
        <Switch label="Show scoreboard" checked={s.visible} onChange={(v) => set("scoreboard", { visible: v })} />
        <Switch label="Match clock" checked={s.clock} onChange={(v) => set("scoreboard", { clock: v })} />
        <Switch label="LIVE indicator" checked={s.live} onChange={(v) => set("scoreboard", { live: v })} />
        <Switch label="Team crests & colours" checked={s.identifiers} onChange={(v) => set("scoreboard", { identifiers: v })} />
      </div>
      <div className="bc-two-col">
        <Field label="Position">
          <div className="bc-position-grid" role="group" aria-label="Scoreboard position">
            {positions.map((position) => (
              <button
                key={position}
                type="button"
                aria-pressed={s.position === position}
                aria-label={positionNames[position]}
                title={positionNames[position]}
                onClick={() => set("scoreboard", { position })}
              />
            ))}
          </div>
        </Field>
        <Field label={`Scale · ${s.scale}%`}>
          <input
            type="range"
            min={70}
            max={130}
            step={5}
            value={s.scale}
            aria-label="Scoreboard scale"
            onChange={(event) => set("scoreboard", { scale: Number(event.target.value) })}
          />
        </Field>
      </div>
      <p className="bc-note">
        Score, clock and HT/FT status come from the backend’s simulated match. Before the first match state
        arrives the scoreboard shows “v”.
      </p>
    </>
  );
}

function InsightsTab({
  o,
  set,
  insights,
  dispatch,
  clock,
  bannerVisible,
}: OverlayControlsProps & { o: Overlays; set: SetFn }) {
  const s = o.insight;
  const personalise = usePersonaliser("broadcast");
  const latest = insights[0];
  const target = (s.selectedKey && insights.find((item) => item.key === s.selectedKey)) || latest;
  const targetText = target ? personalise(target) : null;

  return (
    <>
      <div className="bc-switch-grid">
        <Switch label="Show insight banners" checked={s.enabled} onChange={(v) => set("insight", { enabled: v })} />
        <Switch label="Auto-display new insights" checked={s.auto} onChange={(v) => set("insight", { auto: v })} />
      </div>
      <Field label="Insight">
        <select
          className="compact-select bc-wide-select"
          value={s.selectedKey ?? "latest"}
          onChange={(event) => set("insight", { selectedKey: event.target.value === "latest" ? null : event.target.value })}
        >
          <option value="latest">Latest insight{latest ? ` (${formatClockSeconds(latest.clock)})` : ""}</option>
          {insights.map((insight) => (
            <option key={insight.key} value={insight.key}>
              {formatClockSeconds(insight.clock)} · {personalise(insight).headline}
            </option>
          ))}
        </select>
      </Field>
      <div className="bc-two-col">
        <Field label="Display duration">
          <select
            className="compact-select"
            value={durationValue(s.duration)}
            onChange={(event) => set("insight", { duration: parseDuration(event.target.value) })}
          >
            {DURATION_OPTIONS.map((duration) => (
              <option key={durationValue(duration)} value={durationValue(duration)}>
                {formatDuration(duration)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Banner position">
          <Segmented<BannerPosition>
            label="Banner position"
            value={s.position}
            options={[
              { value: "lower-left", label: "Lower L" },
              { value: "lower-center", label: "Lower C" },
              { value: "upper-right", label: "Upper R" },
            ]}
            onChange={(position) => set("insight", { position })}
          />
        </Field>
      </div>
      <div className="bc-actions">
        <button
          type="button"
          className="bc-btn"
          disabled={!target || clock === null}
          onClick={() => target && clock !== null && dispatch({ type: "showBanner", key: target.key, clock })}
        >
          Show now
        </button>
        <button
          type="button"
          className="bc-btn ghost"
          disabled={!bannerVisible}
          onClick={() => dispatch({ type: "hideBanner", latestKey: latest?.key ?? null })}
        >
          Hide banner
        </button>
        <span className="bc-note">
          {insights.length} backend insight{insights.length === 1 ? "" : "s"} this session
        </span>
      </div>
      {target && targetText && (
        <div className="bc-insight-preview" style={{ borderColor: teamByApiName(target.team)?.colors.data }}>
          <strong lang={targetText.contentLang}>{targetText.headline}</strong>
          <span>
            {formatClockSeconds(target.clock)} · {target.evidence_event_ids.length} evidence events ·{" "}
            <InsightSource personalised={targetText} />
          </span>
          {targetText.source === "local-demo-template" && (
            <span lang="en">Backend original: “{target.headline}”</span>
          )}
        </div>
      )}
    </>
  );
}

function PlayerTab({ o, set }: { o: Overlays; set: SetFn }) {
  const s = o.player;
  return (
    <>
      <Field label="Showcase player">
        <select
          className="compact-select bc-wide-select"
          value={s.profileId}
          onChange={(event) => set("player", { profileId: event.target.value })}
        >
          {Object.values(TEAMS).map((club) => (
            <optgroup key={club.id} label={club.name}>
              {PLAYER_PROFILES.filter((profile) => profile.teamId === club.id).map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} · {profile.position}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>
      <div className="bc-switch-grid">
        <Switch label="Show lower third" checked={s.visible} onChange={(v) => set("player", { visible: v })} />
        <Switch
          label="Portrait"
          checked={s.portrait}
          disabled={s.style === "compact"}
          onChange={(v) => set("player", { portrait: v })}
        />
        <Switch label="Position & club" checked={s.details} onChange={(v) => set("player", { details: v })} />
      </div>
      <Field label="Lower-third style">
        <Segmented
          label="Lower-third style"
          value={s.style}
          options={[
            { value: "classic", label: "Classic" },
            { value: "compact", label: "Compact" },
            { value: "stripe", label: "Club stripe" },
          ]}
          onChange={(style) => set("player", { style })}
        />
      </Field>
      <p className="bc-note">
        Showcase profiles only: real names, Wikidata positions and CC BY-SA portraits. Live feed statistics use
        synthetic IDs and are never attached to a named player.
      </p>
    </>
  );
}

function TacticalTab({
  o,
  set,
  pressure,
  videoActive,
}: {
  o: Overlays;
  set: SetFn;
  pressure: PressurePoint[];
  videoActive: boolean;
}) {
  const s = o.tactical;
  const fmt = (value: number | null) => (value === null ? "–" : value.toFixed(2));
  return (
    <>
      <Switch
        label="Pitch annotations"
        checked={s.annotations}
        disabled={videoActive}
        onChange={(v) => set("tactical", { annotations: v })}
      />
      <div className="bc-tactical-grid" role="group" aria-label="Tactical graphic">
        {(Object.keys(TACTICAL_LABELS) as TacticalGraphic[]).map((graphic) => (
          <button
            key={graphic}
            type="button"
            aria-pressed={s.graphic === graphic}
            onClick={() => set("tactical", { graphic, annotations: true })}
          >
            <TacticalThumb graphic={graphic} />
            {TACTICAL_LABELS[graphic]}
          </button>
        ))}
      </div>
      <Field label={`Animation intensity · ${s.intensity}%`}>
        <input
          type="range"
          min={0}
          max={100}
          step={10}
          value={s.intensity}
          aria-label="Animation intensity"
          onChange={(event) => set("tactical", { intensity: Number(event.target.value) })}
        />
      </Field>
      <p className="bc-note">
        Illustrative: the feed has no player coordinates, so formations, positions and zones are simulated.
        {videoActive && " Annotations are drawn on the synthetic pitch only."} Live pressure (last 10 events):{" "}
        {HOME.code} {fmt(rollingPressure(pressure, HOME.apiName))} · {AWAY.code}{" "}
        {fmt(rollingPressure(pressure, AWAY.apiName))}.
      </p>
    </>
  );
}

function BrandingTab({
  o,
  set,
  videoUrl,
  videoName,
  onVideoFile,
  onClearVideo,
}: OverlayControlsProps & { o: Overlays; set: SetFn }) {
  const s = o.branding;
  const themes: { id: ThemeId; label: string }[] = [
    { id: "emerald", label: "Emerald" },
    { id: "steel", label: "Steel" },
    { id: "gold", label: "Gold" },
  ];
  return (
    <>
      <div className="bc-switch-grid">
        <Switch label="MatchMind logo" checked={s.logo} onChange={(v) => set("branding", { logo: v })} />
        <Switch label="Safe-area guides" checked={s.safeArea} onChange={(v) => set("branding", { safeArea: v })} />
      </div>
      <div className="bc-two-col">
        <Field label="Logo position">
          <Segmented<Corner>
            label="Logo position"
            value={s.position}
            options={[
              { value: "tl", label: "TL" },
              { value: "tr", label: "TR" },
              { value: "bl", label: "BL" },
              { value: "br", label: "BR" },
            ]}
            onChange={(position) => set("branding", { position })}
          />
        </Field>
        <Field label="Theme">
          <div className="bc-themes" role="group" aria-label="Theme">
            {themes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                className={`theme-${theme.id}`}
                aria-pressed={s.theme === theme.id}
                onClick={() => set("branding", { theme: theme.id })}
              >
                <i aria-hidden="true" />
                {theme.label}
              </button>
            ))}
          </div>
        </Field>
      </div>
      <Field label="Background source">
        <div className="bc-source-picker">
          <span>{videoUrl ? `Local video: ${videoName}` : "Synthetic pitch (default)"}</span>
          <label className="bc-btn ghost">
            Choose video file
            <input type="file" accept="video/*" className="sr-only" onChange={onVideoFile} />
          </label>
          {videoUrl && (
            <button type="button" className="bc-btn ghost" onClick={onClearVideo}>
              Use synthetic pitch
            </button>
          )}
        </div>
      </Field>
      <p className="bc-note">
        Optional: play a video file from this computer behind the overlays. It stays in the browser and is never
        uploaded. Use only footage you are licensed to show.
      </p>
    </>
  );
}
