import { useEffect, useRef, useState, type ChangeEvent } from "react";
import "./broadcast.css";
import { formatClock } from "../../lib/format";
import type { MatchState } from "../../lib/matchState";
import type { ConnectionStatus } from "../../types/match";
import { BroadcastPlaylist } from "./BroadcastPlaylist";
import { BroadcastPreview } from "./BroadcastPreview";
import { BroadcastTopBar } from "./BroadcastTopBar";
import { GraphicsLibrary } from "./GraphicsLibrary";
import { bannerInsight, feedNotice, focusInsight } from "./liveData";
import { MatchFeedPanel } from "./MatchFeedPanel";
import { OverlayControls } from "./OverlayControls";
import { ProductionToolbar } from "./ProductionToolbar";
import type { StageData } from "./SceneRenderer";
import { SceneLibrary } from "./SceneLibrary";
import type { Production } from "./useProduction";

type BroadcastDashboardProps = { state: MatchState; status: ConnectionStatus; production: Production };

/**
 * Production state is owned by App (see useProduction) so the playlist, overlays and
 * simulated output survive switching to Fan or Analyst Mode.
 */
export function BroadcastDashboard({ state, status, production: prod }: BroadcastDashboardProps) {
  const { state: production, dispatch, duration, autoRunning } = prod;
  const screenRef = useRef<HTMLDivElement | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  /** In-page fallback when the Fullscreen API is blocked (e.g. some embedded webviews). */
  const [expanded, setExpanded] = useState(false);
  const fallbackTimer = useRef<number | null>(null);
  const [video, setVideo] = useState<{ url: string; name: string } | null>(null);
  const videoUrlRef = useRef<string | null>(null);

  // Fullscreen state follows the browser (Esc, F11, etc.).
  useEffect(() => {
    const onChange = () => {
      setFullscreen(document.fullscreenElement === screenRef.current);
      setExpanded(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      if (fallbackTimer.current !== null) window.clearTimeout(fallbackTimer.current);
    };
  }, []);

  // Esc leaves the in-page fallback, mirroring native fullscreen.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  // Release a local video's object URL when leaving Broadcast Mode.
  useEffect(
    () => () => {
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    },
    [],
  );

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    if (expanded) {
      setExpanded(false);
      return;
    }
    const screen = screenRef.current;
    if (!screen?.requestFullscreen || !document.fullscreenEnabled) {
      setExpanded(true);
      return;
    }
    // Some hosts reject the request or leave it pending; fall back to filling the window.
    screen.requestFullscreen().catch(() => setExpanded(true));
    if (fallbackTimer.current !== null) window.clearTimeout(fallbackTimer.current);
    fallbackTimer.current = window.setTimeout(() => {
      fallbackTimer.current = null;
      if (!document.fullscreenElement) setExpanded(true);
    }, 800);
  };

  const onVideoFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    const url = URL.createObjectURL(file);
    videoUrlRef.current = url;
    setVideo({ url, name: file.name });
  };

  const clearVideo = () => {
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    videoUrlRef.current = null;
    setVideo(null);
  };

  const clockLabel = state.match
    ? formatClock(
        Math.floor(state.match.clock_seconds / 60),
        state.match.clock_seconds % 60,
      )
    : state.minute !== null && state.second !== null
      ? formatClock(state.minute, state.second)
      : "--:--";
  const banner = bannerInsight(production, state.insights, state.clock);
  const hasData = state.match !== null || state.clock !== null;
  // Last known data on screen while the feed is not updating.
  const stale = hasData && status !== "live";

  const data: StageData = {
    clockLabel,
    match: state.match,
    live: status === "live",
    stale,
    insights: state.insights,
    banner,
    focus: focusInsight(production, state.insights),
    teams: state.teams,
    metrics: state.metrics,
    pressure: state.pressure,
    sessionStart: state.sessionStart,
  };

  return (
    <div className="bc-dashboard">
      <BroadcastTopBar
        clockLabel={clockLabel}
        status={status}
        output={production.output}
        notice={feedNotice(status, state, clockLabel)}
        stale={stale}
      />

      <div className="bc-main">
        <BroadcastPreview
          production={production}
          dispatch={dispatch}
          data={data}
          clock={state.clock}
          videoUrl={video?.url ?? null}
          screenRef={screenRef}
          fullscreen={fullscreen || expanded}
          expanded={expanded}
          onToggleFullscreen={toggleFullscreen}
        />
        <div className="bc-side">
          <OverlayControls
            production={production}
            dispatch={dispatch}
            insights={state.insights}
            pressure={state.pressure}
            clock={state.clock}
            clockLabel={clockLabel}
            scoreLabel={state.match ? `${state.match.home_score}–${state.match.away_score}` : null}
            bannerVisible={banner !== null}
            videoUrl={video?.url ?? null}
            videoName={video?.name ?? null}
            onVideoFile={onVideoFile}
            onClearVideo={clearVideo}
          />
          <MatchFeedPanel state={state} status={status} />
        </div>
      </div>

      <div className="bc-bottom">
        <SceneLibrary production={production} dispatch={dispatch} clock={state.clock} />
        <GraphicsLibrary
          production={production}
          dispatch={dispatch}
          latestInsightKey={state.insights[0]?.key ?? null}
          clock={state.clock}
          bannerVisible={banner !== null}
        />
        <BroadcastPlaylist production={production} dispatch={dispatch} clock={state.clock} autoRunning={autoRunning} />
      </div>

      <ProductionToolbar
        production={production}
        dispatch={dispatch}
        clock={state.clock}
        duration={duration}
        fullscreen={fullscreen || expanded}
        onToggleFullscreen={toggleFullscreen}
      />
    </div>
  );
}
