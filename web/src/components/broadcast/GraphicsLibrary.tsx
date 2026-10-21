import { useState } from "react";
import { Icon } from "../icons/Icon";
import { GRAPHIC_CATEGORIES, GRAPHICS, SOURCE_LABELS, type GraphicCategory } from "./graphics";
import { isGraphicActive, type ProductionAction, type ProductionState } from "./productionState";
import { GraphicThumb } from "./Thumbs";

type GraphicsLibraryProps = {
  production: ProductionState;
  dispatch: (action: ProductionAction) => void;
  latestInsightKey: string | null;
  clock: number | null;
  bannerVisible: boolean;
};

export function GraphicsLibrary({ production, dispatch, latestInsightKey, clock, bannerVisible }: GraphicsLibraryProps) {
  const [category, setCategory] = useState<GraphicCategory>("tactical");
  const items = GRAPHICS.filter((graphic) => graphic.category === category);

  return (
    <section className="panel bc-graphics" aria-label="Live graphics">
      <header className="panel-head">
        <Icon name="insight" size={17} />
        <h2>Live Graphics</h2>
      </header>
      <div className="bc-tabs small" role="tablist" aria-label="Graphic categories">
        {GRAPHIC_CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={category === item.id}
            onClick={() => setCategory(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="bc-graphic-grid" role="tabpanel">
        {items.map((graphic) => {
          const active = isGraphicActive(production, graphic.id, bannerVisible);
          const unavailable = graphic.id === "insight-banner" && !latestInsightKey;
          return (
            <button
              key={graphic.id}
              type="button"
              className="bc-graphic-card"
              aria-pressed={active}
              disabled={unavailable}
              title={unavailable ? "No backend insight yet" : graphic.description}
              onClick={() => dispatch({ type: "graphic", id: graphic.id, latestInsightKey, clock })}
            >
              <GraphicThumb id={graphic.id} profileId={production.overlays.player.profileId} />
              <span className="bc-graphic-label">{graphic.label}</span>
              <span className={`bc-source source-${graphic.source}`}>{SOURCE_LABELS[graphic.source]}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
