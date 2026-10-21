import type { ReactNode } from "react";
import { HOME } from "../../data/teams";
import { Pitch } from "../pitch/Pitch";
import type { GraphicId, TacticalGraphic } from "./graphics";
import { profileById } from "./liveData";
import { Portrait } from "./PlayerLowerThird";
import type { SceneId } from "./scenes";
import { TacticalOverlay } from "./TacticalOverlay";

export function TacticalThumb({ graphic }: { graphic: TacticalGraphic }) {
  return (
    <span className="bc-thumb bc-thumb-pitch" aria-hidden="true">
      <Pitch label="" stripes={false}>
        <TacticalOverlay graphic={graphic} still />
      </Pitch>
    </span>
  );
}

function MiniPitch({ children }: { children?: ReactNode }) {
  return (
    <span className="bc-thumb bc-thumb-pitch" aria-hidden="true">
      <Pitch label="" stripes={false} />
      {children}
    </span>
  );
}

export function SceneThumb({ scene, profileId }: { scene: SceneId; profileId: string }) {
  switch (scene) {
    case "main":
      return (
        <MiniPitch>
          <span className="bc-mini-bug">
            {HOME.code} v ARS
          </span>
        </MiniPitch>
      );
    case "tactical":
      return <TacticalThumb graphic="high-press" />;
    case "player":
      return (
        <span className="bc-thumb bc-thumb-player" aria-hidden="true">
          <Portrait profile={profileById(profileId)} />
          <i />
        </span>
      );
    case "stats":
      return (
        <span className="bc-thumb bc-thumb-stats" aria-hidden="true">
          {[80, 55, 70, 40].map((width, index) => (
            <span key={index}>
              <i style={{ width: `${width / 2}%` }} />
              <b style={{ width: `${(100 - width) / 2}%` }} />
            </span>
          ))}
        </span>
      );
    case "insight":
      return (
        <span className="bc-thumb bc-thumb-insight" aria-hidden="true">
          <i />
          <b />
          <b className="short" />
        </span>
      );
    case "transition":
      return (
        <span className="bc-thumb bc-thumb-brand" aria-hidden="true">
          <i>M</i>
        </span>
      );
  }
}

export function GraphicThumb({ id, profileId }: { id: GraphicId; profileId: string }) {
  switch (id) {
    case "high-press":
    case "build-up":
    case "final-third":
    case "pressure-zones":
    case "attacking-direction":
    case "team-shape":
      return <TacticalThumb graphic={id} />;
    case "player-spotlight":
    case "lt-classic":
      return (
        <MiniPitch>
          <span className="bc-mini-lt">
            <Portrait profile={profileById(profileId)} />
            <i />
          </span>
        </MiniPitch>
      );
    case "name-strap":
    case "lt-compact":
      return (
        <MiniPitch>
          <span className="bc-mini-lt compact">
            <i />
          </span>
        </MiniPitch>
      );
    case "lt-stripe":
      return (
        <MiniPitch>
          <span className="bc-mini-lt stripe">
            <i />
          </span>
        </MiniPitch>
      );
    case "team-comparison":
      return (
        <MiniPitch>
          <span className="bc-mini-strip" />
        </MiniPitch>
      );
    case "pressure-meter":
      return (
        <span className="bc-thumb bc-thumb-meter" aria-hidden="true">
          <span>
            <i className="home" style={{ width: "72%" }} />
          </span>
          <span>
            <i className="away" style={{ width: "48%" }} />
          </span>
          <b />
        </span>
      );
    case "pass-accuracy":
      return (
        <span className="bc-thumb bc-thumb-figure" aria-hidden="true">
          %
        </span>
      );
    case "insight-banner":
      return (
        <MiniPitch>
          <span className="bc-mini-banner" />
        </MiniPitch>
      );
    case "insight-ticker":
      return (
        <MiniPitch>
          <span className="bc-mini-ticker" />
        </MiniPitch>
      );
    case "tr-crossfade":
    case "tr-wipe":
    case "tr-cut":
      return (
        <span className={`bc-thumb bc-thumb-transition ${id}`} aria-hidden="true">
          <i />
          <b />
        </span>
      );
  }
}
